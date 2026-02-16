// Extend the Window interface to include VS Code API and custom properties
declare global {
	interface Window {
		acquireVsCodeApi?: () => {
			postMessage(message: Record<string, unknown>): void;
			setState(state: unknown): void;
			getState(): unknown;
		};
		__vscodeApi?: {
			postMessage(message: Record<string, unknown>): void;
			setState?(state: unknown): void;
			getState?(): unknown;
		};
		webviewId?: string;
		context?: string;
		timestamp?: string;
		extensionUri?: string;
		rebusLogoUri?: string;
	}

	// Web API globals
	var ResizeObserver: typeof ResizeObserver;

	namespace JSX {
		interface IntrinsicElements {
			'collapsible-card': {
				title: string;
				'default-collapsed'?: boolean;
				'background-color'?: string;
				children?: React.ReactNode;
				[key: string]: unknown;
			};
		}
	}
}

export {};
