import { type ComponentProps, type FC } from 'react';
import Calendar from '../common/Calendar';
import JiraItemList, { CodiconSpan } from '../common/JiraItemList';
import type { RecentlyViewedItem, FavoriteItem } from '../../../types/jira';

export type HomeSectionProps = ComponentProps<typeof Calendar> & {
	recentlyViewedItems: RecentlyViewedItem[];
	onRecentlyViewedItemClick: (item: RecentlyViewedItem) => void;
	onRecentlyViewedItemDelete: (item: RecentlyViewedItem) => void;
	favoriteItems: FavoriteItem[];
	onFavoriteItemClick: (item: FavoriteItem) => void;
	onFavoriteItemRemove: (item: FavoriteItem) => void;
};

const HomeSection: FC<HomeSectionProps> = ({ recentlyViewedItems, onRecentlyViewedItemClick, onRecentlyViewedItemDelete, favoriteItems, onFavoriteItemClick, onFavoriteItemRemove, ...calendarProps }) => (
	<>
		<Calendar {...calendarProps} />
		{favoriteItems.length > 0 && (
			<div style={{ padding: '0 20px', marginTop: '24px' }}>
				<JiraItemList
					title="Favorites"
					titleIcon={<CodiconSpan name="star-full" />}
					items={favoriteItems}
					onItemClick={onFavoriteItemClick}
					rowAction={{
						codiconName: 'star-full',
						title: 'Remove from favorites',
						onClick: onFavoriteItemRemove
					}}
				/>
			</div>
		)}
		{recentlyViewedItems.length > 0 && (
			<div style={{ padding: '0 20px', marginTop: '24px' }}>
				<JiraItemList
					title="Recently Viewed"
					titleIcon={<CodiconSpan name="history" />}
					items={recentlyViewedItems}
					onItemClick={onRecentlyViewedItemClick}
					rowAction={{
						codiconName: 'close',
						title: 'Remove from history',
						onClick: onRecentlyViewedItemDelete
					}}
				/>
			</div>
		)}
	</>
);

export default HomeSection;
