import { FC, useCallback, useMemo } from 'react';
import { getVsCodeApi } from '../../utils/vscodeApi';
import { useProvider } from '../../utils/providerState';

interface OpenInJiraButtonProps {
	objectId: string;
	artifactType?: string;
}

const OpenInJiraButton: FC<OpenInJiraButtonProps> = ({ objectId, artifactType = 'userstory' }) => {
	const vscode = useMemo(() => getVsCodeApi(), []);
	const { label } = useProvider();

	const handleClick = useCallback(() => {
		if (!vscode) return;

		vscode.postMessage({
			command: 'openInJira',
			objectId,
			artifactType
		});
	}, [vscode, objectId, artifactType]);

	return (
		<button
			type="button"
			onClick={handleClick}
			title={`Open in ${label}`}
			aria-label={`Open in ${label}`}
			style={{
				display: 'inline-flex',
				verticalAlign: 'middle',
				alignItems: 'center',
				justifyContent: 'center',
				padding: '4px',
				backgroundColor: 'transparent',
				color: 'var(--vscode-descriptionForeground)',
				border: 'none',
				borderRadius: '3px',
				cursor: 'pointer',
				opacity: 0.7
			}}
			onMouseEnter={e => {
				e.currentTarget.style.backgroundColor = 'var(--vscode-toolbar-hoverBackground)';
				e.currentTarget.style.opacity = '1';
			}}
			onMouseLeave={e => {
				e.currentTarget.style.backgroundColor = 'transparent';
				e.currentTarget.style.opacity = '0.7';
			}}
		>
			<span
				className="codicon codicon-globe"
				style={{
					fontSize: '16px',
					lineHeight: 1,
					display: 'inline-flex',
					alignItems: 'center',
					justifyContent: 'center',
					width: '20px',
					height: '20px'
				}}
			/>
		</button>
	);
};

export default OpenInJiraButton;
