import styled, { createGlobalStyle } from 'styled-components';
import { themeColors } from '../../utils/themeColors';

export const GlobalStyle = createGlobalStyle`
	* {
		font-family: 'Inter', ${themeColors.fontFamily}, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
	}

	html, body {
		background: var(--vscode-editor-background);
		margin: 0;
		padding: 0;
		height: 100%;
		overflow: hidden;
	}

	#root {
		height: 100%;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	@keyframes tab-fade-in {
		from { opacity: 0; }
		to   { opacity: 1; }
	}
`;

export const TabFadeWrapper = styled.div`
	display: flex;
	flex-direction: column;
	flex: 1;
	animation: tab-fade-in 150ms ease-in;
	will-change: opacity;
`;

// Base container styles
export const Container = styled.div`
	font-family:
		'Inter',
		${themeColors.fontFamily},
		-apple-system,
		BlinkMacSystemFont,
		'Segoe UI',
		sans-serif;
	color: ${themeColors.foreground};
	background-color: var(--vscode-editor-background);
	margin: 0;
	height: 100vh;
	display: flex;
	flex-direction: column;
	overflow: hidden;
`;

export const CenteredContainer = styled.div`
	margin: 0 auto;
	display: flex;
	flex-direction: column;
	height: 100%;
	overflow: hidden;
	width: 100%;
`;

export const StickyNav = styled.div`
	flex-shrink: 0;
	position: sticky;
	top: 0;
	z-index: 1;
	background: var(--vscode-editor-background, transparent);
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
	height: 32px;
	width: auto;
	margin-right: 5px;
`;

export const Title = styled.h1`
	margin: 0;
	font-weight: 500;
	font-size: 28px;
`;

export const SettingsTitle = styled.h1`
	margin: 0;
	color: ${themeColors.textPrimary};
	font-size: 16px;
	font-weight: 600;
`;

// Content areas
export const ContentArea = styled.div<{ noPaddingTop?: boolean }>`
	padding: ${props => (props.noPaddingTop ? '0 0 10px' : '10px 0')};
	flex: 1;
	overflow-y: auto;
	min-height: 0;
`;

// Lenis smooth scroll wrapper (overflow hidden, Lenis controls scroll via transform)
export const SmoothScrollWrapper = styled.div`
	flex: 1;
	overflow: hidden;
	min-height: 0;
	display: flex;
	flex-direction: column;
`;

// Inner content for Lenis (receives transform for scroll)
export const SmoothScrollContent = styled.div<{ noPaddingTop?: boolean }>`
	padding: ${props => (props.noPaddingTop ? '0 0 10px' : '10px 0')};
	flex: 1;
	display: flex;
	flex-direction: column;
`;

export const SettingsContent = styled.div`
	padding: 16px 32px;
`;

// Section styles
export const Section = styled.div`
	margin: 20px 0;
	padding: 20px;
	background-color: ${themeColors.panelBackground};
	border: 1px solid ${themeColors.panelBorder};
	border-radius: 6px;
`;

export const SectionTitle = styled.div`
	font-size: 12px;
	font-weight: 400;
	color: ${themeColors.descriptionForeground};
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
	background-color: ${themeColors.panelBackground};
	border: 1px solid ${themeColors.panelBorder};
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
	color: ${themeColors.textPrimary};
	margin: 0 0 4px 0;
	font-size: 12px;
`;

export const SettingDescription = styled.div`
	color: ${themeColors.descriptionForeground};
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
	background-color: ${themeColors.panelBorder};
	height: 1px;
	margin: 0 12px;
	opacity: 0.2;
`;

// Button groups
export const ButtonGroup = styled.div`
	display: flex;
	gap: 16px;
	justify-content: center;
	margin-top: 24px;
`;

// Message styles
export const Message = styled.div<{ type: 'success' | 'error' }>`
	padding: 8px 12px;
	margin: 8px 0;
	border-radius: 4px;
	font-size: 13px;
	background-color: ${props => (props.type === 'error' ? themeColors.errorBackground : themeColors.infoBackground)};
	color: ${props => (props.type === 'error' ? themeColors.errorForeground : themeColors.infoForeground)};
	border: 1px solid ${props => (props.type === 'error' ? themeColors.errorBorder : themeColors.infoBorder)};
`;

// Debug info
export const DebugInfo = styled.div`
	background-color: ${themeColors.inputBackground};
	border: 1px solid ${themeColors.inputBorder};
	border-radius: 4px;
	padding: 12px;
	margin: 16px 0;
	font-family: monospace;
	font-size: 11px;
	color: ${themeColors.descriptionForeground};
`;

// Logo webview specific
export const LogoContainerFull = styled.div`
	margin: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100vh;
	background: ${themeColors.background};
	color: ${themeColors.foreground};
	font-family:
		'Inter',
		${themeColors.fontFamily},
		-apple-system,
		BlinkMacSystemFont,
		'Segoe UI',
		sans-serif;
`;

export const LogoCard = styled.div`
	text-align: center;
	padding: 16px;
	border-radius: 8px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
	background: ${themeColors.inputBackground};
	border: 1px solid ${themeColors.inputBorder};
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
	color: ${themeColors.foreground};
	font-weight: 500;
`;

export const LogoDescription = styled.p`
	margin: 0;
	font-size: 12px;
	color: ${themeColors.descriptionForeground};
	line-height: 1.4;
`;

// Loading spinner
export const SpinnerContainer = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	flex: 1;
	min-height: 200px;
	gap: 16px;
`;

export const Spinner = styled.div`
	width: 24px;
	height: 24px;
	border: 2px solid var(--vscode-panel-border);
	border-top: 2px solid var(--vscode-progressBar-background);
	border-radius: 50%;
	animation: spin 1s linear infinite;
`;

export const LoadingText = styled.div`
	font-size: 13px;
	color: ${themeColors.descriptionForeground};
	text-align: center;
`;
