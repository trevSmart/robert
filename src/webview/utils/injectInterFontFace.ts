const interFontUri = window.interFontUri;

if (interFontUri && !interFontUri.includes('__INTER_FONT_URI__')) {
	const style = document.createElement('style');
	style.textContent = `@font-face {
	font-family: 'Inter';
	font-style: normal;
	font-weight: 100 900;
	font-display: swap;
	src: url('${interFontUri.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}') format('woff2-variations');
}`;
	document.head.appendChild(style);
}

// Global one-step font-weight reduction across the whole extension.
// Elements without an explicit font-weight inherit the browser defaults
// (normal text = 400, headings / strong / b = bold = 700). We drop each of
// those a single step so implicit-weight text matches the explicit inline
// weights, which were also reduced by one step. Inline styles win over these
// rules, so any element with its own font-weight keeps its (already reduced) value.
const weightStyle = document.createElement('style');
weightStyle.textContent = `body { font-weight: 300; }
h1, h2, h3, h4, h5, h6, th, strong, b { font-weight: 600; }`;
document.head.appendChild(weightStyle);
