// Fix for missing parseAst function in Vite types
declare module 'vite' {
	export function parseAst(code: string, options?: Record<string, unknown>): Record<string, unknown>;
}
