import type React from 'react';
import EntityTypeBadge from './EntityTypeBadge';
import type { RallyEntityType } from '../../../types/rally';

interface ScreenHeaderProps {
	title: string;
	onBack?: () => void;
	showBackButton?: boolean;
	sticky?: boolean;
	rightContent?: React.ReactNode;
	titleActions?: React.ReactNode;
	/** Detail screens pass the record type so it shows as a badge instead of a text prefix in the title. */
	entityType?: RallyEntityType;
}

const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, onBack, showBackButton = false, sticky = false, rightContent, titleActions, entityType }) => {
	const stickyHeader = Boolean(sticky || (showBackButton && onBack));
	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				marginTop: stickyHeader ? 0 : '20px',
				marginBottom: '20px',
				paddingTop: stickyHeader ? '12px' : 0,
				paddingBottom: '10px',
				borderBottom: '1px solid var(--vscode-panel-border)',
				fontSize: '14px',
				fontWeight: '600',
				color: 'var(--vscode-foreground)',
				...(stickyHeader
					? {
							position: 'sticky',
							top: 0,
							zIndex: 2,
							backgroundColor: 'var(--vscode-editor-background)'
						}
					: {})
			}}
		>
			<div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
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
				{entityType && <EntityTypeBadge type={entityType} display="icon" />}
				<span style={{ marginLeft: entityType ? '8px' : 0 }}>
					{title}
					{titleActions}
				</span>
			</div>
			{rightContent && <div style={{ display: 'flex', alignItems: 'center' }}>{rightContent}</div>}
		</div>
	);
};

export default ScreenHeader;
