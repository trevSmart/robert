import React, { useState } from 'react';
import { themeColors, isLightTheme } from '../../utils/themeColors';
import { logDebug } from '../../utils/vscodeApi';
import { useColumnResize } from '../../hooks/useColumnResize';
import { useTableSort } from '../../hooks/useTableSort';

interface Defect {
	objectId: string;
	formattedId: string;
	name: string;
	description: string | null;
	state: string;
	scheduleState: string;
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

interface DefectsTableProps {
	defects: Defect[];
	loading?: boolean;
	error?: string;
	onLoadDefects?: () => void;
	onDefectSelected?: (defect: Defect) => void;
	selectedDefect?: Defect | null;
	hasMore?: boolean;
	onLoadMore?: () => void;
	loadingMore?: boolean;
	embedded?: boolean;
}

const getSeverityColor = (severity: string) => {
	switch (severity?.toLowerCase()) {
		case 'critical':
			return '#dc3545';
		case 'high':
			return '#fd7e14';
		case 'medium':
			return '#ffc107';
		case 'low':
			return '#198754';
		default:
			return isLightTheme() ? 'rgba(0, 0, 0, 0.6)' : themeColors.descriptionForeground;
	}
};

const getPriorityColor = (priority: string) => {
	switch (priority?.toLowerCase()) {
		case 'urgent':
		case 'high attention':
		case 'resolve immediately':
			return '#dc3545';
		case 'high':
			return '#fd7e14';
		case 'medium':
			return '#ffc107';
		case 'low':
			return '#198754';
		default:
			return isLightTheme() ? 'rgba(0, 0, 0, 0.6)' : themeColors.descriptionForeground;
	}
};

const getScheduleStateColor = (scheduleState: string) => {
	switch (scheduleState?.toLowerCase()) {
		case 'new':
			return '#6c757d';
		case 'defined':
			return '#fd7e14';
		case 'in-progress':
			return '#ffc107';
		case 'completed':
			return '#0d6efd';
		case 'accepted':
			return '#198754';
		case 'closed':
			return '#495057';
		default:
			return isLightTheme() ? 'rgba(0, 0, 0, 0.6)' : themeColors.descriptionForeground;
	}
};

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

const COLUMN_KEYS = ['formattedId', 'name', 'scheduleState', 'severity', 'priority'] as const;
type ColumnKey = (typeof COLUMN_KEYS)[number];

const INITIAL_WIDTHS: Record<ColumnKey, number> = {
	formattedId: 120,
	name: 360,
	scheduleState: 120,
	severity: 120,
	priority: 120
};

const DefectsTable: React.FC<DefectsTableProps> = ({ defects, loading = false, error, onLoadDefects: _onLoadDefects, onDefectSelected, selectedDefect, hasMore = false, onLoadMore, loadingMore = false, embedded = false }) => {
	logDebug(`onDefectSelected: ${JSON.stringify(onDefectSelected)}, defects.length: ${defects.length}`, 'DefectsTable');

	const { sortedItems, sortConfig, requestSort } = useTableSort(defects, { key: 'formattedId', direction: 'desc' });
	const { columnWidths, startResize } = useColumnResize(INITIAL_WIDTHS);
	const totalColumnWidth = Object.values(columnWidths).reduce((sum, width) => sum + width, 0);
	const getColumnPercent = (key: ColumnKey) => (totalColumnWidth > 0 ? (columnWidths[key] / totalColumnWidth) * 100 : 0);

	const ResizeHandle: React.FC<{ colKey: ColumnKey }> = ({ colKey }) => (
		<div
			onMouseDown={e => startResize(colKey, e)}
			style={{
				position: 'absolute',
				right: 0,
				top: 0,
				bottom: 0,
				width: '5px',
				cursor: 'col-resize',
				userSelect: 'none',
				zIndex: 1
			}}
		/>
	);

	const SortableHeader: React.FC<{
		label: string;
		sortKey: keyof Defect;
		colKey: ColumnKey;
		textAlign?: 'left' | 'center' | 'right';
	}> = ({ label, sortKey, colKey, textAlign = 'left' }) => {
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
					position: 'relative',
					padding: '10px 12px',
					textAlign,
					borderBottom: `1px solid ${themeColors.panelBorder}`,
					fontWeight: 'bold',
					cursor: 'pointer',
					backgroundColor: themeColors.titleBarActiveBackground,
					color: themeColors.titleBarActiveForeground,
					userSelect: 'none',
					whiteSpace: 'nowrap',
					overflow: 'hidden'
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
				<ResizeHandle colKey={colKey} />
			</th>
		);
	};

	const containerStyle: React.CSSProperties = embedded
		? {
				margin: 0,
				padding: 0,
				backgroundColor: 'transparent',
				border: 'none',
				borderRadius: 0
			}
		: {
				margin: '20px 0',
				padding: '20px',
				backgroundColor: themeColors.panelBackground,
				border: `1px solid ${themeColors.panelBorder}`,
				borderRadius: '6px'
			};

	return (
		<div style={containerStyle}>
			{loading && (
				<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px', gap: '10px' }}>
					<div
						style={{
							border: `2px solid ${themeColors.panelBorder}`,
							borderTop: `2px solid ${themeColors.progressBarBackground}`,
							borderRadius: '50%',
							width: '20px',
							height: '20px',
							animation: 'spin 1s linear infinite'
						}}
					/>
					<p>Loading defects...</p>
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

			{!loading && !error && sortedItems.length === 0 && (
				<div
					style={{
						textAlign: 'center',
						padding: '20px',
						color: themeColors.descriptionForeground
					}}
				>
					<p>There are no defects.</p>
				</div>
			)}

			{sortedItems.length > 0 && !loading && !error && (
				<table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', border: `1px solid ${themeColors.panelBorder}` }}>
					<colgroup>
						<col style={{ width: `${getColumnPercent('formattedId')}%` }} />
						<col style={{ width: `${getColumnPercent('name')}%` }} />
						<col style={{ width: `${getColumnPercent('scheduleState')}%` }} />
						<col style={{ width: `${getColumnPercent('severity')}%` }} />
						<col style={{ width: `${getColumnPercent('priority')}%` }} />
					</colgroup>
					<thead>
						<tr style={{ backgroundColor: themeColors.titleBarActiveBackground, color: themeColors.titleBarActiveForeground }}>
							<SortableHeader label="ID" sortKey="formattedId" colKey="formattedId" />
							<SortableHeader label="Name" sortKey="name" colKey="name" />
							<SortableHeader label="State" sortKey="scheduleState" colKey="scheduleState" />
							<SortableHeader label="Severity" sortKey="severity" colKey="severity" />
							<SortableHeader label="Priority" sortKey="priority" colKey="priority" />
						</tr>
					</thead>
					<tbody>
						{sortedItems.map(defect => (
							<tr
								key={defect.objectId}
								onClick={() => {
									logDebug(`Clicked on defect: ${defect.formattedId}, onDefectSelected: ${JSON.stringify(onDefectSelected)}`, 'DefectsTable');
									onDefectSelected?.(defect);
								}}
								style={{
									cursor: onDefectSelected ? 'pointer' : 'default',
									backgroundColor: selectedDefect?.objectId === defect.objectId ? themeColors.listActiveSelectionBackground : undefined,
									color: selectedDefect?.objectId === defect.objectId ? themeColors.listActiveSelectionForeground : undefined,
									borderBottom: `1px solid ${themeColors.panelBorder}`,
									transition: 'background-color 0.15s ease, box-shadow 0.15s ease'
								}}
								onMouseEnter={e => {
									if (selectedDefect?.objectId !== defect.objectId) {
										e.currentTarget.style.backgroundColor = themeColors.listHoverBackground;
										e.currentTarget.style.boxShadow = `inset 0 0 0 1px ${themeColors.listHoverBackground}`;
									}
								}}
								onMouseLeave={e => {
									if (selectedDefect?.objectId !== defect.objectId) {
										e.currentTarget.style.backgroundColor = selectedDefect?.objectId === defect.objectId ? themeColors.listActiveSelectionBackground : '';
										e.currentTarget.style.boxShadow = 'none';
									}
								}}
							>
								<td style={{ padding: '10px 12px', fontWeight: 'normal', color: themeColors.foreground, textDecoration: 'none' }}>{defect.formattedId}</td>
								<td style={{ padding: '10px 12px', fontWeight: 'normal', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{defect.name}</td>
								<td
									style={{
										padding: '10px 12px',
										fontWeight: 'normal',
										color: getScheduleStateColor(defect.scheduleState || 'new'),
										overflow: 'hidden',
										whiteSpace: 'nowrap',
										textOverflow: 'ellipsis'
									}}
								>
									{defect.scheduleState || 'N/A'}
								</td>
								<td
									style={{
										padding: '10px 12px',
										fontWeight: 'normal',
										overflow: 'hidden',
										whiteSpace: 'nowrap',
										textOverflow: 'ellipsis',
										color: getSeverityColor(defect.severity)
									}}
								>
									{defect.severity || 'N/A'}
								</td>
								<td
									style={{
										padding: '10px 12px',
										fontWeight: 'normal',
										overflow: 'hidden',
										whiteSpace: 'nowrap',
										textOverflow: 'ellipsis',
										color: getPriorityColor(defect.priority)
									}}
								>
									{defect.priority || 'N/A'}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			)}

			{!loading && !error && sortedItems.length > 0 && hasMore && (
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
		</div>
	);
};

export default DefectsTable;
