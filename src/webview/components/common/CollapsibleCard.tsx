import React, { useState } from 'react';
import { themeColors } from '../../utils/themeColors';

interface CollapsibleCardProps {
	title: string;
	children: React.ReactNode;
	defaultCollapsed?: boolean;
}

const CollapsibleCard: React.FC<CollapsibleCardProps> = ({ title, children, defaultCollapsed = false }) => {
	const [collapsed, setCollapsed] = useState(defaultCollapsed);

	const toggleCollapsed = () => {
		setCollapsed(!collapsed);
	};

	const containerStyle: React.CSSProperties = {
		backgroundColor: themeColors.background,
		border: `1px solid ${themeColors.border}`,
		borderRadius: '4px',
		marginBottom: '16px',
		overflow: 'hidden'
	};

	const headerStyle: React.CSSProperties = {
		display: 'flex',
		alignItems: 'center',
		padding: '12px 16px',
		backgroundColor: themeColors.backgroundHover,
		borderBottom: collapsed ? 'none' : `1px solid ${themeColors.border}`,
		cursor: 'pointer',
		userSelect: 'none'
	};

	const chevronStyle: React.CSSProperties = {
		marginRight: '8px',
		transition: 'transform 0.2s ease',
		transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		width: '16px',
		height: '16px',
		color: themeColors.text
	};

	const titleStyle: React.CSSProperties = {
		fontSize: '13px',
		fontWeight: 400,
		color: themeColors.text,
		margin: 0
	};

	const contentStyle: React.CSSProperties = {
		padding: collapsed ? '0' : '0 16px 16px',
		maxHeight: collapsed ? '0' : '100%',
		overflow: collapsed ? 'hidden' : 'visible',
		transition: 'max-height 0.3s ease, padding 0.3s ease'
	};

	const chevronIcon = (
		<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);

	return (
		<div style={containerStyle}>
			<div style={headerStyle} onClick={toggleCollapsed}>
				<div style={chevronStyle}>{chevronIcon}</div>
				<h3 style={titleStyle}>{title}</h3>
			</div>
			<div style={contentStyle}>{!collapsed && children}</div>
		</div>
	);
};

export default CollapsibleCard;
