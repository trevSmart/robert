import * as React from 'react';
import { useState } from 'react';
import { themeColors, isLightTheme } from '../../utils/themeColors';

interface Iteration {
	objectId: string;
	name: string;
	startDate: string;
	endDate: string;
	state: string;
	project: string | null;
	_ref: string;
}

interface DayInfo {
	date: Date;
	day: number;
	iterations: Iteration[];
}

interface CalendarProps {
	currentDate?: Date;
	iterations?: Iteration[];
	onMonthChange?: (date: Date) => void;
	debugMode?: boolean;
	currentUser?: unknown;
	onIterationClick?: (iteration: Iteration) => void;
}

const Calendar: React.FC<CalendarProps> = ({ currentDate = new Date(), iterations = [], onMonthChange, debugMode = false, currentUser, onIterationClick }) => {
	const today = new Date();
	const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

	const [hoveredDay, setHoveredDay] = useState<DayInfo | null>(null);
	const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

	// Function to get day name
	const getDayName = (date: Date) => {
		const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
		return dayNames[date.getDay()];
	};

	// Function to calculate days difference and create tooltip
	const getDayTooltip = (dayInfo: DayInfo) => {
		const targetDate = new Date(dayInfo.date.getFullYear(), dayInfo.date.getMonth(), dayInfo.date.getDate());
		const diffTime = targetDate.getTime() - todayStart.getTime();
		const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

		let content = '';
		if (diffDays === 0) {
			content = 'Today';
		} else if (diffDays === 1) {
			content = '1 day left';
		} else if (diffDays === -1) {
			content = '1 day ago';
		} else if (diffDays > 0) {
			content = `${diffDays} days left`;
		} else {
			content = `${Math.abs(diffDays)} days ago`;
		}

		return {
			title: `${dayInfo.day} ${getDayName(targetDate)}`,
			content: content
		};
	};

	// Get first day of the month
	const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
	// Get last day of the month
	const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

	// Get the day of the week for the first day (0 = Sunday, 1 = Monday, etc.)
	let startDay = firstDay.getDay();
	// Convert to Monday = 0, Sunday = 6
	startDay = startDay === 0 ? 6 : startDay - 1;

	// Get the day of the week for the last day
	let endDay = lastDay.getDay();
	endDay = endDay === 0 ? 6 : endDay - 1;

	// Calculate total days needed (including previous/next month days)
	const totalDays = lastDay.getDate() + startDay + (6 - endDay);

	const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

	const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

	// Iteration colors - cycle through these colors in order
	// Darker colors for light theme, brighter for dark theme
	const lightTheme = isLightTheme();
	const iterationColors = lightTheme
		? ['#3a9ca3', '#d9a500', '#d97a3f', '#b868c9', '#5fa85f'] // Darker for light theme
		: ['#66c5cc', '#f6cf71', '#f89c75', '#dcb0f2', '#a8d5a8']; // Original bright colors for dark theme

	// Helper function to check if iteration overlaps with current month
	const doesIterationOverlapMonth = (iteration: Iteration) => {
		const startDate = iteration.startDate ? new Date(iteration.startDate) : null;
		const endDate = iteration.endDate ? new Date(iteration.endDate) : null;

		if (!startDate || !endDate) return false;

		// Check if iteration overlaps with current month
		const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
		const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

		// Reset time for date comparison
		startDate.setHours(0, 0, 0, 0);
		endDate.setHours(23, 59, 59, 999);
		monthStart.setHours(0, 0, 0, 0);
		monthEnd.setHours(23, 59, 59, 999);

		// Check for overlap: iteration starts before month ends AND iteration ends after month starts
		return startDate <= monthEnd && endDate >= monthStart;
	};

	// Filter iterations that overlap with current month
	const currentMonthIterations = iterations.filter(doesIterationOverlapMonth);

	// Assign colors deterministically across all iterations for cross-month consistency
	const orderedAllIterations = [...iterations].sort((a, b) => {
		const aStart = a.startDate ? new Date(a.startDate).getTime() : 0;
		const bStart = b.startDate ? new Date(b.startDate).getTime() : 0;
		if (aStart !== bStart) return aStart - bStart;
		// When start dates are equal, use objectId for deterministic ordering (no alphabetical fallback)
		return a.objectId.localeCompare(b.objectId);
	});

	const iterationColorMap = new Map<string, string>();
	orderedAllIterations.forEach((iteration, index) => {
		iterationColorMap.set(iteration.objectId, iterationColors[index % iterationColors.length]);
	});

	// Function to add red component to a hex color
	const addRedToColor = (hexColor: string, redAmount: number = 120): string => {
		// Remove # if present
		const hex = hexColor.replace('#', '');

		// Parse RGB values
		const r = parseInt(hex.substring(0, 2), 16);
		const g = parseInt(hex.substring(2, 4), 16);
		const b = parseInt(hex.substring(4, 6), 16);

		// Add red component (clamp to 0-255)
		const newR = Math.min(255, r + redAmount);

		// Convert back to hex
		const newHex = `#${newR.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

		return newHex;
	};

	const getIterationProgress = (iteration: Iteration) => {
		const startDate = iteration.startDate ? new Date(iteration.startDate) : null;
		const endDate = iteration.endDate ? new Date(iteration.endDate) : null;

		if (!startDate || !endDate) return 0;

		const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
		const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime();

		if (end <= start) return 0;

		const total = end - start;
		const elapsed = todayStart.getTime() - start;
		const rawProgress = (elapsed / total) * 100;

		return Math.max(0, Math.min(100, rawProgress));
	};

	// Order current-month iterations for legend display
	const orderedIterations = [...currentMonthIterations].sort((a, b) => {
		const aStart = a.startDate ? new Date(a.startDate).getTime() : 0;
		const bStart = b.startDate ? new Date(b.startDate).getTime() : 0;
		if (aStart !== bStart) return aStart - bStart;
		// When start dates are equal, use objectId for deterministic ordering (no alphabetical fallback)
		return a.objectId.localeCompare(b.objectId);
	});

	// Generate calendar days
	const calendarDays = [];
	let dayCounter = 1 - startDay; // Start from previous month

	for (let i = 0; i < totalDays; i++) {
		const currentDayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayCounter);
		const isCurrentMonth = dayCounter >= 1 && dayCounter <= lastDay.getDate();
		const isToday = isCurrentMonth && dayCounter === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();

		// Check which iterations are active on this day (only from current month iterations)
		const activeIterations = currentMonthIterations.filter(iteration => {
			const startDate = iteration.startDate ? new Date(iteration.startDate) : null;
			const endDate = iteration.endDate ? new Date(iteration.endDate) : null;

			if (!startDate || !endDate) return false;

			// Reset time for date comparison
			startDate.setHours(0, 0, 0, 0);
			endDate.setHours(23, 59, 59, 999);

			return currentDayDate >= startDate && currentDayDate <= endDate;
		});

		calendarDays.push({
			day: dayCounter,
			date: currentDayDate,
			isCurrentMonth,
			isToday,
			iterations: activeIterations
		});

		dayCounter++;
	}

	const goToPreviousMonth = () => {
		const newDate = new Date(currentDate);
		newDate.setMonth(newDate.getMonth() - 1);
		onMonthChange?.(newDate);
	};

	const goToNextMonth = () => {
		const newDate = new Date(currentDate);
		newDate.setMonth(newDate.getMonth() + 1);
		onMonthChange?.(newDate);
	};

	// Icon components
	const PreviousMonthIcon = () => (
		<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '20px', height: '20px' }}>
			<path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
		</svg>
	);

	const NextMonthIcon = () => (
		<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '20px', height: '20px' }}>
			<path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
		</svg>
	);

	return (
		<div
			style={{
				padding: '20px',
				backgroundColor: themeColors.background,
				minHeight: '500px'
			}}
		>
			<div
				style={{
					marginBottom: '20px',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					gap: '20px'
				}}
			>
				<button
					onClick={goToPreviousMonth}
					style={{
						padding: '8px 12px',
						border: 'none',
						outline: 'none',
						backgroundColor: 'transparent',
						color: themeColors.foreground,
						borderRadius: '4px',
						cursor: 'pointer',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						transition: 'background-color 0.2s ease'
					}}
					onMouseEnter={e => {
						e.currentTarget.style.backgroundColor = themeColors.buttonSecondaryBackground;
					}}
					onMouseLeave={e => {
						e.currentTarget.style.backgroundColor = 'transparent';
					}}
					disabled={!onMonthChange}
					title="Previous Month"
				>
					<PreviousMonthIcon />
				</button>

				<h2
					style={{
						margin: '0',
						color: themeColors.foreground,
						fontSize: '19px',
						fontWeight: '500',
						minWidth: '200px',
						textAlign: 'center'
					}}
				>
					{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
				</h2>

				<button
					onClick={goToNextMonth}
					style={{
						padding: '8px 12px',
						border: 'none',
						outline: 'none',
						backgroundColor: 'transparent',
						color: themeColors.foreground,
						borderRadius: '4px',
						cursor: 'pointer',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						transition: 'background-color 0.2s ease'
					}}
					onMouseEnter={e => {
						e.currentTarget.style.backgroundColor = themeColors.buttonSecondaryBackground;
					}}
					onMouseLeave={e => {
						e.currentTarget.style.backgroundColor = 'transparent';
					}}
					disabled={!onMonthChange}
					title="Next Month"
				>
					<NextMonthIcon />
				</button>
			</div>

			{/* Welcome message */}
			{currentUser && (
				<div
					style={{
						textAlign: 'center',
						marginBottom: '16px',
						padding: '12px',
						backgroundColor: themeColors.panelBackground,
						borderRadius: '8px',
						border: `1px solid ${themeColors.panelBorder}`,
						maxWidth: '800px',
						margin: '0 auto 16px auto'
					}}
				>
					<div style={{ fontSize: '14px', color: themeColors.descriptionForeground }}>
						Benvingut, <span style={{ fontWeight: 'bold', color: 'var(--vscode-foreground)' }}>{currentUser.displayName || currentUser.userName || 'Usuari'}</span>! 👋
					</div>
					<div style={{ fontSize: '12px', color: themeColors.descriptionForeground, marginTop: '4px' }}>Bon treball amb les teves user stories i tasques</div>
				</div>
			)}

			{/* Calendar Grid */}
			<div
				style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(7, 1fr)',
					gap: '1px',
					backgroundColor: themeColors.panelBorder,
					border: `1px solid ${themeColors.panelBorder}`,
					borderRadius: '12px',
					overflow: 'hidden',
					maxWidth: '800px',
					margin: '0 auto'
				}}
			>
				{/* Day headers */}
				{dayNames.map(day => (
					<div
						key={day}
						style={{
							padding: '12px 8px',
							backgroundColor: themeColors.titleBarActiveBackground,
							color: themeColors.titleBarActiveForeground,
							textAlign: 'center',
							fontSize: '11px',
							fontWeight: '600',
							borderBottom: `1px solid ${themeColors.panelBorder}`
						}}
					>
						{day}
					</div>
				))}

				{/* Calendar days */}
				{calendarDays.map((dayInfo, index) => {
					// Determine if this is Saturday (index % 7 === 5) or Sunday (index % 7 === 6)
					const dayOfWeek = index % 7;
					const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
					const isHoveredDay = hoveredDay?.date && hoveredDay.date.getTime() === dayInfo.date.getTime();

					return (
						<div
							key={index}
							style={{
								aspectRatio: '1',
								padding: '8px',
								backgroundColor: dayInfo.isToday
									? 'rgba(33, 150, 243, 0.3)' // More prominent blue background for today
									: !dayInfo.isCurrentMonth || (isWeekend && dayInfo.isCurrentMonth)
										? lightTheme
											? 'rgba(0, 0, 0, 0.04)'
											: 'rgba(0, 0, 0, 0.18)' // lighter background for weekends and days outside current month in light theme
										: 'transparent',
								color: dayInfo.isToday ? themeColors.listActiveSelectionForeground : dayInfo.isCurrentMonth ? themeColors.foreground : themeColors.descriptionForeground,
								borderBottom: index < calendarDays.length - 7 ? '1px solid var(--vscode-panel-border)' : 'none',
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'flex-start',
								justifyContent: 'flex-start',
								fontSize: '14px',
								fontWeight: '400',
								cursor: 'pointer',
								transition: 'background-color 0.2s ease',
								position: 'relative'
							}}
							onMouseEnter={e => {
								setHoveredDay(dayInfo);
								setMousePosition({ x: e.clientX, y: e.clientY });
								if (!dayInfo.isToday) {
									e.currentTarget.style.backgroundColor = themeColors.listHoverBackground;
								}
							}}
							onMouseMove={e => {
								setMousePosition({ x: e.clientX, y: e.clientY });
							}}
							onMouseLeave={e => {
								setHoveredDay(null);
								if (!dayInfo.isToday) {
									const dayOfWeek = index % 7;
									const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
									e.currentTarget.style.backgroundColor = !dayInfo.isCurrentMonth || (isWeekend && dayInfo.isCurrentMonth) ? (lightTheme ? 'rgba(0, 0, 0, 0.04)' : 'rgba(0, 0, 0, 0.18)') : 'transparent';
								}
							}}
						>
							<span
								style={{
									fontSize: '13px',
									fontWeight: '200',
									marginBottom: '4px',
									opacity: dayInfo.isCurrentMonth ? 1 : 0.4,
									color: dayInfo.isCurrentMonth ? (dayInfo.isToday ? themeColors.listActiveSelectionForeground : themeColors.foreground) : themeColors.descriptionForeground
								}}
							>
								{dayInfo.day}
							</span>
							{/* Show iteration indicator lines */}
							{dayInfo.iterations.length > 0 && (
								<div
									style={{
										position: 'absolute',
										bottom: '0',
										left: '-1px',
										right: '-1px',
										display: 'flex',
										flexDirection: 'column',
										gap: '1px',
										zIndex: 1
									}}
									title={dayInfo.iterations.map(iter => `${iter.name} (${iter.state})`).join(', ')}
								>
									{/* Show up to 2 iteration lines with assigned colors */}
									{dayInfo.iterations.slice(0, 2).map(iteration => {
										const iterationStartDate = iteration.startDate ? new Date(iteration.startDate) : null;
										const iterationEndDate = iteration.endDate ? new Date(iteration.endDate) : null;

										if (iterationStartDate) iterationStartDate.setHours(0, 0, 0, 0);
										if (iterationEndDate) iterationEndDate.setHours(0, 0, 0, 0);

										const dayDate = new Date(dayInfo.date.getFullYear(), dayInfo.date.getMonth(), dayInfo.date.getDate());
										dayDate.setHours(0, 0, 0, 0);

										const isFirstDay = iterationStartDate && dayDate.getTime() === iterationStartDate.getTime();
										const isLastDay = iterationEndDate && dayDate.getTime() === iterationEndDate.getTime();

										return (
											<div
												key={iteration.objectId}
												style={{
													height: '6px',
													backgroundColor: iterationColorMap.get(iteration.objectId) || 'var(--vscode-progressBar-background)',
													opacity: isHoveredDay ? 1 : lightTheme ? 0.7 : 0.5,
													transition: 'opacity 0.2s ease',
													borderTopLeftRadius: isFirstDay ? '4px' : '0',
													borderBottomLeftRadius: isFirstDay ? '4px' : '0',
													borderTopRightRadius: isLastDay ? '4px' : '0',
													borderBottomRightRadius: isLastDay ? '4px' : '0',
													marginLeft: isFirstDay ? '1px' : '0',
													marginRight: isLastDay ? '2px' : '0'
												}}
											/>
										);
									})}
								</div>
							)}
							{/* Show debug indicators below day number */}
							{debugMode && dayInfo.isCurrentMonth && (
								<>
									{/* IOP badge on 20th */}
									{dayInfo.day === 20 && (
										<div
											style={{
												position: 'absolute',
												top: '50%',
												left: '50%',
												transform: 'translate(-50%, -50%)',
												padding: '1px 4px',
												borderRadius: '6px',
												backgroundColor: '#ff6b35',
												color: 'white',
												fontSize: '11px',
												fontWeight: 'normal',
												border: 'none',
												zIndex: 3,
												pointerEvents: 'none'
											}}
											title="IOP - Debug indicator"
										>
											IOP
										</div>
									)}
									{/* Pkg closed badge on 12th */}
									{dayInfo.day === 12 && (
										<div
											style={{
												position: 'absolute',
												top: '50%',
												left: '50%',
												transform: 'translate(-50%, -50%)',
												padding: '1px 4px',
												borderRadius: '6px',
												backgroundColor: '#8e44ad',
												color: 'white',
												fontSize: '11px',
												fontWeight: 'normal',
												border: 'none',
												zIndex: 3,
												pointerEvents: 'none'
											}}
											title="Package closed - Debug indicator"
										>
											Pkg closed
										</div>
									)}
								</>
							)}
						</div>
					);
				})}
			</div>

			{/* Legend - show all iteration legends for any month */}
			{orderedIterations.length > 0 && (
				<div
					style={{
						display: 'grid',
						gridTemplateColumns: 'minmax(0, 1fr) 140px',
						columnGap: '10px',
						rowGap: '9px', // increased spacing between legend rows by 1px
						alignItems: 'center',
						width: '100%',
						marginTop: '24px', // moved legend slightly further from the calendar
						fontSize: '12px',
						color: themeColors.descriptionForeground
					}}
				>
					{/* Show iteration legends dynamically for any month */}
					{orderedIterations.map(iteration => (
						<div key={iteration.objectId} style={{ display: 'contents' }}>
							<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', minWidth: 0 }}>
								<div
									style={{
										width: '20px',
										height: '5px',
										backgroundColor: iterationColorMap.get(iteration.objectId) || 'var(--vscode-progressBar-background)',
										opacity: 0.9,
										flexShrink: 0
									}}
								></div>
								<span
									style={{
										textAlign: 'right',
										cursor: onIterationClick ? 'pointer' : 'default',
										color: onIterationClick ? 'var(--vscode-textLink-foreground)' : 'var(--vscode-foreground)',
										textDecoration: 'none',
										fontSize: '12px',
										whiteSpace: 'nowrap',
										overflow: 'hidden',
										textOverflow: 'ellipsis'
									}}
									onClick={() => onIterationClick?.(iteration)}
									title={onIterationClick ? `Click to view user stories for ${iteration.name}` : undefined}
								>
									{iteration.name}
								</span>
							</div>
							<div
								style={{
									position: 'relative',
									width: '140px',
									height: '6px',
									borderRadius: '999px',
									backgroundColor: lightTheme ? '#e0e0e0' : '#404040',
									overflow: 'hidden',
									flexShrink: 0
								}}
								title="Iteration progress"
							>
								{(() => {
									const baseColor = iterationColorMap.get(iteration.objectId) || '#2196f3';
									const endColor = addRedToColor(baseColor, 120);
									return (
										<div
											style={{
												width: `${getIterationProgress(iteration)}%`,
												height: '100%',
												backgroundImage: `linear-gradient(90deg, ${baseColor}, ${endColor})`,
												borderRadius: '999px'
											}}
										/>
									);
								})()}
							</div>
						</div>
					))}
				</div>
			)}

			{/* Custom tooltip for day hover */}
			{hoveredDay &&
				(() => {
					const tooltip = getDayTooltip(hoveredDay);
					return (
						<div
							style={{
								position: 'fixed',
								left: mousePosition.x + 10,
								top: mousePosition.y - 30,
								backgroundColor: 'var(--vscode-quickInput-background)',
								color: 'var(--vscode-quickInput-foreground)',
								border: '1px solid var(--vscode-panel-border)',
								borderRadius: '4px',
								padding: '6px 10px',
								fontSize: '12px',
								pointerEvents: 'none',
								zIndex: 1000,
								boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
								maxWidth: '200px',
								wordWrap: 'break-word'
							}}
						>
							<div style={{ fontWeight: '600', marginBottom: '4px', fontSize: '13px' }}>{tooltip.title}</div>
							<div style={{ fontSize: '11px', color: themeColors.descriptionForeground }}>{tooltip.content}</div>
						</div>
					);
				})()}
		</div>
	);
};

export default Calendar;
