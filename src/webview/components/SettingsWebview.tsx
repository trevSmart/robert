import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Button, Checkbox, Dropdown, TextField } from 'vscrui';
import 'vscrui/dist/codicon.css';

interface SettingsProps {
	webviewId: string;
	context: string;
	timestamp: string;
	extensionUri: string;
}

interface SettingsData {
	apiUrl?: string;
	timeout?: number;
	autoRefresh?: boolean;
	theme?: string;
	debugMode?: boolean;
	notifications?: boolean;
}

const SettingsWebview: React.FC<SettingsProps> = ({ webviewId, context, extensionUri }) => {
	let vscode: ReturnType<typeof window.acquireVsCodeApi>;
	if (window?.acquireVsCodeApi) {
		vscode = window.acquireVsCodeApi();
	} else {
		vscode = {
			postMessage: () => {
				/* No-op fallback */
			}
		};
	}

	const [settings, setSettings] = useState<SettingsData>({
		apiUrl: '',
		timeout: 30,
		autoRefresh: false,
		theme: 'auto',
		debugMode: false,
		notifications: false
	});
	const [isLoading, setIsLoading] = useState(false);
	const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

	const showMessage = useCallback((text: string, type: 'success' | 'error') => {
		setMessage({ text, type });
		setTimeout(() => setMessage(null), 5000);
	}, []);

	useEffect(() => {
		// Load settings when page loads
		setTimeout(() => {
			vscode.postMessage({
				command: 'getSettings',
				webviewId: webviewId
			});
		}, 100);

		// Listen for messages from extension
		const handleMessage = (event: MessageEvent) => {
			const message = event.data;

			switch (message.command) {
				case 'settingsLoaded':
					setIsLoading(false);
					setSettings(message.settings || settings);
					break;
				case 'settingsSaved':
					setIsLoading(false);
					if (message.success) {
						showMessage('Settings saved successfully', 'success');
					}
					break;
				case 'settingsError':
					setIsLoading(false);
					showMessage(`Settings error: ${message.errors?.join(', ') || 'Unknown error'}`, 'error');
					break;
			}
		};

		window.addEventListener('message', handleMessage);
		return () => window.removeEventListener('message', handleMessage);
	}, [vscode, webviewId, settings, showMessage]);

	const updateSetting = <K extends keyof SettingsData>(key: K, value: SettingsData[K]) => {
		setSettings((prev) => ({ ...prev, [key]: value }));
	};

	const saveSettings = () => {
		setIsLoading(true);
		vscode.postMessage({
			command: 'saveSettings',
			webviewId: webviewId,
			settings: settings
		});
	};

	const resetSettings = () => {
		setIsLoading(true);
		vscode.postMessage({
			command: 'resetSettings',
			webviewId: webviewId
		});
	};

	const goBack = () => {
		vscode.postMessage({
			command: 'goBackToMain',
			webviewId: webviewId
		});
	};

	const themeOptions = [
		{ value: 'light', label: 'Light' },
		{ value: 'dark', label: 'Dark' },
		{ value: 'auto', label: 'Auto' }
	];

	return (
		<div
			style={{
				fontFamily: 'var(--vscode-font-family)',
				color: 'var(--vscode-foreground)',
				backgroundColor: 'var(--vscode-editor-background)',
				padding: '16px 32px',
				margin: 0,
				minHeight: '100vh'
			}}
		>
			<div style={{ maxWidth: '600px', margin: '0 auto' }}>
				<div style={{ marginBottom: '28px' }}>
					<h1
						style={{
							margin: 0,
							color: 'rgb(204, 204, 204)',
							fontSize: '16px',
							fontWeight: 600
						}}
					>
						Settings
					</h1>
				</div>

				{message && (
					<div
						style={{
							padding: '8px 12px',
							margin: '8px 0',
							borderRadius: '4px',
							fontSize: '13px',
							backgroundColor: message.type === 'error' ? 'var(--vscode-inputValidation-errorBackground)' : 'var(--vscode-inputValidation-infoBackground)',
							color: message.type === 'error' ? 'var(--vscode-inputValidation-errorBorder)' : 'var(--vscode-inputValidation-infoBorder)',
							border: `1px solid ${message.type === 'error' ? 'var(--vscode-inputValidation-errorBorder)' : 'var(--vscode-inputValidation-infoBorder)'}`
						}}
					>
						{message.text}
					</div>
				)}

				<div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
					{/* General Settings */}
					<div style={{ marginBottom: '16px' }}>
						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								backgroundColor: '#282828',
								borderRadius: '6px'
							}}
						>
							<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px' }}>
								<div style={{ flex: 1, minWidth: 0 }}>
									<div
										style={{
											fontWeight: 400,
											color: 'rgb(204, 204, 204)',
											margin: '0 0 4px 0',
											fontSize: '12px'
										}}
									>
										Auto Refresh
									</div>
									<div
										style={{
											color: 'color(srgb 0.8 0.8 0.8 / 0.68)',
											margin: 0,
											fontSize: '12px',
											lineHeight: 1.3,
											fontWeight: 400
										}}
									>
										Automatically refresh data periodically
									</div>
								</div>
								<div style={{ marginLeft: '16px', flexShrink: 0 }}>
									<Checkbox checked={settings.autoRefresh} onChange={(checked) => updateSetting('autoRefresh', checked)} />
								</div>
							</div>
							<div style={{ backgroundColor: 'color(srgb 0.8 0.8 0.8 / 0.08)', height: '1px', margin: '0 12px' }} />

							<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px' }}>
								<div style={{ flex: 1, minWidth: 0 }}>
									<div
										style={{
											fontWeight: 400,
											color: 'rgb(204, 204, 204)',
											margin: '0 0 4px 0',
											fontSize: '12px'
										}}
									>
										Debug Mode
									</div>
									<div
										style={{
											color: 'color(srgb 0.8 0.8 0.8 / 0.68)',
											margin: 0,
											fontSize: '12px',
											lineHeight: 1.3,
											fontWeight: 400
										}}
									>
										Enable debug information and logging
									</div>
								</div>
								<div style={{ marginLeft: '16px', flexShrink: 0 }}>
									<Checkbox checked={settings.debugMode} onChange={(checked) => updateSetting('debugMode', checked)} />
								</div>
							</div>
							<div style={{ backgroundColor: 'color(srgb 0.8 0.8 0.8 / 0.08)', height: '1px', margin: '0 12px' }} />

							<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px' }}>
								<div style={{ flex: 1, minWidth: 0 }}>
									<div
										style={{
											fontWeight: 400,
											color: 'rgb(204, 204, 204)',
											margin: '0 0 4px 0',
											fontSize: '12px'
										}}
									>
										Notifications
									</div>
									<div
										style={{
											color: 'color(srgb 0.8 0.8 0.8 / 0.68)',
											margin: 0,
											fontSize: '12px',
											lineHeight: 1.3,
											fontWeight: 400
										}}
									>
										Show notifications for important events
									</div>
								</div>
								<div style={{ marginLeft: '16px', flexShrink: 0 }}>
									<Checkbox checked={settings.notifications} onChange={(checked) => updateSetting('notifications', checked)} />
								</div>
							</div>
						</div>
					</div>

					{/* Appearance Settings */}
					<div style={{ marginBottom: '16px' }}>
						<div
							style={{
								fontSize: '12px',
								fontWeight: 400,
								color: 'color(srgb 0.8 0.8 0.8 / 0.68)',
								letterSpacing: '0.5px',
								margin: '0 0 8px 0',
								paddingLeft: '7px'
							}}
						>
							Appearance
						</div>
						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								backgroundColor: '#282828',
								borderRadius: '6px'
							}}
						>
							<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px' }}>
								<div style={{ flex: 1, minWidth: 0 }}>
									<div
										style={{
											fontWeight: 400,
											color: 'rgb(204, 204, 204)',
											margin: '0 0 4px 0',
											fontSize: '12px'
										}}
									>
										Theme
									</div>
									<div
										style={{
											color: 'color(srgb 0.8 0.8 0.8 / 0.68)',
											margin: 0,
											fontSize: '12px',
											lineHeight: 1.3,
											fontWeight: 400
										}}
									>
										Choose the display theme
									</div>
								</div>
								<div style={{ marginLeft: '16px', flexShrink: 0 }}>
									<Dropdown options={themeOptions} value={themeOptions.find((opt) => opt.value === settings.theme)} onChange={(value) => updateSetting('theme', typeof value === 'string' ? value : value?.value || 'auto')} />
								</div>
							</div>
						</div>
					</div>

					{/* API Settings */}
					<div style={{ marginBottom: '16px' }}>
						<div
							style={{
								fontSize: '12px',
								fontWeight: 400,
								color: 'color(srgb 0.8 0.8 0.8 / 0.68)',
								letterSpacing: '0.5px',
								margin: '0 0 8px 0',
								paddingLeft: '7px'
							}}
						>
							API Settings
						</div>
						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								backgroundColor: '#282828',
								borderRadius: '6px'
							}}
						>
							<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px' }}>
								<div style={{ flex: 1, minWidth: 0 }}>
									<div
										style={{
											fontWeight: 400,
											color: 'rgb(204, 204, 204)',
											margin: '0 0 4px 0',
											fontSize: '12px'
										}}
									>
										API URL
									</div>
									<div
										style={{
											color: 'color(srgb 0.8 0.8 0.8 / 0.68)',
											margin: 0,
											fontSize: '12px',
											lineHeight: 1.3,
											fontWeight: 400
										}}
									>
										The base URL for the Robert API
									</div>
								</div>
								<div style={{ marginLeft: '16px', flexShrink: 0 }}>
									<TextField value={settings.apiUrl} onChange={(value) => updateSetting('apiUrl', value)} placeholder="https://api.example.com" />
								</div>
							</div>
							<div style={{ backgroundColor: 'color(srgb 0.8 0.8 0.8 / 0.08)', height: '1px', margin: '0 12px' }} />

							<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px' }}>
								<div style={{ flex: 1, minWidth: 0 }}>
									<div
										style={{
											fontWeight: 400,
											color: 'rgb(204, 204, 204)',
											margin: '0 0 4px 0',
											fontSize: '12px'
										}}
									>
										Timeout
									</div>
									<div
										style={{
											color: 'color(srgb 0.8 0.8 0.8 / 0.68)',
											margin: 0,
											fontSize: '12px',
											lineHeight: 1.3,
											fontWeight: 400
										}}
									>
										Request timeout in seconds
									</div>
								</div>
								<div style={{ marginLeft: '16px', flexShrink: 0 }}>
									<TextField value={settings.timeout?.toString() || '30'} onChange={(value) => updateSetting('timeout', Number.parseInt(value, 10) || 30)} placeholder="30" />
								</div>
							</div>
						</div>
					</div>
				</div>

				{settings.debugMode && (
					<div
						style={{
							backgroundColor: 'var(--vscode-input-background)',
							border: '1px solid var(--vscode-input-border)',
							borderRadius: '4px',
							padding: '12px',
							margin: '16px 0',
							fontFamily: 'monospace',
							fontSize: '11px',
							color: 'var(--vscode-descriptionForeground)'
						}}
					>
						<strong>Debug Information:</strong>
						<br />
						Context: {context}
						<br />
						Webview ID: {webviewId}
						<br />
						Timestamp: {new Date().toISOString()}
						<br />
						Extension URI: {extensionUri}
					</div>
				)}

				<div
					style={{
						display: 'flex',
						gap: '16px',
						justifyContent: 'center',
						marginTop: '24px'
					}}
				>
					<Button onClick={saveSettings} appearance="primary">
						Save
					</Button>
					<Button onClick={resetSettings} appearance="secondary">
						Reset
					</Button>
					<Button onClick={goBack} appearance="secondary">
						Close
					</Button>
				</div>
			</div>

			{/* Loading Overlay */}
			{isLoading && (
				<div
					style={{
						position: 'fixed',
						top: 0,
						left: 0,
						width: '100%',
						height: '100%',
						backgroundColor: 'rgba(0, 0, 0, 0.5)',
						display: 'flex',
						justifyContent: 'center',
						alignItems: 'center',
						zIndex: 1000
					}}
				>
					<div
						style={{
							border: '3px solid var(--vscode-panel-border)',
							borderTop: '3px solid var(--vscode-button-background)',
							borderRadius: '50%',
							width: '32px',
							height: '32px',
							animation: 'spin 1s linear infinite'
						}}
					/>
				</div>
			)}
		</div>
	);
};

export default SettingsWebview;
