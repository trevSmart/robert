/// <reference path="./common/CollapsibleCard.d.ts" />
import React, { FC } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import 'vscrui/dist/codicon.css';
import '@vscode/codicons/dist/codicon.css';
import UserStoriesTable, { IterationsTable } from './common/UserStoriesTable';
import UserStoryForm from './common/UserStoryForm';
import TasksTable from './common/TasksTable';
import DefectsTable from './common/DefectsTable';
import DefectForm from './common/DefectForm';
import DiscussionsTable from './common/DiscussionsTable';
import TestCasesTable from './common/TestCasesTable';
import ScreenHeader from './common/ScreenHeader';
import NavigationBar from './common/NavigationBar';
import SubTabsBar from './common/SubTabsBar';
import { getPortfolioSubTabs } from './sections/portfolio/portfolioSubTabs';
import SprintDetailsForm from './common/SprintDetailsForm';
import AssigneeHoursChart from './common/AssigneeHoursChart';
import './common/CollapsibleCard';
import CollaborationSection from './sections/CollaborationSection';
import CalendarSection from './sections/CalendarSection';
import LibrarySection, { type Tutorial } from './sections/LibrarySection';
import PortfolioSection, { type PortfolioViewType } from './sections/PortfolioSection';
import MetricsSection from './sections/MetricsSection';
import SearchSection from './sections/SearchSection';
import TeamSection from './sections/TeamSection';
import { logDebug } from '../utils/vscodeApi';
import { type UserStory, type Defect, type Discussion, type TestCase, type GlobalSearchResultItem } from '../../types/rally';
import type { Holiday } from '../../types/utils';
import { isLightTheme } from '../utils/themeColors';
import { calculateWIP, calculateBlockedItems, groupByState, aggregateDefectsBySeverity, calculateCompletedPoints, groupByBlockedStatus, type VelocityData, type StateDistribution, type DefectsBySeverity, type BlockedDistribution } from '../utils/metricsUtils';

import { CenteredContainer, Container, ContentArea, GlobalStyle, StickyNav } from './common/styled';
import { getVsCodeApi } from '../utils/vscodeApi';
import type { RallyTask, RallyDefect, RallyUser } from '../../types/rally';

type SectionType = 'search' | 'calendar' | 'portfolio' | 'team' | 'library' | 'metrics' | 'collaboration';
type ScreenType = 'iterations' | 'userStories' | 'userStoryDetail' | 'allUserStories' | 'defects' | 'defectDetail';

interface PortfolioViewProps {
	iterations: Iteration[];
	iterationsLoading: boolean;
	iterationsError: string | null;
	selectedIteration: Iteration | null;
	userStories: UserStory[];
	userStoriesLoading: boolean;
	userStoriesError: string | null;
	selectedUserStory: UserStory | null;
	userStoriesHasMore?: boolean;
	userStoriesLoadingMore?: boolean;
	loadMoreUserStories?: () => void;
	// Portfolio All User Stories props
	portfolioUserStories: UserStory[];
	portfolioUserStoriesLoading: boolean;
	portfolioUserStoriesHasMore?: boolean;
	portfolioUserStoriesLoadingMore?: boolean;
	// Sprint User Stories props
	sprintUserStories: UserStory[];
	sprintUserStoriesLoading: boolean;
	tasks: RallyTask[];
	tasksLoading: boolean;
	tasksError: string | null;
	userStoryDefects: RallyDefect[];
	userStoryDefectsLoading: boolean;
	_userStoryDefectsError: string | null;
	userStoryDiscussions: Discussion[];
	userStoryDiscussionsLoading: boolean;
	userStoryDiscussionsError: string | null;
	userStoryTestCases: TestCase[];
	userStoryTestCasesLoading: boolean;
	userStoryTestCasesError: string | null;
	_defects: RallyDefect[];
	_defectsLoading: boolean;
	_defectsError: string | null;
	_defectsHasMore?: boolean;
	_defectsLoadingMore?: boolean;
	_onLoadMoreDefects?: () => void;
	_selectedDefect: RallyDefect | null;
	activeUserStoryTab: 'tasks' | 'tests' | 'defects' | 'discussions';
	currentScreen: ScreenType;
	onLoadIterations: () => void;
	onIterationSelected: (iteration: Iteration) => void;
	onUserStorySelected: (userStory: UserStory) => void;
	onLoadUserStories: (iteration?: Iteration) => void;
	onClearUserStories: () => void;
	onLoadTasks: (userStoryId: string) => void;
	onLoadUserStoryDefects: (userStoryId: string) => void;
	_onLoadDefects: () => void;
	_onDefectSelected: (defect: RallyDefect) => void;
	onBackToIterations: () => void;
	onBackToUserStories: () => void;
	_onBackToDefects: () => void;
	onActiveUserStoryTabChange: (tab: 'tasks' | 'tests' | 'defects' | 'discussions') => void;
}

// Portfolio View Components
const BySprintsView: FC<PortfolioViewProps> = ({
	iterations,
	iterationsLoading,
	iterationsError,
	selectedIteration,
	sprintUserStories,
	sprintUserStoriesLoading,
	userStoriesError,
	selectedUserStory,
	tasks,
	tasksLoading,
	tasksError,
	userStoryDefects,
	userStoryDefectsLoading,
	_userStoryDefectsError,
	userStoryDiscussions,
	userStoryDiscussionsLoading,
	userStoryDiscussionsError,
	userStoryTestCases,
	userStoryTestCasesLoading,
	userStoryTestCasesError,
	_defects,
	_defectsLoading,
	_defectsError,
	_selectedDefect,
	activeUserStoryTab,
	currentScreen,
	onLoadIterations,
	onIterationSelected,
	onUserStorySelected,
	onLoadUserStories,
	onClearUserStories,
	onLoadTasks,
	onLoadUserStoryDefects,
	_onLoadDefects,
	_onDefectSelected,
	onBackToIterations,
	onBackToUserStories,
	_onBackToDefects,
	onActiveUserStoryTabChange
}) => {
	return (
		<>
			{currentScreen === 'iterations' && (
				<>
					<ScreenHeader title="Sprints" />
					<IterationsTable iterations={iterations} loading={iterationsLoading} error={iterationsError} onLoadIterations={onLoadIterations} onIterationSelected={onIterationSelected} selectedIteration={selectedIteration} />
				</>
			)}

			{currentScreen === 'userStories' && selectedIteration && (
				<>
					<ScreenHeader title={`User Stories - ${selectedIteration.name}`} showBackButton={true} onBack={onBackToIterations} />
					<collapsible-card title="Details">
						<SprintDetailsForm iteration={selectedIteration} />
					</collapsible-card>
					<collapsible-card title="User stories assignment">
						<AssigneeHoursChart userStories={sprintUserStories} />
					</collapsible-card>
					<collapsible-card title="User stories" background-color="inherit">
						<UserStoriesTable
							userStories={sprintUserStories}
							loading={sprintUserStoriesLoading}
							error={userStoriesError}
							onLoadUserStories={() => onLoadUserStories(selectedIteration)}
							onClearUserStories={onClearUserStories}
							onUserStorySelected={onUserStorySelected}
							selectedUserStory={selectedUserStory}
						/>
					</collapsible-card>
				</>
			)}

			{currentScreen === 'userStoryDetail' && selectedUserStory && (
				<>
					<ScreenHeader title={`${selectedUserStory.formattedId}: ${selectedUserStory.name}`} showBackButton={true} onBack={onBackToUserStories} />
					<UserStoryForm userStory={selectedUserStory} selectedAdditionalTab={activeUserStoryTab} onAdditionalTabChange={onActiveUserStoryTabChange} />
					{activeUserStoryTab === 'tasks' && <TasksTable tasks={tasks as any} loading={tasksLoading} error={tasksError} onLoadTasks={() => selectedUserStory && onLoadTasks(selectedUserStory.objectId)} />}
					{activeUserStoryTab === 'tests' && <TestCasesTable testCases={userStoryTestCases} loading={userStoryTestCasesLoading} error={userStoryTestCasesError || undefined} />}
					{activeUserStoryTab === 'defects' && (
						<DefectsTable
							defects={userStoryDefects as Defect[]}
							loading={userStoryDefectsLoading}
							error={_userStoryDefectsError || undefined}
							onLoadDefects={() => selectedUserStory && onLoadUserStoryDefects(selectedUserStory.objectId)}
							onDefectSelected={_onDefectSelected}
							selectedDefect={_selectedDefect as Defect | null}
						/>
					)}
					{activeUserStoryTab === 'discussions' && <DiscussionsTable discussions={userStoryDiscussions} loading={userStoryDiscussionsLoading} error={userStoryDiscussionsError} />}
				</>
			)}
		</>
	);
};

const AllUserStoriesView: FC<PortfolioViewProps> = ({
	portfolioUserStories,
	portfolioUserStoriesLoading,
	portfolioUserStoriesHasMore = false,
	portfolioUserStoriesLoadingMore = false,
	userStoriesError,
	selectedUserStory,
	tasks,
	tasksLoading,
	tasksError,
	userStoryDefects,
	userStoryDefectsLoading,
	_userStoryDefectsError,
	userStoryDiscussions,
	userStoryDiscussionsLoading,
	userStoryDiscussionsError,
	userStoryTestCases,
	userStoryTestCasesLoading,
	userStoryTestCasesError,
	_selectedDefect,
	activeUserStoryTab,
	currentScreen,
	onLoadUserStories,
	onClearUserStories,
	onUserStorySelected,
	onLoadTasks,
	onLoadUserStoryDefects,
	_onDefectSelected,
	onBackToUserStories,
	onActiveUserStoryTabChange,
	loadMoreUserStories
}) => (
	<>
		{currentScreen === 'allUserStories' && !selectedUserStory && (
			<>
				<ScreenHeader title="All User Stories" />
				<UserStoriesTable
					userStories={portfolioUserStories}
					loading={portfolioUserStoriesLoading}
					error={userStoriesError}
					onLoadUserStories={() => onLoadUserStories()} // Load all user stories
					onClearUserStories={onClearUserStories}
					onUserStorySelected={onUserStorySelected}
					selectedUserStory={selectedUserStory}
					hasMore={portfolioUserStoriesHasMore}
					onLoadMore={loadMoreUserStories}
					loadingMore={portfolioUserStoriesLoadingMore}
				/>
			</>
		)}

		{currentScreen === 'userStoryDetail' && selectedUserStory && (
			<>
				<ScreenHeader title={`${selectedUserStory.formattedId}: ${selectedUserStory.name}`} showBackButton={true} onBack={onBackToUserStories} />
				<UserStoryForm userStory={selectedUserStory} selectedAdditionalTab={activeUserStoryTab} onAdditionalTabChange={onActiveUserStoryTabChange} />
				{activeUserStoryTab === 'tasks' && <TasksTable tasks={tasks as any} loading={tasksLoading} error={tasksError} onLoadTasks={() => selectedUserStory && onLoadTasks(selectedUserStory.objectId)} />}
				{activeUserStoryTab === 'tests' && <TestCasesTable testCases={userStoryTestCases} loading={userStoryTestCasesLoading} error={userStoryTestCasesError || undefined} />}
				{activeUserStoryTab === 'defects' && (
					<DefectsTable
						defects={userStoryDefects as Defect[]}
						loading={userStoryDefectsLoading}
						error={_userStoryDefectsError || undefined}
						onLoadDefects={() => selectedUserStory && onLoadUserStoryDefects(selectedUserStory.objectId)}
						onDefectSelected={_onDefectSelected}
						selectedDefect={_selectedDefect as Defect | null}
					/>
				)}
				{activeUserStoryTab === 'discussions' && <DiscussionsTable discussions={userStoryDiscussions} loading={userStoryDiscussionsLoading} error={userStoryDiscussionsError} />}
			</>
		)}
	</>
);

const AllDefectsView: FC<PortfolioViewProps> = ({ _defects, _defectsLoading, _defectsError, _selectedDefect, currentScreen, _onLoadDefects, _onDefectSelected, _onBackToDefects, _defectsHasMore = false, _defectsLoadingMore = false, _onLoadMoreDefects }) => {
	logDebug(`_onDefectSelected: ${JSON.stringify(_onDefectSelected)}, currentScreen: ${currentScreen}`, 'AllDefectsView');
	return (
		<>
			{currentScreen === 'defects' && (
				<>
					<ScreenHeader title="All Defects" />
					<DefectsTable
						defects={_defects as Defect[]}
						loading={_defectsLoading}
						error={_defectsError || undefined}
						onLoadDefects={_onLoadDefects}
						onDefectSelected={_onDefectSelected}
						selectedDefect={_selectedDefect as Defect | null}
						hasMore={_defectsHasMore}
						onLoadMore={_onLoadMoreDefects}
						loadingMore={_defectsLoadingMore}
					/>
				</>
			)}
			{currentScreen === 'defectDetail' && _selectedDefect && (
				<>
					<ScreenHeader title={`${_selectedDefect.formattedId}: ${_selectedDefect.name}`} showBackButton={true} onBack={_onBackToDefects} />
					<DefectForm defect={_selectedDefect as Defect} />
				</>
			)}
		</>
	);
};

// Portfolio Views Configuration
// Icon components for portfolio tabs
const SprintsIcon = ({ size = '18px' }: { size?: string }) => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: size, height: size }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M6.75 2.994v2.25m10.5-2.25v2.25m-14.252 13.5V7.491a2.25 2.25 0 0 1 2.25-2.25h13.5a2.25 2.25 0 0 1 2.25 2.25v11.251m-18 0a2.25 2.25 0 0 0 2.25 2.25h13.5a2.25 2.25 0 0 0 2.25-2.25m-18 0v-7.5a2.25 2.25 0 0 1 2.25-2.25h13.5a2.25 2.25 0 0 1 2.25 2.25v7.5m-6.75-6h2.25m-9 2.25h4.5m.002-2.25h.005v.006H12v-.006Zm-.001 4.5h.006v.006h-.006v-.005Zm-2.25.001h.005v.006H9.75v-.006Zm-2.25 0h.005v.005h-.006v-.005Zm6.75-2.247h.005v.005h-.005v-.005Zm0 2.247h.006v.006h-.006v-.006Zm2.25-2.248h.006V15H16.5v-.005Z"
		/>
	</svg>
);

const UserStoriesIcon = ({ size = '18px' }: { size?: string }) => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: size, height: size }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 0 1-.657.643 48.39 48.39 0 0 1-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 0 1-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 0 0-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 0 1-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 0 0 .657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 0 1-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 0 0 5.427-.63 48.05 48.05 0 0 0 .582-4.717.532.532 0 0 0-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 0 0 .658-.663 48.422 48.422 0 0 0-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 0 1-.61-.58v0Z"
		/>
	</svg>
);

const DefectsIcon = ({ size = '18px' }: { size?: string }) => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: size, height: size }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M12 12.75c1.148 0 2.278.08 3.383.237 1.037.146 1.866.966 1.866 2.013 0 3.728-2.35 6.75-5.25 6.75S6.75 18.728 6.75 15c0-1.046.83-1.867 1.866-2.013A24.204 24.204 0 0 1 12 12.75Zm0 0c2.883 0 5.647.508 8.207 1.44a23.91 23.91 0 0 1-1.152 6.06M12 12.75c-2.883 0-5.647.508-8.208 1.44.125 2.104.52 4.136 1.153 6.06M12 12.75a2.25 2.25 0 0 0 2.248-2.354M12 12.75a2.25 2.25 0 0 1-2.248-2.354M12 8.25c.995 0 1.971-.08 2.922-.236.403-.066.74-.358.795-.762a3.778 3.778 0 0 0-.399-2.25M12 8.25c-.995 0-1.97-.08-2.922-.236-.402-.066-.74-.358-.795-.762a3.734 3.734 0 0 1 .4-2.253M12 8.25a2.25 2.25 0 0 0-2.248 2.146M12 8.25a2.25 2.25 0 0 1 2.248 2.146M8.683 5a6.032 6.032 0 0 1-1.155-1.002c.07-.63.27-1.222.574-1.747m.581 2.749A3.75 3.75 0 0 1 15.318 5m0 0c.427-.283.815-.62 1.155-.999a4.471 4.471 0 0 0-.575-1.752M4.921 6a24.048 24.048 0 0 0-.392 3.314c1.668.546 3.416.914 5.223 1.082M19.08 6c.205 1.08.337 2.187.392 3.314a23.882 23.882 0 0 1-5.223 1.082"
		/>
	</svg>
);

const portfolioViews: PortfolioViewConfig[] = [
	{
		id: 'bySprints',
		label: 'Sprints',
		icon: 'sprints',
		description: 'View user stories organized by sprints',
		component: BySprintsView,
		dataLoader: () => Promise.resolve(), // Will be set dynamically
		stateCleaner: () => {} // Will be set dynamically
	},
	{
		id: 'allUserStories',
		label: 'User Stories',
		icon: 'user-stories',
		description: 'View all user stories in the project',
		component: AllUserStoriesView,
		dataLoader: () => Promise.resolve(), // Will be set dynamically
		stateCleaner: () => {} // Will be set dynamically
	},
	{
		id: 'allDefects',
		label: 'Defects',
		icon: 'bug',
		description: 'View all defects in the project',
		component: AllDefectsView,
		dataLoader: () => Promise.resolve(), // Will be set dynamically
		stateCleaner: () => {} // Will be set dynamically
	}
];

// Portfolio View Selector Component (Tab-like appearance)
const PortfolioViewSelector: FC<{
	views: PortfolioViewConfig[];
	activeView: PortfolioViewType;
	onViewChange: (viewId: PortfolioViewType) => void;
}> = ({ views, activeView, onViewChange }) => {
	const lightTheme = isLightTheme();
	const [hoveredTab, setHoveredTab] = useState<PortfolioViewType | null>(null);

	// Memoize hover background color based on theme
	const hoverBackgroundColor = useMemo(() => (lightTheme ? 'rgba(0, 123, 255, 0.05)' : 'rgba(255, 255, 255, 0.05)'), [lightTheme]);

	const renderIcon = (icon?: string) => {
		switch (icon) {
			case 'sprints':
				return <SprintsIcon />;
			case 'user-stories':
				return <UserStoriesIcon />;
			case 'bug':
				return <DefectsIcon />;
			default:
				return null;
		}
	};

	const getSubTabStyles = (isActive: boolean, index: number, totalTabs: number, isHovered: boolean) => {
		return {
			padding: '10px 16px 6px',
			border: 'none',
			borderBottom: isActive
				? lightTheme
					? '2px solid #007acc' // Darker blue for better visibility in light themes
					: '2px solid var(--vscode-progressBar-background)' // Standard color for dark themes
				: '2px solid transparent',
			borderRadius: index === 0 ? '6px 0 0 0' : index === totalTabs - 1 ? '0 6px 0 0' : '0',
			backgroundColor: !isActive && isHovered ? hoverBackgroundColor : 'transparent',
			color: isActive
				? lightTheme
					? '#1e1e1e' // Dark color to ensure contrast in light themes
					: 'var(--vscode-tab-activeForeground)' // Standard color for dark themes
				: lightTheme
					? '#333333'
					: 'var(--vscode-tab-inactiveForeground)',
			cursor: isActive ? 'default' : 'pointer',
			display: 'flex',
			alignItems: 'center',
			gap: '8px',
			fontSize: '12.4px',
			fontWeight: isActive ? 600 : 400,
			transition: 'all 0.15s ease',
			position: 'relative' as const,
			zIndex: isActive ? 1 : 0
		};
	};

	return (
		<div
			style={{
				marginBottom: '20px',
				display: 'flex',
				borderBottom: '1px solid var(--vscode-panel-border)',
				borderRadius: '6px 6px 0 0'
			}}
		>
			{views.map((view, index) => (
				<button
					key={view.id}
					className={`portfolio-sub-tab ${activeView === view.id ? 'portfolio-sub-tab-active' : ''}`}
					onClick={() => activeView !== view.id && onViewChange(view.id)}
					onMouseEnter={() => setHoveredTab(view.id)}
					onMouseLeave={() => setHoveredTab(null)}
					style={getSubTabStyles(activeView === view.id, index, views.length, hoveredTab === view.id)}
					title={view.description}
				>
					{renderIcon(view.icon)}
					<span>{view.label}</span>
				</button>
			))}
		</div>
	);
};

interface MainWebviewProps {
	webviewId: string;
	context: string;
	timestamp: string;
	_rebusLogoUri: string;
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

const MainWebview: FC<MainWebviewProps> = ({ webviewId, context, _rebusLogoUri }) => {
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
	const [iterationsLoading, setIterationsLoading] = useState(true);
	const [iterationsError, setIterationsError] = useState<string | null>(null);
	const [selectedIteration, setSelectedIteration] = useState<Iteration | null>(null);
	const [debugMode, setDebugMode] = useState<boolean>(false);
	const [currentUser, setCurrentUser] = useState<RallyUser | null>(null);
	const [holidays, setHolidays] = useState<Holiday[]>([]);
	const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);
	const [_showTutorial, setShowTutorial] = useState<boolean>(false);

	const [userStories, setUserStories] = useState<UserStory[]>([]);
	const [userStoriesLoading, setUserStoriesLoading] = useState(false);
	const [userStoriesError, setUserStoriesError] = useState<string | null>(null);
	const [selectedUserStory, setSelectedUserStory] = useState<UserStory | null>(null);
	const [, setUserStoriesOffset] = useState(0);
	const [userStoriesHasMore, setUserStoriesHasMore] = useState(false);
	const [userStoriesLoadingMore, setUserStoriesLoadingMore] = useState(false);

	// Portfolio All User Stories state (separate from sprint-filtered stories)
	const [portfolioUserStories, setPortfolioUserStories] = useState<UserStory[]>([]);
	const [portfolioUserStoriesOffset, setPortfolioUserStoriesOffset] = useState(0);
	const [portfolioUserStoriesHasMore, setPortfolioUserStoriesHasMore] = useState(false);
	const [portfolioUserStoriesLoading, setPortfolioUserStoriesLoading] = useState(false);
	const [portfolioUserStoriesLoadingMore, setPortfolioUserStoriesLoadingMore] = useState(false);

	// Sprint-filtered User Stories state
	const [sprintUserStories, setSprintUserStories] = useState<UserStory[]>([]);
	const [sprintUserStoriesLoading, setSprintUserStoriesLoading] = useState(false);

	const [tasks, setTasks] = useState<RallyTask[]>([]);
	const [tasksLoading, setTasksLoading] = useState(false);
	const [tasksError, setTasksError] = useState<string | null>(null);
	const [activeUserStoryTab, setActiveUserStoryTab] = useState<'tasks' | 'tests' | 'defects' | 'discussions'>('tasks');

	const [defects, setDefects] = useState<RallyDefect[]>([]);
	const [defectsLoading, setDefectsLoading] = useState(false);
	const [defectsError, setDefectsError] = useState<string | null>(null);
	const [selectedDefect, setSelectedDefect] = useState<RallyDefect | null>(null);
	const [defectsOffset, setDefectsOffset] = useState(0);
	const [defectsHasMore, setDefectsHasMore] = useState(false);
	const [defectsLoadingMore, setDefectsLoadingMore] = useState(false);

	const [userStoryDefects, setUserStoryDefects] = useState<RallyDefect[]>([]);
	const [userStoryDefectsLoading, setUserStoryDefectsLoading] = useState(false);
	const [userStoryDefectsError, setUserStoryDefectsError] = useState<string | null>(null);

	const [userStoryDiscussions, setUserStoryDiscussions] = useState<Discussion[]>([]);
	const [userStoryDiscussionsLoading, setUserStoryDiscussionsLoading] = useState(false);
	const [userStoryDiscussionsError, setUserStoryDiscussionsError] = useState<string | null>(null);

	const [userStoryTestCases, setUserStoryTestCases] = useState<TestCase[]>([]);
	const [userStoryTestCasesLoading, setUserStoryTestCasesLoading] = useState(false);
	const [userStoryTestCasesError, setUserStoryTestCasesError] = useState<string | null>(null);

	// Collaboration help requests count
	const [collaborationHelpRequestsCount, setCollaborationHelpRequestsCount] = useState(0);

	// Team members state
	// Team members state
	const [teamMembers, setTeamMembers] = useState<
		Array<{
			name: string;
			progress: {
				completedHours: number;
				totalHours: number;
				percentage: number;
				source: string;
			};
		}>
	>([]);
	const [teamMembersLoading, setTeamMembersLoading] = useState(false);
	const [teamMembersError, setTeamMembersError] = useState<string | null>(null);
	const [selectedTeamIteration, setSelectedTeamIteration] = useState<string>('current'); // 'current' or iteration objectId

	// Metrics state - each chart has independent loading state
	const [metricsLoading, setMetricsLoading] = useState(false);
	const [velocityData, setVelocityData] = useState<VelocityData[]>([]);
	const [velocityLoading, setVelocityLoading] = useState(false);
	const [stateDistribution, setStateDistribution] = useState<StateDistribution[]>([]);
	const [stateDistributionLoading, setStateDistributionLoading] = useState(false);
	const [nextSprintName, setNextSprintName] = useState<string>('Next Sprint');
	const [selectedReadinessSprint, setSelectedReadinessSprint] = useState<string>('next'); // 'next' or iteration name
	const [blockedDistribution, setBlockedDistribution] = useState<BlockedDistribution[]>([]);
	const [defectsBySeverity, setDefectsBySeverity] = useState<DefectsBySeverity[]>([]);
	const [defectsBySeverityLoading, setDefectsBySeverityLoading] = useState(false);
	const [averageVelocity, setAverageVelocity] = useState<number>(0);
	const [completedPoints, setCompletedPoints] = useState<number>(0);
	const [wip, setWip] = useState<number>(0);
	const [blockedItems, setBlockedItems] = useState<number>(0);

	// Global search state
	const [globalSearchTerm, setGlobalSearchTerm] = useState('');
	const [globalSearchResults, setGlobalSearchResults] = useState<GlobalSearchResultItem[]>([]);
	const [globalSearchLoading, setGlobalSearchLoading] = useState(false);
	const [globalSearchError, setGlobalSearchError] = useState<string | null>(null);
	// When opening a user story from a task/testcase search result, which tab to select
	const pendingSearchUserStoryTabRef = useRef<'tasks' | 'tests' | null>(null);
	// Ref for search input to focus when search tab is selected
	const searchInputRef = useRef<HTMLInputElement>(null);

	// Navigation state
	const [activeSection, setActiveSection] = useState<SectionType>('calendar');
	const [currentScreen, setCurrentScreen] = useState<ScreenType>('iterations');
	const [activeSubTabBySection, setActiveSubTabBySection] = useState<Partial<Record<SectionType, string>>>({ portfolio: 'bySprints' });
	const [calendarDate, setCalendarDate] = useState(new Date());

	const portfolioActiveViewType = (activeSubTabBySection['portfolio'] ?? 'bySprints') as PortfolioViewType;

	// Track if we've already loaded iterations for portfolio to avoid cascading renders
	const hasLoadedPortfolioIterations = useRef(false);

	// Track if we've already loaded iterations for calendar to avoid cascading renders
	const hasLoadedCalendarIterations = useRef(false);

	// Track which portfolio views have been loaded to avoid redundant fetches
	const loadedViews = useRef<Set<PortfolioViewType>>(new Set());

	// Track which user stories have already been attempted to load defects for (by objectId)
	const attemptedUserStoryDefects = useRef<Set<string>>(new Set());

	// Track which user stories have already been attempted to load discussions for (by objectId)
	const attemptedUserStoryDiscussions = useRef<Set<string>>(new Set());

	// Track which user stories have already been attempted to load tests for (by objectId)
	const attemptedUserStoryTests = useRef<Set<string>>(new Set());

	// Track if we've loaded velocity data for metrics (reset when leaving metrics)
	const hasLoadedVelocityDataForMetrics = useRef(false);

	const loadIterations = useCallback(() => {
		setIterationsLoading(true);
		setIterationsError(null);
		sendMessage({
			command: 'loadIterations'
		});
	}, [sendMessage]);

	const loadTeamMembers = useCallback(
		(iterationId?: string) => {
			setTeamMembersLoading(true);
			setTeamMembersError(null);
			sendMessage({
				command: 'loadTeamMembers',
				iterationId: iterationId
			});
		},
		[sendMessage]
	);

	const runGlobalSearch = useCallback(
		(term: string) => {
			const t = (term || '').trim();
			if (!t) return;
			setGlobalSearchLoading(true);
			setGlobalSearchError(null);
			setGlobalSearchResults([]);
			sendMessage({
				command: 'globalSearch',
				term: t,
				limitPerType: 15
			});
		},
		[sendMessage]
	);

	const openSearchResult = useCallback(
		(item: GlobalSearchResultItem) => {
			if (item.entityType === 'userstory') {
				pendingSearchUserStoryTabRef.current = null;
				sendMessage({ command: 'loadUserStoryByObjectId', objectId: item.objectId });
			} else if (item.entityType === 'defect') {
				sendMessage({ command: 'loadDefectByObjectId', objectId: item.objectId });
			} else if (item.entityType === 'task') {
				pendingSearchUserStoryTabRef.current = 'tasks';
				sendMessage({ command: 'loadTaskWithParent', objectId: item.objectId });
			} else if (item.entityType === 'testcase') {
				pendingSearchUserStoryTabRef.current = 'tests';
				sendMessage({ command: 'loadTestCaseWithParent', objectId: item.objectId });
			}
		},
		[sendMessage]
	);

	const loadUserStories = useCallback(
		(iteration?: Iteration) => {
			if (iteration) {
				// Sprint context - use sprint state
				setSprintUserStoriesLoading(true);
				setUserStoriesError(null);
				setSprintUserStories([]); // Clear previous sprint data
			} else {
				// Fallback to portfolio state if no iteration
				setPortfolioUserStoriesLoading(true);
				setUserStoriesError(null);
			}

			// Keep backward compatibility
			setUserStoriesLoading(true);

			sendMessage({
				command: 'loadUserStories',
				iteration: iteration ? iteration._ref : undefined
			});
		},
		[sendMessage]
	);

	const loadAllUserStories = useCallback(() => {
		setPortfolioUserStoriesLoading(true);
		setUserStoriesError(null);
		setPortfolioUserStoriesOffset(0);
		setPortfolioUserStories([]);

		// Keep backward compatibility
		setUserStoriesLoading(true);
		setUserStoriesOffset(0);
		setUserStories([]);

		sendMessage({
			command: 'loadUserStories',
			offset: 0
			// Sense filtre d'iteration = carrega totes les US del projecte
		});
	}, [sendMessage]);

	const loadAllDefects = useCallback(() => {
		setDefectsLoading(true);
		setDefectsError(null);
		setDefectsOffset(0);
		setDefects([]);
		sendMessage({
			command: 'loadDefects',
			offset: 0
		});
	}, [sendMessage]);

	const loadMoreUserStories = useCallback(() => {
		setPortfolioUserStoriesLoadingMore(true);

		// Keep backward compatibility
		setUserStoriesLoadingMore(true);

		const nextOffset = portfolioUserStoriesOffset + 100;
		sendMessage({
			command: 'loadUserStories',
			offset: nextOffset
		});
	}, [sendMessage, portfolioUserStoriesOffset]);

	const loadMoreDefects = useCallback(() => {
		setDefectsLoadingMore(true);
		const nextOffset = defectsOffset + 100;
		sendMessage({
			command: 'loadDefects',
			offset: nextOffset
		});
	}, [sendMessage, defectsOffset]);

	const loadUserStoryDefects = useCallback(
		(userStoryId: string) => {
			setUserStoryDefectsLoading(true);
			setUserStoryDefectsError(null);
			sendMessage({
				command: 'loadUserStoryDefects',
				userStoryId
			});
		},
		[sendMessage]
	);

	const loadUserStoryDiscussions = useCallback(
		(userStoryId: string) => {
			setUserStoryDiscussionsLoading(true);
			setUserStoryDiscussionsError(null);
			sendMessage({
				command: 'loadUserStoryDiscussions',
				userStoryId
			});
		},
		[sendMessage]
	);

	const loadUserStoryTests = useCallback(
		(userStoryId: string) => {
			setUserStoryTestCasesLoading(true);
			setUserStoryTestCasesError(null);
			sendMessage({
				command: 'loadUserStoryTests',
				userStoryId
			});
		},
		[sendMessage]
	);

	const handleDefectSelected = useCallback((defect: RallyDefect) => {
		setSelectedDefect(defect);
		setCurrentScreen('defectDetail');
	}, []);

	const handleBackToDefects = useCallback(() => {
		setSelectedDefect(null);
		setCurrentScreen('defects');
	}, []);

	const switchViewType = useCallback(
		(newViewType: PortfolioViewType) => {
			// State cleaners for each view type (only clear when necessary)
			const stateCleaners = {
				bySprints: () => {
					setSelectedIteration(null);
					setCurrentScreen('iterations');
				},
				allUserStories: () => {
					setSelectedIteration(null);
					setCurrentScreen('allUserStories');
				},
				allDefects: () => {
					setCurrentScreen('defects');
					setSelectedDefect(null);
				}
			};

			// Data loaders for each view type
			const dataLoaders = {
				bySprints: loadIterations,
				allUserStories: loadAllUserStories,
				allDefects: loadAllDefects
			};

			// Execute state cleaner of current view
			const currentCleaner = stateCleaners[newViewType];
			if (currentCleaner) {
				currentCleaner();
			}

			// Change active view (sub-tabs live in layout; portfolio is the only section with sub-tabs for now)
			setActiveSubTabBySection(prev => ({ ...prev, portfolio: newViewType }));

			// Only load data if this view hasn't been loaded yet in this session
			// This prevents redundant fetches when switching between tabs
			if (!loadedViews.current.has(newViewType)) {
				loadedViews.current.add(newViewType);

				const newLoader = dataLoaders[newViewType];
				if (newLoader) {
					newLoader();
				}
			} else {
			}
		},
		[loadIterations, loadAllUserStories, loadAllDefects]
	);

	const handleIterationSelected = useCallback(
		(iteration: Iteration) => {
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
		// Depenent de la vista activa, tornem a la pantalla correcta
		if (portfolioActiveViewType === 'allUserStories') {
			setCurrentScreen('allUserStories');
		} else {
			setCurrentScreen('userStories');
		}
		setSelectedUserStory(null);
		setTasks([]);
		setTasksError(null);
		setUserStoryDefects([]);
		setUserStoryDefectsError(null);
		setUserStoryDiscussions([]);
		setUserStoryDiscussionsError(null);
		setUserStoryTestCases([]);
		setUserStoryTestCasesError(null);
		setActiveUserStoryTab('tasks');
		// Clear the attempted tracking when going back
		attemptedUserStoryDefects.current.clear();
		attemptedUserStoryDiscussions.current.clear();
		attemptedUserStoryTests.current.clear();
	}, [portfolioActiveViewType]);

	const handleSectionChange = useCallback(
		(section: SectionType) => {
			setActiveSection(section);
			if (section === 'portfolio' || section === 'calendar') {
				// Load iterations only if we don't already have them and we're not already loading / in error
				if (!iterations.length && !iterationsLoading && !iterationsError) {
					loadIterations();
				}
			}
			if (section === 'team') {
				// Load team members when navigating to the team section
				if (!teamMembers.length && !teamMembersLoading && !teamMembersError) {
					loadTeamMembers(selectedTeamIteration === 'current' ? undefined : selectedTeamIteration);
				}
			}
			if (section === 'metrics') {
				// Load iterations, user stories, and defects for metrics when navigating to metrics section
				if (!iterations.length && !iterationsLoading && !iterationsError) {
					loadIterations();
				}
				if (!portfolioUserStories.length && !portfolioUserStoriesLoading) {
					loadAllUserStories();
				}
				if (!defects.length && !defectsLoading && !defectsError) {
					loadAllDefects();
				}
			}
		},
		[loadIterations, iterations, iterationsLoading, iterationsError, loadTeamMembers, teamMembers, teamMembersLoading, teamMembersError, defects, defectsLoading, defectsError, loadAllDefects, portfolioUserStories, portfolioUserStoriesLoading, loadAllUserStories, selectedTeamIteration]
	);

	// Reload team members when selected iteration changes
	useEffect(() => {
		if (activeSection === 'team' && teamMembers.length > 0) {
			loadTeamMembers(selectedTeamIteration === 'current' ? undefined : selectedTeamIteration);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedTeamIteration, activeSection, loadTeamMembers]);

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

		if (activeIterations.length === 0) {
			return null;
		}

		// If only one active iteration, return it
		if (activeIterations.length === 1) {
			return activeIterations[0];
		}

		// If multiple active iterations, prioritize those containing "Sprint" in the name (case insensitive)
		const sprintIterations = activeIterations.filter(iteration => iteration.name.toLowerCase().includes('sprint'));

		// Return the first sprint iteration if any exist, otherwise return the first active iteration
		return sprintIterations.length > 0 ? sprintIterations[0] : activeIterations[0];
	}, []);

	const findNextIteration = useCallback(
		(iterations: Iteration[]): Iteration | null => {
			const currentIteration = findCurrentIteration(iterations);
			if (!currentIteration) {
				return null;
			}

			const currentEndDate = currentIteration.endDate ? new Date(currentIteration.endDate) : null;
			if (!currentEndDate) {
				return null;
			}

			currentEndDate.setHours(0, 0, 0, 0);

			// Find the next iteration that starts after the current one ends
			const futureIterations = iterations.filter(iteration => {
				const startDate = iteration.startDate ? new Date(iteration.startDate) : null;
				if (!startDate) return false;

				startDate.setHours(0, 0, 0, 0);
				return startDate > currentEndDate;
			});

			if (futureIterations.length === 0) {
				return null;
			}

			// Sort by start date and return the earliest one
			return futureIterations.sort((a, b) => {
				const dateA = a.startDate ? new Date(a.startDate) : new Date(0);
				const dateB = b.startDate ? new Date(b.startDate) : new Date(0);
				return dateA.getTime() - dateB.getTime();
			})[0];
		},
		[findCurrentIteration]
	);

	// Initialize webview on mount
	useEffect(() => {
		sendMessage({
			command: 'webviewReady'
		});

		// Load saved state when webview initializes
		sendMessage({
			command: 'getState'
		});

		// Load iterations for calendar section on initial mount
		// Since activeSection defaults to 'calendar', we should load iterations immediately
		setTimeout(() => {
			if (!hasLoadedCalendarIterations.current) {
				hasLoadedCalendarIterations.current = true;
				loadIterations();
			}
		}, 200); // Small delay to ensure webview is fully initialized
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // Only run once on mount

	// Handle messages from extension
	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			const message = event.data;

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
						setHolidays(message.holidays || []);

						// Auto-select current iteration if available (but don't override detail screens)
						const currentIteration = findCurrentIteration(message.iterations);
						if (currentIteration) {
							setSelectedIteration(currentIteration);
							loadUserStories(currentIteration);
							// Only navigate to userStories if we're on the iterations list screen
							// Don't override userStoryDetail when coming from search
							if (currentScreen === 'iterations') {
								setCurrentScreen('userStories');
							}
						}
					} else {
						setIterationsError('Failed to load iterations');
					}
					break;
				case 'iterationsError':
					setIterationsLoading(false);
					setIterationsError(message.error || 'Error loading iterations');
					break;
				case 'holidaysLoaded':
					// Merge holidays from the new year with existing holidays
					if (message.holidays) {
						setHolidays(prevHolidays => {
							// Remove holidays from the same year to avoid duplicates
							const otherYearHolidays = prevHolidays.filter(h => !h.date.startsWith(`${message.year}-`));
							return [...otherYearHolidays, ...message.holidays];
						});
						logDebug(`Holidays loaded for year ${message.year}: ${message.holidays.length} holidays`);
					}
					break;
				case 'holidaysError':
					logDebug(`Failed to load holidays for year ${message.year}: ${message.error}`);
					break;
				case 'userStoriesLoaded':
					// Determine context using iteration field from backend
					const isSprintContext = message.iteration !== null && message.iteration !== undefined;

					if (isSprintContext) {
						// Sprint Detail context - update sprint state (could be for readiness chart or table)
						setSprintUserStoriesLoading(false);
						if (message.userStories) {
							setSprintUserStories(message.userStories);
							setUserStoriesError(null);

							// Also update readiness chart if this was loaded for the readiness chart
							if (activeSection === 'metrics') {
								const stateDistrib = groupByState(message.userStories);
								setStateDistribution(stateDistrib);

								// Calculate blocked distribution for the same sprint
								const blockedDistrib = groupByBlockedStatus(message.userStories);
								setBlockedDistribution(blockedDistrib);

								setStateDistributionLoading(false);
							}
						}
					} else {
						// Portfolio All User Stories context - update portfolio state
						setPortfolioUserStoriesLoading(false);
						setPortfolioUserStoriesLoadingMore(false);
						if (message.userStories) {
							if (message.offset === 0) {
								setPortfolioUserStories(message.userStories);
							} else {
								setPortfolioUserStories(prev => [...prev, ...message.userStories]);
							}
							setPortfolioUserStoriesHasMore(message.hasMore || false);
							setPortfolioUserStoriesOffset((message.offset || 0) + (message.userStories?.length || 0));
							setUserStoriesError(null);
							// Assegura que la pantalla es correcta quan es carreguen totes les user stories
							if (portfolioActiveViewType === 'allUserStories') {
								setCurrentScreen('allUserStories');
							}
						}
					}

					// Keep backward compatibility with existing userStories state (for now)
					setUserStoriesLoading(false);
					setUserStoriesLoadingMore(false);
					if (message.userStories) {
						if (message.offset === 0) {
							setUserStories(message.userStories);
						} else {
							setUserStories(prev => [...prev, ...message.userStories]);
						}
						setUserStoriesHasMore(message.hasMore || false);
						setUserStoriesOffset((message.offset || 0) + (message.userStories?.length || 0));
					} else {
						setUserStoriesError('Failed to load user stories');
					}
					break;
				case 'userStoriesError':
					setUserStoriesLoading(false);
					setUserStoriesError(message.error || 'Error loading user stories');
					break;
				case 'velocityDataLoaded':
					setVelocityLoading(false);
					if (message.velocityData?.length) {
						setVelocityData(message.velocityData);
						const avg = message.velocityData.reduce((s: number, d: { points: number }) => s + d.points, 0) / message.velocityData.length;
						setAverageVelocity(Math.round(avg * 10) / 10);
					}
					break;
				case 'velocityDataError':
					setVelocityLoading(false);
					setVelocityData([]);
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
				case 'defectsLoaded':
					setDefectsLoading(false);
					setDefectsLoadingMore(false);
					if (message.defects) {
						// If it's the first page (offset 0), replace. Otherwise, append.
						if (message.offset === 0) {
							setDefects(message.defects);
						} else {
							setDefects(prev => [...prev, ...message.defects]);
						}
						setDefectsHasMore(message.hasMore || false);
						// Update offset to the NEXT offset to request
						setDefectsOffset((message.offset || 0) + (message.defects?.length || 0));
						setDefectsError(null);
						// Only navigate to defects list if we're not in detail view
						// Don't override defectDetail when coming from search
						if (portfolioActiveViewType === 'allDefects' && currentScreen !== 'defects' && currentScreen !== 'defectDetail') {
							setCurrentScreen('defects');
						}
					} else {
						setDefectsError('Failed to load defects');
					}
					break;
				case 'defectsError':
					setDefectsLoading(false);
					setDefectsError(message.error || 'Error loading defects');
					break;
				case 'userStoryDefectsLoaded':
					setUserStoryDefectsLoading(false);
					if (message.defects) {
						setUserStoryDefects(message.defects);
						setUserStoryDefectsError(null);
					} else {
						setUserStoryDefectsError('Failed to load defects');
					}
					break;
				case 'userStoryDefectsError':
					setUserStoryDefectsLoading(false);
					setUserStoryDefectsError(message.error || 'Error loading defects');
					break;
				case 'userStoryDiscussionsLoaded':
					setUserStoryDiscussionsLoading(false);
					if (message.discussions) {
						setUserStoryDiscussions(message.discussions);
						setUserStoryDiscussionsError(null);
					} else {
						setUserStoryDiscussionsError('Failed to load discussions');
					}
					break;
				case 'userStoryDiscussionsError':
					setUserStoryDiscussionsLoading(false);
					setUserStoryDiscussionsError(message.error || 'Error loading discussions');
					break;
				case 'userStoryTestsLoaded':
					setUserStoryTestCasesLoading(false);
					if (message.testCases) {
						setUserStoryTestCases(message.testCases);
						setUserStoryTestCasesError(null);
					} else {
						setUserStoryTestCasesError('Failed to load test cases');
					}
					break;
				case 'userStoryTestsError':
					setUserStoryTestCasesLoading(false);
					setUserStoryTestCasesError(message.error || 'Error loading test cases');
					break;
				case 'teamMembersLoaded':
					setTeamMembersLoading(false);
					if (message.teamMembers) {
						setTeamMembers(message.teamMembers);
						setTeamMembersError(null);
					} else {
						setTeamMembersError('Failed to load team members');
					}
					break;
				case 'teamMembersError':
					setTeamMembersLoading(false);
					setTeamMembersError(message.error || 'Error loading team members');
					break;
				case 'globalSearchResults':
					setGlobalSearchLoading(false);
					setGlobalSearchError(null);
					setGlobalSearchResults(message.results || []);
					break;
				case 'globalSearchError':
					setGlobalSearchLoading(false);
					setGlobalSearchError(message.error || 'Search failed');
					setGlobalSearchResults([]);
					break;
				case 'userStoryByObjectIdLoaded':
					if (message.userStory) {
						setSelectedUserStory(message.userStory);
						setActiveSection('portfolio');
						setCurrentScreen('userStoryDetail');
						setActiveViewType('bySprints');
						loadTasks(message.userStory.objectId);
						const tab = pendingSearchUserStoryTabRef.current;
						if (tab) {
							setActiveUserStoryTab(tab);
							pendingSearchUserStoryTabRef.current = null;
						}
						loadIterations();
					}
					break;
				case 'defectByObjectIdLoaded':
					if (message.defect) {
						setSelectedDefect(message.defect);
						setActiveSection('portfolio');
						setActiveViewType('allDefects');
						setCurrentScreen('defectDetail');
						loadIterations();
						loadAllDefects();
					}
					break;
				case 'taskWithParentLoaded':
					if (message.userStoryObjectId) {
						sendMessage({ command: 'loadUserStoryByObjectId', objectId: message.userStoryObjectId });
					}
					break;
				case 'testCaseWithParentLoaded':
					if (message.userStoryObjectId) {
						sendMessage({ command: 'loadUserStoryByObjectId', objectId: message.userStoryObjectId });
					}
					break;
				case 'userStoryByObjectIdError':
					setGlobalSearchError(message.error || 'Failed to load user story');
					setGlobalSearchLoading(false);
					break;
				case 'defectByObjectIdError':
					setGlobalSearchError(message.error || 'Failed to load defect');
					setGlobalSearchLoading(false);
					break;
				case 'taskWithParentError':
					setGlobalSearchError(message.error || 'Failed to load task');
					setGlobalSearchLoading(false);
					break;
				case 'testCaseWithParentError':
					setGlobalSearchError(message.error || 'Failed to load test case');
					setGlobalSearchLoading(false);
					break;
				case 'restoreState':
					// Restore navigation state from another webview (e.g., when opening in editor from activity bar)
					if (message.state) {
						const state = message.state as {
							activeSection?: SectionType;
							currentScreen?: ScreenType;
							activeViewType?: PortfolioViewType;
							activeSubTabBySection?: Partial<Record<SectionType, string>>;
							selectedIterationId?: string;
							selectedUserStoryId?: string;
							selectedDefectId?: string;
							activeUserStoryTab?: 'tasks' | 'tests' | 'defects' | 'discussions';
							globalSearchTerm?: string;
							calendarDate?: string;
						};
						logDebug(`Restoring navigation state: ${JSON.stringify(state)}`);

						// Restore basic navigation state
						if (state.activeSection) setActiveSection(state.activeSection);
						if (state.currentScreen) setCurrentScreen(state.currentScreen);
						if (state.activeSubTabBySection) {
							setActiveSubTabBySection(prev => ({ ...prev, ...state.activeSubTabBySection }));
						} else if (state.activeViewType) {
							// Legacy state: map portfolio view type into subtab structure
							setActiveSubTabBySection(prev => ({ ...prev, portfolio: state.activeViewType }));
						}
						if (state.activeUserStoryTab) setActiveUserStoryTab(state.activeUserStoryTab);
						if (state.globalSearchTerm) setGlobalSearchTerm(state.globalSearchTerm);
						if (state.calendarDate) setCalendarDate(new Date(state.calendarDate));

						// Restore selected iteration - need to find it in loaded iterations
						if (state.selectedIterationId && iterations.length > 0) {
							const iteration = iterations.find(i => i.objectId === state.selectedIterationId);
							if (iteration) {
								setSelectedIteration(iteration);
								// Only load user stories if we're on a screen that needs them
								if (state.currentScreen === 'userStories' || state.currentScreen === 'userStoryDetail') {
									loadUserStories(iteration);
								}
							}
						}

						// Restore selected user story - only load if we're on the detail screen
						// (otherwise the handler will auto-navigate to detail, overriding our state)
						if (state.selectedUserStoryId && state.currentScreen === 'userStoryDetail') {
							sendMessage({ command: 'loadUserStoryByObjectId', objectId: state.selectedUserStoryId });
						}

						// Restore selected defect - only load if we're on the detail screen
						// (otherwise the handler will auto-navigate to detail, overriding our state)
						if (state.selectedDefectId && state.currentScreen === 'defectDetail') {
							sendMessage({ command: 'loadDefectByObjectId', objectId: state.selectedDefectId });
						}
					}
					break;
			}
		};

		window.addEventListener('message', handleMessage);
		return () => window.removeEventListener('message', handleMessage);
	}, [findCurrentIteration, loadUserStories, portfolioActiveViewType, currentScreen, sendMessage, loadTasks, loadIterations, loadAllDefects, iterations]); // Only include dependencies needed by handleMessage

	// Load velocity data from backend when on metrics (per-sprint US totals so Sprint 82 etc. show correct hours)
	useEffect(() => {
		if (activeSection !== 'metrics') {
			hasLoadedVelocityDataForMetrics.current = false;
			return;
		}
		if (!iterations.length || hasLoadedVelocityDataForMetrics.current) return;
		hasLoadedVelocityDataForMetrics.current = true;
		setVelocityLoading(true);
		sendMessage({ command: 'loadVelocityData' });
	}, [activeSection, iterations.length, sendMessage]);

	// Focus search input when search tab is selected
	useEffect(() => {
		if (activeSection === 'search' && searchInputRef.current) {
			searchInputRef.current.focus();
			searchInputRef.current.select();
		}
	}, [activeSection]);

	// Save navigation state to backend whenever it changes (syncs across webviews)
	useEffect(() => {
		// Debounce state saves to avoid excessive messages
		const timeoutId = setTimeout(() => {
			const navigationState = {
				activeSection,
				currentScreen,
				activeViewType: portfolioActiveViewType,
				activeSubTabBySection,
				selectedIterationId: selectedIteration?.objectId,
				selectedUserStoryId: selectedUserStory?.objectId,
				selectedDefectId: selectedDefect?.objectId,
				activeUserStoryTab,
				globalSearchTerm,
				calendarDate: calendarDate.toISOString()
			};
			sendMessage({
				command: 'saveState',
				state: navigationState
			});
		}, 100);
		return () => clearTimeout(timeoutId);
	}, [activeSection, currentScreen, portfolioActiveViewType, activeSubTabBySection, selectedIteration?.objectId, selectedUserStory?.objectId, selectedDefect?.objectId, activeUserStoryTab, globalSearchTerm, calendarDate, sendMessage]);

	// Track calendar year changes and load holidays for the new year
	useEffect(() => {
		const calendarYear = calendarDate.getFullYear();
		const currentYear = new Date().getFullYear();

		// Check if we already have holidays for this year
		const hasHolidaysForYear = holidays.some(h => h.date.startsWith(`${calendarYear}-`));

		// Load holidays if we don't have them for this year and it's different from current year
		// (current year holidays are loaded with iterations)
		if (!hasHolidaysForYear && calendarYear !== currentYear) {
			logDebug(`Calendar navigated to year ${calendarYear}, loading holidays...`);
			sendMessage({
				command: 'loadHolidaysForYear',
				year: calendarYear,
				country: 'ES'
			});
		}
	}, [calendarDate, holidays, sendMessage]);

	// Calculate metrics when data changes - load charts in parallel (state distribution, defects, KPIs)
	useEffect(() => {
		if (activeSection !== 'metrics') return;
		if (!iterations.length || !portfolioUserStories.length) return;

		setMetricsLoading(true);

		// State distribution chart - Next sprint readiness
		(async () => {
			try {
				setStateDistributionLoading(true);
				let targetIteration = null;
				let displayName = 'Next Sprint';

				if (selectedReadinessSprint === 'next') {
					targetIteration = findNextIteration(iterations);
				} else {
					// Find the iteration by name
					targetIteration = iterations.find(it => it.name === selectedReadinessSprint);
				}

				if (targetIteration) {
					displayName = targetIteration.name;
					setNextSprintName(targetIteration.name);
					// Load stories specifically for this sprint to ensure we get all stories, not just cached ones
					sendMessage({
						command: 'loadUserStories',
						iteration: targetIteration._ref
					});
				} else {
					setNextSprintName('No Sprint');
					setStateDistribution([]);
					setBlockedDistribution([]);
					setStateDistributionLoading(false);
				}
			} catch (error) {
				console.error('Error calculating state distribution:', error);
				setStateDistributionLoading(false);
			}
		})();

		// Defects trend chart - last 12 sprints
		(async () => {
			try {
				setDefectsBySeverityLoading(true);
				const defectsBySev = aggregateDefectsBySeverity(defects, iterations, 12);
				setDefectsBySeverity(defectsBySev);
			} catch (error) {
				console.error('Error calculating defects:', error);
			} finally {
				setDefectsBySeverityLoading(false);
			}
		})();

		// Calculate other KPI metrics
		try {
			// Calculate completed points (current sprint or all)
			const points = calculateCompletedPoints(portfolioUserStories);
			setCompletedPoints(points);

			// Calculate WIP
			const wipCount = calculateWIP(portfolioUserStories);
			setWip(wipCount);

			// Calculate blocked items
			const blocked = calculateBlockedItems(portfolioUserStories, defects);
			setBlockedItems(blocked);

			setMetricsLoading(false);
		} catch (error) {
			console.error('Error calculating metrics:', error);
			setMetricsLoading(false);
		}
	}, [activeSection, iterations, portfolioUserStories, defects, findNextIteration, selectedReadinessSprint]);

	// Load iterations when navigating to calendar section
	useEffect(() => {
		if (activeSection === 'calendar' && !hasLoadedCalendarIterations.current && !iterations.length && !iterationsLoading && !iterationsError) {
			hasLoadedCalendarIterations.current = true;
			// Use setTimeout to make the call asynchronous and avoid linter warning about setState in effects
			setTimeout(() => {
				loadIterations();
			}, 0);
		} else if (activeSection !== 'calendar') {
			// Reset flag when leaving calendar section
			hasLoadedCalendarIterations.current = false;
		}
	}, [activeSection, iterations.length, iterationsLoading, iterationsError, loadIterations]);

	// Load iterations when navigating to portfolio section
	useEffect(() => {
		if (activeSection === 'portfolio' && !hasLoadedPortfolioIterations.current) {
			hasLoadedPortfolioIterations.current = true;
			// Note: Don't auto-load here; let switchViewType handle data loading
		} else if (activeSection !== 'portfolio') {
			// Reset flags when leaving portfolio section
			hasLoadedPortfolioIterations.current = false;
			loadedViews.current.clear();
			attemptedUserStoryDefects.current.clear();
		}
	}, [activeSection]);

	// Auto-load defects when defects tab is selected for a user story
	useEffect(() => {
		if (selectedUserStory && activeUserStoryTab === 'defects' && !userStoryDefectsLoading) {
			// Check if we've already attempted to load defects for this user story
			if (!attemptedUserStoryDefects.current.has(selectedUserStory.objectId)) {
				attemptedUserStoryDefects.current.add(selectedUserStory.objectId);
				loadUserStoryDefects(selectedUserStory.objectId);
			} else {
			}
		}
	}, [selectedUserStory, activeUserStoryTab, userStoryDefectsLoading, loadUserStoryDefects]);

	// Auto-load discussions when discussions tab is selected for a user story
	useEffect(() => {
		if (selectedUserStory && activeUserStoryTab === 'discussions' && !userStoryDiscussionsLoading) {
			// Check if we've already attempted to load discussions for this user story
			if (!attemptedUserStoryDiscussions.current.has(selectedUserStory.objectId)) {
				attemptedUserStoryDiscussions.current.add(selectedUserStory.objectId);
				loadUserStoryDiscussions(selectedUserStory.objectId);
			} else {
			}
		}
	}, [selectedUserStory, activeUserStoryTab, userStoryDiscussionsLoading, loadUserStoryDiscussions]);

	// Auto-load test cases when tests tab is selected for a user story
	useEffect(() => {
		if (selectedUserStory && activeUserStoryTab === 'tests' && !userStoryTestCasesLoading) {
			// Check if we've already attempted to load test cases for this user story
			if (!attemptedUserStoryTests.current.has(selectedUserStory.objectId)) {
				attemptedUserStoryTests.current.add(selectedUserStory.objectId);
				loadUserStoryTests(selectedUserStory.objectId);
			}
		}
	}, [selectedUserStory, activeUserStoryTab, userStoryTestCasesLoading, loadUserStoryTests]);

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

	// Handle mouse back button navigation
	useEffect(() => {
		const handleMouseEvent = (event: globalThis.MouseEvent) => {
			// Mouse back button is typically button 3 (some mice use button 4)
			// Button values: 0 = left, 1 = middle, 2 = right, 3 = back, 4 = forward
			if (event.button === 3) {
				event.preventDefault();
				event.stopPropagation();

				// Navigate back based on current screen
				if (currentScreen === 'userStoryDetail' && selectedUserStory) {
					handleBackToUserStories();
				} else if (currentScreen === 'userStories' && selectedIteration) {
					handleBackToIterations();
				} else if (currentScreen === 'defectDetail' && selectedDefect) {
					handleBackToDefects();
				}
			}
		};

		// Add event listeners to catch mouse events - try multiple event types
		// Some browsers/mice may use different events
		document.addEventListener('mousedown', handleMouseEvent);
		document.addEventListener('mouseup', handleMouseEvent);
		document.addEventListener('auxclick', handleMouseEvent);

		return () => {
			document.removeEventListener('mousedown', handleMouseEvent);
			document.removeEventListener('mouseup', handleMouseEvent);
			document.removeEventListener('auxclick', handleMouseEvent);
			// eslint-disable-next-line no-console
			console.log('[MainWebview] Mouse event listeners removed from document');
		};
	}, [currentScreen, selectedUserStory, selectedIteration, selectedDefect, handleBackToUserStories, handleBackToIterations, handleBackToDefects]);

	const _clearIterations = () => {
		setIterations([]);
		setIterationsError(null);
		setSelectedIteration(null);
	};

	const clearUserStories = () => {
		setUserStories([]);
		setUserStoriesError(null);
	};

	// Memoize SubTabsBar to prevent unnecessary re-renders
	const portfolioSubTabsBar = useMemo(() => {
		if (activeSection !== 'portfolio') return null;

		const subTabs = getPortfolioSubTabs();
		const activeSubTabId = activeSubTabBySection['portfolio'] ?? subTabs[0]?.id ?? 'bySprints';
		return <SubTabsBar subTabs={subTabs} activeSubTabId={activeSubTabId} onSubTabChange={id => switchViewType(id as PortfolioViewType)} />;
	}, [activeSection, activeSubTabBySection, switchViewType]);

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
				<StickyNav>
					<NavigationBar activeSection={activeSection} onSectionChange={handleSectionChange} collaborationBadgeCount={collaborationHelpRequestsCount} />
					{portfolioSubTabsBar}
				</StickyNav>
				<ContentArea noPaddingTop={activeSection === 'portfolio'}>
					{activeSection === 'search' && (
						<SearchSection
							searchInputRef={searchInputRef}
							globalSearchTerm={globalSearchTerm}
							onSearchTermChange={setGlobalSearchTerm}
							onSearch={runGlobalSearch}
							globalSearchLoading={globalSearchLoading}
							globalSearchError={globalSearchError}
							globalSearchResults={globalSearchResults}
							onOpenResult={openSearchResult}
						/>
					)}
					{activeSection === 'calendar' && <CalendarSection currentDate={calendarDate} iterations={iterations} userStories={userStories} onMonthChange={setCalendarDate} debugMode={debugMode} currentUser={currentUser} holidays={holidays} onIterationClick={handleIterationClickFromCalendar} />}

					{activeSection === 'team' && (
						<TeamSection
							teamMembers={teamMembers}
							teamMembersLoading={teamMembersLoading}
							teamMembersError={teamMembersError}
							selectedTeamIteration={selectedTeamIteration}
							onTeamIterationChange={setSelectedTeamIteration}
							iterations={iterations}
							currentIterationName={findCurrentIteration(iterations)?.name ?? null}
						/>
					)}
					{(activeSection === 'library' || selectedTutorial) && (
						<LibrarySection
							selectedTutorial={selectedTutorial}
							onTutorialSelect={setSelectedTutorial}
							onTutorialClose={() => {
								setShowTutorial(false);
								setSelectedTutorial(null);
							}}
							sendMessage={sendMessage}
						/>
					)}

					{activeSection === 'metrics' && (
						<MetricsSection
							averageVelocity={averageVelocity}
							completedPoints={completedPoints}
							wip={wip}
							blockedItems={blockedItems}
							metricsLoading={metricsLoading}
							velocityData={velocityData}
							velocityLoading={velocityLoading}
							stateDistribution={stateDistribution}
							stateDistributionLoading={stateDistributionLoading}
							blockedDistribution={blockedDistribution}
							nextSprintName={nextSprintName}
							selectedReadinessSprint={selectedReadinessSprint}
							onReadinessSprintChange={setSelectedReadinessSprint}
							sprintIterations={iterations
								.filter(it => {
									const nextIter = findNextIteration(iterations);
									if (nextIter && it.name === nextIter.name) {
										return false;
									}
									return true;
								})
								.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
								.map(it => ({
									objectId: it.objectId,
									name: it.name,
									startDate: it.startDate
								}))}
							defectsBySeverity={defectsBySeverity}
							defectsBySeverityLoading={defectsBySeverityLoading}
						/>
					)}

					{activeSection === 'collaboration' && <CollaborationSection selectedUserStoryId={selectedUserStory?.formattedId || selectedUserStory?.objectId || null} onHelpRequestsCountChange={setCollaborationHelpRequestsCount} />}

					{activeSection === 'portfolio' && (
						<PortfolioSection
							activeViewType={portfolioActiveViewType}
							iterations={iterations}
							iterationsLoading={iterationsLoading}
							iterationsError={iterationsError}
							selectedIteration={selectedIteration}
							userStories={userStories}
							userStoriesLoading={userStoriesLoading}
							userStoriesError={userStoriesError}
							selectedUserStory={selectedUserStory}
							userStoriesHasMore={userStoriesHasMore}
							userStoriesLoadingMore={userStoriesLoadingMore}
							loadMoreUserStories={loadMoreUserStories}
							portfolioUserStories={portfolioUserStories}
							portfolioUserStoriesLoading={portfolioUserStoriesLoading}
							portfolioUserStoriesHasMore={portfolioUserStoriesHasMore}
							portfolioUserStoriesLoadingMore={portfolioUserStoriesLoadingMore}
							sprintUserStories={sprintUserStories}
							sprintUserStoriesLoading={sprintUserStoriesLoading}
							tasks={tasks}
							tasksLoading={tasksLoading}
							tasksError={tasksError}
							userStoryDefects={userStoryDefects}
							userStoryDefectsLoading={userStoryDefectsLoading}
							userStoryDefectsError={userStoryDefectsError}
							userStoryDiscussions={userStoryDiscussions}
							userStoryDiscussionsLoading={userStoryDiscussionsLoading}
							userStoryDiscussionsError={userStoryDiscussionsError}
							userStoryTestCases={userStoryTestCases}
							userStoryTestCasesLoading={userStoryTestCasesLoading}
							userStoryTestCasesError={userStoryTestCasesError}
							defects={defects}
							defectsLoading={defectsLoading}
							defectsError={defectsError}
							defectsHasMore={defectsHasMore}
							defectsLoadingMore={defectsLoadingMore}
							onLoadMoreDefects={loadMoreDefects}
							selectedDefect={selectedDefect}
							activeUserStoryTab={activeUserStoryTab}
							currentScreen={currentScreen}
							onLoadIterations={loadIterations}
							onIterationSelected={handleIterationSelected}
							onUserStorySelected={handleUserStorySelected}
							onLoadUserStories={loadUserStories}
							onClearUserStories={clearUserStories}
							onLoadTasks={loadTasks}
							onLoadUserStoryDefects={loadUserStoryDefects}
							onLoadDefects={loadAllDefects}
							onDefectSelected={handleDefectSelected}
							onBackToIterations={handleBackToIterations}
							onBackToUserStories={handleBackToUserStories}
							onBackToDefects={handleBackToDefects}
							onActiveUserStoryTabChange={setActiveUserStoryTab}
						/>
					)}
				</ContentArea>
			</CenteredContainer>
		</Container>
	);
};

export default MainWebview;
