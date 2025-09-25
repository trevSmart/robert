import type React from 'react';
import { Loader } from 'vscrui';

interface LoadingSpinnerProps {
	show?: boolean;
	message?: string;
	size?: 'small' | 'medium' | 'large';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ show = false, message = 'Loading...' }) => {
	if (!show) {
		return null;
	}

	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				padding: '20px',
				textAlign: 'center'
			}}
		>
			<div style={{ marginBottom: '10px' }}>
				<Loader />
			</div>
			<p
				style={{
					margin: 0,
					fontSize: '13px',
					color: 'var(--vscode-descriptionForeground)'
				}}
			>
				{message}
			</p>
		</div>
	);
};

export default LoadingSpinner;
