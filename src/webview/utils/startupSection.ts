/**
 * Sections the `robert.startupTab` setting can open on start. Keep in sync with the enum of
 * `robert.startupTab` in package.json. Dev-only (Test) and feature-flagged (Collaboration)
 * tabs are excluded: they may be hidden, which would leave the view on a tab that is not shown.
 */
export const STARTUP_SECTIONS = ['home', 'search', 'portfolio', 'team', 'metrics', 'library'] as const;

export type StartupSection = (typeof STARTUP_SECTIONS)[number];

/** Section to show when the main view starts; anything invalid falls back to Home. */
export function resolveStartupSection(value: unknown): StartupSection {
	const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
	return (STARTUP_SECTIONS as readonly string[]).includes(normalized) ? (normalized as StartupSection) : 'home';
}
