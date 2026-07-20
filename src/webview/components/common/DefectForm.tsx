import { FC } from 'react';
import styled from 'styled-components';
import { AvatarFormField } from './Avatar';
import { EntityRefFormField } from './EntityTypeBadge';
import { isLightTheme, getScheduleStateColor as getThemeScheduleStateColor } from '../../utils/themeColors';
import BlockedReasonBanner from './BlockedReasonBanner';
import ResizableDescription from './ResizableDescription';
import './CollapsibleCard';

const StatusPill = styled.div<{ isBlocked: boolean }>`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-height: 20px;
	padding: 1px 8px;
	border-radius: 6px;
	font-size: 11px;
	font-weight: 500;
	letter-spacing: 0.2px;
	background: ${props => (props.isBlocked ? 'color(srgb 0.75 0.2 0.2 / 0.15)' : 'color(srgb 0.15 0.55 0.3 / 0.15)')};
	color: ${props => (props.isBlocked ? 'color(srgb 0.82 0.32 0.32 / 1)' : 'color(srgb 0.28 0.72 0.46 / 1)')};
	border: 1px solid ${props => (props.isBlocked ? 'color(srgb 0.75 0.2 0.2 / 0.35)' : 'color(srgb 0.15 0.55 0.3 / 0.35)')};
`;

interface Defect {
	objectId: string;
	formattedId: string;
	name: string;
	description: string | null;
	state: string;
	scheduleState?: string;
	severity: string;
	priority: string;
	owner: string;
	project: string | null;
	iteration: string | null;
	blocked: boolean;
	blockedReason?: string | null;
	discussionCount: number;
	environment?: string;
	foundInBuild?: string;
	targetBuild?: string;
	acceptedDate?: string;
	closedDate?: string;
	createdDate?: string;
	lastModifiedDate?: string;
}

interface DefectFormProps {
	defect: Defect;
}

const DefectForm: FC<DefectFormProps> = ({ defect }) => {
	const lightTheme = isLightTheme();

	const getInfoCardStyles = () => {
		return {
			background: lightTheme ? 'rgba(0, 0, 0, 0.04)' : 'color(srgb 0.2 0.2 0.2 / 0.6)',
			border: lightTheme ? '1px solid rgba(0, 0, 0, 0.12)' : '1px solid color(srgb 0.8 0.8 0.8 / 0.08)',
			borderRadius: '10px',
			padding: '10px 12px',
			display: 'flex',
			flexDirection: 'column' as const,
			gap: '4px',
			alignItems: 'flex-start',
			justifyContent: 'center',
			minHeight: '56px'
		};
	};

	const getScheduleStateColor = getThemeScheduleStateColor;

	return (
		<>
			<collapsible-card title="Details">
				<div slot="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginLeft: '12px' }}>
					{defect.scheduleState && (
						<div
							style={{
								fontSize: '13px',
								fontWeight: '300',
								color: getScheduleStateColor(defect.scheduleState)
							}}
						>
							{defect.scheduleState}
						</div>
					)}
					<StatusPill isBlocked={defect.blocked} title={defect.blocked ? (defect.blockedReason ?? undefined) : undefined}>
						{defect.blocked ? 'Blocked' : 'Not Blocked'}
					</StatusPill>
				</div>
				<div
					style={{
						padding: '20px',
						display: 'flex',
						flexDirection: 'column',
						gap: '20px'
					}}
				>
					{defect.blocked && defect.blockedReason && <BlockedReasonBanner blocked={defect.blocked} blockedReason={defect.blockedReason} />}

					<div style={{ marginBottom: '0px' }}>
						<label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>Name</label>
						<input
							type="text"
							value={defect.name}
							readOnly
							style={{
								width: '100%',
								padding: '6px 8px',
								backgroundColor: 'color-mix(in srgb, var(--vscode-input-background) 60%, var(--vscode-panel-background))',
								color: 'var(--vscode-input-foreground)',
								border: '1px solid var(--vscode-input-border)',
								borderRadius: '3px',
								fontSize: '13px'
							}}
						/>
					</div>

					<div
						style={{
							display: 'grid',
							gridTemplateColumns: '1fr 1fr',
							columnGap: '40px',
							rowGap: '12px',
							alignItems: 'start'
						}}
					>
						{/* Basic Information */}
						<h3 style={{ margin: '18px 0 3px 0', color: 'var(--vscode-foreground)', fontSize: '14px' }}>Basic Information</h3>
						<h3 style={{ margin: '18px 0 3px 0', color: 'var(--vscode-foreground)', fontSize: '14px' }}>Status & Priority</h3>

						<div style={{ display: 'flex', gap: '16px' }}>
							<div style={{ flex: '1' }}>
								<label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>State</label>
								<input
									type="text"
									value={defect.state || 'N/A'}
									readOnly
									style={{
										width: '100%',
										padding: '6px 8px',
										backgroundColor: 'color-mix(in srgb, var(--vscode-input-background) 60%, var(--vscode-panel-background))',
										color: 'var(--vscode-input-foreground)',
										border: '1px solid var(--vscode-input-border)',
										borderRadius: '3px',
										fontSize: '13px'
									}}
								/>
							</div>
							<div style={{ flex: '1' }}>
								<label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>Severity</label>
								<input
									type="text"
									value={defect.severity || 'N/A'}
									readOnly
									style={{
										width: '100%',
										padding: '6px 8px',
										backgroundColor: 'color-mix(in srgb, var(--vscode-input-background) 60%, var(--vscode-panel-background))',
										color: 'var(--vscode-input-foreground)',
										border: '1px solid var(--vscode-input-border)',
										borderRadius: '3px',
										fontSize: '13px'
									}}
								/>
							</div>
						</div>

						<div>
							<label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>Priority</label>
							<input
								type="text"
								value={defect.priority || 'N/A'}
								readOnly
								style={{
									width: '100%',
									padding: '6px 8px',
									backgroundColor: 'var(--vscode-input-background)',
									color: 'var(--vscode-input-foreground)',
									border: '1px solid var(--vscode-input-border)',
									borderRadius: '3px',
									fontSize: '13px'
								}}
							/>
						</div>

						<div>
							<label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>Assigned To</label>
							<AvatarFormField name={defect.owner || ''} emptyLabel="N/A" />
						</div>

						<div>
							<label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>Sprint</label>
							<EntityRefFormField type="sprint" value={defect.iteration} emptyLabel="N/A" />
						</div>

						{/* Description */}
						<div style={{ display: 'flex', flexDirection: 'column', gap: '10px', gridColumn: '1 / -1' }}>
							<h3 style={{ margin: '18px 0 3px 0', color: 'var(--vscode-foreground)', fontSize: '14px' }}>Description</h3>

							<ResizableDescription description={defect.description} />
						</div>
					</div>
				</div>
			</collapsible-card>
		</>
	);
};

export default DefectForm;
