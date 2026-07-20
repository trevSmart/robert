## 0.5.0

### Favorites
* Replace pinned items with a favorites system (`FavoriteButton`, `FavoritesContext`, `FavoritesMessageHandler`, `FavoriteItem`)
* Migrate legacy pinned items to favorites on upgrade so existing pins are not lost
* Show favorites alongside Recently Viewed on Home via `RallyItemList`
* Add favorite actions on detail headers (user stories, defects, sprints) via `TitleActions`
* Wire favorites through Portfolio, Search, Calendar, and detail forms (replacing pin UI end-to-end)

### Navigation
* Return to Home when backing out of a detail opened from Home favorites, recents, or the Home calendar (track `detailOriginSection`; do not leave users on Portfolio)
* Add `peekBack` on navigation history and make the back arrow pop/replace history instead of stacking duplicate entries
* Guard portfolio screen normalizations so Home calendar user-story loads do not rewrite the current screen
* Always release `ResizableDescription` drag listeners on unmount when screens remount

### Forms & entity detail
* Fetch and show Rally `BlockedReason` on defects and user stories (`BlockedReasonBanner` on forms; indicator in user-stories table)
* Parse and render Rally revision descriptions as structured, color-coded field changes (`RevisionDescription` + `parseRevisionDescription`) on the user story timeline
* Add `EntityRefFormField` for sprint references on Defect and UserStory forms (badge + value, with scalable entity icons)
* Show `EntityTypeBadge` in `ScreenHeader` and Search results for consistent entity type representation
* Extract shared theme helpers (`themeColors`) for schedule-state and light/dark accent colors
* Use a resizable description field on Defect and UserStory forms
* Tighten form header margins and schedule-state typography

### UI polish
* Align sprint row styling and font weight in `RallyItemList`
* Reduce CollapsibleCard SVG icon size for clearer alignment
* Fix Calendar day/sprint tooltips sticking when the cursor leaves a cell through a sprint bar

**Full Changelog**: https://github.com/trevSmart/robert/compare/0.4.2...0.5.0

## 0.4.2

### Navigation
* Add browser-like back and forward commands (`robert.goBack` / `robert.goForward`) with Alt+Left / Alt+Right keybindings
* Keep navigation history in sync when multiple webview panels are open (target the correct panel)
* Reset selected iteration state when an iteration ID cannot be resolved

### UI
* Make table headers more responsive (flexible layout, alignment, overflow) across Defects, Tasks, Test Cases, and User Stories tables

**Full Changelog**: https://github.com/trevSmart/robert/compare/0.4.1...0.4.2

## 0.4.1

### Recently Viewed & Pinned
* Introduce `RallyItemList` for Recently Viewed and Pinned items on Home (replaces `RecentlyViewedList`)
* Add pin actions with `PinButton`, `PinnedContext`, `PinnedItemsMessageHandler`, and `TitleActions` on detail headers
* Keep Recently Viewed history separate from pinned items
* Switch “Open in Rally” to a Codicon globe icon with clearer hover affordance

### Cache & data freshness
* Add `CacheManager.getWithMeta` to return cache entries with timestamp and TTL metadata
* Stamp and clear update timestamps on `rallyData` so Rally services can check freshness before serving cached results

### Charts
* Show full sprint names on the Hours History chart x-axis (Team member detail) and clarify total vs sprint-total hours

**Full Changelog**: https://github.com/trevSmart/robert/compare/0.4.0...0.4.1

## 0.4.0

### Recently Viewed (#263)
* Add a Recently Viewed list on Home for user stories, defects, and sprints, with pin and remove actions (persisted in extension storage)
* Add a `compact` mode to `CollapsibleCard` and use it for the Recently Viewed list (tighter padding, full-width hover rows)
* Split formatted ID and name in Recently Viewed rows for clearer scanning
* When opening a Recently Viewed sprint that is not yet in the loaded iterations list, reload iterations and auto-select that sprint once available

### User story timeline (#263)
* Add a collapsible revision Timeline on user story detail with proportional State and Blocked tracks, week guides, and sprint-start markers
* Lazy-load revision history when the Timeline card is expanded; fetch `CreationDate` as the timeline zero point
* Pair consecutive blocked events correctly when computing blocked duration on the revision timeline

### Navigation & Rally (#263)
* Add an “Open in Rally” button on user story headers
* Add a view-title Settings command (`robert.openSettings`) that opens VS Code settings filtered to this extension; reorder sidebar actions (Open in Editor, Settings, Reload)
* Encode and validate Rally “Open in Rally” URLs so only `http`/`https` schemes are opened

### UI & UX polish (#263)
* Adopt Inter across the webview (without breaking Codicon glyphs) and lighten typography weights across tables and forms
* Preserve Rally description HTML formatting (sanitize in the webview with DOMPurify); support Cmd/Ctrl+A to select the description
* Localize the status-bar quick pick to English
* Show member hours against the full sprint total in the Team member hours-history chart

**Full Changelog**: https://github.com/trevSmart/robert/compare/0.3.11...0.4.0

## 0.3.11

### Fixes
* Load the complete set of sprint user stories for assignee hours (#260): skip the incomplete progressive cache for Iteration-filtered queries and paginate all API pages so sprint detail and team views show full `TaskEstimateTotal` hours

### Tooling
* Align `@types/vscode` with `engines.vscode` and pin TypeScript to 6.0.x so packaging with `vsce` succeeds

**Full Changelog**: https://github.com/trevSmart/robert/compare/0.3.10...0.3.11

## 0.3.8

### Team
* Add a Team member detail view, reachable from the Team section, showing identity (display name, username, email), a completion donut chart, and an hours-breakdown bar chart
* Add an assigned-hours history chart for the last 6 sprints in the member detail view
* Remove the progress ring around the avatar in the member detail view
* Remove the hover lift effect on team cards
* Two-phase Team loading: render active members immediately, then load the historical roster (last 6 sprints) with a dedicated section spinner
* Lazy-load member username/email via a targeted query so both fields always show
* Index users by both display name and username for more robust member lookup

### Performance & refactor
* Parallelize per-sprint queries in `getRecentTeamMembers`
* `getAllTeamMembersProgress` now returns a progress map plus the derived member list
* Cache hit for `getUserStories` when filtering by iteration objectId
* Optimize chart components for performance and UX
* Fix legend item formatting in `StateDistributionPie`

**Full Changelog**: https://github.com/trevSmart/robert/compare/0.3.6...0.3.8
