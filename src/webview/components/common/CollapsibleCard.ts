import { themeColors } from '../../utils/themeColors';

class CollapsibleCard extends HTMLElement {
	private shadow: ShadowRoot;
	private collapsed: boolean = false;
	private contentDiv: HTMLDivElement | null = null;
	private chevronDiv: HTMLDivElement | null = null;
	private headerDiv: HTMLDivElement | null = null;

	static get observedAttributes() {
		return ['title', 'default-collapsed'];
	}

	constructor() {
		super();
		this.shadow = this.attachShadow({ mode: 'open' });
		this.collapsed = this.hasAttribute('default-collapsed');
	}

	connectedCallback() {
		this.render();
		this.attachEventListeners();
	}

	attributeChangedCallback(name: string, oldValue: string, newValue: string) {
		if (oldValue !== newValue) {
			if (name === 'default-collapsed') {
				this.collapsed = this.hasAttribute('default-collapsed');
			}
			this.render();
		}
	}

	private toggleCollapsed() {
		this.collapsed = !this.collapsed;
		this.updateCollapsedState();
	}

	private updateCollapsedState() {
		if (this.contentDiv && this.chevronDiv && this.headerDiv) {
			if (this.collapsed) {
				this.contentDiv.style.padding = '0';
				this.contentDiv.style.maxHeight = '0';
				this.contentDiv.style.overflow = 'hidden';
				this.chevronDiv.style.transform = 'rotate(-90deg)';
				this.headerDiv.style.borderBottom = 'none';
			} else {
				this.contentDiv.style.padding = '16px';
				this.contentDiv.style.maxHeight = '100%';
				this.contentDiv.style.overflow = 'visible';
				this.chevronDiv.style.transform = 'rotate(0deg)';
				this.headerDiv.style.borderBottom = `1px solid ${themeColors.border}`;
			}
		}
	}

	private attachEventListeners() {
		const header = this.shadow.querySelector('.header');
		if (header) {
			header.addEventListener('click', () => this.toggleCollapsed());
		}
	}

	private render() {
		const title = this.getAttribute('title') || 'Collapsible Card';

		this.shadow.innerHTML = `
			<style>
				:host {
					display: block;
					margin-bottom: 16px;
				}

				.container {
					background-color: ${themeColors.background};
					border: 1px solid ${themeColors.border};
					border-radius: 4px;
					overflow: hidden;
				}

				.header {
					display: flex;
					align-items: center;
					padding: 12px 16px;
					background-color: ${themeColors.backgroundHover};
					border-bottom: ${this.collapsed ? 'none' : `1px solid ${themeColors.border}`};
					cursor: pointer;
					user-select: none;
				}

				.header:hover {
					opacity: 0.9;
				}

				.chevron {
					margin-right: 8px;
					transition: transform 0.2s ease;
					transform: ${this.collapsed ? 'rotate(-90deg)' : 'rotate(0deg)'};
					display: flex;
					align-items: center;
					justify-content: center;
					width: 16px;
					height: 16px;
					color: ${themeColors.text};
				}

				.title {
					font-size: 14px;
					font-weight: 600;
					color: ${themeColors.text};
					margin: 0;
				}

				.content {
					padding: ${this.collapsed ? '0' : '16px'};
					max-height: ${this.collapsed ? '0' : '100%'};
					overflow: ${this.collapsed ? 'hidden' : 'visible'};
					transition: max-height 0.3s ease, padding 0.3s ease;
				}

				svg {
					width: 16px;
					height: 16px;
				}
			</style>

			<div class="container">
				<div class="header">
					<div class="chevron">
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
					</div>
					<h3 class="title">${title}</h3>
				</div>
				<div class="content">
					<slot></slot>
				</div>
			</div>
		`;

		// Cache references after rendering
		this.contentDiv = this.shadow.querySelector('.content');
		this.chevronDiv = this.shadow.querySelector('.chevron');
		this.headerDiv = this.shadow.querySelector('.header');
	}
}

// Register the custom element
if (!customElements.get('collapsible-card')) {
	customElements.define('collapsible-card', CollapsibleCard);
}

export default CollapsibleCard;
