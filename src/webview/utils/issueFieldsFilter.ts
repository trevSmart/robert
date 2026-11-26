import type { IssueFieldValue } from '../../types/jira';

/** Lower-cased text without diacritics, so «esfuerzo» matches «Esfuerzo» and «tamano» matches «Tamaño». */
export function normalizeForFilter(text: string): string {
	return text
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase();
}

/** Whether the field's name or value contains the filter text (pass it through `normalizeForFilter` first). */
export function fieldMatchesFilter(field: IssueFieldValue, normalizedFilter: string): boolean {
	if (!normalizedFilter) {
		return true;
	}
	const value = field.html ? field.html.replace(/<[^>]*>/g, ' ') : field.text;
	return normalizeForFilter(`${field.name}\n${value}`).includes(normalizedFilter);
}
