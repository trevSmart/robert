import type React from 'react';
import { Button } from 'vscrui';
import 'vscrui/dist/codicon.css';

interface SettingsProps {
	webviewId: string;
	context: string;
	timestamp: string;
	extensionUri: string;
}

const SettingsWebview: React.FC<SettingsProps> = ({ webviewId }) => {
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

	const goBack = () => {
		vscode.postMessage({
			command: 'goBackToMain',
			webviewId: webviewId
		});
	};

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
				<h1>Settings</h1>
				<p>Settings webview with React and vscrui</p>
				<Button onClick={goBack}>Go Back</Button>
			</div>
		</div>
	);
};

export default SettingsWebview;
