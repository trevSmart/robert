import { FC } from 'react';
import SprintKPIs from '../metrics/SprintKPIs';
import VelocityTrendChart from '../metrics/VelocityTrendChart';
import StateDistributionPie from '../metrics/StateDistributionPie';
import DefectSeverityChart from '../metrics/DefectSeverityChart';
import type { VelocityData, StateDistribution, DefectsBySeverity, BlockedDistribution } from '../../utils/metricsUtils';

export interface MetricsSectionProps {
	averageVelocity: number;
	completedPoints: number;
	wip: number;
	blockedItems: number;
	metricsLoading: boolean;
	velocityData: VelocityData[];
	velocityLoading: boolean;
	stateDistribution: StateDistribution[];
	stateDistributionLoading: boolean;
	blockedDistribution: BlockedDistribution[];
	nextSprintName: string;
	selectedReadinessSprint: string;
	onReadinessSprintChange: (value: string) => void;
	sprintIterations: Array<{ objectId: string; name: string; startDate: string }>;
	defectsBySeverity: DefectsBySeverity[];
	defectsBySeverityLoading: boolean;
}

const MetricsSection: FC<MetricsSectionProps> = ({
	averageVelocity,
	completedPoints,
	wip,
	blockedItems,
	metricsLoading,
	velocityData,
	velocityLoading,
	stateDistribution,
	stateDistributionLoading,
	blockedDistribution,
	nextSprintName,
	selectedReadinessSprint,
	onReadinessSprintChange,
	sprintIterations,
	defectsBySeverity,
	defectsBySeverityLoading
}) => (
	<div style={{ padding: '20px' }}>
		{/* Metrics Header */}
		<div style={{ marginBottom: '30px', textAlign: 'center' }}>
			<h2 style={{ margin: '0 0 8px 0', color: 'var(--vscode-foreground)', fontSize: '24px', fontWeight: '600' }}>Project Analytics</h2>
			<p style={{ margin: 0, color: 'var(--vscode-descriptionForeground)', fontSize: '14px' }}>Real-time insights from Rally</p>
		</div>

		{/* Sprint KPIs */}
		<SprintKPIs averageVelocity={averageVelocity} completedPoints={completedPoints} wip={wip} blockedItems={blockedItems} loading={metricsLoading} />

		{/* Velocity Trend Chart */}
		<div style={{ marginBottom: '20px' }}>
			<VelocityTrendChart data={velocityData} loading={velocityLoading} />
		</div>

		{/* State Distribution and Defect Severity Charts */}
		<div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: '20px' }}>
			<StateDistributionPie data={stateDistribution} blockedData={blockedDistribution} sprintName={nextSprintName} loading={stateDistributionLoading} selectedSprint={selectedReadinessSprint} onSprintChange={onReadinessSprintChange} iterations={sprintIterations} showSelector={true} />
			<DefectSeverityChart data={defectsBySeverity} loading={defectsBySeverityLoading} />
		</div>
	</div>
);

export default MetricsSection;
