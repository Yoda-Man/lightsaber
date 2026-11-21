## MODIFIED Requirements

### Requirement: Load hooks
`main.js` `onLoad(api)` SHALL register the plugin card `lightsaber-card` and the shortcut `lightsaber-open` (Ctrl, Shift, L) that opens the modal `lightsaber-modal`. It SHALL mount the routes only when `api.router` and `api.deps` exist. It SHALL NOT register a tool: the `lightsaber` tool is `lightsaber.js`.

#### Scenario: Disable
- **WHEN** `onDisable(api)` runs
- **THEN** the shortcut `lightsaber-open` is unregistered
- **AND** `onEnable` and `onUnload` only log

### Requirement: Route module loading
`backend/routes.js` and the modules it requires SHALL load with Node built-ins only. `GitAnalyzer` SHALL use the `gitService` passed to `mountRoutes` in `deps`, not a path it guesses.

#### Scenario: Checkout beside core
- **WHEN** a test requires `backend/routes.js` and calls `mountRoutes` with a router
- **THEN** nothing throws and eleven POST routes are added

### Requirement: Route analysis
The routes SHALL reuse the `lightsaber.js` formulas in classes: `HealthScorer` with `hotspotThreshold` from the body (default 40), `ComplexityCalculator`, which counts like `lightsaber.js` and also counts `else if`, and `GitAnalyzer`, which reads the heatmap for `daysToAnalyze` days, filters paths with anchored globs, diffs up to 200 commits and divides strength by the commits it diffed. `find-hotspots` and `coupling-clusters` fetch 200 commits and `full-report` 500.

#### Scenario: Summary
- **WHEN** `full-report` succeeds
- **THEN** `summary` has `totalFiles`, `averageHealth`, `hotspotCount`, `criticalCount` and `healthyCount`
- **AND** with no scored files `averageHealth` is `NaN`, sent as `null`

#### Scenario: Strength
- **WHEN** two commits are diffed and both change `a.js` and `b.js`
- **THEN** the edge strength is 100

## ADDED Requirements

### Requirement: Route scans without a shell
The `find-todos` and `test-coverage` routes SHALL run `grep` and `find` as programs with argument arrays, with the same arguments as `lightsaber.js`, never through a shell.

#### Scenario: Hostile path
- **WHEN** `workspacePath` contains `"; touch "<marker>`
- **THEN** the routes answer and no marker file is created

## REMOVED Requirements

### Requirement: Registered tool
**Reason**: It needed `express` and `node-mocks-http`, which were never declared, and duplicated the `lightsaber` tool.
**Migration**: Use the `find-hotspots` action of `lightsaber.js`.
