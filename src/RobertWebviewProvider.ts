import * as vscode from 'vscode';

export class RobertWebviewProvider implements vscode.WebviewViewProvider, vscode.CustomTextEditorProvider {
	public static readonly viewType = 'robert.mainView';
	public static readonly editorType = 'robert.editor';

	private _disposables: vscode.Disposable[] = [];
	private _currentPanel: vscode.WebviewPanel | undefined;
	private _currentView?: vscode.WebviewView;

	constructor(private readonly _extensionUri: vscode.Uri) {}

	// WebviewView implementation (for activity bar)
	public resolveWebviewView(webviewView: vscode.WebviewView, _context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken) {
		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this._extensionUri]
		};

		this._currentView = webviewView;

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview, 'activity-bar');

		// Handle messages from webview
		this._setWebviewMessageListener(webviewView.webview);
	}

	public postMessageToView(message: { command: string; [key: string]: unknown }) {
		if (this._currentView) {
			this._currentView.webview.postMessage(message);
		}
	}

	// CustomTextEditor implementation (for editor tab)
	public async resolveCustomTextEditor(_document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel, _token: vscode.CancellationToken): Promise<void> {
		webviewPanel.webview.options = {
			enableScripts: true,
			localResourceRoots: [this._extensionUri]
		};

		webviewPanel.webview.html = this._getHtmlForWebview(webviewPanel.webview, 'editor-tab');

		// Handle messages from webview
		this._setWebviewMessageListener(webviewPanel.webview);
	}

	// WebviewPanel implementation (for separate window)
	public createWebviewPanel(): vscode.WebviewPanel {
		// If panel already exists and is visible, reveal it
		if (this._currentPanel) {
			this._currentPanel.reveal(vscode.ViewColumn.One);
			return this._currentPanel;
		}

		// Create new panel
		const panel = vscode.window.createWebviewPanel('robert', 'Robert', vscode.ViewColumn.One, {
			enableScripts: true,
			localResourceRoots: [this._extensionUri]
		});

		// Store reference to current panel
		this._currentPanel = panel;

		panel.webview.html = this._getHtmlForWebview(panel.webview, 'separate-window');

		// Handle messages from webview
		this._setWebviewMessageListener(panel.webview);

		// Handle panel close
		panel.onDidDispose(
			() => {
				// Clear reference when panel is closed
				this._currentPanel = undefined;
			},
			undefined,
			this._disposables
		);

		return panel;
	}

	// Small, lightweight panel to show the logo and short info
	public createLogoPanel(): vscode.WebviewPanel {
		// If panel already exists and is visible, reveal it
		if (this._currentPanel) {
			this._currentPanel.reveal(vscode.ViewColumn.One);
			return this._currentPanel;
		}

		const panel = vscode.window.createWebviewPanel('robert.logo', 'Robert — Logo', vscode.ViewColumn.One, {
			enableScripts: false,
			localResourceRoots: [this._extensionUri]
		});

		this._currentPanel = panel;

		panel.webview.html = this._getHtmlForLogo(panel.webview);

		panel.onDidDispose(
			() => {
				this._currentPanel = undefined;
			},
			undefined,
			this._disposables
		);

		return panel;
	}

	private _getHtmlForLogo(webview: vscode.Webview): string {
		const logoUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'icons', 'ibm-logo.webp'));
		return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin: 0; display:flex; align-items:center; justify-content:center; height:100vh; background: var(--vscode-editor-background); color: var(--vscode-foreground); font-family: var(--vscode-font-family); }
    .card { text-align:center; padding:16px; border-radius:8px; box-shadow: 0 2px 8px rgba(0,0,0,0.2); background: var(--vscode-input-background); }
    img { width: 64px; height:64px; display:block; margin:0 auto 8px; }
    h1 { font-size: 16px; margin: 0 0 8px 0; }
    p { margin: 0; font-size: 12px; color: var(--vscode-descriptionForeground); }
  </style>
<\x2fhead>
<body>
  <div class="card">
    <img src="${logoUri}" alt="Robert logo" />
    <h1>Robert</h1>
    <p>Click the activity bar to open the full view.</p>
  </div>
</body>
</html>`;
	}

	private _getHtmlForWebview(webview: vscode.Webview, context: string): string {
		return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Robert</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            margin: 5px;
        }
        .button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .content {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 5px;
            padding: 20px;
            min-height: 300px;
        }
        .loading {
            display: none;
            text-align: center;
            padding: 20px;
        }
        .loading.show {
            display: block;
        }
        .spinner {
            border: 2px solid var(--vscode-panel-border);
            border-top: 2px solid var(--vscode-button-background);
            border-radius: 50%;
            width: 20px;
            height: 20px;
            animation: spin 1s linear infinite;
            margin: 0 auto 10px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .progress-container {
            margin: 20px 0;
            padding: 20px;
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 5px;
        }
        .progress-bar-container {
            width: 100%;
            height: 20px;
            background-color: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 10px;
            overflow: hidden;
            margin: 10px 0;
        }
        .progress-bar {
            height: 100%;
            background-color: var(--vscode-progressBar-background);
            width: 0%;
            transition: width 0.3s ease;
            border-radius: 10px;
        }
        .progress-text {
            text-align: center;
            font-size: 14px;
            color: var(--vscode-foreground);
            margin-top: 5px;
        }
        .progress-controls {
            display: flex;
            gap: 10px;
            justify-content: center;
            margin-top: 15px;
        }
        .demo-section {
            margin: 20px 0;
            padding: 20px;
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 5px;
        }
        .demo-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        .demo-item {
            padding: 15px;
            background-color: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 5px;
            text-align: center;
        }
        .demo-item h4 {
            margin: 0 0 10px 0;
            color: var(--vscode-foreground);
        }
        .demo-item p {
            margin: 0 0 15px 0;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <img src="${webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'icons', 'ibm-logo.webp'))}"
                     alt="IBM Logo"
                     style="width: 32px; height: 32px;">
                <h1 style="margin: 0;">Robert</h1>
            </div>
            <p>VS Code Extension</p>
        </div>

        <div class="content">
            <h2>Welcome to Robert!</h2>
            <p>This is a VS Code extension that can be displayed in multiple contexts:</p>
            <ul>
                <li><strong>Activity Bar:</strong> As a sidebar view</li>
                <li><strong>Editor Tab:</strong> As a custom editor</li>
                <li><strong>Separate Window:</strong> As a standalone panel</li>
            </ul>

            <div style="text-align: center; margin-top: 20px;">
                <button class="button" onclick="sendMessage('hello')">Send Hello Message</button>
                <button class="button" onclick="sendMessage('info')">Get Info</button>
            </div>

            <div class="progress-container">
                <h3 style="margin-top: 0; color: var(--vscode-foreground);">Progress Demo</h3>
                <div class="progress-bar-container">
                    <div class="progress-bar" id="progressBar"></div>
                </div>
                <div class="progress-text" id="progressText">0%</div>
                <div class="progress-controls">
                    <button class="button" onclick="startProgress()">Start Progress</button>
                    <button class="button" onclick="stopProgress()">Stop Progress</button>
                    <button class="button" onclick="resetProgress()">Reset</button>
                </div>
            </div>

            <div class="demo-section">
                <h3>Web Content Examples</h3>
                <div class="demo-grid">
                    <div class="demo-item">
                        <h4>📊 Charts & Graphs</h4>
                        <p>Interactive charts using Chart.js, D3.js, etc.</p>
                        <button class="button" onclick="showDemo('charts')">View Chart Demo</button>
                    </div>
                    <div class="demo-item">
                        <h4>🎨 Rich Media</h4>
                        <p>Images, videos, audio players, canvas drawing</p>
                        <button class="button" onclick="showDemo('media')">View Media Demo</button>
                    </div>
                    <div class="demo-item">
                        <h4>📝 Forms & Inputs</h4>
                        <p>Text inputs, dropdowns, checkboxes, file uploads</p>
                        <button class="button" onclick="showDemo('forms')">View Form Demo</button>
                    </div>
                    <div class="demo-item">
                        <h4>🎯 Interactive Games</h4>
                        <p>Simple games, puzzles, or interactive experiences</p>
                        <button class="button" onclick="showDemo('games')">View Game Demo</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="loading" id="loading">
            <div class="spinner"></div>
            <p>Loading...</p>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let isLoading = false;
        let progressInterval = null;
        let currentProgress = 0;

        function showLoading() {
            if (!isLoading) {
                isLoading = true;
                document.getElementById('loading').classList.add('show');
            }
        }

        function hideLoading() {
            if (isLoading) {
                isLoading = false;
                document.getElementById('loading').classList.remove('show');
            }
        }

        function updateProgressBar(progress) {
            const progressBar = document.getElementById('progressBar');
            const progressText = document.getElementById('progressText');

            progressBar.style.width = progress + '%';
            progressText.textContent = Math.round(progress) + '%';
        }

        function startProgress() {
            if (progressInterval) {
                clearInterval(progressInterval);
            }

            progressInterval = setInterval(() => {
                currentProgress += Math.random() * 5; // Random increment for demo
                if (currentProgress >= 100) {
                    currentProgress = 100;
                    clearInterval(progressInterval);
                    progressInterval = null;
                }
                updateProgressBar(currentProgress);
            }, 200);
        }

        function stopProgress() {
            if (progressInterval) {
                clearInterval(progressInterval);
                progressInterval = null;
            }
        }

        function resetProgress() {
            stopProgress();
            currentProgress = 0;
            updateProgressBar(currentProgress);
        }

        function sendMessage(type) {
            showLoading();

            // Simulate a brief loading time for better UX
            setTimeout(() => {
                vscode.postMessage({
                    command: type,
                    context: '${context}',
                    timestamp: new Date().toISOString()
                });
                hideLoading();
            }, 300);
        }

        function showDemo(demoType) {
            // Placeholder for demo functionality
            vscode.postMessage({
                command: 'showDemo',
                demoType: demoType,
                context: '${context}',
                timestamp: new Date().toISOString()
            });
        }

        // Listen for messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'showLogo') {
                const container = document.querySelector('.container');
                const LOGO_URI = '${webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'icons', 'ibm-logo.webp'))}';
                if (container) {
                    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;padding:20px;">' +
                        '<div style="text-align:center;background:var(--vscode-input-background);padding:16px;border-radius:8px;">' +
                        '<img src="' + LOGO_URI + '" style="width:64px;height:64px;display:block;margin:0 auto 8px;" />' +
                        '<h1 style="margin:0;font-size:16px;color:var(--vscode-foreground);">Robert</h1>' +
                        '<p style="margin:4px 0 0 0;color:var(--vscode-descriptionForeground);font-size:12px;">Click the activity bar to open the full view.</p>' +
                        '</div></div>';
                }
            }
        });

        // Hide loading after initial render
        window.addEventListener('load', () => {
            setTimeout(() => {
                hideLoading();
            }, 100);
        });
    </script>
</body>
</html>`;
	}

	private _setWebviewMessageListener(webview: vscode.Webview) {
		webview.onDidReceiveMessage(
			(message) => {
				switch (message.command) {
					case 'hello':
						vscode.window.showInformationMessage(`Hello from ${message.context}!`);
						break;
					case 'info':
						vscode.window.showInformationMessage(`Context: ${message.context}, Time: ${message.timestamp}`);
						break;
					case 'showDemo':
						vscode.window.showInformationMessage(`Demo for ${message.demoType} not implemented yet. Try adding Chart.js, D3.js, or other libraries!`);
						break;
				}
			},
			undefined,
			this._disposables
		);
	}

	public dispose() {
		for (const disposable of this._disposables) {
			disposable.dispose();
		}
	}
}
