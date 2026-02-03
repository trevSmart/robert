import { themeColors } from '../../utils/themeColors';

class CollapsibleCard extends HTMLElement {
	private shadow: ShadowRoot;
	private collapsed: boolean = false;
	private contentDiv: HTMLDivElement | null = null;
	private chevronDiv: HTMLDivElement | null = null;
	private headerDiv: HTMLDivElement | null = null;

	static get observedAttributes() {
		return ['title', 'default-collapsed', 'background-color'];
	}

	constructor() {
		super();
		this.shadow = this.attachShadow({ mode: 'open' });
		this.collapsed = this.hasAttribute('default-collapsed');
	}

	connectedCallback() {
		this.render();
		this.attachEventListeners();
		this.updateCollapsedState();
	}

	attributeChangedCallback(name: string, oldValue: string, newValue: string) {
		if (oldValue !== newValue) {
			// If shadow DOM hasn't been rendered yet, render() will be called in connectedCallback
			if (!this.shadow.firstChild) {
				return;
			}

			// Update only the affected elements instead of re-rendering entire DOM
			switch (name) {
				case 'title':
					this.updateTitle(newValue);
					break;
				case 'background-color':
					this.updateBackgroundColor();
					break;
				case 'default-collapsed':
					this.collapsed = this.hasAttribute('default-collapsed');
					this.updateCollapsedState();
					break;
			}
		}
	}

	private getBackgroundColor(): string {
		return this.getAttribute('background-color') || 'rgba(0, 0, 0, 0.1)';
	}

	private updateTitle(title: string) {
		const titleElement = this.shadow.querySelector('.title');
		if (titleElement) {
			titleElement.textContent = title || 'Collapsible Card';
		}
	}

	private updateBackgroundColor() {
		const backgroundColor = this.getBackgroundColor();
		const host = this.shadow.host as HTMLElement;
		if (host) {
			host.style.setProperty('--collapsible-card-bg', backgroundColor);
		}
	}

	private toggleCollapsed() {
		this.collapsed = !this.collapsed;
		this.updateCollapsedState();
	}

	private updateCollapsedState() {
		if (this.contentDiv && this.chevronDiv) {
			if (this.collapsed) {
				this.contentDiv.style.maxHeight = '0';
				this.contentDiv.style.opacity = '0';
				this.contentDiv.style.paddingTop = '0';
				this.contentDiv.style.paddingBottom = '0';
				this.chevronDiv.style.transform = 'rotate(-90deg)';
			} else {
				this.contentDiv.style.maxHeight = '2000px'; //TODO necessari?
				this.contentDiv.style.opacity = '1';
				this.contentDiv.style.paddingTop = '16px';
				this.contentDiv.style.paddingBottom = '16px';
				this.chevronDiv.style.transform = 'rotate(0deg)';
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
					--collapsible-card-bg: ${this.getBackgroundColor()};
				}

				.container {
					background-color: var(--collapsible-card-bg);
					border: 1px solid var(--vscode-panel-border);
					border-radius: 6px;
					overflow: hidden;
					backdrop-filter: blur(4px);
				}

				.header {
					display: flex;
					align-items: center;
					padding: 12px 16px;
					background-color: ${themeColors.backgroundHover};
					cursor: pointer;
					user-select: none;
					border-bottom: 1px solid ${themeColors.border};
				}

				.header:hover {
					background-color: ${themeColors.backgroundHover};
					opacity: 0.95;
				}

				.chevron {
					margin-right: 10px;
					transition: transform 0.25s ease;
					transform: ${this.collapsed ? 'rotate(-90deg)' : 'rotate(0deg)'};
					display: flex;
					align-items: center;
					justify-content: center;
					width: 16px;
					height: 16px;
					color: ${themeColors.text};
					flex-shrink: 0;
				}

				.title {
					font-size: 13.2px;
					font-weight: 300;
					color: ${themeColors.text};
					margin: 0;
					flex: 1;
				}

				.content {
					padding-left: 16px;
					padding-right: 16px;
					padding-top: ${this.collapsed ? '0' : '16px'};
					padding-bottom: ${this.collapsed ? '0' : '16px'};
					max-height: ${this.collapsed ? '0' : '2000px'};
					opacity: ${this.collapsed ? '0' : '1'};
					overflow: hidden;
					transition: max-height 0.3s ease, opacity 0.25s ease, padding-top 0.3s ease, padding-bottom 0.3s ease;
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
