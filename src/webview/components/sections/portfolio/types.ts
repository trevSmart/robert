import type { UserStory, RallyTask, RallyDefect, Discussion } from '../../../../types/rally';

export type PortfolioViewType = 'bySprints' | 'allUserStories' | 'allDefects';

export type ScreenType = 'iterations' | 'userStories' | 'userStoryDetail' | 'allUserStories' | 'defects' | 'defectDetail';

export interface PortfolioIteration {
	objectId: string;
	name: string;
	startDate: string;
	endDate: string;
	state: string;
	project: string | null;
	_ref: string;
}

export interface PortfolioViewProps {
	iterations: PortfolioIteration[];
	iterationsLoading: boolean;
	iterationsError: string | null;
	selectedIteration: PortfolioIteration | null;
	userStories: UserStory[];
	userStoriesLoading: boolean;
	userStoriesError: string | null;
	selectedUserStory: UserStory | null;
	userStoriesHasMore?: boolean;
	userStoriesLoadingMore?: boolean;
	loadMoreUserStories?: () => void;
	portfolioUserStories: UserStory[];
	portfolioUserStoriesLoading: boolean;
	portfolioUserStoriesHasMore?: boolean;
	portfolioUserStoriesLoadingMore?: boolean;
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
	onIterationSelected: (iteration: PortfolioIteration) => void;
	onUserStorySelected: (userStory: UserStory) => void;
	onLoadUserStories: (iteration?: PortfolioIteration) => void;
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
