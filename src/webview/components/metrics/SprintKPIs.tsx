import React from 'react';

interface SprintKPIsProps {
	averageVelocity: number;
	completedPoints: number;
	wip: number;
	blockedItems: number;
	loading?: boolean;
}

const SprintKPIs: React.FC<SprintKPIsProps> = ({ averageVelocity, completedPoints, wip, blockedItems, loading = false }) => {
	if (loading) {
		return (
			<div
				style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
					gap: '12px',
					marginBottom: '20px'
				}}
			>
				{[...Array(4)].map((_, i) => (
					<div
						key={i}
						style={{
							background: 'var(--vscode-editor-background)',
							borderRadius: '8px',
							padding: '12px',
							textAlign: 'center',
							border: '1px solid var(--vscode-panel-border)'
						}}
					>
						<div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '4px', color: 'var(--vscode-descriptionForeground)' }}>...</div>
						<div style={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground)' }}>Loading...</div>
					</div>
				))}
			</div>
		);
	}

	return (
		<div
			style={{
				display: 'grid',
				gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
				gap: '12px',
				marginBottom: '20px'
			}}
		>
			{/* Average Velocity */}
			<div
				style={{
					background: 'linear-gradient(135deg, #6b7a9a 0%, #7a6b9a 100%)',
					borderRadius: '8px',
					padding: '12px',
					textAlign: 'center',
					color: 'white'
				}}
			>
				<div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '4px' }}>{averageVelocity}</div>
				<div style={{ fontSize: '10px', opacity: 0.9 }}>Avg Velocity (pts)</div>
			</div>

			{/* Completed Points */}
			<div
				style={{
					background: 'linear-gradient(135deg, #9a7a8a 0%, #9a6b7a 100%)',
					borderRadius: '8px',
					padding: '12px',
					textAlign: 'center',
					color: 'white'
				}}
			>
				<div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '4px' }}>{completedPoints}</div>
				<div style={{ fontSize: '10px', opacity: 0.9 }}>Points Completed</div>
			</div>

			{/* Work In Progress */}
			<div
				style={{
					background: 'linear-gradient(135deg, #6b8a9a 0%, #7a9a9a 100%)',
					borderRadius: '8px',
					padding: '12px',
					textAlign: 'center',
					color: 'white'
				}}
			>
				<div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '4px' }}>{wip}</div>
				<div style={{ fontSize: '10px', opacity: 0.9 }}>Work In Progress</div>
			</div>

			{/* Blocked Items */}
			<div
				style={{
					background: blockedItems > 0 ? 'linear-gradient(135deg, #d32f2f 0%, #c62828 100%)' : 'linear-gradient(135deg, #7a9a8a 0%, #8a9a7a 100%)',
					borderRadius: '8px',
					padding: '12px',
					textAlign: 'center',
					color: 'white'
				}}
			>
				<div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '4px' }}>{blockedItems}</div>
				<div style={{ fontSize: '10px', opacity: 0.9 }}>Blocked Items</div>
			</div>
		</div>
	);
};

export default SprintKPIs;
