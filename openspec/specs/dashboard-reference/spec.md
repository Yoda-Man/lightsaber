# Dashboard Reference Specification

## Purpose
The repository keeps a reference design for a richer plugin: a manifest in `plugin.json`, lifecycle hooks in `main.js`, HTTP routes in `backend/`, and React views in `frontend/`. The README says YodaMan loads only `lightsaber.js`, so none of these files runs in YodaMan today. This spec records what the code says it would do.

## Requirements

### Requirement: Reference status
`plugin.json` SHALL name `main.js` as `entry`, while `package.json` names `lightsaber.js` as `main`. The README MUST state that `frontend/`, `backend/`, `main.js` and `plugin.json` are reference files that YodaMan does not load.

#### Scenario: Install
- **WHEN** a user installs the plugin as the README says
- **THEN** only `lightsaber.js` is copied and no route or view is registered

### Requirement: Manifest
`plugin.json` SHALL declare version `0.3.0`, `minYodaManVersion` `0.3.0`, permissions `git:read`, `filesystem:read` and `audit:write`, one `plugins-tab` UI extension using `frontend/HealthDashboard.jsx`, and config keys `hotspotThreshold` (40), `commitLimit` (500), `daysToAnalyze` (90), `enablePulseAnimation` (true) and `excludePatterns`.

#### Scenario: Default config
- **WHEN** a host reads `configSchema`
- **THEN** `excludePatterns` defaults to the same five patterns as `lightsaber.js`

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

### Requirement: HTTP routes
`mountRoutes(router, deps)` SHALL add eleven POST routes under `/api/lightsaber/`: `check-git`, `analyze-git`, `calculate-complexity`, `compute-health`, `find-todos`, `test-coverage`, `find-hotspots`, `coupling-clusters`, `combine-analysis`, `full-report` and `mark-reviewed`. Failing routes SHALL answer 400 with `{ error }`, except `find-todos` and `test-coverage`.

#### Scenario: Scan failure
- **WHEN** the `find-todos` or `test-coverage` route throws
- **THEN** it answers 200 with empty results, `{ todos: [], byFile: {} }` or `{ ratio: 0, testFiles: [], sourceFiles: [], uncoveredFiles: [] }`

### Requirement: Route analysis
The routes SHALL reuse the `lightsaber.js` formulas in classes: `HealthScorer` with `hotspotThreshold` from the body (default 40), `ComplexityCalculator`, which counts like `lightsaber.js` and also counts `else if`, and `GitAnalyzer`, which reads the heatmap for `daysToAnalyze` days, filters paths with anchored globs, diffs up to 200 commits and divides strength by the commits it diffed. `find-hotspots` and `coupling-clusters` fetch 200 commits and `full-report` 500.

#### Scenario: Summary
- **WHEN** `full-report` succeeds
- **THEN** `summary` has `totalFiles`, `averageHealth`, `hotspotCount`, `criticalCount` and `healthyCount`
- **AND** with no scored files `averageHealth` is `NaN`, sent as `null`

#### Scenario: Strength
- **WHEN** two commits are diffed and both change `a.js` and `b.js`
- **THEN** the edge strength is 100

### Requirement: Audit entries
When `deps.auditLog` exists, the `find-hotspots` route SHALL log `{ userAction: 'lightsaber_find_hotspots', plugin: 'lightsaber' }` after it answers, and `mark-reviewed` SHALL log `lightsaber_mark_reviewed` with `filePath` and answer `{ ok: true }`.

#### Scenario: Mark reviewed
- **WHEN** a client posts `{ filePath: 'src/a.js' }` to `mark-reviewed`
- **THEN** the answer is `{ ok: true }` even without an audit log

### Requirement: Combined view data
The `combine-analysis` route SHALL build `nodes` (one per scored file, radius 10, `todoCount` from `byFile` and `testCoverage` set to the overall ratio), `edges` from coupling, `hotspots` with a score below a fixed 40, and `healthMap`.

#### Scenario: Node name
- **WHEN** a scored path is `src/lib/a.js`
- **THEN** the node `id` is the path and `name` is `a.js`

### Requirement: Dashboard flow
`HealthDashboard.jsx` SHALL call `check-git`, `analyze-git` (500 commits, 90 days), `calculate-complexity`, `compute-health`, then `find-todos` and `test-coverage` together, then `combine-analysis`, moving a progress bar from 10 to 100.

#### Scenario: Not a repository
- **WHEN** `check-git` answers `isRepo: false`
- **THEN** the view shows `Not a Git repository.` with a Retry button

### Requirement: One-click checks
`HealthChecks.jsx` SHALL show five buttons: Find TODOs, Test Coverage, Find Hotspots, Coupling Check and Full Report. Each SHALL show a one-line summary or the error. Full Report SHALL download the JSON as `lightsaber-<timestamp>.json`.

#### Scenario: Hotspot check
- **WHEN** the Find Hotspots button succeeds
- **THEN** it shows the hotspot count and the worst path and score

### Requirement: File detail panel
`FileDetailPanel.jsx` SHALL show a file's health badge, four metric bars, up to five coupled files and recommendations by rule: score below 20, score 20 to 39, change above 70 with complexity above 60, coverage below 50, more than 5 TODOs, and cyclomatic complexity above 50.

#### Scenario: History button
- **WHEN** the user clicks History
- **THEN** a browser tab opens `https://github.com/<file path>`, a URL built from the file path alone

### Requirement: Force graph
`ForceGraph.jsx` SHALL draw files as D3 force nodes coloured by status and coupling as links, red above strength 50. It SHALL add a coverage ring, up to five TODO dots, drag and zoom, and a pulse class on critical nodes when `enablePulse` is true.

#### Scenario: Node click
- **WHEN** the user clicks a node
- **THEN** `onNodeClick` gets that node and the detail panel opens

### Requirement: Route scans without a shell
The `find-todos` and `test-coverage` routes SHALL run `grep` and `find` as programs with argument arrays, with the same arguments as `lightsaber.js`, never through a shell.

#### Scenario: Hostile path
- **WHEN** `workspacePath` contains `"; touch "<marker>`
- **THEN** the routes answer and no marker file is created
