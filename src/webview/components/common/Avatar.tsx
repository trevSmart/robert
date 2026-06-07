import { FC } from 'react';

function getAvatarColor(name: string): string {
	if (!name || !name.trim()) {
		return 'transparent';
	}
	let sum = 0;
	for (let i = 0; i < name.length; i++) {
		sum += name.charCodeAt(i) * (i + 1);
	}
	const hue = sum % 360;
	return `hsl(${hue}, 45%, 45%)`;
}

function getInitials(name: string): string {
	if (!name || !name.trim()) {
		return '✕';
	}
	const parts = name.trim().split(/\s+/);
	if (parts.length === 1) {
		return parts[0].slice(0, 2).toUpperCase();
	}
	return (parts[0][0] + parts[1][0]).toUpperCase();
}

interface AvatarProps {
	name: string;
	size?: number;
	showRing?: boolean;
	ringProgress?: number;
	ringColor?: string;
	fontSize?: number;
}

const Avatar: FC<AvatarProps> = ({ name, size = 24, showRing = false, ringProgress = 0, ringColor = 'var(--vscode-charts-green, #4caf50)', fontSize }) => {
	const isEmpty = !name || !name.trim();
	const bg = getAvatarColor(name);
	const initials = getInitials(name);
	const fs = fontSize ?? Math.round(size * 0.38);
	const fw = size >= 32 ? 'bold' : '400';
	const color = isEmpty ? '#6c757d' : 'white';
	const border = isEmpty ? '1px dashed #6c757d' : undefined;

	if (!showRing) {
		return (
			<div
				style={{
					width: `${size}px`,
					height: `${size}px`,
					borderRadius: '50%',
					background: bg,
					border,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					color,
					fontWeight: fw,
					fontSize: `${fs}px`,
					flexShrink: 0,
					boxSizing: 'border-box'
				}}
			>
				{initials}
			</div>
		);
	}

	const margin = 8;
	const svgSize = size + margin * 2;
	const cx = svgSize / 2;
	const cy = svgSize / 2;
	const r = cx - 4;
	const progress = Math.min(100, Math.max(0, ringProgress));
	const circumference = 2 * Math.PI * r;
	const offset = circumference * (1 - progress / 100);

	return (
		<div role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={'Progress: ' + progress + '%'} style={{ position: 'relative' }}>
			<svg
				width={svgSize}
				height={svgSize}
				style={{
					position: 'absolute',
					top: `-${margin}px`,
					left: `-${margin}px`,
					transform: 'rotate(-90deg)'
				}}
			>
				<circle cx={cx} cy={cy} r={r} stroke="var(--vscode-widget-border)" strokeWidth="3" fill="none" />
				<circle cx={cx} cy={cy} r={r} stroke={ringColor} strokeWidth="3" fill="none" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }} />
			</svg>
			<div
				style={{
					width: `${size}px`,
					height: `${size}px`,
					borderRadius: '50%',
					background: bg,
					border,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					color,
					fontWeight: fw,
					fontSize: `${fs}px`,
					flexShrink: 0,
					boxSizing: 'border-box'
				}}
			>
				{initials}
			</div>
		</div>
	);
};

export default Avatar;

interface AvatarFormFieldProps {
	name: string;
	emptyLabel?: string;
}

export const AvatarFormField: FC<AvatarFormFieldProps> = ({ name, emptyLabel = 'N/A' }) => {
	const isEmpty = !name || !name.trim();
	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: '8px',
				width: '100%',
				padding: '6px 8px',
				backgroundColor: 'var(--vscode-input-background)',
				border: '1px solid var(--vscode-input-border)',
				borderRadius: '3px',
				fontSize: '13px',
				color: isEmpty ? '#6c757d' : 'var(--vscode-input-foreground)',
				boxSizing: 'border-box'
			}}
		>
			<Avatar name={name} size={18} />
			<span>{isEmpty ? emptyLabel : name}</span>
		</div>
	);
};

interface AvatarWithNameProps {
	name: string;
	size?: number;
	emptyLabel?: string;
}

export const AvatarWithName: FC<AvatarWithNameProps> = ({ name, size = 20, emptyLabel = 'Unassigned' }) => {
	const isEmpty = !name || !name.trim();
	return (
		<div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
			<Avatar name={name} size={size} />
			<span
				style={{
					color: isEmpty ? '#6c757d' : undefined,
					overflow: 'hidden',
					textOverflow: 'ellipsis',
					whiteSpace: 'nowrap',
					minWidth: 0,
					flex: '1 1 auto',
					display: 'block'
				}}
			>
				{isEmpty ? emptyLabel : name}
			</span>
		</div>
	);
};
