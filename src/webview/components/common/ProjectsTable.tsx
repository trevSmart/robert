import type React from 'react';
import { Table, TableCell, TableRow } from 'vscrui';

interface Project {
	name?: string;
	description?: string;
	state?: string;
	owner?: string;
	childrenCount?: number;
}

interface ProjectsTableProps {
	projects: Project[];
	loading?: boolean;
	error?: string;
	onLoadProjects?: () => void;
	onClearProjects?: () => void;
}

const ProjectsTable: React.FC<ProjectsTableProps> = ({ projects, loading = false, error, onLoadProjects, onClearProjects }) => {
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
				Rally Projects
			</div>

			<div style={{ marginBottom: '15px' }}>
				<button
					type="button"
					onClick={onLoadProjects}
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
					Load Projects
				</button>
				<button
					type="button"
					onClick={onClearProjects}
					style={{
						backgroundColor: 'var(--vscode-button-secondaryBackground)',
						color: 'var(--vscode-button-secondaryForeground)',
						border: 'none',
						padding: '6px 12px',
						borderRadius: '5px',
						cursor: 'pointer'
					}}
				>
					Clear Projects
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
					<p>Loading projects...</p>
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

			{projects.length > 0 && !loading && !error && (
				<Table stripped>
					<TableRow isHeader>
						<TableCell>Name</TableCell>
						<TableCell>Description</TableCell>
						<TableCell>State</TableCell>
						<TableCell>Owner</TableCell>
						<TableCell>Children</TableCell>
					</TableRow>
					{projects.map(project => (
						<TableRow key={project.name || 'unknown'}>
							<TableCell>{project.name || 'N/A'}</TableCell>
							<TableCell>{project.description || 'N/A'}</TableCell>
							<TableCell>{project.state || 'N/A'}</TableCell>
							<TableCell>{project.owner || 'N/A'}</TableCell>
							<TableCell>{project.childrenCount || 0}</TableCell>
						</TableRow>
					))}
				</Table>
			)}
		</div>
	);
};

export default ProjectsTable;
