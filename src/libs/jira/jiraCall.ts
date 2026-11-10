type JiraBroadcaster = (message: { command: string; label?: string; callId?: string }) => void;

let jiraBroadcaster: JiraBroadcaster | null = null;

export function setJiraBroadcaster(fn: JiraBroadcaster | null): void {
	jiraBroadcaster = fn;
}

/**
 * Executa una crida a Jira notificant les webviews (indicador de càrrega) a l'inici i al final.
 */
export async function callJira<T>(fn: () => Promise<T>, label: string): Promise<T> {
	const callId = `jira-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
	jiraBroadcaster?.({ command: 'jiraCallStarted', label, callId });
	try {
		return await fn();
	} finally {
		jiraBroadcaster?.({ command: 'jiraCallFinished', callId });
	}
}
