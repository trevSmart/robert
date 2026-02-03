import type React from 'react';
import { themeColors } from '../../utils/themeColors';

interface Iteration {
	objectId: string;
	name: string;
	startDate: string;
	endDate: string;
	state: string;
	project: string | null;
	taskEstimateTotal?: number;
	_ref: string;
}

interface SprintDetailsFormProps {
	iteration: Iteration;
}

const SprintDetailsForm: React.FC<SprintDetailsFormProps> = ({ iteration }) => {
	return (
		<div
			style={{
				width: '100%',
				boxSizing: 'border-box',
				display: 'grid',
				gridTemplateColumns: '1fr 1fr',
				columnGap: '20px',
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
						backgroundColor: 'var(--vscode-editor-background)',
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
						backgroundColor: 'var(--vscode-editor-background)',
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
						backgroundColor: 'var(--vscode-editor-background)',
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
						backgroundColor: 'var(--vscode-editor-background)',
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
					Total Hours
				</label>
				<input
					type="text"
					value={iteration.taskEstimateTotal !== undefined ? `${iteration.taskEstimateTotal}h` : 'N/A'}
					readOnly
					style={{
						width: '100%',
						padding: '6px 8px',
						backgroundColor: 'var(--vscode-editor-background)',
						color: themeColors.inputForeground,
						border: `1px solid ${themeColors.inputBorder}`,
						borderRadius: '3px',
						fontSize: '13px'
					}}
				/>
			</div>
		</div>
	);
};

export default SprintDetailsForm;
