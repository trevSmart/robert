import type React from 'react';
import { Button } from 'vscrui';
import 'vscrui/dist/codicon.css';

interface MainWebviewProps {
	webviewId: string;
	context: string;
	timestamp: string;
	rebusLogoUri: string;
}

const MainWebview: React.FC<MainWebviewProps> = ({ context, rebusLogoUri }) => {
	const vscode = window.acquireVsCodeApi();

	const openSettings = () => {
		vscode.postMessage({
			command: 'openSettings',
			context: context,
			timestamp: new Date().toISOString()
		});
	};

	return (
		<div
			style={{
				fontFamily: 'var(--vscode-font-family)',
				color: 'var(--vscode-foreground)',
				backgroundColor: 'var(--vscode-editor-background)',
				padding: '20px',
				margin: 0,
				minHeight: '100vh'
			}}
		>
			<div style={{ maxWidth: '800px', margin: '0 auto' }}>
				<div style={{ textAlign: 'center', marginBottom: '20px' }}>
					<img src={rebusLogoUri} alt="IBM Logo" style={{ width: '72px', height: 'auto', marginRight: '5px' }} />
					<h1 style={{ margin: 0, fontWeight: 500, fontSize: '28px' }}>Robert</h1>
				</div>

				<div
					style={{
						backgroundColor: 'var(--vscode-editor-background)',
						padding: '20px',
						minHeight: '300px'
					}}
				>
					<p>Main webview with React and vscrui</p>
					<Button onClick={openSettings}>Open Settings</Button>
				</div>
			</div>
		</div>
	);
};

export default MainWebview;
