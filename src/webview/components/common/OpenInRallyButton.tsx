import { FC, useCallback, useMemo } from 'react';
import { getVsCodeApi } from '../../utils/vscodeApi';
import { getBackendName } from '../../utils/backendInfo';

interface OpenInRallyButtonProps {
	objectId: string;
	artifactType?: string;
}

const OpenInRallyButton: FC<OpenInRallyButtonProps> = ({ objectId, artifactType = 'userstory' }) => {
	const vscode = useMemo(() => getVsCodeApi(), []);

	const handleClick = useCallback(() => {
		if (!vscode) return;

		vscode.postMessage({
			command: 'openInRally',
			objectId,
			artifactType
		});
	}, [vscode, objectId, artifactType]);

	// Label follows the active backend; the command name stays `openInRally` for compatibility.
	const label = `Open in ${getBackendName('Rally')}`;

	return (
		<button
			type="button"
			onClick={handleClick}
			title={label}
			aria-label={label}
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
			<span className="codicon codicon-globe" style={{ fontSize: '16px', lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px' }} />
		</button>
	);
};

export default OpenInRallyButton;
