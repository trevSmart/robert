import { FC, useCallback, useContext, useMemo } from 'react';
import { getVsCodeApi } from '../../utils/vscodeApi';
import { PinnedContext, pinnedKey } from './PinnedContext';
import type { RallyItemRef } from '../../../types/rally';

interface PinButtonProps {
	item: RallyItemRef;
}

const PinButton: FC<PinButtonProps> = ({ item }) => {
	const vscode = useMemo(() => getVsCodeApi(), []);
	const pinnedKeys = useContext(PinnedContext);
	const isPinned = pinnedKeys.has(pinnedKey(item.type, item.objectId));

	const handleClick = useCallback(() => {
		if (!vscode) return;
		vscode.postMessage({ command: 'togglePinnedItem', item });
	}, [vscode, item]);

	return (
		<button
			type="button"
			onClick={handleClick}
			title={isPinned ? 'Unpin' : 'Pin'}
			aria-label={isPinned ? 'Unpin' : 'Pin'}
			style={{
				display: 'inline-flex',
				verticalAlign: 'middle',
				alignItems: 'center',
				justifyContent: 'center',
				padding: '4px',
				backgroundColor: 'transparent',
				color: isPinned ? 'var(--vscode-textLink-foreground)' : 'var(--vscode-descriptionForeground)',
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
			<span className={`codicon codicon-${isPinned ? 'pinned' : 'pin'}`} style={{ fontSize: '18px', lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', transform: 'translateY(-1px)' }} />
		</button>
	);
};

export default PinButton;
