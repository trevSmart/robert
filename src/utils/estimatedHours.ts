/**
 * Validation rules for a user story's estimated hours, shared by the webview
 * (inline editor) and the extension host (before calling the provider API).
 * Pure module: no vscode / Node imports, so Vite can bundle it into the webview.
 */

/** Upper bound accepted for an estimate, to catch typos (e.g. 4000 instead of 40). */
export const MAX_ESTIMATED_HOURS = 1000;

export type EstimatedHoursResult = { ok: true; value: number } | { ok: false; error: string };

/** Checks a numeric estimate. */
export function validateEstimatedHours(value: number): EstimatedHoursResult {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		return { ok: false, error: 'Estimated hours must be a number' };
	}
	if (value < 0) {
		return { ok: false, error: 'Estimated hours cannot be negative' };
	}
	if (value > MAX_ESTIMATED_HOURS) {
		return { ok: false, error: `Estimated hours cannot exceed ${MAX_ESTIMATED_HOURS}` };
	}
	return { ok: true, value };
}

/**
 * Parses what the user typed. Accepts a decimal point or comma ("1.5", "1,5")
 * and an optional trailing "h" ("8h").
 */
export function parseEstimatedHours(input: string): EstimatedHoursResult {
	const text = input.trim().replace(/h$/i, '').trim().replace(',', '.');
	if (text === '') {
		return { ok: false, error: 'Enter a number of hours' };
	}
	if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(text)) {
		return { ok: false, error: 'Estimated hours must be a number' };
	}
	return validateEstimatedHours(Number(text));
}
