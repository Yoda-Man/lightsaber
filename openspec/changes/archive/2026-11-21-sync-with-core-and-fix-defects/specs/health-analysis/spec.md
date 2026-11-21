## MODIFIED Requirements

### Requirement: Change data
The `analyze`, `find-hotspots` and `report` actions SHALL call `gitService.getHeatmapData(workspacePath, days)`, where `days` is `daysToAnalyze`, at least 1, or 90 when it is not a number. YodaMan's gitService runs `git log --since=<days> days ago --date=iso-strict --pretty=format:commit%x09%H%x09%an%x09%ad --name-only`. A failure SHALL give an empty list. Paths SHALL pass the file filter, in the heatmap order of change count, highest first.

#### Scenario: Change entry fields
- **WHEN** a file passes the filter
- **THEN** its entry has `path`, `commitCount` (the change count), `changeFrequency`, `lastChange` and `authorCount`
- **AND** `changeFrequency` is `commitCount / maxCount * 100`, where `maxCount` is the highest change count among kept files, or 1 if none

#### Scenario: Git fails
- **WHEN** `getHeatmapData` throws, for example because the folder is not a git repository
- **THEN** the action continues with no files, and `find-hotspots` returns `hotspots: []`, `totalFiles: 0` and `averageHealth: 0`

#### Scenario: Window
- **WHEN** `find-hotspots` runs with `daysToAnalyze: 7`
- **THEN** `getHeatmapData` is called with the workspace and 7

### Requirement: Scored file limit
Only the first 100 change entries SHALL get a complexity estimate and a health score. `totalFiles` SHALL still count every entry that passed the filter.

#### Scenario: Large history
- **WHEN** 150 code files changed in the window
- **THEN** `scores` has 100 keys and `totalFiles` is 150

### Requirement: Complexity estimate
For each scored file the plugin SHALL read `workspacePath/path` as UTF-8 and compute `loc` (non-blank lines not starting with `//` or `#`), `nestingDepth` (the largest leading whitespace divided by 2, rounded down), `cyclomaticComplexity` and `complexityScore` (`cyclomaticComplexity / 200 * 100`). `cyclomaticComplexity` SHALL be 1 plus the matches of the words `if`, `for`, `while`, `case` and `catch`, of `&&` and `||`, and of a ternary `?` that is not part of `?.` or `??`, capped at 200.

#### Scenario: Unreadable file
- **WHEN** the file was deleted since its last commit
- **THEN** its complexity is `{ loc: 0, nestingDepth: 0, cyclomaticComplexity: 0, complexityScore: 0 }`

#### Scenario: Complex churning file
- **WHEN** a file has 150 lines of `if (a && b || c ? d : e) { x?.y ?? z; }` and is the only changed file
- **THEN** its `cyclomaticComplexity` is 200 and it is reported as a hotspot

### Requirement: Find-hotspots output
The `find-hotspots` action SHALL return `hotspots` (all of them), `totalFiles`, `uncoveredCount` (scored files no test reaches), `uncoveredFiles` (the first 20 of them) and `averageHealth`, the rounded mean score of the scored files, or 0 when none were scored.

#### Scenario: Summary
- **WHEN** `find-hotspots` scores three files at 40, 50 and 60
- **THEN** `averageHealth` is 50

### Requirement: Report health fields
The `report` action SHALL return `generatedAt` (ISO time), `workspace` (the given path made absolute), `totalFiles`, `averageHealth`, `hotspotCount` (all hotspots), `hotspots` (first 20), `coupling` and `clusters`.

#### Scenario: Report keys
- **WHEN** `report` succeeds
- **THEN** the result has those eight keys and no `scores`

### Requirement: TODO scan
The `find-todos` action SHALL run `grep -rn -e TODO -e FIXME -e HACK` over `*.js`, `*.ts`, `*.jsx` and `*.tsx` in the workspace, skipping the folders `node_modules`, `dist`, `build`, `.git`, `release` and `coverage`. It SHALL keep the first 500 lines whatever grep's exit code, and return `total`, `byFile` and `lines` (first 100).

#### Scenario: Count per file
- **WHEN** grep prints `/repo/src/a.js:3: // TODO fix`
- **THEN** `byFile` has key `/repo/src/a.js`, the text before the first colon
- **AND** files under `node_modules` are not searched

#### Scenario: No matches
- **WHEN** nothing matches
- **THEN** the result is `{ total: 0, byFile: {}, lines: [] }`

### Requirement: Test file ratio
When the workspace has no knowledge graph, the `test-coverage` action SHALL count test files named `*.test.*` or `*.spec.*` (first 200) and `*.js` source files that are not tests (first 500), both outside `node_modules`. It SHALL return `method: 'file-count-fallback'`, a `note`, `ratio`, `testFiles` and `sourceFiles` as counts.

#### Scenario: Ratio
- **WHEN** a workspace has `app.js` and five test files inside `node_modules`
- **THEN** the result has `testFiles: 0`, `sourceFiles: 1` and `ratio: 0`
- **AND** when there are no source files `ratio` is 0

## ADDED Requirements

### Requirement: Score inputs
The actions SHALL score each file from `changeFrequency`, `complexityScore`, `testCoverage` and `todoCount`. `testCoverage` SHALL be 100 when the knowledge graph names a test that reaches the file, else 0. `todoCount` SHALL be the file's TODO, FIXME and HACK count from the TODO scan, keyed by workspace-relative path. Each score SHALL also carry `coveringTests` and `todoCount`.

#### Scenario: Covered file with TODOs
- **WHEN** the graph says one test covers `a.js` and `a.js` holds two TODO lines
- **THEN** its score has `coveringTests: 1`, `todoCount: 2`, `penalties.test` 0 and `penalties.todo` 1

### Requirement: Graph test coverage
When the workspace has a knowledge graph, the `test-coverage` action SHALL count the graph's source files that pass the file filter and are not tests, and return `method: 'knowledge-graph'`, `sourceFiles`, `coveredFiles`, `uncoveredFiles` (a count), `percentCovered`, `ratio` (equal to `percentCovered`), `leastCoveredHighTraffic` (up to 15 uncovered files sorted by dependents, most first) and a `note`.

#### Scenario: One of two covered
- **WHEN** the graph has `a.js` covered and `b.js`, on which one file depends, uncovered
- **THEN** `percentCovered` is 50 and `leastCoveredHighTraffic` is `[{ file: 'b.js', dependents: 1 }]`

### Requirement: No shell
`find-todos` and `test-coverage` SHALL run `grep` and `find` as programs with argument arrays, never through a shell.

#### Scenario: Path with a double quote
- **WHEN** `workspacePath` contains `"; touch "<marker>`
- **THEN** both actions finish and no marker file is created

## REMOVED Requirements

### Requirement: Complexity regex fault
**Reason**: Fixed. The keywords are matched with one valid pattern, so complexity is no longer zero.
**Migration**: None. Scores and hotspots now reflect complexity.

### Requirement: Score inputs today
**Reason**: Test coverage and TODO counts now reach the score.
**Migration**: See the Score inputs requirement.

### Requirement: Shell commands
**Reason**: Commands no longer go through a shell.
**Migration**: See the No shell requirement.
