import type { FC } from 'react';
import DefectsTable from '../../common/DefectsTable';
import DefectForm from '../../common/DefectForm';
import ScreenHeader from '../../common/ScreenHeader';
import OpenInJiraButton from '../../common/OpenInJiraButton';
import FavoriteButton from '../../common/FavoriteButton';
import TitleActions from '../../common/TitleActions';
import { logDebug } from '../../../utils/vscodeApi';
import type { Defect } from '../../../../../types/jira';
import type { PortfolioViewProps } from './types';

const AllDefectsView: FC<PortfolioViewProps> = ({ defects, defectsLoading, defectsError, selectedDefect, currentScreen, onLoadDefects, onDefectSelected, onBackToDefects, defectsHasMore = false, defectsLoadingMore = false, onLoadMoreDefects }) => {
	logDebug(`onDefectSelected: ${JSON.stringify(onDefectSelected)}, currentScreen: ${currentScreen}`, 'AllDefectsView');
	return (
		<div style={{ padding: '0 20px' }}>
			{currentScreen === 'defects' && (
				<>
					<ScreenHeader title="All Defects" sticky={true} />
					<DefectsTable
						defects={defects as Defect[]}
						loading={defectsLoading}
						error={defectsError || undefined}
						onLoadDefects={onLoadDefects}
						onDefectSelected={onDefectSelected}
						selectedDefect={selectedDefect as Defect | null}
						hasMore={defectsHasMore}
						onLoadMore={onLoadMoreDefects}
						loadingMore={defectsLoadingMore}
					/>
				</>
			)}
			{currentScreen === 'defectDetail' && selectedDefect && (
				<>
					<ScreenHeader
						entityType="defect"
						title={`${selectedDefect.formattedId}: ${selectedDefect.name}`}
						showBackButton={true}
						onBack={onBackToDefects}
						titleActions={
							<TitleActions>
								<FavoriteButton
									item={{
										objectId: selectedDefect.objectId,
										formattedId: selectedDefect.formattedId,
										name: selectedDefect.name,
										type: 'defect',
										project: selectedDefect.project
									}}
								/>
								<OpenInJiraButton objectId={selectedDefect.objectId} artifactType="defect" />
							</TitleActions>
						}
					/>
					<DefectForm defect={selectedDefect as Defect} />
				</>
			)}
		</div>
	);
};

export default AllDefectsView;
