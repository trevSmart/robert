import { type ComponentProps, type FC } from 'react';
import Calendar from '../common/Calendar';
import RallyItemList from '../common/RallyItemList';
import type { RecentlyViewedItem, PinnedItem } from '../../../types/rally';

export type HomeSectionProps = ComponentProps<typeof Calendar> & {
	recentlyViewedItems: RecentlyViewedItem[];
	onRecentlyViewedItemClick: (item: RecentlyViewedItem) => void;
	onRecentlyViewedItemDelete: (item: RecentlyViewedItem) => void;
	pinnedItems: PinnedItem[];
	onPinnedItemClick: (item: PinnedItem) => void;
	onPinnedItemUnpin: (item: PinnedItem) => void;
};

const HomeSection: FC<HomeSectionProps> = ({ recentlyViewedItems, onRecentlyViewedItemClick, onRecentlyViewedItemDelete, pinnedItems, onPinnedItemClick, onPinnedItemUnpin, ...calendarProps }) => (
	<>
		<Calendar {...calendarProps} />
		{pinnedItems.length > 0 && (
			<div style={{ padding: '0 20px', marginTop: '24px' }}>
				<RallyItemList title="Pinned" items={pinnedItems} onItemClick={onPinnedItemClick} rowAction={{ codiconName: 'pinned', title: 'Unpin', onClick: onPinnedItemUnpin }} />
			</div>
		)}
		{recentlyViewedItems.length > 0 && (
			<div style={{ padding: '0 20px', marginTop: '24px' }}>
				<RallyItemList title="Recently Viewed" items={recentlyViewedItems} onItemClick={onRecentlyViewedItemClick} rowAction={{ codiconName: 'close', title: 'Remove from history', onClick: onRecentlyViewedItemDelete }} />
			</div>
		)}
	</>
);

export default HomeSection;
