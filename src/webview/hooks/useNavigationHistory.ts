import { useCallback, useRef, useState } from 'react';

/**
 * Subconjunt de l'estat de navegació que constitueix una entrada d'historial
 * "estil navegador". Només inclou la navegació principal; les micro-interaccions
 * (data del calendari, pestanya interna d'una user story, terme de cerca) queden
 * fora expressament perquè no generin passos d'historial.
 */
export interface NavKey {
	activeSection: string;
	currentScreen: string;
	selectedIterationId?: string;
	selectedUserStoryId?: string;
	selectedDefectId?: string;
}

export function sameNavKey(a: NavKey | undefined, b: NavKey | undefined): boolean {
	if (!a || !b) return false;
	return a.activeSection === b.activeSection && a.currentScreen === b.currentScreen && a.selectedIterationId === b.selectedIterationId && a.selectedUserStoryId === b.selectedUserStoryId && a.selectedDefectId === b.selectedDefectId;
}

/**
 * Pila d'historial de navegació amb semàntica de navegador: push amb dedup,
 * truncació de la branca "endavant" en navegar a un lloc nou, i back/forward.
 *
 * Les entrades i l'índex es mantenen tant en estat (per exposar
 * `canGoBack`/`canGoForward` de forma reactiva) com en refs (per llegir el valor
 * actual dins dels callbacks sense stale closures).
 */
export function useNavigationHistory() {
	const entriesRef = useRef<NavKey[]>([]);
	const indexRef = useRef<number>(-1);
	const [canGoBack, setCanGoBack] = useState(false);
	const [canGoForward, setCanGoForward] = useState(false);

	const syncFlags = useCallback(() => {
		setCanGoBack(indexRef.current > 0);
		setCanGoForward(indexRef.current < entriesRef.current.length - 1);
	}, []);

	const pushEntry = useCallback(
		(key: NavKey) => {
			const current = entriesRef.current[indexRef.current];
			// Dedup: no apilem si és idèntica a l'entrada actual.
			if (sameNavKey(current, key)) return;

			// Truncació: si estem al mig de la pila (hem fet back), descartem la
			// branca cap endavant abans d'afegir la nova entrada.
			const truncated = entriesRef.current.slice(0, indexRef.current + 1);
			truncated.push(key);
			entriesRef.current = truncated;
			indexRef.current = truncated.length - 1;
			syncFlags();
		},
		[syncFlags]
	);

	// Consulta l'entrada anterior sense moure l'índex, per decidir si una fletxa
	// de retrocés pot delegar a `goBack` en comptes de reconstruir l'estat a mà.
	const peekBack = useCallback((): NavKey | null => {
		if (indexRef.current <= 0) return null;
		return entriesRef.current[indexRef.current - 1];
	}, []);

	const goBack = useCallback((): NavKey | null => {
		if (indexRef.current <= 0) return null;
		indexRef.current -= 1;
		syncFlags();
		return entriesRef.current[indexRef.current];
	}, [syncFlags]);

	const goForward = useCallback((): NavKey | null => {
		if (indexRef.current >= entriesRef.current.length - 1) return null;
		indexRef.current += 1;
		syncFlags();
		return entriesRef.current[indexRef.current];
	}, [syncFlags]);

	return { pushEntry, peekBack, goBack, goForward, canGoBack, canGoForward };
}
