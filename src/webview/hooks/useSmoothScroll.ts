import { useEffect, useRef } from 'react';
import type Lenis from 'lenis';

export function useSmoothScroll(enabled = true) {
	const wrapperRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!enabled) return;

		const wrapper = wrapperRef.current;
		const content = contentRef.current;
		if (!wrapper || !content) return;

		let rafId: number | undefined;
		let lenisInstance: Lenis | null = null;
		let cancelled = false;

		const initLenis = async () => {
			const { default: Lenis } = await import('lenis');
			if (cancelled) return;

			lenisInstance = new Lenis({
				wrapper,
				content,
				duration: 0.2,
				smoothWheel: true,
				touchMultiplier: 1.5,
				lerp: 1
			});

			const raf = (time: number) => {
				lenisInstance?.raf(time);
				rafId = requestAnimationFrame(raf);
			};
			rafId = requestAnimationFrame(raf);
		};

		initLenis();

		return () => {
			cancelled = true;
			if (rafId !== undefined) cancelAnimationFrame(rafId);
			lenisInstance?.destroy();
		};
	}, [enabled]);

	return { wrapperRef, contentRef };
}
