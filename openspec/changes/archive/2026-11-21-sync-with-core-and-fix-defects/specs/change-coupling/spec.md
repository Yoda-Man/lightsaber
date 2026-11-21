## MODIFIED Requirements

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

### Requirement: Coupling strength
Each pair SHALL get `strength = coChangeCount / diffed * 100`, unrounded, where `diffed` is the number of commits diffed without error, at least 1.

#### Scenario: Large history
- **WHEN** 200 commits exist and every diffed commit changes the same two files
- **THEN** their strength is 100
