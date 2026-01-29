# Changelog

## [0.0.6] - 2026-01-29

### Fixed
- Fixed `Cannot read properties of undefined (reading 'toQueryString')` error in getProjects, getUsers, and getUserStories functions
- The issue occurred when using `reduce()` on an array with a single query element, causing undefined to be passed to the `and()` method
- Now properly handles single-element query arrays by directly assigning the query instead of using reduce

### Changed
- Updated query building logic to check array length before using reduce
- Single queries are now directly assigned: `queryOptions.query = rallyQueries[0]`
- Multiple queries still use reduce with and(): `queryOptions.query = rallyQueries.reduce((a, b) => a.and(b))`
