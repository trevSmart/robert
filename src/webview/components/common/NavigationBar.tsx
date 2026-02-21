import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { isLightTheme } from '../../utils/themeColors';

// Animation keyframes for dropdown
const fadeInScale = keyframes`
	from {
		opacity: 0;
		transform: translateY(-4px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
`;

// Base styles shared between NavTab and NavOverflowBtn (first-level tabs only)
const baseNavButtonStyles = css<{ $isActive: boolean; $lightTheme: boolean }>`
	padding: 10px 16px 6px;
	border: none;
	background-color: ${props => (props.$isActive ? 'transparent' : props.$lightTheme ? 'rgba(0, 0, 0, 0.06)' : 'rgba(0, 0, 0, 0.22)')};
	color: ${props => (props.$isActive ? (props.$lightTheme ? '#1e1e1e' : 'var(--vscode-tab-activeForeground)') : props.$lightTheme ? '#333333' : 'var(--vscode-tab-inactiveForeground)')};
	border-bottom: ${props => (props.$isActive ? (props.$lightTheme ? '2px solid #007acc' : '2px solid var(--vscode-progressBar-background)') : '2px solid transparent')};
	font-size: 12.4px;
	font-weight: ${props => (props.$isActive ? '600' : '400')};
	transition: all 0.2s ease;
	display: flex;
	align-items: center;
	gap: 8px;
	white-space: nowrap;
`;

// Styled components for navigation elements
const NavTab = styled.button<{ $isActive: boolean; $lightTheme: boolean }>`
	${baseNavButtonStyles}
	cursor: ${props => (props.$isActive ? 'default' : 'pointer')};

	&:not(.nav-tab-active):hover {
		background-color: ${props => (props.$lightTheme ? 'rgba(0, 123, 255, 0.05)' : 'rgba(255, 255, 255, 0.05)')};
	}
`;

const NavOverflowBtn = styled.button<{ $isActive: boolean; $lightTheme: boolean }>`
	${baseNavButtonStyles}
	cursor: pointer;

	&:hover {
		background-color: ${props => (props.$lightTheme ? 'rgba(0, 123, 255, 0.05)' : 'rgba(255, 255, 255, 0.05)')};
	}
`;

const NavOverflowItem = styled.button<{ $isActive: boolean }>`
	width: 100%;
	padding: 8px 14px;
	border: none;
	background-color: ${props => (props.$isActive ? 'var(--vscode-list-activeSelectionBackground)' : 'transparent')};
	color: ${props => (props.$isActive ? 'var(--vscode-list-activeSelectionForeground)' : 'var(--vscode-foreground)')};
	cursor: pointer;
	text-align: left;
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 12px;

	&:hover {
		background-color: var(--vscode-list-hoverBackground);
	}
`;

const NavOverflowMenu = styled.div`
	position: absolute;
	right: 0;
	top: 100%;
	margin-top: 6px;
	background-color: var(--vscode-editor-background);
	border: 1px solid var(--vscode-panel-border);
	border-radius: 6px;
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
	z-index: 10;
	min-width: 180px;
	padding: 6px 0;
	animation: ${fadeInScale} 0.15s ease-out;
	transform-origin: top right;
`;

// Inline styles for measurement (mirrors baseNavButtonStyles)
const getTabStyles = (isActive: boolean): React.CSSProperties => ({
	padding: '10px 16px 6px',
	border: 'none',
	backgroundColor: 'transparent',
	fontSize: '12.4px',
	fontWeight: isActive ? '600' : '400',
	display: 'flex',
	alignItems: 'center',
	gap: '8px',
	whiteSpace: 'nowrap'
});

type Section = 'search' | 'home' | 'portfolio' | 'team' | 'library' | 'metrics' | 'collaboration';

interface NavigationBarProps {
	activeSection: Section;
	onSectionChange: (section: Section) => void;
	collaborationBadgeCount?: number;
}

// Search tab: magnifying glass SVG only (no label)
const SearchIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '18px', height: '18px' }} aria-hidden>
		<path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
	</svg>
);

// Icon components
const HomeIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '18px', height: '18px' }}>
		<path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605" />
	</svg>
);

const PortfolioIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '18px', height: '18px' }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M6 6.878V6a2.25 2.25 0 0 1 2.25-2.25h7.5A2.25 2.25 0 0 1 18 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 0 0 4.5 9v.878m13.5-3A2.25 2.25 0 0 1 19.5 9v.878m0 0a2.246 2.246 0 0 0-.75-.128H5.25c-.263 0-.515.045-.75.128m15 0A2.25 2.25 0 0 1 21 12v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6c0-.98.626-1.813 1.5-2.122"
		/>
	</svg>
);

const TeamIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '18px', height: '18px' }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
		/>
	</svg>
);

const LibraryIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '18px', height: '18px' }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
		/>
	</svg>
);

const MetricsIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '18px', height: '18px' }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
		/>
	</svg>
);

const CollaborationIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '18px', height: '18px' }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
		/>
	</svg>
);

const NavigationBar: React.FC<NavigationBarProps> = ({ activeSection, onSectionChange, collaborationBadgeCount = 0 }) => {
	const lightTheme = isLightTheme();
	const tabs = useMemo(
		() => [
			{ id: 'search' as const, label: '', Icon: SearchIcon, iconOnly: true },
			{ id: 'home' as const, label: 'Home', Icon: HomeIcon, iconOnly: false },
			{ id: 'portfolio' as const, label: 'Portfolio', Icon: PortfolioIcon, iconOnly: false },
			{ id: 'team' as const, label: 'Team', Icon: TeamIcon, iconOnly: false },
			{ id: 'metrics' as const, label: 'Metrics', Icon: MetricsIcon, iconOnly: false },
			{ id: 'collaboration' as const, label: 'Collaboration', Icon: CollaborationIcon, iconOnly: false },
			{ id: 'library' as const, label: 'Library', Icon: LibraryIcon, iconOnly: false }
		],
		[]
	);
	const [visibleCount, setVisibleCount] = useState(tabs.length);
	const [overflowOpen, setOverflowOpen] = useState(false);
	const [lastReorderedTabId, setLastReorderedTabId] = useState<Section | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const measureTabsRef = useRef<HTMLDivElement>(null);
	const measureOverflowRef = useRef<HTMLButtonElement>(null);
	const realOverflowButtonRef = useRef<HTMLButtonElement>(null);

	const recomputeVisibleTabs = useCallback(() => {
		if (!containerRef.current || !measureTabsRef.current) return;

		const availableWidth = (containerRef.current.parentElement ?? containerRef.current).getBoundingClientRect().width;
		const tabWidths = Array.from(measureTabsRef.current.children).map(child => (child as HTMLElement).getBoundingClientRect().width);

		// Use real overflow button width if available (when rendered), otherwise use measured width
		const realOverflowWidth = realOverflowButtonRef.current?.getBoundingClientRect().width;
		const overflowWidth = realOverflowWidth ?? measureOverflowRef.current?.getBoundingClientRect().width ?? 0;

		// First, check if all tabs fit without overflow
		let totalTabsWidth = 0;
		for (let i = 0; i < tabWidths.length; i += 1) {
			totalTabsWidth += tabWidths[i];
		}

		let nextVisibleCount = tabs.length;

		// If all tabs don't fit, calculate how many tabs + overflow button fit
		if (totalTabsWidth > availableWidth) {
			// Start from the beginning and add tabs one by one until we can't fit more
			// along with the overflow button
			let usedWidth = overflowWidth;
			nextVisibleCount = 0;

			for (let i = 0; i < tabWidths.length; i += 1) {
				const testWidth = usedWidth + tabWidths[i];
				if (testWidth <= availableWidth) {
					usedWidth = testWidth;
					nextVisibleCount = i + 1;
				} else {
					break;
				}
			}

			// Ensure at least one tab is visible
			nextVisibleCount = Math.max(1, nextVisibleCount);
		}

		setVisibleCount(nextVisibleCount);
	}, [tabs.length]);

	// Reorder tabs when an overflow tab is selected to make it visible
	const reorderTabsForSelectedTab = useCallback(() => {
		// Check if the active section is in an overflow tab
		const activeTabIndex = tabs.findIndex(tab => tab.id === activeSection);

		// If active tab is not visible, reorder to make it visible
		if (activeTabIndex >= visibleCount && activeTabIndex !== -1) {
			// Strategy: Keep visible tabs except the last non-search tab, then add active tab
			// This ensures the active tab is shown AND there's still room for the overflow button
			const searchTab = tabs[0];
			const restTabs = tabs.slice(1);

			// Get tabs that should remain visible, leaving room for active tab and dropdown
			// We need: search + (visibleCount - 2) other tabs + active tab = visibleCount total
			const otherVisibleTabs = restTabs.slice(0, Math.max(0, visibleCount - 2));
			const activeTab = tabs[activeTabIndex];

			// Rebuild: search + other visible tabs + active tab
			// The dropdown button will still be shown because we have overflow tabs
			const reordered = [searchTab, ...otherVisibleTabs, activeTab];
			return reordered;
		}

		return null;
	}, [tabs, visibleCount, activeSection]);

	useLayoutEffect(() => {
		requestAnimationFrame(() => {
			recomputeVisibleTabs();
		});
	}, [recomputeVisibleTabs]);

	// Recalculate when the real overflow button is first rendered
	useLayoutEffect(() => {
		if (realOverflowButtonRef.current) {
			// Use requestAnimationFrame to ensure the button is fully rendered
			requestAnimationFrame(() => {
				recomputeVisibleTabs();
			});
		}
	}, [recomputeVisibleTabs]);

	useEffect(() => {
		const handleResize = () => {
			recomputeVisibleTabs();
		};
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, [recomputeVisibleTabs]);

	useEffect(() => {
		const observer = new ResizeObserver(() => {
			recomputeVisibleTabs();
		});
		if (containerRef.current) {
			observer.observe(containerRef.current);
		}
		return () => observer.disconnect();
	}, [recomputeVisibleTabs]);

	// Observe the real overflow button when it's rendered
	useEffect(() => {
		if (!realOverflowButtonRef.current) return;

		const observer = new ResizeObserver(() => {
			recomputeVisibleTabs();
		});
		observer.observe(realOverflowButtonRef.current);
		return () => observer.disconnect();
	}, [recomputeVisibleTabs]);

	// Close overflow menu on click outside
	useEffect(() => {
		if (!overflowOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (realOverflowButtonRef.current && !realOverflowButtonRef.current.closest('[data-overflow-container]')?.contains(e.target as Node)) {
				setOverflowOpen(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [overflowOpen]);

	// Track when we reorder tabs for an overflow selection
	useEffect(() => {
		const activeTabIndex = tabs.findIndex(tab => tab.id === activeSection);
		if (activeTabIndex >= visibleCount && activeTabIndex !== -1) {
			// Active tab is in overflow, so we'll reorder
			setLastReorderedTabId(activeSection);
		} else if (lastReorderedTabId && activeTabIndex < visibleCount && activeTabIndex !== -1) {
			// We navigated to a visible tab, so reset the reorder state
			setLastReorderedTabId(null);
		}
	}, [activeSection, visibleCount, tabs, lastReorderedTabId]);

	// Get reordered tabs if an overflow tab is selected
	const shouldReorder = lastReorderedTabId !== null;
	const reorderedTabs = shouldReorder ? reorderTabsForSelectedTab() : null;
	const displayTabs = reorderedTabs || tabs;

	// Calculate visible tabs, ensuring dropdown is shown when there are overflow tabs
	const visibleTabs = displayTabs.slice(0, visibleCount);
	const overflowTabs = displayTabs.slice(visibleCount);
	const isOverflowActive = overflowTabs.some(tab => tab.id === activeSection);

	// If we're showing a reordered tab, we need to ensure there's always an overflow button
	// so the user can access other tabs
	// Keep dropdown visible if we're in a reordered state, OR if there are overflow tabs
	const hasOverflow = overflowTabs.length > 0 || shouldReorder;

	return (
		<div
			style={{
				display: 'flex',
				borderBottom: '1px solid var(--vscode-panel-border)'
			}}
		>
			<div
				style={{
					display: 'flex',
					gap: '0',
					minWidth: 0,
					position: 'relative'
				}}
				ref={containerRef}
			>
				{visibleTabs.map(({ id, label, Icon, iconOnly }) => (
					<NavTab
						key={id}
						type="button"
						className={`nav-tab ${activeSection === id ? 'nav-tab-active' : ''}`}
						onClick={() => activeSection !== id && onSectionChange(id)}
						$isActive={activeSection === id}
						$lightTheme={lightTheme}
						aria-label={iconOnly ? 'Search' : undefined}
						title={iconOnly ? 'Search' : undefined}
					>
						<Icon />
						{!iconOnly && <span>{label}</span>}
						{id === 'collaboration' && collaborationBadgeCount > 0 && (
							<span
								style={{
									display: 'inline-flex',
									alignItems: 'center',
									justifyContent: 'center',
									minWidth: '18px',
									height: '18px',
									padding: '0 5px',
									borderRadius: '9px',
									backgroundColor: '#ff5252',
									color: '#fff',
									fontSize: '10px',
									fontWeight: '600',
									lineHeight: '1'
								}}
							>
								{collaborationBadgeCount > 99 ? '99+' : collaborationBadgeCount}
							</span>
						)}
					</NavTab>
				))}
				{hasOverflow && (
					<div style={{ position: 'relative', display: 'flex' }} data-overflow-container>
						<NavOverflowBtn
							ref={realOverflowButtonRef}
							type="button"
							className="nav-overflow-btn"
							aria-label="More tabs"
							onClick={() => setOverflowOpen(open => !open)}
							$isActive={isOverflowActive}
							$lightTheme={lightTheme}
							style={{
								padding: '10px 14px',
								minWidth: '44px',
								justifyContent: 'center'
							}}
						>
							<span style={{ fontSize: '18px', lineHeight: 1 }}>…</span>
						</NavOverflowBtn>
						{overflowOpen && (
							<NavOverflowMenu>
								{overflowTabs.map(({ id, label, Icon, iconOnly }) => (
									<NavOverflowItem
										key={id}
										type="button"
										className="nav-overflow-item"
										onClick={() => {
											if (activeSection !== id) {
												onSectionChange(id);
											}
											setOverflowOpen(false);
										}}
										$isActive={activeSection === id}
										aria-label={iconOnly ? 'Search' : undefined}
									>
										<Icon />
										{!iconOnly && <span>{label}</span>}
										{id === 'collaboration' && collaborationBadgeCount > 0 && (
											<span
												style={{
													display: 'inline-flex',
													alignItems: 'center',
													justifyContent: 'center',
													minWidth: '18px',
													height: '18px',
													padding: '0 5px',
													borderRadius: '9px',
													backgroundColor: '#ff5252',
													color: '#fff',
													fontSize: '10px',
													fontWeight: '600',
													lineHeight: '1',
													marginLeft: 'auto'
												}}
											>
												{collaborationBadgeCount > 99 ? '99+' : collaborationBadgeCount}
											</span>
										)}
									</NavOverflowItem>
								))}
							</NavOverflowMenu>
						)}
					</div>
				)}
				<div
					style={{
						position: 'absolute',
						visibility: 'hidden',
						height: 0,
						overflow: 'hidden',
						whiteSpace: 'nowrap'
					}}
				>
					<div ref={measureTabsRef} style={{ display: 'inline-flex' }}>
						{tabs.map(({ id, label, Icon, iconOnly }) => (
							<button key={id} type="button" style={getTabStyles(false)}>
								<Icon />
								{!iconOnly && <span>{label}</span>}
							</button>
						))}
					</div>
					<button ref={measureOverflowRef} type="button" style={{ ...getTabStyles(false), padding: '12px 14px', minWidth: '44px' }}>
						<span style={{ fontSize: '18px', lineHeight: 1 }}>…</span>
					</button>
				</div>
			</div>
		</div>
	);
};

export default NavigationBar;
