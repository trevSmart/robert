// Bridge script injected into Robert webviews.
(function () {
	try {
		let vscode = null;
		if (typeof window !== 'undefined' && window.__vscodeApi) {
			vscode = window.__vscodeApi;
		} else if (typeof acquireVsCodeApi === 'function') {
			try {
				vscode = acquireVsCodeApi();
				if (typeof window !== 'undefined') {
					window.__vscodeApi = vscode;
				}
			} catch {
				vscode = null;
			}
		}

		if (!vscode) {
			return;
		}

		const shouldIgnoreWebviewError = (message) => {
			const normalized = String(message || '').trim();
			if (!normalized || normalized === 'Unspecified webview error' || normalized === 'Script error.') {
				return true;
			}
			return /ResizeObserver loop/i.test(normalized);
		};

		const getWebviewId = () => {
			try {
				return typeof window !== 'undefined' && window.webviewId ? String(window.webviewId) : undefined;
			} catch {
				return undefined;
			}
		};

		window.addEventListener(
			'error',
			(e) => {
				try {
					const message = String((e && e.message) || '');
					if (shouldIgnoreWebviewError(message)) {
						return;
					}
					vscode.postMessage({
						command: 'webviewError',
						source: 'window.error',
						webviewId: getWebviewId(),
						message,
						stack: e && e.error && e.error.stack ? String(e.error.stack) : undefined,
						filename: e && e.filename,
						lineno: e && e.lineno,
						colno: e && e.colno
					});
				} catch {}
			},
			true
		);

		window.addEventListener('unhandledrejection', (e) => {
			try {
				const reason = e && e.reason;
				const message = reason && reason.message ? String(reason.message) : String(reason);
				if (shouldIgnoreWebviewError(message)) {
					return;
				}
				vscode.postMessage({
					command: 'webviewError',
					source: 'unhandledrejection',
					webviewId: getWebviewId(),
					message,
					stack: reason && reason.stack ? String(reason.stack) : undefined
				});
			} catch (_) {}
		});
	} catch {
		// noop
	}
})();
