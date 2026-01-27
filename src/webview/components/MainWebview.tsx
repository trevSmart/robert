import React, { FC, ComponentType } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import 'vscrui/dist/codicon.css';
import '@vscode/codicons/dist/codicon.css';
import UserStoriesTable, { IterationsTable } from './common/UserStoriesTable';
import UserStoryForm from './common/UserStoryForm';
import TasksTable from './common/TasksTable';
import DefectsTable from './common/DefectsTable';
import DefectForm from './common/DefectForm';
import DiscussionsTable from './common/DiscussionsTable';
import ScreenHeader from './common/ScreenHeader';
import NavigationBar from './common/NavigationBar';
import Calendar from './common/Calendar';
import SprintDetailsForm from './common/SprintDetailsForm';
import AssigneeHoursChart from './common/AssigneeHoursChart';
import SprintKPIs from './metrics/SprintKPIs';
import VelocityTrendChart from './metrics/VelocityTrendChart';
import StateDistributionPie from './metrics/StateDistributionPie';
import DefectSeverityChart from './metrics/DefectSeverityChart';
import CollaborationView from './common/CollaborationView';
import { logDebug } from '../utils/vscodeApi';
import { type UserStory, type Defect, type Discussion } from '../../types/rally';
import { isLightTheme } from '../utils/themeColors';
import { calculateVelocity, calculateAverageVelocity, calculateWIP, calculateBlockedItems, groupByState, aggregateDefectsBySeverity, calculateCompletedPoints, type VelocityData, type StateDistribution, type DefectsBySeverity } from '../utils/metricsUtils';

// Icon components (copied from NavigationBar for now)
const _TeamIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '48px', height: '48px', margin: '0 auto', display: 'block' }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
		/>
	</svg>
);

const _SalesforceIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '48px', height: '48px', margin: '0 auto', display: 'block' }}>
		<path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
	</svg>
);

const _AssetsIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '48px', height: '48px', margin: '0 auto', display: 'block' }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 0 0 3.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008Z"
		/>
	</svg>
);

const _MetricsIcon = () => (
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

const _SwatchIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '36px', height: '36px' }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 0 0 3.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008Z"
		/>
	</svg>
);

// Icons for user story detail tabs
const _TasksTabIcon = ({ size = '14px' }: { size?: string }) => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: size, height: size }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M21.75 6.75a4.5 4.5 0 0 1-4.884 4.484c-1.076-.091-2.264.071-2.95.904l-7.152 8.684a2.548 2.548 0 1 1-3.586-3.586l8.684-7.152c.833-.686.995-1.874.904-2.95a4.5 4.5 0 0 1 6.336-4.486l-3.276 3.276a3.004 3.004 0 0 0 2.25 2.25l3.276-3.276c.256.565.398 1.192.398 1.852Z"
		/>
		<path strokeLinecap="round" strokeLinejoin="round" d="M4.867 19.125h.008v.008h-.008v-.008Z" />
	</svg>
);

const _TestsTabIcon = ({ size = '14px' }: { size?: string }) => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: size, height: size }}>
		<path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
	</svg>
);

const _DefectsTabIcon = ({ size = '14px' }: { size?: string }) => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: size, height: size }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M12 12.75c1.148 0 2.278.08 3.383.237 1.037.146 1.866.966 1.866 2.013 0 3.728-2.35 6.75-5.25 6.75S6.75 18.728 6.75 15c0-1.046.83-1.867 1.866-2.013A24.204 24.204 0 0 1 12 12.75Zm0 0c2.883 0 5.647.508 8.207 1.44a23.91 23.91 0 0 1-1.152 6.06M12 12.75c-2.883 0-5.647.508-8.208 1.44.125 2.104.52 4.136 1.153 6.06M12 12.75a2.25 2.25 0 0 0 2.248-2.354M12 12.75a2.25 2.25 0 0 1-2.248-2.354M12 8.25c.995 0 1.971-.08 2.922-.236.403-.066.74-.358.795-.762a3.778 3.778 0 0 0-.399-2.25M12 8.25c-.995 0-1.97-.08-2.922-.236-.402-.066-.74-.358-.795-.762a3.734 3.734 0 0 1 .4-2.253M12 8.25a2.25 2.25 0 0 0-2.248 2.146M12 8.25a2.25 2.25 0 0 1 2.248 2.146M8.683 5a6.032 6.032 0 0 1-1.155-1.002c.07-.63.27-1.222.574-1.747m.581 2.749A3.75 3.75 0 0 1 15.318 5m0 0c.427-.283.815-.62 1.155-.999a4.471 4.471 0 0 0-.575-1.752M4.921 6a24.048 24.048 0 0 0-.392 3.314c1.668.546 3.416.914 5.223 1.082M19.08 6c.205 1.08.337 2.187.392 3.314a23.882 23.882 0 0 1-5.223 1.082"
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

import { CenteredContainer, Container, ContentArea, GlobalStyle } from './common/styled';
import { getVsCodeApi } from '../utils/vscodeApi';
import type { RallyTask, RallyDefect, RallyUser } from '../../types/rally';

type SectionType = 'calendar' | 'portfolio' | 'team' | 'library' | 'metrics' | 'collaboration';
type ScreenType = 'iterations' | 'userStories' | 'userStoryDetail' | 'allUserStories' | 'defects' | 'defectDetail';
type PortfolioViewType = 'bySprints' | 'allUserStories' | 'allDefects';

interface Tutorial {
	title: string;
	kicker: string;
	bg: string;
}

interface PortfolioViewConfig {
	id: PortfolioViewType;
	label: string;
	icon?: string;
	description?: string;
	component: ComponentType<PortfolioViewProps>;
	dataLoader: () => Promise<void>;
	stateCleaner: () => void;
}

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
					<SprintDetailsForm iteration={selectedIteration} />
					<AssigneeHoursChart userStories={sprintUserStories} />
					<UserStoriesTable
						userStories={sprintUserStories}
						loading={sprintUserStoriesLoading}
						error={userStoriesError}
						onLoadUserStories={() => onLoadUserStories(selectedIteration)}
						onClearUserStories={onClearUserStories}
						onUserStorySelected={onUserStorySelected}
						selectedUserStory={selectedUserStory}
					/>
				</>
			)}

			{currentScreen === 'userStoryDetail' && selectedUserStory && (
				<>
					<ScreenHeader title={`${selectedUserStory.formattedId}: ${selectedUserStory.name}`} showBackButton={true} onBack={onBackToUserStories} />
					<UserStoryForm userStory={selectedUserStory} selectedAdditionalTab={activeUserStoryTab} onAdditionalTabChange={onActiveUserStoryTabChange} />
					{activeUserStoryTab === 'tasks' && <TasksTable tasks={tasks as any} loading={tasksLoading} error={tasksError} onLoadTasks={() => selectedUserStory && onLoadTasks(selectedUserStory.objectId)} />}
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
const SprintsIcon = ({ size = '16px' }: { size?: string }) => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: size, height: size }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M6.75 2.994v2.25m10.5-2.25v2.25m-14.252 13.5V7.491a2.25 2.25 0 0 1 2.25-2.25h13.5a2.25 2.25 0 0 1 2.25 2.25v11.251m-18 0a2.25 2.25 0 0 0 2.25 2.25h13.5a2.25 2.25 0 0 0 2.25-2.25m-18 0v-7.5a2.25 2.25 0 0 1 2.25-2.25h13.5a2.25 2.25 0 0 1 2.25 2.25v7.5m-6.75-6h2.25m-9 2.25h4.5m.002-2.25h.005v.006H12v-.006Zm-.001 4.5h.006v.006h-.006v-.005Zm-2.25.001h.005v.006H9.75v-.006Zm-2.25 0h.005v.005h-.006v-.005Zm6.75-2.247h.005v.005h-.005v-.005Zm0 2.247h.006v.006h-.006v-.006Zm2.25-2.248h.006V15H16.5v-.005Z"
		/>
	</svg>
);

const UserStoriesIcon = ({ size = '16px' }: { size?: string }) => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: size, height: size }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 0 1-.657.643 48.39 48.39 0 0 1-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 0 1-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 0 0-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 0 1-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 0 0 .657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 0 1-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 0 0 5.427-.63 48.05 48.05 0 0 0 .582-4.717.532.532 0 0 0-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 0 0 .658-.663 48.422 48.422 0 0 0-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 0 1-.61-.58v0Z"
		/>
	</svg>
);

const DefectsIcon = ({ size = '16px' }: { size?: string }) => (
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

	const getSubTabStyles = (isActive: boolean, index: number, totalTabs: number) => {
		const lightTheme = isLightTheme();
		return {
			padding: '12px 20px',
			border: 'none',
			borderRight: index < totalTabs - 1 ? '1px solid var(--vscode-panel-border)' : 'none',
			borderBottom: isActive
				? lightTheme
					? '2px solid #007acc' // Blau més fosc i visible per temes clars
					: '2px solid var(--vscode-progressBar-background)' // Color estàndard per temes foscos
				: '2px solid transparent',
			borderRadius: index === 0 ? '6px 0 0 0' : index === totalTabs - 1 ? '0 6px 0 0' : '0',
			backgroundColor: isActive
				? lightTheme
					? 'rgba(0, 123, 255, 0.1)' // Blau clar subtil per temes clars
					: 'var(--vscode-tab-activeBackground)' // Color estàndard per temes foscos
				: 'transparent',
			color: isActive
				? lightTheme
					? '#1e1e1e' // Color fosc per assegurar contrast en temes clars
					: 'var(--vscode-tab-activeForeground)' // Color estàndard per temes foscos
				: lightTheme
					? '#333333'
					: 'var(--vscode-tab-inactiveForeground)',
			cursor: isActive ? 'default' : 'pointer',
			display: 'flex',
			alignItems: 'center',
			gap: '8px',
			fontSize: '13px',
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
				backgroundColor: 'var(--vscode-editor-background)',
				borderRadius: '6px 6px 0 0'
			}}
		>
			{views.map((view, index) => (
				<button key={view.id} onClick={() => activeView !== view.id && onViewChange(view.id)} style={getSubTabStyles(activeView === view.id, index, views.length)} title={view.description}>
					{renderIcon(view.icon)}
					<span>{view.label}</span>
				</button>
			))}
		</div>
	);
};

// Portfolio View Renderer Component
const PortfolioViewRenderer: FC<{
	activeViewType: PortfolioViewType;
	viewProps: PortfolioViewProps;
}> = ({ activeViewType, viewProps }) => {
	const activeView = portfolioViews.find(view => view.id === activeViewType);
	if (!activeView) {
		return <div>View not found</div>;
	}

	const ActiveComponent = activeView.component;
	return <ActiveComponent {...viewProps} />;
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
	const [iterationsLoading, setIterationsLoading] = useState(false);
	const [iterationsError, setIterationsError] = useState<string | null>(null);
	const [selectedIteration, setSelectedIteration] = useState<Iteration | null>(null);
	const [debugMode, setDebugMode] = useState<boolean>(false);
	const [currentUser, setCurrentUser] = useState<RallyUser | null>(null);
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
	const [defectsBySeverity, setDefectsBySeverity] = useState<DefectsBySeverity[]>([]);
	const [defectsBySeverityLoading, setDefectsBySeverityLoading] = useState(false);
	const [averageVelocity, setAverageVelocity] = useState<number>(0);
	const [completedPoints, setCompletedPoints] = useState<number>(0);
	const [wip, setWip] = useState<number>(0);
	const [blockedItems, setBlockedItems] = useState<number>(0);

	// Navigation state
	const [activeSection, setActiveSection] = useState<SectionType>('calendar');
	const [currentScreen, setCurrentScreen] = useState<ScreenType>('iterations');
	const [activeViewType, setActiveViewType] = useState<PortfolioViewType>('bySprints');
	const [calendarDate, setCalendarDate] = useState(new Date());

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

			// Change active view
			setActiveViewType(newViewType);

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
		if (activeViewType === 'allUserStories') {
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
		setActiveUserStoryTab('tasks');
		// Clear the attempted tracking when going back
		attemptedUserStoryDefects.current.clear();
		attemptedUserStoryDiscussions.current.clear();
	}, [activeViewType]);

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

						// Auto-select current iteration if available
						const currentIteration = findCurrentIteration(message.iterations);
						if (currentIteration) {
							setSelectedIteration(currentIteration);
							loadUserStories(currentIteration);
							setCurrentScreen('userStories');
						} else {
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
					// Determine context using iteration field from backend
					const isSprintContext = message.iteration !== null && message.iteration !== undefined;

					if (isSprintContext) {
						// Sprint Detail context - update sprint state
						setSprintUserStoriesLoading(false);
						if (message.userStories) {
							setSprintUserStories(message.userStories);
							setUserStoriesError(null);
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
							if (activeViewType === 'allUserStories') {
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
						if (activeViewType === 'allDefects' && currentScreen !== 'defects') {
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
			}
		};

		window.addEventListener('message', handleMessage);
		return () => window.removeEventListener('message', handleMessage);
	}, [findCurrentIteration, loadUserStories, activeViewType, currentScreen]); // Only include dependencies needed by handleMessage

	// Calculate metrics when data changes - load charts in parallel
	useEffect(() => {
		if (activeSection !== 'metrics') return;
		if (!iterations.length || !portfolioUserStories.length) return;

		setMetricsLoading(true);

		// Load each chart in parallel
		// Velocity chart - last 12 sprints
		(async () => {
			try {
				setVelocityLoading(true);
				const velocityResult = calculateVelocity(portfolioUserStories, iterations, 12);
				setVelocityData(velocityResult);

				// Calculate average velocity
				const avgVelocity = calculateAverageVelocity(velocityResult);
				setAverageVelocity(avgVelocity);
			} catch (error) {
				console.error('Error calculating velocity:', error);
			} finally {
				setVelocityLoading(false);
			}
		})();

		// State distribution chart
		(async () => {
			try {
				setStateDistributionLoading(true);
				const stateDistrib = groupByState(portfolioUserStories);
				setStateDistribution(stateDistrib);
			} catch (error) {
				console.error('Error calculating state distribution:', error);
			} finally {
				setStateDistributionLoading(false);
			}
		})();

		// Defects trend chart - last 6 sprints
		(async () => {
			try {
				setDefectsBySeverityLoading(true);
				const defectsBySev = aggregateDefectsBySeverity(defects, iterations, 6);
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
	}, [activeSection, iterations, portfolioUserStories, defects]);

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

				<ContentArea noPaddingTop={activeSection === 'portfolio'}>
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
									<div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '4px' }}>{teamMembers.length}</div>
									<div style={{ fontSize: '10px', opacity: 0.9 }}>Team Members (Last 6 Sprints)</div>
								</div>
							</div>

							{/* Team Members */}
							<div style={{ marginBottom: '20px' }}>
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
									<h3 style={{ margin: 0, color: 'var(--vscode-foreground)', fontSize: '18px', fontWeight: '600' }}>Team Members</h3>
									<select
										value={selectedTeamIteration}
										onChange={e => setSelectedTeamIteration(e.target.value)}
										style={{
											padding: '4px 8px',
											borderRadius: '4px',
											backgroundColor: 'var(--vscode-dropdown-background)',
											color: 'var(--vscode-dropdown-foreground)',
											border: '1px solid var(--vscode-dropdown-border)',
											cursor: 'pointer',
											fontSize: '12px'
										}}
									>
										<option value="current">{findCurrentIteration(iterations)?.name || 'Current Sprint'} (current)</option>
										{iterations
											.filter(it => {
												// Exclude current iteration to avoid duplicates
												const currentIteration = findCurrentIteration(iterations);
												if (currentIteration && it.objectId === currentIteration.objectId) {
													return false;
												}
												// Only include past iterations (end date before today)
												const endDate = new Date(it.endDate);
												const today = new Date();
												today.setHours(0, 0, 0, 0);
												endDate.setHours(0, 0, 0, 0);
												return endDate < today;
											})
											.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())
											.slice(0, 12)
											.map(it => (
												<option key={it.objectId} value={it.objectId}>
													{it.name}
												</option>
											))}
									</select>
								</div>

								{teamMembersLoading && <div style={{ padding: '20px', textAlign: 'center', color: 'var(--vscode-descriptionForeground)' }}>Loading team members...</div>}

								{teamMembersError && <div style={{ padding: '20px', textAlign: 'center', color: 'var(--vscode-errorForeground)' }}>{teamMembersError}</div>}

								{!teamMembersLoading && !teamMembersError && teamMembers.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: 'var(--vscode-descriptionForeground)' }}>No team members found in the last 6 sprints</div>}

								{!teamMembersLoading &&
									!teamMembersError &&
									teamMembers.length > 0 &&
									(() => {
										// Active members: those with user stories assigned (even if 0 hours) OR with totalHours > 0
										// This ensures users with assigned work (even 0 hours) appear in ACTIVE IN SPRINT
										const activeMembers = teamMembers.filter(m => {
											const hasStories = (m.progress as any).userStoriesCount > 0;
											const hasHours = m.progress.totalHours > 0;
											return hasStories || hasHours;
										});
										const inactiveMembers = teamMembers.filter(m => {
											const hasStories = (m.progress as any).userStoriesCount > 0;
											const hasHours = m.progress.totalHours > 0;
											return !hasStories && !hasHours;
										});

										return (
											<div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
												{/* Active Members Section */}
												{activeMembers.length > 0 && (
													<div>
														<h4
															style={{
																margin: '0 0 12px 0',
																color: 'var(--vscode-foreground)',
																fontSize: '13px',
																fontWeight: '600',
																textTransform: 'uppercase',
																letterSpacing: '0.5px',
																opacity: 0.7
															}}
														>
															Active in Sprint
														</h4>
														<div
															style={{
																display: 'grid',
																gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
																gap: '12px'
															}}
														>
															{activeMembers.map(member => {
																// Generate initials from name
																const initials = member.name
																	.split(' ')
																	.map(part => part.charAt(0).toUpperCase())
																	.join('')
																	.slice(0, 2);

																const percentage = member.progress.percentage;
																const progressColor = percentage >= 75 ? 'var(--vscode-charts-green, #4caf50)' : percentage >= 50 ? 'var(--vscode-charts-orange, #ff9800)' : percentage >= 25 ? 'var(--vscode-charts-yellow, #ffc107)' : 'var(--vscode-charts-red, #f44336)';

																return (
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
																		{/* Avatar with Progress Ring */}
																		<div role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100} aria-label={`Progress: ${member.progress.completedHours}h / ${member.progress.totalHours}h (${percentage}%)`} style={{ position: 'relative' }}>
																			<svg
																				width="64"
																				height="64"
																				style={{
																					position: 'absolute',
																					top: '-8px',
																					left: '-8px',
																					transform: 'rotate(-90deg)'
																				}}
																			>
																				<circle cx="32" cy="32" r="28" stroke="var(--vscode-widget-border)" strokeWidth="3" fill="none" />
																				<circle
																					cx="32"
																					cy="32"
																					r="28"
																					stroke={progressColor}
																					strokeWidth="3"
																					fill="none"
																					strokeDasharray={2 * Math.PI * 28}
																					strokeDashoffset={2 * Math.PI * 28 * (1 - percentage / 100)}
																					strokeLinecap="round"
																					style={{
																						transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease'
																					}}
																				/>
																			</svg>
																			<div
																				style={{
																					width: '48px',
																					height: '48px',
																					borderRadius: '50%',
																					background: 'linear-gradient(135deg, #6b7a9a 0%, #7a6b9a 100%)',
																					display: 'flex',
																					alignItems: 'center',
																					justifyContent: 'center',
																					color: 'white',
																					fontWeight: 'bold',
																					fontSize: '16px',
																					marginBottom: '6px'
																				}}
																			>
																				{initials}
																			</div>
																		</div>

																		{/* Member Info */}
																		<div style={{ width: '100%' }}>
																			<div style={{ marginBottom: '6px' }}>
																				<h4 style={{ margin: '0 0 2px 0', color: 'var(--vscode-foreground)', fontSize: '14px', fontWeight: '400' }}>{member.name}</h4>
																				<div style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)', marginTop: '4px' }}>{percentage}% complete</div>
																				<div style={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground)', marginTop: '2px' }}>
																					{member.progress.completedHours}h / {member.progress.totalHours}h
																				</div>
																			</div>
																		</div>
																	</div>
																);
															})}
														</div>
													</div>
												)}

												{/* Inactive Members Section */}
												{inactiveMembers.length > 0 && (
													<div>
														<h4
															style={{
																margin: '0 0 12px 0',
																color: 'var(--vscode-foreground)',
																fontSize: '13px',
																fontWeight: '600',
																textTransform: 'uppercase',
																letterSpacing: '0.5px',
																opacity: 0.7
															}}
														>
															Other Team Members
														</h4>
														<div
															style={{
																display: 'grid',
																gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
																gap: '12px'
															}}
														>
															{inactiveMembers.map(member => {
																// Generate initials from name
																const initials = member.name
																	.split(' ')
																	.map(part => part.charAt(0).toUpperCase())
																	.join('')
																	.slice(0, 2);

																return (
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
																		{/* Avatar without Progress Ring */}
																		<div style={{ position: 'relative' }}>
																			<svg
																				width="48"
																				height="48"
																				style={{
																					position: 'absolute',
																					top: '-6px',
																					left: '-6px'
																				}}
																			>
																				<circle cx="24" cy="24" r="21" stroke="var(--vscode-widget-border)" strokeWidth="3" fill="none" />
																			</svg>
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
																				{initials}
																			</div>
																		</div>

																		{/* Member Info */}
																		<div style={{ width: '100%' }}>
																			<div style={{ marginBottom: '6px' }}>
																				<h4 style={{ margin: '0', color: 'var(--vscode-foreground)', fontSize: '12px', fontWeight: '400' }}>{member.name}</h4>
																			</div>
																		</div>
																	</div>
																);
															})}
														</div>
													</div>
												)}
											</div>
										);
									})()}
							</div>
						</div>
					)}

					{activeSection === 'library' && !selectedTutorial && (
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
											{banner.icon && typeof banner.icon === 'function' ? React.createElement(banner.icon as ComponentType<{ size?: string }>, { size: '28px' }) : React.createElement(banner.icon as ComponentType, {})}
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
								<p style={{ margin: 0, color: 'var(--vscode-descriptionForeground)', fontSize: '14px' }}>Real-time insights from Rally</p>
							</div>

							{/* Sprint KPIs */}
							<SprintKPIs averageVelocity={averageVelocity} completedPoints={completedPoints} wip={wip} blockedItems={blockedItems} loading={metricsLoading} />

							{/* Velocity Trend Chart */}
							<div style={{ marginBottom: '20px' }}>
								<VelocityTrendChart data={velocityData} loading={velocityLoading} />
							</div>

							{/* State Distribution and Defect Severity Charts */}
							<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
								<StateDistributionPie data={stateDistribution} loading={stateDistributionLoading} />
								<DefectSeverityChart data={defectsBySeverity} loading={defectsBySeverityLoading} />
							</div>
						</div>
					)}

					{activeSection === 'collaboration' && <CollaborationView selectedUserStoryId={selectedUserStory?.formattedId || selectedUserStory?.objectId || null} />}

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
											<p>Salesforce CRM is the world&apos;s leading customer relationship management platform that helps businesses connect with customers, partners, and prospects.</p>

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
											<p>LWC is Salesforce&apos;s modern programming model for building fast, reusable components on the Lightning Platform.</p>

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

					{activeSection === 'library' && !selectedTutorial && (
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
							<PortfolioViewSelector views={portfolioViews} activeView={activeViewType} onViewChange={switchViewType} />
							<PortfolioViewRenderer
								activeViewType={activeViewType}
								viewProps={{
									iterations,
									iterationsLoading,
									iterationsError,
									selectedIteration,
									userStories,
									userStoriesLoading,
									userStoriesError,
									selectedUserStory,
									userStoriesHasMore,
									userStoriesLoadingMore,
									loadMoreUserStories,
									portfolioUserStories,
									portfolioUserStoriesLoading,
									portfolioUserStoriesHasMore,
									portfolioUserStoriesLoadingMore,
									sprintUserStories,
									sprintUserStoriesLoading,
									tasks,
									tasksLoading,
									tasksError,
									userStoryDefects,
									userStoryDefectsLoading,
									_userStoryDefectsError: userStoryDefectsError,
									userStoryDiscussions,
									userStoryDiscussionsLoading,
									userStoryDiscussionsError,
									_defects: defects,
									_defectsLoading: defectsLoading,
									_defectsError: defectsError,
									_defectsHasMore: defectsHasMore,
									_defectsLoadingMore: defectsLoadingMore,
									_onLoadMoreDefects: loadMoreDefects,
									_selectedDefect: selectedDefect,
									activeUserStoryTab,
									currentScreen,
									onLoadIterations: loadIterations,
									onIterationSelected: handleIterationSelected,
									onUserStorySelected: handleUserStorySelected,
									onLoadUserStories: loadUserStories,
									onClearUserStories: clearUserStories,
									onLoadTasks: loadTasks,
									onLoadUserStoryDefects: loadUserStoryDefects,
									_onLoadDefects: loadAllDefects,
									_onDefectSelected: handleDefectSelected,
									onBackToIterations: handleBackToIterations,
									onBackToUserStories: handleBackToUserStories,
									_onBackToDefects: handleBackToDefects,
									onActiveUserStoryTabChange: setActiveUserStoryTab
								}}
							/>
						</>
					)}
				</ContentArea>
			</CenteredContainer>
		</Container>
	);
};

export default MainWebview;
