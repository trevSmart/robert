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
		'collapsible-card-header-actions': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
		}
	}
}

export {};
