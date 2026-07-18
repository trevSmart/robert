import { type ComponentProps, type FC } from 'react';
import Calendar from '../common/Calendar';
import RecentlyViewedList from '../common/RecentlyViewedList';
import type { RecentlyViewedItem } from '../../../types/rally';

export type HomeSectionProps = ComponentProps<typeof Calendar> & {
	recentlyViewedItems: RecentlyViewedItem[];
	onRecentlyViewedItemClick: (item: RecentlyViewedItem) => void;
	onRecentlyViewedItemPinToggle: (item: RecentlyViewedItem) => void;
	onRecentlyViewedItemDelete: (item: RecentlyViewedItem) => void;
};

const HomeSection: FC<HomeSectionProps> = ({ recentlyViewedItems, onRecentlyViewedItemClick, onRecentlyViewedItemPinToggle, onRecentlyViewedItemDelete, ...calendarProps }) => (
	<>
		<Calendar {...calendarProps} />
		{recentlyViewedItems.length > 0 && (
			<div style={{ padding: '0 20px', marginTop: '24px' }}>
				<RecentlyViewedList items={recentlyViewedItems} onItemClick={onRecentlyViewedItemClick} onPinToggle={onRecentlyViewedItemPinToggle} onDelete={onRecentlyViewedItemDelete} />
			</div>
		)}
	</>
);

export default HomeSection;
