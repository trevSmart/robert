import type React from 'react';
import { useEffect, useState } from 'react';
import { Button } from 'vscrui';

interface ProgressBarProps {
	initialProgress?: number;
	onProgressChange?: (progress: number) => void;
	onSaveState?: (state: { currentProgress: number }) => void;
}

const ProgressBarComponent: React.FC<ProgressBarProps> = ({ initialProgress = 0, onProgressChange, onSaveState }) => {
	const [progress, setProgress] = useState(initialProgress);
	const [isRunning, setIsRunning] = useState(false);
	const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

	useEffect(() => {
		setProgress(initialProgress);
	}, [initialProgress]);

	const updateProgress = (newProgress: number) => {
		setProgress(newProgress);
		onProgressChange?.(newProgress);
		onSaveState?.({ currentProgress: newProgress });
	};

	const toggleProgress = () => {
		if (isRunning) {
			// Stop progress
			if (intervalId) {
				clearInterval(intervalId);
				setIntervalId(null);
			}
			setIsRunning(false);
		} else {
			// Start progress
			if (intervalId) {
				clearInterval(intervalId);
			}

			const newIntervalId = setInterval(() => {
				setProgress((prevProgress) => {
					const newProgress = prevProgress + Math.random() * 5; // Random increment for demo
					if (newProgress >= 100) {
						clearInterval(newIntervalId);
						setIntervalId(null);
						setIsRunning(false);
						return 100;
					}
					onSaveState?.({ currentProgress: newProgress });
					return newProgress;
				});
			}, 200);

			setIntervalId(newIntervalId);
			setIsRunning(true);
		}
	};

	const resetProgress = () => {
		if (intervalId) {
			clearInterval(intervalId);
			setIntervalId(null);
		}
		setIsRunning(false);
		updateProgress(0);
	};

	const getProgressColor = (progress: number) => {
		if (progress <= 50) {
			// From green to yellow (0% to 50%)
			const ratio = progress / 50;
			const r = Math.round(76 + (255 - 76) * ratio);
			const g = Math.round(175 + (193 - 175) * ratio);
			const b = Math.round(80 + (7 - 80) * ratio);
			return `rgb(${r}, ${g}, ${b})`;
		} else {
			// From yellow to red (50% to 100%)
			const ratio = (progress - 50) / 50;
			const r = Math.round(255 + (255 - 255) * ratio);
			const g = Math.round(193 + (87 - 193) * ratio);
			const b = Math.round(7 + (34 - 7) * ratio);
			return `rgb(${r}, ${g}, ${b})`;
		}
	};

	return (
		<div
			style={{
				margin: '20px 0',
				padding: '20px',
				backgroundColor: '#282828',
				borderRadius: '6px'
			}}
		>
			<div
				style={{
					fontSize: '12px',
					fontWeight: 400,
					color: 'color(srgb 0.8 0.8 0.8 / 0.68)',
					letterSpacing: '0.5px',
					margin: '0 0 8px 0',
					paddingLeft: '7px'
				}}
			>
				Progress Demo
			</div>
			<div
				style={{
					width: '100%',
					height: '20px',
					backgroundColor: 'var(--vscode-input-background)',
					border: '1px solid var(--vscode-input-border)',
					borderRadius: '10px',
					overflow: 'hidden',
					margin: '10px 0',
					position: 'relative'
				}}
			>
				<div
					style={{
						height: '100%',
						background: getProgressColor(progress),
						width: `${progress}%`,
						transition: 'width 0.3s ease, background 0.3s ease',
						borderRadius: '10px'
					}}
				/>
				<div
					style={{
						position: 'absolute',
						top: '50%',
						left: '50%',
						transform: 'translate(-50%, -50%)',
						fontSize: '12px',
						color: 'var(--vscode-foreground)',
						fontWeight: 'bold',
						textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)',
						zIndex: 1
					}}
				>
					{Math.round(progress)}%
				</div>
			</div>
			<div
				style={{
					display: 'flex',
					gap: '10px',
					justifyContent: 'center',
					marginTop: '15px'
				}}
			>
				<Button onClick={toggleProgress}>{isRunning ? 'Stop Progress' : 'Start Progress'}</Button>
				<Button onClick={resetProgress}>Reset</Button>
			</div>
		</div>
	);
};

export default ProgressBarComponent;
