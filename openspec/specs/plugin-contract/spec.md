# Plugin Contract Specification

## Purpose
Lightsaber is a single-file YodaMan tool plugin in `lightsaber.js`. This capability covers the exported object YodaMan loads, its parameters and defaults, input checks, how it finds YodaMan's `gitService`, how actions are dispatched, and the shared file filter. Packaging lives in `package.json` and install steps in `README.md`.

## Requirements

### Requirement: Exported plugin object
`lightsaber.js` SHALL export an object with `name` `lightsaber`, a `description`, `permissions` `['read', 'search']`, a `parameters` map and an async `execute(params = {})` function. `package.json` SHALL name `lightsaber.js` as `main`, set version `0.3.0`, require Node `>=24` and declare `yodaman.type` `tool` with `minVersion` `0.2.0`.

#### Scenario: Load the plugin
- **WHEN** a host runs `require('lightsaber.js')`
- **THEN** it gets an object whose `name` is `lightsaber` and whose `execute` is a function
- **AND** loading does not throw, even when `gitService` cannot be found

### Requirement: Parameters and defaults
The plugin SHALL declare five parameters: `action` (string, required, one of `analyze`, `find-hotspots`, `find-todos`, `test-coverage`, `coupling`, `report`), `workspacePath` (string, required), `commitLimit` (number, default 500), `daysToAnalyze` (number, default 90) and `excludePatterns` (array).

#### Scenario: Default exclude patterns
- **WHEN** `excludePatterns` is not passed
- **THEN** the patterns `node_modules/**`, `dist/**`, `build/**`, `*.lock` and `package-lock.json` are used

#### Scenario: Default commit limit
- **WHEN** `commitLimit` is not passed
- **THEN** `execute` uses 500

### Requirement: Workspace path check
`execute` MUST throw `workspacePath is required` when `workspacePath` is missing or empty. This check SHALL run before the `gitService` check and before any action runs.

#### Scenario: Missing path
- **WHEN** `execute({ action: 'find-todos' })` is called
- **THEN** it rejects with `workspacePath is required`

### Requirement: gitService resolution
At load time the plugin SHALL try to require `../backend/services/gitService` relative to its own folder, then `backend/services/gitService` under `process.cwd()`. If both fail, `execute` MUST throw `Cannot load gitService from yodaman. Ensure yodaman/backend/services/gitService.js is accessible.` for every action.

#### Scenario: Copy inside YodaMan core
- **WHEN** the file runs as `core/plugins/lightsaber.js`
- **THEN** it loads `core/backend/services/gitService.js`

#### Scenario: Standalone repository
- **WHEN** the file runs from the lightsaber repository and the current folder has no `backend/services/gitService.js`
- **THEN** every action rejects with the cannot-load message, including `find-todos` and `test-coverage`, which do not use git

### Requirement: Action dispatch
`execute` SHALL run the action named by `action`. For any other value it MUST throw `Unknown action: <action>. Valid actions: analyze, find-hotspots, find-todos, test-coverage, coupling, report`.

#### Scenario: Unknown action
- **WHEN** `execute({ action: 'bogus', workspacePath: '/repo' })` is called with `gitService` loaded
- **THEN** it rejects with `Unknown action: bogus. Valid actions: analyze, find-hotspots, find-todos, test-coverage, coupling, report`

### Requirement: File filter
Git-based actions SHALL keep a path only if no exclude pattern matches it and it ends in `.js`, `.ts`, `.jsx`, `.tsx`, `.py`, `.java`, `.go`, `.rs`, `.dart` or `.swift`. Each pattern SHALL become a regular expression by turning `**` into `.*` and `*` into `[^/]*`, tested anywhere in the path, not anchored, with `.` left unescaped.

#### Scenario: Non-code file
- **WHEN** the heatmap lists `README.md`
- **THEN** it is dropped

#### Scenario: Unanchored pattern
- **WHEN** a path is `src/clock.js` and `*.lock` is an exclude pattern
- **THEN** the path is dropped, because `[^/]*.lock` matches `clock`

#### Scenario: Pattern inside a deeper folder
- **WHEN** a path is `packages/app/dist/index.js`
- **THEN** `dist/**` drops it

### Requirement: Unused time window parameter
The plugin SHALL accept `daysToAnalyze` but MUST NOT use it. The change window comes from `gitService.getHeatmapData`, which reads the last 30 days.

#### Scenario: Custom window
- **WHEN** `execute` is called with `daysToAnalyze: 365`
- **THEN** the result is the same as with the default of 90

### Requirement: Local execution only
The plugin SHALL work only on the local machine: it reads files, runs git through `gitService`, and runs `grep` and `find` through the shell. It MUST NOT make network calls or send workspace data anywhere.

#### Scenario: Any action
- **WHEN** any action runs
- **THEN** no HTTP request or other network call is made

### Requirement: Single-file install
The README SHALL document install as copying `lightsaber.js` to YodaMan's `plugins/` folder and restarting YodaMan. It SHALL state that YodaMan loads only `lightsaber.js` and that `frontend/`, `backend/`, `main.js` and `plugin.json` are reference files.

#### Scenario: Install
- **WHEN** a user runs `cp lightsaber.js /path/to/yodaman/plugins/lightsaber.js` and restarts YodaMan
- **THEN** the `lightsaber` tool is available to the agent
