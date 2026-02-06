import type { FC, ReactNode } from 'react';
import { useState, useMemo } from 'react';
import { isLightTheme } from '../../utils/themeColors';

export interface SubTabConfig {
	id: string;
	label: string;
	description?: string;
	icon?: ReactNode;
}

interface SubTabsBarProps {
	subTabs: SubTabConfig[];
	activeSubTabId: string;
	onSubTabChange: (id: string) => void;
}

const SubTabsBar: FC<SubTabsBarProps> = ({ subTabs, activeSubTabId, onSubTabChange }) => {
	const lightTheme = isLightTheme();
	const [hoveredTab, setHoveredTab] = useState<string | null>(null);
	const hoverBackgroundColor = useMemo(() => (lightTheme ? 'rgba(0, 123, 255, 0.05)' : 'rgba(255, 255, 255, 0.05)'), [lightTheme]);

	const getSubTabStyles = (isActive: boolean, index: number, totalTabs: number, isHovered: boolean): React.CSSProperties => ({
		padding: '10px 16px 6px',
		border: 'none',
		borderBottom: isActive ? (lightTheme ? '2px solid #007acc' : '2px solid var(--vscode-progressBar-background)') : '2px solid transparent',
		borderRadius: index === 0 ? '6px 0 0 0' : index === totalTabs - 1 ? '0 6px 0 0' : '0',
		backgroundColor: !isActive && isHovered ? hoverBackgroundColor : 'transparent',
		color: isActive ? (lightTheme ? '#1e1e1e' : 'var(--vscode-tab-activeForeground)') : lightTheme ? '#333333' : 'var(--vscode-tab-inactiveForeground)',
		cursor: isActive ? 'default' : 'pointer',
		display: 'flex',
		alignItems: 'center',
		gap: '8px',
		fontSize: '12.4px',
		fontWeight: isActive ? 600 : 400,
		transition: 'all 0.15s ease',
		position: 'relative',
		zIndex: isActive ? 1 : 0
	});

	return (
		<div
			style={{
				display: 'flex',
				borderBottom: '1px solid var(--vscode-panel-border)',
				borderRadius: '6px 6px 0 0'
			}}
		>
			{subTabs.map((tab, index) => (
				<button
					key={tab.id}
					type="button"
					className={`sub-tab ${activeSubTabId === tab.id ? 'sub-tab-active' : ''}`}
					onClick={() => activeSubTabId !== tab.id && onSubTabChange(tab.id)}
					onMouseEnter={() => setHoveredTab(tab.id)}
					onMouseLeave={() => setHoveredTab(null)}
					style={getSubTabStyles(activeSubTabId === tab.id, index, subTabs.length, hoveredTab === tab.id)}
					title={tab.description}
				>
					{tab.icon}
					<span>{tab.label}</span>
				</button>
			))}
		</div>
	);
};

export default SubTabsBar;
