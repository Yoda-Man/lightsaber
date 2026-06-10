// gitAnalyzer.js — Thin wrapper around yodaman's existing gitService.js
// Eliminates duplicated simple-git logic by importing the proven backend service.
const gitService = require('../../yodaman/backend/services/gitService');
const path = require('path');

class GitAnalyzer {
  constructor(workspacePath, options = {}) {
    this.workspacePath = workspacePath;
    this.commitLimit = options.commitLimit || 500;
    this.daysToAnalyze = options.daysToAnalyze || 90;
    this.excludePatterns = options.excludePatterns || ['node_modules/**','dist/**','build/**','*.lock','package-lock.json'];
    this.codeExts = ['.js','.ts','.jsx','.tsx','.py','.java','.go','.rs','.dart','.swift'];
  }

  async isGitRepo() {
    try { await gitService.getBranchInfo(this.workspacePath); return true; }
    catch { return false; }
  }

  // Uses gitService.getHeatmapData() instead of raw git log parsing
  async analyzeChangeFrequency(_commits) {
    const raw = await gitService.getHeatmapData(this.workspacePath);
    const filtered = raw.filter(e => this.includeFile(e.filePath));
    const maxC = Math.max(...filtered.map(v => v.changeCount), 1);
    return filtered.map(e => ({
      path: e.filePath,
      commitCount: e.changeCount,
      changeFrequency: (e.changeCount / maxC) * 100,
      lastChange: e.lastChangeDate,
      authorCount: e.authorCount
    }));
  }

  // Uses gitService.getCommitDiff() for per-commit file lists → coupling
  async analyzeChangeCoupling(commits) {
    const co = new Map();
    for (const c of commits.slice(0, 200)) {  // limit to 200 for performance
      try {
        const diff = await gitService.getCommitDiff(this.workspacePath, c.hash);
        const files = diff.files.map(f => f.filePath).filter(f => this.includeFile(f)).sort();
        for (let i = 0; i < files.length; i++)
          for (let j = i+1; j < files.length; j++) {
            const k = `${files[i]}|${files[j]}`; co.set(k, (co.get(k)||0)+1);
          }
      } catch { /* skip problematic commits */ }
    }
    return Array.from(co.entries()).map(([k,c]) => { const [f1,f2]=k.split('|'); return { file1:f1, file2:f2, coChangeCount:c, strength:(c/commits.length)*100 }; })
      .sort((a,b) => b.strength - a.strength).slice(0, 100);
  }

  includeFile(f) {
    for (const p of this.excludePatterns) { const r = new RegExp(p.replace(/\*\*/g,'.*').replace(/\*/g,'[^/]*')); if (r.test(f)) return false; }
    return this.codeExts.some(e => f.endsWith(e));
  }
}
module.exports = GitAnalyzer;
