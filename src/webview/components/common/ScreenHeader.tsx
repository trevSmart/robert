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
					←
				</button>
			)}
			<span>{title}</span>
		</div>
	);
};

export default ScreenHeader;
