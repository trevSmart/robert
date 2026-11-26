import { describe, it, expect } from 'vitest';
import { fieldMatchesFilter, normalizeForFilter } from './issueFieldsFilter';

const field = (name: string, text: string, html?: string) => ({ id: name, name, text, html });

describe('issue fields filter', () => {
	it('matches everything with an empty filter', () => {
		expect(fieldMatchesFilter(field('Talla', 'M'), '')).toBe(true);
	});

	it('matches the name or the value, ignoring case and accents', () => {
		expect(fieldMatchesFilter(field('Tamaño', 'Grande'), normalizeForFilter('TAMANO'))).toBe(true);
		expect(fieldMatchesFilter(field('Talla', 'Mediána'), normalizeForFilter('mediana'))).toBe(true);
		expect(fieldMatchesFilter(field('Talla', 'M'), normalizeForFilter('labels'))).toBe(false);
	});

	it('matches the text of rich-text values but not their markup', () => {
		const rich = field('Notes', '', '<p class="x">Revisar <a href="https://example.com">enllaç</a></p>');
		expect(fieldMatchesFilter(rich, normalizeForFilter('enllac'))).toBe(true);
		expect(fieldMatchesFilter(rich, normalizeForFilter('href'))).toBe(false);
	});
});
