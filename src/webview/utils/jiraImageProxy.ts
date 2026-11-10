import { getVsCodeApi } from './vscodeApi';

let requestCounter = 0;
const pendingRequests = new Map<string, { resolve: (dataUrl: string) => void; reject: (err: Error) => void }>();

// Listen for image fetch responses from the extension
if (typeof window !== 'undefined') {
	window.addEventListener('message', (event: MessageEvent) => {
		const msg = event.data;
		if (msg?.type === 'jiraImageFetched' && msg.requestId && pendingRequests.has(msg.requestId)) {
			const { resolve, reject } = pendingRequests.get(msg.requestId)!;
			pendingRequests.delete(msg.requestId);
			if (msg.dataUrl) {
				resolve(msg.dataUrl);
			} else {
				reject(new Error(msg.error || 'Unknown error'));
			}
		}
	});
}

function fetchJiraImage(url: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const vscode = getVsCodeApi();
		if (!vscode) {
			reject(new Error('No VS Code API'));
			return;
		}
		const requestId = `img-${++requestCounter}`;
		pendingRequests.set(requestId, { resolve, reject });
		vscode.postMessage({ command: 'fetchJiraImage', url, requestId });

		// Timeout after 15 seconds
		setTimeout(() => {
			if (pendingRequests.has(requestId)) {
				pendingRequests.delete(requestId);
				reject(new Error('Image fetch timed out'));
			}
		}, 15000);
	});
}

/**
 * Parses an HTML string, finds all <img> tags with Jira URLs,
 * fetches them via the extension proxy, and returns the HTML with
 * src attributes replaced by base64 data URLs.
 *
 * Jira images require Basic auth (email + API token) — the webview can't
 * add those to plain <img src="..."> requests.
 */
export async function processJiraHtmlImages(html: string, jiraBaseUrl?: string): Promise<string> {
	if (!html) return html;

	const imgSrcRegex = /<img([^>]*)\ssrc="([^"]+)"([^>]*)>/gi;
	const jiraUrls: string[] = [];

	let match: RegExpExecArray | null;
	while ((match = imgSrcRegex.exec(html)) !== null) {
		const src = match[2];
		if (isJiraUrl(src, jiraBaseUrl)) {
			jiraUrls.push(src);
		}
	}

	if (jiraUrls.length === 0) return html;

	// Fetch all images in parallel
	const uniqueUrls = [...new Set(jiraUrls)];
	const dataUrlMap = new Map<string, string>();

	await Promise.allSettled(
		uniqueUrls.map(async url => {
			try {
				const dataUrl = await fetchJiraImage(url);
				dataUrlMap.set(url, dataUrl);
			} catch {
				// Leave broken image as-is
			}
		})
	);

	// Replace src attributes in the HTML
	return html.replace(imgSrcRegex, (fullMatch, before, src, after) => {
		const dataUrl = dataUrlMap.get(src);
		if (dataUrl) {
			return `<img${before} src="${dataUrl}"${after}>`;
		}
		return fullMatch;
	});
}

function isJiraUrl(url: string, jiraBaseUrl?: string): boolean {
	if (!url || url.startsWith('data:')) return false;

	const isAllowedHost = (host: string, domain: string): boolean => host === domain || host.endsWith(`.${domain}`);

	try {
		// Support absolute and relative URLs.
		const parsedUrl = new URL(url, 'https://placeholder.local');
		const host = parsedUrl.hostname.toLowerCase();
		const path = parsedUrl.pathname.toLowerCase();

		if (jiraBaseUrl) {
			try {
				const baseHost = new URL(jiraBaseUrl).hostname.toLowerCase();
				if (isAllowedHost(host, baseHost)) return true;
			} catch {
				// Ignore invalid jiraBaseUrl and continue with default host checks.
			}
		}

		// Rally hosts: the proxy in the extension host attaches the Rally API key.
		if (isAllowedHost(host, 'rallydev.com') || isAllowedHost(host, 'rally.com')) {
			return true;
		}

		// Relative URLs (resolved against the placeholder host) are only trusted under /rest/, /secure/ or Rally's /slm/ path.
		return isAllowedHost(host, 'atlassian.net') || (host === 'placeholder.local' && (path.startsWith('/rest/') || path.startsWith('/secure/') || path.includes('/slm/')));
	} catch {
		return false;
	}
}
