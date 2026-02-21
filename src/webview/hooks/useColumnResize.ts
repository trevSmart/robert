import { useState, useRef } from 'react';

export type ColumnWidths = Record<string, number>;

export function useColumnResize(initialWidths: ColumnWidths) {
	const [columnWidths, setColumnWidths] = useState<ColumnWidths>(initialWidths);
	const resizingRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

	const startResize = (key: string, e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();

		resizingRef.current = { key, startX: e.clientX, startWidth: columnWidths[key] };

		const onMouseMove = (moveEvent: MouseEvent) => {
			const resizing = resizingRef.current;
			if (!resizing) return;
			const delta = moveEvent.clientX - resizing.startX;
			const newWidth = Math.max(40, resizing.startWidth + delta);
			setColumnWidths(prev => ({ ...prev, [resizing.key]: newWidth }));
		};

		const onMouseUp = () => {
			resizingRef.current = null;
			document.removeEventListener('mousemove', onMouseMove);
			document.removeEventListener('mouseup', onMouseUp);
		};

		document.addEventListener('mousemove', onMouseMove);
		document.addEventListener('mouseup', onMouseUp);
	};

	return { columnWidths, startResize };
}
