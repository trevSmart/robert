import * as vscode from 'vscode';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ErrorHandler } from '../ErrorHandler';

/**
 * Manages webview HTML content generation, CSP headers, and resource URI resolution.
 * Handles loading and processing HTML templates with placeholder replacements.
 */
export class WebviewContentManager {
	constructor(
		private extensionUri: vscode.Uri,
		private errorHandler: ErrorHandler
	) {}

	/**
	 * Generate HTML for main webview with placeholders resolved
	 */
	public async getHtmlForWebview(webview: vscode.Webview, context: string, webviewId?: string): Promise<string> {
		return (
			(await this.errorHandler.executeWithErrorHandling(async () => {
				this.errorHandler.logInfo(`Main webview content rendered for context: ${context}`, 'WebviewContentManager.getHtmlForWebview');

				const rebusLogoUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'resources', 'icons', 'robert-logo.png'));
				const rallyLogoUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'resources', 'icons', 'rally-logo.webp'));
				const interFontUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'resources', 'fonts', 'Inter-Variable.woff2'));

				return this.getHtmlFromBuild(webview, 'main.html', {
					__WEBVIEW_ID__: webviewId || 'unknown',
					__CONTEXT__: context,
					__TIMESTAMP__: new Date().toISOString(),
					__REBUS_LOGO_URI__: rebusLogoUri.toString(),
					__INTER_FONT_URI__: interFontUri.toString(),
					__RALLY_LOGO_URI__: rallyLogoUri.toString()
				});
			}, 'WebviewContentManager.getHtmlForWebview')) || '<html><body><p>Error loading webview</p></body></html>'
		);
	}

	/**
	 * Generate HTML for loading screen
	 */
	public async getHtmlForLoading(webview: vscode.Webview): Promise<string> {
		return (
			(await this.errorHandler.executeWithErrorHandling(async () => {
				this.errorHandler.logInfo('Loading webview content rendered', 'WebviewContentManager.getHtmlForLoading');
				const videoUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'resources', 'video.mp4'));
				return fs.readFileSync(path.join(this.extensionUri.fsPath, 'src', 'webview', 'loading.html'), 'utf8').replace('__VIDEO_URI__', videoUri.toString());
			}, 'WebviewContentManager.getHtmlForLoading')) || '<html><body><p>Error loading loading screen</p></body></html>'
		);
	}

	/**
	 * Generate HTML for logo screen
	 */
	public async getHtmlForLogo(webview: vscode.Webview): Promise<string> {
		return (
			(await this.errorHandler.executeWithErrorHandling(async () => {
				this.errorHandler.logInfo('Logo webview content rendered from build HTML', 'WebviewContentManager.getHtmlForLogo');
				const rebusLogoUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'resources', 'icons', 'robert-logo.png'));
				const interFontUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'resources', 'fonts', 'Inter-Variable.woff2'));
				return this.getHtmlFromBuild(webview, 'logo.html', {
					__REBUS_LOGO_URI__: rebusLogoUri.toString(),
					__INTER_FONT_URI__: interFontUri.toString()
				});
			}, 'WebviewContentManager.getHtmlForLogo')) || '<html><body><p>Error loading logo</p></body></html>'
		);
	}

	/**
	 * Load and process HTML from build directory with placeholder replacement and resource URI resolution
	 */
	private getHtmlFromBuild(webview: vscode.Webview, htmlFile: string, placeholders: Record<string, string>): string {
		const buildDirFsPath = path.join(this.extensionUri.fsPath, 'out', 'webview', 'src', 'webview');
		const htmlPath = path.join(buildDirFsPath, htmlFile);

		let html = '';
		try {
			html = fs.readFileSync(htmlPath, 'utf8');
		} catch (error) {
			this.errorHandler.logWarning(`Failed to read ${htmlFile}: ${error instanceof Error ? error.message : String(error)}`, 'WebviewContentManager.getHtmlFromBuild');
			return '<html><body><p>Webview UI is missing. Please rebuild the webview bundle.</p></body></html>';
		}

		for (const [key, value] of Object.entries(placeholders)) {
			html = html.split(key).join(value);
		}

		const toWebviewUri = (rawPath: string): string => {
			const clean = rawPath.replace(/^\.?\/?/, '');
			const parts = clean.split('/');
			return webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'out', 'webview', ...parts)).toString();
		};

		html = html.replace(/\b(href|src)="([^"]+)"/g, (match, attr, value) => {
			if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:') || value.startsWith('vscode-resource:') || value.startsWith('vscode-webview-resource:') || value.startsWith('#') || value.startsWith('mailto:')) {
				return match;
			}
			const uri = toWebviewUri(value.replace(/^\//, ''));
			return `${attr}="${uri}"`;
		});

		const cspMeta = this.buildCspMeta(webview);
		const bridgeUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'webview-bridge.js'));
		const bridgeScript = `<script src="${bridgeUri.toString()}"></script>`;
		html = html.replace('<head>', `<head>${cspMeta}${bridgeScript}`);

		return html;
	}

	/**
	 * Build Content Security Policy meta tag for webview
	 */
	private buildCspMeta(webview: vscode.Webview): string {
		const csp = [
			"default-src 'none'",
			`img-src ${webview.cspSource} https: data:`,
			`script-src ${webview.cspSource} 'unsafe-eval' 'unsafe-inline'`,
			`style-src ${webview.cspSource} 'unsafe-inline'`,
			`font-src ${webview.cspSource} https: data:`,
			`connect-src ${webview.cspSource} https:`,
			"frame-ancestors 'none'",
			"base-uri 'self'"
		].join('; ');
		return `<meta http-equiv="Content-Security-Policy" content="${csp}">`;
	}
}
