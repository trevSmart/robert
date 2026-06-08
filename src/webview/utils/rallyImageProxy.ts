import { getVsCodeApi } from './vscodeApi';

let requestCounter = 0;
const pendingRequests = new Map<string, { resolve: (dataUrl: string) => void; reject: (err: Error) => void }>();

// Listen for image fetch responses from the extension
if (typeof window !== 'undefined') {
	window.addEventListener('message', (event: MessageEvent) => {
		const msg = event.data;
		if (msg?.type === 'rallyImageFetched' && msg.requestId && pendingRequests.has(msg.requestId)) {
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

function fetchRallyImage(url: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const vscode = getVsCodeApi();
		if (!vscode) {
			reject(new Error('No VS Code API'));
			return;
		}
		const requestId = `img-${++requestCounter}`;
		pendingRequests.set(requestId, { resolve, reject });
		vscode.postMessage({ command: 'fetchRallyImage', url, requestId });

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
 * Parses an HTML string, finds all <img> tags with Rally URLs,
 * fetches them via the extension proxy, and returns the HTML with
 * src attributes replaced by base64 data URLs.
 *
 * Rally images require zsessionid auth headers — the webview can't
 * add those to plain <img src="..."> requests.
 */
export async function processRallyHtmlImages(html: string, rallyBaseUrl?: string): Promise<string> {
	if (!html) return html;

	const imgSrcRegex = /<img([^>]*)\ssrc="([^"]+)"([^>]*)>/gi;
	const rallyUrls: string[] = [];

	let match: RegExpExecArray | null;
	while ((match = imgSrcRegex.exec(html)) !== null) {
		const src = match[2];
		if (isRallyUrl(src, rallyBaseUrl)) {
			rallyUrls.push(src);
		}
	}

	if (rallyUrls.length === 0) return html;

	// Fetch all images in parallel
	const uniqueUrls = [...new Set(rallyUrls)];
	const dataUrlMap = new Map<string, string>();

	await Promise.allSettled(
		uniqueUrls.map(async url => {
			try {
				const dataUrl = await fetchRallyImage(url);
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

function isRallyUrl(url: string, rallyBaseUrl?: string): boolean {
	if (!url || url.startsWith('data:')) return false;

	const isAllowedHost = (host: string, domain: string): boolean => host === domain || host.endsWith(`.${domain}`);

	try {
		// Support absolute and relative URLs.
		const parsedUrl = new URL(url, 'https://placeholder.local');
		const host = parsedUrl.hostname.toLowerCase();
		const path = parsedUrl.pathname.toLowerCase();

		if (rallyBaseUrl) {
			try {
				const baseHost = new URL(rallyBaseUrl).hostname.toLowerCase();
				if (isAllowedHost(host, baseHost)) return true;
			} catch {
				// Ignore invalid rallyBaseUrl and continue with default host checks.
			}
		}

		// Rally URLs typically contain /slm/ path or belong to rallydev.com / rally.com domains.
		return isAllowedHost(host, 'rallydev.com') || isAllowedHost(host, 'rally.com') || (host === 'placeholder.local' && path.includes('/slm/'));
	} catch {
		return false;
	}
}
