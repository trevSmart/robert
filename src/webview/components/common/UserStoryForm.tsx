import type React from 'react';
import styled from 'styled-components';
import { themeColors, getInputBorderColor } from '../../utils/themeColors';

const Card = styled.div`
	margin: 20px 0;
	padding: 20px;
	background-color: ${themeColors.panelBackground};
	border-radius: 8px;
	border: 1px solid ${themeColors.panelBorder};

	@media (max-width: 720px) {
		padding: 16px;
	}
`;

const CardTitle = styled.div`
	font-size: 12px;
	font-weight: 400;
	color: ${themeColors.descriptionForeground};
	letter-spacing: 0.5px;
	margin: 0 0 16px 0;
	padding-left: 7px;
`;

const FormGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
	gap: 20px;
	align-items: start;

	@media (max-width: 720px) {
		gap: 16px;
	}
`;

const Group = styled.section`
	display: flex;
	flex-direction: column;
	gap: 12px;
`;

const GroupTitle = styled.h3`
	margin: 0 0 6px 0;
	color: ${themeColors.foreground};
	font-size: 14px;
	font-weight: 600;
`;

const Field = styled.div`
	display: flex;
	flex-direction: column;
	gap: 6px;
`;

const Label = styled.label`
	font-size: 12px;
	color: ${themeColors.descriptionForeground};
`;

const BaseInput = styled.input`
	width: 100%;
	padding: 8px 10px;
	background-color: ${themeColors.inputBackground};
	color: ${themeColors.inputForeground};
	border: 1px solid ${getInputBorderColor()};
	border-radius: 4px;
	font-size: 13px;

	&:focus {
		outline: none;
		border-color: ${themeColors.progressBarBackground};
		box-shadow: 0 0 0 2px rgba(73, 168, 255, 0.1);
	}
`;

const BaseSelect = styled.select`
	width: 100%;
	padding: 8px 10px;
	background-color: ${themeColors.inputBackground};
	color: ${themeColors.inputForeground};
	border: 1px solid ${getInputBorderColor()};
	border-radius: 4px;
	font-size: 13px;

	&:focus {
		outline: none;
		border-color: ${themeColors.progressBarBackground};
		box-shadow: 0 0 0 2px rgba(73, 168, 255, 0.1);
	}
`;

const BaseTextarea = styled.textarea`
	width: 100%;
	padding: 8px 10px;
	background-color: ${themeColors.inputBackground};
	color: ${themeColors.inputForeground};
	border: 1px solid ${getInputBorderColor()};
	border-radius: 4px;
	font-size: 13px;
	font-family:
		'Inter',
		${themeColors.fontFamily},
		-apple-system,
		BlinkMacSystemFont,
		'Segoe UI',
		sans-serif;
	line-height: 1.4;
	resize: vertical;
	min-height: 120px;

	&:focus {
		outline: none;
		border-color: ${themeColors.progressBarBackground};
		box-shadow: 0 0 0 2px rgba(73, 168, 255, 0.1);
	}
`;

const CheckboxRow = styled.div`
	display: flex;
	align-items: center;
	gap: 8px;
`;

const CheckboxText = styled.span`
	font-size: 13px;
	color: var(--vscode-foreground);
`;

const MonospaceInput = styled(BaseInput)`
	font-size: 12px;
	font-family: monospace;
`;

const DescriptionGroup = styled(Group)`
	grid-column: span 2;

	@media (max-width: 720px) {
		grid-column: span 1;
	}
`;

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

const StatPill = styled.div`
	display: flex;
	flex-direction: column;
	gap: 4px;
	align-items: flex-start;
	justify-content: center;
	min-height: 56px;
	padding: 10px 12px;
	border-radius: 10px;
	background: color(srgb 0.2 0.2 0.2 / 0.6);
	border: 1px solid color(srgb 0.8 0.8 0.8 / 0.08);
`;

interface UserStory {
	objectId: string;
	formattedId: string;
	name: string;
	description: string | null;
	state: string;
	planEstimate: number;
	toDo: number;
	assignee: string;
	project: string | null;
	iteration: string | null;
	blocked: boolean;
	taskEstimateTotal: number;
	taskStatus: string;
	tasksCount: number;
	testCasesCount: number;
	defectsCount: number;
	discussionCount: number;
	appgar: string;
}

interface UserStoryFormProps {
	userStory: UserStory;
}

const UserStoryForm: React.FC<UserStoryFormProps> = ({ userStory }) => {
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
		<div
			style={{
				margin: '20px 0',
				padding: '20px 40px 20px 20px',
				backgroundColor: 'var(--vscode-editor-background)',
				border: '1px solid var(--vscode-panel-border)',
				borderRadius: '6px'
			}}
		>
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					marginBottom: '20px'
				}}
			>
				<h2
					style={{
						fontSize: '18px',
						fontWeight: '600',
						color: 'var(--vscode-foreground)',
						margin: '0',
						letterSpacing: '0.5px'
					}}
				>
					{userStory.formattedId}
				</h2>
				{userStory.scheduleState && (
					<div
						style={{
							fontSize: '14px',
							fontWeight: '500',
							color: getScheduleStateColor(userStory.scheduleState)
						}}
					>
						{userStory.scheduleState}
					</div>
				)}
			</div>

			<div style={{ marginBottom: '16px' }}>
				<label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: 'color(srgb 0.8 0.8 0.8 / 0.68)' }}>Name</label>
				<input
					type="text"
					value={userStory.name}
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
				<h3 style={{ margin: '0 0 10px 0', color: 'var(--vscode-foreground)', fontSize: '14px' }}>Estimates & Status</h3>

				<div style={{ display: 'flex', gap: '16px' }}>
					<div style={{ flex: '1' }}>
						<label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: 'color(srgb 0.8 0.8 0.8 / 0.68)' }}>Plan Estimate</label>
						<input
							type="number"
							value={userStory.planEstimate || 0}
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
						<label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: 'color(srgb 0.8 0.8 0.8 / 0.68)' }}>To Do</label>
						<input
							type="number"
							value={userStory.toDo}
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
					<label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: 'color(srgb 0.8 0.8 0.8 / 0.68)' }}>Assigned To</label>
					<input
						type="text"
						value={userStory.assignee || 'N/A'}
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
					<StatusPill isBlocked={userStory.blocked}>{userStory.blocked ? 'Blocked' : 'Not Blocked'}</StatusPill>
				</div>

				{/* Description */}
				<div style={{ display: 'flex', flexDirection: 'column', gap: '10px', gridColumn: '1 / -1' }}>
					<h3 style={{ margin: '0 0 10px 0', color: 'var(--vscode-foreground)', fontSize: '14px' }}>Description</h3>

					<div>
						<textarea
							value={userStory.description || 'No description available'}
							readOnly
							rows={6}
							style={{
								width: '100%',
								padding: '6px 8px',
								backgroundColor: 'color-mix(in srgb, var(--vscode-input-background) 60%, var(--vscode-panel-background))',
								color: 'var(--vscode-input-foreground)',
								border: '1px solid var(--vscode-input-border)',
								borderRadius: '3px',
								fontSize: '13px',
								fontFamily: "'Inter', var(--vscode-font-family), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
								lineHeight: '1.6',
								resize: 'vertical'
							}}
						/>
					</div>
				</div>

				{/* Additional Information */}
				<h3 style={{ margin: '16px 0 10px 0', color: 'var(--vscode-foreground)', fontSize: '14px', gridColumn: '1 / -1' }}>Additional Information</h3>
				<div style={{ gridColumn: '1 / -1' }}>
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px' }}>
						<StatPill>
							<span style={{ fontSize: '11px', color: 'color(srgb 0.8 0.8 0.8 / 0.68)' }}>Tasks</span>
							<span style={{ fontSize: '18px', fontWeight: 600, color: 'var(--vscode-foreground)' }}>{userStory.tasksCount}</span>
						</StatPill>
						<StatPill>
							<span style={{ fontSize: '11px', color: 'color(srgb 0.8 0.8 0.8 / 0.68)' }}>Test Cases</span>
							<span style={{ fontSize: '18px', fontWeight: 600, color: 'var(--vscode-foreground)' }}>{userStory.testCasesCount}</span>
						</StatPill>
						<StatPill>
							<span style={{ fontSize: '11px', color: 'color(srgb 0.8 0.8 0.8 / 0.68)' }}>Defects</span>
							<span style={{ fontSize: '18px', fontWeight: 600, color: 'var(--vscode-foreground)' }}>{userStory.defectsCount}</span>
						</StatPill>
						<StatPill>
							<span style={{ fontSize: '11px', color: 'color(srgb 0.8 0.8 0.8 / 0.68)' }}>Discussions</span>
							<span style={{ fontSize: '18px', fontWeight: 600, color: 'var(--vscode-foreground)' }}>{userStory.discussionCount}</span>
						</StatPill>
					</div>
				</div>
			</div>
		</div>
	);
};

export default UserStoryForm;
