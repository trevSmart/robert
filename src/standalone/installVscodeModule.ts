import Module from 'node:module';

type ModuleLoader = (request: string, parent: unknown, isMain: boolean) => unknown;

/**
 * Makes `require('vscode')` return the given shim for every module loaded
 * afterwards. Robert's backend is compiled to CommonJS, so hooking
 * `Module._load` is enough to run it outside the VS Code extension host.
 */
export function installVscodeModule(shim: object): void {
	const loader = Module as unknown as { _load: ModuleLoader };
	const originalLoad = loader._load;
	loader._load = function (this: unknown, request: string, parent: unknown, isMain: boolean) {
		if (request === 'vscode') {
			return shim;
		}
		return originalLoad.call(this, request, parent, isMain);
	};
}
