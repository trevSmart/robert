// Node.js global types for VS Code extension environment
declare global {
	namespace NodeJS {
		interface Global {
			// Add any global Node.js properties if needed
		}

		interface Process {
			// Add any process properties if needed
		}
	}

	// Node.js globals
	var setImmediate: (callback: (...args: unknown[]) => void, ...args: unknown[]) => NodeJS.Immediate;
	var __dirname: string;
}

export {};