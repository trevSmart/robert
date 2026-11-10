/**
 * Contract test: shared backend code (written against the `vscode` API) must
 * keep working unchanged on top of the standalone shim. If this fails after
 * a change in shared code, the shim in src/standalone/host needs extending.
 */
import * as fs from 'node:fs';
import { afterAll, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(async () => {
	const fs = await import('node:fs');
	const os = await import('node:os');
	const path = await import('node:path');
	const { ConfigurationStore } = await import('./ConfigurationStore.js');
	const { createVscodeShim } = await import('./vscodeShim.js');

	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'robert-shim-contract-'));
	const schema = ConfigurationStore.readSchemaFromManifest(path.resolve(__dirname, '../../../package.json'));
	const config = new ConfigurationStore(path.join(dir, 'settings.json'), schema);
	const logged: string[] = [];
	const shim = createVscodeShim({
		config,
		appName: 'IBM Robert',
		createLogChannel: () =>
			({
				trace: (m: string) => logged.push(m),
				debug: (m: string) => logged.push(m),
				info: (m: string) => logged.push(m),
				warn: (m: string) => logged.push(m),
				error: (m: string) => logged.push(String(m)),
				show: () => undefined,
				clear: () => undefined,
				dispose: () => undefined
			}) as never,
		notify: () => undefined,
		openExternal: async () => true,
		readClipboard: () => '',
		writeClipboard: () => undefined
	});
	return { shim, config, logged, dir };
});

vi.mock('vscode', async () => (await hoisted).shim);

afterAll(async () => {
	fs.rmSync((await hoisted).dir, { recursive: true, force: true });
});

describe('shared code on the standalone vscode shim', () => {
	it('SettingsManager reads and writes settings through the shim', async () => {
		const { config } = await hoisted;
		const { SettingsManager } = await import('../../SettingsManager.js');
		const manager = SettingsManager.getInstance();

		expect(manager.getSettings().provider).toBe('jira');

		await manager.saveSettings({ provider: 'rally', rallyProjectName: 'Team A', collaborationEnabled: true });
		expect(config.getUserValue('robert.provider')).toBe('rally');
		expect(config.getUserValue('robert.collaboration.enabled')).toBe(true);

		const settings = manager.getSettings();
		expect(settings.provider).toBe('rally');
		expect(settings.rallyProjectName).toBe('Team A');
		expect(manager.getSetting('collaborationEnabled')).toBe(true);
	});

	it('ErrorHandler logs to the shim output channel', async () => {
		const { logged } = await hoisted;
		const { ErrorHandler } = await import('../../ErrorHandler.js');
		ErrorHandler.getInstance().logInfo('hello from standalone', 'ContractTest');
		expect(logged.some(line => line.includes('hello from standalone'))).toBe(true);
	});
});
