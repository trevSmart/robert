import React, { FC, RefObject, useState, useEffect } from 'react';
import { type GlobalSearchResultItem } from '../../../types/rally';
import SearchWithTypeFilter, { type SearchType } from '../common/SearchWithTypeFilter';
import { UserStoryTypeIcon as SearchResultUserStoryIcon, TaskTypeIcon as SearchResultTaskIcon, TestCaseTypeIcon as SearchResultTestCaseIcon, DefectTypeIcon as SearchResultDefectIcon } from '../common/icons/EntityTypeIcons';

export interface SearchSectionProps {
	globalSearchTerm: string;
	onSearchTermChange: (term: string) => void;
	onSearch: (term: string, searchType: SearchType) => void;
	globalSearchLoading: boolean;
	globalSearchError: string | null;
	globalSearchResults: GlobalSearchResultItem[];
	onOpenResult: (item: GlobalSearchResultItem) => void;
	globalSearchHasMore?: boolean;
	globalSearchLoadingMore?: boolean;
	onLoadMoreResults?: (term: string, searchType: SearchType) => void;
	globalSearchTermUsed?: string;
	onEscapeWhenEmpty?: () => void;
}

const SearchSection: FC<SearchSectionProps> = ({
	globalSearchTerm,
	onSearchTermChange,
	onSearch,
	globalSearchLoading,
	globalSearchError,
	globalSearchResults,
	onOpenResult,
	globalSearchHasMore = false,
	globalSearchLoadingMore = false,
	onLoadMoreResults,
	globalSearchTermUsed = '',
	onEscapeWhenEmpty
}) => {
	const [searchType, setSearchType] = useState<SearchType>('all');
	const searchInputRef = React.useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		// Focus the input when the search section is rendered
		searchInputRef.current?.focus();
	}, []);

	useEffect(() => {
		// Focus the input when search type changes
		searchInputRef.current?.focus();
	}, [searchType]);

	const handleClear = () => {
		onSearchTermChange('');
		searchInputRef.current?.focus();
	};

	// Function to highlight matching text using the searched term, not the live input
	const highlightMatch = (text: string) => {
		if (!globalSearchTermUsed.trim()) return text;

		const regex = new RegExp(`(${globalSearchTermUsed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
		const parts = text.split(regex);

		return parts.map((part, i) => {
			if (regex.test(part)) {
				return (
					<span key={i} style={{ backgroundColor: 'rgba(255, 165, 0, 0.5)', fontWeight: 500 }}>
						{part}
					</span>
				);
			}
			return part;
		});
	};

	return (
		<div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
			<div style={{ flexShrink: 0 }}>
				<SearchWithTypeFilter
					placeholder="Search by name or id"
					value={globalSearchTerm}
					onChange={onSearchTermChange}
					selectedType={searchType}
					onTypeChange={setSearchType}
					onSearchClick={() => onSearch(globalSearchTerm, searchType)}
					onClear={handleClear}
					onEscapeWhenEmpty={onEscapeWhenEmpty}
					disableButton={globalSearchLoading || !globalSearchTerm.trim()}
					inputRef={searchInputRef}
				/>
			</div>

			{globalSearchLoading && (
				<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', flex: 1, minHeight: '200px' }}>
					<div
						style={{
							border: `2px solid var(--vscode-panel-border)`,
							borderTop: `2px solid var(--vscode-progressBar-background)`,
							borderRadius: '50%',
							width: '24px',
							height: '24px',
							animation: 'spin 1s linear infinite'
						}}
					/>
					<div style={{ fontSize: '13px', color: 'var(--vscode-descriptionForeground)' }}>Searching...</div>
				</div>
			)}

			{globalSearchError && !globalSearchLoading && <div style={{ color: 'var(--vscode-errorForeground)', fontSize: '13px' }}>{globalSearchError}</div>}

			{!globalSearchLoading && globalSearchResults.length > 0 && (
				<div
					style={{
						flex: 1,
						minHeight: 0,
						display: 'flex',
						flexDirection: 'column',
						border: '1px solid var(--vscode-panel-border)',
						borderRadius: '6px',
						overflow: 'hidden'
					}}
				>
					<div style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)', padding: '8px 12px', borderBottom: '1px solid var(--vscode-panel-border)', flexShrink: 0 }}>
						{globalSearchResults.length} result{globalSearchResults.length !== 1 ? 's' : ''}
					</div>
					<ul
						style={{
							listStyle: 'none',
							margin: 0,
							padding: 0,
							flex: 1,
							minHeight: 0,
							overflowY: 'scroll'
						}}
					>
						{globalSearchResults.map((item, idx) => (
							<li key={`${item.entityType}-${item.objectId}-${idx}`} style={{ margin: 0, padding: 0, borderBottom: '1px solid var(--vscode-panel-border)' }}>
								<button
									type="button"
									className="search-result-button"
									onClick={() => onOpenResult(item)}
									style={{
										padding: '10px 12px',
										fontSize: '13px',
										display: 'flex',
										alignItems: 'center',
										gap: '8px',
										flexWrap: 'wrap',
										cursor: 'pointer',
										backgroundColor: 'transparent',
										border: 'none',
										width: '100%',
										textAlign: 'left',
										color: 'inherit',
										transition: 'background-color 0.15s ease'
									}}
									onMouseEnter={e => {
										e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)';
									}}
									onMouseLeave={e => {
										e.currentTarget.style.backgroundColor = 'transparent';
									}}
								>
									<span
										style={{
											fontSize: '11.5px',
											fontWeight: 300,
											padding: '5px 6px',
											borderRadius: '8px',
											backgroundColor: 'rgba(128, 128, 128, 0.1)',
											color: 'var(--vscode-descriptionForeground)',
											border: '1px solid var(--vscode-panel-border)',
											textTransform: 'capitalize',
											display: 'inline-flex',
											alignItems: 'center',
											gap: '7px'
										}}
									>
										{item.entityType === 'userstory' && <SearchResultUserStoryIcon />}
										{item.entityType === 'task' && <SearchResultTaskIcon />}
										{item.entityType === 'testcase' && <SearchResultTestCaseIcon />}
										{item.entityType === 'defect' && <SearchResultDefectIcon />}
										{item.entityType === 'userstory' ? 'User Story' : item.entityType}
									</span>
									<span style={{ fontWeight: 500, color: 'var(--vscode-foreground)' }}>{highlightMatch(item.formattedId)}</span>
									<span style={{ color: 'var(--vscode-descriptionForeground)', flex: 1 }}>{highlightMatch(item.name || '\u2014')}</span>
								</button>
							</li>
						))}
					</ul>
					{globalSearchHasMore && (
						<div style={{ textAlign: 'center', padding: '15px', borderTop: '1px solid var(--vscode-panel-border)', flexShrink: 0 }}>
							<button
								onClick={() => onLoadMoreResults?.(globalSearchTerm, searchType)}
								disabled={globalSearchLoadingMore}
								style={{
									padding: '8px 16px',
									backgroundColor: 'var(--vscode-button-background)',
									color: 'var(--vscode-button-foreground)',
									border: 'none',
									borderRadius: '4px',
									cursor: globalSearchLoadingMore ? 'not-allowed' : 'pointer',
									fontWeight: '300',
									opacity: globalSearchLoadingMore ? 0.6 : 1,
									transition: 'opacity 0.15s ease'
								}}
							>
								{globalSearchLoadingMore ? 'Loading...' : 'Load more'}
							</button>
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default SearchSection;
