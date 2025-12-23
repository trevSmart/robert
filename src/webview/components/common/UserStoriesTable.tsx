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
			<div
				style={{
					fontSize: '12px',
					fontWeight: 400,
					color: 'color(srgb 0.8 0.8 0.8 / 0.68)',
					letterSpacing: '0.5px',
					margin: '0 0 8px 0',
					paddingLeft: '7px'
				}}
			>
				Rally User Stories
			</div>

			<div style={{ marginBottom: '15px' }}>
				<button
					type="button"
					onClick={onLoadUserStories}
					style={{
						backgroundColor: 'var(--vscode-button-background)',
						color: 'var(--vscode-button-foreground)',
						border: 'none',
						padding: '6px 12px',
						borderRadius: '5px',
						cursor: 'pointer'
					}}
				>
					Refresh User Stories
				</button>
			</div>

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
							<th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--vscode-panel-border)', fontWeight: 'bold' }}>ID</th>
							<th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--vscode-panel-border)', fontWeight: 'bold' }}>Name</th>
							<th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--vscode-panel-border)', fontWeight: 'bold' }}>State</th>
							<th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--vscode-panel-border)', fontWeight: 'bold' }}>Assigned To</th>
							<th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--vscode-panel-border)', fontWeight: 'bold' }}>Estimate</th>
							<th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--vscode-panel-border)', fontWeight: 'bold' }}>To Do</th>
							<th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--vscode-panel-border)', fontWeight: 'bold' }}>Blocked</th>
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
									borderBottom: '1px solid var(--vscode-panel-border)'
								}}
								onMouseEnter={e => {
									if (selectedUserStory?.objectId !== userStory.objectId) {
										e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)';
									}
								}}
								onMouseLeave={e => {
									if (selectedUserStory?.objectId !== userStory.objectId) {
										e.currentTarget.style.backgroundColor = selectedUserStory?.objectId === userStory.objectId ? 'var(--vscode-list-activeSelectionBackground)' : '';
									}
								}}
							>
								<td style={{ padding: '8px 12px' }}>{userStory.formattedId}</td>
								<td style={{ padding: '8px 12px' }}>{userStory.name}</td>
								<td style={{ padding: '8px 12px' }}>{userStory.state}</td>
								<td style={{ padding: '8px 12px' }}>{userStory.owner || 'N/A'}</td>
								<td style={{ padding: '8px 12px' }}>{userStory.planEstimate || 0}</td>
								<td style={{ padding: '8px 12px' }}>{userStory.toDo}</td>
								<td style={{ padding: '8px 12px' }}>{userStory.blocked ? 'Yes' : 'No'}</td>
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
	return (
		<div
			style={{
				margin: '20px 0',
				padding: '20px',
				backgroundColor: '#282828',
				borderRadius: '6px'
			}}
		>
			<div
				style={{
					fontSize: '12px',
					fontWeight: 400,
					color: 'color(srgb 0.8 0.8 0.8 / 0.68)',
					letterSpacing: '0.5px',
					margin: '0 0 8px 0',
					paddingLeft: '7px'
				}}
			>
				Rally Iterations
			</div>

			<div style={{ marginBottom: '15px' }}>
				<button
					type="button"
					onClick={onLoadIterations}
					style={{
						backgroundColor: 'var(--vscode-button-background)',
						color: 'var(--vscode-button-foreground)',
						border: 'none',
						padding: '6px 12px',
						borderRadius: '5px',
						cursor: 'pointer',
						marginRight: '10px'
					}}
				>
					Load Iterations
				</button>
				{selectedIteration && (
					<div style={{ display: 'inline-block', marginLeft: '10px', color: 'var(--vscode-foreground)' }}>
						Selected: <strong>{selectedIteration.name}</strong>
					</div>
				)}
			</div>

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
							<th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--vscode-panel-border)', fontWeight: 'bold' }}>Name</th>
							<th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--vscode-panel-border)', fontWeight: 'bold' }}>Start Date</th>
							<th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--vscode-panel-border)', fontWeight: 'bold' }}>End Date</th>
							<th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--vscode-panel-border)', fontWeight: 'bold' }}>State</th>
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
									borderBottom: '1px solid var(--vscode-panel-border)'
								}}
								onMouseEnter={e => {
									if (selectedIteration?.objectId !== iteration.objectId) {
										e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)';
									}
								}}
								onMouseLeave={e => {
									if (selectedIteration?.objectId !== iteration.objectId) {
										e.currentTarget.style.backgroundColor = selectedIteration?.objectId === iteration.objectId ? 'var(--vscode-list-activeSelectionBackground)' : '';
									}
								}}
							>
								<td style={{ padding: '8px 12px' }}>{iteration.name}</td>
								<td style={{ padding: '8px 12px' }}>{iteration.startDate ? new Date(iteration.startDate).toLocaleDateString() : 'N/A'}</td>
								<td style={{ padding: '8px 12px' }}>{iteration.endDate ? new Date(iteration.endDate).toLocaleDateString() : 'N/A'}</td>
								<td style={{ padding: '8px 12px' }}>{iteration.state}</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	);
};

export default UserStoriesTable;
