import { FC, ReactNode, useState } from 'react';
import { themeColors } from '../../utils/themeColors';
import EntityTypeBadge from './EntityTypeBadge';
import type { RallyItemRef } from '../../../types/rally';

interface RowAction<T extends RallyItemRef> {
	codiconName: string;
	title: string;
	onClick: (item: T) => void;
}

interface RallyItemListProps<T extends RallyItemRef> {
	title: string;
	/** Rendered before the title in the card header. Accepts a codicon span or inline SVG. */
	titleIcon?: ReactNode;
	items: T[];
	onItemClick: (item: T) => void;
	rowAction: RowAction<T>;
}

export const CodiconSpan: FC<{ name: string }> = ({ name }) => <span className={`codicon codicon-${name}`} style={{ fontSize: '14px', lineHeight: 1, display: 'inline-block', flexShrink: 0 }} />;

function RallyItemList<T extends RallyItemRef>({ title, titleIcon, items, onItemClick, rowAction }: RallyItemListProps<T>) {
	const [hoveredKey, setHoveredKey] = useState<string | null>(null);

	if (items.length === 0) return null;

	return (
		<collapsible-card title={title} compact>
			{titleIcon && <span slot="title-icon">{titleIcon}</span>}
			<div style={{ display: 'flex', flexDirection: 'column' }}>
				{items.map(item => {
					const key = `${item.type}-${item.objectId}`;
					const isHovered = hoveredKey === key;
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
							<EntityTypeBadge type={item.type} display="icon" />
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
