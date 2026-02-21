import React, { FC, RefObject, useState, useEffect } from 'react';
import { type GlobalSearchResultItem } from '../../../types/rally';
import SearchWithTypeFilter, { type SearchType } from '../common/SearchWithTypeFilter';

// Small icons for global search result entity type badges
const SearchResultUserStoryIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '14px', height: '14px', flexShrink: 0 }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 0 1-.657.643 48.39 48.39 0 0 1-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 0 1-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 0 0-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 0 1-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 0 0 .657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 0 1-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 0 0 5.427-.63 48.05 48.05 0 0 0 .582-4.717.532.532 0 0 0-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 0 0 .658-.663 48.422 48.422 0 0 0-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 0 1-.61-.58v0Z"
		/>
	</svg>
);
const SearchResultTaskIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '14px', height: '14px', flexShrink: 0 }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M21.75 6.75a4.5 4.5 0 0 1-4.884 4.484c-1.076-.091-2.264.071-2.95.904l-7.152 8.684a2.548 2.548 0 1 1-3.586-3.586l8.684-7.152c.833-.686.995-1.874.904-2.95a4.5 4.5 0 0 1 6.336-4.486l-3.276 3.276a3.004 3.004 0 0 0 2.25 2.25l3.276-3.276c.256.565.398 1.192.398 1.852Z"
		/>
		<path strokeLinecap="round" strokeLinejoin="round" d="M4.867 19.125h.008v.008h-.008v-.008Z" />
	</svg>
);
const SearchResultTestCaseIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '14px', height: '14px', flexShrink: 0 }}>
		<path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
	</svg>
);
const SearchResultDefectIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '14px', height: '14px', flexShrink: 0 }}>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M12 12.75c1.148 0 2.278.08 3.383.237 1.037.146 1.866.966 1.866 2.013 0 3.728-2.35 6.75-5.25 6.75S6.75 18.728 6.75 15c0-1.046.83-1.867 1.866-2.013A24.204 24.204 0 0 1 12 12.75Zm0 0c2.883 0 5.647.508 8.207 1.44a23.91 23.91 0 0 1-1.152 6.06M12 12.75c-2.883 0-5.647.508-8.208 1.44.125 2.104.52 4.136 1.153 6.06M12 12.75a2.25 2.25 0 0 0 2.248-2.354M12 12.75a2.25 2.25 0 0 1-2.248-2.354M12 8.25c.995 0 1.971-.08 2.922-.236.403-.066.74-.358.795-.762a3.778 3.778 0 0 0-.399-2.25M12 8.25c-.995 0-1.97-.08-2.922-.236-.402-.066-.74-.358-.795-.762a3.734 3.734 0 0 1 .4-2.253M12 8.25a2.25 2.25 0 0 0-2.248 2.146M12 8.25a2.25 2.25 0 0 1 2.248 2.146M8.683 5a6.032 6.032 0 0 1-1.155-1.002c.07-.63.27-1.222.574-1.747m.581 2.749A3.75 3.75 0 0 1 15.318 5m0 0c.427-.283.815-.62 1.155-.999a4.471 4.471 0 0 0-.575-1.752M4.921 6a24.048 24.048 0 0 0-.392 3.314c1.668.546 3.416.914 5.223 1.082M19.08 6c.205 1.08.337 2.187.392 3.314a23.882 23.882 0 0 1-5.223 1.082"
		/>
	</svg>
);

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
}

const SearchSection: FC<SearchSectionProps> = ({ globalSearchTerm, onSearchTermChange, onSearch, globalSearchLoading, globalSearchError, globalSearchResults, onOpenResult, globalSearchHasMore = false, globalSearchLoadingMore = false, onLoadMoreResults, globalSearchTermUsed = '' }) => {
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
					<span key={i} style={{ backgroundColor: 'rgba(255, 165, 0, 0.5)', fontWeight: 600 }}>
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
											fontWeight: 400,
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
									<span style={{ fontWeight: 600, color: 'var(--vscode-foreground)' }}>{highlightMatch(item.formattedId)}</span>
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
									fontWeight: 'normal',
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
