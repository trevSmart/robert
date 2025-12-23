import type React from 'react';

interface CalendarProps {
	currentDate?: Date;
}

const Calendar: React.FC<CalendarProps> = ({ currentDate = new Date() }) => {
	const today = new Date();

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

	// Generate calendar days
	const calendarDays = [];
	let dayCounter = 1 - startDay; // Start from previous month

	for (let i = 0; i < totalDays; i++) {
		const isCurrentMonth = dayCounter >= 1 && dayCounter <= lastDay.getDate();
		const isToday = isCurrentMonth && dayCounter === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();

		calendarDays.push({
			day: dayCounter,
			isCurrentMonth,
			isToday
		});

		dayCounter++;
	}

	const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

	const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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
					textAlign: 'center'
				}}
			>
				<h2
					style={{
						margin: '0',
						color: 'var(--vscode-foreground)',
						fontSize: '24px',
						fontWeight: '600'
					}}
				>
					{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
				</h2>
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
					overflow: 'hidden'
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
							minHeight: '80px',
							padding: '8px',
							backgroundColor: dayInfo.isToday ? 'var(--vscode-list-activeSelectionBackground)' : dayInfo.isCurrentMonth ? 'var(--vscode-editor-background)' : 'var(--vscode-input-background)',
							color: dayInfo.isToday ? 'var(--vscode-list-activeSelectionForeground)' : dayInfo.isCurrentMonth ? 'var(--vscode-foreground)' : 'var(--vscode-descriptionForeground)',
							borderBottom: index < calendarDays.length - 7 ? '1px solid var(--vscode-panel-border)' : 'none',
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'flex-start',
							justifyContent: 'flex-start',
							fontSize: '14px',
							fontWeight: dayInfo.isToday ? '600' : '400',
							cursor: 'pointer',
							transition: 'background-color 0.2s ease'
						}}
						onMouseEnter={e => {
							if (!dayInfo.isToday) {
								e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)';
							}
						}}
						onMouseLeave={e => {
							if (!dayInfo.isToday) {
								e.currentTarget.style.backgroundColor = dayInfo.isCurrentMonth ? 'var(--vscode-editor-background)' : 'var(--vscode-input-background)';
							}
						}}
					>
						{dayInfo.isCurrentMonth && (
							<span
								style={{
									fontSize: '16px',
									fontWeight: dayInfo.isToday ? '700' : '500',
									marginBottom: '4px'
								}}
							>
								{dayInfo.day}
							</span>
						)}
						{/* Here you could add events/tasks for this day */}
						<div style={{ fontSize: '10px', opacity: 0.7 }}>{/* Placeholder for events */}</div>
					</div>
				))}
			</div>

			{/* Legend */}
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
				<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
					<div
						style={{
							width: '12px',
							height: '12px',
							backgroundColor: 'var(--vscode-list-activeSelectionBackground)',
							borderRadius: '2px'
						}}
					></div>
					<span>Today</span>
				</div>
			</div>
		</div>
	);
};

export default Calendar;
