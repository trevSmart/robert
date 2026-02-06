/// <reference path="../../common/CollapsibleCard.d.ts" />
import type { FC } from 'react';
import UserStoriesTable, { IterationsTable } from '../../common/UserStoriesTable';
import UserStoryForm from '../../common/UserStoryForm';
import TasksTable from '../../common/TasksTable';
import DefectsTable from '../../common/DefectsTable';
import DiscussionsTable from '../../common/DiscussionsTable';
import ScreenHeader from '../../common/ScreenHeader';
import SprintDetailsForm from '../../common/SprintDetailsForm';
import AssigneeHoursChart from '../../common/AssigneeHoursChart';
import '../../common/CollapsibleCard';
import { type RallyTask } from '../../../../../types/rally';
import type { Defect } from '../../../../../types/rally';
import type { PortfolioViewProps } from './types';

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

export default BySprintsView;
