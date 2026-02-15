/// <reference types="react" />

declare global {
	namespace JSX {
		interface IntrinsicElements {
			'collapsible-card': React.DetailedHTMLProps<
				React.HTMLAttributes<HTMLElement> & {
					title?: string;
					'default-collapsed'?: boolean;
					'background-color'?: string;
				},
				HTMLElement
			>;
		}
	}
}

export {};
