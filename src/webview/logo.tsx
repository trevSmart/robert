import '@radix-ui/themes/styles.css';
import './theme/robert-theme.css';
import { createRoot } from 'react-dom/client';
import { Theme } from '@radix-ui/themes';
import LogoWebview from './components/LogoWebview';

// Get parameters from global variables set by the webview provider
const rebusLogoUri = window.rebusLogoUri || '';
const isLight = document.body.classList.contains('robert-light-theme');

const container = document.getElementById('root');
if (container) {
	const root = createRoot(container);
	root.render(
		<Theme appearance={isLight ? 'light' : 'dark'} accentColor="blue" grayColor="slate">
			<LogoWebview rebusLogoUri={rebusLogoUri} />
		</Theme>
	);
}
