import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import 'vscrui/dist/codicon.css';
import ProjectsTable from './common/ProjectsTable';
import { CenteredContainer, Container, ContentArea, Header, LogoContainer, LogoImage, Title } from './common/styled';

interface MainWebviewProps {
	webviewId: string;
	context: string;
	timestamp: string;
	rebusLogoUri: string;
}

interface Project {
	name?: string;
	description?: string;
	state?: string;
	owner?: string;
	childrenCount?: number;
}

type VsCodeApi = {
	postMessage(message: Record<string, unknown>): void;
	setState?(state: unknown): void;
	getState?(): unknown;
};

const MainWebview: React.FC<MainWebviewProps> = ({ webviewId, context, rebusLogoUri }) => {
	const [hasVsCodeApi] = useState(() => typeof window.acquireVsCodeApi === 'function');
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
				console.warn('Robert MainWebview fallback postMessage invoked without VS Code API');
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
	const [projects, setProjects] = useState<Project[]>([]);
	const [projectsLoading, setProjectsLoading] = useState(false);
	const [projectsError, setProjectsError] = useState<string | null>(null);

	useEffect(() => {
		// Load saved state when webview initializes
		sendMessage({
			command: 'getState'
		});

		// Listen for messages from extension
		const handleMessage = (event: MessageEvent) => {
			const message = event.data;

			switch (message.command) {
				case 'showLogo':
					// Handle logo display if needed
					break;
				case 'projectsLoaded':
					setProjectsLoading(false);
					if (message.projects) {
						setProjects(message.projects);
						setProjectsError(null);
					} else {
						setProjectsError('Failed to load projects');
					}
					break;
				case 'projectsError':
					setProjectsLoading(false);
					setProjectsError(message.error || 'Error loading projects');
					break;
			}
		};

		window.addEventListener('message', handleMessage);
		return () => window.removeEventListener('message', handleMessage);
	}, [sendMessage, webviewId]);

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

	const loadProjects = () => {
		setProjectsLoading(true);
		setProjectsError(null);
		sendMessage({
			command: 'loadProjects'
		});
	};

	const clearProjects = () => {
		setProjects([]);
		setProjectsError(null);
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
					<ProjectsTable projects={projects} loading={projectsLoading} error={projectsError} onLoadProjects={loadProjects} onClearProjects={clearProjects} />
				</ContentArea>
			</CenteredContainer>
		</Container>
	);
};

export default MainWebview;
