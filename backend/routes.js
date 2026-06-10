// routes.js — Lightsaber API routes mounting on yodaman's existing Express router
// Follows RestController.js pattern, reuses gitService, auditLog, logger from yodaman.
const express = require('express');
const GitAnalyzer = require('./gitAnalyzer');
const ComplexityCalculator = require('./complexityCalculator');
const HealthScorer = require('./healthScorer');
const CouplingAnalyzer = require('./couplingAnalyzer');

function mountRoutes(router, deps) {
  const { gitService, auditLog, logger } = deps;

  // POST /api/lightsaber/check-git
  router.post('/api/lightsaber/check-git', async (req, res) => {
    try {
      const ga = new GitAnalyzer(req.body.workspacePath);
      res.json({ isRepo: await ga.isGitRepo() });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  // POST /api/lightsaber/analyze-git — uses existing gitService.getHeatmapData
  router.post('/api/lightsaber/analyze-git', async (req, res) => {
    try {
      const ga = new GitAnalyzer(req.body.workspacePath, req.body);
      const commits = await gitService.getCommitHistory(req.body.workspacePath, null, req.body.commitLimit || 500);
      const [changeData, coupling] = await Promise.all([
        ga.analyzeChangeFrequency(commits),
        ga.analyzeChangeCoupling(commits)
      ]);
      res.json({ files: changeData.map(f => f.path), changeData, coupling });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  // POST /api/lightsaber/calculate-complexity
  router.post('/api/lightsaber/calculate-complexity', async (req, res) => {
    try {
      const cc = new ComplexityCalculator(req.body.workspacePath);
      const results = await cc.calculateForFiles(req.body.files || []);
      res.json(results);
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  // POST /api/lightsaber/compute-health
  router.post('/api/lightsaber/compute-health', async (req, res) => {
    try {
      const scorer = new HealthScorer(req.body);
      const scores = {};
      for (const [f, cd] of Object.entries(req.body.complexityData || {})) {
        const fd = req.body.changeData?.find(c => c.path === f) || {};
        scores[f] = scorer.calculateHealthScore({
          changeFrequency: fd.changeFrequency || 0,
          complexityScore: cd.complexityScore || 0,
          testCoverage: 0, todoCount: 0
        });
      }
      res.json({ scores, summary: scorer.generateSummary(scores) });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  // POST /api/lightsaber/find-todos
  router.post('/api/lightsaber/find-todos', async (req, res) => {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execP = promisify(exec);
      const { stdout } = await execP(`grep -rn "TODO\\|FIXME\\|HACK" --include="*.js" --include="*.ts" --include="*.jsx" --include="*.tsx" "${req.body.workspacePath}" 2>/dev/null | head -500`);
      const lines = stdout.split('\n').filter(Boolean);
      const byFile = {};
      for (const l of lines) { const f = l.split(':')[0]; byFile[f] = (byFile[f]||0)+1; }
      res.json({ todos: lines, byFile });
    } catch (e) { res.json({ todos: [], byFile: {} }); }
  });

  // POST /api/lightsaber/test-coverage
  router.post('/api/lightsaber/test-coverage', async (req, res) => {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execP = promisify(exec);
      const { stdout } = await execP(`find "${req.body.workspacePath}" -name "*.test.*" -o -name "*.spec.*" 2>/dev/null | head -200`);
      const testFiles = stdout.split('\n').filter(Boolean);
      const { stdout: srcStdout } = await execP(`find "${req.body.workspacePath}" -name "*.js" -not -name "*.test.*" -not -name "*.spec.*" -not -path "*/node_modules/*" 2>/dev/null | head -500`);
      const srcFiles = srcStdout.split('\n').filter(Boolean);
      const ratio = srcFiles.length > 0 ? Math.round(testFiles.length / srcFiles.length * 100) : 0;
      res.json({ ratio, testFiles, sourceFiles: srcFiles, uncoveredFiles: [] });
    } catch (e) { res.json({ ratio: 0, testFiles: [], sourceFiles: [], uncoveredFiles: [] }); }
  });

  // POST /api/lightsaber/find-hotspots — wrapped as reusable tool
  router.post('/api/lightsaber/find-hotspots', async (req, res) => {
    try {
      const scorer = new HealthScorer(req.body);
      const ga = new GitAnalyzer(req.body.workspacePath, req.body);
      const commits = await gitService.getCommitHistory(req.body.workspacePath, null, 200);
      const changeData = await ga.analyzeChangeFrequency(commits);
      const cc = new ComplexityCalculator(req.body.workspacePath);
      const complexityData = await cc.calculateForFiles(changeData.map(f => f.path).slice(0, 100));
      const scores = {};
      for (const f of Object.keys(complexityData)) {
        const fd = changeData.find(c => c.path === f) || {};
        scores[f] = scorer.calculateHealthScore({
          changeFrequency: fd.changeFrequency || 0,
          complexityScore: complexityData[f].complexityScore || 0,
          testCoverage: 0, todoCount: 0
        });
      }
      res.json({ hotspots: scorer.findHotspots(scores), scores });
      if (auditLog) auditLog.log({ userAction: 'lightsaber_find_hotspots', plugin: 'lightsaber' });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  // POST /api/lightsaber/coupling-clusters
  router.post('/api/lightsaber/coupling-clusters', async (req, res) => {
    try {
      const ga = new GitAnalyzer(req.body.workspacePath, req.body);
      const commits = await gitService.getCommitHistory(req.body.workspacePath, null, 200);
      const coupling = await ga.analyzeChangeCoupling(commits);
      const ca = new CouplingAnalyzer();
      const clusters = ca.findCouplingClusters(coupling);
      res.json({ clusters, couplingEdges: coupling });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  // POST /api/lightsaber/combine-analysis
  router.post('/api/lightsaber/combine-analysis', async (req, res) => {
    try {
      const { healthScores={}, todos={}, testCoverage={}, coupling=[] } = req.body;
      const nodes = Object.entries(healthScores).map(([id, h]) => ({
        id, name: id.split('/').pop(),
        ...h,
        radius: 10,
        todoCount: todos.byFile?.[id] || 0,
        testCoverage: testCoverage.ratio || 0
      }));
      const edges = coupling.map(c => ({ source: c.file1, target: c.file2, strength: c.strength }));
      const hotspots = Object.entries(healthScores).filter(([_,h]) => h.score < 40)
        .map(([p,h]) => ({ path: p, ...h })).sort((a,b) => a.score - b.score);
      res.json({ nodes, edges, hotspots, healthMap: healthScores });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  // POST /api/lightsaber/full-report
  router.post('/api/lightsaber/full-report', async (req, res) => {
    try {
      const ga = new GitAnalyzer(req.body.workspacePath, req.body);
      const commits = await gitService.getCommitHistory(req.body.workspacePath, null, 500);
      const [changeData, coupling] = await Promise.all([
        ga.analyzeChangeFrequency(commits), ga.analyzeChangeCoupling(commits)
      ]);
      const cc = new ComplexityCalculator(req.body.workspacePath);
      const complexityData = await cc.calculateForFiles(changeData.map(f => f.path).slice(0, 100));
      const scorer = new HealthScorer(req.body);
      const scores = {};
      for (const f of Object.keys(complexityData)) {
        const fd = changeData.find(c => c.path === f) || {};
        scores[f] = scorer.calculateHealthScore({
          changeFrequency: fd.changeFrequency || 0,
          complexityScore: complexityData[f].complexityScore || 0
        });
      }
      res.json({
        generatedAt: new Date().toISOString(),
        workspace: req.body.workspacePath,
        summary: scorer.generateSummary(scores),
        hotspots: scorer.findHotspots(scores),
        coupling,
        scores
      });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  // POST /api/lightsaber/mark-reviewed
  router.post('/api/lightsaber/mark-reviewed', async (req, res) => {
    if (auditLog) auditLog.log({ userAction: 'lightsaber_mark_reviewed', plugin: 'lightsaber', filePath: req.body.filePath });
    res.json({ ok: true });
  });

  return router;
}

module.exports = { mountRoutes };
