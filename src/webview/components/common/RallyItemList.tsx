import { FC, useState } from 'react';
import { themeColors } from '../../utils/themeColors';
import { UserStoryTypeIcon, DefectTypeIcon, SprintTypeIcon } from './icons/EntityTypeIcons';
import type { RallyItemRef, RecentlyViewedItemType } from '../../../types/rally';

interface RowAction<T extends RallyItemRef> {
	codiconName: string;
	title: string;
	onClick: (item: T) => void;
}

interface RallyItemListProps<T extends RallyItemRef> {
	title: string;
	items: T[];
	onItemClick: (item: T) => void;
	rowAction: RowAction<T>;
}

const TYPE_LABELS: Record<RecentlyViewedItemType, string> = {
	userstory: 'User Story',
	defect: 'Defect',
	sprint: 'Sprint'
};

const TYPE_ICONS: Record<RecentlyViewedItemType, FC> = {
	userstory: UserStoryTypeIcon,
	defect: DefectTypeIcon,
	sprint: SprintTypeIcon
};

const CodiconSpan: FC<{ name: string }> = ({ name }) => <span className={`codicon codicon-${name}`} style={{ fontSize: '14px', lineHeight: 1, display: 'inline-block', flexShrink: 0 }} />;

function RallyItemList<T extends RallyItemRef>({ title, items, onItemClick, rowAction }: RallyItemListProps<T>) {
	const [hoveredKey, setHoveredKey] = useState<string | null>(null);

	if (items.length === 0) return null;

	return (
		<collapsible-card title={title} compact>
			<div style={{ display: 'flex', flexDirection: 'column' }}>
				{items.map(item => {
					const key = `${item.type}-${item.objectId}`;
					const isHovered = hoveredKey === key;
					const TypeIcon = TYPE_ICONS[item.type];
					return (
						<div
							key={key}
							onClick={() => onItemClick(item)}
							onMouseEnter={() => setHoveredKey(key)}
							onMouseLeave={() => setHoveredKey(prev => (prev === key ? null : prev))}
							role="button"
							tabIndex={0}
							onKeyDown={e => {
								if (e.key === 'Enter' || e.key === ' ') onItemClick(item);
							}}
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: '10px',
								padding: '7px 16px',
								borderBottom: `1px solid ${themeColors.panelBorder}`,
								cursor: 'pointer',
								backgroundColor: isHovered ? 'var(--vscode-list-hoverBackground)' : 'transparent',
								transition: 'background-color 0.15s ease'
							}}
						>
							<span
								style={{
									fontSize: '11.5px',
									fontWeight: 300,
									padding: '5px 6px',
									borderRadius: '8px',
									backgroundColor: 'rgba(128, 128, 128, 0.1)',
									color: 'var(--vscode-descriptionForeground)',
									border: '1px solid var(--vscode-panel-border)',
									display: 'inline-flex',
									alignItems: 'center',
									gap: '7px',
									flexShrink: 0,
									whiteSpace: 'nowrap'
								}}
							>
								<TypeIcon />
								{TYPE_LABELS[item.type]}
							</span>
							{item.type === 'sprint' ? (
								<span
									style={{
										flex: 1,
										fontSize: '12.5px',
										color: 'var(--vscode-descriptionForeground)',
										overflow: 'hidden',
										textOverflow: 'ellipsis',
										whiteSpace: 'nowrap'
									}}
								>
									{item.name}
								</span>
							) : (
								<>
									<span
										style={{
											fontSize: '12.5px',
											fontWeight: 500,
											color: 'var(--vscode-foreground)',
											flexShrink: 0
										}}
									>
										{item.formattedId}
									</span>
									<span
										style={{
											flex: 1,
											fontSize: '12.5px',
											color: 'var(--vscode-descriptionForeground)',
											overflow: 'hidden',
											textOverflow: 'ellipsis',
											whiteSpace: 'nowrap'
										}}
									>
										{item.name}
									</span>
								</>
							)}
							{isHovered && (
								<button
									type="button"
									title={rowAction.title}
									onClick={e => {
										e.stopPropagation();
										rowAction.onClick(item);
									}}
									style={{
										display: 'inline-flex',
										alignItems: 'center',
										justifyContent: 'center',
										background: 'none',
										border: 'none',
										padding: '4px',
										borderRadius: '4px',
										cursor: 'pointer',
										flexShrink: 0,
										color: themeColors.descriptionForeground
									}}
								>
									<CodiconSpan name={rowAction.codiconName} />
								</button>
							)}
						</div>
					);
				})}
			</div>
		</collapsible-card>
	);
}

export default RallyItemList;
