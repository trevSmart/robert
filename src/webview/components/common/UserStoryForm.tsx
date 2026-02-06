import { FC, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { type UserStory } from '../../../types/rally';
import { isLightTheme } from '../../utils/themeColors';
import { getVsCodeApi } from '../../utils/vscodeApi';
import './CollapsibleCard';

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

// StatPill component with theme-aware styling
const StatPill: FC<{
	isSelected: boolean;
	onClick: () => void;
	title: string;
	children: React.ReactNode;
}> = ({ isSelected, onClick, title, children }) => {
	const lightTheme = isLightTheme();

	const getStatPillStyles = () => {
		return {
			display: 'flex',
			flexDirection: 'column' as const,
			gap: '4px',
			alignItems: 'flex-start',
			justifyContent: 'center',
			minHeight: '56px',
			padding: '10px 12px',
			borderRadius: '10px',
			border: isSelected ? '1px solid var(--vscode-textLink-foreground)' : lightTheme ? '1px solid rgba(0, 0, 0, 0.12)' : '1px solid color(srgb 0.8 0.8 0.8 / 0.08)',
			background: isSelected ? 'color(srgb 0.2 0.6 0.35 / 0.12)' : lightTheme ? 'rgba(0, 0, 0, 0.04)' : 'color(srgb 0.2 0.2 0.2 / 0.6)',
			cursor: 'pointer',
			transition: 'all 0.2s ease'
		};
	};

	return (
		<button
			type="button"
			onClick={onClick}
			title={title}
			style={getStatPillStyles()}
			onMouseEnter={e => {
				const button = e.currentTarget;
				button.style.background = isSelected ? 'color(srgb 0.2 0.6 0.35 / 0.18)' : lightTheme ? 'rgba(0, 0, 0, 0.08)' : 'color(srgb 0.2 0.2 0.2 / 0.8)';
				button.style.borderColor = 'var(--vscode-textLink-foreground)';
			}}
			onMouseLeave={e => {
				const button = e.currentTarget;
				button.style.background = isSelected ? 'color(srgb 0.2 0.6 0.35 / 0.12)' : lightTheme ? 'rgba(0, 0, 0, 0.04)' : 'color(srgb 0.2 0.2 0.2 / 0.6)';
				button.style.borderColor = isSelected ? 'var(--vscode-textLink-foreground)' : lightTheme ? 'rgba(0, 0, 0, 0.12)' : 'color(srgb 0.8 0.8 0.8 / 0.08)';
			}}
		>
			{children}
		</button>
	);
};

interface UserStoryFormProps {
	userStory: UserStory;
	selectedAdditionalTab?: 'tasks' | 'tests' | 'defects' | 'discussions';
	onAdditionalTabChange?: (tab: 'tasks' | 'tests' | 'defects' | 'discussions') => void;
}

// Help Request icon
const HelpIcon = ({ size = '16px' }: { size?: string }) => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: size, height: size }}>
		<path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
	</svg>
);

// Icon components for cards
const TasksIcon = ({ size = '18px' }: { size?: string }) => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: size, height: size }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M21.75 6.75a4.5 4.5 0 0 1-4.884 4.484c-1.076-.091-2.264.071-2.95.904l-7.152 8.684a2.548 2.548 0 1 1-3.586-3.586l8.684-7.152c.833-.686.995-1.874.904-2.95a4.5 4.5 0 0 1 6.336-4.486l-3.276 3.276a3.004 3.004 0 0 0 2.25 2.25l3.276-3.276c.256.565.398 1.192.398 1.852Z"
		/>
		<path strokeLinecap="round" strokeLinejoin="round" d="M4.867 19.125h.008v.008h-.008v-.008Z" />
	</svg>
);

const TestsIcon = ({ size = '18px' }: { size?: string }) => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: size, height: size }}>
		<path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
	</svg>
);

const DefectsIcon = ({ size = '18px' }: { size?: string }) => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: size, height: size }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M12 12.75c1.148 0 2.278.08 3.383.237 1.037.146 1.866.966 1.866 2.013 0 3.728-2.35 6.75-5.25 6.75S6.75 18.728 6.75 15c0-1.046.83-1.867 1.866-2.013A24.204 24.204 0 0 1 12 12.75Zm0 0c2.883 0 5.647.508 8.207 1.44a23.91 23.91 0 0 1-1.152 6.06M12 12.75c-2.883 0-5.647.508-8.208 1.44.125 2.104.52 4.136 1.153 6.06M12 12.75a2.25 2.25 0 0 0 2.248-2.354M12 12.75a2.25 2.25 0 0 1-2.248-2.354M12 8.25c.995 0 1.971-.08 2.922-.236.403-.066.74-.358.795-.762a3.778 3.778 0 0 0-.399-2.25M12 8.25c-.995 0-1.97-.08-2.922-.236-.402-.066-.74-.358-.795-.762a3.734 3.734 0 0 1 .4-2.253M12 8.25a2.25 2.25 0 0 0-2.248 2.146M12 8.25a2.25 2.25 0 0 1 2.248 2.146M8.683 5a6.032 6.032 0 0 1-1.155-1.002c.07-.63.27-1.222.574-1.747m.581 2.749A3.75 3.75 0 0 1 15.318 5m0 0c.427-.283.815-.62 1.155-.999a4.471 4.471 0 0 0-.575-1.752M4.921 6a24.048 24.048 0 0 0-.392 3.314c1.668.546 3.416.914 5.223 1.082M19.08 6c.205 1.08.337 2.187.392 3.314a23.882 23.882 0 0 1-5.223 1.082"
		/>
	</svg>
);

const DiscussionsIcon = ({ size = '18px' }: { size?: string }) => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: size, height: size }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
		/>
	</svg>
);

const DESCRIPTION_HEIGHT_MIN = 80;
const DESCRIPTION_HEIGHT_MAX = 600;
const DESCRIPTION_HEIGHT_DEFAULT = 300;

const UserStoryForm: FC<UserStoryFormProps> = ({ userStory, selectedAdditionalTab = 'tasks', onAdditionalTabChange }) => {
	const vscode = useMemo(() => getVsCodeApi(), []);
	const [requestSupportLoading, setRequestSupportLoading] = useState(false);
	const [requestSupportSuccess, setRequestSupportSuccess] = useState(false);
	const [descriptionHeight, setDescriptionHeight] = useState(DESCRIPTION_HEIGHT_DEFAULT);
	const resizeStartRef = useRef({ y: 0, height: 0 });
	const cleanupRef = useRef<(() => void) | null>(null);

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

	const handleTabChange = (tab: 'tasks' | 'tests' | 'defects' | 'discussions') => {
		if (onAdditionalTabChange) {
			onAdditionalTabChange(tab);
		}
	};

	// Cleanup effect to remove event listeners and reset styles on unmount
	useEffect(() => {
		return () => {
			// Call any active cleanup function
			if (cleanupRef.current) {
				cleanupRef.current();
				cleanupRef.current = null;
			}
			// Reset document styles as a fallback
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
		};
	}, []);

	const handleDescriptionResizeStart = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			
			// Clean up any existing resize operation before starting a new one
			if (cleanupRef.current) {
				cleanupRef.current();
				cleanupRef.current = null;
			}
			
			resizeStartRef.current = { y: e.clientY, height: descriptionHeight };
			document.body.style.cursor = 'ns-resize';
			document.body.style.userSelect = 'none';
			
			const onMouseMove = (moveEvent: MouseEvent) => {
				const delta = moveEvent.clientY - resizeStartRef.current.y;
				const newHeight = Math.min(DESCRIPTION_HEIGHT_MAX, Math.max(DESCRIPTION_HEIGHT_MIN, resizeStartRef.current.height + delta));
				setDescriptionHeight(newHeight);
			};
			
			// Shared cleanup logic to remove listeners and reset styles
			const performCleanup = () => {
				document.removeEventListener('mousemove', onMouseMove);
				document.removeEventListener('mouseup', onMouseUp);
				document.body.style.cursor = '';
				document.body.style.userSelect = '';
			};
			
			const onMouseUp = () => {
				performCleanup();
				cleanupRef.current = null;
			};
			
			document.addEventListener('mousemove', onMouseMove);
			document.addEventListener('mouseup', onMouseUp);
			
			// Store cleanup function to be called on unmount or when new resize starts
			cleanupRef.current = performCleanup;
		},
		[descriptionHeight]
	);

	const handleRequestSupport = useCallback(() => {
		if (!vscode) return;

		setRequestSupportLoading(true);
		setRequestSupportSuccess(false);

		// Send message to extension to create a help request
		vscode.postMessage({
			command: 'requestUserStorySupport',
			userStoryId: userStory.formattedId,
			userStoryName: userStory.name,
			userStoryObjectId: userStory.objectId,
			project: userStory.project,
			iteration: userStory.iteration,
			description: userStory.description,
			scheduleState: userStory.scheduleState,
			tasksCount: userStory.tasksCount,
			planEstimate: userStory.planEstimate,
			taskEstimateTotal: userStory.taskEstimateTotal
		});
	}, [vscode, userStory]);

	return (
		<collapsible-card
			title={userStory.formattedId}
			style={
				{
					margin: '20px 0'
				} as React.CSSProperties
			}
		>
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					marginBottom: '20px'
				}}
			>
				<div>
					{requestSupportSuccess && (
						<span
							style={{
								fontSize: '12px',
								color: '#4caf50',
								fontWeight: '500',
								padding: '4px 8px',
								backgroundColor: 'rgba(76, 175, 80, 0.1)',
								borderRadius: '4px'
							}}
						>
							✓ Support requested
						</span>
					)}
				</div>
				<div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
					<button
						onClick={handleRequestSupport}
						disabled={requestSupportLoading}
						title="Sol·licitar ajuda dels companys d'equip"
						style={{
							display: 'inline-flex',
							alignItems: 'center',
							gap: '6px',
							padding: '6px 12px',
							backgroundColor: requestSupportLoading ? 'var(--vscode-button-secondaryBackground)' : 'var(--vscode-button-background)',
							color: requestSupportLoading ? 'var(--vscode-button-secondaryForeground)' : 'var(--vscode-button-foreground)',
							border: 'none',
							borderRadius: '3px',
							fontSize: '12px',
							fontWeight: '500',
							cursor: requestSupportLoading ? 'not-allowed' : 'pointer',
							opacity: requestSupportLoading ? 0.6 : 1,
							whiteSpace: 'nowrap'
						}}
						onMouseEnter={e => {
							if (!requestSupportLoading) {
								e.currentTarget.style.backgroundColor = 'var(--vscode-button-hoverBackground)';
							}
						}}
						onMouseLeave={e => {
							if (!requestSupportLoading) {
								e.currentTarget.style.backgroundColor = 'var(--vscode-button-background)';
							}
						}}
					>
						<HelpIcon size="14px" />
						{requestSupportLoading ? 'Sol·licitant...' : 'Sol·licitar Ajuda'}
					</button>
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

				<div>
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

					<div style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--vscode-input-border)', borderRadius: '3px', overflow: 'hidden' }}>
						<div
							dangerouslySetInnerHTML={{
								__html: userStory.description || '<p style="color: var(--vscode-descriptionForeground); font-style: italic;">No description available</p>'
							}}
							style={{
								width: '100%',
								minHeight: `${DESCRIPTION_HEIGHT_MIN}px`,
								maxHeight: `${descriptionHeight}px`,
								boxSizing: 'border-box',
								padding: '12px',
								backgroundColor: 'color-mix(in srgb, var(--vscode-input-background) 60%, var(--vscode-panel-background))',
								color: 'var(--vscode-input-foreground)',
								fontSize: '13px',
								fontFamily: "'Inter', var(--vscode-font-family), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
								lineHeight: '1.6',
								overflow: 'auto'
							}}
						/>
						<div
							role="separator"
							aria-label="Resize description"
							onMouseDown={handleDescriptionResizeStart}
							style={{
								height: '8px',
								backgroundColor: 'var(--vscode-panel-border)',
								cursor: 'ns-resize',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								flexShrink: 0
							}}
						>
							<div
								style={{
									width: '32px',
									height: '3px',
									borderRadius: '2px',
									backgroundColor: 'var(--vscode-descriptionForeground)',
									opacity: 0.6
								}}
							/>
						</div>
					</div>
				</div>

				{/* Additional Information */}
				<h3 style={{ margin: '16px 0 10px 0', color: 'var(--vscode-foreground)', fontSize: '14px', gridColumn: '1 / -1' }}>Additional Information</h3>
				<div style={{ gridColumn: '1 / -1' }}>
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px' }}>
						<StatPill isSelected={selectedAdditionalTab === 'tasks'} onClick={() => handleTabChange('tasks')} title="Click to view tasks">
							<span style={{ fontSize: '11px', color: 'color(srgb 0.8 0.8 0.8 / 0.68)' }}>Tasks</span>
							<span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '18px', fontWeight: 600, color: 'var(--vscode-foreground)' }}>
								<TasksIcon />
								{userStory.tasksCount}
							</span>
						</StatPill>
						<StatPill isSelected={selectedAdditionalTab === 'tests'} onClick={() => handleTabChange('tests')} title="Click to view test cases">
							<span style={{ fontSize: '11px', color: 'color(srgb 0.8 0.8 0.8 / 0.68)' }}>Test cases</span>
							<span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '18px', fontWeight: 600, color: 'var(--vscode-foreground)' }}>
								<TestsIcon />
								{userStory.testCasesCount}
							</span>
						</StatPill>
						<StatPill isSelected={selectedAdditionalTab === 'defects'} onClick={() => handleTabChange('defects')} title="Click to view defects">
							<span style={{ fontSize: '11px', color: 'color(srgb 0.8 0.8 0.8 / 0.68)' }}>Defects</span>
							<span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '18px', fontWeight: 600, color: 'var(--vscode-foreground)' }}>
								<DefectsIcon />
								{userStory.defectsCount}
							</span>
						</StatPill>
						<StatPill isSelected={selectedAdditionalTab === 'discussions'} onClick={() => handleTabChange('discussions')} title="Click to view discussions">
							<span style={{ fontSize: '11px', color: 'color(srgb 0.8 0.8 0.8 / 0.68)' }}>Discussions</span>
							<span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '18px', fontWeight: 600, color: 'var(--vscode-foreground)' }}>
								<DiscussionsIcon />
								{userStory.discussionCount}
							</span>
						</StatPill>
					</div>
				</div>
			</div>
		</collapsible-card>
	);
};

export default UserStoryForm;
