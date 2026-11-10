import type { FC } from 'react';
import type { UserStoryFilters } from '../sections/portfolio/types';

interface SprintOption {
	objectId: string;
	name: string;
	project: string | null;
	projects?: string[];
	_ref: string;
}

interface UserStoryFiltersBarProps {
	filters: UserStoryFilters;
	projects: string[];
	sprints: SprintOption[];
	onChange: (filters: UserStoryFilters) => void;
}

const selectStyle = {
	padding: '4px 8px',
	borderRadius: '4px',
	backgroundColor: 'var(--vscode-dropdown-background)',
	color: 'var(--vscode-dropdown-foreground)',
	border: '1px solid var(--vscode-dropdown-border)',
	cursor: 'pointer',
	fontSize: '12px',
	maxWidth: '260px'
} as const;

const labelStyle = {
	display: 'flex',
	alignItems: 'center',
	gap: '6px',
	fontSize: '12px',
	color: 'var(--vscode-descriptionForeground)'
} as const;

const UserStoryFiltersBar: FC<UserStoryFiltersBarProps> = ({ filters, projects, sprints, onChange }) => {
	// Con un proyecto elegido solo se ofrecen sus sprints; sin proyecto, todos.
	const visibleSprints = filters.project ? sprints.filter(s => (s.projects ? s.projects.includes(filters.project) : s.project === filters.project)) : sprints;
	const hasFilters = Boolean(filters.project || filters.sprint);

	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				flexWrap: 'wrap',
				gap: '16px',
				marginBottom: '12px'
			}}
		>
			<label style={labelStyle}>
				Project
				<select
					value={filters.project}
					onChange={e =>
						// Al cambiar de proyecto se descarta el sprint, que puede ser de otro.
						onChange({ project: e.target.value, sprint: '' })
					}
					style={selectStyle}
				>
					<option value="">All projects</option>
					{projects.map(key => (
						<option key={key} value={key}>
							{key}
						</option>
					))}
				</select>
			</label>

			<label style={labelStyle}>
				Sprint
				<select value={filters.sprint} onChange={e => onChange({ ...filters, sprint: e.target.value })} style={selectStyle}>
					<option value="">All sprints</option>
					{visibleSprints.map(sprint => (
						<option key={sprint.objectId} value={sprint._ref}>
							{sprint.name}
						</option>
					))}
				</select>
			</label>

			{hasFilters && (
				<button
					type="button"
					onClick={() => onChange({ project: '', sprint: '' })}
					style={{
						padding: '3px 10px',
						borderRadius: '4px',
						border: '1px solid var(--vscode-dropdown-border)',
						backgroundColor: 'transparent',
						color: 'var(--vscode-foreground)',
						cursor: 'pointer',
						fontSize: '12px'
					}}
				>
					Clear filters
				</button>
			)}
		</div>
	);
};

export default UserStoryFiltersBar;
