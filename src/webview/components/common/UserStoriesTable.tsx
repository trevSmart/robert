import React, { useState } from 'react';
import { themeColors, isLightTheme } from '../../utils/themeColors';
import { type UserStory } from '../../../types/rally';
import { useTableSort, type SortConfig } from '../../hooks/useTableSort';

// Icon components
const TasksIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '14px', height: '14px' }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M21.75 6.75a4.5 4.5 0 0 1-4.884 4.484c-1.076-.091-2.264.071-2.95.904l-7.152 8.684a2.548 2.548 0 1 1-3.586-3.586l8.684-7.152c.833-.686.995-1.874.904-2.95a4.5 4.5 0 0 1 6.336-4.486l-3.276 3.276a3.004 3.004 0 0 0 2.25 2.25l3.276-3.276c.256.565.398 1.192.398 1.852Z"
		/>
		<path strokeLinecap="round" strokeLinejoin="round" d="M4.867 19.125h.008v.008h-.008v-.008Z" />
	</svg>
);

const TestsIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '14px', height: '14px' }}>
		<path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
	</svg>
);

const DefectsIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '14px', height: '14px' }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M12 12.75c1.148 0 2.278.08 3.383.237 1.037.146 1.866.966 1.866 2.013 0 3.728-2.35 6.75-5.25 6.75S6.75 18.728 6.75 15c0-1.046.83-1.867 1.866-2.013A24.204 24.204 0 0 1 12 12.75Zm0 0c2.883 0 5.647.508 8.207 1.44a23.91 23.91 0 0 1-1.152 6.06M12 12.75c-2.883 0-5.647.508-8.208 1.44.125 2.104.52 4.136 1.153 6.06M12 12.75a2.25 2.25 0 0 0 2.248-2.354M12 12.75a2.25 2.25 0 0 1-2.248-2.354M12 8.25c.995 0 1.971-.08 2.922-.236.403-.066.74-.358.795-.762a3.778 3.778 0 0 0-.399-2.25M12 8.25c-.995 0-1.97-.08-2.922-.236-.402-.066-.74-.358-.795-.762a3.734 3.734 0 0 1 .4-2.253M12 8.25a2.25 2.25 0 0 0-2.248 2.146M12 8.25a2.25 2.25 0 0 1 2.248 2.146M8.683 5a6.032 6.032 0 0 1-1.155-1.002c.07-.63.27-1.222.574-1.747m.581 2.749A3.75 3.75 0 0 1 15.318 5m0 0c.427-.283.815-.62 1.155-.999a4.471 4.471 0 0 0-.575-1.752M4.921 6a24.048 24.048 0 0 0-.392 3.314c1.668.546 3.416.914 5.223 1.082M19.08 6c.205 1.08.337 2.187.392 3.314a23.882 23.882 0 0 1-5.223 1.082"
		/>
	</svg>
);

const DiscussionsIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '14px', height: '14px' }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
		/>
	</svg>
);

const SortDescIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '14px', height: '14px', flexShrink: 0 }}>
		<path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0-3.75-3.75M17.25 21 21 17.25" />
	</svg>
);

const SortAscIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '14px', height: '14px', flexShrink: 0 }}>
		<path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L17.25 9m0 0L21 12.75M17.25 9v12" />
	</svg>
);

interface Iteration {
	objectId: string;
	name: string;
	startDate: string;
	endDate: string;
	state: string;
	project: string | null;
	_ref: string;
}

interface UserStoriesTableProps {
	userStories: UserStory[];
	loading?: boolean;
	error?: string | null;
	onLoadUserStories?: () => void;
	onClearUserStories?: () => void;
	onUserStorySelected?: (userStory: UserStory) => void;
	selectedUserStory?: UserStory | null;
	hasMore?: boolean;
	onLoadMore?: () => void;
	loadingMore?: boolean;
}

const UserStoriesTable: React.FC<UserStoriesTableProps> = ({ userStories, loading = false, error, onUserStorySelected, selectedUserStory, hasMore = false, onLoadMore, loadingMore = false }) => {
	// Initialize sorting with default sort by formattedId descending
	const { sortedItems, sortConfig, requestSort } = useTableSort<UserStory>(userStories, { key: 'formattedId', direction: 'desc' });

	// Component to render sortable headers with visual indicators (icon visible on hover or when column is active)
	const SortableHeader: React.FC<{
		label: string;
		sortKey: keyof UserStory;
		style?: React.CSSProperties;
		textAlign?: 'left' | 'center' | 'right';
	}> = ({ label, sortKey, style, textAlign = 'left' }) => {
		const [hovered, setHovered] = useState(false);
		const isActive = sortConfig?.key === sortKey;
		const direction = isActive ? sortConfig?.direction : undefined;
		const showIndicator = isActive || hovered;

		const renderSortIcon = () => {
			if (!showIndicator) return null;
			if (isActive) {
				return direction === 'asc' ? <SortAscIcon /> : <SortDescIcon />;
			}
			return <SortDescIcon />;
		};

		return (
			<th
				onClick={() => requestSort(sortKey)}
				onMouseEnter={() => setHovered(true)}
				onMouseLeave={() => setHovered(false)}
				style={{
					padding: '10px 12px',
					textAlign,
					borderBottom: `1px solid ${themeColors.panelBorder}`,
					fontWeight: 'bold',
					cursor: 'pointer',
					backgroundColor: themeColors.tabActiveBackground,
					color: themeColors.tabActiveForeground,
					userSelect: 'none',
					whiteSpace: 'nowrap',
					...style
				}}
				title={`Sort by ${label}`}
			>
				<span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
					{label}
					<span
						style={{
							opacity: showIndicator ? (isActive ? 1 : 0.6) : 0,
							display: 'inline-flex',
							transition: 'opacity 0.15s ease',
							flexShrink: 0
						}}
					>
						{renderSortIcon()}
					</span>
				</span>
			</th>
		);
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
				return isLightTheme() ? 'rgba(0, 0, 0, 0.6)' : themeColors.descriptionForeground;
		}
	};

	const RelatedItemsIcons: React.FC<{
		tasksCount: number;
		testCasesCount: number;
		defectsCount: number;
		discussionCount: number;
	}> = ({ tasksCount, testCasesCount, defectsCount, discussionCount }) => {
		return (
			<div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: themeColors.foreground }}>
				{tasksCount > 0 && (
					<span title={`${tasksCount} task(s)`} style={{ display: 'inline-flex', alignItems: 'center', opacity: 0.85 }}>
						<TasksIcon />
					</span>
				)}
				{testCasesCount > 0 && (
					<span title={`${testCasesCount} test case(s)`} style={{ display: 'inline-flex', alignItems: 'center', opacity: 0.85 }}>
						<TestsIcon />
					</span>
				)}
				{defectsCount > 0 && (
					<span title={`${defectsCount} defect(s)`} style={{ display: 'inline-flex', alignItems: 'center', opacity: 0.85, color: '#ff6b6b' }}>
						<DefectsIcon />
					</span>
				)}
				{discussionCount > 0 && (
					<span title={`${discussionCount} discussion(s)`} style={{ display: 'inline-flex', alignItems: 'center', opacity: 0.85 }}>
						<DiscussionsIcon />
					</span>
				)}
			</div>
		);
	};

	return (
		<>
			{loading && (
				<div style={{ textAlign: 'center', padding: '20px' }}>
					<div
						style={{
							border: `2px solid ${themeColors.panelBorder}`,
							borderTop: `2px solid ${themeColors.progressBarBackground}`,
							borderRadius: '50%',
							width: '20px',
							height: '20px',
							animation: 'spin 1s linear infinite',
							margin: '0 auto 10px'
						}}
					/>
					<p>Loading user stories...</p>
				</div>
			)}

			{error && (
				<div
					style={{
						textAlign: 'center',
						padding: '20px',
						color: themeColors.errorForeground
					}}
				>
					<p>{error}</p>
				</div>
			)}

			{userStories.length > 0 && !loading && !error && (
				<table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${themeColors.panelBorder}` }}>
					<thead>
						<tr style={{ backgroundColor: themeColors.tabActiveBackground, color: themeColors.tabActiveForeground }}>
							<SortableHeader label="ID" sortKey="formattedId" style={{ width: '10%' }} />
							<SortableHeader label="Name" sortKey="name" />
							<SortableHeader label="Assigned To" sortKey="assignee" style={{ width: '15%' }} />
							<SortableHeader label="State" sortKey="scheduleState" style={{ width: '15%' }} />
							<SortableHeader label="Total Hours" sortKey="taskEstimateTotal" style={{ width: '110px' }} textAlign="center" />
							<th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: `1px solid ${themeColors.panelBorder}`, fontWeight: 'bold', width: '100px', backgroundColor: themeColors.tabActiveBackground, color: themeColors.tabActiveForeground }}>Items</th>
						</tr>
					</thead>
					<tbody>
						{sortedItems.map(userStory => (
							<tr
								key={userStory.objectId}
								onClick={() => onUserStorySelected?.(userStory)}
								style={{
									cursor: onUserStorySelected ? 'pointer' : 'default',
									backgroundColor: selectedUserStory?.objectId === userStory.objectId ? themeColors.listActiveSelectionBackground : undefined,
									color: selectedUserStory?.objectId === userStory.objectId ? themeColors.listActiveSelectionForeground : undefined,
									borderBottom: `1px solid ${themeColors.panelBorder}`,
									transition: 'background-color 0.15s ease, box-shadow 0.15s ease'
								}}
								onMouseEnter={e => {
									if (selectedUserStory?.objectId !== userStory.objectId) {
										e.currentTarget.style.backgroundColor = themeColors.listHoverBackground;
										e.currentTarget.style.boxShadow = `inset 0 0 0 1px ${themeColors.listHoverBackground}`;
									}
								}}
								onMouseLeave={e => {
									if (selectedUserStory?.objectId !== userStory.objectId) {
										e.currentTarget.style.backgroundColor = selectedUserStory?.objectId === userStory.objectId ? themeColors.listActiveSelectionBackground : '';
										e.currentTarget.style.boxShadow = 'none';
									}
								}}
							>
								<td style={{ padding: '10px 12px', fontWeight: 'normal', color: themeColors.foreground, textDecoration: 'none' }}>{userStory.formattedId}</td>
								<td style={{ padding: '10px 12px', fontWeight: 'normal' }}>{userStory.name}</td>
								<td style={{ padding: '10px 12px', fontWeight: 'normal', color: userStory.assignee ? themeColors.foreground : '#6c757d' }}>{userStory.assignee || 'Unassigned'}</td>
								<td style={{ padding: '10px 12px', fontWeight: 'normal', color: getScheduleStateColor(userStory.scheduleState || 'new') }}>{userStory.scheduleState || 'N/A'}</td>
								<td style={{ padding: '10px 12px', fontWeight: 'normal', width: '110px', textAlign: 'center' }}>{userStory.taskEstimateTotal !== undefined && userStory.taskEstimateTotal !== null ? `${userStory.taskEstimateTotal}h` : '0h'}</td>

								<td style={{ padding: '10px 12px', fontWeight: 'normal', textAlign: 'center' }}>
									<RelatedItemsIcons tasksCount={userStory.tasksCount} testCasesCount={userStory.testCasesCount} defectsCount={userStory.defectsCount} discussionCount={userStory.discussionCount} />
								</td>
							</tr>
						))}
					</tbody>
				</table>
			)}

			{!loading && !error && userStories.length > 0 && hasMore && (
				<div style={{ textAlign: 'center', padding: '15px', borderTop: `1px solid ${themeColors.panelBorder}` }}>
					<button
						onClick={onLoadMore}
						disabled={loadingMore}
						style={{
							padding: '8px 16px',
							backgroundColor: themeColors.buttonBackground,
							color: themeColors.buttonForeground,
							border: 'none',
							borderRadius: '4px',
							cursor: loadingMore ? 'not-allowed' : 'pointer',
							fontWeight: 'normal',
							opacity: loadingMore ? 0.6 : 1,
							transition: 'opacity 0.15s ease'
						}}
					>
						{loadingMore ? 'Loading...' : 'Load more'}
					</button>
				</div>
			)}
		</>
	);
};

interface IterationsTableProps {
	iterations: Iteration[];
	loading?: boolean;
	error?: string | null;
	onLoadIterations?: () => void;
	onIterationSelected?: (iteration: Iteration) => void;
	selectedIteration?: Iteration | null;
}

export const IterationsTable: React.FC<IterationsTableProps> = ({ iterations, loading = false, error, onIterationSelected, selectedIteration }) => {
	// Function to check if iteration corresponds to current day
	const isCurrentDayIteration = (iteration: any) => {
		if (!iteration.startDate || !iteration.endDate) return false;

		const today = new Date();
		const startDate = new Date(iteration.startDate);
		const endDate = new Date(iteration.endDate);

		today.setHours(0, 0, 0, 0);
		startDate.setHours(0, 0, 0, 0);
		endDate.setHours(23, 59, 59, 999);

		return today >= startDate && today <= endDate;
	};

	// Function to check if iteration hasn't started yet
	const isFutureIteration = (iteration: any) => {
		if (!iteration.startDate) return false;

		const today = new Date();
		const startDate = new Date(iteration.startDate);

		// Reset time for date comparison
		today.setHours(0, 0, 0, 0);
		startDate.setHours(0, 0, 0, 0);

		return startDate > today;
	};
	return (
		<div
			style={{
				margin: '20px 0'
			}}
		>
			{loading && (
				<div style={{ textAlign: 'center', padding: '20px' }}>
					<div
						style={{
							border: `2px solid ${themeColors.panelBorder}`,
							borderTop: `2px solid ${themeColors.progressBarBackground}`,
							borderRadius: '50%',
							width: '20px',
							height: '20px',
							animation: 'spin 1s linear infinite',
							margin: '0 auto 10px'
						}}
					/>
					<p>Loading iterations...</p>
				</div>
			)}

			{error && (
				<div
					style={{
						textAlign: 'center',
						padding: '20px',
						color: themeColors.errorForeground
					}}
				>
					<p>{error}</p>
				</div>
			)}

			{iterations.length > 0 && !loading && !error && (
				<table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${themeColors.panelBorder}` }}>
					<thead>
						<tr style={{ backgroundColor: themeColors.tabActiveBackground, color: themeColors.tabActiveForeground }}>
							<th style={{ padding: '10px 4px', textAlign: 'center', borderBottom: `1px solid ${themeColors.panelBorder}`, fontWeight: 'bold', width: '30px' }}></th>
							<th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${themeColors.panelBorder}`, fontWeight: 'bold', minWidth: '150px' }}>Name</th>
							<th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: `1px solid ${themeColors.panelBorder}`, fontWeight: 'bold' }}>Hours</th>
							<th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${themeColors.panelBorder}`, fontWeight: 'bold' }}>Start Date</th>
							<th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${themeColors.panelBorder}`, fontWeight: 'bold' }}>End Date</th>
						</tr>
					</thead>
					<tbody>
						{iterations
							.sort((a, b) => {
								const aDate = a.startDate ? new Date(a.startDate) : new Date(0);
								const bDate = b.startDate ? new Date(b.startDate) : new Date(0);
								return bDate.getTime() - aDate.getTime(); // Descending order
							})
							.map(iteration => (
								<tr
									key={iteration.objectId}
									onClick={() => onIterationSelected?.(iteration)}
									style={{
										cursor: onIterationSelected ? 'pointer' : 'default',
										backgroundColor: selectedIteration?.objectId === iteration.objectId ? themeColors.listActiveSelectionBackground : undefined,
										color: selectedIteration?.objectId === iteration.objectId ? themeColors.listActiveSelectionForeground : undefined,
										borderBottom: `1px solid ${themeColors.panelBorder}`,
										transition: 'background-color 0.15s ease, box-shadow 0.15s ease'
									}}
									onMouseEnter={e => {
										if (selectedIteration?.objectId !== iteration.objectId) {
											e.currentTarget.style.backgroundColor = themeColors.listHoverBackground;
											e.currentTarget.style.boxShadow = `inset 0 0 0 1px ${themeColors.listHoverBackground}`;
										}
									}}
									onMouseLeave={e => {
										if (selectedIteration?.objectId !== iteration.objectId) {
											e.currentTarget.style.backgroundColor = selectedIteration?.objectId === iteration.objectId ? themeColors.listActiveSelectionBackground : '';
											e.currentTarget.style.boxShadow = 'none';
										}
									}}
								>
									<td style={{ padding: '10px 4px', textAlign: 'center', fontWeight: 'normal' }}>
										{isCurrentDayIteration(iteration) && (
											<div
												style={{
													display: 'inline-flex',
													alignItems: 'center',
													justifyContent: 'center',
													width: '18px',
													height: '18px',
													borderRadius: '50%',
													backgroundColor: themeColors.buttonBackground,
													color: themeColors.buttonForeground,
													opacity: 0.7,
													animation: 'glow-subtle 3s ease-in-out infinite'
												}}
												title="Ongoing"
											>
												<style>{`
													@keyframes glow-subtle {
														0%, 100% {
															box-shadow: 0 0 6px rgba(33, 150, 243, 0.5);
															opacity: 0.8;
														}
														50% {
															box-shadow: 0 0 12px rgba(33, 150, 243, 0.8);
															opacity: 1;
														}
													}
												`}</style>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													fill="none"
													viewBox="0 0 24 24"
													strokeWidth="1.5"
													stroke="currentColor"
													style={{
														width: '14px',
														height: '14px',
														color: 'inherit'
													}}
												>
													<path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
												</svg>
											</div>
										)}
									</td>
									<td style={{ padding: '10px 12px', fontWeight: 'normal', color: isFutureIteration(iteration) ? themeColors.descriptionForeground : themeColors.foreground, textDecoration: 'none' }}>{iteration.name}</td>
									<td style={{ padding: '10px 12px', fontWeight: 'normal', textAlign: 'right', color: isFutureIteration(iteration) ? themeColors.descriptionForeground : undefined }}>
										{iteration.taskEstimateTotal !== undefined && iteration.taskEstimateTotal !== null ? `${iteration.taskEstimateTotal}h` : ''}
									</td>
									<td style={{ padding: '10px 12px', fontWeight: 'normal', color: isFutureIteration(iteration) ? themeColors.descriptionForeground : undefined }}>{iteration.startDate ? new Date(iteration.startDate).toLocaleDateString() : 'N/A'}</td>
									<td style={{ padding: '10px 12px', fontWeight: 'normal', color: isFutureIteration(iteration) ? themeColors.descriptionForeground : undefined }}>{iteration.endDate ? new Date(iteration.endDate).toLocaleDateString() : 'N/A'}</td>
								</tr>
							))}
					</tbody>
				</table>
			)}
		</div>
	);
};

export default UserStoriesTable;
