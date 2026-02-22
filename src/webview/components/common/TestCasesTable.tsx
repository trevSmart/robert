import React, { useState } from 'react';
import { themeColors } from '../../utils/themeColors';
import type { TestCase } from '../../../types/rally';
import { useColumnResize } from '../../hooks/useColumnResize';
import { useTableSort } from '../../hooks/useTableSort';

interface TestCasesTableProps {
	testCases: TestCase[];
	loading?: boolean;
	error?: string | null;
	embedded?: boolean;
}

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

const COLUMN_KEYS = ['formattedId', 'name', 'state', 'type', 'priority', 'owner'] as const;
type ColumnKey = (typeof COLUMN_KEYS)[number];

const INITIAL_WIDTHS: Record<ColumnKey, number> = {
	formattedId: 110,
	name: 320,
	state: 140,
	type: 120,
	priority: 120,
	owner: 160
};

const TestCasesTable: React.FC<TestCasesTableProps> = ({ testCases, loading = false, error, embedded = false }) => {
	const { sortedItems, sortConfig, requestSort } = useTableSort(testCases, { key: 'formattedId', direction: 'asc' });
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
		sortKey: keyof TestCase;
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
					<p>Loading test cases...</p>
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
					<p>There are no test cases.</p>
				</div>
			)}

			{sortedItems.length > 0 && !loading && !error && (
				<table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', border: `1px solid ${themeColors.panelBorder}` }}>
					<colgroup>
						<col style={{ width: `${getColumnPercent('formattedId')}%` }} />
						<col style={{ width: `${getColumnPercent('name')}%` }} />
						<col style={{ width: `${getColumnPercent('state')}%` }} />
						<col style={{ width: `${getColumnPercent('type')}%` }} />
						<col style={{ width: `${getColumnPercent('priority')}%` }} />
						<col style={{ width: `${getColumnPercent('owner')}%` }} />
					</colgroup>
					<thead>
						<tr style={{ backgroundColor: themeColors.titleBarActiveBackground, color: themeColors.titleBarActiveForeground }}>
							<SortableHeader label="ID" sortKey="formattedId" colKey="formattedId" />
							<SortableHeader label="Name" sortKey="name" colKey="name" />
							<SortableHeader label="State" sortKey="state" colKey="state" />
							<SortableHeader label="Type" sortKey="type" colKey="type" />
							<SortableHeader label="Priority" sortKey="priority" colKey="priority" />
							<SortableHeader label="Assigned To" sortKey="owner" colKey="owner" />
						</tr>
					</thead>
					<tbody>
						{sortedItems.map(tc => (
							<tr
								key={tc.objectId}
								style={{
									borderBottom: `1px solid ${themeColors.panelBorder}`,
									cursor: 'default',
									backgroundColor: 'transparent',
									transition: 'background-color 0.15s ease, box-shadow 0.15s ease'
								}}
								onMouseEnter={e => {
									e.currentTarget.style.backgroundColor = themeColors.listHoverBackground;
									e.currentTarget.style.boxShadow = `inset 0 0 0 1px ${themeColors.listHoverBackground}`;
								}}
								onMouseLeave={e => {
									e.currentTarget.style.backgroundColor = 'transparent';
									e.currentTarget.style.boxShadow = 'none';
								}}
							>
								<td style={{ padding: '10px 12px', fontWeight: 'normal', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{tc.formattedId}</td>
								<td style={{ padding: '10px 12px', fontWeight: 'normal', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{tc.name}</td>
								<td style={{ padding: '10px 12px', fontWeight: 'normal', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{tc.state}</td>
								<td style={{ padding: '10px 12px', fontWeight: 'normal', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{tc.type || '—'}</td>
								<td style={{ padding: '10px 12px', fontWeight: 'normal', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{tc.priority || '—'}</td>
								<td style={{ padding: '10px 12px', fontWeight: 'normal', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{tc.owner || 'N/A'}</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	);
};

export default TestCasesTable;
