import { FC } from 'react';
import styled from 'styled-components';
import { isLightTheme } from '../../utils/themeColors';

const StatusPill = styled.div<{ isBlocked: boolean }>`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-height: 24px;
	padding: 0 8px;
	border-radius: 999px;
	font-size: 11px;
	font-weight: 600;
	letter-spacing: 0.2px;
	background: ${props => (props.isBlocked ? 'color(srgb 0.85 0.25 0.25 / 0.25)' : 'color(srgb 0.2 0.6 0.35 / 0.25)')};
	color: ${props => (props.isBlocked ? 'color(srgb 0.9 0.2 0.2 / 1)' : 'color(srgb 0.2 0.75 0.45 / 1)')};
	border: 1px solid ${props => (props.isBlocked ? 'color(srgb 0.85 0.25 0.25 / 0.45)' : 'color(srgb 0.2 0.6 0.35 / 0.45)')};
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

	const getScheduleStateColor = (scheduleState: string) => {
		switch (scheduleState?.toLowerCase()) {
			case 'new':
				return '#6c757d'; // Gris
			case 'defined':
				return '#fd7e14'; // Taronja
			case 'in-progress':
				return '#ffc107'; // Groc
			case 'completed':
				return '#0d6efd'; // Blau
			case 'accepted':
				return '#198754'; // Verd
			case 'closed':
				return '#495057'; // Gris fosc
			default:
				return 'var(--vscode-descriptionForeground)';
		}
	};

	return (
		<>
			<collapsible-card title={`${defect.formattedId}: ${defect.name}`}>
				<div
					style={{
						padding: '20px',
						display: 'flex',
						flexDirection: 'column',
						gap: '20px'
					}}
				>
					<div
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center'
						}}
					>
						{defect.scheduleState && (
							<div
								style={{
									fontSize: '14px',
									fontWeight: '500',
									color: getScheduleStateColor(defect.scheduleState)
								}}
							>
								{defect.scheduleState}
							</div>
						)}
					</div>

					<div style={{ marginBottom: '0px' }}>
						<label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: 'color(srgb 0.8 0.8 0.8 / 0.68)' }}>Name</label>
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
						<h3 style={{ margin: '0 0 10px 0', color: 'var(--vscode-foreground)', fontSize: '14px' }}>Basic Information</h3>
						<h3 style={{ margin: '0 0 10px 0', color: 'var(--vscode-foreground)', fontSize: '14px' }}>Status & Priority</h3>

						<div style={{ display: 'flex', gap: '16px' }}>
							<div style={{ flex: '1' }}>
								<label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: 'color(srgb 0.8 0.8 0.8 / 0.68)' }}>State</label>
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
								<label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: 'color(srgb 0.8 0.8 0.8 / 0.68)' }}>Severity</label>
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
							<label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: 'color(srgb 0.8 0.8 0.8 / 0.68)' }}>Priority</label>
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
							<label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: 'color(srgb 0.8 0.8 0.8 / 0.68)' }}>Assigned To</label>
							<input
								type="text"
								value={defect.owner || 'N/A'}
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
							<label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: 'color(srgb 0.8 0.8 0.8 / 0.68)' }}>Blocked</label>
							<StatusPill isBlocked={defect.blocked}>{defect.blocked ? 'Blocked' : 'Not Blocked'}</StatusPill>
						</div>

						{/* Description */}
						<div style={{ display: 'flex', flexDirection: 'column', gap: '10px', gridColumn: '1 / -1' }}>
							<h3 style={{ margin: '0 0 10px 0', color: 'var(--vscode-foreground)', fontSize: '14px' }}>Description</h3>

							<div
								dangerouslySetInnerHTML={{
									__html: defect.description || '<p style="color: var(--vscode-descriptionForeground); font-style: italic;">No description available</p>'
								}}
								style={{
									width: '100%',
									padding: '12px',
									backgroundColor: 'color-mix(in srgb, var(--vscode-input-background) 60%, var(--vscode-panel-background))',
									color: 'var(--vscode-input-foreground)',
									border: '1px solid var(--vscode-input-border)',
									borderRadius: '3px',
									fontSize: '13px',
									fontFamily: "'Inter', var(--vscode-font-family), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
									lineHeight: '1.6',
									minHeight: '120px',
									overflow: 'auto'
								}}
							/>
						</div>
					</div>
				</div>
			</collapsible-card>
		</>
	);
};

export default DefectForm;
