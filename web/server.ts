import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ErrorHandler } from '../src/ErrorHandler';
import { SettingsManager } from './shims/SettingsManager';
import { CollaborationClient } from '../src/libs/collaboration/collaborationClient';
import { setProviderBroadcaster } from '../src/libs/provider';
import { WebviewMessageDispatcher } from '../src/webview/messageHandlers/WebviewMessageDispatcher';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const webviewDir = process.env.ROBERT_WEB_DIR || join(root, 'out', 'webview');
const resourcesDir = join(root, 'resources');
const hostName = '127.0.0.1';
const port = Number(process.env.ROBERT_WEB_PORT || 4777);
const stateFile = process.env.ROBERT_WEB_STATE_FILE || join(homedir(), '.robert-web', 'state.json');

const MIME: Record<string, string> = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.map': 'application/json',
	'.ttf': 'font/ttf',
	'.woff2': 'font/woff2',
	'.png': 'image/png',
	'.webp': 'image/webp',
	'.svg': 'image/svg+xml'
};

// Persistent replacement for ExtensionContext.globalState (favorites, recents, calendar events).
function loadState(): Record<string, unknown> {
	try {
		return JSON.parse(readFileSync(stateFile, 'utf8'));
	} catch {
		return {};
	}
}
const persisted = loadState();
const globalState = {
	get<T>(key: string, defaultValue?: T): T | undefined {
		return (key in persisted ? (persisted[key] as T) : defaultValue) as T | undefined;
	},
	async update(key: string, value: unknown): Promise<void> {
		if (value === undefined) {
			delete persisted[key];
		} else {
			persisted[key] = value;
		}
		mkdirSync(dirname(stateFile), { recursive: true });
		writeFileSync(stateFile, JSON.stringify(persisted, null, 2), { mode: 0o600 });
	},
	keys: () => Object.keys(persisted)
};
const fakeContext = {
	globalState,
	workspaceState: globalState,
	extensionPath: root,
	extensionMode: 1,
	subscriptions: []
} as any;

const errorHandler = ErrorHandler.getInstance();
const dispatcher = new WebviewMessageDispatcher(errorHandler, CollaborationClient.getInstance(), fakeContext);

const clients = new Map<string, ServerResponse>();

function sendTo(res: ServerResponse, data: unknown): void {
	res.write(`data: ${JSON.stringify(data)}\n\n`);
}
function broadcast(data: unknown): void {
	for (const res of clients.values()) sendTo(res, data);
}
setProviderBroadcaster(message => broadcast(message));

function webviewFor(res: ServerResponse) {
	return {
		postMessage: async (data: unknown) => {
			sendTo(res, data);
			return true;
		}
	} as any;
}

function allowedHost(req: IncomingMessage): boolean {
	const hostHeader = (req.headers.host || '').toLowerCase();
	return hostHeader === `${hostName}:${port}` || hostHeader === `localhost:${port}`;
}
function allowedOrigin(req: IncomingMessage): boolean {
	const origin = req.headers.origin;
	return !origin || origin === `http://${hostName}:${port}` || origin === `http://localhost:${port}`;
}

function sendFile(res: ServerResponse, file: string): void {
	if (!existsSync(file)) {
		res.writeHead(404).end('Not found');
		return;
	}
	res.writeHead(200, {
		'Content-Type': MIME[extname(file)] || 'application/octet-stream',
		'Cache-Control': 'no-cache'
	});
	res.end(readFileSync(file));
}

function safeJoin(base: string, urlPath: string): string | null {
	const target = normalize(join(base, decodeURIComponent(urlPath)));
	return target.startsWith(base) ? target : null;
}

function renderIndex(): string {
	const page = join(webviewDir, 'src', 'webview', 'main.html');
	if (!existsSync(page)) {
		throw new Error('Frontend not built. Run `npm run web:build` first.');
	}
	const html = readFileSync(page, 'utf8')
		.replace('__WEBVIEW_ID__', `web-${randomUUID().slice(0, 8)}`)
		.replace('__CONTEXT__', 'main')
		.replace('__TIMESTAMP__', new Date().toISOString())
		.replace('__REBUS_LOGO_URI__', '/resources/icons/robert-logo.png')
		.replace('__INTER_FONT_URI__', '/resources/fonts/Inter-Variable.woff2')
		.replace('__JIRA_LOGO_URI__', '/resources/icons/jira-logo.webp')
		.replace('__TEST_TAB_ENABLED__', 'false')
		.replace('__PRELOADED_DATA__', 'undefined');
	return html.replace('<head>', '<head>\n<link rel="stylesheet" href="/web/theme.css" />\n<script src="/web/bridge.js"></script>').replace('<title>Robert</title>', '<title>Robert</title>');
}

const server = createServer(async (req, res) => {
	try {
		if (!allowedHost(req) || !allowedOrigin(req)) {
			res.writeHead(403).end('Forbidden');
			return;
		}
		const url = new URL(req.url || '/', `http://${hostName}:${port}`);

		if (req.method === 'GET' && url.pathname === '/') {
			res.writeHead(200, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-store' });
			res.end(renderIndex());
			return;
		}

		if (req.method === 'GET' && url.pathname === '/events') {
			const id = url.searchParams.get('clientId') || randomUUID();
			res.writeHead(200, {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache, no-transform',
				Connection: 'keep-alive'
			});
			res.write(': connected\n\n');
			clients.set(id, res);
			const ping = setInterval(() => res.write(': ping\n\n'), 25000);
			req.on('close', () => {
				clearInterval(ping);
				clients.delete(id);
			});
			return;
		}

		if (req.method === 'POST' && url.pathname === '/message') {
			const id = url.searchParams.get('clientId') || '';
			const target = clients.get(id);
			if (!target) {
				res.writeHead(409).end('Unknown client');
				return;
			}
			let raw = '';
			for await (const chunk of req) {
				raw += chunk;
				if (raw.length > 5_000_000) {
					res.writeHead(413).end('Too large');
					return;
				}
			}
			res.writeHead(204).end();
			const message = JSON.parse(raw);
			if (message && typeof message.command === 'string') {
				void dispatcher.dispatch(message.command, webviewFor(target), message);
			}
			return;
		}

		if (req.method === 'GET' && url.pathname.startsWith('/web/')) {
			const file = safeJoin(join(root, 'web', 'static'), url.pathname.slice(5));
			return file ? sendFile(res, file) : void res.writeHead(403).end();
		}
		if (req.method === 'GET' && url.pathname.startsWith('/resources/')) {
			const file = safeJoin(resourcesDir, url.pathname.slice(11));
			return file ? sendFile(res, file) : void res.writeHead(403).end();
		}
		if (req.method === 'GET') {
			const file = safeJoin(webviewDir, url.pathname);
			return file ? sendFile(res, file) : void res.writeHead(403).end();
		}
		res.writeHead(405).end();
	} catch (error) {
		errorHandler.logError(error instanceof Error ? error.message : String(error), 'web.server');
		if (!res.headersSent) res.writeHead(500);
		res.end('Internal error');
	}
});

server.listen(port, hostName, () => {
	const settings = SettingsManager.getInstance().getSettings();
	const configured = settings.jiraEmail && settings.jiraApiToken;
	console.log(`Robert web UI: http://localhost:${port}`);
	console.log(configured ? `Jira: ${settings.jiraBaseUrl} (project ${settings.jiraProjectKey || 'all'})` : 'Jira credentials missing: set ROBERT_JIRA_BASE_URL, ROBERT_JIRA_EMAIL, ROBERT_JIRA_API_TOKEN (ROBERT_JIRA_PROJECT_KEY is optional: empty = all projects)');
	console.log(`State file: ${stateFile}`);
});
