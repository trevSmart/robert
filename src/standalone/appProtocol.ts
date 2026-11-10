import * as fs from 'node:fs';
import * as path from 'node:path';
import { protocol } from 'electron';

/**
 * Custom `robert-app://` scheme used instead of VS Code's `vscode-webview://`
 * resource URIs. It serves two things:
 *  - `robert-app://app/<relative path>`: read-only files under the app root
 *    (webview bundle, icons, fonts, intro video). Paths are confined to the root.
 *  - `robert-app://app/__doc/<id>.html`: in-memory HTML documents assigned via
 *    `webview.html`, so pages get a real, same-origin URL for module scripts.
 */
export const APP_SCHEME = 'robert-app';
const APP_HOST = 'app';
const DOC_PREFIX = '/__doc/';

const MIME_TYPES: Record<string, string> = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.mjs': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.map': 'application/json; charset=utf-8',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.svg': 'image/svg+xml',
	'.webp': 'image/webp',
	'.ico': 'image/x-icon',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
	'.ttf': 'font/ttf',
	'.mp4': 'video/mp4'
};

/** Must run before `app.whenReady()`. */
export function registerAppSchemeAsPrivileged(): void {
	protocol.registerSchemesAsPrivileged([
		{
			scheme: APP_SCHEME,
			privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, codeCache: true }
		}
	]);
}

export class AppProtocol {
	private readonly documents = new Map<string, string>();
	private documentCounter = 0;

	constructor(private readonly rootDir: string) {}

	/** Value for `webview.cspSource`. */
	public get cspSource(): string {
		return `${APP_SCHEME}://${APP_HOST}`;
	}

	/** Maps a file under the app root to its `robert-app://` URL. */
	public toAppUrl(fsPath: string): string {
		const relative = path.relative(this.rootDir, fsPath);
		if (relative.startsWith('..') || path.isAbsolute(relative)) {
			throw new Error(`Resource is outside the app root: ${fsPath}`);
		}
		const encoded = relative.split(path.sep).map(encodeURIComponent).join('/');
		return `${APP_SCHEME}://${APP_HOST}/${encoded}`;
	}

	/** Stores an HTML document and returns the URL to load it from. Replaces the owner's previous document. */
	public putDocument(ownerId: string, html: string): string {
		for (const key of this.documents.keys()) {
			if (key.startsWith(`${ownerId}-`)) {
				this.documents.delete(key);
			}
		}
		const id = `${ownerId}-${++this.documentCounter}`;
		this.documents.set(id, html);
		return `${APP_SCHEME}://${APP_HOST}${DOC_PREFIX}${id}.html`;
	}

	public releaseDocuments(ownerId: string): void {
		for (const key of [...this.documents.keys()]) {
			if (key.startsWith(`${ownerId}-`)) {
				this.documents.delete(key);
			}
		}
	}

	/** Must run after `app.whenReady()`. */
	public install(): void {
		protocol.handle(APP_SCHEME, request => this.handle(request));
	}

	private async handle(request: Request): Promise<Response> {
		const url = new URL(request.url);
		if (url.host !== APP_HOST) {
			return new Response('Not found', { status: 404 });
		}

		const pathname = decodeURIComponent(url.pathname);
		if (pathname.startsWith(DOC_PREFIX)) {
			const id = pathname.slice(DOC_PREFIX.length).replace(/\.html$/, '');
			const html = this.documents.get(id);
			return html === undefined ? new Response('Not found', { status: 404 }) : new Response(html, { headers: { 'Content-Type': MIME_TYPES['.html'] } });
		}

		const filePath = path.resolve(this.rootDir, `.${pathname}`);
		if (filePath !== this.rootDir && !filePath.startsWith(this.rootDir + path.sep)) {
			return new Response('Forbidden', { status: 403 });
		}

		let size: number;
		try {
			const stat = await fs.promises.stat(filePath);
			if (!stat.isFile()) {
				return new Response('Not found', { status: 404 });
			}
			size = stat.size;
		} catch {
			return new Response('Not found', { status: 404 });
		}

		const headers: Record<string, string> = {
			'Content-Type': MIME_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream',
			'Accept-Ranges': 'bytes'
		};

		// Range support so the intro <video> can stream and seek.
		const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('Range') ?? '');
		if (range && (range[1] || range[2])) {
			const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
			const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
			if (start > end || start >= size) {
				return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
			}
			const buffer = await readSlice(filePath, start, end - start + 1);
			return new Response(new Uint8Array(buffer), {
				status: 206,
				headers: { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(buffer.length) }
			});
		}

		const buffer = await fs.promises.readFile(filePath);
		return new Response(new Uint8Array(buffer), { headers: { ...headers, 'Content-Length': String(buffer.length) } });
	}
}

async function readSlice(filePath: string, start: number, length: number): Promise<Buffer> {
	const handle = await fs.promises.open(filePath, 'r');
	try {
		const buffer = Buffer.alloc(length);
		const { bytesRead } = await handle.read(buffer, 0, length, start);
		return buffer.subarray(0, bytesRead);
	} finally {
		await handle.close();
	}
}
