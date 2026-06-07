const interFontUri = window.interFontUri;

if (interFontUri && !interFontUri.includes('__INTER_FONT_URI__')) {
	const style = document.createElement('style');
	style.textContent = `@font-face {
	font-family: 'Inter';
	font-style: normal;
	font-weight: 100 900;
	font-display: swap;
	src: url('${interFontUri.replace(/'/g, "\\'")}') format('woff2-variations');
}`;
	document.head.appendChild(style);
}
