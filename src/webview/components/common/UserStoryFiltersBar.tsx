import type { FC } from 'react';
import type { UserStoryFilters } from '../sections/portfolio/types';
import Select from './Select';

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
			{/* With one project in scope (or none known) there is nothing to choose. */}
			{(projects.length > 1 || filters.project) && (
				<label style={labelStyle}>
					Project
					<Select
						ariaLabel="Project"
						maxWidth="260px"
						value={filters.project}
						options={[{ value: '', label: 'All projects' }, ...projects.map(key => ({ value: key, label: key }))]}
						onChange={project =>
							// Al cambiar de proyecto se descarta el sprint, que puede ser de otro.
							onChange({ project, sprint: '' })
						}
					/>
				</label>
			)}

			<label style={labelStyle}>
				Sprint
				<Select ariaLabel="Sprint" maxWidth="260px" value={filters.sprint} options={[{ value: '', label: 'All sprints' }, ...visibleSprints.map(sprint => ({ value: sprint._ref, label: sprint.name }))]} onChange={sprint => onChange({ ...filters, sprint })} />
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
