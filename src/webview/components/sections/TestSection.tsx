import { type CSSProperties, type FC, useCallback, useEffect, useState } from 'react';

interface TestSectionProps {
	devMode: boolean;
	sendMessage: (command: string | Record<string, unknown>, data?: unknown) => void;
}

const sectionStyle = {
	padding: '16px',
	borderRadius: '8px',
	border: '1px solid var(--vscode-panel-border)',
	backgroundColor: 'var(--vscode-editor-background)'
} as const;

const buttonStyle = (disabled: boolean): CSSProperties => ({
	padding: '8px 14px',
	borderRadius: '4px',
	border: 'none',
	backgroundColor: 'var(--vscode-button-background)',
	color: 'var(--vscode-button-foreground)',
	fontSize: '13px',
	cursor: disabled ? 'wait' : 'pointer',
	opacity: disabled ? 0.7 : 1
});

const TestSection: FC<TestSectionProps> = ({ devMode, sendMessage }) => {
	const [openingCursor, setOpeningCursor] = useState(false);
	const [lmLoading, setLmLoading] = useState(false);
	const [lmResult, setLmResult] = useState<string | null>(null);
	const [lmModel, setLmModel] = useState<string | null>(null);
	const [lmError, setLmError] = useState<string | null>(null);
	const [cliLoading, setCliLoading] = useState(false);
	const [cliElapsedSec, setCliElapsedSec] = useState(0);
	const [cliResult, setCliResult] = useState<string | null>(null);
	const [cliAgentPath, setCliAgentPath] = useState<string | null>(null);
	const [cliModel, setCliModel] = useState<string | null>(null);
	const [cliError, setCliError] = useState<string | null>(null);

	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			const message = event.data;
			if (message?.command === 'languageModelInsightsResult') {
				setLmLoading(false);
				setLmError(null);
				setLmResult(typeof message.text === 'string' ? message.text : '');
				setLmModel(typeof message.modelName === 'string' ? message.modelName : null);
			}
			if (message?.command === 'languageModelInsightsError') {
				setLmLoading(false);
				setLmResult(null);
				setLmModel(null);
				setLmError(typeof message.error === 'string' ? message.error : 'Language model request failed.');
			}
			if (message?.command === 'cursorCliInsightsStarted') {
				setCliLoading(true);
				setCliError(null);
			}
			if (message?.command === 'cursorCliInsightsResult') {
				setCliLoading(false);
				setCliElapsedSec(0);
				setCliError(null);
				setCliResult(typeof message.text === 'string' ? message.text : '');
				setCliAgentPath(typeof message.agentPath === 'string' ? message.agentPath : null);
				setCliModel(typeof message.model === 'string' ? message.model : null);
			}
			if (message?.command === 'cursorCliInsightsError') {
				setCliLoading(false);
				setCliElapsedSec(0);
				setCliResult(null);
				setCliAgentPath(null);
				setCliModel(null);
				setCliError(typeof message.error === 'string' ? message.error : 'Cursor CLI request failed.');
			}
		};

		window.addEventListener('message', handleMessage);
		return () => window.removeEventListener('message', handleMessage);
	}, []);

	useEffect(() => {
		if (!cliLoading) {
			return;
		}

		const startedAt = Date.now();
		const tick = window.setInterval(() => {
			setCliElapsedSec(Math.floor((Date.now() - startedAt) / 1000));
		}, 1000);

		const safetyTimeout = window.setTimeout(() => {
			setCliLoading(false);
			setCliElapsedSec(0);
			setCliError('No response from extension after 3 minutes. Reload the Robert view and check the Robert output channel.');
		}, 180_000);

		return () => {
			window.clearInterval(tick);
			window.clearTimeout(safetyTimeout);
		};
	}, [cliLoading]);

	const handleOpenCursorAgent = useCallback(() => {
		setOpeningCursor(true);
		sendMessage({ command: 'openCursorAgentPrompt' });
		window.setTimeout(() => setOpeningCursor(false), 800);
	}, [sendMessage]);

	const handleRequestLanguageModelInsights = useCallback(() => {
		setLmLoading(true);
		setLmError(null);
		setLmResult(null);
		setLmModel(null);
		sendMessage({ command: 'requestLanguageModelInsights' });
	}, [sendMessage]);

	const handleRequestCursorCliInsights = useCallback(() => {
		setCliLoading(true);
		setCliError(null);
		setCliResult(null);
		setCliAgentPath(null);
		setCliModel(null);
		sendMessage({ command: 'requestCursorCliInsights' });
	}, [sendMessage]);

	const resultPreStyle = {
		margin: '12px 0 0',
		padding: '12px',
		borderRadius: '6px',
		backgroundColor: 'var(--vscode-textBlockQuote-background)',
		color: 'var(--vscode-foreground)',
		fontSize: '12px',
		lineHeight: 1.5,
		whiteSpace: 'pre-wrap' as const,
		wordBreak: 'break-word' as const
	};

	const errorPreStyle = {
		...resultPreStyle,
		backgroundColor: 'var(--vscode-inputValidation-errorBackground)',
		color: 'var(--vscode-inputValidation-errorForeground)'
	};

	if (!devMode) {
		return null;
	}

	return (
		<div style={{ padding: '24px', maxWidth: '720px' }}>
			<h2 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 600 }}>Test</h2>
			<p style={{ margin: '0 0 16px', color: 'var(--vscode-descriptionForeground)', lineHeight: 1.5 }}>Development-only area for experiments. Visible with Robert Debug Mode enabled or when debugging the extension (F5).</p>

			<section style={{ ...sectionStyle, marginBottom: '16px' }}>
				<h3 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 600 }}>Cursor CLI agent (PoC)</h3>
				<p style={{ margin: '0 0 12px', color: 'var(--vscode-descriptionForeground)', fontSize: '12px', lineHeight: 1.5 }}>
					Runs <code>agent -p --mode ask --model auto</code> with a dummy poem prompt. MCP servers are not approved (<code>--approve-mcps</code> omitted). Requires <code>agent login</code>.
				</p>
				<button type="button" onClick={handleRequestCursorCliInsights} disabled={cliLoading} style={buttonStyle(cliLoading)}>
					{cliLoading ? `Running Cursor CLI… (${cliElapsedSec}s)` : 'Generate insights via Cursor CLI'}
				</button>
				{(cliAgentPath || cliModel) && (
					<p style={{ margin: '12px 0 0', fontSize: '11px', color: 'var(--vscode-descriptionForeground)' }}>
						{cliModel && <>Model: {cliModel}</>}
						{cliModel && cliAgentPath && ' · '}
						{cliAgentPath && <>CLI: {cliAgentPath}</>}
					</p>
				)}
				{cliError && <pre style={errorPreStyle}>{cliError}</pre>}
				{cliResult && <pre style={resultPreStyle}>{cliResult}</pre>}
			</section>

			<section style={{ ...sectionStyle, marginBottom: '16px' }}>
				<h3 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 600 }}>VS Code Language Model API</h3>
				<p style={{ margin: '0 0 12px', color: 'var(--vscode-descriptionForeground)', fontSize: '12px', lineHeight: 1.5 }}>
					Calls <code>vscode.lm</code> (GitHub Copilot in VS Code). The response appears below. First run may ask you to allow Robert to use Copilot. Does not work in Cursor yet.
				</p>
				<button type="button" onClick={handleRequestLanguageModelInsights} disabled={lmLoading} style={buttonStyle(lmLoading)}>
					{lmLoading ? 'Requesting insights…' : 'Request insights via Language Model API'}
				</button>
				{lmModel && <p style={{ margin: '12px 0 0', fontSize: '11px', color: 'var(--vscode-descriptionForeground)' }}>Model: {lmModel}</p>}
				{lmError && <pre style={errorPreStyle}>{lmError}</pre>}
				{lmResult && <pre style={resultPreStyle}>{lmResult}</pre>}
			</section>

			<section style={sectionStyle}>
				<h3 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 600 }}>Cursor agent</h3>
				<p style={{ margin: '0 0 12px', color: 'var(--vscode-descriptionForeground)', fontSize: '12px', lineHeight: 1.5 }}>Opens a new Cursor agent chat with a Rally-focused insights prompt pasted in. You still submit the message manually.</p>
				<button type="button" onClick={handleOpenCursorAgent} disabled={openingCursor} style={buttonStyle(openingCursor)}>
					{openingCursor ? 'Opening…' : 'Prepare insights prompt in Cursor'}
				</button>
			</section>
		</div>
	);
};

export default TestSection;
