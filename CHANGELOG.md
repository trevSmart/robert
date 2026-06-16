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
