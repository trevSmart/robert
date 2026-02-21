import React, { useState } from 'react';
import { themeColors } from '../../utils/themeColors';

// Chevron icon component
const ChevronDownIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: '14px', height: '14px' }}>
		<path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
	</svg>
);

// Search icon component
const SearchIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '16px', height: '16px' }}>
		<path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
	</svg>
);

export type SearchType = 'all' | 'user-stories' | 'defects' | 'tasks' | 'test-cases';

interface SearchWithTypeFilterProps {
	placeholder?: string;
	value: string;
	onChange: (value: string) => void;
	selectedType: SearchType;
	onTypeChange: (type: SearchType) => void;
	onSearchClick?: () => void;
	onClear?: () => void;
	disableButton?: boolean;
	inputRef?: React.RefObject<HTMLInputElement>;
}

const typeLabels: Record<SearchType, string> = {
	all: 'All',
	'user-stories': 'User Stories',
	defects: 'Defects',
	tasks: 'Tasks',
	'test-cases': 'Test Cases'
};

const typeOptions: SearchType[] = ['all', 'user-stories', 'defects', 'tasks', 'test-cases'];

const SearchWithTypeFilter: React.FC<SearchWithTypeFilterProps> = ({ placeholder = 'Search...', value, onChange, selectedType, onTypeChange, onSearchClick, onClear, disableButton = false, inputRef }) => {
	const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
	const [selectWidth, setSelectWidth] = useState('auto');
	const selectRef = React.useRef<HTMLSelectElement>(null);

	React.useEffect(() => {
		// Measure the width needed for the select based on its content
		if (selectRef.current) {
			const tempSpan = document.createElement('span');
			tempSpan.style.position = 'absolute';
			tempSpan.style.visibility = 'hidden';
			tempSpan.style.whiteSpace = 'nowrap';
			tempSpan.style.fontSize = '13px';
			tempSpan.style.fontWeight = '500';
			tempSpan.style.fontFamily = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
			tempSpan.textContent = typeLabels[selectedType];
			document.body.appendChild(tempSpan);
			const width = tempSpan.getBoundingClientRect().width;
			document.body.removeChild(tempSpan);
			// Add padding for the select element (left + right padding + chevron space)
			const totalWidth = Math.ceil(width + 12 + 12 + 28);
			setSelectWidth(`${totalWidth}px`);
		}
	}, [selectedType]);

	return (
		<div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center', gap: '8px' }}>
			<div
				style={{
					display: 'flex',
					alignItems: 'stretch',
					borderRadius: '4px',
					backgroundColor: themeColors.inputBackground,
					border: `1px solid ${themeColors.inputBorder}`,
					overflow: 'hidden',
					transition: 'border-color 0.15s ease',
					boxShadow: 'none',
					flex: 1
				}}
				onFocus={e => {
					if (e.currentTarget.querySelector('input:focus')) {
						e.currentTarget.style.borderColor = themeColors.focusBorder;
					}
				}}
			>
				{/* Type selector dropdown */}
				<div style={{ position: 'relative', display: 'flex', alignItems: 'center', flexShrink: 0, borderRight: `1px solid ${themeColors.inputBorder}` }}>
					<select
						ref={selectRef}
						value={selectedType}
						onChange={e => onTypeChange(e.target.value as SearchType)}
						style={{
							appearance: 'none',
							backgroundColor: 'transparent',
							border: 'none',
							color: themeColors.descriptionForeground,
							padding: '8px 8px 8px 12px',
							paddingRight: '28px',
							fontSize: '13px',
							fontWeight: 500,
							cursor: 'pointer',
							outline: 'none',
							width: selectWidth,
							transition: 'width 0.2s ease',
							overflow: 'hidden'
						}}
					>
						{typeOptions.map(type => (
							<option key={type} value={type}>
								{typeLabels[type]}
							</option>
						))}
					</select>

					{/* Chevron icon for dropdown */}
					<div
						style={{
							position: 'absolute',
							right: '8px',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							pointerEvents: 'none',
							color: themeColors.descriptionForeground,
							width: '14px',
							height: '14px',
							fontSize: '14px'
						}}
					>
						<ChevronDownIcon />
					</div>
				</div>

				{/* Search input */}
				<input
					ref={inputRef}
					type="text"
					placeholder={placeholder}
					value={value}
					onChange={e => onChange(e.target.value)}
					onKeyDown={e => {
						if (e.key === 'Enter' && value.trim() && onSearchClick) {
							e.preventDefault();
							onSearchClick();
						} else if (e.key === 'Escape' && onClear) {
							e.preventDefault();
							onClear();
						}
					}}
					style={{
						flex: 1,
						backgroundColor: 'transparent',
						border: 'none',
						color: themeColors.foreground,
						padding: '8px 12px',
						fontSize: '13px',
						outline: 'none'
					}}
					onFocus={e => {
						const container = e.currentTarget.parentElement;
						if (container) {
							container.style.borderColor = themeColors.focusBorder;
						}
					}}
					onBlur={e => {
						const container = e.currentTarget.parentElement;
						if (container) {
							container.style.borderColor = themeColors.inputBorder;
						}
					}}
				/>
			</div>

			{/* Search button icon */}
			{onSearchClick && (
				<button
					type="button"
					onClick={onSearchClick}
					disabled={disableButton}
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						width: '32px',
						height: '32px',
						padding: '0',
						backgroundColor: themeColors.buttonBackground,
						border: 'none',
						borderRadius: '4px',
						color: themeColors.buttonForeground,
						cursor: disableButton ? 'not-allowed' : 'pointer',
						opacity: disableButton ? 0.6 : 1,
						transition: 'opacity 0.15s ease',
						flexShrink: 0
					}}
					aria-label="Search"
				>
					<SearchIcon />
				</button>
			)}
		</div>
	);
};

export default SearchWithTypeFilter;
