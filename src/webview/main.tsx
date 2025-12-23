import { createRoot } from 'react-dom/client';
import MainWebview from './components/MainWebview';

// Get parameters from global variables set by the webview provider
const webviewId = window.webviewId || 'main';
const context = window.context || 'default';
const timestamp = window.timestamp || new Date().toISOString();
const rebusLogoUri = window.rebusLogoUri || '';

const container = document.getElementById('root');
if (container) {
	const root = createRoot(container);
	root.render(<MainWebview webviewId={webviewId} context={context} timestamp={timestamp} rebusLogoUri={rebusLogoUri} />);
} else {
	console.error('[Robert] Failed to find root element for React app');
}
