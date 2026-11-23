import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled, { css, keyframes } from 'styled-components';
import { isLightTheme } from '../../utils/themeColors';
import { menuPlacement, moveActiveIndex, typeaheadIndex, type MenuPlacement } from '../../utils/selectNavigation';

/**
 * Select: custom replacement for the native <select>, styled after the navigation bar's
 * overflow menu ("…" tabs) with a slightly translucent, blurred option list.
 *
 * - Accessible "select-only combobox" (WAI-ARIA APG): the trigger is a button with
 *   role="combobox"; focus stays on it and the active option is exposed through
 *   aria-activedescendant. Arrows / Home / End / Enter / Space / Escape / Tab and type-ahead.
 * - The option list is portalled to <body> with `position: fixed`, because the webview content
 *   sits inside `overflow: hidden` containers and a transformed (Lenis smooth scroll) ancestor,
 *   which would clip it or break fixed positioning. It closes on outside scroll and resize.
 */

export interface SelectOption<T extends string = string> {
	value: T;
	label: string;
	/** Tooltip; defaults to the label (useful when the label is truncated). */
	title?: string;
}

export interface SelectProps<T extends string = string> {
	value: T;
	options: SelectOption<T>[];
	onChange: (value: T) => void;
	/** Accessible name when there is no associated visible label. */
	ariaLabel?: string;
	/** `default`: bordered dropdown. `inline`: borderless, embedded in another control (e.g. search bar). */
	variant?: 'default' | 'inline';
	/** Max width of the trigger; long labels are truncated with an ellipsis. */
	maxWidth?: string;
	disabled?: boolean;
	id?: string;
}

const TYPEAHEAD_RESET_MS = 500;
/** Duration of the closing animation; the list stays mounted until it ends. */
const MENU_CLOSE_MS = 120;

const menuIn = keyframes`
	from { opacity: 0; transform: translateY(var(--select-menu-shift, -4px)); }
	to   { opacity: 1; transform: translateY(0); }
`;

const menuOut = keyframes`
	from { opacity: 1; transform: translateY(0); }
	to   { opacity: 0; transform: translateY(var(--select-menu-shift, -4px)); }
`;

const Trigger = styled.button<{ $variant: 'default' | 'inline'; $open: boolean }>`
	position: relative;
	display: inline-flex;
	align-items: center;
	min-width: 0;
	max-width: 100%;
	cursor: pointer;
	font-family: inherit;
	text-align: left;
	white-space: nowrap;
	transition:
		border-color 0.15s ease,
		background-color 0.15s ease;

	${({ $variant, $open }) =>
		$variant === 'inline'
			? css`
					height: 100%;
					padding: 8px 28px 8px 12px;
					font-size: 13px;
					background: transparent;
					border: none;
					color: var(--vscode-descriptionForeground);
					&:hover {
						color: var(--vscode-foreground);
					}
				`
			: css`
					padding: 4px 26px 4px 8px;
					font-size: 12px;
					border-radius: 4px;
					background-color: var(--vscode-dropdown-background);
					color: var(--vscode-dropdown-foreground);
					border: 1px solid ${$open ? 'var(--vscode-focusBorder)' : 'var(--vscode-dropdown-border)'};
				`}

	&:focus-visible {
		outline: 1px solid var(--vscode-focusBorder);
		outline-offset: ${({ $variant }) => ($variant === 'inline' ? '-1px' : '0')};
	}

	&:disabled {
		cursor: default;
		opacity: 0.5;
	}
`;

const TriggerLabel = styled.span`
	overflow: hidden;
	text-overflow: ellipsis;
`;

const Chevron = styled.span<{ $open: boolean }>`
	position: absolute;
	right: 8px;
	top: 50%;
	display: flex;
	width: 14px;
	height: 14px;
	pointer-events: none;
	transform: translateY(-50%) rotate(${({ $open }) => ($open ? '180deg' : '0deg')});
	transition: transform 0.15s ease;
`;

const Menu = styled.ul<{ $lightTheme: boolean; $upwards: boolean; $closing: boolean }>`
	--select-menu-shift: ${({ $upwards }) => ($upwards ? '4px' : '-4px')};
	position: fixed;
	z-index: 1000;
	box-sizing: border-box;
	margin: 0;
	padding: 6px 0;
	list-style: none;
	max-width: min(480px, calc(100vw - 16px));
	overflow-y: auto;
	/* Subtly translucent with a light blur: the content behind stays recognisable (shapes,
	   avatar colours) without hurting the options' legibility. A strong blur (e.g. 16px) smears
	   thin text and row lines into a uniform tint, so the list ends up looking opaque. */
	background-color: color-mix(in srgb, var(--vscode-editor-background) ${({ $lightTheme }) => ($lightTheme ? '75%' : '72%')}, transparent);
	backdrop-filter: blur(3px) saturate(140%);
	-webkit-backdrop-filter: blur(3px) saturate(140%);
	border: 1px solid var(--vscode-panel-border);
	border-radius: 6px;
	box-shadow: 0 8px 24px rgba(0, 0, 0, ${({ $lightTheme }) => ($lightTheme ? '0.12' : '0.2')});
	animation: ${({ $closing }) =>
		$closing
			? css`
					${menuOut} ${MENU_CLOSE_MS}ms ease-in forwards
				`
			: css`
					${menuIn} 0.15s ease-out
				`};
	pointer-events: ${({ $closing }) => ($closing ? 'none' : 'auto')};
	outline: none;
`;

const Option = styled.li<{ $selected: boolean; $active: boolean }>`
	padding: 7px 14px;
	font-size: 12px;
	cursor: pointer;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	color: ${({ $selected }) => ($selected ? 'var(--vscode-list-activeSelectionForeground)' : 'var(--vscode-foreground)')};
	background-color: ${({ $selected, $active }) => ($selected ? 'var(--vscode-list-activeSelectionBackground)' : $active ? 'var(--vscode-list-hoverBackground)' : 'transparent')};
	${({ $selected, $active }) =>
		$selected &&
		$active &&
		css`
			box-shadow: inset 0 0 0 1px var(--vscode-focusBorder);
		`}
`;

const ChevronDownIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" width="14" height="14" aria-hidden>
		<path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
	</svg>
);

function Select<T extends string = string>({ value, options, onChange, ariaLabel, variant = 'default', maxWidth, disabled = false, id }: SelectProps<T>) {
	const generatedId = useId();
	const triggerId = id ?? `select-${generatedId}`;
	const listId = `${triggerId}-list`;
	const optionId = (index: number) => `${triggerId}-option-${index}`;

	// `open`: the list is mounted. `closing`: it is playing its exit animation, already closed for
	// the user (no events, aria-expanded false). `expanded` is the logical "open" state.
	const [open, setOpen] = useState(false);
	const [closing, setClosing] = useState(false);
	const expanded = open && !closing;
	const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [activeIndex, setActiveIndex] = useState(-1);
	const [placement, setPlacement] = useState<MenuPlacement | null>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const menuRef = useRef<HTMLUListElement>(null);
	const typeaheadRef = useRef<{ text: string; timer: ReturnType<typeof setTimeout> | null }>({ text: '', timer: null });

	const selectedIndex = options.findIndex(option => option.value === value);
	const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined;

	const openMenu = useCallback(
		(initialIndex?: number) => {
			if (disabled || !options.length) return;
			if (closeTimerRef.current) {
				clearTimeout(closeTimerRef.current);
				closeTimerRef.current = null;
			}
			setActiveIndex(initialIndex ?? (selectedIndex >= 0 ? selectedIndex : 0));
			setClosing(false);
			setPlacement(null);
			setOpen(true);
		},
		[disabled, options.length, selectedIndex]
	);

	const closeMenu = useCallback((refocus: boolean) => {
		if (refocus) triggerRef.current?.focus();
		if (closeTimerRef.current) return;
		// Play the exit animation, then unmount the list.
		setClosing(true);
		closeTimerRef.current = setTimeout(() => {
			closeTimerRef.current = null;
			setOpen(false);
			setClosing(false);
			setPlacement(null);
		}, MENU_CLOSE_MS);
	}, []);

	useEffect(
		() => () => {
			if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
		},
		[]
	);

	const commit = useCallback(
		(index: number) => {
			const option = options[index];
			if (option && option.value !== value) onChange(option.value);
			closeMenu(true);
		},
		[options, value, onChange, closeMenu]
	);

	// Position the list before paint: measure it, then place it below/above the trigger.
	useLayoutEffect(() => {
		if (!open || placement || !triggerRef.current || !menuRef.current) return;
		const trigger = triggerRef.current.getBoundingClientRect();
		const menu = menuRef.current;
		menu.style.minWidth = `${trigger.width}px`;
		setPlacement(menuPlacement({ top: trigger.top, bottom: trigger.bottom, left: trigger.left, width: trigger.width }, menu.scrollHeight, { width: window.innerWidth, height: window.innerHeight }, menu.offsetWidth));
	}, [open, placement]);

	// Keep the active option visible while navigating with the keyboard.
	useEffect(() => {
		if (!expanded || !placement || activeIndex < 0) return;
		document.getElementById(optionId(activeIndex))?.scrollIntoView({ block: 'nearest' });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [expanded, placement, activeIndex]);

	// Close on outside click, on scroll outside the list (the list is fixed and would detach
	// from its trigger), on resize and when the webview loses focus.
	useEffect(() => {
		if (!expanded) return;
		const isInside = (target: EventTarget | null) => target instanceof Node && (triggerRef.current?.contains(target) || menuRef.current?.contains(target));
		const onPointerDown = (event: MouseEvent) => {
			if (!isInside(event.target)) closeMenu(false);
		};
		const onScrollOrWheel = (event: Event) => {
			if (!isInside(event.target)) closeMenu(false);
		};
		const onResize = () => closeMenu(false);
		document.addEventListener('mousedown', onPointerDown);
		document.addEventListener('wheel', onScrollOrWheel, { capture: true, passive: true });
		document.addEventListener('scroll', onScrollOrWheel, true);
		window.addEventListener('resize', onResize);
		window.addEventListener('blur', onResize);
		return () => {
			document.removeEventListener('mousedown', onPointerDown);
			document.removeEventListener('wheel', onScrollOrWheel, { capture: true });
			document.removeEventListener('scroll', onScrollOrWheel, true);
			window.removeEventListener('resize', onResize);
			window.removeEventListener('blur', onResize);
		};
	}, [expanded, closeMenu]);

	useEffect(() => {
		const typeahead = typeaheadRef.current;
		return () => {
			if (typeahead.timer) clearTimeout(typeahead.timer);
		};
	}, []);

	const handleTypeahead = (character: string) => {
		const typeahead = typeaheadRef.current;
		if (typeahead.timer) clearTimeout(typeahead.timer);
		typeahead.text += character;
		typeahead.timer = setTimeout(() => {
			typeahead.text = '';
			typeahead.timer = null;
		}, TYPEAHEAD_RESET_MS);
		const from = expanded ? activeIndex : selectedIndex;
		const match = typeaheadIndex(
			options.map(option => option.label),
			typeahead.text,
			from
		);
		if (match < 0) return;
		if (expanded) setActiveIndex(match);
		else openMenu(match);
	};

	const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
		if (disabled) return;
		const typing = typeaheadRef.current.text.length > 0;
		switch (event.key) {
			case 'ArrowDown':
			case 'ArrowUp':
			case 'Home':
			case 'End': {
				event.preventDefault();
				const action = event.key === 'ArrowDown' ? 'next' : event.key === 'ArrowUp' ? 'previous' : event.key === 'Home' ? 'first' : 'last';
				if (!expanded) {
					// Arrows open on the current option; Home / End open on the first / last one.
					openMenu(action === 'first' || action === 'last' ? moveActiveIndex(selectedIndex, action, options.length) : undefined);
				} else {
					setActiveIndex(current => moveActiveIndex(current, action, options.length));
				}
				return;
			}
			case 'Enter':
			case ' ':
				if (event.key === ' ' && typing) {
					// Space inside a type-ahead sequence ("All sp…") is part of the text.
					event.preventDefault();
					handleTypeahead(' ');
					return;
				}
				event.preventDefault();
				if (expanded) commit(activeIndex);
				else openMenu();
				return;
			case 'Escape':
				if (expanded) {
					event.preventDefault();
					event.stopPropagation();
					closeMenu(true);
				}
				return;
			case 'Tab':
				if (expanded) closeMenu(false);
				return;
			default:
				if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
					event.preventDefault();
					handleTypeahead(event.key);
				}
		}
	};

	const menu =
		open &&
		createPortal(
			<Menu
				ref={menuRef}
				id={listId}
				role="listbox"
				aria-labelledby={triggerId}
				tabIndex={-1}
				$lightTheme={isLightTheme()}
				$upwards={Boolean(placement?.openUpwards)}
				$closing={closing}
				style={
					placement
						? { top: placement.top, left: placement.left, maxHeight: placement.maxHeight }
						: // First (measuring) render: laid out off-screen, before the placement is known.
							{ top: 0, left: 0, visibility: 'hidden' }
				}
			>
				{options.map((option, index) => (
					<Option
						// Index in the key: labels/values coming from Rally (e.g. sprint names) are not guaranteed unique.
						key={`${index}:${option.value}`}
						id={optionId(index)}
						role="option"
						aria-selected={index === selectedIndex}
						title={option.title ?? option.label}
						$selected={index === selectedIndex}
						$active={index === activeIndex}
						// Keep focus on the trigger (it owns aria-activedescendant).
						onMouseDown={event => event.preventDefault()}
						onMouseMove={() => index !== activeIndex && setActiveIndex(index)}
						onClick={() => commit(index)}
					>
						{option.label}
					</Option>
				))}
			</Menu>,
			document.body
		);

	return (
		<>
			<Trigger
				ref={triggerRef}
				id={triggerId}
				type="button"
				role="combobox"
				aria-haspopup="listbox"
				aria-expanded={expanded}
				aria-controls={expanded ? listId : undefined}
				aria-activedescendant={expanded && activeIndex >= 0 ? optionId(activeIndex) : undefined}
				aria-label={ariaLabel}
				disabled={disabled}
				title={selectedOption ? (selectedOption.title ?? selectedOption.label) : undefined}
				onClick={() => (expanded ? closeMenu(true) : openMenu())}
				onKeyDown={handleKeyDown}
				$variant={variant}
				$open={expanded}
				style={maxWidth ? { maxWidth } : undefined}
			>
				<TriggerLabel>{selectedOption?.label ?? ''}</TriggerLabel>
				<Chevron $open={expanded}>
					<ChevronDownIcon />
				</Chevron>
			</Trigger>
			{menu}
		</>
	);
}

export default Select;
