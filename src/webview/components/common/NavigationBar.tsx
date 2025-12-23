import type React from 'react';

type Section = 'calendar' | 'portfolio' | 'team' | 'learning' | 'assets' | 'metrics';

interface NavigationBarProps {
	activeSection: Section;
	onSectionChange: (section: Section) => void;
}

// Icon components
const CalendarIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '16px', height: '16px' }}>
		<path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
	</svg>
);

const PortfolioIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '16px', height: '16px' }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M6 6.878V6a2.25 2.25 0 0 1 2.25-2.25h7.5A2.25 2.25 0 0 1 18 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 0 0 4.5 9v.878m13.5-3A2.25 2.25 0 0 1 19.5 9v.878m0 0a2.246 2.246 0 0 0-.75-.128H5.25c-.263 0-.515.045-.75.128m15 0A2.25 2.25 0 0 1 21 12v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6c0-.98.626-1.813 1.5-2.122"
		/>
	</svg>
);

const TeamIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '16px', height: '16px' }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
		/>
	</svg>
);

const LearningIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '16px', height: '16px' }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
		/>
	</svg>
);

const AssetsIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '16px', height: '16px' }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 0 0 3.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008Z"
		/>
	</svg>
);

const MetricsIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '16px', height: '16px' }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
		/>
	</svg>
);

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
						transition: 'all 0.2s ease',
						display: 'flex',
						alignItems: 'center',
						gap: '8px'
					}}
				>
					<CalendarIcon />
					<span>Plan</span>
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
						transition: 'all 0.2s ease',
						display: 'flex',
						alignItems: 'center',
						gap: '8px'
					}}
				>
					<PortfolioIcon />
					<span>Portfolio</span>
				</button>
				<button
					type="button"
					onClick={() => onSectionChange('team')}
					style={{
						padding: '12px 20px',
						border: 'none',
						backgroundColor: activeSection === 'team' ? 'var(--vscode-tab-activeBackground)' : 'transparent',
						color: activeSection === 'team' ? 'var(--vscode-tab-activeForeground)' : 'var(--vscode-tab-inactiveForeground)',
						borderBottom: activeSection === 'team' ? `2px solid var(--vscode-progressBar-background)` : 'none',
						cursor: 'pointer',
						fontSize: '13px',
						fontWeight: activeSection === 'team' ? '600' : '400',
						transition: 'all 0.2s ease',
						display: 'flex',
						alignItems: 'center',
						gap: '8px'
					}}
				>
					<TeamIcon />
					<span>Team</span>
				</button>
				<button
					type="button"
					onClick={() => onSectionChange('assets')}
					style={{
						padding: '12px 20px',
						border: 'none',
						backgroundColor: activeSection === 'assets' ? 'var(--vscode-tab-activeBackground)' : 'transparent',
						color: activeSection === 'assets' ? 'var(--vscode-tab-activeForeground)' : 'var(--vscode-tab-inactiveForeground)',
						borderBottom: activeSection === 'assets' ? `2px solid var(--vscode-progressBar-background)` : 'none',
						cursor: 'pointer',
						fontSize: '13px',
						fontWeight: activeSection === 'assets' ? '600' : '400',
						transition: 'all 0.2s ease',
						display: 'flex',
						alignItems: 'center',
						gap: '8px'
					}}
				>
					<AssetsIcon />
					<span>Assets</span>
				</button>
				<button
					type="button"
					onClick={() => onSectionChange('learning')}
					style={{
						padding: '12px 20px',
						border: 'none',
						backgroundColor: activeSection === 'learning' ? 'var(--vscode-tab-activeBackground)' : 'transparent',
						color: activeSection === 'learning' ? 'var(--vscode-tab-activeForeground)' : 'var(--vscode-tab-inactiveForeground)',
						borderBottom: activeSection === 'learning' ? `2px solid var(--vscode-progressBar-background)` : 'none',
						cursor: 'pointer',
						fontSize: '13px',
						fontWeight: activeSection === 'learning' ? '600' : '400',
						transition: 'all 0.2s ease',
						display: 'flex',
						alignItems: 'center',
						gap: '8px'
					}}
				>
					<LearningIcon />
					<span>Learning</span>
				</button>
				<button
					type="button"
					onClick={() => onSectionChange('metrics')}
					style={{
						padding: '12px 20px',
						border: 'none',
						backgroundColor: activeSection === 'metrics' ? 'var(--vscode-tab-activeBackground)' : 'transparent',
						color: activeSection === 'metrics' ? 'var(--vscode-tab-activeForeground)' : 'var(--vscode-tab-inactiveForeground)',
						borderBottom: activeSection === 'metrics' ? `2px solid var(--vscode-progressBar-background)` : 'none',
						cursor: 'pointer',
						fontSize: '13px',
						fontWeight: activeSection === 'metrics' ? '600' : '400',
						transition: 'all 0.2s ease',
						display: 'flex',
						alignItems: 'center',
						gap: '8px'
					}}
				>
					<MetricsIcon />
					<span>Metrics</span>
				</button>
			</div>
		</div>
	);
};

export default NavigationBar;
