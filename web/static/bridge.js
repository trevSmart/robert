// Emulates the VS Code webview API over HTTP: postMessage -> POST, extension -> webview via SSE.
(function () {
	var clientId = (crypto.randomUUID && crypto.randomUUID()) || String(Date.now()) + Math.random();
	var queue = [];
	var open = false;
	var source = new EventSource('/events?clientId=' + clientId);

	source.onopen = function () {
		open = true;
		queue.splice(0).forEach(send);
	};
	source.onerror = function () {
		open = false;
	};
	source.onmessage = function (event) {
		var data;
		try {
			data = JSON.parse(event.data);
		} catch (e) {
			return;
		}
		window.dispatchEvent(new MessageEvent('message', { data: data }));
	};

	function send(message) {
		fetch('/message?clientId=' + clientId, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(message)
		}).catch(function (error) {
			console.error('[Robert] bridge send failed', error);
		});
	}

	var api = {
		postMessage: function (message) {
			if (open) send(message);
			else queue.push(message);
		},
		setState: function (state) {
			try {
				localStorage.setItem('robert.webviewState', JSON.stringify(state));
			} catch (e) {}
		},
		getState: function () {
			try {
				return JSON.parse(localStorage.getItem('robert.webviewState') || 'null');
			} catch (e) {
				return null;
			}
		}
	};
	window.acquireVsCodeApi = function () {
		return api;
	};
})();
