import type React from 'react';

interface ScreenHeaderProps {
	title: string;
	onBack?: () => void;
	showBackButton?: boolean;
}

const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, onBack, showBackButton = false }) => {
	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				marginBottom: '20px',
				paddingBottom: '10px',
				borderBottom: '1px solid var(--vscode-panel-border)',
				fontSize: '14px',
				fontWeight: 'bold',
				color: 'var(--vscode-foreground)'
			}}
		>
			{showBackButton && onBack && (
				<button
					type="button"
					onClick={onBack}
					style={{
						backgroundColor: 'transparent',
						border: 'none',
						color: 'var(--vscode-foreground)',
						cursor: 'pointer',
						padding: '4px 8px',
						marginRight: '12px',
						fontSize: '16px',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						borderRadius: '3px'
					}}
					onMouseEnter={e => {
						e.currentTarget.style.backgroundColor = 'var(--vscode-toolbar-hoverBackground)';
					}}
					onMouseLeave={e => {
						e.currentTarget.style.backgroundColor = 'transparent';
					}}
					aria-label="Go back"
				>
					<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '16px', height: '16px' }}>
						<path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
					</svg>
				</button>
			)}
			<span>{title}</span>
		</div>
	);
};

export default ScreenHeader;
