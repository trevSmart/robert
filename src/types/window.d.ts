// Extend the Window interface to include VS Code API and custom properties
declare global {
	interface Window {
		acquireVsCodeApi(): {
			postMessage(message: unknown): void;
			setState(state: unknown): void;
			getState(): unknown;
		};
		webviewId?: string;
		context?: string;
		timestamp?: string;
		extensionUri?: string;
		rebusLogoUri?: string;
	}
}

export {};
