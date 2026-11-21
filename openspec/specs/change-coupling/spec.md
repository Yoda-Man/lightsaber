# Change Coupling Specification

## Purpose
Change coupling finds files that change in the same commits. It covers the `coupling` action and the `coupling` and `clusters` fields of `report`, both in `lightsaber.js`. The two actions share one code path, and git access goes through YodaMan's `gitService`.

## Requirements

### Requirement: Commit sample
The `coupling` and `report` actions SHALL call `gitService.getCommitHistory(workspacePath, null, Math.min(commitLimit, 100))` and keep the commits dated inside the `daysToAnalyze` window. A commit with no date SHALL be kept. A failure SHALL give an empty sample.

#### Scenario: Default limit
- **WHEN** `commitLimit` is not passed
- **THEN** up to 100 commits are fetched

#### Scenario: Zero limit
- **WHEN** `commitLimit` is 0
- **THEN** gitService reads 0 as missing and fetches up to 100 commits

#### Scenario: Old commit
- **WHEN** `daysToAnalyze` is 7 and the sample has commits from 2 and 20 days ago
- **THEN** only the commit from 2 days ago is diffed

### Requirement: Diffed commits
Every commit of the sample SHALL be diffed with `gitService.getCommitDiff`. A commit whose diff throws MUST be skipped without failing the action.

#### Scenario: Bad commit
- **WHEN** one commit cannot be diffed, for example in a shallow clone
- **THEN** the other commits still count

### Requirement: Co-change pairs
For each diffed commit the plugin SHALL keep the changed paths that pass the file filter, sort them, and count every pair once under the key `file1|file2`, where `file1` sorts before `file2`. There is no cap on files per commit.

#### Scenario: Three files in one commit
- **WHEN** a commit changes `a.js`, `b.js` and `c.js`
- **THEN** the pairs `a.js|b.js`, `a.js|c.js` and `b.js|c.js` each gain 1

### Requirement: Coupling strength
Each pair SHALL get `strength = coChangeCount / diffed * 100`, unrounded, where `diffed` is the number of commits diffed without error, at least 1.

#### Scenario: Large history
- **WHEN** 200 commits exist and every diffed commit changes the same two files
- **THEN** their strength is 100

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
