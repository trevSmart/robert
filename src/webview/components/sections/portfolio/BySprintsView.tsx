/// <reference path="../../common/CollapsibleCard.d.ts" />
import type { FC } from 'react';
import UserStoriesTable, { IterationsTable } from '../../common/UserStoriesTable';
import UserStoryForm from '../../common/UserStoryForm';
import TasksTable from '../../common/TasksTable';
import TestCasesTable from '../../common/TestCasesTable';
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
	userStoryDefectsError,
	userStoryTestCases,
	userStoryTestCasesLoading,
	userStoryTestCasesError,
	userStoryDiscussions,
	userStoryDiscussionsLoading,
	userStoryDiscussionsError,
	defects,
	defectsLoading,
	defectsError,
	selectedDefect,
	activeUserStoryTab,
	currentScreen,
	onLoadIterations,
	onIterationSelected,
	onUserStorySelected,
	onLoadUserStories,
	onClearUserStories,
	onLoadTasks,
	onLoadUserStoryDefects,
	onLoadDefects,
	onDefectSelected,
	onBackToIterations,
	onBackToUserStories,
	onBackToDefects,
	onActiveUserStoryTabChange
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
			{currentScreen === 'iterations' && (
				<>
					<ScreenHeader title="Sprints" />
					<IterationsTable iterations={iterations} loading={iterationsLoading} error={iterationsError} onLoadIterations={onLoadIterations} onIterationSelected={onIterationSelected} selectedIteration={selectedIteration} />
				</>
			)}

			{currentScreen === 'userStories' && selectedIteration && (
				<>
					<ScreenHeader title={`Sprint "${selectedIteration.name}"`} showBackButton={true} onBack={onBackToIterations} />
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
					<UserStoryForm userStory={selectedUserStory} selectedAdditionalTab={activeUserStoryTab} onAdditionalTabChange={onActiveUserStoryTabChange} additionalTabContent={additionalTabContent} />
				</>
			)}
		</div>
	);
};

export default BySprintsView;
