import { FC, useCallback, useContext, useMemo } from 'react';
import { getVsCodeApi } from '../../utils/vscodeApi';
import { FavoritesContext, favoriteKey } from './FavoritesContext';
import type { RallyItemRef } from '../../../types/rally';

interface FavoriteButtonProps {
	item: RallyItemRef;
}

const FavoriteButton: FC<FavoriteButtonProps> = ({ item }) => {
	const vscode = useMemo(() => getVsCodeApi(), []);
	const favoriteKeys = useContext(FavoritesContext);
	const isFavorite = favoriteKeys.has(favoriteKey(item.type, item.objectId));

	const handleClick = useCallback(() => {
		if (!vscode) return;
		vscode.postMessage({ command: 'toggleFavoriteItem', item });
	}, [vscode, item]);

	return (
		<button
			type="button"
			onClick={handleClick}
			title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
			aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
			style={{
				display: 'inline-flex',
				verticalAlign: 'middle',
				alignItems: 'center',
				justifyContent: 'center',
				padding: '4px',
				backgroundColor: 'transparent',
				color: isFavorite ? 'var(--vscode-textLink-foreground)' : 'var(--vscode-descriptionForeground)',
				border: 'none',
				borderRadius: '3px',
				cursor: 'pointer',
				opacity: 0.7
			}}
			onMouseEnter={e => {
				e.currentTarget.style.backgroundColor = 'var(--vscode-toolbar-hoverBackground)';
				e.currentTarget.style.opacity = '1';
			}}
			onMouseLeave={e => {
				e.currentTarget.style.backgroundColor = 'transparent';
				e.currentTarget.style.opacity = '0.7';
			}}
		>
			<span className={`codicon codicon-${isFavorite ? 'star-full' : 'star'}`} style={{ fontSize: '18px', lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', transform: 'translateY(-1px)' }} />
		</button>
	);
};

export default FavoriteButton;
