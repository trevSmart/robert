import type { FC } from 'react';
import DefectsTable from '../../common/DefectsTable';
import DefectForm from '../../common/DefectForm';
import ScreenHeader from '../../common/ScreenHeader';
import { logDebug } from '../../../utils/vscodeApi';
import type { Defect } from '../../../../../types/rally';
import type { PortfolioViewProps } from './types';

const AllDefectsView: FC<PortfolioViewProps> = ({ _defects, _defectsLoading, _defectsError, _selectedDefect, currentScreen, _onLoadDefects, _onDefectSelected, _onBackToDefects, _defectsHasMore = false, _defectsLoadingMore = false, _onLoadMoreDefects }) => {
	logDebug(`_onDefectSelected: ${JSON.stringify(_onDefectSelected)}, currentScreen: ${currentScreen}`, 'AllDefectsView');
	return (
		<>
			{currentScreen === 'defects' && (
				<>
					<ScreenHeader title="All Defects" />
					<DefectsTable
						defects={_defects as Defect[]}
						loading={_defectsLoading}
						error={_defectsError || undefined}
						onLoadDefects={_onLoadDefects}
						onDefectSelected={_onDefectSelected}
						selectedDefect={_selectedDefect as Defect | null}
						hasMore={_defectsHasMore}
						onLoadMore={_onLoadMoreDefects}
						loadingMore={_defectsLoadingMore}
					/>
				</>
			)}
			{currentScreen === 'defectDetail' && _selectedDefect && (
				<>
					<ScreenHeader title={`${_selectedDefect.formattedId}: ${_selectedDefect.name}`} showBackButton={true} onBack={_onBackToDefects} />
					<DefectForm defect={_selectedDefect as Defect} />
				</>
			)}
		</>
	);
};

export default AllDefectsView;
