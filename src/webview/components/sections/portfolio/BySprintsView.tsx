/// <reference path="../../common/CollapsibleCard.d.ts" />
import type { FC } from 'react';
import { useState } from 'react';
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
	const [showOnlyThreeFutureSprints, setShowOnlyThreeFutureSprints] = useState(true);

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

	const getFilteredIterations = () => {
		if (!showOnlyThreeFutureSprints) {
			return iterations;
		}

		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const past: typeof iterations = [];
		const future: typeof iterations = [];

		iterations.forEach(iteration => {
			const startDate = iteration.startDate ? new Date(iteration.startDate) : null;
			if (startDate && startDate > today) {
				future.push(iteration);
			} else {
				past.push(iteration);
			}
		});

		future.sort((a, b) => {
			const aDate = a.startDate ? new Date(a.startDate).getTime() : 0;
			const bDate = b.startDate ? new Date(b.startDate).getTime() : 0;
			return aDate - bDate;
		});

		return [...past, ...future.slice(0, 2)];
	};

	const filteredIterations = getFilteredIterations();

	const rightContent = (
		<label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: 'normal' }}>
			<input type="checkbox" checked={showOnlyThreeFutureSprints} onChange={e => setShowOnlyThreeFutureSprints(e.target.checked)} style={{ cursor: 'pointer' }} />
			<span>Show all future sprints</span>
		</label>
	);

	return (
		<div style={{ padding: '0 20px' }}>
			{currentScreen === 'iterations' && (
				<>
					<ScreenHeader title="All Sprints" sticky={true} rightContent={rightContent} />
					<IterationsTable iterations={filteredIterations} loading={iterationsLoading} error={iterationsError} onLoadIterations={onLoadIterations} onIterationSelected={onIterationSelected} selectedIteration={selectedIteration} />
				</>
			)}

			{currentScreen === 'userStories' && selectedIteration && (
				<>
					<ScreenHeader title={`Sprint "${selectedIteration.name}"`} showBackButton={true} onBack={onBackToIterations} />
					<collapsible-card title="Details">
						<SprintDetailsForm iteration={selectedIteration} />
					</collapsible-card>
					{sprintUserStories.length === 0 ? (
						<div style={{ padding: '20px', textAlign: 'center', color: 'var(--vscode-descriptionForeground)' }}>
							<p>This sprint has no user stories</p>
						</div>
					) : (
						<>
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
				</>
			)}

			{currentScreen === 'userStoryDetail' && selectedUserStory && (
				<>
					<ScreenHeader title={`User story "${selectedUserStory.formattedId}: ${selectedUserStory.name}"`} showBackButton={true} onBack={onBackToUserStories} />
					<UserStoryForm userStory={selectedUserStory} selectedAdditionalTab={activeUserStoryTab} onAdditionalTabChange={onActiveUserStoryTabChange} additionalTabContent={additionalTabContent} />
				</>
			)}
		</div>
	);
};

export default BySprintsView;
