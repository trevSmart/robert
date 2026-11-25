## Unreleased

### Attachments
* Show the files attached to a user story (new **Attachments** tab in Related Records, with its count) and to a defect (new **Attachments** card), for both Jira and Rally
* Each file shows its name, size, author and date, with a preview for images; clicking it opens the file in the browser with your Jira / Rally session. Only links on the configured Jira site / Rally instance are opened

### Jira fields
* User stories and defects get a **Fields** card (Jira only) with the issue's other fields that have a value, such as custom fields from the «Key details» tabs of the Jira issue view (e.g. «Talla» in «Esfuerzo Desarrollo»). Robert used to read only a fixed set of fields
* Accounts that can read the Jira screen configuration (Administer Jira) see the fields grouped in the same tabs as Jira; the rest see them as one list, in the edit screen's order

### UI
* Add a "More actions" menu (⋮) at the right end of the main tab bar with **Settings**, **Open as Editor** (sidebar view only) and **Reload**. The view's title bar menu is not available in an editor tab or in the standalone app, so the settings dialog could not be opened from there. The menu stays pinned to the right, apart from the "…" menu of tabs that do not fit
* Rename **Open in Editor** to **Open as Editor** (`robert.openInEditor`, also in the view title bar)
* Show Robert's logo on its editor tab (light and dark variants) instead of the generic file icon

### Settings
* Add Robert's own settings dialog, shared by the extension and the standalone app (`robert.openSettings`, the gear in the view title bar, `Cmd/Ctrl+,` in the app). It replaces the standalone app's separate Settings window
* In VS Code, choose whether to save to the **Workspace** (default when a folder is open) or **User** settings, like VS Code's Settings editor; values still go to the usual `settings.json` files, and the dialog links to VS Code Settings
* Each setting is saved on its own (checkboxes and selects at once, text on blur / Enter), and the dialog follows changes made elsewhere without overwriting them
* Every setting, including `robert.debugMode` and `robert.showWelcomeAnimation`, can be saved in User or Workspace settings. Settings that can only be saved in User settings would show read-only in Workspace, with **Edit in User**
* Changing the provider, its connection or its API token reloads the data (debounced), in both versions

### Security
* Store the Jira API token and the Rally API key in the OS keychain instead of settings: VS Code `SecretStorage` in the extension, `<userData>/secrets.json` encrypted with `safeStorage` in the app. Credentials are kept per connection (Jira site + email, Rally instance), so workspaces using the same connection share them and they never reach a repository
* Remove the `robert.jiraApiToken` and `robert.rallyApiKey` settings; values left by older versions are moved to the keychain on start and removed from `settings.json`
* Add **Robert: Set API Token** to store the active connection's token from the Command Palette
* The settings dialog never receives credential values, only whether one is stored

## 0.6.9

### Branding
* Remove IBM branding: the extension, views, command category and custom editor are now called "Robert", and the description reads "For internal use only."
* Rally integration headers, the status bar quick summary and generated markdown reports no longer mention IBM
* Remove the IBM logo assets and the `ibm/robert-maintainers` Dependabot reviewers
* **Standalone app**: the appId is now `com.trevsmart.robert` and the profile directory and Keychain item use the name "Robert" (`APP_INTERNAL_NAME` removed). Settings and saved API tokens from previous versions are not carried over and must be entered again; on Windows the app installs alongside the previous one

### Tests
* Exclude `tmp/` from the Vitest run so local scratch copies are not picked up

**Full Changelog**: https://github.com/trevSmart/robert/compare/0.6.8...0.6.9

## 0.6.8

### Settings
* Add the `robert.startupTab` setting (also `ROBERT_STARTUP_TAB`) to choose the tab the main view opens on: `home`, `search`, `portfolio`, `team`, `metrics` or `library`
* Inject the startup tab into the initial HTML so the view starts on it without flashing Home; a provider switch or reload returns to it, and opening a view in an editor tab still restores the tab you were on
* Fall back to Home for unknown values (`resolveStartupSection`); starting on Portfolio shows the sprint list, like a tab click

**Full Changelog**: https://github.com/trevSmart/robert/compare/0.6.7...0.6.8

## 0.6.7

### UI
* Make the `Select` option list subtly translucent (72% opacity, 75% in light themes, 3px blur) so the content behind stays recognisable and options remain legible

**Full Changelog**: https://github.com/trevSmart/robert/compare/0.6.6...0.6.7

## 0.6.6

### UI
* Add a custom `Select` component, styled after the navigation overflow menu, with a translucent option list and enter/exit animations
* Make it an accessible select-only combobox (WAI-ARIA APG): arrow keys, Home/End, Enter/Space, Escape, Tab and type-ahead; the list opens upwards when there is no room below and closes on outside scroll or resize (`selectNavigation`)
* Replace every native select: Portfolio user story filters (project, sprint), Team sprint, Sprint Readiness sprint and the search type selector
* Keep tab and sub-tab bars full width, aligned to the left edge, instead of capping them at the content width

**Full Changelog**: https://github.com/trevSmart/robert/compare/0.6.4...0.6.6

## 0.6.4

### Build
* Pin TypeScript to `~6.0.2`: TypeScript 7 (auto-merged by Dependabot) broke `npm install` because typescript-eslint 8.x only supports TypeScript < 6.1
* Dependabot ignores TypeScript major updates, and the auto-merge workflow now only merges patch and minor updates; majors stay open for review

**Full Changelog**: https://github.com/trevSmart/robert/compare/0.6.3...0.6.4

## 0.6.3

### Navigation
* Load the data a restored view needs, however it was reached: views opened with **Open in Editor** and back/forward history no longer render Portfolio user stories / defects, Team or Metrics empty (`viewDataNeeds`)
* Reselect a restored sprint once iterations arrive, give restored state priority over "open the current sprint on the first Portfolio visit", and re-run a restored search

### UI
* Centre content and navigation bars in a column capped at 1400px so wide editor tabs stay readable

**Full Changelog**: https://github.com/trevSmart/robert/compare/0.6.2...0.6.3

## 0.6.2

### Editing (pilot)
* Edit a user story's estimated hours from the user story form, the first editable field in Robert
* Jira: edits the story's original estimate (`timetracking.originalEstimate`); save with the button or Enter, discard with Escape; the story is reloaded and swapped into every list, and sprint totals are recomputed
* Rally: the field stays read-only (`TaskEstimateTotal` is a roll-up of task estimates) with an explanatory tooltip
* Shared validation between the webview and the extension host (number, 0–1000 h; "1,5" and "8h" accepted)

### Standalone app
* Notify when a new version is available and open the installer download (**Check for Updates…** menu item); publishing a GitHub Release attaches the macOS (arm64, x64) and Windows installers
* Update Electron to 45.4

### Fixes
* Normalise Rally ObjectIDs to strings at the source (`toObjectId`), so the Team dashboard header follows the selected sprint; also normalises favorites and recently viewed items stored by older versions
* Sprint Readiness card: the empty state no longer covers the sprint selector, explains why it is empty, and falls back to the current sprint when no upcoming sprint exists (`resolveReadinessTarget`)
* Load the codicon font correctly inside the webview, so icons such as the favourite and "Open in" buttons no longer render as empty boxes
* Never show the previous provider's branding after switching provider; drop stale preloaded data at the start of each prefetch
* Make the loading indicator slightly smaller and more visible
* Pin `@types/vscode` to 1.105.0 to match `engines.vscode`, so `vsce` can package the VSIX again and the extension keeps installing on Cursor and older VS Code

**Full Changelog**: https://github.com/trevSmart/robert/compare/0.6.1...0.6.2

## 0.6.1

### Standalone desktop app (Electron)
* Run Robert as a standalone desktop app built from the same codebase as the extension: a host layer in `src/standalone/` provides a `vscode` module shim, an Electron-backed webview and a `robert-app://` protocol for the bundle and resources
* Theme variables follow the OS light/dark theme
* Settings window generated from `contributes.configuration`, with API tokens encrypted at rest via `safeStorage`; tokens are never stored in plain text when no OS keychain is available (`ROBERT_*` environment variables are used instead)
* Only edited settings are saved, unset settings show the value they resolve to (including the `ROBERT_*` variable they come from), and a per-field Reset removes an explicit value
* App menu with settings, reload data, back/forward and logs; mouse/trackpad history navigation; external and `mailto:` links open with the OS
* On macOS closing the main window keeps the app running in the Dock (Cmd+Q quits); the app shows as "Robert" with its own icon, also when started from source
* Packaging with electron-builder and `standalone:*` npm scripts; see `docs/STANDALONE.md`

### Settings
* Restore the documented precedence in both versions: explicit settings > `ROBERT_*` environment variables > defaults (`SettingsManager` reads explicit values with `inspect()`), and keep explicit `false` values

### Jira
* Discover tenant-specific custom fields (sprint, story points, flagged, epic link, team) and issue types per site, with the previous IDs as fallback, and clear cached data when the mappings change
* Find sub-tasks with locale-independent JQL and detect bug types by id; add the `robert.jiraBugIssueTypes` setting (`ROBERT_JIRA_BUG_ISSUE_TYPES`) to override them
* Read story points from every candidate field (company- and team-managed projects use different ones)

### Fixes
* Rally: the portfolio project filter matches on the project name
* Collaboration: rebind the HTTP and WebSocket clients to the active provider's user on reload, and ignore callbacks from replaced WebSocket connections
* Library: an open topic no longer stays visible below other views
* macOS app icon follows Apple's template, so it is no longer boxed in a light plate

**Full Changelog**: https://github.com/trevSmart/robert/compare/0.6.0...0.6.1

## 0.6.0

### Jira Cloud
* Add Jira Cloud as a work-tracking provider alongside Rally, selected with the new `robert.provider` setting (`jira` | `rally`)
* Provider facade that routes the UI to the Jira or Rally services, a Jira Cloud REST API v3 client, Jira settings and provider-aware logos
* The collaboration server protocol is unchanged
* Exclude `.env` and local dotfiles from the VSIX

**Full Changelog**: https://github.com/trevSmart/robert/compare/0.5.4...0.6.0

## 0.5.4

### Fixes
* Calendar: sort iterations by start date with a deterministic tie-break, comparing Rally ObjectIDs regardless of their runtime type (avoids "objectId.localeCompare is not a function")

**Full Changelog**: https://github.com/trevSmart/robert/compare/0.5.3...0.5.4

## 0.5.3

* Version bump only, no functional changes

**Full Changelog**: https://github.com/trevSmart/robert/compare/0.5.2...0.5.3

## 0.5.2

### Rally
* Default the Rally instance to eu1 and ignore a trailing slash in the instance URL (it made WSAPI requests return 400)

### Dependencies
* Close the open Dependabot security alerts in the extension and the collaboration server
* Routine Dependabot updates, including Vite 8.3, Vitest 5, Mocha 12, `@vscode/vsce` 4, React 19.3, styled-components 6.6 and vscrui 1.1

**Full Changelog**: https://github.com/trevSmart/robert/compare/0.5.1...0.5.2

## 0.5.1

* Version bump only, no functional changes

**Full Changelog**: https://github.com/trevSmart/robert/compare/0.5.0...0.5.1

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
