import React, { type FC } from 'react';
import { type ComponentType } from 'react';

// Tutorial type
export interface Tutorial {
	title: string;
	kicker: string;
	bg: string;
	accent?: string;
	shadow?: string;
	icon?: ComponentType<{ size?: string }> | 'string' | any;
}

export interface LibrarySectionProps {
	selectedTutorial: Tutorial | null;
	onTutorialSelect: (tutorial: Tutorial) => void;
	onTutorialClose: () => void;
	sendMessage: (command: string, data?: any) => void;
}

// Icon components
const TargetIcon = ({ size = '28px' }: { size?: string }) => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: size, height: size }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9s-2.015-9-4.5-9m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 2.84L5.107 14.668M5.107 14.668L9.468 6.98M5.107 14.668L9.468 6.98"
		/>
	</svg>
);

const TrophyIcon = ({ size = '28px' }: { size?: string }) => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: size, height: size }}>
		<path d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728" />
	</svg>
);

const LightBulbIcon = ({ size = '28px' }: { size?: string }) => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: size, height: size }}>
		<path d="M12 12.75c1.148 0 2.278.08 3.383.237 1.037.146 1.866.966 1.866 2.013 0 3.728-2.35 6.75-5.25 6.75S6.75 18.728 6.75 15c0-1.046.83-1.867 1.866-2.013A24.204 24.204 0 0 1 12 12.75Zm0 0c2.883 0 5.647.508 8.207 1.44a23.91 23.91 0 0 1-1.152 6.06M12 12.75c-2.883 0-5.647.508-8.208 1.44.125 2.104.52 4.136 1.153 6.06M12 12.75a2.25 2.25 0 0 0 2.248-2.354M12 12.75a2.25 2.25 0 0 1-2.248-2.354M12 8.25c.995 0 1.971-.08 2.922-.236.403-.066.74-.358.795-.762a3.778 3.778 0 0 0-.399-2.25M12 8.25c-.995 0-1.97-.08-2.922-.236-.402-.066-.74-.358-.795-.762a3.734 3.734 0 0 1 .4-2.253M12 8.25a2.25 2.25 0 0 0-2.248 2.146M12 8.25a2.25 2.25 0 0 1 2.248 2.146M8.683 5a6.032 6.032 0 0 1-1.155-1.002c.07-.63.27-1.222.574-1.747m.581 2.749A3.75 3.75 0 0 1 15.318 5m0 0c.427-.283.815-.62 1.155-.999a4.471 4.471 0 0 0-.575-1.752M4.921 6a24.048 24.048 0 0 0-.392 3.314c1.668.546 3.416.914 5.223 1.082M19.08 6c.205 1.08.337 2.187.392 3.314a23.882 23.882 0 0 1-5.223 1.082" />
	</svg>
);

const ArrowPathIcon = ({ size = '28px' }: { size?: string }) => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: size, height: size }}>
		<path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
	</svg>
);

const LibrarySection: FC<LibrarySectionProps> = ({ selectedTutorial, onTutorialSelect, onTutorialClose, sendMessage }) => {
	const tutorialBanners: Tutorial[] = [
		{ title: 'Salesforce CRM Fundamentals', kicker: 'PLATFORM', bg: 'linear-gradient(135deg, #4a2c81 0%, #c86dd7 60%, #f0b7ff 100%)', shadow: 'rgba(72, 36, 129, 0.18)', accent: '#c86dd7', icon: TargetIcon },
		{ title: 'Lightning Web Components', kicker: 'DEVELOPMENT', bg: 'linear-gradient(135deg, #2e4c82 0%, #2a6fd8 100%)', shadow: 'rgba(30, 60, 114, 0.18)', accent: '#2a6fd8', icon: TrophyIcon },
		{ title: 'Salesforce Integration APIs', kicker: 'CONNECTIVITY', bg: 'linear-gradient(135deg, #1f5c85 0%, #3a8bbb 60%, #c3e4ff 100%)', shadow: 'rgba(15, 76, 117, 0.18)', accent: '#3a8bbb', icon: LightBulbIcon },
		{ title: 'Salesforce Einstein AI', kicker: 'INTELLIGENCE', bg: 'linear-gradient(135deg, #3c4e60 0%, #546a8a 55%, #8a9ba6 100%)', shadow: 'rgba(44, 62, 80, 0.18)', accent: '#546a8a', icon: LightBulbIcon },
		{ title: 'Salesforce DevOps & CI/CD', kicker: 'AUTOMATION', bg: 'linear-gradient(135deg, #5b3ea6 0%, #b27bff 55%, #e0c8ff 100%)', shadow: 'rgba(91, 62, 166, 0.18)', accent: '#b27bff', icon: ArrowPathIcon }
	];

	if (selectedTutorial) {
		return (
			<div style={{ padding: '20px' }}>
				<button
					onClick={onTutorialClose}
					style={{
						padding: '8px 16px',
						backgroundColor: 'var(--vscode-button-background)',
						color: 'var(--vscode-button-foreground)',
						border: 'none',
						borderRadius: '4px',
						cursor: 'pointer',
						fontSize: '14px'
					}}
				>
					Back to library
				</button>
				<div style={{ padding: '24px', background: selectedTutorial.bg, borderRadius: '16px', color: 'white', marginTop: '20px' }}>
					<h1>{selectedTutorial.title}</h1>
					<p>Master {selectedTutorial.title.toLowerCase()} with hands-on examples and best practices.</p>
				</div>
			</div>
		);
	}

	// Tutorial banners + assets grid
	const assets = [
		{ title: 'Project Templates', description: 'Reusable project templates and checklists', gradient: 'linear-gradient(135deg, #4a2c81 0%, #c586d8 65%, #f2c7ff 100%)' },
		{ title: 'Dashboards', description: 'Interactive dashboards and reports', gradient: 'linear-gradient(135deg, #2e4c82 0%, #3b6fd6 100%)' },
		{ title: 'Lightning Web Components', description: 'Reusable Lightning components for Salesforce', gradient: 'linear-gradient(135deg, #1f5c85 0%, #3a8bbb 60%, #c3e4ff 100%)' },
		{ title: 'Checklists', description: 'Standardized checklists and procedures', gradient: 'linear-gradient(135deg, #3c4e60 0%, #546a8a 55%, #8a9ba6 100%)' },
		{ title: 'Documentation', description: 'Guides, manuals, and documentation', gradient: 'linear-gradient(135deg, #4a2c81 0%, #c586d8 65%, #f2c7ff 100%)' },
		{ title: 'Tools & Scripts', description: 'Automation scripts and utilities', gradient: 'linear-gradient(135deg, #2e4c82 0%, #3b6fd6 100%)' }
	];

	return (
		<div style={{ padding: '20px' }}>
			<div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
				{tutorialBanners.map(banner => (
					<div
						key={banner.title}
						style={{ height: '110px', borderRadius: '16px', background: banner.bg, padding: '16px 20px', color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'transform 0.2s ease' }}
						onMouseEnter={e => {
							e.currentTarget.style.transform = 'translateY(-1px)';
						}}
						onMouseLeave={e => {
							e.currentTarget.style.transform = 'translateY(0)';
						}}
						onClick={() => {
							onTutorialSelect(banner);
							sendMessage('openTutorialInEditor', { title: banner.title, kicker: banner.kicker, accent: banner.accent, bg: banner.bg, shadow: banner.shadow });
						}}
					>
						<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
							<div style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 700, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase' }}>{banner.kicker}</div>
							<div style={{ fontSize: '18px', fontWeight: 700 }}>{banner.title}</div>
							<div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>Hands-on Salesforce development and administration.</div>
						</div>
						{banner.icon && typeof banner.icon === 'function' && (
							<div style={{ width: '46px', height: '46px', borderRadius: '50%', backgroundColor: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: banner.accent, border: `2px solid ${banner.accent || '#ccc'}` }}>
								{React.createElement(banner.icon as ComponentType<{ size?: string }>, { size: '28px' })}
							</div>
						)}
					</div>
				))}
			</div>
			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '20px' }}>
				{assets.map(asset => (
					<div
						key={asset.title}
						style={{ background: asset.gradient, borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minHeight: '140px', cursor: 'pointer', transition: 'transform 0.2s ease' }}
						onMouseEnter={e => {
							e.currentTarget.style.transform = 'translateY(-1px)';
						}}
						onMouseLeave={e => {
							e.currentTarget.style.transform = 'translateY(0)';
						}}
					>
						<h4 style={{ margin: '0 0 8px 0', color: '#ffffff', fontSize: '16px', fontWeight: 600 }}>{asset.title}</h4>
						<p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '12px', lineHeight: 1.4 }}>{asset.description}</p>
					</div>
				))}
			</div>
		</div>
	);
};

export default LibrarySection;
