import type React from 'react';
import { themeColors } from '../../utils/themeColors';

interface Iteration {
	objectId: string;
	name: string;
	startDate: string;
	endDate: string;
	state: string;
	project: string | null;
	_ref: string;
}

interface SprintDetailsFormProps {
	iteration: Iteration;
}

const SprintDetailsForm: React.FC<SprintDetailsFormProps> = ({ iteration }) => {
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
			<h2
				style={{
					fontSize: '16px',
					fontWeight: '600',
					color: themeColors.foreground,
					margin: '0 0 20px 0',
					letterSpacing: '0.5px'
				}}
			>
				Sprint Details
			</h2>

			<div
				style={{
					display: 'grid',
					gridTemplateColumns: '1fr 1fr',
					columnGap: '40px',
					rowGap: '16px'
				}}
			>
				<div>
					<label
						style={{
							display: 'block',
							marginBottom: '4px',
							fontSize: '12px',
							color: themeColors.descriptionForeground
						}}
					>
						Name
					</label>
					<input
						type="text"
						value={iteration.name}
						readOnly
						style={{
							width: '100%',
							padding: '6px 8px',
							backgroundColor: themeColors.inputBackground,
							color: themeColors.inputForeground,
							border: `1px solid ${themeColors.inputBorder}`,
							borderRadius: '3px',
							fontSize: '13px'
						}}
					/>
				</div>

				<div>
					<label
						style={{
							display: 'block',
							marginBottom: '4px',
							fontSize: '12px',
							color: themeColors.descriptionForeground
						}}
					>
						Start Date
					</label>
					<input
						type="text"
						value={iteration.startDate ? new Date(iteration.startDate).toLocaleDateString() : 'N/A'}
						readOnly
						style={{
							width: '100%',
							padding: '6px 8px',
							backgroundColor: themeColors.inputBackground,
							color: themeColors.inputForeground,
							border: `1px solid ${themeColors.inputBorder}`,
							borderRadius: '3px',
							fontSize: '13px'
						}}
					/>
				</div>

				<div>
					<label
						style={{
							display: 'block',
							marginBottom: '4px',
							fontSize: '12px',
							color: themeColors.descriptionForeground
						}}
					>
						State
					</label>
					<input
						type="text"
						value={iteration.state}
						readOnly
						style={{
							width: '100%',
							padding: '6px 8px',
							backgroundColor: themeColors.inputBackground,
							color: themeColors.inputForeground,
							border: `1px solid ${themeColors.inputBorder}`,
							borderRadius: '3px',
							fontSize: '13px'
						}}
					/>
				</div>

				<div>
					<label
						style={{
							display: 'block',
							marginBottom: '4px',
							fontSize: '12px',
							color: themeColors.descriptionForeground
						}}
					>
						End Date
					</label>
					<input
						type="text"
						value={iteration.endDate ? new Date(iteration.endDate).toLocaleDateString() : 'N/A'}
						readOnly
						style={{
							width: '100%',
							padding: '6px 8px',
							backgroundColor: themeColors.inputBackground,
							color: themeColors.inputForeground,
							border: `1px solid ${themeColors.inputBorder}`,
							borderRadius: '3px',
							fontSize: '13px'
						}}
					/>
				</div>
			</div>
		</div>
	);
};

export default SprintDetailsForm;
