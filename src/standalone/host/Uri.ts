import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * Minimal stand-in for `vscode.Uri` used by the standalone (Electron) host.
 * Only implements what Robert's backend relies on: `file`, `parse`, `joinPath`,
 * `fsPath`, `with` and `toString`.
 */
export class Uri {
	private constructor(
		public readonly scheme: string,
		public readonly authority: string,
		public readonly path: string,
		public readonly query: string,
		public readonly fragment: string
	) {}

	public static file(fsPath: string): Uri {
		const url = pathToFileURL(path.resolve(fsPath));
		return new Uri('file', '', decodeURIComponent(url.pathname), '', '');
	}

	public static parse(value: string): Uri {
		const url = new URL(value);
		return new Uri(url.protocol.replace(/:$/, ''), url.host, decodeURIComponent(url.pathname), url.search.replace(/^\?/, ''), url.hash.replace(/^#/, ''));
	}

	public static joinPath(base: Uri, ...segments: string[]): Uri {
		return base.with({ path: path.posix.join(base.path, ...segments) });
	}

	public get fsPath(): string {
		if (this.scheme !== 'file') {
			return this.path;
		}
		return fileURLToPath(this.toString());
	}

	public with(change: { scheme?: string; authority?: string; path?: string; query?: string; fragment?: string }): Uri {
		return new Uri(change.scheme ?? this.scheme, change.authority ?? this.authority, change.path ?? this.path, change.query ?? this.query, change.fragment ?? this.fragment);
	}

	public toString(): string {
		const encodedPath = this.path
			.split('/')
			.map(segment => encodeURIComponent(segment).replace(/%3A/gi, ':'))
			.join('/');
		let result = `${this.scheme}://${this.authority}${encodedPath}`;
		if (this.query) {
			result += `?${this.query}`;
		}
		if (this.fragment) {
			result += `#${this.fragment}`;
		}
		return result;
	}

	public toJSON(): string {
		return this.toString();
	}
}
