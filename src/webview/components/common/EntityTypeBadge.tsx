import { FC } from 'react';
import { UserStoryTypeIcon, DefectTypeIcon, SprintTypeIcon, TaskTypeIcon, TestCaseTypeIcon, type EntityTypeIconProps } from './icons/EntityTypeIcons';
import { getEntityTypeColors } from '../../utils/themeColors';
import type { RallyEntityType } from '../../../types/rally';

const TYPE_LABELS: Record<RallyEntityType, string> = {
	userstory: 'User Story',
	defect: 'Defect',
	sprint: 'Sprint',
	task: 'Task',
	testcase: 'Test Case'
};

const TYPE_ICONS: Record<RallyEntityType, FC<EntityTypeIconProps>> = {
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
	/** Encongeix el badge a 18px per encabir-lo en camps de formulari sense fer-los créixer. */
	compact?: boolean;
}

/**
 * Type badge shown on Rally item rows — Recently Viewed, Favorites and global search results
 * all render it, so the three surfaces stay visually identical.
 */
const EntityTypeBadge: FC<EntityTypeBadgeProps> = ({ type, display = 'full', compact = false }) => {
	const Icon = TYPE_ICONS[type];
	const label = TYPE_LABELS[type];
	const iconOnly = display === 'icon';
	const colors = getEntityTypeColors(type);
	// 12px d'icona + 1px de padding + 1px de vora a cada costat = 16px, prou petit perquè el
	// badge no faci créixer el camp de formulari respecte de l'input que hi havia abans.
	const iconSize = compact ? 12 : 14;

	return (
		<span
			// Icon-only drops the label, so expose it as a tooltip instead.
			title={iconOnly ? label : undefined}
			style={{
				fontSize: '11.5px',
				fontWeight: 300,
				padding: iconOnly ? (compact ? '1px' : '5px') : '5px 6px',
				borderRadius: compact ? '5px' : '8px',
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
			{display !== 'text' && <Icon size={iconSize} />}
			{!iconOnly && label}
		</span>
	);
};

export default EntityTypeBadge;

interface EntityRefFormFieldProps {
	/** Tipus de l'entitat referenciada — determina la icona i el color del badge. */
	type: RallyEntityType;
	/** Nom del registre referenciat; buit mostra `emptyLabel`. */
	value?: string | null;
	emptyLabel?: string;
}

/**
 * Camp de detall de només lectura per a una referència a un altre registre. Fa el mateix paper
 * que `AvatarFormField` per a les persones: el badge del tipus encapçala el valor perquè es vegi
 * d'un cop d'ull a quina mena de registre apunta el camp.
 */
export const EntityRefFormField: FC<EntityRefFormFieldProps> = ({ type, value, emptyLabel = 'N/A' }) => {
	const empty = !value || !value.trim();

	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: '8px',
				width: '100%',
				padding: '6px 8px',
				backgroundColor: 'var(--vscode-input-background)',
				border: '1px solid var(--vscode-input-border)',
				borderRadius: '3px',
				fontSize: '13px',
				color: empty ? '#6c757d' : 'var(--vscode-input-foreground)',
				boxSizing: 'border-box'
			}}
		>
			<EntityTypeBadge type={type} display="icon" compact />
			<span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{empty ? emptyLabel : value}</span>
		</div>
	);
};
