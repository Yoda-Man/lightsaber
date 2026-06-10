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
| `test-coverage` | Ratio of test files to source files |
| `coupling` | Change coupling edges + clusters |
| `report` | Full JSON dump (hotspots, coupling, clusters, scores) |

## Health Score Formula

`Score = 100 - (ChangePenalty + ComplexityPenalty + TestPenalty + TodoPenalty)`

- ChangePenalty: min(40, commits_90d / max_commits × 40)
- ComplexityPenalty: min(30, cyclomatic / 100 × 30)
- TestPenalty: coverage < 50% ? 20 : 0
- TodoPenalty: min(10, todo_count / 10 × 5)

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
