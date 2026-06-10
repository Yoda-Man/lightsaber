# Graph Report - lightsaber  (2026-06-10)

## Corpus Check
- 15 files · ~4,655 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 118 nodes · 116 edges · 13 communities (10 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]

## God Nodes (most connected - your core abstractions)
1. `Lightsaber — Git Health Map for YodaMan` - 10 edges
2. `configSchema` - 6 edges
3. `GitAnalyzer` - 6 edges
4. `HealthScorer` - 5 edges
5. `execute()` - 4 edges
6. `hotspotThreshold` - 4 edges
7. `commitLimit` - 4 edges
8. `daysToAnalyze` - 4 edges
9. `enablePulseAnimation` - 4 edges
10. `excludePatterns` - 4 edges

## Surprising Connections (you probably didn't know these)
- `onLoad()` --calls--> `mountRoutes()`  [INFERRED]
  main.js → backend/routes.js

## Communities (13 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.12
Nodes (17): default, description, type, configSchema, commitLimit, enablePulseAnimation, excludePatterns, hotspotThreshold (+9 more)

### Community 1 - "Community 1"
Cohesion: 0.12
Nodes (15): Actions, code:javascript (module.exports = {), code:bash (cp lightsaber.js /path/to/yodaman/plugins/lightsaber.js), code:block3 (Analyze /path/to/repo for code hotspots), code:bash (curl -X POST http://localhost:3090/api/agent/task \), code:javascript (require('/path/to/yodaman/backend/services/gitService')), Health Score Formula, Legacy files (+7 more)

### Community 2 - "Community 2"
Cohesion: 0.14
Nodes (13): author, description, keywords, license, main, name, repository, type (+5 more)

### Community 3 - "Community 3"
Cohesion: 0.20
Nodes (6): CouplingAnalyzer, ComplexityCalculator, CouplingAnalyzer, express, GitAnalyzer, HealthScorer

### Community 4 - "Community 4"
Cohesion: 0.20
Nodes (9): author, description, displayName, entry, minYodaManVersion, name, permissions, uiExtensions (+1 more)

### Community 5 - "Community 5"
Cohesion: 0.22
Nodes (3): GitAnalyzer, gitService, path

### Community 7 - "Community 7"
Cohesion: 0.29
Nodes (3): mountRoutes(), onLoad(), path

### Community 8 - "Community 8"
Cohesion: 0.43
Nodes (6): calcComplexity(), calcCouplingClusters(), execute(), fs, healthScore(), path

### Community 12 - "Community 12"
Cohesion: 0.50
Nodes (4): daysToAnalyze, default, description, type

## Knowledge Gaps
- **58 isolated node(s):** `fs`, `path`, `path`, `fs`, `name` (+53 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `configSchema` connect `Community 0` to `Community 4`, `Community 12`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `mountRoutes()` connect `Community 7` to `Community 3`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **What connects `fs`, `path`, `path` to the rest of the system?**
  _58 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._