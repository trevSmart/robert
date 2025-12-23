import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import 'vscrui/dist/codicon.css';
import UserStoriesTable, { IterationsTable } from './common/UserStoriesTable';
import { CenteredContainer, Container, ContentArea, Header, LogoContainer, LogoImage, Title } from './common/styled';

interface MainWebviewProps {
	webviewId: string;
	context: string;
	timestamp: string;
	rebusLogoUri: string;
}

interface Iteration {
	objectId: string;
	name: string;
	startDate: string;
	endDate: string;
	state: string;
	project: string | null;
	_ref: string;
}

interface UserStory {
	objectId: string;
	formattedId: string;
	name: string;
	description: string | null;
	state: string;
	planEstimate: number;
	toDo: number;
	owner: string;
	project: string | null;
	iteration: string | null;
	blocked: boolean;
	taskEstimateTotal: number;
	taskStatus: string;
	tasksCount: number;
	testCasesCount: number;
	defectsCount: number;
	discussionCount: number;
	appgar: string;
}

type VsCodeApi = {
	postMessage(message: Record<string, unknown>): void;
	setState?(state: unknown): void;
	getState?(): unknown;
};

const MainWebview: React.FC<MainWebviewProps> = ({ webviewId, context, rebusLogoUri }) => {
	const [hasVsCodeApi] = useState(() => {
		const hasApi = typeof window.acquireVsCodeApi === 'function';
		// eslint-disable-next-line no-console
		console.log('[Frontend] hasVsCodeApi:', hasApi);
		return hasApi;
	});
	const vscode = useMemo<VsCodeApi>(() => {
		if (hasVsCodeApi) {
			try {
				return window.acquireVsCodeApi();
			} catch (error) {
				console.error('Robert MainWebview failed to acquire VS Code API', error);
			}
		}

		return {
			postMessage: () => {
				// Fallback postMessage - no action needed when VS Code API is not available
			},
			setState: () => undefined,
			getState: () => undefined
		};
	}, [hasVsCodeApi]);

	const sendMessage = useCallback(
		(message: Record<string, unknown>) => {
			if (!hasVsCodeApi) {
				return;
			}

			const payload: Record<string, unknown> = { ...message };
			if (!payload.webviewId) {
				payload.webviewId = webviewId;
			}
			if (!payload.context) {
				payload.context = context;
			}
			if (!payload.timestamp) {
				payload.timestamp = new Date().toISOString();
			}

			vscode.postMessage(payload);
		},
		[context, hasVsCodeApi, vscode, webviewId]
	);

	const [iterations, setIterations] = useState<Iteration[]>([]);
	const [iterationsLoading, setIterationsLoading] = useState(false);
	const [iterationsError, setIterationsError] = useState<string | null>(null);
	const [selectedIteration, setSelectedIteration] = useState<Iteration | null>(null);

	const [userStories, setUserStories] = useState<UserStory[]>([]);
	const [userStoriesLoading, setUserStoriesLoading] = useState(false);
	const [userStoriesError, setUserStoriesError] = useState<string | null>(null);

	const loadIterations = useCallback(() => {
		// eslint-disable-next-line no-console
		console.log('[Frontend] Loading iterations...');
		setIterationsLoading(true);
		setIterationsError(null);
		sendMessage({
			command: 'loadIterations'
		});
	}, [sendMessage]);

	const loadUserStories = useCallback(
		(iteration?: Iteration) => {
			// eslint-disable-next-line no-console
			console.log('[Frontend] Loading user stories...', iteration ? `for iteration: ${iteration.name}` : 'for all');
			setUserStoriesLoading(true);
			setUserStoriesError(null);
			sendMessage({
				command: 'loadUserStories',
				iteration: iteration ? iteration._ref : undefined
			});
		},
		[sendMessage]
	);

	const handleIterationSelected = useCallback(
		(iteration: Iteration) => {
			// eslint-disable-next-line no-console
			console.log('[Frontend] Iteration selected:', iteration.name);
			setSelectedIteration(iteration);
			loadUserStories(iteration);
		},
		[loadUserStories]
	);

	useEffect(() => {
		// eslint-disable-next-line no-console
		console.log('[Frontend] MainWebview useEffect executing - initializing...');

		sendMessage({
			command: 'webviewReady'
		});

		// Load saved state when webview initializes
		sendMessage({
			command: 'getState'
		});

		// Automatically load iterations when webview initializes
		// eslint-disable-next-line no-console
		console.log('[Frontend] Calling loadIterations automatically...');
		loadIterations();

		// Listen for messages from extension
		const handleMessage = (event: MessageEvent) => {
			const message = event.data;
			// eslint-disable-next-line no-console
			console.log('[Frontend] Received message from extension:', message.command);

			switch (message.command) {
				case 'showLogo':
					// Handle logo display if needed
					break;
				case 'iterationsLoaded':
					setIterationsLoading(false);
					if (message.iterations) {
						setIterations(message.iterations);
						setIterationsError(null);
					} else {
						setIterationsError('Failed to load iterations');
					}
					break;
				case 'iterationsError':
					setIterationsLoading(false);
					setIterationsError(message.error || 'Error loading iterations');
					break;
				case 'userStoriesLoaded':
					setUserStoriesLoading(false);
					if (message.userStories) {
						setUserStories(message.userStories);
						setUserStoriesError(null);
					} else {
						setUserStoriesError('Failed to load user stories');
					}
					break;
				case 'userStoriesError':
					setUserStoriesLoading(false);
					setUserStoriesError(message.error || 'Error loading user stories');
					break;
			}
		};

		window.addEventListener('message', handleMessage);
		return () => window.removeEventListener('message', handleMessage);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [sendMessage]);

	useEffect(() => {
		if (!hasVsCodeApi) {
			return;
		}

		const handleError = (event: ErrorEvent) => {
			sendMessage({
				command: 'webviewError',
				errorMessage: event.message,
				errorStack: event.error instanceof Error ? event.error.stack : undefined,
				source: event.filename,
				type: 'error'
			});
		};

		const handleRejection = (event: PromiseRejectionEvent) => {
			sendMessage({
				command: 'webviewError',
				errorMessage: event.reason instanceof Error ? event.reason.message : String(event.reason),
				errorStack: event.reason instanceof Error ? event.reason.stack : undefined,
				type: 'unhandledrejection'
			});
		};

		window.addEventListener('error', handleError);
		window.addEventListener('unhandledrejection', handleRejection);

		return () => {
			window.removeEventListener('error', handleError);
			window.removeEventListener('unhandledrejection', handleRejection);
		};
	}, [hasVsCodeApi, sendMessage]);

	const _openSettings = () => {
		sendMessage({
			command: 'openSettings'
		});
	};

	const _clearIterations = () => {
		setIterations([]);
		setIterationsError(null);
		setSelectedIteration(null);
	};

	const clearUserStories = () => {
		setUserStories([]);
		setUserStoriesError(null);
	};

	if (!hasVsCodeApi) {
		return (
			<Container>
				<CenteredContainer>
					<Header>
						<LogoContainer>
							<LogoImage src={rebusLogoUri} alt="IBM Logo" />
							<Title>Robert</Title>
						</LogoContainer>
					</Header>

					<ContentArea>
						<p style={{ margin: 0 }}>Unable to initialize the VS Code webview API. Please reload VS Code and try again.</p>
					</ContentArea>
				</CenteredContainer>
			</Container>
		);
	}

	return (
		<Container>
			<CenteredContainer>
				<Header>
					<LogoContainer>
						<LogoImage src={rebusLogoUri} alt="IBM Logo" />
						<Title>Robert</Title>
					</LogoContainer>
				</Header>

				<ContentArea>
					<h1>HOLA MÓN!</h1>

					<IterationsTable iterations={iterations} loading={iterationsLoading} error={iterationsError} onLoadIterations={loadIterations} onIterationSelected={handleIterationSelected} selectedIteration={selectedIteration} />

					{selectedIteration && <UserStoriesTable userStories={userStories} loading={userStoriesLoading} error={userStoriesError} onLoadUserStories={() => loadUserStories(selectedIteration)} onClearUserStories={clearUserStories} />}
				</ContentArea>
			</CenteredContainer>
		</Container>
	);
};

export default MainWebview;
