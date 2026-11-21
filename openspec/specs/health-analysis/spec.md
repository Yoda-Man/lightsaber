# Health Analysis Specification

## Purpose
Health analysis turns git change history and a text-based complexity estimate into a health score per file. It covers the `analyze`, `find-hotspots`, `find-todos` and `test-coverage` actions and the health part of `report`, all in `lightsaber.js`. The coupling part of `report` is in the change-coupling spec.

## Requirements

### Requirement: Change data
The `analyze`, `find-hotspots` and `report` actions SHALL call `gitService.getHeatmapData(workspacePath)`, which runs `git log --since=30 days ago --date=iso-strict --pretty=format:commit%x09%H%x09%an%x09%ad --name-only`. A failure SHALL give an empty list. Paths SHALL pass the file filter, in the heatmap order of change count, highest first.

#### Scenario: Change entry fields
- **WHEN** a file passes the filter
- **THEN** its entry has `path`, `commitCount` (the change count), `changeFrequency`, `lastChange` and `authorCount`
- **AND** `changeFrequency` is `commitCount / maxCount * 100`, where `maxCount` is the highest change count among kept files, or 1 if none

#### Scenario: Git fails
- **WHEN** `getHeatmapData` throws, for example because the folder is not a git repository
- **THEN** the action continues with no files, and `find-hotspots` returns `hotspots: []`, `totalFiles: 0` and `averageHealth: 0`

### Requirement: Scored file limit
Only the first 100 change entries SHALL get a complexity estimate and a health score. `totalFiles` SHALL still count every entry that passed the filter.

#### Scenario: Large history
- **WHEN** 150 code files changed in the last 30 days
- **THEN** `scores` has 100 keys and `totalFiles` is 150

### Requirement: Complexity estimate
For each scored file the plugin SHALL read `workspacePath/path` as UTF-8 and compute `loc` (non-blank lines not starting with `//` or `#`), `nestingDepth` (the largest leading whitespace divided by 2, rounded down), `cyclomaticComplexity` (1 plus keyword matches, capped at 200) and `complexityScore` (`cyclomaticComplexity / 200 * 100`).

#### Scenario: Unreadable file
- **WHEN** the file was deleted since its last commit
- **THEN** its complexity is `{ loc: 0, nestingDepth: 0, cyclomaticComplexity: 0, complexityScore: 0 }`

### Requirement: Complexity regex fault
The keyword list SHALL be `if`, `for`, `while`, `case`, `catch`, `&&`, `||` and `?`, each wrapped as `\b<keyword>\b`. Building the `?` pattern MUST throw `Invalid regular expression: /\b?\b/g: Nothing to repeat`, so today every scored file gets the all-zero complexity.

#### Scenario: Any readable file
- **WHEN** `analyze` scores a readable source file
- **THEN** its `complexityData` entry is all zeros and its complexity penalty is 0

### Requirement: Health score formula
The health score SHALL be `100 - (cp + xp + tp + dop)`, clamped to 0..100 and rounded. `cp = min(40, changeFrequency / 100 * 40)`, `xp = min(30, complexityScore / 100 * 30)`, `tp = 20` when `testCoverage` is below 50, else 0, and `dop = min(10, todoCount / 10 * 5)`. Missing inputs SHALL count as 0.

#### Scenario: Penalties object
- **WHEN** a score is computed
- **THEN** the result has `score`, `status`, `color`, `label` and `penalties` with `change` and `complexity` rounded, `test` and unrounded `todo`

### Requirement: Status bands
The score SHALL map to a status: 80 or more is `healthy` (`#57c785`), 60 or more is `warning` (`#e6c35c`), 40 or more is `atRisk` (`#ff8c42`), 20 or more is `hotspot` (`#ff4444`), and below 20 is `critical` (`#cc0000`). Each band SHALL carry a label with an emoji.

#### Scenario: Score 40
- **WHEN** the unrounded score is exactly 40
- **THEN** the status is `atRisk`

### Requirement: Score inputs today
The actions SHALL pass only `changeFrequency` and `complexityScore` to the score. So every file MUST take the 20-point test penalty and no TODO penalty, and with zero complexity the lowest possible score is 40.

#### Scenario: Most changed file
- **WHEN** a file has `changeFrequency` 100
- **THEN** its score is 40 with status `atRisk`, and it is not a hotspot

### Requirement: Hotspot selection
A hotspot SHALL be a scored file with a score below 40, given as `{ path, score, status }` and sorted by score, lowest first. The threshold is fixed at 40 in `lightsaber.js`.

#### Scenario: No file below 40
- **WHEN** every score is 40 or more
- **THEN** `hotspots` is an empty array

### Requirement: Analyze output
The `analyze` action SHALL return `hotspots` (first 10), `changeData` (first 50 entries), `complexityData` and `scores`, both keyed by path for the scored files.

#### Scenario: Analyze a repository
- **WHEN** `execute({ action: 'analyze', workspacePath })` succeeds
- **THEN** the result has exactly the keys `hotspots`, `changeData`, `complexityData` and `scores`

### Requirement: Find-hotspots output
The `find-hotspots` action SHALL return `hotspots` (all of them), `totalFiles` and `averageHealth`, the rounded mean score of the scored files, or 0 when none were scored.

#### Scenario: Summary
- **WHEN** `find-hotspots` scores three files at 40, 50 and 60
- **THEN** `averageHealth` is 50

### Requirement: Report health fields
The `report` action SHALL return `generatedAt` (ISO time), `workspace` (the given path), `totalFiles`, `averageHealth`, `hotspotCount` (all hotspots), `hotspots` (first 20), `coupling` and `clusters`.

#### Scenario: Report keys
- **WHEN** `report` succeeds
- **THEN** the result has those eight keys and no `scores`

### Requirement: TODO scan
The `find-todos` action SHALL run `grep -rn "TODO\|FIXME\|HACK"` with `--include` for `*.js`, `*.ts`, `*.jsx` and `*.tsx` on the workspace, with stderr dropped and output cut to 500 lines by `head -500`. It SHALL return `total`, `byFile` and `lines` (first 100).

#### Scenario: Count per file
- **WHEN** grep prints `/repo/src/a.js:3: // TODO fix`
- **THEN** `byFile` has key `/repo/src/a.js`, the text before the first colon, which is an absolute path
- **AND** `node_modules` is searched too, because no folder is excluded

#### Scenario: No matches
- **WHEN** nothing matches
- **THEN** the result is `{ total: 0, byFile: {}, lines: [] }`

### Requirement: Test file ratio
The `test-coverage` action SHALL count test files with `find "<ws>" -name "*.test.*" -o -name "*.spec.*"` (first 200) and source files with `find "<ws>" -name "*.js" -not -name "*.test.*" -not -name "*.spec.*" -not -path "*/node_modules/*"` (first 500). It SHALL return `ratio`, `testFiles` and `sourceFiles` as counts.

#### Scenario: Ratio
- **WHEN** there are 200 test files and 127 source files
- **THEN** `ratio` is `Math.round(200 / 127 * 100)`, which is 157, because test files inside `node_modules` count and the ratio has no cap
- **AND** when there are no source files `ratio` is 0

### Requirement: Shell commands
`find-todos` and `test-coverage` SHALL run their commands through `child_process.exec`, a shell, with `workspacePath` placed inside double quotes in the command string. The path is not escaped.

#### Scenario: Path with a double quote
- **WHEN** `workspacePath` contains `"`
- **THEN** the shell reads the rest of the path as shell syntax
