import { ErrorHandler } from '../../ErrorHandler';
import { SettingsManager } from '../../SettingsManager';

export interface WebSocketMessage {
	type: string;
	[key: string]: unknown;
}

export type WebSocketEventHandler = (data: unknown) => void;

export class WebSocketClient {
	private static instance: WebSocketClient;
	private _errorHandler: ErrorHandler;
	private _settingsManager: SettingsManager;
	private _ws: WebSocket | null = null;
	private _serverUrl: string | null = null;
	private _rallyUserId: string | null = null;
	private _displayName: string | null = null;
	private _reconnectAttempts: number = 0;
	private _maxReconnectAttempts: number = 5;
	private _reconnectDelay: number = 3000;
	private _reconnectTimer: NodeJS.Timeout | null = null;
	private _eventHandlers: Map<string, Set<WebSocketEventHandler>> = new Map();
	private _isConnecting: boolean = false;

	private constructor() {
		this._errorHandler = ErrorHandler.getInstance();
		this._settingsManager = SettingsManager.getInstance();
	}

	public static getInstance(): WebSocketClient {
		if (!WebSocketClient.instance) {
			WebSocketClient.instance = new WebSocketClient();
		}
		return WebSocketClient.instance;
	}

	public setServerUrl(url: string): void {
		this._serverUrl = url;
		this._errorHandler.logInfo(`WebSocket server URL set to: ${url}`, 'WebSocketClient');
	}

	public setUserInfo(rallyUserId: string, displayName: string): void {
		this._rallyUserId = rallyUserId;
		this._displayName = displayName;
		this._errorHandler.logInfo(`WebSocket user info set: ${rallyUserId} (${displayName})`, 'WebSocketClient');
	}

	private getWebSocketUrl(): string {
		if (!this._serverUrl) {
			const url = this._settingsManager.getSetting('collaborationServerUrl');
			if (!url) {
				throw new Error('Collaboration server URL not configured');
			}
			this._serverUrl = url;
		}

		// Convert HTTP URL to WebSocket URL
		const wsUrl = this._serverUrl.replace(/^http/, 'ws');
		return `${wsUrl}/ws`;
	}

	public connect(): Promise<void> {
		return new Promise((resolve, reject) => {
			if (this._isConnecting || (this._ws && this._ws.readyState === WebSocket.OPEN)) {
				resolve();
				return;
			}

			if (this._isConnecting) {
				reject(new Error('Connection already in progress'));
				return;
			}

			this._isConnecting = true;

			try {
				const wsUrl = this.getWebSocketUrl();
				this._errorHandler.logInfo(`Connecting to WebSocket: ${wsUrl}`, 'WebSocketClient');

				const ws = new WebSocket(wsUrl);
				this._ws = ws;

				ws.onopen = () => {
					this._errorHandler.logInfo('WebSocket connected', 'WebSocketClient');
					this._isConnecting = false;
					this._reconnectAttempts = 0;

					// Authenticate
					if (this._rallyUserId) {
						this.send({
							type: 'authenticate',
							rallyUserId: this._rallyUserId,
							displayName: this._displayName || 'Unknown User'
						});
					}

					resolve();
				};

				ws.onmessage = event => {
					try {
						const message: WebSocketMessage = JSON.parse(event.data as string);
						this.handleMessage(message);
					} catch (error) {
						this._errorHandler.logWarning(`Failed to parse WebSocket message: ${error instanceof Error ? error.message : String(error)}`, 'WebSocketClient');
					}
				};

				ws.onerror = error => {
					this._errorHandler.logWarning(`WebSocket error: ${error}`, 'WebSocketClient');
					this._isConnecting = false;
					reject(error);
				};

				ws.onclose = event => {
					this._errorHandler.logInfo(`WebSocket closed: code=${event.code}, reason=${event.reason || 'none'}`, 'WebSocketClient');
					this._isConnecting = false;
					this._ws = null;

					// Attempt to reconnect if not a normal closure
					if (event.code !== 1000 && this._reconnectAttempts < this._maxReconnectAttempts) {
						this.scheduleReconnect();
					}
				};
			} catch (error) {
				this._isConnecting = false;
				reject(error);
			}
		});
	}

	public disconnect(): void {
		if (this._reconnectTimer) {
			clearTimeout(this._reconnectTimer);
			this._reconnectTimer = null;
		}

		if (this._ws) {
			this._ws.close(1000, 'Client disconnect');
			this._ws = null;
		}

		this._errorHandler.logInfo('WebSocket disconnected', 'WebSocketClient');
	}

	public send(message: WebSocketMessage): void {
		if (!this._ws || this._ws.readyState !== WebSocket.OPEN) {
			this._errorHandler.logWarning('Cannot send message: WebSocket not connected', 'WebSocketClient');
			return;
		}

		try {
			this._ws.send(JSON.stringify(message));
		} catch (error) {
			this._errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'WebSocketClient.send');
		}
	}

	public subscribeNotifications(): void {
		this.send({ type: 'subscribe:notifications' });
	}

	public subscribeUserStory(userStoryId: string): void {
		this.send({
			type: 'subscribe:userStory',
			userStoryId
		});
	}

	public unsubscribeUserStory(userStoryId: string): void {
		this.send({
			type: 'unsubscribe:userStory',
			userStoryId
		});
	}

	public on(event: string, handler: WebSocketEventHandler): void {
		if (!this._eventHandlers.has(event)) {
			this._eventHandlers.set(event, new Set());
		}
		this._eventHandlers.get(event)!.add(handler);
	}

	public off(event: string, handler: WebSocketEventHandler): void {
		const handlers = this._eventHandlers.get(event);
		if (handlers) {
			handlers.delete(handler);
		}
	}

	private handleMessage(message: WebSocketMessage): void {
		const { type, ...data } = message;

		// Handle specific message types
		switch (type) {
			case 'authenticated':
				this._errorHandler.logInfo('WebSocket authenticated', 'WebSocketClient');
				this.emit('authenticated', data);
				break;

			case 'notification:new':
				this.emit('notification:new', data);
				break;

			case 'message:new':
				this.emit('message:new', data);
				break;

			case 'message:updated':
				this.emit('message:updated', data);
				break;

			case 'message:deleted':
				this.emit('message:deleted', data);
				break;

			case 'error':
				this._errorHandler.logWarning(`WebSocket error: ${(data as { message?: string }).message || 'Unknown error'}`, 'WebSocketClient');
				this.emit('error', data);
				break;

			default:
				this._errorHandler.logInfo(`Unknown WebSocket message type: ${type}`, 'WebSocketClient');
				this.emit(type, data);
		}
	}

	private emit(event: string, data: unknown): void {
		const handlers = this._eventHandlers.get(event);
		if (handlers) {
			handlers.forEach(handler => {
				try {
					handler(data);
				} catch (error) {
					this._errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), `WebSocketClient.emit.${event}`);
				}
			});
		}
	}

	private scheduleReconnect(): void {
		if (this._reconnectTimer) {
			return;
		}

		this._reconnectAttempts++;
		const delay = this._reconnectDelay * this._reconnectAttempts;

		this._errorHandler.logInfo(`Scheduling WebSocket reconnect attempt ${this._reconnectAttempts}/${this._maxReconnectAttempts} in ${delay}ms`, 'WebSocketClient');

		this._reconnectTimer = setTimeout(() => {
			this._reconnectTimer = null;
			this.connect().catch(error => {
				this._errorHandler.logWarning(`Reconnect attempt failed: ${error instanceof Error ? error.message : String(error)}`, 'WebSocketClient');
			});
		}, delay);
	}

	public isConnected(): boolean {
		return this._ws !== null && this._ws.readyState === WebSocket.OPEN;
	}
}
