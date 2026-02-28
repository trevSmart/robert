import type { RallyApi, RallyQueryOptions } from 'ibm-rally-node';

type RallyBroadcaster = (message: { command: string; label?: string; callId?: string }) => void;

let rallyBroadcaster: RallyBroadcaster | null = null;

export function setRallyBroadcaster(fn: RallyBroadcaster | null): void {
	rallyBroadcaster = fn;
}

export async function callRally<T = unknown>(rallyApi: RallyApi, options: RallyQueryOptions | Record<string, unknown>, label: string): Promise<T> {
	const callId = `rally-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
	rallyBroadcaster?.({ command: 'rallyCallStarted', label, callId });
	try {
		return (await rallyApi.query(options as RallyQueryOptions)) as T;
	} finally {
		rallyBroadcaster?.({ command: 'rallyCallFinished', callId });
	}
}

export async function callRallyFetch<T>(fn: () => Promise<T>, label: string): Promise<T> {
	const callId = `rally-fetch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
	rallyBroadcaster?.({ command: 'rallyCallStarted', label, callId });
	try {
		return await fn();
	} finally {
		rallyBroadcaster?.({ command: 'rallyCallFinished', callId });
	}
}
