import { createRoot } from 'react-dom/client';
import LogoWebview from './components/LogoWebview';

// Get parameters from global variables set by the webview provider
const rebusLogoUri = window.rebusLogoUri || '';

const container = document.getElementById('root');
if (container) {
	const root = createRoot(container);
	root.render(<LogoWebview rebusLogoUri={rebusLogoUri} />);
}
