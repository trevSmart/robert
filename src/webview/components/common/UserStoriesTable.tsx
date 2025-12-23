import type React from 'react';
import { Table, TableCell, TableRow } from 'vscrui';

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
}

const UserStoriesTable: React.FC<UserStoriesTableProps> = ({ userStories, loading = false, error, onLoadUserStories, onClearUserStories }) => {
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
						cursor: 'pointer',
						marginRight: '10px'
					}}
				>
					Load User Stories
				</button>
				<button
					type="button"
					onClick={onClearUserStories}
					style={{
						backgroundColor: 'var(--vscode-button-secondaryBackground)',
						color: 'var(--vscode-button-secondaryForeground)',
						border: 'none',
						padding: '6px 12px',
						borderRadius: '5px',
						cursor: 'pointer'
					}}
				>
					Clear User Stories
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
				<Table stripped>
					<TableRow isHeader>
						<TableCell>ID</TableCell>
						<TableCell>Name</TableCell>
						<TableCell>State</TableCell>
						<TableCell>Owner</TableCell>
						<TableCell>Estimate</TableCell>
						<TableCell>Blocked</TableCell>
					</TableRow>
					{userStories.map(userStory => (
						<TableRow key={userStory.objectId}>
							<TableCell>{userStory.formattedId}</TableCell>
							<TableCell>{userStory.name}</TableCell>
							<TableCell>{userStory.state}</TableCell>
							<TableCell>{userStory.owner || 'N/A'}</TableCell>
							<TableCell>{userStory.planEstimate || 0}</TableCell>
							<TableCell>{userStory.blocked ? 'Yes' : 'No'}</TableCell>
						</TableRow>
					))}
				</Table>
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
				<Table stripped>
					<TableRow isHeader>
						<TableCell>Name</TableCell>
						<TableCell>Start Date</TableCell>
						<TableCell>End Date</TableCell>
						<TableCell>State</TableCell>
						<TableCell>Action</TableCell>
					</TableRow>
					{iterations.map(iteration => (
						<TableRow key={iteration.objectId}>
							<TableCell>{iteration.name}</TableCell>
							<TableCell>{iteration.startDate ? new Date(iteration.startDate).toLocaleDateString() : 'N/A'}</TableCell>
							<TableCell>{iteration.endDate ? new Date(iteration.endDate).toLocaleDateString() : 'N/A'}</TableCell>
							<TableCell>{iteration.state}</TableCell>
							<TableCell>
								<button
									type="button"
									onClick={() => onIterationSelected?.(iteration)}
									style={{
										backgroundColor: selectedIteration?.objectId === iteration.objectId ? 'var(--vscode-button-background)' : 'var(--vscode-button-secondaryBackground)',
										color: selectedIteration?.objectId === iteration.objectId ? 'var(--vscode-button-foreground)' : 'var(--vscode-button-secondaryForeground)',
										border: 'none',
										padding: '4px 8px',
										borderRadius: '3px',
										cursor: 'pointer',
										fontSize: '11px'
									}}
								>
									{selectedIteration?.objectId === iteration.objectId ? 'Selected' : 'Select'}
								</button>
							</TableCell>
						</TableRow>
					))}
				</Table>
			)}
		</div>
	);
};

export default UserStoriesTable;
