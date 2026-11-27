import React, { useMemo } from 'react';
import Select, { type SelectOption } from './Select';

/** Configured projects (comma-separated project setting) and the selected one; null = all. */
export interface ProjectScope {
	projects: string[];
	active: string | null;
}

export const EMPTY_PROJECT_SCOPE: ProjectScope = { projects: [], active: null };

/** Option value for "all configured projects" (project keys/names never start with a NUL). */
const ALL_PROJECTS = '\u0000all';

interface ProjectScopeSelectorProps {
	scope: ProjectScope;
	onChange: (project: string | null) => void;
}

/**
 * Project selector of the navigation bar. Shown only when several projects are configured:
 * "All projects" aggregates them, or one project narrows every view to it.
 */
const ProjectScopeSelector: React.FC<ProjectScopeSelectorProps> = ({ scope, onChange }) => {
	const options = useMemo<SelectOption[]>(() => [{ value: ALL_PROJECTS, label: 'All projects', title: `All projects (${scope.projects.join(', ')})` }, ...scope.projects.map(project => ({ value: project, label: project }))], [scope.projects]);

	if (scope.projects.length < 2) {
		return null;
	}

	return (
		<div style={{ display: 'flex', alignItems: 'center', flex: '0 0 auto', padding: '0 6px', minWidth: 0 }}>
			<Select value={scope.active ?? ALL_PROJECTS} options={options} onChange={value => onChange(value === ALL_PROJECTS ? null : value)} ariaLabel="Project" maxWidth="140px" />
		</div>
	);
};

export default ProjectScopeSelector;
