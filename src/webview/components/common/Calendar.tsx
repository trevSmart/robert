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
	const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

	const [hoveredDay, setHoveredDay] = useState<any>(null);
	const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

	// Function to calculate days difference and create tooltip
	const getDayTooltip = (dayInfo: any) => {
		const targetDate = new Date(dayInfo.date.getFullYear(), dayInfo.date.getMonth(), dayInfo.date.getDate());
		const diffTime = targetDate.getTime() - todayStart.getTime();
		const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

		if (diffDays === 0) {
			return 'Avui';
		} else if (diffDays === 1) {
			return '1 dia';
		} else if (diffDays === -1) {
			return 'Fa 1 dia';
		} else if (diffDays > 0) {
			return `${diffDays} dies`;
		} else {
			return `Fa ${Math.abs(diffDays)} dies`;
		}
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

	// Assign colors deterministically across all iterations for cross-month consistency
	const orderedAllIterations = [...iterations].sort((a, b) => {
		const aStart = a.startDate ? new Date(a.startDate).getTime() : 0;
		const bStart = b.startDate ? new Date(b.startDate).getTime() : 0;
		if (aStart !== bStart) return aStart - bStart;
		const nameCompare = a.name.localeCompare(b.name);
		if (nameCompare !== 0) return nameCompare;
		return a.objectId.localeCompare(b.objectId);
	});

	const iterationColorMap = new Map<string, string>();
	orderedAllIterations.forEach((iteration, index) => {
		iterationColorMap.set(iteration.objectId, iterationColors[index % iterationColors.length]);
	});

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
		const nameCompare = a.name.localeCompare(b.name);
		if (nameCompare !== 0) return nameCompare;
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
									: 'var(--vscode-editor-background)', // Same background for all days
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
							setHoveredDay(dayInfo);
							setMousePosition({ x: e.clientX, y: e.clientY });
							if (!dayInfo.isToday) {
								e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)';
							}
						}}
						onMouseMove={e => {
							setMousePosition({ x: e.clientX, y: e.clientY });
						}}
						onMouseLeave={e => {
							setHoveredDay(null);
							if (!dayInfo.isToday) {
								e.currentTarget.style.backgroundColor = dayInfo.iterations.length > 0 ? 'rgba(0, 122, 204, 0.1)' : 'var(--vscode-editor-background)'; // Same background for all days
							}
						}}
					>
						<span
							style={{
								fontSize: '16px',
								fontWeight: '300',
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
											height: '5px',
											backgroundColor: iterationColorMap.get(iteration.objectId) || 'var(--vscode-progressBar-background)',
											opacity: 0.9
										}}
									/>
								))}
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
											bottom: '10px',
											left: '2px',
											padding: '1px 4px',
											borderRadius: '6px',
											backgroundColor: '#ff6b35',
											color: 'white',
											fontSize: '10px',
											fontWeight: 'bold',
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
											bottom: '10px',
											left: '2px',
											padding: '1px 4px',
											borderRadius: '6px',
											backgroundColor: '#8e44ad',
											color: 'white',
											fontSize: '10px',
											fontWeight: 'bold',
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
				))}
			</div>

			{/* Legend - show all iteration legends for any month */}
			{orderedIterations.length > 0 && (
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						gap: '8px',
						marginTop: '20px',
						fontSize: '12px',
						color: 'var(--vscode-descriptionForeground)',
						maxWidth: '400px'
					}}
				>
					{/* Show iteration legends dynamically for any month */}
					{orderedIterations.map(iteration => (
						<div key={iteration.objectId} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
							<div
								style={{
									width: '20px',
									height: '5px',
									backgroundColor: iterationColorMap.get(iteration.objectId) || 'var(--vscode-progressBar-background)',
									opacity: 0.9,
									flexShrink: 0
								}}
							></div>
							<span style={{ flex: '1 1 auto', textAlign: 'left', minWidth: 0 }}>{iteration.name}</span>
							<div
								style={{
									position: 'relative',
									width: '120px',
									height: '8px',
									borderRadius: '999px',
									backgroundColor: 'rgba(120, 120, 120, 0.2)',
									overflow: 'hidden',
									flexShrink: 0,
									marginLeft: 'auto'
								}}
								title="Iteration progress"
							>
								<div
									style={{
										width: `${getIterationProgress(iteration)}%`,
										height: '100%',
										backgroundImage: `linear-gradient(90deg, ${iterationColorMap.get(iteration.objectId) || '#2196f3'}, #ff6b6b)`
									}}
								/>
								<div
									style={{
										position: 'absolute',
										top: '50%',
										left: `calc(${getIterationProgress(iteration)}% - 4px)`,
										width: '8px',
										height: '8px',
										borderRadius: '50%',
										backgroundColor: 'rgba(255, 255, 255, 0.9)',
										border: '1px solid rgba(0, 0, 0, 0.2)',
										transform: 'translateY(-50%)',
										boxShadow: '0 0 4px rgba(0, 0, 0, 0.15)'
									}}
								/>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Custom tooltip for day hover */}
			{hoveredDay && (
				<div
					style={{
						position: 'fixed',
						left: mousePosition.x + 10,
						top: mousePosition.y - 30,
						backgroundColor: 'var(--vscode-quickInput-background)',
						color: 'var(--vscode-quickInput-foreground)',
						border: '1px solid var(--vscode-panel-border)',
						borderRadius: '4px',
						padding: '4px 8px',
						fontSize: '12px',
						pointerEvents: 'none',
						zIndex: 1000,
						boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
						maxWidth: '200px',
						wordWrap: 'break-word',
						whiteSpace: 'nowrap'
					}}
				>
					{getDayTooltip(hoveredDay)}
				</div>
			)}
		</div>
	);
};

export default Calendar;
