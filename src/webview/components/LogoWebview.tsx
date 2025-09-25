import type React from 'react';

interface LogoWebviewProps {
	rebusLogoUri: string;
}

const LogoWebview: React.FC<LogoWebviewProps> = ({ rebusLogoUri }) => {
	return (
		<div
			style={{
				margin: 0,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				height: '100vh',
				background: 'var(--vscode-editor-background)',
				color: 'var(--vscode-foreground)',
				fontFamily: 'var(--vscode-font-family)'
			}}
		>
			<div
				style={{
					textAlign: 'center',
					padding: '16px',
					borderRadius: '8px',
					boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
					background: 'var(--vscode-input-background)'
				}}
			>
				<img
					src={rebusLogoUri}
					alt="IBM logo"
					style={{
						width: '64px',
						height: 'auto',
						marginBottom: '8px',
						display: 'block',
						margin: '0 auto 8px'
					}}
				/>
				<h1
					style={{
						fontSize: '16px',
						margin: '0 0 8px 0',
						color: 'var(--vscode-foreground)'
					}}
				>
					Robert
				</h1>
				<p
					style={{
						margin: 0,
						fontSize: '12px',
						color: 'var(--vscode-descriptionForeground)'
					}}
				>
					Click the activity bar to open the full view.
				</p>
			</div>
		</div>
	);
};

export default LogoWebview;
