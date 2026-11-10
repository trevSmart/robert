/**
 * VS Code injects its theme into every webview as `--vscode-*` CSS custom
 * properties plus a `vscode-dark` / `vscode-light` body class. Robert's React UI
 * relies on both, so the standalone host provides equivalent palettes (based on
 * VS Code's "Dark Modern" and "Light Modern" themes) and injects them itself.
 */
export type ThemeKind = 'dark' | 'light';

const FONT_VARS: Record<string, string> = {
	'--vscode-font-family': '-apple-system, BlinkMacSystemFont, "Segoe WPC", "Segoe UI", system-ui, "Ubuntu", "Droid Sans", sans-serif',
	'--vscode-font-size': '13px',
	'--vscode-font-weight': 'normal',
	'--vscode-editor-font-family': 'Menlo, Monaco, Consolas, "Courier New", monospace',
	'--vscode-editor-font-size': '12px'
};

const DARK: Record<string, string> = {
	'--vscode-foreground': '#cccccc',
	'--vscode-descriptionForeground': '#9d9d9d',
	'--vscode-errorForeground': '#f85149',
	'--vscode-focusBorder': '#0078d4',
	'--vscode-editor-background': '#1f1f1f',
	'--vscode-editor-foreground': '#cccccc',
	'--vscode-sideBar-background': '#181818',
	'--vscode-panel-background': '#181818',
	'--vscode-panel-border': '#2b2b2b',
	'--vscode-widget-border': '#313131',
	'--vscode-badge-background': '#616161',
	'--vscode-badge-foreground': '#f8f8f8',
	'--vscode-button-background': '#0078d4',
	'--vscode-button-foreground': '#ffffff',
	'--vscode-button-hoverBackground': '#026ec1',
	'--vscode-button-secondaryBackground': '#313131',
	'--vscode-button-secondaryForeground': '#cccccc',
	'--vscode-charts-foreground': '#cccccc',
	'--vscode-charts-lines': '#cccccc80',
	'--vscode-charts-blue': '#3794ff',
	'--vscode-charts-green': '#89d185',
	'--vscode-charts-orange': '#d18616',
	'--vscode-charts-red': '#f14c4c',
	'--vscode-charts-yellow': '#cca700',
	'--vscode-charts-purple': '#b180d7',
	'--vscode-dropdown-background': '#313131',
	'--vscode-dropdown-border': '#3c3c3c',
	'--vscode-dropdown-foreground': '#cccccc',
	'--vscode-input-background': '#313131',
	'--vscode-input-border': '#3c3c3c',
	'--vscode-input-foreground': '#cccccc',
	'--vscode-input-placeholderForeground': '#989898',
	'--vscode-inputValidation-errorBackground': '#5a1d1d',
	'--vscode-inputValidation-errorBorder': '#be1100',
	'--vscode-inputValidation-errorForeground': '#cccccc',
	'--vscode-inputValidation-infoBackground': '#063b49',
	'--vscode-inputValidation-infoBorder': '#007acc',
	'--vscode-inputValidation-warningBackground': '#352a05',
	'--vscode-inputValidation-warningBorder': '#b89500',
	'--vscode-list-activeSelectionBackground': '#04395e',
	'--vscode-list-activeSelectionForeground': '#ffffff',
	'--vscode-list-focusBackground': '#04395e',
	'--vscode-list-focusForeground': '#ffffff',
	'--vscode-list-hoverBackground': '#2a2d2e',
	'--vscode-notificationCenterHeader-foreground': '#cccccc',
	'--vscode-progressBar-background': '#0078d4',
	'--vscode-quickInput-background': '#222222',
	'--vscode-quickInput-foreground': '#cccccc',
	'--vscode-scrollbarSlider-background': '#79797966',
	'--vscode-scrollbarSlider-hoverBackground': '#646464b3',
	'--vscode-scrollbarSlider-activeBackground': '#bfbfbf66',
	'--vscode-tab-activeBackground': '#1f1f1f',
	'--vscode-tab-activeBorder': '#1f1f1f',
	'--vscode-tab-activeForeground': '#ffffff',
	'--vscode-tab-border': '#2b2b2b',
	'--vscode-tab-inactiveBackground': '#181818',
	'--vscode-tab-inactiveForeground': '#9d9d9d',
	'--vscode-textBlockQuote-background': '#2b2b2b',
	'--vscode-textLink-foreground': '#4daafc',
	'--vscode-titleBar-activeBackground': '#181818',
	'--vscode-titleBar-activeForeground': '#cccccc',
	'--vscode-toolbar-activeBackground': '#63666750',
	'--vscode-toolbar-hoverBackground': '#5a5d5e50'
};

const LIGHT: Record<string, string> = {
	'--vscode-foreground': '#3b3b3b',
	'--vscode-descriptionForeground': '#3b3b3b',
	'--vscode-errorForeground': '#f85149',
	'--vscode-focusBorder': '#005fb8',
	'--vscode-editor-background': '#ffffff',
	'--vscode-editor-foreground': '#3b3b3b',
	'--vscode-sideBar-background': '#f8f8f8',
	'--vscode-panel-background': '#f8f8f8',
	'--vscode-panel-border': '#e5e5e5',
	'--vscode-widget-border': '#e5e5e5',
	'--vscode-badge-background': '#cccccc',
	'--vscode-badge-foreground': '#3b3b3b',
	'--vscode-button-background': '#005fb8',
	'--vscode-button-foreground': '#ffffff',
	'--vscode-button-hoverBackground': '#0258a8',
	'--vscode-button-secondaryBackground': '#e5e5e5',
	'--vscode-button-secondaryForeground': '#3b3b3b',
	'--vscode-charts-foreground': '#3b3b3b',
	'--vscode-charts-lines': '#3b3b3b80',
	'--vscode-charts-blue': '#1a85ff',
	'--vscode-charts-green': '#388a34',
	'--vscode-charts-orange': '#d18616',
	'--vscode-charts-red': '#e51400',
	'--vscode-charts-yellow': '#bf8803',
	'--vscode-charts-purple': '#652d90',
	'--vscode-dropdown-background': '#ffffff',
	'--vscode-dropdown-border': '#cecece',
	'--vscode-dropdown-foreground': '#3b3b3b',
	'--vscode-input-background': '#ffffff',
	'--vscode-input-border': '#cecece',
	'--vscode-input-foreground': '#3b3b3b',
	'--vscode-input-placeholderForeground': '#767676',
	'--vscode-inputValidation-errorBackground': '#f2dede',
	'--vscode-inputValidation-errorBorder': '#be1100',
	'--vscode-inputValidation-errorForeground': '#3b3b3b',
	'--vscode-inputValidation-infoBackground': '#d6ecf2',
	'--vscode-inputValidation-infoBorder': '#1a85ff',
	'--vscode-inputValidation-warningBackground': '#f6f5d2',
	'--vscode-inputValidation-warningBorder': '#bf8803',
	'--vscode-list-activeSelectionBackground': '#e8e8e8',
	'--vscode-list-activeSelectionForeground': '#000000',
	'--vscode-list-focusBackground': '#e8e8e8',
	'--vscode-list-focusForeground': '#000000',
	'--vscode-list-hoverBackground': '#f2f2f2',
	'--vscode-notificationCenterHeader-foreground': '#3b3b3b',
	'--vscode-progressBar-background': '#005fb8',
	'--vscode-quickInput-background': '#f8f8f8',
	'--vscode-quickInput-foreground': '#3b3b3b',
	'--vscode-scrollbarSlider-background': '#64646466',
	'--vscode-scrollbarSlider-hoverBackground': '#646464b3',
	'--vscode-scrollbarSlider-activeBackground': '#00000099',
	'--vscode-tab-activeBackground': '#ffffff',
	'--vscode-tab-activeBorder': '#f8f8f8',
	'--vscode-tab-activeForeground': '#3b3b3b',
	'--vscode-tab-border': '#e5e5e5',
	'--vscode-tab-inactiveBackground': '#f8f8f8',
	'--vscode-tab-inactiveForeground': '#868686',
	'--vscode-textBlockQuote-background': '#f8f8f8',
	'--vscode-textLink-foreground': '#005fb8',
	'--vscode-titleBar-activeBackground': '#f8f8f8',
	'--vscode-titleBar-activeForeground': '#1e1e1e',
	'--vscode-toolbar-activeBackground': '#a6a6a650',
	'--vscode-toolbar-hoverBackground': '#b8b8b850'
};

export const THEME_STYLE_ELEMENT_ID = '_robertStandaloneTheme';

export function getThemeBackground(kind: ThemeKind): string {
	return (kind === 'dark' ? DARK : LIGHT)['--vscode-editor-background'];
}

/** CSS text with the theme variables plus VS Code's default webview styles. */
export function buildThemeCss(kind: ThemeKind): string {
	const vars = { ...FONT_VARS, ...(kind === 'dark' ? DARK : LIGHT) };
	const declarations = Object.entries(vars)
		.map(([name, value]) => `${name}: ${value};`)
		.join(' ');
	return [
		`html { ${declarations} color-scheme: ${kind}; background-color: var(--vscode-editor-background); }`,
		'body { background-color: transparent; color: var(--vscode-foreground); font-family: var(--vscode-font-family); font-weight: var(--vscode-font-weight); font-size: var(--vscode-font-size); margin: 0; }',
		'a { color: var(--vscode-textLink-foreground); }',
		'::-webkit-scrollbar { width: 10px; height: 10px; }',
		'::-webkit-scrollbar-corner { background-color: transparent; }',
		'::-webkit-scrollbar-thumb { background-color: var(--vscode-scrollbarSlider-background); }',
		'::-webkit-scrollbar-thumb:hover { background-color: var(--vscode-scrollbarSlider-hoverBackground); }',
		'::-webkit-scrollbar-thumb:active { background-color: var(--vscode-scrollbarSlider-activeBackground); }'
	].join('\n');
}

/**
 * Injects the theme stylesheet and the body theme class into a webview
 * document, the way VS Code does before handing the HTML to the webview.
 * The style goes first in <head> so the app's own CSS still wins.
 */
export function injectTheme(html: string, kind: ThemeKind): string {
	const style = `<style id="${THEME_STYLE_ELEMENT_ID}">${buildThemeCss(kind)}</style>`;
	const bodyClass = `vscode-${kind}`;

	let result = /<head(\s[^>]*)?>/i.test(html) ? html.replace(/<head(\s[^>]*)?>/i, match => `${match}${style}`) : `${style}${html}`;

	result = result.replace(/<body(\s[^>]*)?>/i, (match, attrs: string | undefined) => {
		const attributes = attrs ?? '';
		const themeAttr = ` data-vscode-theme-kind="${bodyClass}"`;
		if (/\sclass\s*=\s*"/i.test(attributes)) {
			return `<body${attributes.replace(/\sclass\s*=\s*"/i, m => `${m}${bodyClass} `)}${themeAttr}>`;
		}
		return `<body class="${bodyClass}"${attributes}${themeAttr}>`;
	});
	return result;
}

/** Script used to switch the theme of an already-loaded document (OS theme change). */
export function buildThemeSwitchScript(kind: ThemeKind): string {
	const css = JSON.stringify(buildThemeCss(kind));
	const id = JSON.stringify(THEME_STYLE_ELEMENT_ID);
	const cls = JSON.stringify(`vscode-${kind}`);
	return `(() => {
		let style = document.getElementById(${id});
		if (!style) { style = document.createElement('style'); style.id = ${id}; document.head.prepend(style); }
		style.textContent = ${css};
		const body = document.body;
		if (body) {
			body.classList.remove('vscode-dark', 'vscode-light');
			body.classList.add(${cls});
			body.setAttribute('data-vscode-theme-kind', ${cls});
		}
	})();`;
}
