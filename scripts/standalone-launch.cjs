#!/usr/bin/env node
/**
 * Launches the standalone (Electron) app from source: `npm run standalone:dev`.
 *
 * On macOS the Dock name, app menu title and Dock icon come from the app
 * bundle's Info.plist, so running the stock `node_modules/electron` binary
 * shows "Electron" with Electron's icon. To look like the real app, this
 * script runs Electron from a cached copy of the bundle renamed to
 * "IBM Robert" with Robert's icon (rebuilt when Electron or the icon change).
 *
 * It also clears ELECTRON_RUN_AS_NODE, which terminals inside VS Code export
 * and which would otherwise make Electron behave as plain Node.
 */
const { execFileSync, spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const ENTRY = path.join(ROOT, 'out', 'src', 'standalone', 'main.js');
const ICON_PNG = path.join(ROOT, 'resources', 'icons', 'robert-logo4.png');
const APP_NAME = 'IBM Robert';
const BUNDLE_ID = 'com.ibm.robert.dev';
const CACHE_DIR = path.join(ROOT, 'node_modules', '.cache', 'robert-standalone');

function log(message) {
	console.log(`[standalone-launch] ${message}`);
}

function ensureMacDevBundle(electronBinary) {
	const sourceApp = path.resolve(electronBinary, '..', '..', '..'); // .../Electron.app
	const targetApp = path.join(CACHE_DIR, `${APP_NAME}.app`);
	const targetBinary = path.join(targetApp, 'Contents', 'MacOS', path.basename(electronBinary));
	const stampFile = path.join(CACHE_DIR, 'stamp.json');

	const electronVersion = require('electron/package.json').version;
	const stamp = JSON.stringify({ electronVersion, iconMtime: fs.statSync(ICON_PNG).mtimeMs, bundleId: BUNDLE_ID });
	if (fs.existsSync(targetBinary) && fs.existsSync(stampFile) && fs.readFileSync(stampFile, 'utf8') === stamp) {
		return targetBinary;
	}

	log(`Preparing "${APP_NAME}.app" dev bundle (Electron ${electronVersion})...`);
	fs.rmSync(targetApp, { recursive: true, force: true });
	fs.mkdirSync(CACHE_DIR, { recursive: true });
	execFileSync('ditto', [sourceApp, targetApp]);

	const plist = path.join(targetApp, 'Contents', 'Info.plist');
	for (const [key, value] of [
		['CFBundleName', APP_NAME],
		['CFBundleDisplayName', APP_NAME],
		['CFBundleIdentifier', BUNDLE_ID]
	]) {
		try {
			execFileSync('/usr/libexec/PlistBuddy', ['-c', `Set :${key} ${value}`, plist]);
		} catch {
			execFileSync('/usr/libexec/PlistBuddy', ['-c', `Add :${key} string ${value}`, plist]);
		}
	}

	// Replace the bundle icon (keeps the CFBundleIconFile name Electron declares).
	const iconFile = execFileSync('/usr/libexec/PlistBuddy', ['-c', 'Print :CFBundleIconFile', plist], { encoding: 'utf8' }).trim();
	const iconset = fs.mkdtempSync(path.join(os.tmpdir(), 'robert-icon-')) + '/robert.iconset';
	fs.mkdirSync(iconset);
	for (const size of [16, 32, 128, 256, 512]) {
		execFileSync('sips', ['-z', String(size), String(size), ICON_PNG, '--out', path.join(iconset, `icon_${size}x${size}.png`)], { stdio: 'ignore' });
		execFileSync('sips', ['-z', String(size * 2), String(size * 2), ICON_PNG, '--out', path.join(iconset, `icon_${size}x${size}@2x.png`)], { stdio: 'ignore' });
	}
	const iconName = iconFile.endsWith('.icns') ? iconFile : `${iconFile}.icns`;
	execFileSync('iconutil', ['-c', 'icns', iconset, '-o', path.join(targetApp, 'Contents', 'Resources', iconName)]);
	fs.rmSync(path.dirname(iconset), { recursive: true, force: true });

	// Editing Info.plist invalidates the bundle seal: re-sign ad hoc so macOS runs it.
	execFileSync('codesign', ['--force', '--deep', '--sign', '-', targetApp], { stdio: 'ignore' });
	fs.writeFileSync(stampFile, stamp);
	return targetBinary;
}

function main() {
	if (!fs.existsSync(ENTRY)) {
		console.error(`[standalone-launch] ${path.relative(ROOT, ENTRY)} not found. Run "npm run standalone:build" first.`);
		process.exit(1);
	}

	const env = { ...process.env };
	delete env.ELECTRON_RUN_AS_NODE;

	const electronBinary = require('electron'); // path to the Electron executable
	let binary = electronBinary;
	if (process.platform === 'darwin') {
		try {
			binary = ensureMacDevBundle(electronBinary);
		} catch (error) {
			log(`Could not prepare the renamed dev bundle, falling back to stock Electron: ${error.message}`);
		}
	}

	const child = spawn(binary, [ENTRY, ...process.argv.slice(2)], { stdio: 'inherit', env });
	child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 0)));
	for (const sig of ['SIGINT', 'SIGTERM']) {
		process.on(sig, () => child.kill(sig));
	}
}

main();
