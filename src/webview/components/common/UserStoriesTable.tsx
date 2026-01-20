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
	return (
		<div
			style={{
				margin: '20px 0',
				padding: '20px',
				backgroundColor: '#282828',
				borderRadius: '6px'
			}}
		>
			{loading && (
				<div style={{ textAlign: 'center', padding: '20px' }}>
					<div
						style={{
							border: '2px solid var(--vscode-panel-border)',
							borderTop: '2px solid var(--vscode-button-background)',
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
						color: 'var(--vscode-errorForeground)'
					}}
				>
					<p>{error}</p>
				</div>
			)}

			{userStories.length > 0 && !loading && !error && (
				<table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid var(--vscode-panel-border)' }}>
					<thead>
						<tr style={{ backgroundColor: 'var(--vscode-titleBar-activeBackground)', color: 'var(--vscode-titleBar-activeForeground)' }}>
							<th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--vscode-panel-border)', fontWeight: 'bold', width: '10%' }}>ID</th>
							<th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--vscode-panel-border)', fontWeight: 'bold', width: '25%' }}>Name</th>
							<th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--vscode-panel-border)', fontWeight: 'bold', width: '12%' }}>Status</th>
							<th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--vscode-panel-border)', fontWeight: 'bold' }}>Estimate</th>
							<th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--vscode-panel-border)', fontWeight: 'bold' }}>To Do</th>
						</tr>
					</thead>
					<tbody>
						{userStories.map(userStory => (
							<tr
								key={userStory.objectId}
								onClick={() => onUserStorySelected?.(userStory)}
								style={{
									cursor: onUserStorySelected ? 'pointer' : 'default',
									backgroundColor: selectedUserStory?.objectId === userStory.objectId ? 'var(--vscode-list-activeSelectionBackground)' : undefined,
									color: selectedUserStory?.objectId === userStory.objectId ? 'var(--vscode-list-activeSelectionForeground)' : undefined,
									borderBottom: '1px solid var(--vscode-panel-border)',
									transition: 'background-color 0.15s ease, box-shadow 0.15s ease'
								}}
								onMouseEnter={e => {
									if (selectedUserStory?.objectId !== userStory.objectId) {
										e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)';
										e.currentTarget.style.boxShadow = 'inset 0 0 0 1px var(--vscode-list-hoverBackground)';
									}
								}}
								onMouseLeave={e => {
									if (selectedUserStory?.objectId !== userStory.objectId) {
										e.currentTarget.style.backgroundColor = selectedUserStory?.objectId === userStory.objectId ? 'var(--vscode-list-activeSelectionBackground)' : '';
										e.currentTarget.style.boxShadow = 'none';
									}
								}}
							>
								<td style={{ padding: '10px 12px', fontWeight: 'normal', color: 'var(--vscode-textLink-foreground)', textDecoration: 'none' }}>{userStory.formattedId}</td>
								<td style={{ padding: '10px 12px', width: '25%', fontWeight: 'normal' }}>{userStory.name}</td>
								<td
									style={{
										padding: '10px 12px',
										fontWeight: '500',
										color: userStory.taskStatus === 'DEFINED' ? 'color(srgb 0.4 0.9 0.6 / 0.9)' : userStory.taskStatus === 'BLOCKED' ? 'color(srgb 1 0.5 0.5 / 0.95)' : 'var(--vscode-descriptionForeground)'
									}}
								>
									{userStory.taskStatus && userStory.taskStatus !== 'NONE' ? userStory.taskStatus : ''}
								</td>
								<td style={{ padding: '10px 12px', fontWeight: 'normal' }}>{userStory.planEstimate || 0}</td>
								<td style={{ padding: '10px 12px', fontWeight: 'normal' }}>{userStory.toDo}</td>
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
	return (
		<div
			style={{
				margin: '20px 0',
				padding: '20px',
				backgroundColor: '#282828',
				borderRadius: '6px'
			}}
		>
			{loading && (
				<div style={{ textAlign: 'center', padding: '20px' }}>
					<div
						style={{
							border: '2px solid var(--vscode-panel-border)',
							borderTop: '2px solid var(--vscode-button-background)',
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
						color: 'var(--vscode-errorForeground)'
					}}
				>
					<p>{error}</p>
				</div>
			)}

			{iterations.length > 0 && !loading && !error && (
				<table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid var(--vscode-panel-border)' }}>
					<thead>
						<tr style={{ backgroundColor: 'var(--vscode-titleBar-activeBackground)', color: 'var(--vscode-titleBar-activeForeground)' }}>
							<th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--vscode-panel-border)', fontWeight: 'bold', width: '40px' }}></th>
							<th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--vscode-panel-border)', fontWeight: 'bold' }}>Name</th>
							<th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--vscode-panel-border)', fontWeight: 'bold' }}>Start Date</th>
							<th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--vscode-panel-border)', fontWeight: 'bold' }}>End Date</th>
							<th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--vscode-panel-border)', fontWeight: 'bold' }}>State</th>
						</tr>
					</thead>
					<tbody>
						{iterations.map(iteration => (
							<tr
								key={iteration.objectId}
								onClick={() => onIterationSelected?.(iteration)}
								style={{
									cursor: onIterationSelected ? 'pointer' : 'default',
									backgroundColor: selectedIteration?.objectId === iteration.objectId ? 'var(--vscode-list-activeSelectionBackground)' : undefined,
									color: selectedIteration?.objectId === iteration.objectId ? 'var(--vscode-list-activeSelectionForeground)' : undefined,
									borderBottom: '1px solid var(--vscode-panel-border)',
									transition: 'background-color 0.15s ease, box-shadow 0.15s ease'
								}}
								onMouseEnter={e => {
									if (selectedIteration?.objectId !== iteration.objectId) {
										e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)';
										e.currentTarget.style.boxShadow = 'inset 0 0 0 1px var(--vscode-list-hoverBackground)';
									}
								}}
								onMouseLeave={e => {
									if (selectedIteration?.objectId !== iteration.objectId) {
										e.currentTarget.style.backgroundColor = selectedIteration?.objectId === iteration.objectId ? 'var(--vscode-list-activeSelectionBackground)' : '';
										e.currentTarget.style.boxShadow = 'none';
									}
								}}
							>
								<td style={{ padding: '10px 4px', textAlign: 'center', fontWeight: 'normal' }}>{isCurrentDayIteration(iteration) && <span style={{ fontSize: '14px' }}>📅</span>}</td>
								<td style={{ padding: '10px 12px', fontWeight: 'normal', color: 'var(--vscode-textLink-foreground)', textDecoration: 'none' }}>{iteration.name}</td>
								<td style={{ padding: '10px 12px', fontWeight: 'normal' }}>{iteration.startDate ? new Date(iteration.startDate).toLocaleDateString() : 'N/A'}</td>
								<td style={{ padding: '10px 12px', fontWeight: 'normal' }}>{iteration.endDate ? new Date(iteration.endDate).toLocaleDateString() : 'N/A'}</td>
								<td style={{ padding: '10px 12px', fontWeight: 'normal' }}>{iteration.state}</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	);
};

export default UserStoriesTable;
