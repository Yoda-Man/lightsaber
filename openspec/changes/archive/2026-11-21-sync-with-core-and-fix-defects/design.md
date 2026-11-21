# Design

## Context
See proposal.md for why. YodaMan core's fixed copy of `lightsaber.js` (0.6.7) requires three YodaMan modules relative to its own folder: `../backend/services/gitService` (optional, in try/catch), `../backend/infrastructure/GraphFacts` and `../backend/infrastructure/ImpactAnalyzer` (both required at load). The README installs the plugin by copying `lightsaber.js` into YodaMan's `plugins/` folder, so `../backend` is always YodaMan's backend. Both infrastructure modules exist since YodaMan 0.3.8.

The reference files under `backend/` cannot load today: `gitAnalyzer.js` requires a path that does not exist, and `routes.js` requires `express`, which is not declared. Once they load, their copies of the defects core fixed become live code.

## Goals / Non-Goals

**Goals:**
- `lightsaber.js` is byte-identical to core's copy, and a test says so.
- Every fixed defect has a test that fails on the old file.
- The reference files load with Node built-ins only.

**Non-Goals:**
- Porting core's knowledge-graph mode of `Droid-Sweep.js`. The companions here stay standalone.
- Changing the React reference views.

## Decisions

### 1. Copy core's file unchanged
The plugin is only ever loaded from YodaMan's `plugins/` folder, where the two hard requires resolve. So the copies can be identical, and they are. `package.json` `yodaman.minVersion` moves from `0.2.0` to `0.3.8`, the first YodaMan with both modules.
Alternative: wrap the two requires in try/catch. Rejected: it makes the copies differ for a load path the README never uses.

### 2. Tests run the plugin as YodaMan does
There was no test runner. Tests use `node:test` through `npm test`, with no new dependency. Each lightsaber test copies `lightsaber.js` into a temporary tree shaped like YodaMan (`plugins/`, `backend/services/gitService.js`, `backend/infrastructure/GraphFacts.js`, `backend/infrastructure/ImpactAnalyzer.js`) with stub modules, then requires it. The cases port core's `LightsaberAnalysis.test.js`.

### 3. Sync check against the sibling checkout
`test/core-sync.test.js` compares this file with `../core/plugins/lightsaber.js`. When no core checkout sits beside this repository it skips with a message, so a skip is visible and never a silent pass. No network fetch, by the local-only rule.

### 4. Companion plugins take only core's import loop
`find-unused.js` and `Droid-Sweep.js` now mark the targets of each file's own relative imports, as core's text-scan fallback does. Core's `Droid-Sweep.js` asks the knowledge graph first and requires `GraphFacts`; that file is deliberately not copied, so the companions keep working anywhere.

### 5. Reference routes get `gitService` from `deps`
`mountRoutes(router, deps)` already receives `gitService`. `GitAnalyzer` now takes it as a constructor argument instead of guessing a path. The unused `express` require in `routes.js` goes.
`main.js` registered a second tool, `lightsaber_find_hotspots`, through `express` and `node-mocks-http`, neither declared. The README says the tool is `lightsaber.js`, so that dead path is removed rather than adding two dependencies. The mock request, and its missing URL, go with it.

### 6. Fix the copied defects the routes would expose
Making the routes loadable would turn on shell strings built from `req.body.workspacePath`. That is not allowed, so the `find-todos` and `test-coverage` routes run `grep` and `find` with argument arrays, with core's arguments. The same pass fixes the other copies of core's defects: the `\b?\b` regex in `ComplexityCalculator`, and in `GitAnalyzer` the unanchored globs, the ignored `daysToAnalyze` and strength divided by the fetched rather than the diffed commits. The helpers are small copies of core's; they cannot be shared because `lightsaber.js` must stay identical to core and exports none.

### 7. Guard tests for the two classes
`test/guards.test.js` fails when any repository `.js` file pulls `exec` or `execSync` from `child_process` or passes `shell: true`, and when any `.js` file requires a package that is neither a Node built-in nor in `package.json`.

## Risks / Trade-offs
- [Loading `lightsaber.js` outside YodaMan throws `Cannot find module`] → The README states the YodaMan version needed; the tests load it from a YodaMan-shaped tree.
- [A YodaMan whose `getHeatmapData` ignores its second argument still reads 30 days for the heatmap] → The coupling window is applied inside the plugin either way; the README says the heatmap window needs core's `gitService`.
- [The sync check skips in a lone checkout] → It prints why it skipped.
- [The reference helpers are copies] → They are reference code YodaMan does not load; the spec records it.
