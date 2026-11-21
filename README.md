# Lightsaber — Git Health Map for YodaMan

**Find code hotspots using Git history, complexity, and change coupling.**

A single-file YodaMan tool plugin. Drop it into yodaman's `plugins/` directory and YodaMan's agent can analyze any workspace for hotspots.

`lightsaber.js` is the same file as YodaMan core's `plugins/lightsaber.js`. A test fails when the two differ.

## YodaMan Plugin API

This plugin uses YodaMan's real plugin format:

```javascript
module.exports = {
  name: 'lightsaber',
  description: '...',
  permissions: ['read', 'search'],
  parameters: { action, workspacePath, ... },
  async execute(params) { ... }
};
```

## Quick Install

```bash
cp lightsaber.js /path/to/yodaman/plugins/lightsaber.js
```

Then restart YodaMan. It needs YodaMan 0.3.8 or later, which has the knowledge-graph modules the plugin loads. The `lightsaber` tool is now available to the agent.

## Usage via Agent

```
Analyze /path/to/repo for code hotspots
```

Or directly via the API. `projectId` must be a workspace registered in YodaMan, and the answer streams as server-sent events:

```bash
curl -X POST http://localhost:3090/api/agent/task \
  -H 'Content-Type: application/json' \
  -d '{
    "task": "Run lightsaber analyze on /path/to/repo",
    "projectId": "/path/to/repo"
  }'
```

## Actions

| Action | Returns |
|--------|---------|
| `analyze` | Top 10 hotspots, change frequency, complexity scores |
| `find-hotspots` | All files with health score < 40, `uncoveredCount` and `uncoveredFiles` (files no test reaches), average health |
| `find-todos` | TODO/FIXME/HACK count per file, skipping `node_modules`, `dist`, `build`, `.git`, `release` and `coverage` |
| `test-coverage` | Percentage of source files a test reaches, from YodaMan's knowledge graph, with untested files listed by dependency count. With no graph, a ratio of test files to `.js` source files outside `node_modules` (`method: 'file-count-fallback'`) |
| `coupling` | Change coupling edges + clusters |
| `report` | Full JSON dump (hotspots, coupling, clusters, scores) |

> **YodaMan v0.3.8 note**: `test-coverage` previously returned the ratio of test files to source files (one large test file could inflate it). It now resolves coverage through the knowledge graph and lists untested files ordered by how many other files depend on them. The `ratio` field is retained for existing consumers. Scoring factors `testCoverage` and `todoCount` are now per-file and real — they were dead code prior to v0.3.8.

`daysToAnalyze` (default 90) sets the time window. Coupling keeps only commits inside it. The heatmap reads it when YodaMan's `gitService.getHeatmapData` takes a days argument; older versions read 30 days. `excludePatterns` are git-style globs matched against whole path segments, so `*.lock` drops `yarn.lock` but not `src/clock.js`.

`grep` and `find` run as programs with argument arrays, never through a shell. `find-todos` and `test-coverage` work without `gitService`.

## Health Score Formula

`Score = 100 - (ChangePenalty + ComplexityPenalty + TestPenalty + TodoPenalty)`

- ChangePenalty: min(40, commits_in_window / max_commits × 40)
- ComplexityPenalty: min(30, cyclomatic / 200 × 30), where cyclomatic is 1 + `if`/`for`/`while`/`case`/`catch` + `&&`/`||` + ternary `?`, capped at 200
- TestPenalty: 20 when no test reaches the file, else 0  *(from knowledge graph edges per file)*
- TodoPenalty: min(10, todo_count / 10 × 5)  *(TODO counts from actual file scan)*

| Score | Status |
|-------|--------|
| 80-100 | Healthy 🟢 |
| 60-79 | Warning 🟡 |
| 40-59 | At Risk 🟠 |
| 20-39 | Hotspot 🔴 |
| 0-19 | Critical 🔥 |

## Reuses from YodaMan

The plugin requires these modules relative to its own folder, so it must sit in YodaMan's `plugins/`:

- **`../backend/services/gitService.js`**: `getHeatmapData()`, `getCommitHistory()`, `getCommitDiff()`. If it is missing, the plugin tries `backend/services/gitService.js` under the current folder. Without it, `analyze`, `find-hotspots`, `report` and `coupling` throw; `find-todos` and `test-coverage` still run.
- **`../backend/infrastructure/GraphFacts.js`**: test coverage per file from the knowledge graph.
- **`../backend/infrastructure/ImpactAnalyzer.js`**: `isTestFile()`.

## Tests

```bash
npm test
```

Node 24 or later, no dependencies. The tests load `lightsaber.js` from a temporary YodaMan-shaped folder with stub modules. The sync check compares it with `../core/plugins/lightsaber.js` and skips when no core checkout sits beside this repository.

## Companion plugins

`find-unused.js`, `Droid-Sweep.js` (the same code under another name) and `CodeTrooper.js` are standalone tool plugins that need only Node. YodaMan core's `Droid-Sweep.js` is a different file that asks the knowledge graph first.

## Legacy files

The `frontend/`, `backend/`, `main.js`, and `plugin.json` files are docs/reference from the spec-based design. YodaMan only loads `lightsaber.js`. The routes in `backend/` take `gitService` from the `deps` passed to `mountRoutes`, and `main.js` registers no tool of its own.

## License

MIT
