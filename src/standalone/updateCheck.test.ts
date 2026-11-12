import { describe, expect, it, vi } from 'vitest';
import { type AvailableUpdate, compareVersions, findAvailableUpdate, type GitHubRelease, githubRepoFromUrl, pickInstallerAsset, SKIPPED_VERSION_KEY, UpdateChecker, type UpdateCheckerDeps, type UpdatePromptChoice } from './updateCheck';

const asset = (name: string) => ({ name, browser_download_url: `https://example.test/download/${name}` });

const release = (tag: string, assetNames: string[], extra: Partial<GitHubRelease> = {}): GitHubRelease => ({
	tag_name: tag,
	html_url: `https://example.test/releases/${tag}`,
	draft: false,
	prerelease: false,
	assets: assetNames.map(asset),
	...extra
});

const installers = (version: string) => [`Robert-${version}-mac-arm64.dmg`, `Robert-${version}-mac-x64.dmg`, `Robert-${version}-mac-arm64.zip`, `Robert-${version}-win-x64.exe`, `robert-${version}.vsix`];

describe('compareVersions', () => {
	it('compares numerically, ignoring a leading v', () => {
		expect(compareVersions('0.10.0', '0.9.9')).toBeGreaterThan(0);
		expect(compareVersions('v1.2.3', '1.2.3')).toBe(0);
		expect(compareVersions('1.2.3', '1.3.0')).toBeLessThan(0);
	});

	it('sorts unparseable versions lowest', () => {
		expect(compareVersions('nightly', '0.0.1')).toBeLessThan(0);
		expect(compareVersions('0.0.1', 'nightly')).toBeGreaterThan(0);
	});
});

describe('githubRepoFromUrl', () => {
	it('extracts owner/repo', () => {
		expect(githubRepoFromUrl('https://github.com/trevSmart/robert.git')).toBe('trevSmart/robert');
		expect(githubRepoFromUrl('git@github.com:trevSmart/robert.git')).toBe('trevSmart/robert');
		expect(githubRepoFromUrl('https://github.com/trevSmart/robert')).toBe('trevSmart/robert');
		expect(githubRepoFromUrl('https://gitlab.com/a/b')).toBeUndefined();
	});
});

describe('pickInstallerAsset', () => {
	const assets = installers('1.0.0').map(asset);

	it('picks the dmg for this Mac architecture', () => {
		expect(pickInstallerAsset(assets, 'darwin', 'arm64')?.name).toBe('Robert-1.0.0-mac-arm64.dmg');
		expect(pickInstallerAsset(assets, 'darwin', 'x64')?.name).toBe('Robert-1.0.0-mac-x64.dmg');
	});

	it('picks the Windows installer', () => {
		expect(pickInstallerAsset(assets, 'win32', 'x64')?.name).toBe('Robert-1.0.0-win-x64.exe');
	});

	it('does not offer an installer built for another architecture', () => {
		expect(pickInstallerAsset(assets, 'win32', 'arm64')).toBeUndefined();
	});

	it('falls back to universal or arch-less installers', () => {
		expect(pickInstallerAsset([asset('Robert-1.0.0-mac-universal.dmg')], 'darwin', 'arm64')?.name).toBe('Robert-1.0.0-mac-universal.dmg');
		expect(pickInstallerAsset([asset('Robert Setup 1.0.0.exe')], 'win32', 'x64')?.name).toBe('Robert Setup 1.0.0.exe');
	});
});

describe('findAvailableUpdate', () => {
	it('returns the newest release with an installer for this platform', () => {
		const releases = [release('0.7.0', installers('0.7.0')), release('0.8.0', installers('0.8.0')), release('0.6.1', installers('0.6.1'))];
		expect(findAvailableUpdate(releases, '0.6.1', 'darwin', 'arm64')).toEqual({
			version: '0.8.0',
			releaseUrl: 'https://example.test/releases/0.8.0',
			downloadUrl: 'https://example.test/download/Robert-0.8.0-mac-arm64.dmg',
			assetName: 'Robert-0.8.0-mac-arm64.dmg'
		});
	});

	it('ignores releases without installers (e.g. VSIX-only), drafts and pre-releases', () => {
		const releases = [release('0.9.0', ['robert-0.9.0.vsix']), release('1.0.0', installers('1.0.0'), { draft: true }), release('1.1.0', installers('1.1.0'), { prerelease: true }), release('0.7.0', installers('0.7.0'))];
		expect(findAvailableUpdate(releases, '0.6.1', 'win32', 'x64')?.version).toBe('0.7.0');
	});

	it('returns undefined when already on the latest version', () => {
		expect(findAvailableUpdate([release('0.6.1', installers('0.6.1'))], '0.6.1', 'darwin', 'arm64')).toBeUndefined();
	});
});

function createChecker(options: { releases?: GitHubRelease[]; choice?: UpdatePromptChoice; fetchError?: Error } = {}) {
	const store = new Map<string, unknown>();
	const deps = {
		currentVersion: '0.6.1',
		platform: 'darwin' as NodeJS.Platform,
		arch: 'arm64',
		fetchReleases: vi.fn(async () => {
			if (options.fetchError) throw options.fetchError;
			return options.releases ?? [release('0.7.0', installers('0.7.0'))];
		}),
		prompt: vi.fn(async (_update: AvailableUpdate) => options.choice ?? 'later'),
		showUpToDate: vi.fn(async () => undefined),
		showError: vi.fn(async (_message: string) => undefined),
		openExternal: vi.fn(async (_url: string) => undefined),
		state: {
			get: <T>(key: string) => store.get(key) as T | undefined,
			update: async (key: string, value: unknown) => void store.set(key, value)
		},
		log: vi.fn()
	} satisfies UpdateCheckerDeps;
	return { checker: new UpdateChecker(deps), deps, store };
}

describe('UpdateChecker', () => {
	it('opens the installer download when the user chooses Download', async () => {
		const { checker, deps } = createChecker({ choice: 'download' });
		await checker.check({ manual: false });
		expect(deps.openExternal).toHaveBeenCalledWith('https://example.test/download/Robert-0.7.0-mac-arm64.dmg');
	});

	it('remembers a skipped version and stops prompting for it automatically', async () => {
		const { checker, deps, store } = createChecker({ choice: 'skip' });
		await checker.check({ manual: false });
		expect(store.get(SKIPPED_VERSION_KEY)).toBe('0.7.0');

		const again = createChecker();
		again.store.set(SKIPPED_VERSION_KEY, '0.7.0');
		await again.checker.check({ manual: false });
		expect(again.deps.prompt).not.toHaveBeenCalled();
		expect(deps.openExternal).not.toHaveBeenCalled();
	});

	it('still prompts for a skipped version when the user checks manually', async () => {
		const { checker, deps, store } = createChecker();
		store.set(SKIPPED_VERSION_KEY, '0.7.0');
		await checker.check({ manual: true });
		expect(deps.prompt).toHaveBeenCalledTimes(1);
	});

	it('prompts for a newer version even if an older one was skipped', async () => {
		const { checker, deps, store } = createChecker();
		store.set(SKIPPED_VERSION_KEY, '0.6.5');
		await checker.check({ manual: false });
		expect(deps.prompt).toHaveBeenCalledTimes(1);
	});

	it('prompts only once per session for automatic checks after "Later"', async () => {
		const { checker, deps } = createChecker({ choice: 'later' });
		await checker.check({ manual: false });
		await checker.check({ manual: false });
		expect(deps.prompt).toHaveBeenCalledTimes(1);
	});

	it('reports "up to date" and errors only for manual checks', async () => {
		const upToDate = createChecker({ releases: [] });
		await upToDate.checker.check({ manual: false });
		expect(upToDate.deps.showUpToDate).not.toHaveBeenCalled();
		await upToDate.checker.check({ manual: true });
		expect(upToDate.deps.showUpToDate).toHaveBeenCalledTimes(1);

		const failing = createChecker({ fetchError: new Error('offline') });
		await failing.checker.check({ manual: false });
		expect(failing.deps.showError).not.toHaveBeenCalled();
		await failing.checker.check({ manual: true });
		expect(failing.deps.showError).toHaveBeenCalledWith('offline');
	});

	it('shares a check that is already running', async () => {
		const { checker, deps } = createChecker();
		await Promise.all([checker.check({ manual: false }), checker.check({ manual: false })]);
		expect(deps.fetchReleases).toHaveBeenCalledTimes(1);
	});
});
