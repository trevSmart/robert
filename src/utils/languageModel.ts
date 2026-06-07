import * as vscode from 'vscode';
import { DEFAULT_CURSOR_AGENT_PROMPT } from './cursorAgent';

export interface LanguageModelInsightsResult {
	text: string;
	modelName: string;
}

function formatLanguageModelError(error: unknown): string {
	if (error instanceof vscode.LanguageModelError) {
		return error.message;
	}
	if (error instanceof Error) {
		return error.message;
	}
	return String(error);
}

async function collectResponseText(response: vscode.LanguageModelChatResponse): Promise<string> {
	let text = '';
	for await (const chunk of response.text) {
		text += chunk;
	}
	return text.trim();
}

/**
 * Requests insights via the VS Code Language Model API (typically GitHub Copilot).
 * Requires Copilot installed and user consent for this extension.
 */
export async function requestLanguageModelInsights(prompt: string = DEFAULT_CURSOR_AGENT_PROMPT, token?: vscode.CancellationToken): Promise<LanguageModelInsightsResult> {
	const trimmed = prompt.trim();
	if (!trimmed) {
		throw new Error('Prompt is empty');
	}

	let models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
	if (models.length === 0) {
		models = await vscode.lm.selectChatModels();
	}
	if (models.length === 0) {
		throw new Error('No language models available. In VS Code, install GitHub Copilot and allow this extension to use it. Cursor does not expose vscode.lm yet.');
	}

	const model = models[0];
	const messages = [vscode.LanguageModelChatMessage.User(trimmed)];

	try {
		const response = await model.sendRequest(messages, {}, token);
		const text = await collectResponseText(response);
		const modelName = model.name || model.family || model.vendor || 'language-model';

		if (!text) {
			throw new Error('Language model returned an empty response.');
		}

		return { text, modelName };
	} catch (error) {
		throw new Error(formatLanguageModelError(error));
	}
}
