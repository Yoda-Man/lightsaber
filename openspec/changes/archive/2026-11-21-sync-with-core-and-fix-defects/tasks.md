## 1. Sync the plugin
- [x] 1.1 Copy core's `plugins/lightsaber.js` (0.6.7) here; diff and keep only deliberate differences
- [x] 1.2 Port core's tests (`core/tests/plugins/LightsaberAnalysis.test.js`) so each fixed defect has a regression test here
- [x] 1.3 Add a check that fails when this file and core's copy differ

## 2. Companion plugins
- [x] 2.1 Port core's import loop to `find-unused.js` and `Droid-Sweep.js`; test that an imported file is not reported unused

## 3. Reference files
- [x] 3.1 Fix the `backend/gitAnalyzer.js` require path; test that the routes load
- [x] 3.2 Declare `main.js`'s dependencies or remove the dead path; give the mock request a URL
- [x] 3.3 Make `README.md` match the code
- [x] 3.4 Fix the copied defects the loadable routes expose: shell strings, the complexity regex, globs, window and strength in `backend/`; add guard tests for shell use and undeclared packages

## 4. Close
- [x] 4.1 Update the affected spec scenarios; `openspec validate --specs --strict`
- [x] 4.2 Run the tests
