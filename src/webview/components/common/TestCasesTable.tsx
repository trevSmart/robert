import type React from 'react';
import { themeColors } from '../../utils/themeColors';
import type { TestCase } from '../../../types/rally';

interface TestCasesTableProps {
	testCases: TestCase[];
	loading?: boolean;
	error?: string | null;
}

const TestCasesTable: React.FC<TestCasesTableProps> = ({ testCases, loading = false, error }) => {
	return (
		<div
			style={{
				margin: '20px 0',
				padding: '20px',
				backgroundColor: themeColors.panelBackground,
				border: `1px solid ${themeColors.panelBorder}`,
				borderRadius: '6px'
			}}
		>
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

			{!loading && !error && testCases.length === 0 && (
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

			{testCases.length > 0 && !loading && !error && (
				<table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${themeColors.panelBorder}` }}>
					<thead>
						<tr style={{ backgroundColor: themeColors.titleBarActiveBackground, color: themeColors.titleBarActiveForeground }}>
							<th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${themeColors.panelBorder}`, fontWeight: 'bold' }}>ID</th>
							<th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${themeColors.panelBorder}`, fontWeight: 'bold' }}>Name</th>
							<th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${themeColors.panelBorder}`, fontWeight: 'bold' }}>State</th>
							<th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${themeColors.panelBorder}`, fontWeight: 'bold' }}>Type</th>
							<th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${themeColors.panelBorder}`, fontWeight: 'bold' }}>Priority</th>
							<th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${themeColors.panelBorder}`, fontWeight: 'bold' }}>Assigned To</th>
						</tr>
					</thead>
					<tbody>
						{testCases.map(tc => (
							<tr
								key={tc.objectId}
								style={{
									borderBottom: `1px solid ${themeColors.panelBorder}`,
									cursor: 'default',
									transition: 'background-color 0.15s ease, box-shadow 0.15s ease'
								}}
								onMouseEnter={e => {
									e.currentTarget.style.backgroundColor = themeColors.listHoverBackground;
									e.currentTarget.style.boxShadow = `inset 0 0 0 1px ${themeColors.listHoverBackground}`;
								}}
								onMouseLeave={e => {
									e.currentTarget.style.backgroundColor = '';
									e.currentTarget.style.boxShadow = 'none';
								}}
							>
								<td style={{ padding: '10px 12px', fontWeight: 'normal' }}>{tc.formattedId}</td>
								<td style={{ padding: '10px 12px', fontWeight: 'normal' }}>{tc.name}</td>
								<td style={{ padding: '10px 12px', fontWeight: 'normal' }}>{tc.state}</td>
								<td style={{ padding: '10px 12px', fontWeight: 'normal' }}>{tc.type || '—'}</td>
								<td style={{ padding: '10px 12px', fontWeight: 'normal' }}>{tc.priority || '—'}</td>
								<td style={{ padding: '10px 12px', fontWeight: 'normal' }}>{tc.owner || 'N/A'}</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	);
};

export default TestCasesTable;
