import { FC, useCallback, useMemo } from 'react';
import { getVsCodeApi } from '../../utils/vscodeApi';

const ExternalLinkIcon = ({ size = '14px' }: { size?: string }) => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: size, height: size }}>
		<path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
	</svg>
);

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

	return (
		<button
			type="button"
			onClick={handleClick}
			title="Open in Rally"
			aria-label="Open in Rally"
			style={{
				display: 'inline-flex',
				verticalAlign: 'middle',
				alignItems: 'center',
				justifyContent: 'center',
				marginLeft: '6px',
				padding: '4px',
				backgroundColor: 'transparent',
				color: 'var(--vscode-descriptionForeground)',
				border: 'none',
				borderRadius: '3px',
				cursor: 'pointer'
			}}
			onMouseEnter={e => {
				e.currentTarget.style.backgroundColor = 'var(--vscode-toolbar-hoverBackground)';
			}}
			onMouseLeave={e => {
				e.currentTarget.style.backgroundColor = 'transparent';
			}}
		>
			<ExternalLinkIcon />
		</button>
	);
};

export default OpenInRallyButton;
