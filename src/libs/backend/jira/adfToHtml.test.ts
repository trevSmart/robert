import { describe, it, expect } from 'vitest';
import { adfToHtml, adfToPlainText } from './adfToHtml';

const doc = (...content: unknown[]) => ({ type: 'doc', version: 1, content });
const text = (value: string, marks?: unknown[]) => ({ type: 'text', text: value, ...(marks ? { marks } : {}) });
const paragraph = (...content: unknown[]) => ({ type: 'paragraph', content });

describe('adfToHtml', () => {
	it('returns null for empty or missing documents', () => {
		expect(adfToHtml(null)).toBeNull();
		expect(adfToHtml(undefined)).toBeNull();
		expect(adfToHtml(doc())).toBeNull();
		expect(adfToHtml('   ')).toBeNull();
	});

	it('renders paragraphs', () => {
		expect(adfToHtml(doc(paragraph(text('Hello world'))))).toBe('<p>Hello world</p>');
	});

	it('applies inline marks', () => {
		const html = adfToHtml(doc(paragraph(text('bold', [{ type: 'strong' }]), text('/'), text('italic', [{ type: 'em' }]))));
		expect(html).toBe('<p><strong>bold</strong>/<em>italic</em></p>');
	});

	it('renders headings at the requested level and clamps out-of-range levels', () => {
		expect(adfToHtml(doc({ type: 'heading', attrs: { level: 3 }, content: [text('Title')] }))).toBe('<h3>Title</h3>');
		expect(adfToHtml(doc({ type: 'heading', attrs: { level: 99 }, content: [text('Title')] }))).toBe('<h6>Title</h6>');
	});

	it('renders bullet and ordered lists', () => {
		const list = { type: 'bulletList', content: [{ type: 'listItem', content: [paragraph(text('one'))] }, { type: 'listItem', content: [paragraph(text('two'))] }] };
		expect(adfToHtml(doc(list))).toBe('<ul><li><p>one</p></li><li><p>two</p></li></ul>');
	});

	it('renders code blocks without applying marks inside', () => {
		const block = { type: 'codeBlock', attrs: { language: 'ts' }, content: [text('const a = 1 < 2;')] };
		expect(adfToHtml(doc(block))).toBe('<pre><code class="language-ts">const a = 1 &lt; 2;</code></pre>');
	});

	it('escapes HTML so raw markup in Jira content cannot inject nodes', () => {
		expect(adfToHtml(doc(paragraph(text('<img src=x onerror=alert(1)>'))))).toBe('<p>&lt;img src=x onerror=alert(1)&gt;</p>');
	});

	it('renders http(s) and mailto links but drops dangerous schemes', () => {
		const link = (href: string) => adfToHtml(doc(paragraph(text('click', [{ type: 'link', attrs: { href } }]))));

		expect(link('https://example.com')).toBe('<p><a href="https://example.com">click</a></p>');
		expect(link('mailto:a@b.com')).toBe('<p><a href="mailto:a@b.com">click</a></p>');
		// javascript: URLs must not survive as an href.
		expect(link('javascript:alert(1)')).toBe('<p>click</p>');
	});

	it('keeps the content of unknown node types instead of dropping it', () => {
		expect(adfToHtml(doc({ type: 'someFutureNode', content: [paragraph(text('still here'))] }))).toBe('<p>still here</p>');
	});

	it('wraps plain strings, for endpoints that return legacy text', () => {
		expect(adfToHtml('just text')).toBe('<p>just text</p>');
	});

	it('renders tables and mentions', () => {
		const table = { type: 'table', content: [{ type: 'tableRow', content: [{ type: 'tableCell', content: [paragraph(text('cell'))] }] }] };
		expect(adfToHtml(doc(table))).toBe('<table><tr><td><p>cell</p></td></tr></table>');
		expect(adfToHtml(doc(paragraph({ type: 'mention', attrs: { text: 'Ada' } })))).toBe('<p><span class="adf-mention">@Ada</span></p>');
	});
});

describe('adfToPlainText', () => {
	it('flattens a document to text', () => {
		expect(adfToPlainText(doc(paragraph(text('one')), paragraph(text('two'))))).toBe('one\ntwo');
	});

	it('handles empty input', () => {
		expect(adfToPlainText(null)).toBe('');
		expect(adfToPlainText(doc())).toBe('');
	});
});
