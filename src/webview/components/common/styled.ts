import styled from 'styled-components';

// Base container styles
export const Container = styled.div`
	font-family: var(--vscode-font-family);
	color: var(--vscode-foreground);
	background-color: var(--vscode-editor-background);
	margin: 0;
	min-height: 100vh;
`;

export const CenteredContainer = styled.div`
	max-width: 800px;
	margin: 0 auto;
`;

export const SettingsContainer = styled.div`
	max-width: 600px;
	margin: 0 auto;
`;

// Header styles
export const Header = styled.div`
	text-align: center;
	margin-bottom: 20px;
`;

export const LogoContainer = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 10px;
	margin-bottom: 6px;
`;

export const LogoImage = styled.img`
	width: 72px;
	height: auto;
	margin-right: 5px;
`;

export const Title = styled.h1`
	margin: 0;
	font-weight: 500;
	font-size: 28px;
`;

export const SettingsTitle = styled.h1`
	margin: 0;
	color: rgb(204, 204, 204);
	font-size: 16px;
	font-weight: 600;
`;

// Content areas
export const ContentArea = styled.div`
	background-color: var(--vscode-editor-background);
	padding: 20px;
	min-height: 300px;
`;

export const SettingsContent = styled.div`
	padding: 16px 32px;
`;

// Section styles
export const Section = styled.div`
	margin: 20px 0;
	padding: 20px;
	background-color: #282828;
	border-radius: 6px;
`;

export const SectionTitle = styled.div`
	font-size: 12px;
	font-weight: 400;
	color: color(srgb 0.8 0.8 0.8 / 0.68);
	letter-spacing: 0.5px;
	margin: 0 0 8px 0;
	padding-left: 7px;
`;

// Settings specific styles
export const SettingsSection = styled.div`
	margin-bottom: 16px;
`;

export const SettingsGroup = styled.div`
	display: flex;
	flex-direction: column;
	background-color: #282828;
	border-radius: 6px;
`;

export const SettingRow = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px;
`;

export const SettingInfo = styled.div`
	flex: 1;
	min-width: 0;
`;

export const SettingTitle = styled.div`
	font-weight: 400;
	color: rgb(204, 204, 204);
	margin: 0 0 4px 0;
	font-size: 12px;
`;

export const SettingDescription = styled.div`
	color: color(srgb 0.8 0.8 0.8 / 0.68);
	margin: 0;
	font-size: 12px;
	line-height: 1.3;
	font-weight: 400;
`;

export const SettingControl = styled.div`
	margin-left: 16px;
	flex-shrink: 0;
`;

export const SettingDivider = styled.div`
	background-color: color(srgb 0.8 0.8 0.8 / 0.08);
	height: 1px;
	margin: 0 12px;
`;

// Button groups
export const ButtonGroup = styled.div`
	display: flex;
	gap: 16px;
	justify-content: center;
	margin-top: 24px;
`;

export const ProgressControls = styled.div`
	display: flex;
	gap: 10px;
	justify-content: center;
	margin-top: 15px;
`;

// Demo grid
export const DemoGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
	gap: 15px;
	margin-top: 15px;
`;

export const DemoItem = styled.div`
	padding: 15px;
	background-color: var(--vscode-input-background);
	border: 1px solid var(--vscode-input-border);
	border-radius: 5px;
	text-align: center;
`;

export const DemoItemTitle = styled.h4`
	margin: 0 0 10px 0;
	color: var(--vscode-foreground);
	font-size: 14px;
	font-weight: normal;
`;

export const DemoItemDescription = styled.p`
	margin: 0 0 15px 0;
	font-size: 12px;
	color: var(--vscode-descriptionForeground);
`;

// Progress bar styles
export const ProgressContainer = styled.div`
	margin: 20px 0;
	padding: 20px;
	background-color: #282828;
	border-radius: 6px;
`;

export const ProgressBarContainer = styled.div`
	width: 100%;
	height: 20px;
	background-color: var(--vscode-input-background);
	border: 1px solid var(--vscode-input-border);
	border-radius: 10px;
	overflow: hidden;
	margin: 10px 0;
	position: relative;
`;

export const ProgressBar = styled.div<{ progress: number; color: string }>`
	height: 100%;
	background: ${(props) => props.color};
	width: ${(props) => props.progress}%;
	transition: width 0.3s ease, background 0.3s ease;
	border-radius: 10px;
`;

export const ProgressText = styled.div`
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	font-size: 12px;
	color: var(--vscode-foreground);
	font-weight: bold;
	text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
	z-index: 1;
`;

// Loading styles
export const LoadingOverlay = styled.div<{ show: boolean }>`
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background-color: rgba(0, 0, 0, 0.5);
	display: ${(props) => (props.show ? 'flex' : 'none')};
	justify-content: center;
	align-items: center;
	z-index: 1000;
`;

export const LoadingSpinner = styled.div`
	border: 3px solid var(--vscode-panel-border);
	border-top: 3px solid var(--vscode-button-background);
	border-radius: 50%;
	width: 32px;
	height: 32px;
	animation: spin 1s linear infinite;

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}
`;

// Message styles
export const Message = styled.div<{ type: 'success' | 'error' }>`
	padding: 8px 12px;
	margin: 8px 0;
	border-radius: 4px;
	font-size: 13px;
	background-color: ${(props) => (props.type === 'error' ? 'var(--vscode-inputValidation-errorBackground)' : 'var(--vscode-inputValidation-infoBackground)')};
	color: ${(props) => (props.type === 'error' ? 'var(--vscode-inputValidation-errorBorder)' : 'var(--vscode-inputValidation-infoBorder)')};
	border: 1px solid ${(props) => (props.type === 'error' ? 'var(--vscode-inputValidation-errorBorder)' : 'var(--vscode-inputValidation-infoBorder)')};
`;

// Debug info
export const DebugInfo = styled.div`
	background-color: var(--vscode-input-background);
	border: 1px solid var(--vscode-input-border);
	border-radius: 4px;
	padding: 12px;
	margin: 16px 0;
	font-family: monospace;
	font-size: 11px;
	color: var(--vscode-descriptionForeground);
`;

// Logo webview specific
export const LogoContainerFull = styled.div`
	margin: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100vh;
	background: var(--vscode-editor-background);
	color: var(--vscode-foreground);
	font-family: var(--vscode-font-family);
`;

export const LogoCard = styled.div`
	text-align: center;
	padding: 16px;
	border-radius: 8px;
	box-shadow: 0 2px 8px rgba(0,0,0,0.2);
	background: var(--vscode-input-background);
	border: 1px solid var(--vscode-input-border);
`;

export const LogoImageSmall = styled.img`
	width: 64px;
	height: auto;
	margin-bottom: 8px;
	display: block;
	margin: 0 auto 8px;
`;

export const LogoTitle = styled.h1`
	font-size: 16px;
	margin: 0 0 8px 0;
	color: var(--vscode-foreground);
	font-weight: 500;
`;

export const LogoDescription = styled.p`
	margin: 0;
	font-size: 12px;
	color: var(--vscode-descriptionForeground);
	line-height: 1.4;
`;
