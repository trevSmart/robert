declare module 'styled-components' {
	export type FastOmit<T, K extends keyof T> = Omit<T, K>;
}

declare module 'styled-components/dist/types' {
	export interface IStyledComponentBase<_Props = unknown, _Theme = unknown, _Instance = unknown> {}
}
