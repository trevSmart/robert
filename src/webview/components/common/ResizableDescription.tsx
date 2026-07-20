import { FC, useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import DOMPurify from 'dompurify';

// Shared sizing criteria for every description panel (user stories, defects, ...).
// MIN: the panel never collapses, even with an empty description.
// DEFAULT: initial visible height; longer content scrolls inside the panel.
// MAX: upper bound when the user drags the resize handle.
export const DESCRIPTION_HEIGHT_MIN = 80;
export const DESCRIPTION_HEIGHT_MAX = 600;
export const DESCRIPTION_HEIGHT_DEFAULT = 300;

// Reset outer margins of the rendered HTML so text starts flush with the padding.
const DescriptionBody = styled.div`
	& > :first-child {
		margin-top: 0;
	}
	& > :last-child {
		margin-bottom: 0;
	}
`;

const EMPTY_DESCRIPTION_HTML = '<p style="color: var(--vscode-descriptionForeground); font-style: italic;">No description available</p>';

interface ResizableDescriptionProps {
	description: string | null | undefined;
	initialHeight?: number;
}

const ResizableDescription: FC<ResizableDescriptionProps> = ({ description, initialHeight = DESCRIPTION_HEIGHT_DEFAULT }) => {
	const [height, setHeight] = useState(initialHeight);
	const resizeStartRef = useRef({ y: 0, height: 0 });
	// Neteja del drag actiu. Viu en un ref perquè el desmuntatge també la pugui
	// executar: el canvi de pantalla remunta l'arbre sencer, i sense això els
	// listeners de `document` i el cursor/userSelect del body quedarien enganxats.
	const endResizeRef = useRef<(() => void) | null>(null);

	const handleResizeStart = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			resizeStartRef.current = { y: e.clientY, height };
			document.body.style.cursor = 'ns-resize';
			document.body.style.userSelect = 'none';
			const onMouseMove = (moveEvent: MouseEvent) => {
				const delta = moveEvent.clientY - resizeStartRef.current.y;
				const newHeight = Math.min(DESCRIPTION_HEIGHT_MAX, Math.max(DESCRIPTION_HEIGHT_MIN, resizeStartRef.current.height + delta));
				setHeight(newHeight);
			};
			const onMouseUp = () => endResizeRef.current?.();
			endResizeRef.current = () => {
				document.removeEventListener('mousemove', onMouseMove);
				document.removeEventListener('mouseup', onMouseUp);
				document.body.style.cursor = '';
				document.body.style.userSelect = '';
				endResizeRef.current = null;
			};
			document.addEventListener('mousemove', onMouseMove);
			document.addEventListener('mouseup', onMouseUp);
		},
		[height]
	);

	useEffect(() => () => endResizeRef.current?.(), []);

	const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
		if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
			e.preventDefault();
			const target = e.currentTarget;
			const selection = window.getSelection();
			if (selection) {
				const range = document.createRange();
				range.selectNodeContents(target);
				selection.removeAllRanges();
				selection.addRange(range);
			}
		}
	}, []);

	return (
		<div style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--vscode-input-border)', borderRadius: '3px', overflow: 'hidden' }}>
			<DescriptionBody
				tabIndex={0}
				// Lenis (smooth scroll) captura els wheel del wrapper; això li diu que ignore aquest scroller.
				data-lenis-prevent
				onKeyDown={handleKeyDown}
				dangerouslySetInnerHTML={{
					__html: description ? DOMPurify.sanitize(description, { FORBID_ATTR: ['style'] }) : EMPTY_DESCRIPTION_HTML
				}}
				style={{
					width: '100%',
					minHeight: `${DESCRIPTION_HEIGHT_MIN}px`,
					maxHeight: `${height}px`,
					boxSizing: 'border-box',
					padding: '10px 12px',
					backgroundColor: 'color-mix(in srgb, var(--vscode-input-background) 60%, var(--vscode-panel-background))',
					color: 'color-mix(in srgb, var(--vscode-input-foreground) 85%, transparent)',
					fontSize: '13px',
					fontFamily: "'Inter', var(--vscode-font-family), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
					lineHeight: '1.6',
					overflow: 'auto'
				}}
			/>
			<div
				role="separator"
				aria-label="Resize description"
				onMouseDown={handleResizeStart}
				style={{
					height: '8px',
					backgroundColor: 'var(--vscode-panel-border)',
					cursor: 'ns-resize',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					flexShrink: 0
				}}
			>
				<div
					style={{
						width: '32px',
						height: '3px',
						borderRadius: '2px',
						backgroundColor: 'var(--vscode-descriptionForeground)',
						opacity: 0.6
					}}
				/>
			</div>
		</div>
	);
};

export default ResizableDescription;
