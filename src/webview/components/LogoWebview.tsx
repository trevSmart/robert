import type React from 'react';
import { LogoCard, LogoContainerFull, LogoDescription, LogoImageSmall, LogoTitle } from './common/styled';

interface LogoWebviewProps {
	rebusLogoUri: string;
}

const LogoWebview: React.FC<LogoWebviewProps> = ({ rebusLogoUri }) => {
	return (
		<LogoContainerFull>
			<LogoCard>
				<LogoImageSmall src={rebusLogoUri} alt="IBM logo" />
				<LogoTitle>Robert</LogoTitle>
				<LogoDescription>Click the activity bar to open the full view.</LogoDescription>
			</LogoCard>
		</LogoContainerFull>
	);
};

export default LogoWebview;
