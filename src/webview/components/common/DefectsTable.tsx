import type React from 'react';
import { themeColors, isLightTheme } from '../../utils/themeColors';

interface Defect {
	objectId: string;
	formattedId: string;
	name: string;
	description: string | null;
	state: string;
	severity: string;
	priority: string;
	owner: string;
	project: string | null;
	iteration: string | null;
	blocked: boolean;
	discussionCount: number;
}

interface DefectsTableProps {
	defects: Defect[];
	loading?: boolean;
	error?: string;
	onLoadDefects?: () => void;
	onDefectSelected?: (defect: Defect) => void;
	selectedDefect?: Defect | null;
}

const getSeverityColor = (severity: string) => {
	switch (severity?.toLowerCase()) {
		case 'critical':
			return '#dc3545'; // Red
		case 'high':
			return '#fd7e14'; // Orange
		case 'medium':
			return '#ffc107'; // Yellow
		case 'low':
			return '#198754'; // Green
		default:
			return isLightTheme() ? 'rgba(0, 0, 0, 0.6)' : themeColors.descriptionForeground;
	}
};

const getPriorityColor = (priority: string) => {
	switch (priority?.toLowerCase()) {
		case 'urgent':
			return '#dc3545'; // Red
		case 'high':
			return '#fd7e14'; // Orange
		case 'medium':
			return '#ffc107'; // Yellow
		case 'low':
			return '#198754'; // Green
		default:
			return isLightTheme() ? 'rgba(0, 0, 0, 0.6)' : themeColors.descriptionForeground;
	}
};

const getStateColor = (state: string) => {
	switch (state?.toLowerCase()) {
		case 'open':
			return '#0d6efd'; // Blue
		case 'fixed':
			return '#198754'; // Green
		case 'closed':
			return '#495057'; // Dark Gray
		case 'duplicate':
			return '#6c757d'; // Gray
		case 'deferred':
			return '#fd7e14'; // Orange
		default:
			return isLightTheme() ? 'rgba(0, 0, 0, 0.6)' : themeColors.descriptionForeground;
	}
};

const DefectsTable: React.FC<DefectsTableProps> = ({ defects, loading = false, error, onLoadDefects, onDefectSelected, selectedDefect }) => {
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

			{!loading && !error && defects.length === 0 && (
				<div
					style={{
						textAlign: 'center',
						padding: '20px',
						color: themeColors.descriptionForeground
					}}
				>
					<p>No defects found in this project</p>
				</div>
			)}

			{defects.length > 0 && !loading && !error && (
				<table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${themeColors.panelBorder}` }}>
					<thead>
						<tr style={{ backgroundColor: themeColors.titleBarActiveBackground, color: themeColors.titleBarActiveForeground }}>
							<th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${themeColors.panelBorder}`, fontWeight: 'bold', width: '10%' }}>ID</th>
							<th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${themeColors.panelBorder}`, fontWeight: 'bold' }}>Name</th>
							<th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${themeColors.panelBorder}`, fontWeight: 'bold', width: '12%' }}>State</th>
							<th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${themeColors.panelBorder}`, fontWeight: 'bold', width: '12%' }}>Severity</th>
							<th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${themeColors.panelBorder}`, fontWeight: 'bold', width: '12%' }}>Priority</th>
							<th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${themeColors.panelBorder}`, fontWeight: 'bold', width: '12%' }}>Owner</th>
						</tr>
					</thead>
					<tbody>
						{defects.map(defect => (
							<tr
								key={defect.objectId}
								onClick={() => onDefectSelected?.(defect)}
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
								<td style={{ padding: '10px 12px', fontWeight: 'normal' }}>{defect.name}</td>
								<td
									style={{
										padding: '10px 12px',
										fontWeight: 'normal',
										color: getStateColor(defect.state)
									}}
								>
									{defect.state || 'N/A'}
								</td>
								<td
									style={{
										padding: '10px 12px',
										fontWeight: 'normal',
										color: getSeverityColor(defect.severity)
									}}
								>
									{defect.severity || 'N/A'}
								</td>
								<td
									style={{
										padding: '10px 12px',
										fontWeight: 'normal',
										color: getPriorityColor(defect.priority)
									}}
								>
									{defect.priority || 'N/A'}
								</td>
								<td style={{ padding: '10px 12px', fontWeight: 'normal' }}>{defect.owner}</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	);
};

export default DefectsTable;
