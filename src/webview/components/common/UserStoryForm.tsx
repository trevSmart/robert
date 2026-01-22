import { FC } from 'react';
import styled from 'styled-components';
import { type UserStory } from '../../../types/rally';

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

interface UserStoryFormProps {
	userStory: UserStory;
}

const UserStoryForm: FC<UserStoryFormProps> = ({ userStory }) => {
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

					<div
						dangerouslySetInnerHTML={{
							__html: userStory.description || '<p style="color: var(--vscode-descriptionForeground); font-style: italic;">No description available</p>'
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
