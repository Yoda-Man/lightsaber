# Lightsaber — Git Health Map for YodaMan

**Find code hotspots using Git history, complexity, and change coupling.**

A single-file YodaMan tool plugin. Drop it into yodaman's `plugins/` directory and YodaMan's agent can analyze any workspace for hotspots.

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

Then restart YodaMan. The `lightsaber` tool is now available to the agent.

## Usage via Agent

```
Analyze /path/to/repo for code hotspots
```

Or directly via the API:

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
| `find-hotspots` | All files with health score < 40, summary stats |
| `find-todos` | TODO/FIXME/HACK count per file |
| `test-coverage` | Percentage of source files reached by a test (knowledge-graph based since v0.3.8), with untested files listed by dependency count |
| `coupling` | Change coupling edges + clusters |
| `report` | Full JSON dump (hotspots, coupling, clusters, scores) |

> **v0.3.8 note**: `test-coverage` previously returned the ratio of test files to source files (one large test file could inflate it). It now resolves coverage through the knowledge graph and lists untested files ordered by how many other files depend on them. The `ratio` field is retained for existing consumers. Scoring factors `testCoverage` and `todoCount` are now per-file and real — they were dead code prior to v0.3.8.

## Health Score Formula

`Score = 100 - (ChangePenalty + ComplexityPenalty + TestPenalty + TodoPenalty)`

- ChangePenalty: min(40, commits_90d / max_commits × 40)
- ComplexityPenalty: min(30, cyclomatic / 100 × 30)
- TestPenalty: coverage < 50% ? 20 : 0  *(coverage resolved from knowledge graph edges per file)*
- TodoPenalty: min(10, todo_count / 10 × 5)  *(TODO counts from actual file scan)*

| Score | Status |
|-------|--------|
| 80-100 | Healthy 🟢 |
| 60-79 | Warning 🟡 |
| 40-59 | At Risk 🟠 |
| 20-39 | Hotspot 🔴 |
| 0-19 | Critical 🔥 |

## Reuses from YodaMan

- **`backend/services/gitService.js`** — `getHeatmapData()`, `getCommitHistory()`, `getCommitDiff()`
- No duplicated `simple-git` logic
- Uses same Express router if UI routes are mounted

## Reusing from yodaman

The plugin imports `gitService` from yodaman's backend at runtime. Ensure the path resolves correctly:

```javascript
require('/path/to/yodaman/backend/services/gitService')
```

## Legacy files

The `frontend/`, `backend/`, `main.js`, and `plugin.json` files are docs/reference from the spec-based design. YodaMan only loads `lightsaber.js`.

## License

MIT
