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

		window.addEventListener(
			'error',
			(e) => {
				try {
					vscode.postMessage({
						command: 'webviewError',
						source: 'window.error',
						message: String((e && e.message) || 'Unspecified webview error'),
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
				vscode.postMessage({
					command: 'webviewError',
					source: 'unhandledrejection',
					message: reason && reason.message ? String(reason.message) : String(reason),
					stack: reason && reason.stack ? String(reason.stack) : undefined
				});
			} catch (_) {}
		});
	} catch {
		// noop
	}
})();
