/// <reference path="./common/CollapsibleCard.d.ts" />
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
import SubTabsBar from './common/SubTabsBar';
import { getPortfolioSubTabs } from './sections/portfolio/portfolioSubTabs';
import SprintDetailsForm from './common/SprintDetailsForm';
import AssigneeHoursChart from './common/AssigneeHoursChart';
import './common/CollapsibleCard';
import SprintKPIs from './metrics/SprintKPIs';
import VelocityTrendChart from './metrics/VelocityTrendChart';
import StateDistributionPie from './metrics/StateDistributionPie';
import DefectSeverityChart from './metrics/DefectSeverityChart';
import CollaborationSection from './sections/CollaborationSection';
import CalendarSection from './sections/CalendarSection';
import LibrarySection, { type Tutorial } from './sections/LibrarySection';
import PortfolioSection, { type PortfolioViewType } from './sections/PortfolioSection';
import SearchSection from './sections/SearchSection';
import TeamSection from './sections/TeamSection';
import { logDebug } from '../utils/vscodeApi';
import { type UserStory, type Defect, type Discussion, type GlobalSearchResultItem } from '../../types/rally';
import type { Holiday } from '../../types/utils';
import { isLightTheme } from '../utils/themeColors';
import { calculateWIP, calculateBlockedItems, groupByState, aggregateDefectsBySeverity, calculateCompletedPoints, groupByBlockedStatus, type VelocityData, type StateDistribution, type DefectsBySeverity, type BlockedDistribution } from '../utils/metricsUtils';

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

// Small icons for global search result entity type badges (match UserStoryForm tab icons)
const SearchResultUserStoryIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '14px', height: '14px', flexShrink: 0 }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 0 1-.657.643 48.39 48.39 0 0 1-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 0 1-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 0 0-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 0 1-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 0 0 .657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 0 1-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 0 0 5.427-.63 48.05 48.05 0 0 0 .582-4.717.532.532 0 0 0-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 0 0 .658-.663 48.422 48.422 0 0 0-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 0 1-.61-.58v0Z"
		/>
	</svg>
);
const SearchResultTaskIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '14px', height: '14px', flexShrink: 0 }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M21.75 6.75a4.5 4.5 0 0 1-4.884 4.484c-1.076-.091-2.264.071-2.95.904l-7.152 8.684a2.548 2.548 0 1 1-3.586-3.586l8.684-7.152c.833-.686.995-1.874.904-2.95a4.5 4.5 0 0 1 6.336-4.486l-3.276 3.276a3.004 3.004 0 0 0 2.25 2.25l3.276-3.276c.256.565.398 1.192.398 1.852Z"
		/>
		<path strokeLinecap="round" strokeLinejoin="round" d="M4.867 19.125h.008v.008h-.008v-.008Z" />
	</svg>
);
const SearchResultTestCaseIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '14px', height: '14px', flexShrink: 0 }}>
		<path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
	</svg>
);
const SearchResultDefectIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '14px', height: '14px', flexShrink: 0 }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M12 12.75c1.148 0 2.278.08 3.383.237 1.037.146 1.866.966 1.866 2.013 0 3.728-2.35 6.75-5.25 6.75S6.75 18.728 6.75 15c0-1.046.83-1.867 1.866-2.013A24.204 24.204 0 0 1 12 12.75Zm0 0c2.883 0 5.647.508 8.207 1.44a23.91 23.91 0 0 1-1.152 6.06M12 12.75c-2.883 0-5.647.508-8.208 1.44.125 2.104.52 4.136 1.153 6.06M12 12.75a2.25 2.25 0 0 0 2.248-2.354M12 12.75a2.25 2.25 0 0 1-2.248-2.354M12 8.25c.995 0 1.971-.08 2.922-.236.403-.066.74-.358.795-.762a3.778 3.778 0 0 0-.399-2.25M12 8.25c-.995 0-1.97-.08-2.922-.236-.402-.066-.74-.358-.795-.762a3.734 3.734 0 0 1 .4-2.253M12 8.25a2.25 2.25 0 0 0-2.248 2.146M12 8.25a2.25 2.25 0 0 1 2.248 2.146M8.683 5a6.032 6.032 0 0 1-1.155-1.002c.07-.63.27-1.222.574-1.747m.581 2.749A3.75 3.75 0 0 1 15.318 5m0 0c.427-.283.815-.62 1.155-.999a4.471 4.471 0 0 0-.575-1.752M4.921 6a24.048 24.048 0 0 0-.392 3.314c1.668.546 3.416.914 5.223 1.082M19.08 6c.205 1.08.337 2.187.392 3.314a23.882 23.882 0 0 1-5.223 1.082"
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

import { CenteredContainer, Container, ContentArea, GlobalStyle, StickyNav } from './common/styled';
import { getVsCodeApi } from '../utils/vscodeApi';
import type { RallyTask, RallyDefect, RallyUser } from '../../types/rally';

type SectionType = 'search' | 'calendar' | 'portfolio' | 'team' | 'library' | 'metrics' | 'collaboration';
type ScreenType = 'iterations' | 'userStories' | 'userStoryDetail' | 'allUserStories' | 'defects' | 'defectDetail';

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
		setActiveUserStoryTab('tasks');
		// Clear the attempted tracking when going back
		attemptedUserStoryDefects.current.clear();
		attemptedUserStoryDiscussions.current.clear();
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
						if (state.activeViewType) setActiveSubTabBySection(prev => ({ ...prev, portfolio: state.activeViewType }));
						if (state.activeSubTabBySection) setActiveSubTabBySection(prev => ({ ...prev, ...state.activeSubTabBySection }));
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
				<StickyNav>
					<NavigationBar activeSection={activeSection} onSectionChange={handleSectionChange} collaborationBadgeCount={collaborationHelpRequestsCount} />
					{activeSection === 'portfolio' &&
						(() => {
							const subTabs = getPortfolioSubTabs();
							const activeSubTabId = activeSubTabBySection['portfolio'] ?? subTabs[0]?.id ?? 'bySprints';
							return <SubTabsBar subTabs={subTabs} activeSubTabId={activeSubTabId} onSubTabChange={id => activeSection === 'portfolio' && switchViewType(id as PortfolioViewType)} />;
						})()}
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
							<div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: '20px' }}>
								<StateDistributionPie
									data={stateDistribution}
									blockedData={blockedDistribution}
									sprintName={nextSprintName}
									loading={stateDistributionLoading}
									selectedSprint={selectedReadinessSprint}
									onSprintChange={setSelectedReadinessSprint}
									iterations={iterations
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
									showSelector={true}
								/>
								<DefectSeverityChart data={defectsBySeverity} loading={defectsBySeverityLoading} />
							</div>
						</div>
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
							_userStoryDefectsError={userStoryDefectsError}
							userStoryDiscussions={userStoryDiscussions}
							userStoryDiscussionsLoading={userStoryDiscussionsLoading}
							userStoryDiscussionsError={userStoryDiscussionsError}
							_defects={defects}
							_defectsLoading={defectsLoading}
							_defectsError={defectsError}
							_defectsHasMore={defectsHasMore}
							_defectsLoadingMore={defectsLoadingMore}
							_onLoadMoreDefects={loadMoreDefects}
							_selectedDefect={selectedDefect}
							activeUserStoryTab={activeUserStoryTab}
							currentScreen={currentScreen}
							onLoadIterations={loadIterations}
							onIterationSelected={handleIterationSelected}
							onUserStorySelected={handleUserStorySelected}
							onLoadUserStories={loadUserStories}
							onClearUserStories={clearUserStories}
							onLoadTasks={loadTasks}
							onLoadUserStoryDefects={loadUserStoryDefects}
							_onLoadDefects={loadAllDefects}
							_onDefectSelected={handleDefectSelected}
							onBackToIterations={handleBackToIterations}
							onBackToUserStories={handleBackToUserStories}
							_onBackToDefects={handleBackToDefects}
							onActiveUserStoryTabChange={setActiveUserStoryTab}
						/>
					)}
				</ContentArea>
			</CenteredContainer>
		</Container>
	);
};

export default MainWebview;
