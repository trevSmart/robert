import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../ErrorHandler', () => ({
	ErrorHandler: {
		getInstance: vi.fn(() => ({ logInfo: vi.fn(), logWarning: vi.fn(), logDebug: vi.fn(), handleError: vi.fn() }))
	}
}));
vi.mock('../../SettingsManager', () => ({
	SettingsManager: { getInstance: vi.fn(() => ({ getSetting: vi.fn(() => 'https://collab.example.com') })) }
}));

/** Minimal WebSocket double whose events are fired by the test. */
class FakeWebSocket {
	static readonly CONNECTING = 0;
	static readonly OPEN = 1;
	static readonly CLOSED = 3;
	static instances: FakeWebSocket[] = [];

	readyState = FakeWebSocket.CONNECTING;
	sent: Array<Record<string, unknown>> = [];
	onopen: (() => void) | null = null;
	onmessage: ((event: { data: string }) => void) | null = null;
	onerror: ((error: unknown) => void) | null = null;
	onclose: ((event: { code: number }) => void) | null = null;

	constructor(public readonly url: string) {
		FakeWebSocket.instances.push(this);
	}

	send(data: string): void {
		this.sent.push(JSON.parse(data));
	}

	/** Closing is asynchronous in real WebSockets: onclose fires later (see fireClose). */
	close(): void {
		this.readyState = FakeWebSocket.CLOSED;
	}

	fireOpen(): void {
		this.readyState = FakeWebSocket.OPEN;
		this.onopen?.();
	}

	fireClose(code = 1000): void {
		this.readyState = FakeWebSocket.CLOSED;
		this.onclose?.({ code });
	}
}

const originalWebSocket = globalThis.WebSocket;
const lastSocket = (): FakeWebSocket => FakeWebSocket.instances[FakeWebSocket.instances.length - 1];

beforeEach(() => {
	FakeWebSocket.instances = [];
	(globalThis as unknown as { WebSocket: unknown }).WebSocket = FakeWebSocket;
});

afterEach(() => {
	(globalThis as unknown as { WebSocket: unknown }).WebSocket = originalWebSocket;
});

async function connectedClient() {
	const { WebSocketClient } = await import('./websocketClient.js');
	const client = WebSocketClient.getInstance();
	client.disconnect();
	client.setServerUrl('https://collab.example.com');
	client.setUserInfo('jira-user-1', 'Jira User');
	const connecting = client.connect();
	lastSocket().fireOpen();
	await connecting;
	return client;
}

describe('WebSocketClient reconnection', () => {
	it("ignores the replaced socket's late onclose after a reconnect", async () => {
		const client = await connectedClient();
		const oldSocket = lastSocket();

		// Rebind to another identity and reconnect, as refreshCollaborationIdentity() does.
		client.setUserInfo('rally-user-2', 'Rally User');
		client.disconnect();
		const reconnecting = client.connect();
		const newSocket = lastSocket();
		expect(newSocket).not.toBe(oldSocket);

		// The old socket's close event arrives before the new one opens.
		oldSocket.fireClose();
		newSocket.fireOpen();
		await reconnecting;

		expect(client.isConnected()).toBe(true);
		expect(newSocket.sent[0]).toMatchObject({ type: 'authenticate', rallyUserId: 'rally-user-2' });

		// ...and also when it arrives after the new socket is open.
		oldSocket.fireClose(1006);
		expect(client.isConnected()).toBe(true);
		client.subscribeNotifications();
		expect(newSocket.sent[newSocket.sent.length - 1]).toMatchObject({ type: 'subscribe:notifications' });
	});

	it('can connect again after disconnecting while a connection was in progress', async () => {
		const { WebSocketClient } = await import('./websocketClient.js');
		const client = WebSocketClient.getInstance();
		client.disconnect();
		client.setServerUrl('https://collab.example.com');

		void client.connect();
		const pending = lastSocket();
		client.disconnect();

		const reconnecting = client.connect();
		const fresh = lastSocket();
		expect(fresh).not.toBe(pending);
		fresh.fireOpen();
		await reconnecting;
		pending.fireClose(1006);

		expect(client.isConnected()).toBe(true);
	});
});
