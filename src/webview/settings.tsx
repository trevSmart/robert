import { createRoot } from 'react-dom/client';
import SettingsWebview from './components/SettingsWebview';

// Get parameters from global variables set by the webview provider
const webviewId = window.webviewId || 'settings';
const context = window.context || 'default';
const timestamp = window.timestamp || new Date().toISOString();
const extensionUri = window.extensionUri || '';

const container = document.getElementById('root');
if (container) {
	const root = createRoot(container);
	root.render(<SettingsWebview webviewId={webviewId} context={context} timestamp={timestamp} extensionUri={extensionUri} />);
}
