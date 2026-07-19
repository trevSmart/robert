import { FC } from 'react';
import { UserStoryTypeIcon, DefectTypeIcon, SprintTypeIcon, TaskTypeIcon, TestCaseTypeIcon } from './icons/EntityTypeIcons';
import { getEntityTypeColors } from '../../utils/themeColors';
import type { RallyEntityType } from '../../../types/rally';

const TYPE_LABELS: Record<RallyEntityType, string> = {
	userstory: 'User Story',
	defect: 'Defect',
	sprint: 'Sprint',
	task: 'Task',
	testcase: 'Test Case'
};

const TYPE_ICONS: Record<RallyEntityType, FC> = {
	userstory: UserStoryTypeIcon,
	defect: DefectTypeIcon,
	sprint: SprintTypeIcon,
	task: TaskTypeIcon,
	testcase: TestCaseTypeIcon
};

export type EntityTypeBadgeDisplay = 'full' | 'text' | 'icon';

interface EntityTypeBadgeProps {
	type: RallyEntityType;
	/** 'full' (icon + label, default), 'text' (label only) or 'icon' (icon only). */
	display?: EntityTypeBadgeDisplay;
}

/**
 * Type badge shown on Rally item rows — Recently Viewed, Favorites and global search results
 * all render it, so the three surfaces stay visually identical.
 */
const EntityTypeBadge: FC<EntityTypeBadgeProps> = ({ type, display = 'full' }) => {
	const Icon = TYPE_ICONS[type];
	const label = TYPE_LABELS[type];
	const iconOnly = display === 'icon';
	const colors = getEntityTypeColors(type);

	return (
		<span
			// Icon-only drops the label, so expose it as a tooltip instead.
			title={iconOnly ? label : undefined}
			style={{
				fontSize: '11.5px',
				fontWeight: 300,
				padding: iconOnly ? '5px' : '5px 6px',
				borderRadius: '8px',
				backgroundColor: colors.background,
				color: 'var(--vscode-descriptionForeground)',
				border: `1px solid ${colors.border}`,
				display: 'inline-flex',
				alignItems: 'center',
				gap: iconOnly ? 0 : '7px',
				flexShrink: 0,
				whiteSpace: 'nowrap'
			}}
		>
			{display !== 'text' && <Icon />}
			{!iconOnly && label}
		</span>
	);
};

export default EntityTypeBadge;
