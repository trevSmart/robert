import { useSyncExternalStore } from 'react';

/**
 * Active data provider as reported by the extension host ("jira" | "rally").
 * Set from the `iterationsLoaded` payload (and the preloaded data); read by any
 * component through useProvider() without prop drilling.
 */
export type WebviewProvider = 'jira' | 'rally';

const listeners = new Set<() => void>();

const initialProvider = (): WebviewProvider => {
	const preloaded = typeof window !== 'undefined' ? window.__robertPreloadedData : undefined;
	return preloaded?.provider === 'rally' ? 'rally' : 'jira';
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
