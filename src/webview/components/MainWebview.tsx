import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import 'vscrui/dist/codicon.css';
import UserStoriesTable, { IterationsTable } from './common/UserStoriesTable';
import UserStoryForm from './common/UserStoryForm';
import TasksTable from './common/TasksTable';
import ScreenHeader from './common/ScreenHeader';
import NavigationBar from './common/NavigationBar';
import Calendar from './common/Calendar';
import { CenteredContainer, Container, ContentArea, GlobalStyle, Header, LogoContainer, LogoImage, Title } from './common/styled';
import { getVsCodeApi } from '../utils/vscodeApi';

type SectionType = 'calendar' | 'portfolio';
type ScreenType = 'iterations' | 'userStories' | 'userStoryDetail';

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

const MainWebview: React.FC<MainWebviewProps> = ({ webviewId, context, rebusLogoUri }) => {
	const vscode = useMemo(() => getVsCodeApi(), []);
	const hasVsCodeApi = Boolean(vscode);

	const sendMessage = useCallback(
		(message: Record<string, unknown>) => {
			if (!vscode) {
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
		[context, vscode, webviewId]
	);

	const [iterations, setIterations] = useState<Iteration[]>([]);
	const [iterationsLoading, setIterationsLoading] = useState(false);
	const [iterationsError, setIterationsError] = useState<string | null>(null);
	const [selectedIteration, setSelectedIteration] = useState<Iteration | null>(null);

	const [userStories, setUserStories] = useState<UserStory[]>([]);
	const [userStoriesLoading, setUserStoriesLoading] = useState(false);
	const [userStoriesError, setUserStoriesError] = useState<string | null>(null);
	const [selectedUserStory, setSelectedUserStory] = useState<UserStory | null>(null);

	const [tasks, setTasks] = useState<any[]>([]);
	const [tasksLoading, setTasksLoading] = useState(false);
	const [tasksError, setTasksError] = useState<string | null>(null);

	// Navigation state
	const [activeSection, setActiveSection] = useState<SectionType>('portfolio');
	const [currentScreen, setCurrentScreen] = useState<ScreenType>('iterations');

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
			setCurrentScreen('userStories');
		},
		[loadUserStories]
	);

	const loadTasks = useCallback(
		(userStoryId: string) => {
			// eslint-disable-next-line no-console
			console.log('[Frontend] Loading tasks for user story:', userStoryId);
			setTasksLoading(true);
			setTasksError(null);
			sendMessage({
				command: 'loadTasks',
				userStoryId: userStoryId
			});
		},
		[sendMessage]
	);

	const handleUserStorySelected = useCallback(
		(userStory: UserStory) => {
			// eslint-disable-next-line no-console
			console.log('[Frontend] User story selected:', userStory.formattedId);
			setSelectedUserStory(userStory);
			setCurrentScreen('userStoryDetail');
			// Load tasks for this user story
			loadTasks(userStory.objectId);
		},
		[loadTasks]
	);

	const handleBackToIterations = useCallback(() => {
		setCurrentScreen('iterations');
		setSelectedIteration(null);
		setSelectedUserStory(null);
		setUserStories([]);
	}, []);

	const handleBackToUserStories = useCallback(() => {
		setCurrentScreen('userStories');
		setSelectedUserStory(null);
		setTasks([]);
		setTasksError(null);
	}, []);

	const handleSectionChange = useCallback(
		(section: SectionType) => {
			setActiveSection(section);
			if (section === 'portfolio') {
				// Load iterations when switching to portfolio
				loadIterations();
			}
		},
		[loadIterations]
	);

	const findCurrentIteration = useCallback((iterations: Iteration[]): Iteration | null => {
		const today = new Date();
		today.setHours(0, 0, 0, 0); // Reset time to compare dates only

		// Find iterations where today is between start and end dates
		const activeIterations = iterations.filter(iteration => {
			const startDate = iteration.startDate ? new Date(iteration.startDate) : null;
			const endDate = iteration.endDate ? new Date(iteration.endDate) : null;

			if (startDate) startDate.setHours(0, 0, 0, 0);
			if (endDate) endDate.setHours(0, 0, 0, 0);

			// If both dates are set, check if today is within range
			if (startDate && endDate) {
				return today >= startDate && today <= endDate;
			}

			// If only start date is set, check if today is after or equal to start
			if (startDate && !endDate) {
				return today >= startDate;
			}

			// If only end date is set, check if today is before or equal to end
			if (!startDate && endDate) {
				return today <= endDate;
			}

			// If no dates are set, consider it inactive
			return false;
		});

		// Return the first active iteration (in case of overlapping)
		return activeIterations.length > 0 ? activeIterations[0] : null;
	}, []);

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

		// Automatically load iterations when webview initializes (only for portfolio section)
		if (activeSection === 'portfolio') {
			// eslint-disable-next-line no-console
			console.log('[Frontend] Calling loadIterations automatically...');
			loadIterations();
		}

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

						// Auto-select current iteration if available
						const currentIteration = findCurrentIteration(message.iterations);
						if (currentIteration) {
							// eslint-disable-next-line no-console
							console.log('[Frontend] Auto-selecting current iteration:', currentIteration.name);
							setSelectedIteration(currentIteration);
							loadUserStories(currentIteration);
							setCurrentScreen('userStories');
						} else {
							// eslint-disable-next-line no-console
							console.log('[Frontend] No active iteration found for today');
						}
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
				case 'tasksLoaded':
					setTasksLoading(false);
					if (message.tasks) {
						setTasks(message.tasks);
						setTasksError(null);
					} else {
						setTasksError('Failed to load tasks');
					}
					break;
				case 'tasksError':
					setTasksLoading(false);
					setTasksError(message.error || 'Error loading tasks');
					break;
			}
		};

		window.addEventListener('message', handleMessage);
		return () => window.removeEventListener('message', handleMessage);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [sendMessage, findCurrentIteration, loadUserStories, activeSection, loadIterations]);

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
				<GlobalStyle />
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
			<GlobalStyle />
			<CenteredContainer>
				<Header>
					<LogoContainer>
						<LogoImage src={rebusLogoUri} alt="IBM Logo" />
						<Title>Robert</Title>
					</LogoContainer>
				</Header>

				<NavigationBar activeSection={activeSection} onSectionChange={handleSectionChange} />

				<ContentArea>
					{activeSection === 'calendar' && <Calendar />}

					{activeSection === 'portfolio' && (
						<>
							{currentScreen === 'iterations' && (
								<>
									<ScreenHeader title="Rally Iterations" />
									<IterationsTable iterations={iterations} loading={iterationsLoading} error={iterationsError} onLoadIterations={loadIterations} onIterationSelected={handleIterationSelected} selectedIteration={selectedIteration} />
								</>
							)}

							{currentScreen === 'userStories' && selectedIteration && (
								<>
									<ScreenHeader title={`User Stories - ${selectedIteration.name}`} showBackButton={true} onBack={handleBackToIterations} />
									<UserStoriesTable
										userStories={userStories}
										loading={userStoriesLoading}
										error={userStoriesError}
										onLoadUserStories={() => loadUserStories(selectedIteration)}
										onClearUserStories={clearUserStories}
										onUserStorySelected={handleUserStorySelected}
										selectedUserStory={selectedUserStory}
									/>
								</>
							)}

							{currentScreen === 'userStoryDetail' && selectedUserStory && (
								<>
									<ScreenHeader title={`User Story Details - ${selectedUserStory.formattedId}`} showBackButton={true} onBack={handleBackToUserStories} />
									<UserStoryForm userStory={selectedUserStory} />
									<TasksTable tasks={tasks} loading={tasksLoading} error={tasksError} onLoadTasks={() => selectedUserStory && loadTasks(selectedUserStory.objectId)} />
								</>
							)}
						</>
					)}
				</ContentArea>
			</CenteredContainer>
		</Container>
	);
};

export default MainWebview;
