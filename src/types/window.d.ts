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
		interFontUri?: string;
		testTabEnabled?: boolean;
		// Rally data pre-fetched by the extension (e.g. while the intro video plays)
		// and injected into the initial HTML so the UI can render without showing a
		// loading spinner. Mirrors the `iterationsLoaded` message payload.
		__robertPreloadedData?: {
			iterations: unknown[];
			currentUser: unknown;
			holidays: unknown[];
			collaborationEnabled: boolean;
			devMode: boolean;
			debugMode: boolean;
		};
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
