import type React from 'react';
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

interface UserStory {
	objectId: string;
	formattedId: string;
	name: string;
	description: string | null;
	state: string;
	planEstimate: number;
	toDo: number;
	owner: string;
	project: string | null;
	iteration: string | null;
	blocked: boolean;
	taskEstimateTotal: number;
	taskStatus: string;
	tasksCount: number;
	testCasesCount: number;
	defectsCount: number;
	discussionCount: number;
	appgar: string;
	scheduleState: string;
}

interface UserStoriesTableProps {
	userStories: UserStory[];
	loading?: boolean;
	error?: string;
	onLoadUserStories?: () => void;
	onClearUserStories?: () => void;
	onUserStorySelected?: (userStory: UserStory) => void;
	selectedUserStory?: UserStory | null;
}

const UserStoriesTable: React.FC<UserStoriesTableProps> = ({ userStories, loading = false, error, onLoadUserStories, onClearUserStories, onUserStorySelected, selectedUserStory }) => {
	const getScheduleStateColor = (scheduleState: string) => {
		switch (scheduleState?.toLowerCase()) {
			case 'new':
				return '#6c757d'; // Gris
			case 'defined':
				return '#fd7e14'; // Taronja
			case 'in-progress':
				return '#ffc107'; // Groc
			case 'completed':
				return '#0d6efd'; // Blau
			case 'accepted':
				return '#198754'; // Verd
			case 'closed':
				return '#495057'; // Gris fosc
			default:
				return isLightTheme() ? 'rgba(0, 0, 0, 0.6)' : themeColors.descriptionForeground;
		}
	};
	return (
		<div
			style={{
				margin: '20px 0',
				padding: '20px',
				backgroundColor: themeColors.panelBackground,
				border: `1px solid ${themeColors.panelBorder}`,
				borderRadius: '6px'
			}}
		>
			{loading && (
				<div style={{ textAlign: 'center', padding: '20px' }}>
					<div
						style={{
							border: `2px solid ${themeColors.panelBorder}`,
							borderTop: `2px solid ${themeColors.progressBarBackground}`,
							borderRadius: '50%',
							width: '20px',
							height: '20px',
							animation: 'spin 1s linear infinite',
							margin: '0 auto 10px'
						}}
					/>
					<p>Loading user stories...</p>
				</div>
			)}

			{error && (
				<div
					style={{
						textAlign: 'center',
						padding: '20px',
						color: themeColors.errorForeground
					}}
				>
					<p>{error}</p>
				</div>
			)}

			{userStories.length > 0 && !loading && !error && (
				<table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${themeColors.panelBorder}` }}>
					<thead>
						<tr style={{ backgroundColor: themeColors.titleBarActiveBackground, color: themeColors.titleBarActiveForeground }}>
							<th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${themeColors.panelBorder}`, fontWeight: 'bold', width: '10%' }}>ID</th>
							<th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${themeColors.panelBorder}`, fontWeight: 'bold' }}>Name</th>
							<th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${themeColors.panelBorder}`, fontWeight: 'bold', width: '15%' }}>State</th>
							<th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${themeColors.panelBorder}`, fontWeight: 'bold', width: '29px' }}>Est.</th>
							<th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${themeColors.panelBorder}`, fontWeight: 'bold', width: '29px' }}>To Do</th>
						</tr>
					</thead>
					<tbody>
						{userStories.map(userStory => (
							<tr
								key={userStory.objectId}
								onClick={() => onUserStorySelected?.(userStory)}
								style={{
									cursor: onUserStorySelected ? 'pointer' : 'default',
									backgroundColor: selectedUserStory?.objectId === userStory.objectId ? themeColors.listActiveSelectionBackground : undefined,
									color: selectedUserStory?.objectId === userStory.objectId ? themeColors.listActiveSelectionForeground : undefined,
									borderBottom: `1px solid ${themeColors.panelBorder}`,
									transition: 'background-color 0.15s ease, box-shadow 0.15s ease'
								}}
								onMouseEnter={e => {
									if (selectedUserStory?.objectId !== userStory.objectId) {
										e.currentTarget.style.backgroundColor = themeColors.listHoverBackground;
										e.currentTarget.style.boxShadow = `inset 0 0 0 1px ${themeColors.listHoverBackground}`;
									}
								}}
								onMouseLeave={e => {
									if (selectedUserStory?.objectId !== userStory.objectId) {
										e.currentTarget.style.backgroundColor = selectedUserStory?.objectId === userStory.objectId ? themeColors.listActiveSelectionBackground : '';
										e.currentTarget.style.boxShadow = 'none';
									}
								}}
							>
								<td style={{ padding: '10px 12px', fontWeight: 'normal', color: themeColors.foreground, textDecoration: 'none' }}>{userStory.formattedId}</td>
								<td style={{ padding: '10px 12px', fontWeight: 'normal' }}>{userStory.name}</td>
								<td
									style={{
										padding: '10px 12px',
										fontWeight: 'normal',
										color: getScheduleStateColor(userStory.scheduleState)
									}}
								>
									{userStory.scheduleState || 'N/A'}
								</td>
								<td style={{ padding: '10px 12px', fontWeight: 'normal', width: '29px', textAlign: 'center' }}>{userStory.planEstimate || 0}</td>
								<td style={{ padding: '10px 12px', fontWeight: 'normal', width: '29px', textAlign: 'center' }}>{userStory.toDo}</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	);
};

interface IterationsTableProps {
	iterations: Iteration[];
	loading?: boolean;
	error?: string;
	onLoadIterations?: () => void;
	onIterationSelected?: (iteration: Iteration) => void;
	selectedIteration?: Iteration | null;
}

export const IterationsTable: React.FC<IterationsTableProps> = ({ iterations, loading = false, error, onLoadIterations, onIterationSelected, selectedIteration }) => {
	// Function to check if iteration corresponds to current day
	const isCurrentDayIteration = (iteration: any) => {
		if (!iteration.startDate || !iteration.endDate) return false;

		const today = new Date();
		const startDate = new Date(iteration.startDate);
		const endDate = new Date(iteration.endDate);

		// Reset time for date comparison
		today.setHours(0, 0, 0, 0);
		startDate.setHours(0, 0, 0, 0);
		endDate.setHours(23, 59, 59, 999);

		return today >= startDate && today <= endDate;
	};

	// Function to check if iteration hasn't started yet
	const isFutureIteration = (iteration: any) => {
		if (!iteration.startDate) return false;

		const today = new Date();
		const startDate = new Date(iteration.startDate);

		// Reset time for date comparison
		today.setHours(0, 0, 0, 0);
		startDate.setHours(0, 0, 0, 0);

		return startDate > today;
	};
	return (
		<div
			style={{
				margin: '20px 0',
				padding: '20px',
				backgroundColor: themeColors.panelBackground,
				border: `1px solid ${themeColors.panelBorder}`,
				borderRadius: '6px'
			}}
		>
			{loading && (
				<div style={{ textAlign: 'center', padding: '20px' }}>
					<div
						style={{
							border: `2px solid ${themeColors.panelBorder}`,
							borderTop: `2px solid ${themeColors.progressBarBackground}`,
							borderRadius: '50%',
							width: '20px',
							height: '20px',
							animation: 'spin 1s linear infinite',
							margin: '0 auto 10px'
						}}
					/>
					<p>Loading iterations...</p>
				</div>
			)}

			{error && (
				<div
					style={{
						textAlign: 'center',
						padding: '20px',
						color: themeColors.errorForeground
					}}
				>
					<p>{error}</p>
				</div>
			)}

			{iterations.length > 0 && !loading && !error && (
				<table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${themeColors.panelBorder}` }}>
					<thead>
						<tr style={{ backgroundColor: themeColors.titleBarActiveBackground, color: themeColors.titleBarActiveForeground }}>
							<th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: `1px solid ${themeColors.panelBorder}`, fontWeight: 'bold', width: '40px' }}></th>
							<th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${themeColors.panelBorder}`, fontWeight: 'bold' }}>Name</th>
							<th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${themeColors.panelBorder}`, fontWeight: 'bold' }}>Start Date</th>
							<th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${themeColors.panelBorder}`, fontWeight: 'bold' }}>End Date</th>
						</tr>
					</thead>
					<tbody>
						{iterations
							.sort((a, b) => {
								const aDate = a.startDate ? new Date(a.startDate) : new Date(0);
								const bDate = b.startDate ? new Date(b.startDate) : new Date(0);
								return bDate.getTime() - aDate.getTime(); // Descending order
							})
							.map(iteration => (
								<tr
									key={iteration.objectId}
									onClick={() => onIterationSelected?.(iteration)}
									style={{
										cursor: onIterationSelected ? 'pointer' : 'default',
										backgroundColor: selectedIteration?.objectId === iteration.objectId ? themeColors.listActiveSelectionBackground : undefined,
										color: selectedIteration?.objectId === iteration.objectId ? themeColors.listActiveSelectionForeground : undefined,
										borderBottom: `1px solid ${themeColors.panelBorder}`,
										transition: 'background-color 0.15s ease, box-shadow 0.15s ease'
									}}
									onMouseEnter={e => {
										if (selectedIteration?.objectId !== iteration.objectId) {
											e.currentTarget.style.backgroundColor = themeColors.listHoverBackground;
											e.currentTarget.style.boxShadow = `inset 0 0 0 1px ${themeColors.listHoverBackground}`;
										}
									}}
									onMouseLeave={e => {
										if (selectedIteration?.objectId !== iteration.objectId) {
											e.currentTarget.style.backgroundColor = selectedIteration?.objectId === iteration.objectId ? themeColors.listActiveSelectionBackground : '';
											e.currentTarget.style.boxShadow = 'none';
										}
									}}
								>
									<td style={{ padding: '10px 4px', textAlign: 'center', fontWeight: 'normal' }}>{isCurrentDayIteration(iteration) && <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: themeColors.buttonBackground }}></span>}</td>
									<td style={{ padding: '10px 12px', fontWeight: 'normal', color: isFutureIteration(iteration) ? themeColors.descriptionForeground : themeColors.foreground, textDecoration: 'none' }}>{iteration.name}</td>
									<td style={{ padding: '10px 12px', fontWeight: 'normal', color: isFutureIteration(iteration) ? themeColors.descriptionForeground : undefined }}>{iteration.startDate ? new Date(iteration.startDate).toLocaleDateString() : 'N/A'}</td>
									<td style={{ padding: '10px 12px', fontWeight: 'normal', color: isFutureIteration(iteration) ? themeColors.descriptionForeground : undefined }}>{iteration.endDate ? new Date(iteration.endDate).toLocaleDateString() : 'N/A'}</td>
								</tr>
							))}
					</tbody>
				</table>
			)}
		</div>
	);
};

export default UserStoriesTable;
