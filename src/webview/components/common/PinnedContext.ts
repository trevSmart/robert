import { createContext } from 'react';
import type { RecentlyViewedItemType } from '../../../types/rally';

/**
 * Set of pinned item keys (`type:objectId`), provided by MainWebview so any detail-view
 * PinButton can tell whether its record is currently pinned without prop threading.
 */
export const PinnedContext = createContext<Set<string>>(new Set());

export const pinnedKey = (type: RecentlyViewedItemType, objectId: string): string => `${type}:${objectId}`;
