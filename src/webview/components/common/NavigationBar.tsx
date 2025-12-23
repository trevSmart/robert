import type React from 'react';

type Section = 'calendar' | 'portfolio';

interface NavigationBarProps {
	activeSection: Section;
	onSectionChange: (section: Section) => void;
}

const NavigationBar: React.FC<NavigationBarProps> = ({ activeSection, onSectionChange }) => {
	return (
		<div
			style={{
				display: 'flex',
				borderBottom: '1px solid var(--vscode-panel-border)',
				backgroundColor: 'var(--vscode-editor-background)',
				padding: '0 20px'
			}}
		>
			<div
				style={{
					display: 'flex',
					gap: '0'
				}}
			>
				<button
					type="button"
					onClick={() => onSectionChange('calendar')}
					style={{
						padding: '12px 20px',
						border: 'none',
						backgroundColor: activeSection === 'calendar' ? 'var(--vscode-tab-activeBackground)' : 'transparent',
						color: activeSection === 'calendar' ? 'var(--vscode-tab-activeForeground)' : 'var(--vscode-tab-inactiveForeground)',
						borderBottom: activeSection === 'calendar' ? `2px solid var(--vscode-progressBar-background)` : 'none',
						cursor: 'pointer',
						fontSize: '13px',
						fontWeight: activeSection === 'calendar' ? '600' : '400',
						transition: 'all 0.2s ease'
					}}
				>
					📅 Calendar
				</button>
				<button
					type="button"
					onClick={() => onSectionChange('portfolio')}
					style={{
						padding: '12px 20px',
						border: 'none',
						backgroundColor: activeSection === 'portfolio' ? 'var(--vscode-tab-activeBackground)' : 'transparent',
						color: activeSection === 'portfolio' ? 'var(--vscode-tab-activeForeground)' : 'var(--vscode-tab-inactiveForeground)',
						borderBottom: activeSection === 'portfolio' ? `2px solid var(--vscode-progressBar-background)` : 'none',
						cursor: 'pointer',
						fontSize: '13px',
						fontWeight: activeSection === 'portfolio' ? '600' : '400',
						transition: 'all 0.2s ease'
					}}
				>
					📁 Portfolio
				</button>
			</div>
		</div>
	);
};

export default NavigationBar;
