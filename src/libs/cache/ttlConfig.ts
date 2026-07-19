/**
 * ttlConfig - Autoritat única de TTL (Time To Live) per entitat de Rally.
 *
 * Cada entitat té un temps de validesa propi. La revalidació és LAZY: les dades
 * només es tornen a demanar quan s'hi interactua i s'han tornat més velles que el
 * seu TTL (no hi ha cap refresc automàtic per timer).
 *
 * `Infinity` = mai caduca després del primer fetch (viu tota la sessió).
 */

export type CacheEntity = 'projects' | 'holidays' | 'users' | 'iterations' | 'velocity' | 'userStories' | 'tasks' | 'defects' | 'teamMembers' | 'currentUser' | 'revisions';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

/**
 * TTL per entitat en mil·lisegons. Valors decidits per producte.
 * `projects` i `currentUser` no canvien durant una sessió → Infinity.
 * La resta d'entitats operatives comparteixen 30 min ("tot lo demés").
 */
export const TTL_MS: Record<CacheEntity, number> = {
	projects: Infinity,
	currentUser: Infinity,
	holidays: 24 * HOUR,
	users: 4 * HOUR,
	iterations: 48 * HOUR,
	velocity: 24 * HOUR,
	// "tot lo demés" = 30 min
	userStories: 30 * MIN,
	tasks: 30 * MIN,
	defects: 30 * MIN,
	teamMembers: 30 * MIN,
	revisions: 30 * MIN
};

/** TTL per defecte d'una entitat. */
export function ttlFor(entity: CacheEntity): number {
	return TTL_MS[entity];
}

/**
 * Retorna true si la dada és stale (cal re-fetchar).
 * - `fetchedAt` absent/0 ⇒ stale (mai carregat), fins i tot amb TTL Infinity.
 * - TTL no finit (Infinity) ⇒ mai stale un cop carregat.
 */
export function isStale(fetchedAt: number, ttl: number, now: number = Date.now()): boolean {
	if (!fetchedAt) {
		return true; // mai carregat → sempre stale
	}
	if (!Number.isFinite(ttl)) {
		return false; // Infinity → mai caduca un cop carregat
	}
	return now - fetchedAt > ttl;
}

/**
 * Serialitza un TTL per enviar-lo al webview via postMessage.
 * `Infinity` no sobreviu a JSON/structuredClone de forma consistent → s'envia `null`,
 * que el frontend tracta com "mai stale".
 */
export function serializeTtl(ttl: number): number | null {
	return Number.isFinite(ttl) ? ttl : null;
}
