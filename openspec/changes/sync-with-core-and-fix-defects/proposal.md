## Why
YodaMan core ships its own copy of this plugin as `core/plugins/lightsaber.js`, and the two have drifted. The baseline spec (2026-11-21) found that this repo's copy has every defect core fixed in YodaMan 0.6.7, plus a few of its own: no hotspot is ever reported, workspace paths go through a shell, and the reference files cannot load.

## What Changes
- Bring `lightsaber.js` up to core's 0.6.7 copy, which fixes:
  - the complexity regex: `?` threw `Nothing to repeat`, the catch zeroed complexity, so `hotspots` was always empty, and `||` matched every position;
  - git and grep run with argument arrays, never shell strings built from `workspacePath`;
  - `daysToAnalyze` sets the heatmap window (it was fixed at 30 days);
  - coupling strength divides by the commits actually diffed, so it can reach 100;
  - exclude patterns are anchored (`*.lock` no longer drops `src/clock.js`);
  - test coverage ignores `node_modules`;
  - `find-todos` and `test-coverage` work without `gitService`.
- Keep core's additions (graph coverage and TODO counts in the score, `uncoveredCount`/`uncoveredFiles`, the knowledge-graph test coverage with its fallback) or document why not.
- `find-unused.js:30-31` and `Droid-Sweep.js`: search other files for each file's name, as core's import loop does, so imported files are not reported unused.
- `backend/gitAnalyzer.js:3`: the require path does not exist, so the routes cannot load.
- `main.js:60`: `express` and `node-mocks-http` are not in `package.json`, and the mock request has no URL.
- `README.md:53,57,65-66`: describes knowledge-graph coverage only core's copy has; make it match after the sync.
- Add a check (here or in core) that fails when the two copies of `lightsaber.js` differ.

## Capabilities
### New Capabilities
None.
### Modified Capabilities
- `health-analysis`, `change-coupling`, `companion-plugins`, `dashboard-reference`, `plugin-contract`.

## Impact
`lightsaber.js`, `find-unused.js`, `Droid-Sweep.js`, `CodeTrooper.js` if affected, `backend/`, `main.js`, `package.json`, `README.md`, tests. YodaMan core's `plugins/lightsaber.js` and `plugins/Droid-Sweep.js` are the source of the fixes.
