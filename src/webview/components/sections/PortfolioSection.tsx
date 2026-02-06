/// <reference path="../common/CollapsibleCard.d.ts" />
import type { FC, ComponentType } from 'react';
import UserStoriesTable, { IterationsTable } from '../common/UserStoriesTable';
import UserStoryForm from '../common/UserStoryForm';
import TasksTable from '../common/TasksTable';
import DefectsTable from '../common/DefectsTable';
import ScreenHeader from '../common/ScreenHeader';
import SprintDetailsForm from '../common/SprintDetailsForm';
import '../common/CollapsibleCard';
import type { PortfolioViewType, PortfolioViewProps } from './portfolio/types';
import BySprintsView from './portfolio/BySprintsView';
import AllUserStoriesView from './portfolio/AllUserStoriesView';
import AllDefectsView from './portfolio/AllDefectsView';

export type { PortfolioViewType, ScreenType, PortfolioViewProps } from './portfolio/types';

interface PortfolioViewConfig {
	id: PortfolioViewType;
	component: ComponentType<PortfolioViewProps>;
}

const portfolioViews: PortfolioViewConfig[] = [
	{ id: 'bySprints', component: BySprintsView },
	{ id: 'allUserStories', component: AllUserStoriesView },
	{ id: 'allDefects', component: AllDefectsView }
];

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

export interface PortfolioSectionProps extends PortfolioViewProps {
	activeViewType: PortfolioViewType;
}

const PortfolioSection: FC<PortfolioSectionProps> = ({ activeViewType, ...viewProps }) => <PortfolioViewRenderer activeViewType={activeViewType} viewProps={viewProps} />;

export default PortfolioSection;
