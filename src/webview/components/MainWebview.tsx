import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import 'vscrui/dist/codicon.css';
import UserStoriesTable, { IterationsTable } from './common/UserStoriesTable';
import UserStoryForm from './common/UserStoryForm';
import TasksTable from './common/TasksTable';
import ScreenHeader from './common/ScreenHeader';
import NavigationBar from './common/NavigationBar';
import Calendar from './common/Calendar';

// Icon components (copied from NavigationBar for now)
const TeamIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '48px', height: '48px', margin: '0 auto', display: 'block' }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
		/>
	</svg>
);

const SalesforceIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '48px', height: '48px', margin: '0 auto', display: 'block' }}>
		<path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
	</svg>
);

const AssetsIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '48px', height: '48px', margin: '0 auto', display: 'block' }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 0 0 3.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008Z"
		/>
	</svg>
);

const MetricsIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '48px', height: '48px', margin: '0 auto', display: 'block' }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
		/>
	</svg>
);
// HeroIcons components for Salesforce and Assets
const TargetIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '18px', height: '18px' }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9s-2.015-9-4.5-9m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 2.84L5.107 14.668M5.107 14.668L9.468 6.98M5.107 14.668L9.468 6.98"
		/>
	</svg>
);

const TrophyIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '18px', height: '18px' }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236c.982.143 1.954.317 2.916.52a6.003 6.003 0 0 1 4.804 5.592M5.25 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0 1 7.73 9.728M5.25 4.236c.982.143 1.954.317 2.916.52a6.003 6.003 0 0 1 4.804 5.592m4.804-5.592a6.003 6.003 0 0 1 4.804-5.592 6.003 6.003 0 0 1 4.804 5.592M18.75 4.236c-.982.143-1.954.317-2.916.52a6.003 6.003 0 0 1 4.804 5.592M18.75 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 1 16.5 9.728"
		/>
	</svg>
);

const ChartBarSquareIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '18px', height: '18px' }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M7.5 14.25v2.25m3-6v6m3-10.5v10.5m3-6v6M3 16.5V18a2.25 2.25 0 0 0 2.25 2.25H18a2.25 2.25 0 0 0 2.25-2.25V16.5m-15 0H21m-21 0a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 6.75v7.5A2.25 2.25 0 0 1 18.75 16.5m-15 0H3m15-7.5V6.75a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v7.5c0 .414.336.75.75.75h10.5a.75.75 0 0 0 .75-.75V9m-9 0v.75h.75V9H9m3 0v.75h.75V9h-.75m3 0v.75h.75V9h-.75"
		/>
	</svg>
);

const LightBulbIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '18px', height: '18px' }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
		/>
	</svg>
);

const ArrowPathIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '18px', height: '18px' }}>
		<path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
	</svg>
);

const DocumentTextIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '36px', height: '36px' }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
		/>
	</svg>
);

const ChartBarIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '36px', height: '36px' }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
		/>
	</svg>
);

const SwatchIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '36px', height: '36px' }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 0 0 3.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008Z"
		/>
	</svg>
);

const ClipboardDocumentCheckIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '36px', height: '36px' }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0 1 18 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V8.25c0-.621-.504-1.125-1.125-1.125H12M10.5 7.5H8.25m6.75 0H12m-6.75 3h.008v.008H8.25v-.008m0 2.25h.008v.008H8.25V12m0 2.25h.008v.008H8.25V14.25m6.75-6.75H12m6.75 0H15m-3 2.25h.008v.008H12v-.008m0 2.25h.008v.008H12V12m0 2.25h.008v.008H12V14.25m6.75-6.75H15m3-2.25h.008v.008H18V6m0 2.25h.008v.008H18V8.25M18 12h.008v.008H18V12m0 2.25h.008v.008H18V14.25m0-6.75h.008v.008H18V8.25M12 2.25h.008v.008H12V2.25m0 2.25h.008v.008H12V4.5m0 2.25h.008v.008H12V6.75"
		/>
	</svg>
);

const BookOpenIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '36px', height: '36px' }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
		/>
	</svg>
);

const WrenchScrewdriverIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '36px', height: '36px' }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.53 3.53a3.124 3.124 0 0 1-3.767-3.77L9 7.5l-.697-.697a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m13.915 11.003a2.5 2.5 0 1 1 3.536 3.536L9.5 10.5 8.5 9.5l6.915-6.915a2.5 2.5 0 1 1 3.536 3.536L12.5 10.5l1 1z"
		/>
	</svg>
);

import { CenteredContainer, Container, ContentArea, GlobalStyle, Header, LogoContainer, LogoImage, Title } from './common/styled';
import { getVsCodeApi } from '../utils/vscodeApi';

type SectionType = 'calendar' | 'portfolio' | 'team' | 'salesforce' | 'assets' | 'metrics';
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
	const [debugMode, setDebugMode] = useState<boolean>(false);
	const [selectedTutorial, setSelectedTutorial] = useState<any>(null);
	const [showTutorial, setShowTutorial] = useState<boolean>(false);

	const [userStories, setUserStories] = useState<UserStory[]>([]);
	const [userStoriesLoading, setUserStoriesLoading] = useState(false);
	const [userStoriesError, setUserStoriesError] = useState<string | null>(null);
	const [selectedUserStory, setSelectedUserStory] = useState<UserStory | null>(null);

	const [tasks, setTasks] = useState<any[]>([]);
	const [tasksLoading, setTasksLoading] = useState(false);
	const [tasksError, setTasksError] = useState<string | null>(null);

	// Navigation state
	const [activeSection, setActiveSection] = useState<SectionType>('calendar');
	const [currentScreen, setCurrentScreen] = useState<ScreenType>('iterations');
	const [calendarDate, setCalendarDate] = useState(new Date());

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

		// Automatically load iterations when webview initializes (only for calendar section)
		if (activeSection === 'calendar') {
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
						setDebugMode(message.debugMode || false);
						setDebugMode(message.debugMode || false);

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
				<NavigationBar activeSection={activeSection} onSectionChange={handleSectionChange} />

				<ContentArea>
					{activeSection === 'calendar' && <Calendar currentDate={calendarDate} iterations={iterations} onMonthChange={setCalendarDate} debugMode={debugMode} />}

					{activeSection === 'team' && (
						<div style={{ padding: '20px' }}>
							{/* Team Header */}
							<div style={{ marginBottom: '30px', textAlign: 'center' }}>
								<h2 style={{ margin: '0 0 8px 0', color: 'var(--vscode-foreground)', fontSize: '24px', fontWeight: '600' }}>Team Dashboard</h2>
								<p style={{ margin: 0, color: 'var(--vscode-descriptionForeground)', fontSize: '14px' }}>Monitor team activity, collaboration, and project progress</p>
							</div>

							{/* Team Stats */}
							<div
								style={{
									display: 'grid',
									gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
									gap: '12px',
									marginBottom: '20px'
								}}
							>
								<div
									style={{
										background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
										borderRadius: '8px',
										padding: '12px',
										textAlign: 'center',
										color: 'white'
									}}
								>
									<div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '4px' }}>8</div>
									<div style={{ fontSize: '10px', opacity: 0.9 }}>Active Members</div>
								</div>
								<div
									style={{
										background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
										borderRadius: '8px',
										padding: '12px',
										textAlign: 'center',
										color: 'white'
									}}
								>
									<div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '4px' }}>12</div>
									<div style={{ fontSize: '10px', opacity: 0.9 }}>Tasks in Progress</div>
								</div>
								<div
									style={{
										background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
										borderRadius: '8px',
										padding: '12px',
										textAlign: 'center',
										color: 'white'
									}}
								>
									<div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '4px' }}>95%</div>
									<div style={{ fontSize: '10px', opacity: 0.9 }}>Sprint Completion</div>
								</div>
								<div
									style={{
										background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
										borderRadius: '8px',
										padding: '12px',
										textAlign: 'center',
										color: 'white'
									}}
								>
									<div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '4px' }}>24</div>
									<div style={{ fontSize: '10px', opacity: 0.9 }}>Messages Today</div>
								</div>
							</div>

							{/* Team Members */}
							<div style={{ marginBottom: '20px' }}>
								<h3 style={{ margin: '0 0 16px 0', color: 'var(--vscode-foreground)', fontSize: '18px', fontWeight: '600' }}>Team Members</h3>
								<div
									style={{
										display: 'grid',
										gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
										gap: '12px'
									}}
								>
									{[
										{
											name: 'Sarah Johnson',
											role: 'Product Owner',
											avatar: 'SJ',
											status: 'online',
											tasks: 5,
											lastActive: '2 min ago',
											currentTask: 'Reviewing user stories'
										},
										{
											name: 'Mike Chen',
											role: 'Scrum Master',
											avatar: 'MC',
											status: 'in-meeting',
											tasks: 3,
											lastActive: '15 min ago',
											currentTask: 'Sprint planning'
										},
										{
											name: 'Emily Davis',
											role: 'Senior Developer',
											avatar: 'ED',
											status: 'online',
											tasks: 4,
											lastActive: '5 min ago',
											currentTask: 'Code review'
										},
										{
											name: 'Alex Rodriguez',
											role: 'UI/UX Designer',
											avatar: 'AR',
											status: 'away',
											tasks: 2,
											lastActive: '1 hour ago',
											currentTask: 'Wireframe design'
										},
										{
											name: 'Lisa Wang',
											role: 'QA Engineer',
											avatar: 'LW',
											status: 'online',
											tasks: 6,
											lastActive: '1 min ago',
											currentTask: 'Test case execution'
										},
										{
											name: 'David Kim',
											role: 'DevOps Engineer',
											avatar: 'DK',
											status: 'busy',
											tasks: 3,
											lastActive: '30 min ago',
											currentTask: 'CI/CD pipeline'
										}
									].map(member => (
										<div
											key={member.name}
											style={{
												backgroundColor: 'var(--vscode-editor-background)',
												border: '1px solid var(--vscode-panel-border)',
												borderRadius: '8px',
												padding: '12px',
												display: 'flex',
												flexDirection: 'column',
												alignItems: 'center',
												textAlign: 'center',
												cursor: 'pointer',
												transition: 'transform 0.2s ease, box-shadow 0.2s ease'
											}}
											onMouseEnter={e => {
												e.currentTarget.style.transform = 'translateY(-2px)';
												e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
											}}
											onMouseLeave={e => {
												e.currentTarget.style.transform = 'translateY(0)';
												e.currentTarget.style.boxShadow = 'none';
											}}
										>
											{/* Avatar */}
											<div
												style={{
													width: '36px',
													height: '36px',
													borderRadius: '50%',
													background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
													display: 'flex',
													alignItems: 'center',
													justifyContent: 'center',
													color: 'white',
													fontWeight: 'bold',
													fontSize: '12px',
													position: 'relative',
													marginBottom: '6px'
												}}
											>
												{member.avatar}
												<div
													style={{
														position: 'absolute',
														bottom: '-2px',
														right: '-2px',
														width: '10px',
														height: '10px',
														borderRadius: '50%',
														backgroundColor: member.status === 'online' ? '#4caf50' : member.status === 'away' ? '#ff9800' : member.status === 'busy' ? '#f44336' : '#9e9e9e',
														border: '1px solid var(--vscode-editor-background)'
													}}
												/>
											</div>

											{/* Member Info */}
											<div style={{ width: '100%' }}>
												<div style={{ marginBottom: '6px' }}>
													<h4 style={{ margin: '0 0 2px 0', color: 'var(--vscode-foreground)', fontSize: '14px', fontWeight: '600' }}>{member.name}</h4>
													<span
														style={{
															fontSize: '9px',
															padding: '1px 4px',
															borderRadius: '6px',
															backgroundColor: member.status === 'online' ? 'rgba(76, 175, 80, 0.1)' : member.status === 'away' ? 'rgba(255, 152, 0, 0.1)' : member.status === 'busy' ? 'rgba(244, 67, 54, 0.1)' : 'rgba(158, 158, 158, 0.1)',
															color: member.status === 'online' ? '#4caf50' : member.status === 'away' ? '#ff9800' : member.status === 'busy' ? '#f44336' : '#9e9e9e',
															fontWeight: '500'
														}}
													>
														{member.status === 'in-meeting' ? 'meeting' : member.status}
													</span>
												</div>
												<p style={{ margin: '0 0 4px 0', color: 'var(--vscode-descriptionForeground)', fontSize: '11px' }}>{member.role}</p>
												<p style={{ margin: '0 0 6px 0', color: 'var(--vscode-foreground)', fontSize: '11px', lineHeight: '1.3' }}>{member.currentTask}</p>
												<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--vscode-descriptionForeground)' }}>
													<span>📋 {member.tasks}</span>
													<span>🕒 {member.lastActive}</span>
												</div>
											</div>
										</div>
									))}
								</div>
							</div>

							{/* Recent Activity */}
							<div>
								<h3 style={{ margin: '0 0 16px 0', color: 'var(--vscode-foreground)', fontSize: '18px', fontWeight: '600' }}>Recent Activity</h3>
								<div
									style={{
										backgroundColor: 'var(--vscode-editor-background)',
										border: '1px solid var(--vscode-panel-border)',
										borderRadius: '12px',
										padding: '20px'
									}}
								>
									{[
										{ user: 'Sarah Johnson', action: 'completed task', target: '"User authentication flow"', time: '5 min ago', type: 'task' },
										{ user: 'Mike Chen', action: 'commented on', target: '"Sprint Review Meeting"', time: '12 min ago', type: 'comment' },
										{ user: 'Emily Davis', action: 'pushed code to', target: 'feature/user-profile', time: '18 min ago', type: 'code' },
										{ user: 'Lisa Wang', action: 'reported bug in', target: 'QA-247', time: '25 min ago', type: 'bug' },
										{ user: 'Alex Rodriguez', action: 'shared design for', target: 'New Dashboard Layout', time: '32 min ago', type: 'design' }
									].map((activity, index) => (
										<div
											key={index}
											style={{
												display: 'flex',
												alignItems: 'center',
												gap: '12px',
												padding: '12px 0',
												borderBottom: index < 4 ? '1px solid var(--vscode-panel-border)' : 'none'
											}}
										>
											<div
												style={{
													width: '32px',
													height: '32px',
													borderRadius: '50%',
													background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
													display: 'flex',
													alignItems: 'center',
													justifyContent: 'center',
													color: 'white',
													fontSize: '12px',
													fontWeight: 'bold'
												}}
											>
												{activity.user
													.split(' ')
													.map(n => n[0])
													.join('')}
											</div>
											<div style={{ flex: 1 }}>
												<span style={{ color: 'var(--vscode-foreground)', fontSize: '13px' }}>
													<strong>{activity.user}</strong> {activity.action} <em style={{ color: 'var(--vscode-textLink-foreground)' }}>{activity.target}</em>
												</span>
												<div style={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)', marginTop: '2px' }}>{activity.time}</div>
											</div>
											<div style={{ fontSize: '14px' }}>
												{activity.type === 'task' && '✅'}
												{activity.type === 'comment' && '💬'}
												{activity.type === 'code' && '💻'}
												{activity.type === 'bug' && '🐛'}
												{activity.type === 'design' && '🎨'}
											</div>
										</div>
									))}
								</div>
							</div>
						</div>
					)}

					{activeSection === 'salesforce' && (
						<div style={{ padding: '20px' }}>
							{/* Salesforce Banners */}
							<div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
								{[
									{
										title: 'Salesforce CRM Fundamentals',
										kicker: 'PLATFORM',
										accent: '#7c4dff',
										bg: 'linear-gradient(135deg, #3a1c71 0%, #d76d77 50%, #ffaf7b 100%)',
										shadow: 'rgba(124, 77, 255, 0.25)',
										icon: TargetIcon
									},
									{
										title: 'Lightning Web Components',
										kicker: 'DEVELOPMENT',
										accent: '#00bcd4',
										bg: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
										shadow: 'rgba(0, 188, 212, 0.25)',
										icon: TrophyIcon
									},
									{
										title: 'Salesforce Integration APIs',
										kicker: 'CONNECTIVITY',
										accent: '#4caf50',
										bg: 'linear-gradient(135deg, #0f4c75 0%, #3282b8 50%, #bbe1fa 100%)',
										shadow: 'rgba(76, 175, 80, 0.25)',
										icon: ChartBarSquareIcon
									},
									{
										title: 'Salesforce Einstein AI',
										kicker: 'INTELLIGENCE',
										accent: '#ff9800',
										bg: 'linear-gradient(135deg, #2c3e50 0%, #34495e 50%, #7f8c8d 100%)',
										shadow: 'rgba(255, 152, 0, 0.25)',
										icon: LightBulbIcon
									},
									{
										title: 'Salesforce DevOps & CI/CD',
										kicker: 'AUTOMATION',
										accent: '#e91e63',
										bg: 'linear-gradient(135deg, #4a0e4e 0%, #7b1fa2 50%, #ba68c8 100%)',
										shadow: 'rgba(233, 30, 99, 0.25)',
										icon: ArrowPathIcon
									}
								].map(banner => (
									<div
										key={banner.title}
										style={{
											height: '110px',
											borderRadius: '16px',
											background: banner.bg,
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'space-between',
											padding: '16px 20px',
											color: '#ffffff',
											cursor: 'pointer',
											border: '1px solid rgba(255,255,255,0.1)',
											transition: 'transform 0.2s ease'
										}}
										onMouseEnter={e => {
											e.currentTarget.style.transform = 'translateY(-1px)';
										}}
										onMouseLeave={e => {
											e.currentTarget.style.transform = 'translateY(0)';
										}}
										onClick={() => {
											setSelectedTutorial(banner);
											setShowTutorial(true);
										}}
									>
										<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
											<div
												style={{
													fontSize: '11px',
													letterSpacing: '0.12em',
													fontWeight: 700,
													color: 'rgba(255,255,255,0.8)',
													textTransform: 'uppercase'
												}}
											>
												{banner.kicker}
											</div>
											<div style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>{banner.title}</div>
											<div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>Hands-on Salesforce development and administration.</div>
										</div>
										<div
											style={{
												width: '46px',
												height: '46px',
												borderRadius: '50%',
												backgroundColor: 'rgba(255,255,255,0.15)',
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												color: '#ffffff',
												border: `2px solid ${banner.accent}`,
												backdropFilter: 'blur(10px)'
											}}
										>
											<banner.icon />
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{activeSection === 'metrics' && (
						<div style={{ padding: '20px' }}>
							{/* Metrics Header */}
							<div style={{ marginBottom: '30px', textAlign: 'center' }}>
								<h2 style={{ margin: '0 0 8px 0', color: 'var(--vscode-foreground)', fontSize: '24px', fontWeight: '600' }}>Project Analytics</h2>
								<p style={{ margin: 0, color: 'var(--vscode-descriptionForeground)', fontSize: '14px' }}>Track performance, identify trends, and make data-driven decisions</p>
							</div>

							{/* Key Metrics Grid */}
							<div
								style={{
									display: 'grid',
									gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
									gap: '16px',
									marginBottom: '30px'
								}}
							>
								<div
									style={{
										background: 'linear-gradient(135deg, #3a1c71 0%, #d76d77 50%, #ffaf7b 100%)',
										borderRadius: '12px',
										padding: '20px',
										textAlign: 'center',
										color: 'white'
									}}
								>
									<div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>94%</div>
									<div style={{ fontSize: '12px', opacity: 0.9 }}>Sprint Velocity</div>
									<div style={{ fontSize: '10px', opacity: 0.7, marginTop: '4px' }}>↑ 12% from last sprint</div>
								</div>

								<div
									style={{
										background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
										borderRadius: '12px',
										padding: '20px',
										textAlign: 'center',
										color: 'white'
									}}
								>
									<div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>23</div>
									<div style={{ fontSize: '12px', opacity: 0.9 }}>Story Points Delivered</div>
									<div style={{ fontSize: '10px', opacity: 0.7, marginTop: '4px' }}>Target: 25 points</div>
								</div>

								<div
									style={{
										background: 'linear-gradient(135deg, #0f4c75 0%, #3282b8 50%, #bbe1fa 100%)',
										borderRadius: '12px',
										padding: '20px',
										textAlign: 'center',
										color: 'white'
									}}
								>
									<div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>4.2</div>
									<div style={{ fontSize: '12px', opacity: 0.9 }}>Avg Cycle Time (days)</div>
									<div style={{ fontSize: '10px', opacity: 0.7, marginTop: '4px' }}>↓ 18% improvement</div>
								</div>

								<div
									style={{
										background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 50%, #7f8c8d 100%)',
										borderRadius: '12px',
										padding: '20px',
										textAlign: 'center',
										color: 'white'
									}}
								>
									<div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>87%</div>
									<div style={{ fontSize: '12px', opacity: 0.9 }}>Test Coverage</div>
									<div style={{ fontSize: '10px', opacity: 0.7, marginTop: '4px' }}>↑ 5% from last month</div>
								</div>
							</div>

							{/* Charts Section */}
							<div style={{ marginBottom: '30px' }}>
								<h3 style={{ margin: '0 0 16px 0', color: 'var(--vscode-foreground)', fontSize: '18px', fontWeight: '600' }}>Burndown Chart</h3>
								<div
									style={{
										backgroundColor: 'var(--vscode-editor-background)',
										border: '1px solid var(--vscode-panel-border)',
										borderRadius: '12px',
										padding: '20px',
										height: '300px'
									}}
								>
									<svg width="100%" height="100%" viewBox="0 0 400 250" style={{ display: 'block' }}>
										{/* Grid lines */}
										<g stroke="var(--vscode-panel-border)" strokeWidth="0.5" opacity="0.3">
											{/* Horizontal grid lines */}
											<line x1="40" y1="30" x2="380" y2="30" />
											<line x1="40" y1="80" x2="380" y2="80" />
											<line x1="40" y1="130" x2="380" y2="130" />
											<line x1="40" y1="180" x2="380" y2="180" />
											<line x1="40" y1="230" x2="380" y2="230" />

											{/* Vertical grid lines */}
											<line x1="80" y1="20" x2="80" y2="230" />
											<line x1="140" y1="20" x2="140" y2="230" />
											<line x1="200" y1="20" x2="200" y2="230" />
											<line x1="260" y1="20" x2="260" y2="230" />
											<line x1="320" y1="20" x2="320" y2="230" />
										</g>

										{/* Ideal burndown line (straight line from 25 to 0) */}
										<path d="M40,230 L100,184 L160,138 L220,92 L280,46 L340,0" stroke="#4caf50" strokeWidth="3" fill="none" strokeDasharray="5,5" opacity="0.7" />

										{/* Actual burndown line (more realistic progress) */}
										<path d="M40,230 L100,200 L160,160 L220,140 L280,100 L340,60" stroke="#2196f3" strokeWidth="3" fill="none" />

										{/* Data points for actual line */}
										<circle cx="40" cy="230" r="4" fill="#2196f3" />
										<circle cx="100" cy="200" r="4" fill="#2196f3" />
										<circle cx="160" cy="160" r="4" fill="#2196f3" />
										<circle cx="220" cy="140" r="4" fill="#2196f3" />
										<circle cx="280" cy="100" r="4" fill="#2196f3" />
										<circle cx="340" cy="60" r="4" fill="#2196f3" />

										{/* Labels */}
										<text x="20" y="235" fontSize="10" fill="var(--vscode-descriptionForeground)" textAnchor="middle">
											25
										</text>
										<text x="20" y="185" fontSize="10" fill="var(--vscode-descriptionForeground)" textAnchor="middle">
											20
										</text>
										<text x="20" y="135" fontSize="10" fill="var(--vscode-descriptionForeground)" textAnchor="middle">
											15
										</text>
										<text x="20" y="85" fontSize="10" fill="var(--vscode-descriptionForeground)" textAnchor="middle">
											10
										</text>
										<text x="20" y="35" fontSize="10" fill="var(--vscode-descriptionForeground)" textAnchor="middle">
											5
										</text>
										<text x="20" y="10" fontSize="10" fill="var(--vscode-descriptionForeground)" textAnchor="middle">
											0
										</text>

										{/* Day labels */}
										<text x="40" y="250" fontSize="10" fill="var(--vscode-descriptionForeground)" textAnchor="middle">
											Day 1
										</text>
										<text x="100" y="250" fontSize="10" fill="var(--vscode-descriptionForeground)" textAnchor="middle">
											Day 2
										</text>
										<text x="160" y="250" fontSize="10" fill="var(--vscode-descriptionForeground)" textAnchor="middle">
											Day 3
										</text>
										<text x="220" y="250" fontSize="10" fill="var(--vscode-descriptionForeground)" textAnchor="middle">
											Day 4
										</text>
										<text x="280" y="250" fontSize="10" fill="var(--vscode-descriptionForeground)" textAnchor="middle">
											Day 5
										</text>
										<text x="340" y="250" fontSize="10" fill="var(--vscode-descriptionForeground)" textAnchor="middle">
											Day 6
										</text>

										{/* Legend */}
										<g transform="translate(40, 15)">
											<line x1="0" y1="0" x2="20" y2="0" stroke="#2196f3" strokeWidth="3" />
											<text x="25" y="4" fontSize="11" fill="var(--vscode-foreground)">
												Actual
											</text>

											<line x1="80" y1="0" x2="100" y2="0" stroke="#4caf50" strokeWidth="3" strokeDasharray="5,5" />
											<text x="105" y="4" fontSize="11" fill="var(--vscode-foreground)">
												Ideal
											</text>
										</g>

										{/* Title */}
										<text x="200" y="15" fontSize="14" fontWeight="bold" fill="var(--vscode-foreground)" textAnchor="middle">
											Sprint Burndown
										</text>
									</svg>
								</div>
							</div>

							{/* Additional Metrics */}
							<div
								style={{
									display: 'grid',
									gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
									gap: '16px'
								}}
							>
								<div
									style={{
										backgroundColor: 'var(--vscode-editor-background)',
										border: '1px solid var(--vscode-panel-border)',
										borderRadius: '8px',
										padding: '16px'
									}}
								>
									<h4 style={{ margin: '0 0 12px 0', color: 'var(--vscode-foreground)', fontSize: '14px' }}>Code Quality</h4>
									<div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
										<span style={{ fontSize: '18px', fontWeight: 'bold', color: '#4caf50' }}>A</span>
										<span style={{ color: 'var(--vscode-descriptionForeground)', fontSize: '12px' }}>Grade</span>
									</div>
									<div style={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)' }}>0 critical issues, 3 minor issues</div>
								</div>

								<div
									style={{
										backgroundColor: 'var(--vscode-editor-background)',
										border: '1px solid var(--vscode-panel-border)',
										borderRadius: '8px',
										padding: '16px'
									}}
								>
									<h4 style={{ margin: '0 0 12px 0', color: 'var(--vscode-foreground)', fontSize: '14px' }}>Team Productivity</h4>
									<div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
										<span style={{ fontSize: '18px', fontWeight: 'bold', color: '#2196f3' }}>8.5h</span>
										<span style={{ color: 'var(--vscode-descriptionForeground)', fontSize: '12px' }}>Avg daily</span>
									</div>
									<div style={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)' }}>↑ 15% from last month</div>
								</div>

								<div
									style={{
										backgroundColor: 'var(--vscode-editor-background)',
										border: '1px solid var(--vscode-panel-border)',
										borderRadius: '8px',
										padding: '16px'
									}}
								>
									<h4 style={{ margin: '0 0 12px 0', color: 'var(--vscode-foreground)', fontSize: '14px' }}>Risk Assessment</h4>
									<div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
										<span style={{ fontSize: '18px', fontWeight: 'bold', color: '#ff9800' }}>Medium</span>
										<span style={{ color: 'var(--vscode-descriptionForeground)', fontSize: '12px' }}>Risk Level</span>
									</div>
									<div style={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)' }}>2 dependencies need attention</div>
								</div>
							</div>
						</div>
					)}

					{/* Tutorial Content */}
					{showTutorial && selectedTutorial && (
						<div style={{ padding: '20px' }}>
							{/* Back Button */}
							<div style={{ marginBottom: '20px' }}>
								<button
									onClick={() => {
										setShowTutorial(false);
										setSelectedTutorial(null);
									}}
									style={{
										padding: '8px 16px',
										backgroundColor: 'var(--vscode-button-background)',
										color: 'var(--vscode-button-foreground)',
										border: 'none',
										borderRadius: '4px',
										cursor: 'pointer',
										fontSize: '14px',
										display: 'flex',
										alignItems: 'center',
										gap: '6px'
									}}
								>
									← Back to Salesforce
								</button>
							</div>

							{/* Tutorial Header */}
							<div
								style={{
									background: selectedTutorial.bg,
									borderRadius: '16px',
									padding: '24px',
									marginBottom: '24px',
									color: 'white'
								}}
							>
								<div
									style={{
										fontSize: '11px',
										letterSpacing: '0.12em',
										fontWeight: 700,
										color: 'rgba(255,255,255,0.8)',
										textTransform: 'uppercase',
										marginBottom: '8px'
									}}
								>
									{selectedTutorial.kicker}
								</div>
								<h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: 700 }}>{selectedTutorial.title}</h1>
								<p style={{ margin: 0, fontSize: '16px', opacity: 0.9 }}>Master {selectedTutorial.title.toLowerCase()} with hands-on examples and best practices.</p>
							</div>

							{/* Tutorial Content */}
							<div style={{ display: 'flex', gap: '24px' }}>
								{/* Main Content */}
								<div style={{ flex: 2 }}>
									{selectedTutorial.title === 'Salesforce CRM Fundamentals' && (
										<div>
											<h2>Understanding Salesforce CRM</h2>
											<p>Salesforce CRM is the world's leading customer relationship management platform that helps businesses connect with customers, partners, and prospects.</p>

											<h3>Key Concepts</h3>
											<ul>
												<li>
													<strong>Leads:</strong> Potential customers who have shown interest
												</li>
												<li>
													<strong>Accounts:</strong> Companies or organizations
												</li>
												<li>
													<strong>Contacts:</strong> Individuals within accounts
												</li>
												<li>
													<strong>Opportunities:</strong> Potential sales deals
												</li>
												<li>
													<strong>Cases:</strong> Customer support issues
												</li>
											</ul>

											<h3>Getting Started</h3>
											<p>Begin by familiarizing yourself with the Salesforce interface and basic navigation. Learn how to create and manage records, and understand the relationship between different objects.</p>

											<div
												style={{
													backgroundColor: 'var(--vscode-textBlockQuote-background)',
													borderLeft: '4px solid var(--vscode-textBlockQuote-border)',
													padding: '16px',
													margin: '20px 0',
													fontStyle: 'italic'
												}}
											>
												💡 <strong>Pro Tip:</strong> Always use the search functionality to quickly find records instead of browsing through long lists.
											</div>
										</div>
									)}

									{selectedTutorial.title === 'Lightning Web Components' && (
										<div>
											<h2>Building with Lightning Web Components</h2>
											<p>LWC is Salesforce's modern programming model for building fast, reusable components on the Lightning Platform.</p>

											<h3>Why LWC?</h3>
											<ul>
												<li>Based on web standards (HTML, CSS, JavaScript)</li>
												<li>Better performance than Aura components</li>
												<li>Reusable across Salesforce experiences</li>
												<li>Easier to learn for web developers</li>
											</ul>

											<h3>Basic Structure</h3>
											<pre
												style={{
													backgroundColor: 'var(--vscode-textCodeBlock-background)',
													padding: '16px',
													borderRadius: '4px',
													overflow: 'auto',
													fontSize: '14px'
												}}
											>
												{`// helloWorld.html
<template>
    <div class="slds-card">
        <div class="slds-card__header">
            <h2>Hello {greeting}!</h2>
        </div>
    </div>
</template>

// helloWorld.js
import { LightningElement, track } from 'lwc';

export default class HelloWorld extends LightningElement {
    @track greeting = 'World';
}

// helloWorld.css
.slds-card {
    margin: 10px;
}`}
											</pre>

											<h3>Best Practices</h3>
											<ul>
												<li>Use @track for reactive properties</li>
												<li>Leverage SLDS for consistent styling</li>
												<li>Test your components thoroughly</li>
												<li>Follow naming conventions</li>
											</ul>
										</div>
									)}

									{selectedTutorial.title === 'Salesforce Integration APIs' && (
										<div>
											<h2>Connecting Systems with Salesforce APIs</h2>
											<p>Salesforce provides powerful APIs to integrate with external systems and build connected experiences.</p>

											<h3>Available APIs</h3>
											<ul>
												<li>
													<strong>REST API:</strong> Standard RESTful web services
												</li>
												<li>
													<strong>SOAP API:</strong> Traditional SOAP-based web services
												</li>
												<li>
													<strong>Bulk API:</strong> For large data operations
												</li>
												<li>
													<strong>Streaming API:</strong> Real-time data updates
												</li>
												<li>
													<strong>Metadata API:</strong> Customize and manage metadata
												</li>
											</ul>

											<h3>Authentication</h3>
											<p>Use OAuth 2.0 for secure authentication. Salesforce supports various OAuth flows including:</p>
											<ul>
												<li>Authorization Code Flow</li>
												<li>Client Credentials Flow</li>
												<li>Username-Password Flow (for testing)</li>
											</ul>

											<h3>Example REST API Call</h3>
											<pre
												style={{
													backgroundColor: 'var(--vscode-textCodeBlock-background)',
													padding: '16px',
													borderRadius: '4px',
													overflow: 'auto',
													fontSize: '14px'
												}}
											>
												{`curl -X GET \\
  https://yourinstance.salesforce.com/services/data/v58.0/sobjects/Account/ \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \\
  -H "Content-Type: application/json"`}
											</pre>
										</div>
									)}

									{selectedTutorial.title === 'Salesforce Einstein AI' && (
										<div>
											<h2>Leveraging AI in Salesforce</h2>
											<p>Salesforce Einstein brings artificial intelligence capabilities to your CRM, helping you gain insights and automate processes.</p>

											<h3>Einstein Capabilities</h3>
											<ul>
												<li>
													<strong>Salesforce Einstein Sales:</strong> Predictive lead scoring and opportunity insights
												</li>
												<li>
													<strong>Salesforce Einstein Service:</strong> Case classification and automated solutions
												</li>
												<li>
													<strong>Salesforce Einstein Marketing:</strong> Personalized campaigns and recommendations
												</li>
												<li>
													<strong>Salesforce Einstein Relationship Insights:</strong> Contact and account insights
												</li>
											</ul>

											<h3>Getting Started</h3>
											<p>Enable Einstein in your org and configure it for your specific use cases. Make sure you have sufficient data for the AI models to learn from.</p>

											<h3>Best Practices</h3>
											<ul>
												<li>Ensure data quality for better predictions</li>
												<li>Start with pilot programs</li>
												<li>Monitor and refine AI recommendations</li>
												<li>Train users on interpreting AI insights</li>
											</ul>

											<div
												style={{
													backgroundColor: 'var(--vscode-textBlockQuote-background)',
													borderLeft: '4px solid var(--vscode-textBlockQuote-border)',
													padding: '16px',
													margin: '20px 0',
													fontStyle: 'italic'
												}}
											>
												🤖 <strong>Remember:</strong> AI is a tool to augment human intelligence, not replace it. Always validate AI recommendations with your business knowledge.
											</div>
										</div>
									)}

									{selectedTutorial.title === 'Salesforce DevOps & CI/CD' && (
										<div>
											<h2>Implementing DevOps in Salesforce</h2>
											<p>DevOps practices help teams deliver Salesforce changes faster and more reliably through automation and collaboration.</p>

											<h3>Key DevOps Concepts</h3>
											<ul>
												<li>
													<strong>Version Control:</strong> Git for source control
												</li>
												<li>
													<strong>CI/CD Pipelines:</strong> Automated testing and deployment
												</li>
												<li>
													<strong>Scratch Orgs:</strong> Temporary environments for development
												</li>
												<li>
													<strong>Sandboxes:</strong> Testing environments
												</li>
												<li>
													<strong>Change Sets:</strong> Deployment mechanism
												</li>
											</ul>

											<h3>Recommended Tools</h3>
											<ul>
												<li>
													<strong>Salesforce CLI:</strong> Command-line interface
												</li>
												<li>
													<strong>GitHub Actions:</strong> CI/CD platform
												</li>
												<li>
													<strong>CumulusCI:</strong> Open-source DevOps framework
												</li>
												<li>
													<strong>CodeScan:</strong> Static code analysis
												</li>
											</ul>

											<h3>Sample CI/CD Pipeline</h3>
											<pre
												style={{
													backgroundColor: 'var(--vscode-textCodeBlock-background)',
													padding: '16px',
													borderRadius: '4px',
													overflow: 'auto',
													fontSize: '12px'
												}}
											>
												{`name: Salesforce CI/CD
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install Salesforce CLI
        run: npm install -g @salesforce/cli
      - name: Authenticate
        run: echo \${{ secrets.SFDX_AUTH_URL }} > auth.txt
      - name: Run Tests
        run: sf apex run test --code-coverage --result-format json
      - name: Deploy to Sandbox
        if: github.ref == 'refs/heads/main'
        run: sf project deploy start --target-org sandbox`}
											</pre>

											<h3>Deployment Best Practices</h3>
											<ul>
												<li>Always test in scratch orgs first</li>
												<li>Use named credentials for authentication</li>
												<li>Implement proper rollback strategies</li>
												<li>Monitor deployment health</li>
											</ul>
										</div>
									)}
								</div>

								{/* Sidebar with Images */}
								<div style={{ flex: 1 }}>
									<div
										style={{
											backgroundColor: 'var(--vscode-editor-background)',
											borderRadius: '8px',
											padding: '16px',
											border: '1px solid var(--vscode-panel-border)'
										}}
									>
										<h3 style={{ margin: '0 0 16px 0', color: 'var(--vscode-foreground)' }}>Resources</h3>

										{selectedTutorial.title === 'Salesforce CRM Fundamentals' && (
											<div>
												<div
													style={{
														width: '100%',
														height: '150px',
														backgroundColor: '#f8f9fa',
														borderRadius: '8px',
														display: 'flex',
														alignItems: 'center',
														justifyContent: 'center',
														marginBottom: '12px',
														border: '2px dashed #dee2e6'
													}}
												>
													📊 CRM Dashboard Preview
												</div>
												<p style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)', margin: '8px 0' }}>Visual representation of Salesforce CRM interface showing leads, accounts, and opportunities.</p>
											</div>
										)}

										{selectedTutorial.title === 'Lightning Web Components' && (
											<div>
												<div
													style={{
														width: '100%',
														height: '150px',
														backgroundColor: '#f8f9fa',
														borderRadius: '8px',
														display: 'flex',
														alignItems: 'center',
														justifyContent: 'center',
														marginBottom: '12px',
														border: '2px dashed #0070d2'
													}}
												>
													⚡ LWC Component Demo
												</div>
												<p style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)', margin: '8px 0' }}>Example of a Lightning Web Component with interactive elements and Salesforce styling.</p>
											</div>
										)}

										{selectedTutorial.title === 'Salesforce Integration APIs' && (
											<div>
												<div
													style={{
														width: '100%',
														height: '150px',
														backgroundColor: '#f8f9fa',
														borderRadius: '8px',
														display: 'flex',
														alignItems: 'center',
														justifyContent: 'center',
														marginBottom: '12px',
														border: '2px dashed #00a1e0'
													}}
												>
													🔗 API Integration Flow
												</div>
												<p style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)', margin: '8px 0' }}>Diagram showing how external systems connect to Salesforce via REST and SOAP APIs.</p>
											</div>
										)}

										{selectedTutorial.title === 'Salesforce Einstein AI' && (
											<div>
												<div
													style={{
														width: '100%',
														height: '150px',
														backgroundColor: '#f8f9fa',
														borderRadius: '8px',
														display: 'flex',
														alignItems: 'center',
														justifyContent: 'center',
														marginBottom: '12px',
														border: '2px dashed #ff6b35'
													}}
												>
													🧠 Einstein AI Insights
												</div>
												<p style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)', margin: '8px 0' }}>Salesforce Einstein providing predictive analytics and AI-powered recommendations.</p>
											</div>
										)}

										{selectedTutorial.title === 'Salesforce DevOps & CI/CD' && (
											<div>
												<div
													style={{
														width: '100%',
														height: '150px',
														backgroundColor: '#f8f9fa',
														borderRadius: '8px',
														display: 'flex',
														alignItems: 'center',
														justifyContent: 'center',
														marginBottom: '12px',
														border: '2px dashed #54698d'
													}}
												>
													🔄 CI/CD Pipeline
												</div>
												<p style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)', margin: '8px 0' }}>Automated deployment pipeline for Salesforce development with testing and quality gates.</p>
											</div>
										)}

										<div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'var(--vscode-textBlockQuote-background)', borderRadius: '4px' }}>
											<h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--vscode-foreground)' }}>Next Steps</h4>
											<ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>
												<li>Complete hands-on exercises</li>
												<li>Take certification exam</li>
												<li>Join Trailhead community</li>
												<li>Practice in sandbox org</li>
											</ul>
										</div>
									</div>
								</div>
							</div>
						</div>
					)}

					{activeSection === 'assets' && (
						<div style={{ padding: '20px' }}>
							{/* Assets Grid */}
							<div
								style={{
									display: 'grid',
									gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
									gap: '16px',
									marginTop: '20px'
								}}
							>
								{[
									{
										title: 'Project Templates',
										description: 'Reusable project templates and checklists',
										icon: DocumentTextIcon,
										gradient: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
										shadow: 'rgba(30, 60, 114, 0.25)',
										accent: '#4a90e2'
									},
									{
										title: 'Dashboards',
										description: 'Interactive dashboards and reports',
										icon: ChartBarIcon,
										gradient: 'linear-gradient(135deg, #4a0e4e 0%, #7b1fa2 100%)',
										shadow: 'rgba(123, 31, 162, 0.25)',
										accent: '#9c27b0'
									},
									{
										title: 'Design Assets',
										description: 'Logos, icons, and design resources',
										icon: SwatchIcon,
										gradient: 'linear-gradient(135deg, #0f4c75 0%, #3282b8 100%)',
										shadow: 'rgba(15, 76, 117, 0.25)',
										accent: '#2196f3'
									},
									{
										title: 'Checklists',
										description: 'Standardized checklists and procedures',
										icon: ClipboardDocumentCheckIcon,
										gradient: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
										shadow: 'rgba(44, 62, 80, 0.25)',
										accent: '#607d8b'
									},
									{
										title: 'Documentation',
										description: 'Guides, manuals, and documentation',
										icon: BookOpenIcon,
										gradient: 'linear-gradient(135deg, #3a1c71 0%, #d76d77 100%)',
										shadow: 'rgba(58, 28, 113, 0.25)',
										accent: '#ff5722'
									},
									{
										title: 'Tools & Scripts',
										description: 'Automation scripts and utilities',
										icon: WrenchScrewdriverIcon,
										gradient: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
										shadow: 'rgba(19, 78, 94, 0.25)',
										accent: '#4caf50'
									}
								].map(asset => (
									<div
										key={asset.title}
										style={{
											background: asset.gradient,
											borderRadius: '12px',
											padding: '20px',
											display: 'flex',
											flexDirection: 'column',
											alignItems: 'center',
											textAlign: 'center',
											cursor: 'pointer',
											minHeight: '140px',
											border: '1px solid rgba(255,255,255,0.1)',
											transition: 'transform 0.2s ease'
										}}
										onMouseEnter={e => {
											e.currentTarget.style.transform = 'translateY(-1px)';
										}}
										onMouseLeave={e => {
											e.currentTarget.style.transform = 'translateY(0)';
										}}
									>
										<div style={{ marginBottom: '16px' }}>
											<asset.icon />
										</div>
										<h4
											style={{
												margin: '0 0 8px 0',
												color: '#ffffff',
												fontSize: '16px',
												fontWeight: '600'
											}}
										>
											{asset.title}
										</h4>
										<p
											style={{
												margin: 0,
												color: 'rgba(255,255,255,0.8)',
												fontSize: '12px',
												lineHeight: '1.4'
											}}
										>
											{asset.description}
										</p>
									</div>
								))}
							</div>
						</div>
					)}

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
