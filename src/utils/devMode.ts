import * as path from 'node:path';
import * as vscode from 'vscode';
import { SettingsManager } from '../SettingsManager';

function isDebugModeSettingEnabled(): boolean {
	return SettingsManager.getInstance().getSetting('debugMode');
}

let extensionContext: vscode.ExtensionContext | undefined;

export function initDevMode(context: vscode.ExtensionContext): void {
	extensionContext = context;
}

function isPackagedExtensionPath(extensionPath: string): boolean {
	const normalized = extensionPath.split(path.sep).join(path.sep);
	return normalized.includes(`${path.sep}.vscode${path.sep}extensions${path.sep}`) || normalized.includes(`${path.sep}.cursor${path.sep}extensions${path.sep}`);
}

/**
 * Same criteria as extension debug logging: F5 host, extension dev env, unpackaged path, or robert.debugMode.
 */
export function detectDebugMode(context: vscode.ExtensionContext): boolean {
	const isDevelopmentHost = context.extensionMode === vscode.ExtensionMode.Development;
	const isExtensionDevelopmentHost = process.env.VSCODE_EXTENSION_DEVELOPMENT === 'true';
	const isRunningFromSource = !isPackagedExtensionPath(context.extensionPath);
	const isDebugConfiguration = isDebugModeSettingEnabled();

	return isDevelopmentHost || isExtensionDevelopmentHost || isRunningFromSource || isDebugConfiguration;
}

/** Test tab and dev-only handlers. */
export function isTestTabEnabled(): boolean {
	if (extensionContext) {
		return detectDebugMode(extensionContext);
	}
	return isDebugModeSettingEnabled();
}

export function getTestTabEnabledReason(): string {
	if (!extensionContext) {
		return 'no extension context';
	}
	if (extensionContext.extensionMode === vscode.ExtensionMode.Development) {
		return 'Extension Development Host (F5)';
	}
	if (process.env.VSCODE_EXTENSION_DEVELOPMENT === 'true') {
		return 'VSCODE_EXTENSION_DEVELOPMENT';
	}
	if (!isPackagedExtensionPath(extensionContext.extensionPath)) {
		return `unpackaged path (${extensionContext.extensionPath})`;
	}
	if (isDebugModeSettingEnabled()) {
		return 'robert.debugMode setting';
	}
	return 'disabled';
}
