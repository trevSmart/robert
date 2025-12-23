import type React from 'react';

interface Task {
	objectId: string;
	formattedId: string;
	name: string;
	description: string | null;
	state: string;
	owner: string;
	estimate: number;
	toDo: number;
	timeSpent: number;
	workItem: string | null;
}

interface TasksTableProps {
	tasks: Task[];
	loading?: boolean;
	error?: string;
	onLoadTasks?: () => void;
}

const TasksTable: React.FC<TasksTableProps> = ({ tasks, loading = false, error, onLoadTasks }) => {
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
				Tasks
			</div>

			<div style={{ marginBottom: '15px' }}>
				<button
					type="button"
					onClick={onLoadTasks}
					style={{
						backgroundColor: 'var(--vscode-button-background)',
						color: 'var(--vscode-button-foreground)',
						border: 'none',
						padding: '6px 12px',
						borderRadius: '5px',
						cursor: 'pointer'
					}}
				>
					Refresh Tasks
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
					<p>Loading tasks...</p>
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

			{tasks.length > 0 && !loading && !error && (
				<table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid var(--vscode-panel-border)' }}>
					<thead>
						<tr style={{ backgroundColor: 'var(--vscode-titleBar-activeBackground)', color: 'var(--vscode-titleBar-activeForeground)' }}>
							<th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--vscode-panel-border)', fontWeight: 'bold' }}>ID</th>
							<th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--vscode-panel-border)', fontWeight: 'bold' }}>Name</th>
							<th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--vscode-panel-border)', fontWeight: 'bold' }}>State</th>
							<th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--vscode-panel-border)', fontWeight: 'bold' }}>Owner</th>
							<th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--vscode-panel-border)', fontWeight: 'bold' }}>Estimate</th>
							<th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--vscode-panel-border)', fontWeight: 'bold' }}>To Do</th>
							<th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--vscode-panel-border)', fontWeight: 'bold' }}>Time Spent</th>
						</tr>
					</thead>
					<tbody>
						{tasks.map(task => (
							<tr
								key={task.objectId}
								style={{
									borderBottom: '1px solid var(--vscode-panel-border)'
								}}
							>
								<td style={{ padding: '8px 12px' }}>{task.formattedId}</td>
								<td style={{ padding: '8px 12px' }}>{task.name}</td>
								<td style={{ padding: '8px 12px' }}>{task.state}</td>
								<td style={{ padding: '8px 12px' }}>{task.owner || 'N/A'}</td>
								<td style={{ padding: '8px 12px' }}>{task.estimate || 0}</td>
								<td style={{ padding: '8px 12px' }}>{task.toDo}</td>
								<td style={{ padding: '8px 12px' }}>{task.timeSpent}</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	);
};

export default TasksTable;
