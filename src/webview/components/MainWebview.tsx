import type React from 'react';
import { useEffect, useState } from 'react';
import 'vscrui/dist/codicon.css';
import DemoSection from './common/DemoSection';
import LoadingSpinner from './common/LoadingSpinner';
import ProgressBar from './common/ProgressBar';
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

const MainWebview: React.FC<MainWebviewProps> = ({ webviewId, context, rebusLogoUri }) => {
	const vscode = window.acquireVsCodeApi();
	const [isLoading] = useState(false);
	const [projects, setProjects] = useState<Project[]>([]);
	const [projectsLoading, setProjectsLoading] = useState(false);
	const [projectsError, setProjectsError] = useState<string | null>(null);
	const [currentProgress, setCurrentProgress] = useState(0);

	useEffect(() => {
		// Load saved state when webview initializes
		vscode.postMessage({
			command: 'getState',
			webviewId: webviewId
		});

		// Listen for messages from extension
		const handleMessage = (event: MessageEvent) => {
			const message = event.data;

			switch (message.command) {
				case 'showLogo':
					// Handle logo display if needed
					break;
				case 'restoreState':
					if (message.state && message.state.currentProgress !== undefined) {
						setCurrentProgress(message.state.currentProgress);
					}
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
	}, [vscode, webviewId]);

	const _openSettings = () => {
		vscode.postMessage({
			command: 'openSettings',
			context: context,
			timestamp: new Date().toISOString()
		});
	};

	const showDemo = (demoType: string) => {
		vscode.postMessage({
			command: 'showDemo',
			demoType: demoType,
			context: context,
			timestamp: new Date().toISOString()
		});
	};

	const loadProjects = () => {
		setProjectsLoading(true);
		setProjectsError(null);
		vscode.postMessage({
			command: 'loadProjects',
			context: context,
			timestamp: new Date().toISOString()
		});
	};

	const clearProjects = () => {
		setProjects([]);
		setProjectsError(null);
	};

	const handleProgressChange = (progress: number) => {
		setCurrentProgress(progress);
	};

	const saveState = (state: { currentProgress: number }) => {
		vscode.postMessage({
			command: 'saveState',
			webviewId: webviewId,
			state: state
		});
	};

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
					<ProgressBar initialProgress={currentProgress} onProgressChange={handleProgressChange} onSaveState={saveState} />

					<DemoSection onShowDemo={showDemo} />

					<ProjectsTable projects={projects} loading={projectsLoading} error={projectsError} onLoadProjects={loadProjects} onClearProjects={clearProjects} />
				</ContentArea>

				<LoadingSpinner show={isLoading} message="Loading..." />
			</CenteredContainer>
		</Container>
	);
};

export default MainWebview;
