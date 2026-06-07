import * as vscode from 'vscode';

const CURSOR_AGENT_OPEN_DELAY_MS = 150;

export const DEFAULT_CURSOR_AGENT_PROMPT = `You are helping via the IBM Robert VS Code extension (Rally integration).

Review the current workspace and Rally sprint context, then provide 3 concise insights I can show in the extension UI:
1. Sprint health (scope, blockers, at-risk items)
2. Team focus (ownership gaps, WIP, unassigned work)
3. One concrete next action for today

Keep each insight to 1–2 sentences. If Rally data is not visible in the repo, say what you would need to analyze the sprint.`;

async function openViaCursorClipboard(prompt: string): Promise<void> {
	const originalClipboard = await vscode.env.clipboard.readText();

	try {
		await vscode.env.clipboard.writeText(prompt);
		await vscode.commands.executeCommand('composer.newAgentChat');
		await new Promise(resolve => setTimeout(resolve, CURSOR_AGENT_OPEN_DELAY_MS));
		await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
	} finally {
		try {
			await vscode.env.clipboard.writeText(originalClipboard);
		} catch {
			// Best-effort clipboard restore
		}
	}
}

/**
 * Opens the IDE agent chat with a prefilled prompt.
 * Cursor: composer.newAgentChat + clipboard paste (no official prompt API).
 * VS Code: workbench.action.chat.open when available.
 */
export async function openCursorAgentWithPrompt(prompt: string): Promise<'cursor' | 'vscode'> {
	const trimmed = prompt.trim();
	if (!trimmed) {
		throw new Error('Prompt is empty');
	}

	const commands = await vscode.commands.getCommands(true);

	if (commands.includes('composer.newAgentChat')) {
		await openViaCursorClipboard(trimmed);
		return 'cursor';
	}

	if (commands.includes('workbench.action.chat.open')) {
		await vscode.commands.executeCommand('workbench.action.chat.open', trimmed);
		return 'vscode';
	}

	throw new Error('No supported agent chat command found. Open this from Cursor or VS Code with Chat enabled.');
}
