import type React from 'react';

interface Iteration {
	objectId: string;
	name: string;
	startDate: string;
	endDate: string;
	state: string;
	project: string | null;
	_ref: string;
}

interface CalendarProps {
	currentDate?: Date;
	iterations?: Iteration[];
	onMonthChange?: (date: Date) => void;
	debugMode?: boolean;
}

const Calendar: React.FC<CalendarProps> = ({ currentDate = new Date(), iterations = [], onMonthChange, debugMode = false }) => {
	const today = new Date();
	const isCurrentMonth = currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();

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
	const iterationColors = ['#2E86DE', '#F6B93B', '#38ADA9', '#E55039', '#6A89CC', '#B71540'];

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

	// Assign colors by iteration order so adjacent iterations don't share colors
	const orderedIterations = [...currentMonthIterations].sort((a, b) => {
		const aStart = a.startDate ? new Date(a.startDate).getTime() : 0;
		const bStart = b.startDate ? new Date(b.startDate).getTime() : 0;
		if (aStart !== bStart) return aStart - bStart;
		return a.name.localeCompare(b.name);
	});

	const iterationColorMap = new Map<string, string>();
	orderedIterations.forEach((iteration, index) => {
		iterationColorMap.set(iteration.objectId, iterationColors[index % iterationColors.length]);
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
				backgroundColor: 'var(--vscode-editor-background)',
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
						color: 'var(--vscode-foreground)',
						borderRadius: '4px',
						cursor: 'pointer',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						transition: 'background-color 0.2s ease'
					}}
					onMouseEnter={e => {
						e.currentTarget.style.backgroundColor = 'var(--vscode-button-secondaryBackground)';
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
						color: 'var(--vscode-foreground)',
						fontSize: '23px',
						fontWeight: '600',
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
						color: 'var(--vscode-foreground)',
						borderRadius: '4px',
						cursor: 'pointer',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						transition: 'background-color 0.2s ease'
					}}
					onMouseEnter={e => {
						e.currentTarget.style.backgroundColor = 'var(--vscode-button-secondaryBackground)';
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

			{/* Calendar Grid */}
			<div
				style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(7, 1fr)',
					gap: '1px',
					backgroundColor: 'var(--vscode-panel-border)',
					border: '1px solid var(--vscode-panel-border)',
					borderRadius: '6px',
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
							backgroundColor: 'var(--vscode-titleBar-activeBackground)',
							color: 'var(--vscode-titleBar-activeForeground)',
							textAlign: 'center',
							fontSize: '12px',
							fontWeight: '600',
							borderBottom: '1px solid var(--vscode-panel-border)'
						}}
					>
						{day}
					</div>
				))}

				{/* Calendar days */}
				{calendarDays.map((dayInfo, index) => (
					<div
						key={index}
						style={{
							aspectRatio: '1',
							padding: '8px',
							backgroundColor: dayInfo.isToday
								? 'rgba(33, 150, 243, 0.3)' // More prominent blue background for today
								: dayInfo.iterations.length > 0
									? 'rgba(0, 122, 204, 0.1)' // Light blue background for iteration days
									: dayInfo.isCurrentMonth
										? 'var(--vscode-editor-background)'
										: 'rgba(128, 128, 128, 0.1)', // Darker background for days outside current month
							color: dayInfo.isToday ? 'var(--vscode-list-activeSelectionForeground)' : dayInfo.isCurrentMonth ? 'var(--vscode-foreground)' : 'var(--vscode-descriptionForeground)',
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
							if (!dayInfo.isToday) {
								e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)';
							}
						}}
						onMouseLeave={e => {
							if (!dayInfo.isToday) {
								e.currentTarget.style.backgroundColor = dayInfo.iterations.length > 0 ? 'rgba(0, 122, 204, 0.1)' : dayInfo.isCurrentMonth ? 'var(--vscode-editor-background)' : 'rgba(128, 128, 128, 0.1)'; // Darker background for days outside current month
							}
						}}
					>
						<span
							style={{
								fontSize: '16px',
								fontWeight: '400',
								marginBottom: '4px',
								opacity: dayInfo.isCurrentMonth ? 1 : 0.4,
								color: dayInfo.isCurrentMonth ? (dayInfo.isToday ? 'var(--vscode-list-activeSelectionForeground)' : 'var(--vscode-foreground)') : 'var(--vscode-descriptionForeground)'
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
								{dayInfo.iterations.slice(0, 2).map((iteration, index) => (
									<div
										key={iteration.objectId}
										style={{
											height: '4px',
											backgroundColor: iterationColorMap.get(iteration.objectId) || 'var(--vscode-progressBar-background)',
											opacity: 0.9
										}}
									/>
								))}
							</div>
						)}
						{/* Show debug milestone on 20th of each month */}
						{debugMode && dayInfo.day === 20 && dayInfo.isCurrentMonth && (
							<div
								style={{
									position: 'absolute',
									top: '2px',
									right: '2px',
									width: '8px',
									height: '8px',
									borderRadius: '50%',
									backgroundColor: '#ff6b35',
									border: '1px solid var(--vscode-editor-background)',
									zIndex: 2
								}}
								title="Debug Milestone - 20th of month"
							/>
						)}
					</div>
				))}
			</div>

			{/* Legend - show iteration legends for any month, Today only for current month */}
			{orderedIterations.length > 0 && (
				<div
					style={{
						display: 'flex',
						justifyContent: 'center',
						gap: '20px',
						marginTop: '20px',
						fontSize: '12px',
						color: 'var(--vscode-descriptionForeground)'
					}}
				>
					{/* Show Today indicator only when viewing current month */}
					{isCurrentMonth && (
						<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
							<div
								style={{
									width: '12px',
									height: '12px',
									backgroundColor: 'rgba(33, 150, 243, 0.3)',
									borderRadius: '2px'
								}}
							></div>
							<span>Today</span>
						</div>
					)}
					{/* Show iteration legends dynamically for any month */}
					{orderedIterations.map(iteration => (
						<div key={iteration.objectId} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
							<div
								style={{
									width: '20px',
									height: '4px',
									backgroundColor: iterationColorMap.get(iteration.objectId) || 'var(--vscode-progressBar-background)',
									opacity: 0.9
								}}
							></div>
							<span>{iteration.name}</span>
						</div>
					))}

					{/* Show message if more than 2 iterations */}
					{orderedIterations.length > 2 && (
						<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
							<span>+{orderedIterations.length - 2} more</span>
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default Calendar;
