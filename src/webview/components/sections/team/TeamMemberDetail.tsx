import { type FC, useState, useEffect, useMemo } from 'react';
import Avatar from '../../common/Avatar';
import ScreenHeader from '../../common/ScreenHeader';
import { getVsCodeApi } from '../../../utils/vscodeApi';
import type { TeamMember } from '../TeamSection';

interface TeamMemberDetailProps {
	member: TeamMember;
	onBack: () => void;
}

function progressColor(pct: number): string {
	if (pct >= 75) return 'var(--vscode-charts-green, #4caf50)';
	if (pct >= 50) return 'var(--vscode-charts-orange, #ff9800)';
	if (pct >= 25) return 'var(--vscode-charts-yellow, #ffc107)';
	return 'var(--vscode-charts-red, #f44336)';
}

// Donut chart: shows percentage completion as a filled arc
interface DonutChartProps {
	percentage: number;
	size?: number;
}

const DonutChart: FC<DonutChartProps> = ({ percentage, size = 160 }) => {
	const clampedPct = Math.min(100, Math.max(0, percentage));
	const radius = (size - 24) / 2;
	const cx = size / 2;
	const cy = size / 2;
	const circumference = 2 * Math.PI * radius;
	const strokeDashoffset = circumference * (1 - clampedPct / 100);
	const color = progressColor(clampedPct);

	return (
		<div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
			<svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
				{/* Track */}
				<circle cx={cx} cy={cy} r={radius} fill="none" stroke="var(--vscode-panel-border)" strokeWidth={14} />
				{/* Arc */}
				<circle cx={cx} cy={cy} r={radius} fill="none" stroke={color} strokeWidth={14} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
			</svg>
			{/* Centre label */}
			<div
				style={{
					position: 'absolute',
					inset: 0,
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center'
				}}
			>
				<span style={{ fontSize: '26px', fontWeight: '600', color, lineHeight: 1 }}>{clampedPct}%</span>
				<span style={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>done</span>
			</div>
		</div>
	);
};

// Horizontal bar chart: completed vs remaining hours
interface HoursBarChartProps {
	completedHours: number;
	totalHours: number;
}

const HoursBarChart: FC<HoursBarChartProps> = ({ completedHours, totalHours }) => {
	const remaining = Math.max(0, totalHours - completedHours);
	const pct = totalHours > 0 ? Math.round((completedHours / totalHours) * 100) : 0;
	const color = progressColor(pct);
	const barH = 10;
	const labelW = 68;
	const chartW = 280;

	const rows: Array<{ label: string; hours: number; fill: string }> = [
		{ label: 'Completed', hours: completedHours, fill: color },
		{ label: 'Remaining', hours: remaining, fill: 'var(--vscode-panel-border)' }
	];

	return (
		<div style={{ width: '100%', maxWidth: '480px' }}>
			<div
				style={{
					backgroundColor: 'var(--vscode-editor-background)',
					border: '1px solid var(--vscode-panel-border)',
					borderRadius: '8px',
					padding: '16px 20px'
				}}
			>
				<div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--vscode-foreground)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hours breakdown</div>

				{rows.map(row => (
					<div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
						{/* Label */}
						<span style={{ width: `${labelW}px`, flexShrink: 0, fontSize: '11px', color: 'var(--vscode-descriptionForeground)', textAlign: 'right' }}>{row.label}</span>

						{/* Bar */}
						<div style={{ flex: 1, height: `${barH}px`, backgroundColor: 'var(--vscode-panel-border)', borderRadius: '5px', overflow: 'hidden', maxWidth: `${chartW}px` }}>
							<div
								style={{
									height: '100%',
									width: totalHours > 0 ? `${(row.hours / totalHours) * 100}%` : '0%',
									backgroundColor: row.fill,
									borderRadius: '5px',
									transition: 'width 0.6s ease'
								}}
							/>
						</div>

						{/* Value */}
						<span style={{ width: '36px', flexShrink: 0, fontSize: '11px', fontWeight: '500', color: 'var(--vscode-foreground)' }}>{row.hours}h</span>
					</div>
				))}

				{/* Total */}
				<div style={{ borderTop: '1px solid var(--vscode-panel-border)', marginTop: '6px', paddingTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
					<span style={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)' }}>
						Total: <strong style={{ color: 'var(--vscode-foreground)' }}>{totalHours}h</strong>
					</span>
				</div>
			</div>
		</div>
	);
};

// Vertical bar chart: assigned-hours evolution across the last sprints
interface SprintHoursPoint {
	iterationName: string;
	totalHours: number;
	completedHours: number;
	sprintTotalHours: number;
	userStoriesCount: number;
}

interface HoursHistoryChartProps {
	history: SprintHoursPoint[];
}

// Shorten a sprint name for the compact x-axis labels (e.g. "Sprint 2024-12" -> "12").
function shortSprintLabel(name: string): string {
	const trimmed = (name || '').trim();
	const match = trimmed.match(/(\d+)\s*$/);
	if (match) return match[1];
	const words = trimmed.split(/\s+/);
	return words[words.length - 1] || trimmed;
}

const HoursHistoryChart: FC<HoursHistoryChartProps> = ({ history }) => {
	// Bars are scaled against the largest whole-sprint total so the grey backdrops
	// stay comparable across sprints; the coloured segment shows the member's share.
	const maxHours = Math.max(1, ...history.map(h => h.sprintTotalHours));
	const chartH = 140;
	const barColor = 'var(--vscode-charts-blue, #3794ff)';
	const trackColor = 'var(--vscode-panel-border)';

	return (
		<div style={{ width: '100%', maxWidth: '480px' }}>
			<div
				style={{
					backgroundColor: 'var(--vscode-editor-background)',
					border: '1px solid var(--vscode-panel-border)',
					borderRadius: '8px',
					padding: '16px 20px'
				}}
			>
				<div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--vscode-foreground)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Your hours vs sprint total · last {history.length} sprints</div>

				<div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', gap: '8px', height: `${chartH}px` }}>
					{history.map(point => {
						const barHeight = Math.round((point.sprintTotalHours / maxHours) * (chartH - 24));
						// Height of the member's coloured slice within the grey sprint bar.
						const memberHeight = point.sprintTotalHours > 0 ? Math.round((point.totalHours / point.sprintTotalHours) * barHeight) : 0;
						return (
							<div
								key={point.iterationName}
								style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', minWidth: 0 }}
								title={`${point.iterationName}: ${point.totalHours}h of ${point.sprintTotalHours}h sprint total (${point.completedHours}h done)`}
							>
								<span style={{ fontSize: '10px', fontWeight: '500', color: 'var(--vscode-foreground)', marginBottom: '4px' }}>{point.totalHours}h</span>
								<div
									style={{
										width: '70%',
										maxWidth: '32px',
										height: `${Math.max(2, barHeight)}px`,
										backgroundColor: trackColor,
										borderRadius: '4px 4px 0 0',
										transition: 'height 0.6s ease',
										display: 'flex',
										flexDirection: 'column',
										justifyContent: 'flex-end',
										overflow: 'hidden'
									}}
								>
									{memberHeight > 0 && (
										<div
											style={{
												width: '100%',
												height: `${Math.max(2, memberHeight)}px`,
												backgroundColor: barColor,
												borderRadius: memberHeight >= barHeight ? '4px 4px 0 0' : '0',
												transition: 'height 0.6s ease'
											}}
										/>
									)}
								</div>
							</div>
						);
					})}
				</div>

				{/* X-axis labels */}
				<div style={{ display: 'flex', justifyContent: 'space-around', gap: '8px', marginTop: '8px', borderTop: '1px solid var(--vscode-panel-border)', paddingTop: '8px' }}>
					{history.map(point => (
						<span key={point.iterationName} style={{ flex: 1, textAlign: 'center', fontSize: '10px', color: 'var(--vscode-descriptionForeground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={point.iterationName}>
							{shortSprintLabel(point.iterationName)}
						</span>
					))}
				</div>
			</div>
		</div>
	);
};

const TeamMemberDetail: FC<TeamMemberDetailProps> = ({ member, onBack }) => {
	const pct = member.progress.percentage;
	const color = progressColor(pct);
	const hasActivity = member.progress.totalHours > 0 || (member.progress.userStoriesCount ?? 0) > 0;
	const userStoriesCount = member.progress.userStoriesCount ?? 0;

	const vscode = useMemo(() => getVsCodeApi(), []);

	// User identity (UserName / EmailAddress) is loaded lazily by display name so it
	// shows regardless of whether the member has any sprint activity. Seed from any
	// values already present on the member, then refine with the targeted lookup.
	const [userName, setUserName] = useState<string | null>(member.userName ?? null);
	const [emailAddress, setEmailAddress] = useState<string | null>(member.emailAddress ?? null);
	const [infoLoading, setInfoLoading] = useState(true);

	// Assigned-hours history across the last 6 sprints — loaded lazily on open.
	const [hoursHistory, setHoursHistory] = useState<SprintHoursPoint[] | null>(null);
	const [historyLoading, setHistoryLoading] = useState(true);

	useEffect(() => {
		setUserName(member.userName ?? null);
		setEmailAddress(member.emailAddress ?? null);
		setInfoLoading(true);

		if (!vscode) {
			setInfoLoading(false);
			return;
		}

		const handleMessage = (event: MessageEvent) => {
			const data = event.data;
			if (data?.type === 'teamMemberInfoLoaded' && data.name === member.name) {
				window.removeEventListener('message', handleMessage);
				clearTimeout(timeoutId);
				setUserName(data.userName ?? null);
				setEmailAddress(data.emailAddress ?? null);
				setInfoLoading(false);
			}
		};
		window.addEventListener('message', handleMessage);

		vscode.postMessage({ command: 'getTeamMemberInfo', name: member.name });

		const timeoutId = setTimeout(() => {
			window.removeEventListener('message', handleMessage);
			setInfoLoading(false);
		}, 8000);

		return () => {
			window.removeEventListener('message', handleMessage);
			clearTimeout(timeoutId);
		};
	}, [vscode, member.name, member.userName, member.emailAddress]);

	// Load the assigned-hours history for the last 6 sprints.
	useEffect(() => {
		setHoursHistory(null);
		setHistoryLoading(true);

		if (!vscode) {
			setHistoryLoading(false);
			return;
		}

		const handleMessage = (event: MessageEvent) => {
			const data = event.data;
			if (data?.type === 'memberHoursHistoryLoaded' && data.name === member.name) {
				window.removeEventListener('message', handleMessage);
				clearTimeout(timeoutId);
				setHoursHistory(Array.isArray(data.history) ? data.history : []);
				setHistoryLoading(false);
			}
		};
		window.addEventListener('message', handleMessage);

		vscode.postMessage({ command: 'getMemberHoursHistory', name: member.name });

		const timeoutId = setTimeout(() => {
			window.removeEventListener('message', handleMessage);
			setHistoryLoading(false);
		}, 15000);

		return () => {
			window.removeEventListener('message', handleMessage);
			clearTimeout(timeoutId);
		};
	}, [vscode, member.name]);

	return (
		<div style={{ padding: '0 20px' }}>
			<ScreenHeader title={member.name} showBackButton={true} onBack={onBack} />

			<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', paddingTop: '24px', paddingBottom: '32px' }}>
				{/* Avatar + nom */}
				<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
					<Avatar name={member.name} size={64} />
					<h2 style={{ margin: '4px 0 0 0', color: 'var(--vscode-foreground)', fontSize: '20px', fontWeight: '500' }}>{member.name}</h2>
				</div>

				{/* Identity card — always shown */}
				<div
					style={{
						width: '100%',
						maxWidth: '480px',
						backgroundColor: 'var(--vscode-editor-background)',
						border: '1px solid var(--vscode-panel-border)',
						borderRadius: '8px',
						padding: '16px 20px',
						display: 'flex',
						flexDirection: 'column',
						gap: '12px'
					}}
				>
					{/* Username */}
					<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
						<span style={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Username</span>
						{infoLoading && !userName ? (
							<span style={{ fontSize: '13px', color: 'var(--vscode-descriptionForeground)' }}>Loading…</span>
						) : (
							<span style={{ fontSize: '13px', color: 'var(--vscode-foreground)', fontFamily: 'var(--vscode-editor-font-family, monospace)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName || '—'}</span>
						)}
					</div>

					{/* Email */}
					<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', borderTop: '1px solid var(--vscode-panel-border)', paddingTop: '12px' }}>
						<span style={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</span>
						{infoLoading && !emailAddress ? (
							<span style={{ fontSize: '13px', color: 'var(--vscode-descriptionForeground)' }}>Loading…</span>
						) : emailAddress ? (
							<a
								href={`mailto:${emailAddress}`}
								style={{ fontSize: '13px', color: 'var(--vscode-textLink-foreground)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
								onMouseEnter={e => {
									(e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline';
								}}
								onMouseLeave={e => {
									(e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none';
								}}
							>
								{emailAddress}
							</a>
						) : (
							<span style={{ fontSize: '13px', color: 'var(--vscode-foreground)' }}>—</span>
						)}
					</div>
				</div>

				{/* Assigned-hours evolution over the last 6 sprints */}
				{historyLoading ? (
					<div style={{ width: '100%', maxWidth: '480px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '20px 0', color: 'var(--vscode-descriptionForeground)' }}>
						<div
							style={{
								border: '2px solid var(--vscode-panel-border)',
								borderTop: '2px solid var(--vscode-progressBar-background)',
								borderRadius: '50%',
								width: '16px',
								height: '16px',
								animation: 'spin 1s linear infinite'
							}}
						/>
						<span style={{ fontSize: '12px' }}>Loading hours history…</span>
					</div>
				) : (
					hoursHistory && hoursHistory.length > 0 && <HoursHistoryChart history={hoursHistory} />
				)}

				{hasActivity ? (
					<>
						{/* Sprint activity label */}
						{userStoriesCount > 0 && (
							<span style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>
								{userStoriesCount} user {userStoriesCount === 1 ? 'story' : 'stories'} this sprint
							</span>
						)}

						{/* Donut chart */}
						<DonutChart percentage={pct} size={160} />

						{/* Stats pills */}
						<div style={{ display: 'flex', gap: '10px' }}>
							<div style={{ backgroundColor: 'var(--vscode-editor-background)', border: '1px solid var(--vscode-panel-border)', borderRadius: '8px', padding: '12px 20px', textAlign: 'center', minWidth: '90px' }}>
								<div style={{ fontSize: '20px', fontWeight: '600', color }}>{pct}%</div>
								<div style={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Completed</div>
							</div>
							<div style={{ backgroundColor: 'var(--vscode-editor-background)', border: '1px solid var(--vscode-panel-border)', borderRadius: '8px', padding: '12px 20px', textAlign: 'center', minWidth: '90px' }}>
								<div style={{ fontSize: '20px', fontWeight: '600', color: 'var(--vscode-foreground)' }}>{member.progress.completedHours}h</div>
								<div style={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Done</div>
							</div>
							<div style={{ backgroundColor: 'var(--vscode-editor-background)', border: '1px solid var(--vscode-panel-border)', borderRadius: '8px', padding: '12px 20px', textAlign: 'center', minWidth: '90px' }}>
								<div style={{ fontSize: '20px', fontWeight: '600', color: 'var(--vscode-foreground)' }}>{member.progress.totalHours}h</div>
								<div style={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</div>
							</div>
						</div>

						{/* Hours bar chart */}
						{member.progress.totalHours > 0 && <HoursBarChart completedHours={member.progress.completedHours} totalHours={member.progress.totalHours} />}
					</>
				) : (
					<p style={{ color: 'var(--vscode-descriptionForeground)', fontSize: '14px', margin: 0 }}>No activity recorded for this sprint.</p>
				)}
			</div>
		</div>
	);
};

export default TeamMemberDetail;
