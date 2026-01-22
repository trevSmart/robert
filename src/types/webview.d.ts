/**
 * Types for webview communication
 */

export interface Tutorial {
	title: string;
}

export interface WebviewMessage {
	command: string;
	webviewId?: string;
	context?: string;
	timestamp?: string;
	demoType?: string;
	userStoryId?: string;
	errorMessage?: string;
	errorStack?: string;
	message?: string;
	source?: string;
	type?: string;
	stack?: string;
	title?: string;
	tutorial?: Tutorial;
	[key: string]: unknown;
}