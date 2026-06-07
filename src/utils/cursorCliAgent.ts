import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { ErrorHandler } from '../ErrorHandler';

const AGENT_TIMEOUT_MS = 180_000;
const AGENT_KILL_GRACE_MS = 5_000;

/** Model for the Test tab PoC (see `agent models`). */
export const CURSOR_CLI_MODEL = 'auto';

/** Dummy prompt for timing experiments — no codebase analysis needed. */
export const CURSOR_CLI_POC_PROMPT = 'Write a poem in exactly 3 short paragraphs. Do not use tools or analyze the codebase — only write the poem.';

export interface CursorCliInsightsResult {
	text: string;
	agentPath: string;
	model: string;
}

function resolveAgentPath(): string {
	const candidates = [path.join(os.homedir(), '.local', 'bin', 'agent'), path.join(os.homedir(), '.local', 'bin', 'cursor-agent')];

	for (const candidate of candidates) {
		try {
			fs.accessSync(candidate, fs.constants.X_OK);
			return candidate;
		} catch {
			// try next
		}
	}

	return 'agent';
}

function getWorkspacePath(): string {
	const folder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
	if (!folder) {
		throw new Error('No workspace folder open. Open a project folder first.');
	}
	return folder;
}

function runAgentProcess(agentPath: string, args: string[], cwd: string, token?: vscode.CancellationToken): Promise<{ stdout: string; stderr: string }> {
	return new Promise((resolve, reject) => {
		const env = {
			...process.env,
			PATH: `${path.join(os.homedir(), '.local', 'bin')}${path.delimiter}${process.env.PATH ?? ''}`
		};

		const child = spawn(agentPath, args, {
			cwd,
			env,
			stdio: ['ignore', 'pipe', 'pipe']
		});

		let stdout = '';
		let stderr = '';
		let settled = false;

		const finish = (error?: Error) => {
			if (settled) {
				return;
			}
			settled = true;
			clearTimeout(timeout);
			token?.onCancellationRequested(() => undefined);
			if (error) {
				reject(error);
			} else {
				resolve({ stdout, stderr });
			}
		};

		const timeout = setTimeout(() => {
			child.kill('SIGTERM');
			const killTimer = setTimeout(() => {
				child.kill('SIGKILL');
			}, AGENT_KILL_GRACE_MS);
			child.once('close', () => clearTimeout(killTimer));
			finish(new Error(`Cursor CLI timed out after ${AGENT_TIMEOUT_MS / 1000}s.`));
		}, AGENT_TIMEOUT_MS);

		child.stdout?.on('data', (chunk: Buffer) => {
			stdout += chunk.toString();
		});
		child.stderr?.on('data', (chunk: Buffer) => {
			stderr += chunk.toString();
		});

		child.on('error', err => {
			if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
				finish(new Error('Cursor CLI not found. Install with: curl https://cursor.com/install -fsSL | bash'));
				return;
			}
			finish(err);
		});

		child.on('close', code => {
			if (code === 0) {
				finish();
				return;
			}

			const detail = (stderr || stdout).trim();
			if (/not logged in/i.test(detail)) {
				finish(new Error('Cursor CLI is not authenticated. Run `agent login` in a terminal first.'));
				return;
			}

			finish(new Error(detail || `Cursor CLI exited with code ${code ?? 'unknown'}.`));
		});

		token?.onCancellationRequested(() => {
			child.kill('SIGTERM');
			finish(new vscode.CancellationError());
		});
	});
}

/**
 * Runs Cursor Agent CLI in headless ask mode and returns printed text.
 * PoC for showing insights inside the Robert webview.
 */
export async function requestCursorCliInsights(prompt: string = CURSOR_CLI_POC_PROMPT, token?: vscode.CancellationToken): Promise<CursorCliInsightsResult> {
	const trimmed = prompt.trim();
	if (!trimmed) {
		throw new Error('Prompt is empty');
	}

	const agentPath = resolveAgentPath();
	const workspace = getWorkspacePath();

	// -p/--print is a boolean flag; prompt must be a positional argument (see `agent --help`).
	// Omit --workspace: it triggers heavy workspace indexing (~75s). cwd is enough for --trust (~18s).
	// Do not pass --approve-mcps so configured MCP servers stay unloaded.
	const args = ['-p', '--mode', 'ask', '--output-format', 'text', '--trust', '--model', CURSOR_CLI_MODEL, trimmed];

	const log = ErrorHandler.getInstance();
	log.logInfo(`Cursor CLI starting (${agentPath}, cwd: ${workspace}, model: ${CURSOR_CLI_MODEL})`, 'cursorCliAgent.requestCursorCliInsights');

	const { stdout, stderr } = await runAgentProcess(agentPath, args, workspace, token);

	if (stderr.trim()) {
		log.logDebug(stderr.trim(), 'cursorCliAgent.stderr');
	}
	const text = stdout.trim();

	if (!text) {
		throw new Error('Cursor CLI returned an empty response.');
	}

	return { text, agentPath, model: CURSOR_CLI_MODEL };
}
