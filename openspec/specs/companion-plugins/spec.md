# Companion Plugins Specification

## Purpose
The repository also holds three standalone single-file YodaMan tool plugins. `find-unused.js` and `Droid-Sweep.js` look for JavaScript and TypeScript files nothing references, and `CodeTrooper.js` counts files and lines per language. None of them uses git or `gitService`, and `package.json` does not point at them.

## Requirements

### Requirement: Plugin objects
Each file SHALL export `{ name, description, permissions: ['read'], parameters, execute }`. The names SHALL be `find-unused`, `Droid-Sweep` and `CodeTrooper`. `Droid-Sweep.js` SHALL run the same code as `find-unused.js` and differ only in its name, header comment and description.

#### Scenario: Load
- **WHEN** a host requires `Droid-Sweep.js`
- **THEN** its `name` is `Droid-Sweep` and its result matches `find-unused` for the same input

### Requirement: Unused-finder parameters
The unused finders SHALL accept `workspacePath` (required), `extensions` (default `.js,.ts,.jsx,.tsx`) and `excludeDirs` (default `node_modules,dist,build,.git,.next,.venv`), both split on commas and trimmed. The root SHALL be `path.resolve(workspacePath)`, or `process.cwd()` when the path is missing.

#### Scenario: No path
- **WHEN** `execute({})` is called
- **THEN** the current folder is scanned and no error is thrown

### Requirement: Folder walk
The walk SHALL read folders with `readdirSync`, skip a folder whose name is in the exclude set, stop below depth 10, and skip folders it cannot read. The unused finders SHALL keep files whose extension is in the set. CodeTrooper SHALL keep every file.

#### Scenario: Excluded folder
- **WHEN** a file is under `node_modules/`
- **THEN** it is not counted

### Requirement: Entry points
The unused finders SHALL treat any file named `index.js`, `index.ts`, `main.js`, `main.ts`, `app.js`, `app.tsx`, `index.jsx` or `index.tsx` as referenced.

#### Scenario: Entry file
- **WHEN** a project has `src/index.ts` that nothing imports
- **THEN** it is not reported as unused

### Requirement: Reference detection
For each file the finder SHALL search that file's own content for a quoted string ending in that file's own base name, with an optional `./` or `../` prefix. A relative match SHALL mark the existing `<resolved><ext>` or `<resolved>/index<ext>`. The base name is not regex-escaped.

#### Scenario: Imported by another file
- **WHEN** `index.js` has `require('./src/util')` and `src/util.js` never names itself
- **THEN** `src/util.js` is reported unused

#### Scenario: Names itself
- **WHEN** `src/self.js` contains `require('./self')`
- **THEN** `src/self.js` is marked referenced

### Requirement: Unused-finder output
The finders SHALL return `workspace`, `totalFiles`, `unusedCount` and `unusedFiles`. Each unused file SHALL be `{ filePath, size, loc }`, where `filePath` is relative to the root, `size` is the character count and `loc` is the count of `\n`-split lines. The list SHALL be sorted by `loc`, largest first, and cut to 50.

#### Scenario: One-line file
- **WHEN** an unused file holds one line and a trailing newline
- **THEN** its `loc` is 2

### Requirement: CodeTrooper parameters
CodeTrooper SHALL accept `workspacePath` (required, falling back to `process.cwd()`) and `excludeDirs` (default `node_modules,dist,build,.git,.next,.venv`).

#### Scenario: Custom exclude
- **WHEN** `excludeDirs` is `vendor`
- **THEN** `node_modules` is walked and `vendor` is skipped

### Requirement: Language counts
CodeTrooper SHALL name each file's language from its extension through a fixed map of 19 extensions, or the upper-case extension, or `Other` when there is none. It SHALL count non-blank lines, count unreadable files with 0 lines, and return `workspace`, `totalFiles`, `totalLines` and `languages`.

#### Scenario: Languages list
- **WHEN** a folder holds three `.js` files of one line each
- **THEN** `languages` is `[{ lang: 'JavaScript', files: 3, lines: 3 }]`, sorted by lines, highest first
