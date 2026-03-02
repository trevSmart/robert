/**
 * Robert theme colors – semantic tokens backed by Radix Colors (--robert-*).
 * Theme class (robert-light-theme / robert-dark-theme) is applied to the document by the extension from VS Code activeColorTheme.
 */

export const themeColors = {
	// ============================================================================
	// FOREGROUND & BACKGROUND
	// ============================================================================
	foreground: 'var(--robert-foreground)',
	background: 'var(--robert-background)',
	descriptionForeground: 'var(--robert-descriptionForeground)',

	// ============================================================================
	// PANEL & CONTAINER BACKGROUNDS
	// ============================================================================
	panelBackground: 'var(--robert-panelBackground)',
	panelBorder: 'var(--robert-panelBorder)',

	// ============================================================================
	// TEXT COLORS (HIERARCHY)
	// ============================================================================
	textPrimary: 'var(--robert-textPrimary)',
	textSecondary: 'var(--robert-textSecondary)',
	textTertiary: 'var(--robert-textTertiary)',

	// ============================================================================
	// INTERACTIVE ELEMENTS
	// ============================================================================
	buttonBackground: 'var(--robert-buttonBackground)',
	buttonForeground: 'var(--robert-buttonForeground)',
	buttonSecondaryBackground: 'var(--robert-buttonSecondaryBackground)',
	buttonSecondaryForeground: 'var(--robert-buttonSecondaryForeground)',
	buttonHoverBackground: 'var(--robert-buttonHoverBackground)',

	// ============================================================================
	// INPUT & FORM ELEMENTS
	// ============================================================================
	inputBackground: 'var(--robert-inputBackground)',
	inputForeground: 'var(--robert-inputForeground)',
	inputBorder: 'var(--robert-inputBorder)',
	inputPlaceholderForeground: 'var(--robert-inputPlaceholderForeground)',

	// ============================================================================
	// TABS & NAVIGATION
	// ============================================================================
	tabActiveBackground: 'var(--robert-tabActiveBackground)',
	tabActiveForeground: 'var(--robert-tabActiveForeground)',
	tabInactiveForeground: 'var(--robert-tabInactiveForeground)',
	tabBorder: 'var(--robert-tabBorder)',
	tabActiveBorder: 'var(--robert-tabActiveBorder)',

	// ============================================================================
	// STATUS & STATES
	// ============================================================================
	progressBarBackground: 'var(--robert-progressBarBackground)',

	listActiveSelectionBackground: 'var(--robert-listActiveSelectionBackground)',
	listActiveSelectionForeground: 'var(--robert-listActiveSelectionForeground)',
	listHoverBackground: 'var(--robert-listHoverBackground)',
	listFocusBackground: 'var(--robert-listFocusBackground)',
	listFocusForeground: 'var(--robert-listFocusForeground)',

	// ============================================================================
	// VALIDATION & NOTIFICATIONS
	// ============================================================================
	errorForeground: 'var(--robert-errorForeground)',
	errorBackground: 'var(--robert-errorBackground)',
	errorBorder: 'var(--robert-errorBorder)',

	warningForeground: 'var(--robert-warningForeground)',
	warningBackground: 'var(--robert-warningBackground)',
	warningBorder: 'var(--robert-warningBorder)',

	infoForeground: 'var(--robert-infoForeground)',
	infoBackground: 'var(--robert-infoBackground)',
	infoBorder: 'var(--robert-infoBorder)',

	successForeground: 'var(--robert-successForeground)',
	successBackground: 'var(--robert-successBackground)',
	successBorder: 'var(--robert-successBorder)',

	// ============================================================================
	// TITLE BAR
	// ============================================================================
	titleBarActiveBackground: 'var(--robert-titleBarActiveBackground)',
	titleBarActiveForeground: 'var(--robert-titleBarActiveForeground)',

	// ============================================================================
	// TOOLBAR & HOVER STATES
	// ============================================================================
	toolbarHoverBackground: 'var(--robert-toolbarHoverBackground)',
	toolbarActiveBackground: 'var(--robert-toolbarActiveBackground)',

	// ============================================================================
	// FONT
	// ============================================================================
	fontFamily: 'var(--robert-fontFamily)',

	focusBorder: 'var(--robert-focusBorder)',
	quickInputBackground: 'var(--robert-quickInputBackground)',
	quickInputForeground: 'var(--robert-quickInputForeground)'
};

/**
 * Semantic color mappings - use these for specific UI purposes
 */
export const semanticColors = {
	sectionBackground: themeColors.panelBackground,
	sectionBorder: themeColors.panelBorder,
	sectionTitleColor: themeColors.textPrimary,
	sectionDescriptionColor: themeColors.descriptionForeground,
	formBackground: themeColors.background,
	formSectionBackground: themeColors.panelBackground,
	dividerColor: themeColors.panelBorder,
	headingColor: themeColors.textPrimary,
	bodyColor: themeColors.textPrimary,
	mutedColor: themeColors.descriptionForeground
};

/**
 * Generate RGBA color from CSS variable for transparency effects
 */
export const createOpacityVariant = (variable: string, opacity: number): string => {
	return `${variable} / ${opacity}`;
};

/**
 * Helper for creating hover/focus states with transparency
 */
export const createHoverState = (color: string, opacity: number = 0.1): string => {
	return `color-mix(in srgb, ${color} ${opacity * 100}%, transparent)`;
};

/**
 * Detect if current theme is light (Robert theme class is set by extension from VS Code theme).
 */
export const isLightTheme = (): boolean => {
	const el = document.body;
	return el.classList.contains('robert-light-theme');
};

/**
 * Get adaptive input border color based on theme
 */
export const getInputBorderColor = (): string => {
	return themeColors.inputBorder;
};
