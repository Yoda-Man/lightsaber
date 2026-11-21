# Change Coupling Specification

## Purpose
Change coupling finds files that change in the same commits. It covers the `coupling` action and the `coupling` and `clusters` fields of `report`, both in `lightsaber.js`. The two actions run the same steps through copied code, and git access goes through YodaMan's `gitService`.

## Requirements

### Requirement: Commit sample
The `coupling` and `report` actions SHALL call `gitService.getCommitHistory(workspacePath, null, Math.min(commitLimit, 200))`. gitService runs `git log --max-count=<n> --date=iso-strict --pretty=format:%H%x09%an%x09%ad%x09%s` and one `git show --name-only` per commit. A failure SHALL give an empty sample.

#### Scenario: Default limit
- **WHEN** `commitLimit` is not passed
- **THEN** up to 200 commits are fetched

#### Scenario: Zero limit
- **WHEN** `commitLimit` is 0
- **THEN** gitService reads 0 as missing and fetches up to 100 commits

### Requirement: Diffed commits
Only the first 100 commits of the sample SHALL be diffed, each with `gitService.getCommitDiff`, which runs `git show --numstat --format= --no-renames --end-of-options <hash>`. A commit whose diff throws MUST be skipped without failing the action.

#### Scenario: Bad commit
- **WHEN** one commit cannot be diffed, for example in a shallow clone
- **THEN** the other commits still count

### Requirement: Co-change pairs
For each diffed commit the plugin SHALL keep the changed paths that pass the file filter, sort them, and count every pair once under the key `file1|file2`, where `file1` sorts before `file2`. There is no cap on files per commit.

#### Scenario: Three files in one commit
- **WHEN** a commit changes `a.js`, `b.js` and `c.js`
- **THEN** the pairs `a.js|b.js`, `a.js|c.js` and `b.js|c.js` each gain 1

### Requirement: Coupling strength
Each pair SHALL get `strength = coChangeCount / sampleSize * 100`, unrounded, where `sampleSize` is the full commit sample, up to 200, not the 100 commits diffed.

#### Scenario: Large history
- **WHEN** the sample has 200 commits and two files change together in all 100 diffed commits
- **THEN** their strength is 50, not 100

### Requirement: Edge list
The edges SHALL be `{ file1, file2, coChangeCount, strength }`, sorted by strength, highest first, and cut to the first 100.

#### Scenario: Many pairs
- **WHEN** there are 500 distinct pairs
- **THEN** only the 100 strongest are returned

### Requirement: Coupling clusters
Clusters SHALL be built from the returned edges with strength above 30, as an undirected graph. Each connected component found by breadth-first search with more than one file SHALL be a cluster `{ files, size }`, sorted by size, largest first.

#### Scenario: Weak coupling only
- **WHEN** no edge has strength above 30
- **THEN** `clusters` is an empty array

#### Scenario: Chain of files
- **WHEN** edges `a-b` and `b-c` both have strength 40
- **THEN** one cluster holds `a`, `b` and `c` with `size` 3

### Requirement: Coupling action output
The `coupling` action SHALL return `{ couplingEdges, clusters }`.

#### Scenario: Empty repository
- **WHEN** the repository has no commits
- **THEN** the result is `{ couplingEdges: [], clusters: [] }`

### Requirement: Report coupling fields
The `report` action SHALL put the same edge list in `coupling` and the clusters in `clusters`.

#### Scenario: Report
- **WHEN** `report` succeeds
- **THEN** `coupling` has at most 100 edges and `clusters` is built only from them
