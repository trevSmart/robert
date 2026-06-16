import type { FC } from 'react';
import Avatar from '../../common/Avatar';
import ScreenHeader from '../../common/ScreenHeader';
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
				<circle
					cx={cx}
					cy={cy}
					r={radius}
					fill="none"
					stroke="var(--vscode-panel-border)"
					strokeWidth={14}
				/>
				{/* Arc */}
				<circle
					cx={cx}
					cy={cy}
					r={radius}
					fill="none"
					stroke={color}
					strokeWidth={14}
					strokeLinecap="round"
					strokeDasharray={circumference}
					strokeDashoffset={strokeDashoffset}
					style={{ transition: 'stroke-dashoffset 0.6s ease' }}
				/>
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
				<span style={{ fontSize: '26px', fontWeight: '700', color, lineHeight: 1 }}>{clampedPct}%</span>
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
				<div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--vscode-foreground)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
					Hours breakdown
				</div>

				{rows.map(row => (
					<div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
						{/* Label */}
						<span style={{ width: `${labelW}px`, flexShrink: 0, fontSize: '11px', color: 'var(--vscode-descriptionForeground)', textAlign: 'right' }}>
							{row.label}
						</span>

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
						<span style={{ width: '36px', flexShrink: 0, fontSize: '11px', fontWeight: '600', color: 'var(--vscode-foreground)' }}>
							{row.hours}h
						</span>
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

const TeamMemberDetail: FC<TeamMemberDetailProps> = ({ member, onBack }) => {
	const pct = member.progress.percentage;
	const color = progressColor(pct);
	const hasActivity = member.progress.totalHours > 0 || (member.progress.userStoriesCount ?? 0) > 0;
	const userStoriesCount = member.progress.userStoriesCount ?? 0;

	return (
		<div style={{ padding: '0 20px' }}>
			<ScreenHeader title={member.name} showBackButton={true} onBack={onBack} />

			<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', paddingTop: '24px', paddingBottom: '32px' }}>

				{/* Avatar + nom */}
				<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
					<Avatar name={member.name} size={64} showRing={hasActivity} ringProgress={pct} ringColor={color} />
					<h2 style={{ margin: 0, color: 'var(--vscode-foreground)', fontSize: '20px', fontWeight: '600' }}>
						{member.name}
					</h2>
					{member.userName && (
						<span style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)', fontFamily: 'var(--vscode-editor-font-family, monospace)' }}>
							{member.userName}
						</span>
					)}
					{member.emailAddress && (
						<a
							href={`mailto:${member.emailAddress}`}
							style={{ fontSize: '12px', color: 'var(--vscode-textLink-foreground)', textDecoration: 'none' }}
							onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline'; }}
							onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none'; }}
						>
							{member.emailAddress}
						</a>
					)}
					{userStoriesCount > 0 && (
						<span style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>
							{userStoriesCount} user {userStoriesCount === 1 ? 'story' : 'stories'} this sprint
						</span>
					)}
				</div>

				{hasActivity ? (
					<>
						{/* Donut chart */}
						<DonutChart percentage={pct} size={160} />

						{/* Stats pills */}
						<div style={{ display: 'flex', gap: '10px' }}>
							<div style={{ backgroundColor: 'var(--vscode-editor-background)', border: '1px solid var(--vscode-panel-border)', borderRadius: '8px', padding: '12px 20px', textAlign: 'center', minWidth: '90px' }}>
								<div style={{ fontSize: '20px', fontWeight: '700', color }}>{pct}%</div>
								<div style={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Completed</div>
							</div>
							<div style={{ backgroundColor: 'var(--vscode-editor-background)', border: '1px solid var(--vscode-panel-border)', borderRadius: '8px', padding: '12px 20px', textAlign: 'center', minWidth: '90px' }}>
								<div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--vscode-foreground)' }}>{member.progress.completedHours}h</div>
								<div style={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Done</div>
							</div>
							<div style={{ backgroundColor: 'var(--vscode-editor-background)', border: '1px solid var(--vscode-panel-border)', borderRadius: '8px', padding: '12px 20px', textAlign: 'center', minWidth: '90px' }}>
								<div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--vscode-foreground)' }}>{member.progress.totalHours}h</div>
								<div style={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</div>
							</div>
						</div>

						{/* Hours bar chart */}
						{member.progress.totalHours > 0 && (
							<HoursBarChart
								completedHours={member.progress.completedHours}
								totalHours={member.progress.totalHours}
							/>
						)}
					</>
				) : (
					<p style={{ color: 'var(--vscode-descriptionForeground)', fontSize: '14px' }}>
						No activity recorded for this sprint.
					</p>
				)}
			</div>
		</div>
	);
};

export default TeamMemberDetail;
