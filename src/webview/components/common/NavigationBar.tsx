import { type CSSProperties, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { isLightTheme } from '../../utils/themeColors';

type Section = 'search' | 'calendar' | 'portfolio' | 'team' | 'library' | 'metrics' | 'collaboration';

interface NavigationBarProps {
	activeSection: Section;
	onSectionChange: (section: Section) => void;
}

// Search tab: magnifying glass SVG only (no label)
const SearchIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '18px', height: '18px' }} aria-hidden>
		<path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
	</svg>
);

// Icon components
const CalendarIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '18px', height: '18px' }}>
		<path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
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
			d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
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

const NavigationBar: React.FC<NavigationBarProps> = ({ activeSection, onSectionChange }) => {
	const tabs = useMemo(
		() => [
			{ id: 'search' as const, label: '', Icon: SearchIcon, iconOnly: true },
			{ id: 'calendar' as const, label: 'Plan', Icon: CalendarIcon, iconOnly: false },
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
	const containerRef = useRef<HTMLDivElement>(null);
	const measureTabsRef = useRef<HTMLDivElement>(null);
	const measureOverflowRef = useRef<HTMLButtonElement>(null);
	const realOverflowButtonRef = useRef<HTMLButtonElement>(null);

	const recomputeVisibleTabs = useCallback(() => {
		if (!containerRef.current || !measureTabsRef.current) return;

		const availableWidth = containerRef.current.getBoundingClientRect().width;
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

	const visibleTabs = tabs.slice(0, visibleCount);
	const overflowTabs = tabs.slice(visibleCount);
	const isOverflowActive = overflowTabs.some(tab => tab.id === activeSection);

	const getTabStyles = (isActive: boolean): CSSProperties => {
		const lightTheme = isLightTheme();
		return {
			padding: '10px 20px',
			border: 'none',
			backgroundColor: isActive
				? lightTheme
					? 'rgba(0, 123, 255, 0.1)' // Blau clar subtil per temes clars
					: 'var(--vscode-tab-activeBackground)' // Color estàndard per temes foscos
				: 'transparent',
			color: isActive
				? lightTheme
					? '#1e1e1e' // Color fosc per assegurar contrast en temes clars
					: 'var(--vscode-tab-activeForeground)' // Color estàndard per temes foscos
				: lightTheme
					? '#333333'
					: 'var(--vscode-tab-inactiveForeground)',
			borderBottom: isActive
				? lightTheme
					? '2px solid #007acc' // Blau més fosc i visible per temes clars
					: '2px solid var(--vscode-progressBar-background)' // Color estàndard per temes foscos
				: 'none',
			cursor: isActive ? 'default' : 'pointer',
			fontSize: '13px',
			fontWeight: isActive ? '600' : '400',
			transition: 'all 0.2s ease',
			display: 'flex',
			alignItems: 'center',
			gap: '8px',
			whiteSpace: 'nowrap'
		};
	};

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
					gap: '0',
					flex: 1,
					minWidth: 0,
					position: 'relative'
				}}
				ref={containerRef}
			>
				{visibleTabs.map(({ id, label, Icon, iconOnly }) => (
					<button key={id} type="button" onClick={() => activeSection !== id && onSectionChange(id)} style={getTabStyles(activeSection === id)} aria-label={iconOnly ? 'Search' : undefined} title={iconOnly ? 'Search' : undefined}>
						<Icon />
						{!iconOnly && <span>{label}</span>}
					</button>
				))}
				{overflowTabs.length > 0 && (
					<div style={{ position: 'relative', display: 'flex' }}>
						<button
							ref={realOverflowButtonRef}
							type="button"
							aria-label="More tabs"
							onClick={() => setOverflowOpen(open => !open)}
							style={{
								...getTabStyles(isOverflowActive),
								padding: '10px 14px',
								minWidth: '44px',
								justifyContent: 'center'
							}}
						>
							<span style={{ fontSize: '18px', lineHeight: 1 }}>…</span>
						</button>
						{overflowOpen && (
							<div
								style={{
									position: 'absolute',
									right: 0,
									top: '100%',
									marginTop: '6px',
									backgroundColor: 'var(--vscode-editor-background)',
									border: '1px solid var(--vscode-panel-border)',
									borderRadius: '6px',
									boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
									zIndex: 10,
									minWidth: '180px',
									padding: '6px 0'
								}}
							>
								{overflowTabs.map(({ id, label, Icon, iconOnly }) => (
									<button
										key={id}
										type="button"
										onClick={() => {
											if (activeSection !== id) {
												onSectionChange(id);
											}
											setOverflowOpen(false);
										}}
										style={{
											width: '100%',
											border: 'none',
											backgroundColor: activeSection === id ? 'var(--vscode-list-activeSelectionBackground)' : 'transparent',
											color: activeSection === id ? 'var(--vscode-list-activeSelectionForeground)' : 'var(--vscode-foreground)',
											padding: '8px 14px',
											display: 'flex',
											alignItems: 'center',
											gap: '8px',
											cursor: 'pointer',
											fontSize: '12px',
											textAlign: 'left'
										}}
										aria-label={iconOnly ? 'Search' : undefined}
									>
										<Icon />
										{!iconOnly && <span>{label}</span>}
									</button>
								))}
							</div>
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
