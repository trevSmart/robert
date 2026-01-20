/**
 * VS Code Theme Colors for Robert Extension
 * Maps hardcoded colors to VS Code CSS custom properties
 * Reference: https://code.visualstudio.com/api/references/theme-color
 */

export const themeColors = {
	// ============================================================================
	// FOREGROUND & BACKGROUND
	// ============================================================================
	foreground: 'var(--vscode-foreground)',
	background: 'var(--vscode-editor-background)',
	descriptionForeground: 'var(--vscode-descriptionForeground)',

	// ============================================================================
	// PANEL & CONTAINER BACKGROUNDS
	// ============================================================================
	// Panel (sections, cards, containers)
	panelBackground: 'var(--vscode-input-background)',
	panelBorder: 'var(--vscode-panel-border)',

	// ============================================================================
	// TEXT COLORS (HIERARCHY)
	// ============================================================================
	// Primary text (settings titles, section headers)
	textPrimary: 'var(--vscode-foreground)',
	// Secondary text (descriptions, secondary info)
	textSecondary: 'var(--vscode-descriptionForeground)',
	// Tertiary text (less important, disabled states)
	textTertiary: 'var(--vscode-tab-inactiveForeground)',

	// ============================================================================
	// INTERACTIVE ELEMENTS
	// ============================================================================
	// Buttons
	buttonBackground: 'var(--vscode-button-background)',
	buttonForeground: 'var(--vscode-button-foreground)',
	buttonSecondaryBackground: 'var(--vscode-button-secondaryBackground)',
	buttonSecondaryForeground: 'var(--vscode-button-secondaryForeground)',
	buttonHoverBackground: 'var(--vscode-button-hoverBackground)',

	// ============================================================================
	// INPUT & FORM ELEMENTS
	// ============================================================================
	inputBackground: 'var(--vscode-input-background)',
	inputForeground: 'var(--vscode-foreground)',
	inputBorder: 'var(--vscode-input-border)',
	inputPlaceholderForeground: 'var(--vscode-input-placeholderForeground)',

	// ============================================================================
	// TABS & NAVIGATION
	// ============================================================================
	tabActiveBackground: 'var(--vscode-tab-activeBackground)',
	tabActiveForeground: 'var(--vscode-tab-activeForeground)',
	tabInactiveBackground: 'var(--vscode-tab-inactiveBackground)',
	tabInactiveForeground: 'var(--vscode-tab-inactiveForeground)',
	tabBorder: 'var(--vscode-tab-border)',
	tabActiveBorder: 'var(--vscode-tab-activeBorder)',

	// ============================================================================
	// STATUS & STATES
	// ============================================================================
	// Progress bar / Active indicator
	progressBarBackground: 'var(--vscode-progressBar-background)',

	// List / Selection
	listActiveSelectionBackground: 'var(--vscode-list-activeSelectionBackground)',
	listActiveSelectionForeground: 'var(--vscode-list-activeSelectionForeground)',
	listHoverBackground: 'var(--vscode-list-hoverBackground)',
	listFocusBackground: 'var(--vscode-list-focusBackground)',
	listFocusForeground: 'var(--vscode-list-focusForeground)',

	// ============================================================================
	// VALIDATION & NOTIFICATIONS
	// ============================================================================
	// Error
	errorForeground: 'var(--vscode-errorForeground)',
	errorBackground: 'var(--vscode-inputValidation-errorBackground)',
	errorBorder: 'var(--vscode-inputValidation-errorBorder)',

	// Warning
	warningForeground: 'var(--vscode-notificationCenterHeader-foreground)',
	warningBackground: 'var(--vscode-inputValidation-warningBackground)',
	warningBorder: 'var(--vscode-inputValidation-warningBorder)',

	// Info
	infoForeground: 'var(--vscode-notificationCenterHeader-foreground)',
	infoBackground: 'var(--vscode-inputValidation-infoBackground)',
	infoBorder: 'var(--vscode-inputValidation-infoBorder)',

	// Success (use info color as fallback since success not in official theme)
	successForeground: 'var(--vscode-notificationCenterHeader-foreground)',
	successBackground: 'var(--vscode-inputValidation-infoBackground)',
	successBorder: 'var(--vscode-inputValidation-infoBorder)',

	// ============================================================================
	// TITLE BAR
	// ============================================================================
	titleBarActiveBackground: 'var(--vscode-titleBar-activeBackground)',
	titleBarActiveForeground: 'var(--vscode-titleBar-activeForeground)',

	// ============================================================================
	// TOOLBAR & HOVER STATES
	// ============================================================================
	toolbarHoverBackground: 'var(--vscode-toolbar-hoverBackground)',
	toolbarActiveBackground: 'var(--vscode-toolbar-activeBackground)',

	// ============================================================================
	// FONT
	// ============================================================================
	fontFamily: 'var(--vscode-font-family)'
};

/**
 * Semantic color mappings - use these for specific UI purposes
 */
export const semanticColors = {
	// Section/Card containers
	sectionBackground: themeColors.panelBackground,
	sectionBorder: themeColors.panelBorder,

	// Section titles and labels
	sectionTitleColor: themeColors.textPrimary,

	// Secondary text in sections
	sectionDescriptionColor: themeColors.descriptionForeground,

	// Form backgrounds
	formBackground: themeColors.background,
	formSectionBackground: themeColors.panelBackground,

	// Dividers
	dividerColor: themeColors.panelBorder,

	// Text hierarchy
	headingColor: themeColors.textPrimary,
	bodyColor: themeColors.textPrimary,
	mutedColor: themeColors.descriptionForeground
};

/**
 * Generate RGBA color from CSS variable for transparency effects
 * Usage: `background-color: rgba-var(--vscode-foreground, 0.1)`
 *
 * Note: This is a CSS function that can be used in template literals
 * For true dynamic RGBA with opacity, use the opacity helper instead
 */
export const createOpacityVariant = (variable: string, opacity: number): string => {
	// This creates a CSS-compatible string for use in styled-components
	// The actual color conversion happens in the browser
	return `${variable} / ${opacity}`;
};

/**
 * Helper for creating hover/focus states with transparency
 */
export const createHoverState = (color: string, opacity: number = 0.1): string => {
	return `color-mix(in srgb, ${color} ${opacity * 100}%, transparent)`;
};

/**
 * Detect if current theme is light or dark
 */
export const isLightTheme = (): boolean => {
	const body = document.body;
	return body.classList.contains('vscode-light') || body.getAttribute('data-vscode-theme-kind') === 'light';
};

/**
 * Get adaptive input border color based on theme
 */
export const getInputBorderColor = (): string => {
	return isLightTheme() ? '#cccccc' : themeColors.inputBorder;
};
