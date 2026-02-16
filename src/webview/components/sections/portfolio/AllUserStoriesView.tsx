import type { FC } from 'react';
import UserStoriesTable from '../../common/UserStoriesTable';
import UserStoryForm from '../../common/UserStoryForm';
import TasksTable from '../../common/TasksTable';
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
}) => (
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
				<UserStoryForm userStory={selectedUserStory} selectedAdditionalTab={activeUserStoryTab} onAdditionalTabChange={onActiveUserStoryTabChange} />
				{activeUserStoryTab === 'tasks' && <TasksTable tasks={tasks as RallyTask[]} loading={tasksLoading} error={tasksError} onLoadTasks={() => selectedUserStory && onLoadTasks(selectedUserStory.objectId)} />}
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
						error={userStoryDefectsError || undefined}
						onLoadDefects={() => selectedUserStory && onLoadUserStoryDefects(selectedUserStory.objectId)}
						onDefectSelected={onDefectSelected}
						selectedDefect={selectedDefect as Defect | null}
					/>
				)}
				{activeUserStoryTab === 'discussions' && <DiscussionsTable discussions={userStoryDiscussions} loading={userStoryDiscussionsLoading} error={userStoryDiscussionsError} />}
			</>
		)}
	</div>
);

export default AllUserStoriesView;
