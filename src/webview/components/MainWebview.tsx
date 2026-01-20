import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import 'vscrui/dist/codicon.css';
import UserStoriesTable, { IterationsTable } from './common/UserStoriesTable';
import UserStoryForm from './common/UserStoryForm';
import TasksTable from './common/TasksTable';
import ScreenHeader from './common/ScreenHeader';
import NavigationBar from './common/NavigationBar';
import Calendar from './common/Calendar';
import SprintDetailsForm from './common/SprintDetailsForm';
import AssigneeHoursChart from './common/AssigneeHoursChart';

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
const TargetIcon = ({ size = '18px' }: { size?: string }) => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: size, height: size }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9s-2.015-9-4.5-9m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 2.84L5.107 14.668M5.107 14.668L9.468 6.98M5.107 14.668L9.468 6.98"
		/>
	</svg>
);

const TrophyIcon = ({ size = '18px' }: { size?: string }) => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: size, height: size }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236c.982.143 1.954.317 2.916.52a6.003 6.003 0 0 1 4.804 5.592M5.25 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0 1 7.73 9.728M5.25 4.236c.982.143 1.954.317 2.916.52a6.003 6.003 0 0 1 4.804 5.592m4.804-5.592a6.003 6.003 0 0 1 4.804-5.592 6.003 6.003 0 0 1 4.804 5.592M18.75 4.236c-.982.143-1.954.317-2.916.52a6.003 6.003 0 0 1 4.804 5.592M18.75 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 1 16.5 9.728"
		/>
	</svg>
);

const ChartBarSquareIcon = ({ size = '18px' }: { size?: string }) => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: size, height: size }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M7.5 14.25v2.25m3-6v6m3-10.5v10.5m3-6v6M3 16.5V18a2.25 2.25 0 0 0 2.25 2.25H18a2.25 2.25 0 0 0 2.25-2.25V16.5m-15 0H21m-21 0a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 6.75v7.5A2.25 2.25 0 0 1 18.75 16.5m-15 0H3m15-7.5V6.75a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v7.5c0 .414.336.75.75.75h10.5a.75.75 0 0 0 .75-.75V9m-9 0v.75h.75V9H9m3 0v.75h.75V9h-.75m3 0v.75h.75V9h-.75"
		/>
	</svg>
);

const LightBulbIcon = ({ size = '18px' }: { size?: string }) => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: size, height: size }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
		/>
	</svg>
);

const ArrowPathIcon = ({ size = '18px' }: { size?: string }) => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: size, height: size }}>
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

// Icons for user story detail tabs
const TasksTabIcon = ({ size = '14px' }: { size?: string }) => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: size, height: size }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M21.75 6.75a4.5 4.5 0 0 1-4.884 4.484c-1.076-.091-2.264.071-2.95.904l-7.152 8.684a2.548 2.548 0 1 1-3.586-3.586l8.684-7.152c.833-.686.995-1.874.904-2.95a4.5 4.5 0 0 1 6.336-4.486l-3.276 3.276a3.004 3.004 0 0 0 2.25 2.25l3.276-3.276c.256.565.398 1.192.398 1.852Z"
		/>
		<path strokeLinecap="round" strokeLinejoin="round" d="M4.867 19.125h.008v.008h-.008v-.008Z" />
	</svg>
);

const TestsTabIcon = ({ size = '14px' }: { size?: string }) => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: size, height: size }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M16.712 4.33a9.027 9.027 0 0 1 1.652 1.306c.51.51.944 1.064 1.306 1.652M16.712 4.33l-3.448 4.138m3.448-4.138a9.014 9.014 0 0 0-9.424 0M19.67 7.288l-4.138 3.448m4.138-3.448a9.014 9.014 0 0 1 0 9.424m-4.138-5.976a3.736 3.736 0 0 0-.88-1.388 3.737 3.737 0 0 0-1.388-.88m2.268 2.268a3.765 3.765 0 0 1 0 2.528m-2.268-4.796a3.765 3.765 0 0 0-2.528 0m4.796 4.796c-.181.506-.475.982-.88 1.388a3.736 3.736 0 0 1-1.388.88m2.268-2.268 4.138 3.448m0 0a9.027 9.027 0 0 1-1.306 1.652c-.51.51-1.064.944-1.652 1.306m0 0-3.448-4.138m3.448 4.138a9.014 9.014 0 0 1-9.424 0m5.976-4.138a3.765 3.765 0 0 1-2.528 0m0 0a3.736 3.736 0 0 1-1.388-.88 3.737 3.737 0 0 1-.88-1.388m2.268 2.268L7.288 19.67m0 0a9.024 9.024 0 0 1-1.652-1.306 9.027 9.027 0 0 1-1.306-1.652m0 0 4.138-3.448M4.33 16.712a9.014 9.014 0 0 1 0-9.424m4.138 5.976a3.765 3.765 0 0 1 0-2.528m0 0c.181-.506.475-.982.88-1.388a3.736 3.736 0 0 1 1.388-.88m-2.268 2.268L4.33 7.288m6.406 1.18L7.288 4.33m0 0a9.024 9.024 0 0 0-1.652 1.306A9.025 9.025 0 0 0 4.33 7.288"
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
	const [currentUser, setCurrentUser] = useState<any>(null);
	const [selectedTutorial, setSelectedTutorial] = useState<any>(null);
	const [showTutorial, setShowTutorial] = useState<boolean>(false);

	const [userStories, setUserStories] = useState<UserStory[]>([]);
	const [userStoriesLoading, setUserStoriesLoading] = useState(false);
	const [userStoriesError, setUserStoriesError] = useState<string | null>(null);
	const [selectedUserStory, setSelectedUserStory] = useState<UserStory | null>(null);

	const [tasks, setTasks] = useState<any[]>([]);
	const [tasksLoading, setTasksLoading] = useState(false);
	const [tasksError, setTasksError] = useState<string | null>(null);
	const [activeUserStoryTab, setActiveUserStoryTab] = useState<'tasks' | 'tests'>('tasks');

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

	const handleIterationClickFromCalendar = useCallback(
		(iteration: Iteration) => {
			setActiveSection('portfolio');
			handleIterationSelected(iteration);
		},
		[handleIterationSelected]
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
			setActiveUserStoryTab('tasks');
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
		setActiveUserStoryTab('tasks');
	}, []);

	const handleSectionChange = useCallback(
		(section: SectionType) => {
			setActiveSection(section);
			if (section === 'portfolio') {
				// Load iterations only if we don't already have them and we're not already loading / in error
				if (!iterations.length && !iterationsLoading && !iterationsError) {
					loadIterations();
				}
			}
		},
		[loadIterations, iterations, iterationsLoading, iterationsError]
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
						setCurrentUser(message.currentUser || null);

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
					{activeSection === 'calendar' && <Calendar currentDate={calendarDate} iterations={iterations} onMonthChange={setCalendarDate} debugMode={debugMode} currentUser={currentUser} onIterationClick={handleIterationClickFromCalendar} />}

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
										background: 'linear-gradient(135deg, #6b7a9a 0%, #7a6b9a 100%)',
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
										background: 'linear-gradient(135deg, #9a7a8a 0%, #9a6b7a 100%)',
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
										background: 'linear-gradient(135deg, #6b8a9a 0%, #7a9a9a 100%)',
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
										background: 'linear-gradient(135deg, #7a9a8a 0%, #8a9a7a 100%)',
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
												backgroundColor: '#1e1e1e',
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
													background: 'linear-gradient(135deg, #6b7a9a 0%, #7a6b9a 100%)',
													display: 'flex',
													alignItems: 'center',
													justifyContent: 'center',
													color: 'white',
													fontWeight: 'bold',
													fontSize: '12px',
													marginBottom: '6px'
												}}
											>
												{member.avatar}
											</div>

											{/* Member Info */}
											<div style={{ width: '100%' }}>
												<div style={{ marginBottom: '6px' }}>
													<h4 style={{ margin: '0 0 2px 0', color: 'var(--vscode-foreground)', fontSize: '14px', fontWeight: '600' }}>{member.name}</h4>
												</div>
												<p style={{ margin: '0 0 4px 0', color: 'var(--vscode-descriptionForeground)', fontSize: '11px' }}>{member.role}</p>
												<p style={{ margin: '0 0 0 0', color: 'var(--vscode-foreground)', fontSize: '11px', lineHeight: '1.3' }}>{member.currentTask}</p>
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

					{activeSection === 'salesforce' && !selectedTutorial && (
						<div style={{ padding: '20px' }}>
							{/* Salesforce Banners */}
							<div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
								{[
									{
										title: 'Salesforce CRM Fundamentals',
										kicker: 'PLATFORM',
										accent: '#c86dd7',
										bg: 'linear-gradient(135deg, #4a2c81 0%, #c86dd7 60%, #f0b7ff 100%)',
										shadow: 'rgba(72, 36, 129, 0.18)',
										icon: TargetIcon
									},
									{
										title: 'Lightning Web Components',
										kicker: 'DEVELOPMENT',
										accent: '#2a6fd8',
										bg: 'linear-gradient(135deg, #2e4c82 0%, #2a6fd8 100%)',
										shadow: 'rgba(30, 60, 114, 0.18)',
										icon: TrophyIcon
									},
									{
										title: 'Salesforce Integration APIs',
										kicker: 'CONNECTIVITY',
										accent: '#3a8bbb',
										bg: 'linear-gradient(135deg, #1f5c85 0%, #3a8bbb 60%, #c3e4ff 100%)',
										shadow: 'rgba(15, 76, 117, 0.18)',
										icon: ChartBarSquareIcon
									},
									{
										title: 'Salesforce Einstein AI',
										kicker: 'INTELLIGENCE',
										accent: '#546a8a',
										bg: 'linear-gradient(135deg, #3c4e60 0%, #546a8a 55%, #8a9ba6 100%)',
										shadow: 'rgba(44, 62, 80, 0.18)',
										icon: LightBulbIcon
									},
									{
										title: 'Salesforce DevOps & CI/CD',
										kicker: 'AUTOMATION',
										accent: '#b27bff',
										bg: 'linear-gradient(135deg, #5b3ea6 0%, #b27bff 55%, #e0c8ff 100%)',
										shadow: 'rgba(91, 62, 166, 0.18)',
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
											transition: 'transform 0.2s ease'
										}}
										onMouseEnter={e => {
											e.currentTarget.style.transform = 'translateY(-1px)';
										}}
										onMouseLeave={e => {
											e.currentTarget.style.transform = 'translateY(0)';
										}}
										onClick={() => {
											sendMessage({
												command: 'openTutorialInEditor',
												tutorial: {
													title: banner.title,
													kicker: banner.kicker,
													accent: banner.accent,
													bg: banner.bg,
													shadow: banner.shadow
												}
											});
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
												backgroundColor: '#f5f5f5',
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												color: banner.accent,
												border: `2px solid ${banner.accent}`,
												backdropFilter: 'blur(10px)'
											}}
										>
											{banner.icon && typeof banner.icon === 'function' ? <banner.icon size="28px" /> : <banner.icon />}
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
									gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
									gap: '16px',
									marginBottom: '30px'
								}}
							>
								<div
									style={{
										background: 'linear-gradient(135deg, #3a1c71 0%, #c86dd7 60%, #f0b7ff 100%)',
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
										background: 'linear-gradient(135deg, #1e3c72 0%, #3b6fd6 100%)',
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
										background: 'linear-gradient(135deg, #0f4c75 0%, #3a8bbb 60%, #c3e4ff 100%)',
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
										height: '300px',
										maxWidth: '90%',
										width: '90%',
										margin: '0 auto'
									}}
								>
									<svg width="100%" height="100%" viewBox="0 0 600 250" style={{ display: 'block' }}>
										{/* Grid lines */}
										<g stroke="var(--vscode-panel-border)" strokeWidth="0.5" opacity="0.3">
											{/* Horizontal grid lines */}
											<line x1="60" y1="30" x2="570" y2="30" />
											<line x1="60" y1="80" x2="570" y2="80" />
											<line x1="60" y1="130" x2="570" y2="130" />
											<line x1="60" y1="180" x2="570" y2="180" />
											<line x1="60" y1="230" x2="570" y2="230" />

											{/* Vertical grid lines */}
											<line x1="120" y1="20" x2="120" y2="230" />
											<line x1="210" y1="20" x2="210" y2="230" />
											<line x1="300" y1="20" x2="300" y2="230" />
											<line x1="390" y1="20" x2="390" y2="230" />
											<line x1="480" y1="20" x2="480" y2="230" />
										</g>

										{/* Ideal burndown line (straight line from 25 to 0) */}
										<path d="M60,230 L120,184 L180,138 L240,92 L300,46 L360,0 L420,-46 L480,-92 L540,-138" stroke="#4caf50" strokeWidth="3" fill="none" strokeDasharray="5,5" opacity="0.7" />

										{/* Actual burndown line (more realistic progress) */}
										<path d="M60,230 L120,200 L180,160 L240,140 L300,100 L360,60 L420,40 L480,20 L540,10" stroke="#2196f3" strokeWidth="3" fill="none" />

										{/* Data points for actual line */}
										<circle cx="60" cy="230" r="4" fill="#2196f3" />
										<circle cx="120" cy="200" r="4" fill="#2196f3" />
										<circle cx="180" cy="160" r="4" fill="#2196f3" />
										<circle cx="240" cy="140" r="4" fill="#2196f3" />
										<circle cx="300" cy="100" r="4" fill="#2196f3" />
										<circle cx="360" cy="60" r="4" fill="#2196f3" />
										<circle cx="420" cy="40" r="4" fill="#2196f3" />
										<circle cx="480" cy="20" r="4" fill="#2196f3" />
										<circle cx="540" cy="10" r="4" fill="#2196f3" />

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
										<text x="60" y="250" fontSize="10" fill="var(--vscode-descriptionForeground)" textAnchor="middle">
											Day 1
										</text>
										<text x="120" y="250" fontSize="10" fill="var(--vscode-descriptionForeground)" textAnchor="middle">
											Day 2
										</text>
										<text x="180" y="250" fontSize="10" fill="var(--vscode-descriptionForeground)" textAnchor="middle">
											Day 3
										</text>
										<text x="240" y="250" fontSize="10" fill="var(--vscode-descriptionForeground)" textAnchor="middle">
											Day 4
										</text>
										<text x="300" y="250" fontSize="10" fill="var(--vscode-descriptionForeground)" textAnchor="middle">
											Day 5
										</text>
										<text x="360" y="250" fontSize="10" fill="var(--vscode-descriptionForeground)" textAnchor="middle">
											Day 6
										</text>
										<text x="420" y="250" fontSize="10" fill="var(--vscode-descriptionForeground)" textAnchor="middle">
											Day 7
										</text>
										<text x="480" y="250" fontSize="10" fill="var(--vscode-descriptionForeground)" textAnchor="middle">
											Day 8
										</text>
										<text x="540" y="250" fontSize="10" fill="var(--vscode-descriptionForeground)" textAnchor="middle">
											Day 9
										</text>

										{/* Legend */}
										<g transform="translate(60, 15)">
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
										<text x="300" y="15" fontSize="14" fontWeight="bold" fill="var(--vscode-foreground)" textAnchor="middle">
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
					{selectedTutorial && (
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
									<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '16px', height: '16px', marginRight: '6px' }}>
										<path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
									</svg>
									Back to Salesforce
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
										gradient: 'linear-gradient(135deg, #4a2c81 0%, #c586d8 65%, #f2c7ff 100%)',
										shadow: 'rgba(72, 36, 129, 0.18)',
										accent: '#c586d8'
									},
									{
										title: 'Dashboards',
										description: 'Interactive dashboards and reports',
										icon: ChartBarIcon,
										gradient: 'linear-gradient(135deg, #2e4c82 0%, #3b6fd6 100%)',
										shadow: 'rgba(30, 60, 114, 0.18)',
										accent: '#3b6fd6'
									},
									{
										title: 'Lightning Web Components',
										description: 'Reusable Lightning components for Salesforce',
										icon: WrenchScrewdriverIcon,
										gradient: 'linear-gradient(135deg, #1f5c85 0%, #3a8bbb 60%, #c3e4ff 100%)',
										shadow: 'rgba(15, 76, 117, 0.18)',
										accent: '#3a8bbb'
									},
									{
										title: 'Checklists',
										description: 'Standardized checklists and procedures',
										icon: ClipboardDocumentCheckIcon,
										gradient: 'linear-gradient(135deg, #3c4e60 0%, #546a8a 55%, #8a9ba6 100%)',
										shadow: 'rgba(44, 62, 80, 0.18)',
										accent: '#546a8a'
									},
									{
										title: 'Documentation',
										description: 'Guides, manuals, and documentation',
										icon: BookOpenIcon,
										gradient: 'linear-gradient(135deg, #4a2c81 0%, #c586d8 65%, #f2c7ff 100%)',
										shadow: 'rgba(72, 36, 129, 0.18)',
										accent: '#c586d8'
									},
									{
										title: 'Tools & Scripts',
										description: 'Automation scripts and utilities',
										icon: WrenchScrewdriverIcon,
										gradient: 'linear-gradient(135deg, #2e4c82 0%, #3b6fd6 100%)',
										shadow: 'rgba(30, 60, 114, 0.18)',
										accent: '#3b6fd6'
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
									<SprintDetailsForm iteration={selectedIteration} />
									<AssigneeHoursChart userStories={userStories} />
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
									<ScreenHeader title={`${selectedUserStory.formattedId}: ${selectedUserStory.name}`} showBackButton={true} onBack={handleBackToUserStories} />
									<UserStoryForm userStory={selectedUserStory} />
									<div
										style={{
											marginTop: '8px',
											marginBottom: '4px',
											display: 'flex',
											gap: '8px',
											borderBottom: '1px solid var(--vscode-panel-border)'
										}}
									>
										<button
											type="button"
											onClick={() => setActiveUserStoryTab('tasks')}
											style={{
												display: 'inline-flex',
												alignItems: 'center',
												gap: '6px',
												padding: '6px 10px',
												border: 'none',
												borderBottom: activeUserStoryTab === 'tasks' ? '2px solid var(--vscode-textLink-foreground)' : '2px solid transparent',
												backgroundColor: 'transparent',
												color: activeUserStoryTab === 'tasks' ? 'var(--vscode-foreground)' : 'var(--vscode-descriptionForeground)',
												cursor: 'pointer',
												fontSize: '12px',
												fontWeight: activeUserStoryTab === 'tasks' ? 600 : 400
											}}
										>
											<TasksTabIcon />
											<span>Tasks</span>
										</button>
										<button
											type="button"
											onClick={() => setActiveUserStoryTab('tests')}
											style={{
												display: 'inline-flex',
												alignItems: 'center',
												gap: '6px',
												padding: '6px 10px',
												border: 'none',
												borderBottom: activeUserStoryTab === 'tests' ? '2px solid var(--vscode-textLink-foreground)' : '2px solid transparent',
												backgroundColor: 'transparent',
												color: activeUserStoryTab === 'tests' ? 'var(--vscode-foreground)' : 'var(--vscode-descriptionForeground)',
												cursor: 'pointer',
												fontSize: '12px',
												fontWeight: activeUserStoryTab === 'tests' ? 600 : 400
											}}
										>
											<TestsTabIcon />
											<span>Tests</span>
										</button>
									</div>
									{activeUserStoryTab === 'tasks' && <TasksTable tasks={tasks} loading={tasksLoading} error={tasksError} onLoadTasks={() => selectedUserStory && loadTasks(selectedUserStory.objectId)} />}
									{activeUserStoryTab === 'tests' && (
										<div
											style={{
												margin: '20px 0',
												padding: '20px',
												backgroundColor: '#282828',
												borderRadius: '6px'
											}}
										>
											<div
												style={{
													fontSize: '13px',
													color: 'var(--vscode-foreground)',
													marginBottom: '6px'
												}}
											>
												This user story has <strong>{typeof selectedUserStory.testCasesCount === 'number' ? selectedUserStory.testCasesCount : 0}</strong> test cases.
											</div>
											<div
												style={{
													fontSize: '12px',
													color: 'var(--vscode-descriptionForeground)'
												}}
											>
												Detailed test listing will be available in a future version of this view.
											</div>
										</div>
									)}
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
