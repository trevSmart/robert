declare namespace JSX {
	interface IntrinsicElements {
		'collapsible-card': CollapsibleCardElement;
	}
}

interface CollapsibleCardElement
	extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> {
	title?: string;
	'default-collapsed'?: boolean;
}
