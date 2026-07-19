import { themeColors, isLightTheme } from '../../utils/themeColors';

class CollapsibleCard extends HTMLElement {
	private shadow: ShadowRoot;
	private collapsed: boolean = false;
	private contentDiv: HTMLDivElement | null = null;
	private chevronDiv: HTMLDivElement | null = null;
	private headerDiv: HTMLDivElement | null = null;
	private titleElement: HTMLElement | null = null;
	private isInitialized: boolean = false;

	static get observedAttributes() {
		return ['title', 'default-collapsed', 'background-color', 'compact'];
	}

	private isCompact(): boolean {
		return this.hasAttribute('compact');
	}

	private getContentPaddingY(): string {
		return this.isCompact() ? '0' : '16px';
	}

	constructor() {
		super();
		this.shadow = this.attachShadow({ mode: 'open' });
		this.collapsed = this.hasAttribute('default-collapsed');
	}

	connectedCallback() {
		// Re-read here: when created by React, attributes are set after the constructor runs,
		// so `this.collapsed` set in the constructor can be stale by the time we connect.
		this.collapsed = this.hasAttribute('default-collapsed');
		this.render();
		this.attachEventListeners();
		this.updateCollapsedState(false);
		this.isInitialized = true;
	}

	attributeChangedCallback(name: string, oldValue: string, newValue: string) {
		if (oldValue !== newValue && this.isInitialized) {
			// Update only the affected elements instead of re-rendering entire DOM
			switch (name) {
				case 'title':
					this.updateTitle();
					break;
				case 'background-color':
					this.updateBackgroundColor();
					break;
				case 'default-collapsed':
					this.collapsed = this.hasAttribute('default-collapsed');
					this.updateCollapsedState(false);
					break;
			}
		}
	}

	private getBackgroundColor(): string {
		const customBg = this.getAttribute('background-color');
		if (customBg) return customBg;
		// Use lighter color in light theme, darker in dark theme
		return isLightTheme() ? 'rgba(0, 0, 0, 0.01)' : 'rgba(0, 0, 0, 0.1)';
	}

	private updateTitle() {
		if (this.titleElement) {
			const title = this.getAttribute('title') || 'Collapsible Card';
			this.titleElement.textContent = title;
		}
	}

	private updateBackgroundColor() {
		if (this.shadow?.host) {
			const bgColor = this.getBackgroundColor();
			this.shadow.host.style.setProperty('--collapsible-card-bg', bgColor);
		}
	}

	private toggleCollapsed() {
		this.collapsed = !this.collapsed;
		this.updateCollapsedState(true);
		this.dispatchEvent(new CustomEvent('toggle', { detail: { collapsed: this.collapsed }, bubbles: true, composed: true }));
	}

	private updateCollapsedState(animate: boolean = false) {
		if (!this.contentDiv || !this.chevronDiv) return;

		if (this.collapsed) {
			this.chevronDiv.style.transform = 'rotate(-90deg)';
			if (animate) {
				// If max-height is 'none' we need a concrete starting value for the transition
				if (!this.contentDiv.style.maxHeight || this.contentDiv.style.maxHeight === 'none') {
					this.contentDiv.style.overflow = 'hidden';
					this.contentDiv.style.maxHeight = this.contentDiv.scrollHeight + 'px';
				}
				// Two rAFs ensure the browser registers the new max-height before animating to 0
				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						if (this.contentDiv) {
							this.contentDiv.style.maxHeight = '0';
							this.contentDiv.style.opacity = '0';
							this.contentDiv.style.paddingTop = '0';
							this.contentDiv.style.paddingBottom = '0';
						}
					});
				});
			} else {
				this.contentDiv.style.overflow = 'hidden';
				this.contentDiv.style.maxHeight = '0';
				this.contentDiv.style.opacity = '0';
				this.contentDiv.style.paddingTop = '0';
				this.contentDiv.style.paddingBottom = '0';
			}
		} else {
			this.chevronDiv.style.transform = 'rotate(0deg)';
			if (animate) {
				// Measure intrinsic content height while still collapsed (padding = 0)
				const paddingY = this.isCompact() ? 0 : 16;
				const contentHeight = this.contentDiv.scrollHeight;
				const targetHeight = contentHeight + paddingY * 2;
				this.contentDiv.style.overflow = 'hidden';
				this.contentDiv.style.opacity = '1';
				this.contentDiv.style.paddingTop = this.getContentPaddingY();
				this.contentDiv.style.paddingBottom = this.getContentPaddingY();
				this.contentDiv.style.maxHeight = targetHeight + 'px';
				const onTransitionEnd = (e: TransitionEvent) => {
					if (e.propertyName === 'max-height') {
						if (this.contentDiv && !this.collapsed) {
							this.contentDiv.style.maxHeight = 'none';
							this.contentDiv.style.overflow = 'visible';
						}
						this.contentDiv?.removeEventListener('transitionend', onTransitionEnd);
					}
				};
				this.contentDiv.addEventListener('transitionend', onTransitionEnd);
			} else {
				this.contentDiv.style.maxHeight = 'none';
				this.contentDiv.style.overflow = 'visible';
				this.contentDiv.style.opacity = '1';
				this.contentDiv.style.paddingTop = this.getContentPaddingY();
				this.contentDiv.style.paddingBottom = this.getContentPaddingY();
			}
		}
	}

	private attachEventListeners() {
		const header = this.shadow.querySelector('.header');
		if (header) {
			header.addEventListener('click', () => this.toggleCollapsed());
		}
		const actionsSlot = this.shadow.querySelector('slot[name="header-actions"]');
		if (actionsSlot) {
			actionsSlot.addEventListener('click', e => e.stopPropagation());
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
					width: 14px;
					height: 14px;
					color: ${themeColors.text};
					flex-shrink: 0;
				}

				/*
				 * Icon slot, rendered before the title. Slotted content stays in the light DOM,
				 * so global stylesheets (e.g. the codicon font classes) still apply to it —
				 * which is why this is a slot rather than markup built inside the shadow root.
				 * Accepts both codicon spans and inline SVG; the color below makes either
				 * follow the title. display:contents keeps an empty slot from adding any
				 * box or margin to cards that pass no icon.
				 */
				.title-icon {
					display: contents;
				}

				::slotted([slot='title-icon']) {
					display: flex;
					align-items: center;
					justify-content: center;
					margin-right: 8px;
					color: ${themeColors.text};
					flex-shrink: 0;
				}

				.title {
					font-size: 13.2px;
					font-weight: 200;
					color: ${themeColors.text};
					margin: 0;
					flex: 1;
				}

				.content {
					padding-left: ${this.isCompact() ? '0' : '16px'};
					padding-right: ${this.isCompact() ? '0' : '16px'};
					padding-top: ${this.collapsed ? '0' : this.getContentPaddingY()};
					padding-bottom: ${this.collapsed ? '0' : this.getContentPaddingY()};
					max-height: ${this.collapsed ? '0' : 'none'};
					opacity: ${this.collapsed ? '0' : '1'};
					overflow: hidden;
					transition: max-height 0.3s ease, opacity 0.25s ease, padding-top 0.3s ease, padding-bottom 0.3s ease;
				}

				svg {
					width: 14px;
					height: 14px;
				}
			</style>

			<div class="container">
				<div class="header">
					<div class="chevron">
						<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
					</div>
					<slot name="title-icon" class="title-icon"></slot>
					<h3 class="title">${title}</h3>
					<slot name="header-actions"></slot>
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
		this.titleElement = this.shadow.querySelector('.title');
	}
}

// Register the custom element
if (!customElements.get('collapsible-card')) {
	customElements.define('collapsible-card', CollapsibleCard);
}

export default CollapsibleCard;
