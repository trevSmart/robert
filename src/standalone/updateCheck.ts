/**
 * Update notifications for the standalone (Electron) app.
 *
 * The app does not update itself: installers are attached to the GitHub
 * Releases of the repository (see .github/workflows/release-standalone.yml)
 * and this module only checks whether a newer release has an installer for
 * the current platform, then asks the user whether to download it. That works
 * the same on macOS and Windows and does not require code signing.
 *
 * Everything that touches Electron (network, dialogs, shell) is injected, so
 * the logic can be unit tested in plain Node.
 */

export interface GitHubReleaseAsset {
	name: string;
	browser_download_url: string;
}

export interface GitHubRelease {
	tag_name: string;
	html_url: string;
	draft: boolean;
	prerelease: boolean;
	assets: GitHubReleaseAsset[];
}

export interface AvailableUpdate {
	version: string;
	releaseUrl: string;
	downloadUrl: string;
	assetName: string;
}

export type UpdatePromptChoice = 'download' | 'later' | 'skip';

/** globalState key holding the version the user chose to skip. */
export const SKIPPED_VERSION_KEY = 'robert.standalone.skippedUpdateVersion';

/** Installer file extension published for each platform (see electron-builder.yml). */
const INSTALLER_EXTENSIONS: Partial<Record<NodeJS.Platform, string>> = {
	darwin: '.dmg',
	win32: '.exe',
	linux: '.AppImage'
};

const KNOWN_ARCHES = ['arm64', 'x64', 'ia32', 'armv7l', 'universal'];

/** Parses "1.2.3" or "v1.2.3". Pre-release / build suffixes are not supported (and not used by Robert). */
export function parseVersion(version: string): [number, number, number] | undefined {
	const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());
	return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : undefined;
}

/** Negative if a < b, positive if a > b, 0 if equal. Unparseable versions sort lowest. */
export function compareVersions(a: string, b: string): number {
	const pa = parseVersion(a);
	const pb = parseVersion(b);
	if (!pa || !pb) {
		return (pa ? 1 : 0) - (pb ? 1 : 0);
	}
	for (let i = 0; i < 3; i++) {
		if (pa[i] !== pb[i]) {
			return pa[i] - pb[i];
		}
	}
	return 0;
}

/** "owner/repo" from a GitHub repository URL such as https://github.com/owner/repo.git. */
export function githubRepoFromUrl(url: string): string | undefined {
	const match = /github\.com[/:]([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/i.exec(url.trim());
	return match ? `${match[1]}/${match[2]}` : undefined;
}

/**
 * Picks the installer for this platform: the asset built for this CPU
 * architecture when there is one, otherwise a universal or arch-less one.
 */
export function pickInstallerAsset(assets: GitHubReleaseAsset[], platform: NodeJS.Platform, arch: string): GitHubReleaseAsset | undefined {
	const extension = INSTALLER_EXTENSIONS[platform];
	if (!extension) {
		return undefined;
	}
	const installers = assets.filter(asset => asset.name.toLowerCase().endsWith(extension.toLowerCase()));
	const archOf = (name: string) => KNOWN_ARCHES.find(known => new RegExp(`[-_.]${known}[-_.]`, 'i').test(name));
	return installers.find(asset => archOf(asset.name) === arch) ?? installers.find(asset => archOf(asset.name) === 'universal') ?? installers.find(asset => archOf(asset.name) === undefined);
}

/** The newest published, non-prerelease release that is newer than `currentVersion` and has an installer for this platform. */
export function findAvailableUpdate(releases: GitHubRelease[], currentVersion: string, platform: NodeJS.Platform, arch: string): AvailableUpdate | undefined {
	let best: AvailableUpdate | undefined;
	for (const release of releases) {
		if (release.draft || release.prerelease || !parseVersion(release.tag_name)) {
			continue;
		}
		const version = release.tag_name.replace(/^v/, '');
		if (compareVersions(version, currentVersion) <= 0 || (best && compareVersions(version, best.version) <= 0)) {
			continue;
		}
		const asset = pickInstallerAsset(release.assets ?? [], platform, arch);
		if (asset) {
			best = { version, releaseUrl: release.html_url, downloadUrl: asset.browser_download_url, assetName: asset.name };
		}
	}
	return best;
}

export interface UpdateCheckerDeps {
	currentVersion: string;
	platform: NodeJS.Platform;
	arch: string;
	fetchReleases(): Promise<GitHubRelease[]>;
	/** Asks the user what to do with an available update. */
	prompt(update: AvailableUpdate): Promise<UpdatePromptChoice>;
	/** Only used for checks the user started from the menu. */
	showUpToDate(): Promise<void>;
	/** Only used for checks the user started from the menu; automatic checks just log. */
	showError(message: string): Promise<void>;
	openExternal(url: string): Promise<void>;
	state: { get<T>(key: string): T | undefined; update(key: string, value: unknown): Thenable<void> | Promise<void> };
	log(message: string): void;
}

export class UpdateChecker {
	private inFlight: Promise<AvailableUpdate | undefined> | undefined;
	/** Versions already offered during this session by an automatic check ("Later" means "not again until next launch"). */
	private readonly promptedVersions = new Set<string>();
	private timers: Array<ReturnType<typeof setTimeout>> = [];

	constructor(private readonly deps: UpdateCheckerDeps) {}

	/**
	 * Checks for a newer release. Automatic checks stay quiet unless there is an
	 * update the user has not skipped or already seen this session; manual checks
	 * always report the outcome.
	 */
	public check(options: { manual: boolean }): Promise<AvailableUpdate | undefined> {
		if (this.inFlight) {
			return this.inFlight;
		}
		this.inFlight = this.run(options.manual).finally(() => {
			this.inFlight = undefined;
		});
		return this.inFlight;
	}

	/** Schedules automatic checks: one after `initialDelayMs`, then every `intervalMs`. */
	public start(initialDelayMs: number, intervalMs: number): void {
		this.dispose();
		const first = setTimeout(() => {
			void this.check({ manual: false });
			const repeat = setInterval(() => void this.check({ manual: false }), intervalMs);
			this.timers.push(repeat);
		}, initialDelayMs);
		this.timers.push(first);
	}

	public dispose(): void {
		for (const timer of this.timers) {
			clearTimeout(timer);
			clearInterval(timer);
		}
		this.timers = [];
	}

	private async run(manual: boolean): Promise<AvailableUpdate | undefined> {
		const { deps } = this;
		const source = manual ? 'manual' : 'automatic';
		let update: AvailableUpdate | undefined;
		try {
			update = findAvailableUpdate(await deps.fetchReleases(), deps.currentVersion, deps.platform, deps.arch);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			deps.log(`[Robert] ⚠️ Update check (${source}) failed: ${message}`);
			if (manual) {
				await deps.showError(message);
			}
			return undefined;
		}

		if (!update) {
			deps.log(`[Robert] 🔎 Update check (${source}): ${deps.currentVersion} is the latest version`);
			if (manual) {
				await deps.showUpToDate();
			}
			return undefined;
		}

		deps.log(`[Robert] 🆕 Update check (${source}): version ${update.version} is available (${update.assetName})`);
		if (!manual) {
			if (deps.state.get<string>(SKIPPED_VERSION_KEY) === update.version) {
				deps.log(`[Robert] Update ${update.version} was skipped by the user; not prompting`);
				return update;
			}
			if (this.promptedVersions.has(update.version)) {
				return update;
			}
		}

		this.promptedVersions.add(update.version);
		const choice = await deps.prompt(update);
		deps.log(`[Robert] Update ${update.version}: user chose "${choice}"`);
		if (choice === 'download') {
			await deps.openExternal(update.downloadUrl);
		} else if (choice === 'skip') {
			await deps.state.update(SKIPPED_VERSION_KEY, update.version);
		}
		return update;
	}
}
