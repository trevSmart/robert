import type React from 'react';
import { Table, TableCell, TableRow } from 'vscrui';
import { themeColors } from '../../utils/themeColors';

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
				backgroundColor: themeColors.panelBackground,
				border: `1px solid ${themeColors.panelBorder}`,
				borderRadius: '6px'
			}}
		>
			<div
				style={{
					fontSize: '12px',
					fontWeight: 400,
					color: themeColors.descriptionForeground,
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
						backgroundColor: themeColors.buttonBackground,
						color: themeColors.buttonForeground,
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
						backgroundColor: themeColors.buttonSecondaryBackground,
						color: themeColors.buttonSecondaryForeground,
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
							border: `2px solid ${themeColors.panelBorder}`,
							borderTop: `2px solid ${themeColors.progressBarBackground}`,
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
						color: themeColors.errorForeground
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
