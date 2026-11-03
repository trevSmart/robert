/**
 * Minimal Atlassian Document Format (ADF) -> HTML converter.
 *
 * Jira Cloud REST v3 returns rich text as an ADF document tree, but the webview renders HTML
 * (sanitised downstream with DOMPurify). This walks the node tree and emits the equivalent
 * markup for the node types Jira actually produces in descriptions and comments.
 *
 * Unknown node types degrade to their rendered children rather than being dropped, so new or
 * exotic content still shows its text.
 */

interface AdfNode {
	type?: string;
	text?: string;
	content?: AdfNode[];
	marks?: Array<{ type: string; attrs?: Record<string, any> }>;
	attrs?: Record<string, any>;
}

function escapeHtml(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Only allow links we can safely render; anything else becomes plain text. */
function safeHref(href: unknown): string | null {
	if (typeof href !== 'string') {
		return null;
	}
	return /^(https?:|mailto:)/i.test(href.trim()) ? escapeHtml(href.trim()) : null;
}

function applyMarks(text: string, marks: AdfNode['marks']): string {
	if (!marks?.length) {
		return text;
	}

	return marks.reduce((acc, mark) => {
		switch (mark.type) {
			case 'strong':
				return `<strong>${acc}</strong>`;
			case 'em':
				return `<em>${acc}</em>`;
			case 'code':
				return `<code>${acc}</code>`;
			case 'strike':
				return `<s>${acc}</s>`;
			case 'underline':
				return `<u>${acc}</u>`;
			case 'link': {
				const href = safeHref(mark.attrs?.href);
				return href ? `<a href="${href}">${acc}</a>` : acc;
			}
			default:
				return acc;
		}
	}, text);
}

function renderChildren(node: AdfNode): string {
	return (node.content ?? []).map(renderNode).join('');
}

function renderNode(node: AdfNode): string {
	switch (node.type) {
		case 'text':
			return applyMarks(escapeHtml(node.text ?? ''), node.marks);

		case 'paragraph': {
			const inner = renderChildren(node);
			return inner ? `<p>${inner}</p>` : '';
		}

		case 'heading': {
			const level = Math.min(Math.max(Number(node.attrs?.level) || 1, 1), 6);
			return `<h${level}>${renderChildren(node)}</h${level}>`;
		}

		case 'bulletList':
			return `<ul>${renderChildren(node)}</ul>`;

		case 'orderedList':
			return `<ol>${renderChildren(node)}</ol>`;

		case 'listItem':
			return `<li>${renderChildren(node)}</li>`;

		case 'hardBreak':
			return '<br />';

		case 'rule':
			return '<hr />';

		case 'blockquote':
			return `<blockquote>${renderChildren(node)}</blockquote>`;

		case 'codeBlock': {
			// Code block children are plain text nodes; marks must not apply inside <pre>.
			const code = (node.content ?? []).map(child => escapeHtml(child.text ?? '')).join('');
			const language = typeof node.attrs?.language === 'string' ? ` class="language-${escapeHtml(node.attrs.language)}"` : '';
			return `<pre><code${language}>${code}</code></pre>`;
		}

		case 'panel':
			return `<div class="adf-panel adf-panel-${escapeHtml(String(node.attrs?.panelType ?? 'info'))}">${renderChildren(node)}</div>`;

		case 'mediaSingle':
		case 'mediaGroup':
			return `<div class="adf-media">${renderChildren(node)}</div>`;

		case 'media': {
			// Media points at an attachment ID, not a URL; the alt text keeps it meaningful.
			const alt = escapeHtml(String(node.attrs?.alt ?? node.attrs?.id ?? 'attachment'));
			return `<span class="adf-media-item">[${alt}]</span>`;
		}

		case 'mention':
			return `<span class="adf-mention">@${escapeHtml(String(node.attrs?.text ?? node.attrs?.displayName ?? 'unknown'))}</span>`;

		case 'emoji':
			return escapeHtml(String(node.attrs?.text ?? node.attrs?.shortName ?? ''));

		case 'inlineCard': {
			const href = safeHref(node.attrs?.url);
			return href ? `<a href="${href}">${href}</a>` : '';
		}

		case 'table':
			return `<table>${renderChildren(node)}</table>`;
		case 'tableRow':
			return `<tr>${renderChildren(node)}</tr>`;
		case 'tableHeader':
			return `<th>${renderChildren(node)}</th>`;
		case 'tableCell':
			return `<td>${renderChildren(node)}</td>`;

		default:
			// Unknown node: keep the content rather than losing it.
			return renderChildren(node);
	}
}

/**
 * Convert an ADF document to an HTML string.
 * Accepts plain strings too (some Jira endpoints return legacy wiki/plain text) and returns
 * null for empty input so callers can keep the `description: string | null` contract.
 */
export function adfToHtml(doc: unknown): string | null {
	if (doc == null) {
		return null;
	}

	if (typeof doc === 'string') {
		const trimmed = doc.trim();
		return trimmed ? `<p>${escapeHtml(trimmed)}</p>` : null;
	}

	if (typeof doc !== 'object') {
		return null;
	}

	const html = renderNode(doc as AdfNode).trim();
	return html || null;
}

/** Flatten an ADF document to plain text (used for previews and search snippets). */
export function adfToPlainText(doc: unknown): string {
	if (doc == null) {
		return '';
	}
	if (typeof doc === 'string') {
		return doc;
	}
	if (typeof doc !== 'object') {
		return '';
	}

	const walk = (node: AdfNode): string => {
		if (node.type === 'text') {
			return node.text ?? '';
		}
		if (node.type === 'hardBreak') {
			return '\n';
		}
		const inner = (node.content ?? []).map(walk).join('');
		return node.type === 'paragraph' || node.type === 'heading' || node.type === 'listItem' ? `${inner}\n` : inner;
	};

	return walk(doc as AdfNode).trim();
}
