import type React from 'react';
import { themeColors } from '../../utils/themeColors';

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

const TasksTable: React.FC<TasksTableProps> = ({ tasks, loading = false, error }) => {
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
					<p>Loading tasks...</p>
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

			{tasks.length > 0 && !loading && !error && (
				<table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${themeColors.panelBorder}` }}>
					<thead>
						<tr style={{ backgroundColor: themeColors.titleBarActiveBackground, color: themeColors.titleBarActiveForeground }}>
							<th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${themeColors.panelBorder}`, fontWeight: 'bold' }}>ID</th>
							<th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${themeColors.panelBorder}`, fontWeight: 'bold' }}>Name</th>
							<th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${themeColors.panelBorder}`, fontWeight: 'bold' }}>State</th>
							<th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${themeColors.panelBorder}`, fontWeight: 'bold' }}>Assigned To</th>
							<th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${themeColors.panelBorder}`, fontWeight: 'bold' }}>Estimate</th>
							<th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${themeColors.panelBorder}`, fontWeight: 'bold' }}>To Do</th>
							<th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${themeColors.panelBorder}`, fontWeight: 'bold' }}>Time Spent</th>
						</tr>
					</thead>
					<tbody>
						{tasks.map(task => (
							<tr
								key={task.objectId}
								style={{
									borderBottom: `1px solid ${themeColors.panelBorder}`,
									cursor: 'default',
									transition: 'background-color 0.15s ease, box-shadow 0.15s ease'
								}}
								onMouseEnter={e => {
									e.currentTarget.style.backgroundColor = themeColors.listHoverBackground;
									e.currentTarget.style.boxShadow = `inset 0 0 0 1px ${themeColors.listHoverBackground}`;
								}}
								onMouseLeave={e => {
									e.currentTarget.style.backgroundColor = '';
									e.currentTarget.style.boxShadow = 'none';
								}}
							>
								<td style={{ padding: '10px 12px', fontWeight: 'normal' }}>{task.formattedId}</td>
								<td style={{ padding: '10px 12px', fontWeight: 'normal' }}>{task.name}</td>
								<td style={{ padding: '10px 12px', fontWeight: 'normal' }}>{task.state}</td>
								<td style={{ padding: '10px 12px', fontWeight: 'normal' }}>{task.owner || 'N/A'}</td>
								<td style={{ padding: '10px 12px', fontWeight: 'normal' }}>{task.estimate || 0}</td>
								<td style={{ padding: '10px 12px', fontWeight: 'normal' }}>{task.toDo}</td>
								<td style={{ padding: '10px 12px', fontWeight: 'normal' }}>{task.timeSpent}</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	);
};

export default TasksTable;
