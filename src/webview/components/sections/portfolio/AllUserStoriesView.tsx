import type { FC } from 'react';
import UserStoriesTable from '../../common/UserStoriesTable';
import UserStoryForm from '../../common/UserStoryForm';
import TasksTable from '../../common/TasksTable';
import TestCasesTable from '../../common/TestCasesTable';
import DefectsTable from '../../common/DefectsTable';
import DiscussionsTable from '../../common/DiscussionsTable';
import ScreenHeader from '../../common/ScreenHeader';
import OpenInJiraButton from '../../common/OpenInJiraButton';
import FavoriteButton from '../../common/FavoriteButton';
import TitleActions from '../../common/TitleActions';
import { type JiraTask } from '../../../../../types/jira';
import type { Defect } from '../../../../../types/jira';
import UserStoryFiltersBar from '../../common/UserStoryFiltersBar';
import type { PortfolioViewProps } from './types';

const AllUserStoriesView: FC<PortfolioViewProps> = ({
	iterations,
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
	loadMoreUserStories,
	collaborationEnabled,
	userStoryFilters,
	userStoryFilterProjects = [],
	onUserStoryFiltersChange
}) => {
	const additionalTabContent = selectedUserStory
		? {
				tasks: <TasksTable tasks={tasks as JiraTask[]} loading={tasksLoading} error={tasksError} onLoadTasks={() => selectedUserStory && onLoadTasks(selectedUserStory.objectId)} embedded />,
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
					<ScreenHeader title="All User Stories" sticky={true} />
					{userStoryFilters && onUserStoryFiltersChange && <UserStoryFiltersBar filters={userStoryFilters} projects={userStoryFilterProjects} sprints={iterations} onChange={onUserStoryFiltersChange} />}
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
					<ScreenHeader
						entityType="userstory"
						title={`${selectedUserStory.formattedId}: ${selectedUserStory.name}`}
						projectKey={selectedUserStory.project}
						showBackButton={true}
						onBack={onBackToUserStories}
						titleActions={
							<TitleActions>
								<FavoriteButton
									item={{
										objectId: selectedUserStory.objectId,
										formattedId: selectedUserStory.formattedId,
										name: selectedUserStory.name,
										type: 'userstory',
										project: selectedUserStory.project
									}}
								/>
								<OpenInJiraButton objectId={selectedUserStory.objectId} />
							</TitleActions>
						}
					/>
					<UserStoryForm userStory={selectedUserStory} selectedAdditionalTab={activeUserStoryTab} onAdditionalTabChange={onActiveUserStoryTabChange} additionalTabContent={additionalTabContent} collaborationEnabled={collaborationEnabled} iterations={iterations} />
				</>
			)}
		</div>
	);
};

export default AllUserStoriesView;
