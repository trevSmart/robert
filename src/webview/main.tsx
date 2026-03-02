import '@radix-ui/themes/styles.css';
import 'lenis/dist/lenis.css';
import './theme/robert-theme.css';
import { createRoot } from 'react-dom/client';
import { Theme } from '@radix-ui/themes';
import MainWebview from './components/MainWebview';

// Get parameters from global variables set by the webview provider
const webviewId = window.webviewId || 'main';
const context = window.context || 'default';
const timestamp = window.timestamp || new Date().toISOString();
const rebusLogoUri = window.rebusLogoUri || '';
const rallyLogoUri = window.rallyLogoUri || '';

const isLight = document.body.classList.contains('robert-light-theme');

const container = document.getElementById('root');
if (container) {
	const root = createRoot(container);
	root.render(
		<Theme appearance={isLight ? 'light' : 'dark'} accentColor="blue" grayColor="slate">
			<MainWebview webviewId={webviewId} context={context} timestamp={timestamp} _rebusLogoUri={rebusLogoUri} rallyLogoUri={rallyLogoUri} />
		</Theme>
	);
} else {
	console.error('[Robert] Failed to find root element for React app');
}
