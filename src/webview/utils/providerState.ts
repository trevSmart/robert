import { useSyncExternalStore } from 'react';

/**
 * Active data provider as reported by the extension host ("jira" | "rally").
 * Initialised from the HTML injected by the host and updated by the `refresh`
 * and `iterationsLoaded` messages; read by any
 * component through useProvider() without prop drilling.
 */
export type WebviewProvider = 'jira' | 'rally';

const listeners = new Set<() => void>();

const initialProvider = (): WebviewProvider => {
	if (typeof window === 'undefined') {
		return 'jira';
	}
	// The host always injects the active provider into the HTML; preloaded data
	// is only present when the prefetch succeeded.
	const injected = window.robertProvider ?? window.__robertPreloadedData?.provider;
	return injected === 'rally' ? 'rally' : 'jira';
};

let current: WebviewProvider = initialProvider();

export function setWebviewProvider(value: unknown): void {
	const next: WebviewProvider = value === 'rally' ? 'rally' : 'jira';
	if (next === current) {
		return;
	}
	current = next;
	listeners.forEach(listener => listener());
}

export function getWebviewProvider(): WebviewProvider {
	return current;
}

export function useProvider(): {
	provider: WebviewProvider;
	isRally: boolean;
	label: string;
} {
	const provider = useSyncExternalStore(
		listener => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		() => current
	);
	return {
		provider,
		isRally: provider === 'rally',
		label: provider === 'rally' ? 'Rally' : 'Jira'
	};
}
