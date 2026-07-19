import { createContext } from 'react';
import type { RecentlyViewedItemType } from '../../../types/rally';

/**
 * Set of favorite item keys (`type:objectId`), provided by MainWebview so any detail-view
 * FavoriteButton can tell whether its record is currently a favorite without prop threading.
 */
export const FavoritesContext = createContext<Set<string>>(new Set());

export const favoriteKey = (type: RecentlyViewedItemType, objectId: string): string => `${type}:${objectId}`;
