## MODIFIED Requirements

### Requirement: Exported plugin object
`lightsaber.js` SHALL export an object with `name` `lightsaber`, a `description`, `permissions` `['read', 'search']`, a `parameters` map and an async `execute(params = {})` function. It SHALL require YodaMan's `GraphFacts` and `ImpactAnalyzer` from `../backend/infrastructure/`. `package.json` SHALL name `lightsaber.js` as `main`, set version `0.3.0`, require Node `>=24` and declare `yodaman.type` `tool` with `minVersion` `0.3.8`.

#### Scenario: Load the plugin
- **WHEN** a host requires `lightsaber.js` from YodaMan's `plugins/` folder
- **THEN** it gets an object whose `name` is `lightsaber` and whose `execute` is a function
- **AND** loading does not throw, even when `gitService` cannot be found

### Requirement: gitService resolution
At load time the plugin SHALL try to require `../backend/services/gitService` relative to its own folder, then `backend/services/gitService` under `process.cwd()`. If both fail, the `analyze`, `find-hotspots`, `report` and `coupling` actions MUST throw `Cannot load gitService from yodaman. Ensure yodaman/backend/services/gitService.js is accessible.`. `find-todos` and `test-coverage` SHALL still run.

#### Scenario: Copy inside YodaMan core
- **WHEN** the file runs as `core/plugins/lightsaber.js`
- **THEN** it loads `core/backend/services/gitService.js`

#### Scenario: Standalone repository
- **WHEN** neither path has `gitService.js`
- **THEN** `coupling` rejects with the cannot-load message, and `find-todos` and `test-coverage` return results

### Requirement: File filter
Git-based actions SHALL keep a path only if no exclude pattern matches it and it ends in `.js`, `.ts`, `.jsx`, `.tsx`, `.py`, `.java`, `.go`, `.rs`, `.dart` or `.swift`. A pattern SHALL match as git reads a glob: `*` stays inside one path segment, `**` crosses segments, other characters are literal, and the match starts at a segment boundary and runs to the end of the path.

#### Scenario: Non-code file
- **WHEN** the heatmap lists `README.md`
- **THEN** it is dropped

#### Scenario: Unanchored pattern
- **WHEN** the paths are `src/clock.js` and `yarn.lock` and `*.lock` is an exclude pattern
- **THEN** `src/clock.js` is kept and `yarn.lock` is dropped

#### Scenario: Pattern inside a deeper folder
- **WHEN** a path is `pkg/node_modules/q/i.js`
- **THEN** `node_modules/**` drops it

### Requirement: Local execution only
The plugin SHALL work only on the local machine: it reads files, runs git through `gitService`, and runs `grep` and `find` as programs with argument arrays. It MUST NOT make network calls or send workspace data anywhere.

#### Scenario: Any action
- **WHEN** any action runs
- **THEN** no HTTP request or other network call is made

### Requirement: Single-file install
The README SHALL document install as copying `lightsaber.js` to the `plugins/` folder of YodaMan 0.3.8 or later and restarting YodaMan. It SHALL state that YodaMan loads only `lightsaber.js` and that `frontend/`, `backend/`, `main.js` and `plugin.json` are reference files.

#### Scenario: Install
- **WHEN** a user runs `cp lightsaber.js /path/to/yodaman/plugins/lightsaber.js` and restarts YodaMan
- **THEN** the `lightsaber` tool is available to the agent

## ADDED Requirements

### Requirement: Time window
`daysToAnalyze` SHALL set the heatmap window and the commits kept for coupling. It SHALL be at least 1 and default to 90 when it is not a number.

#### Scenario: Custom window
- **WHEN** `execute` is called with `daysToAnalyze: 7`
- **THEN** the heatmap is asked for 7 days and coupling ignores commits older than 7 days

### Requirement: Same file as core
`lightsaber.js` SHALL be byte-identical to YodaMan core's `plugins/lightsaber.js`. A test SHALL fail when the two differ, and skip with a message when no core checkout sits beside this repository.

#### Scenario: Copies drift
- **WHEN** `../core/plugins/lightsaber.js` differs from `lightsaber.js`
- **THEN** `npm test` fails

## REMOVED Requirements

### Requirement: Unused time window parameter
**Reason**: `daysToAnalyze` is now read.
**Migration**: See the Time window requirement.
