import type React from 'react';
import { Button } from 'vscrui';

interface DemoItemProps {
	icon: string;
	title: string;
	description: string;
	onClick: () => void;
}

const DemoItemComponent: React.FC<DemoItemProps> = ({ icon, title, description, onClick }) => {
	return (
		<div
			style={{
				padding: '15px',
				backgroundColor: 'var(--vscode-input-background)',
				border: '1px solid var(--vscode-input-border)',
				borderRadius: '5px',
				textAlign: 'center'
			}}
		>
			<h4
				style={{
					margin: '0 0 10px 0',
					color: 'var(--vscode-foreground)',
					fontSize: '14px',
					fontWeight: 'normal'
				}}
			>
				{icon} {title}
			</h4>
			<p
				style={{
					margin: '0 0 15px 0',
					fontSize: '12px',
					color: 'var(--vscode-descriptionForeground)'
				}}
			>
				{description}
			</p>
			<Button onClick={onClick}>View Demo</Button>
		</div>
	);
};

interface DemoSectionProps {
	onShowDemo: (demoType: string) => void;
}

const DemoSection: React.FC<DemoSectionProps> = ({ onShowDemo }) => {
	const demoItems = [
		{
			icon: '📊',
			title: 'Charts & Graphs',
			description: 'Interactive charts using Chart.js, D3.js, etc.',
			demoType: 'charts'
		},
		{
			icon: '🎨',
			title: 'Rich Media',
			description: 'Images, videos, audio players, canvas drawing',
			demoType: 'media'
		},
		{
			icon: '📝',
			title: 'Forms & Inputs',
			description: 'Text inputs, dropdowns, checkboxes, file uploads',
			demoType: 'forms'
		},
		{
			icon: '🎯',
			title: 'Interactive Games',
			description: 'Simple games, puzzles, or interactive experiences',
			demoType: 'games'
		}
	];

	return (
		<div
			style={{
				margin: '20px 0',
				padding: '20px',
				backgroundColor: '#282828',
				borderRadius: '6px'
			}}
		>
			<div
				style={{
					fontSize: '12px',
					fontWeight: 400,
					color: 'color(srgb 0.8 0.8 0.8 / 0.68)',
					letterSpacing: '0.5px',
					margin: '0 0 8px 0',
					paddingLeft: '7px'
				}}
			>
				Web Content Examples
			</div>
			<div
				style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
					gap: '15px',
					marginTop: '15px'
				}}
			>
				{demoItems.map((item) => (
					<DemoItemComponent key={item.demoType} icon={item.icon} title={item.title} description={item.description} onClick={() => onShowDemo(item.demoType)} />
				))}
			</div>
		</div>
	);
};

export default DemoSection;
