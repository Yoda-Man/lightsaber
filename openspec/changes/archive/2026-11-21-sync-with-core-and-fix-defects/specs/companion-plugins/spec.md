## MODIFIED Requirements

### Requirement: Reference detection
For each file the finder SHALL find every quoted string that starts with `./` or `../`, resolve it against that file's folder, and mark the scanned file whose path is the resolved path, `<resolved><ext>` or `<resolved>/index<ext>`.

#### Scenario: Imported by another file
- **WHEN** `index.js` has `require('./util')` and `import { x } from './lib'`, and `orphan.js` is imported by nothing
- **THEN** only `orphan.js` is reported unused

#### Scenario: Names itself
- **WHEN** `src/self.js` contains `require('./self')`
- **THEN** `src/self.js` is marked referenced

## ADDED Requirements

### Requirement: Standalone companions
The companion plugins SHALL load with Node built-ins only. `Droid-Sweep.js` here SHALL NOT match YodaMan core's `plugins/Droid-Sweep.js`, which asks YodaMan's knowledge graph first; only core's text-scan import loop is shared.

#### Scenario: Load outside YodaMan
- **WHEN** a host requires `Droid-Sweep.js` from this repository
- **THEN** it loads without any YodaMan module
