import type { FC } from 'react';
import UserStoriesTable from '../../common/UserStoriesTable';
import UserStoryForm from '../../common/UserStoryForm';
import TasksTable from '../../common/TasksTable';
import TestCasesTable from '../../common/TestCasesTable';
import DefectsTable from '../../common/DefectsTable';
import DiscussionsTable from '../../common/DiscussionsTable';
import ScreenHeader from '../../common/ScreenHeader';
import { type RallyTask } from '../../../../../types/rally';
import type { Defect } from '../../../../../types/rally';
import type { PortfolioViewProps } from './types';

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
	userStoryDefectsError,
	userStoryTestCases,
	userStoryTestCasesLoading,
	userStoryTestCasesError,
	userStoryDiscussions,
	userStoryDiscussionsLoading,
	userStoryDiscussionsError,
	selectedDefect,
	activeUserStoryTab,
	currentScreen,
	onLoadUserStories,
	onClearUserStories,
	onUserStorySelected,
	onLoadTasks,
	onLoadUserStoryDefects,
	onDefectSelected,
	onBackToUserStories,
	onActiveUserStoryTabChange,
	loadMoreUserStories
}) => {
	const additionalTabContent = selectedUserStory
		? {
				tasks: <TasksTable tasks={tasks as RallyTask[]} loading={tasksLoading} error={tasksError} onLoadTasks={() => selectedUserStory && onLoadTasks(selectedUserStory.objectId)} embedded />,
				tests: <TestCasesTable testCases={userStoryTestCases} loading={userStoryTestCasesLoading} error={userStoryTestCasesError} embedded />,
				defects: (
					<DefectsTable
						defects={userStoryDefects as Defect[]}
						loading={userStoryDefectsLoading}
						error={userStoryDefectsError || undefined}
						onLoadDefects={() => selectedUserStory && onLoadUserStoryDefects(selectedUserStory.objectId)}
						onDefectSelected={onDefectSelected}
						selectedDefect={selectedDefect as Defect | null}
						embedded
					/>
				),
				discussions: <DiscussionsTable discussions={userStoryDiscussions} loading={userStoryDiscussionsLoading} error={userStoryDiscussionsError} embedded />
			}
		: undefined;

	return (
		<div style={{ padding: '0 20px' }}>
			{currentScreen === 'allUserStories' && !selectedUserStory && (
				<>
					<ScreenHeader title="All User Stories" />
					<UserStoriesTable
						userStories={portfolioUserStories}
						loading={portfolioUserStoriesLoading}
						error={userStoriesError}
						onLoadUserStories={() => onLoadUserStories()}
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
					<UserStoryForm userStory={selectedUserStory} selectedAdditionalTab={activeUserStoryTab} onAdditionalTabChange={onActiveUserStoryTabChange} additionalTabContent={additionalTabContent} />
				</>
			)}
		</div>
	);
};

export default AllUserStoriesView;
