/**
 * Utilities to turn a Rally revision `Description` into structured field changes.
 *
 * Rally stores every change as free text, and the vast majority follows a very regular grammar:
 *   "ITERATION changed from [Sprint 91] to [Sprint 92]"
 *   "BLOCKED REASON changed to [waiting for API]"
 *   "RELEASE added [2026-Q3], MILESTONES added [MI43737: (2026-09-22) IOP Salesforce]"
 *
 * Parsing it lets the detail view paint a diff instead of a sentence. Some revisions do NOT
 * follow it though (DESCRIPTION changes carry raw HTML, "Original story creation", free text),
 * so the parser is deliberately all-or-nothing: unless the whole string is accounted for it
 * reports `structured: false` and the caller falls back to rendering the sanitized HTML.
 */

export type RevisionChangeKind = 'changed' | 'added' | 'removed';

export interface RevisionChange {
	/** Rally field name as written in the description, e.g. 'ITERATION', 'TASK ESTIMATE TOTAL'. */
	field: string;
	kind: RevisionChangeKind;
	/** Previous value; null for `changed to [X]`, `added` and `removed`. */
	from: string | null;
	/** New value, or the added/removed value. Null when Rally wrote an empty `[]`. */
	to: string | null;
}

export interface ParsedRevisionDescription {
	changes: RevisionChange[];
	/** False → the text does not fit the grammar; the caller must fall back to the HTML render. */
	structured: boolean;
}

// Case-sensitive on purpose: Rally writes field names in upper case and verbs in lower case, so
// requiring that shape keeps free-text prose from being mistaken for a field name. Anything that
// doesn't match simply falls back to the HTML render, so being strict here is the safe direction.
const FIELD = '[A-Z][A-Z0-9 _/&.-]*?';
const VERB = '(?:changed from|changed to|added|removed)';

// Rally does not escape brackets, so a value can contain them — "TAGS added [[US Quality] 28/100]"
// or "TASKS added [TA1110817: [AGENTQA] Evaluation]". A value therefore runs lazily up to the last
// `]` that is followed by either the end of the text or the next `FIELD verb` clause, rather than
// stopping at the first one. The same lookahead is why commas inside a value are safe: a comma only
// ends a value when a real clause follows it.
const VALUE = '\\[(.*?)\\]';
const VALUE_END = `(?=\\s*$|,\\s*${FIELD}\\s+${VERB}\\s)`;

// Anchored to the start of the text or to a `, ` separator so field names can't be picked up from
// inside a value.
const CHANGE_RE = new RegExp(`(?:^|,\\s*)(${FIELD})\\s+(?:` + `changed from ${VALUE}(?=\\s+to\\s+\\[)\\s+to\\s+${VALUE}${VALUE_END}` + `|changed to ${VALUE}${VALUE_END}` + `|(added|removed) ${VALUE}${VALUE_END}` + ')', 'g');

const ENTITIES: Record<string, string> = {
	'&amp;': '&',
	'&lt;': '<',
	'&gt;': '>',
	'&quot;': '"',
	'&#39;': "'",
	'&apos;': "'",
	'&nbsp;': ' '
};

function decodeEntities(text: string): string {
	return text.replace(/&(?:amp|lt|gt|quot|#39|apos|nbsp);/gi, entity => ENTITIES[entity.toLowerCase()] ?? entity);
}

// Rich-text fields (DESCRIPTION, NOTES…) carry real HTML inside the brackets. Block boundaries
// become line breaks and list items get a bullet so the text keeps its shape once the tags go.
const LIST_ITEM_RE = /<li[^>]*>/gi;
const BLOCK_BOUNDARY_RE = /<\/(?:p|li|ul|ol|div|h[1-6]|tr|blockquote|table)\s*>|<br\s*\/?>/gi;
const TAG_RE = /<[^>]*>/g;

/**
 * Flatten a bracketed value's markup into readable plain text.
 *
 * Regex-based on purpose: the result is rendered as a React text node, never injected as HTML,
 * so a missed edge case can only show a stray character — it can't execute anything. The
 * fallback path in RevisionDescription still sanitizes with DOMPurify because that one does
 * inject HTML.
 */
export function htmlToPlainText(value: string): string {
	if (!value.includes('<')) {
		return value.trim();
	}

	return (
		value
			.replace(LIST_ITEM_RE, '\n• ')
			.replace(BLOCK_BOUNDARY_RE, '\n')
			.replace(TAG_RE, '')
			.split('\n')
			.map(line => line.replace(/[ \t]+/g, ' ').trim())
			// Drop the empty lines the markup leaves behind (e.g. "</p><p> </p><ol>").
			.filter(line => line !== '' && line !== '•')
			.join('\n')
	);
}

/**
 * Normalize a bracketed value: strip markup and surface Rally's empty `[]` as null so the UI
 * can show an explicit placeholder instead of a blank gap.
 */
function toValue(raw: string | undefined): string | null {
	const text = htmlToPlainText((raw ?? '').trim());
	return text === '' ? null : text;
}

const EMPTY: ParsedRevisionDescription = { changes: [], structured: false };

/**
 * Parse a revision description into its individual field changes.
 * Returns `structured: false` whenever any part of the text is left unexplained.
 */
export function parseRevisionDescription(description: string | null | undefined): ParsedRevisionDescription {
	if (typeof description !== 'string' || description.trim() === '') {
		return EMPTY;
	}

	const text = decodeEntities(description).replace(/\s+/g, ' ').trim();

	const changes: RevisionChange[] = [];
	// Everything the regex did not consume; if what's left is only separators, the parse is total.
	let leftover = '';
	let cursor = 0;

	CHANGE_RE.lastIndex = 0;
	let match: RegExpExecArray | null;
	while ((match = CHANGE_RE.exec(text)) !== null) {
		leftover += text.slice(cursor, match.index);
		cursor = CHANGE_RE.lastIndex;

		const [, field, changedFrom, changedTo, setTo, verb, value] = match;
		if (verb) {
			changes.push({
				field: field.trim(),
				kind: verb as RevisionChangeKind,
				from: null,
				to: toValue(value)
			});
		} else if (setTo !== undefined) {
			changes.push({ field: field.trim(), kind: 'changed', from: null, to: toValue(setTo) });
		} else {
			changes.push({ field: field.trim(), kind: 'changed', from: toValue(changedFrom), to: toValue(changedTo) });
		}
	}
	leftover += text.slice(cursor);

	if (changes.length === 0 || leftover.replace(/[,\s]/g, '') !== '') {
		return { changes: [], structured: false };
	}

	return { changes, structured: true };
}
