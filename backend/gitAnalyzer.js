// gitAnalyzer.js — Thin wrapper around yodaman's existing gitService.js
// gitService comes from mountRoutes' deps, so no path into yodaman is guessed here.

// A glob as git reads it: `*` stays in one segment, `**` crosses them, anchored at a segment boundary.
// Same as globToRegExp in lightsaber.js, which must stay identical to core and exports nothing.
function globToRegExp(glob) {
  const body = glob.split('**')
    .map(part => part.split('*').map(text => text.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*'))
    .join('.*');
  return new RegExp(`(^|/)${body}$`);
}

class GitAnalyzer {
  constructor(workspacePath, options = {}, gitService) {
    this.workspacePath = workspacePath;
    this.gitService = gitService;
    this.commitLimit = options.commitLimit || 500;
    this.daysToAnalyze = options.daysToAnalyze || 90;
    this.excludeRegExps = (options.excludePatterns || ['node_modules/**','dist/**','build/**','*.lock','package-lock.json']).map(globToRegExp);
    this.codeExts = ['.js','.ts','.jsx','.tsx','.py','.java','.go','.rs','.dart','.swift'];
  }

  async isGitRepo() {
    try { await this.gitService.getBranchInfo(this.workspacePath); return true; }
    catch { return false; }
  }

  // Uses gitService.getHeatmapData() instead of raw git log parsing
  async analyzeChangeFrequency(_commits) {
    const raw = await this.gitService.getHeatmapData(this.workspacePath, this.daysToAnalyze);
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
    let diffed = 0;
    for (const c of commits.slice(0, 200)) {  // limit to 200 for performance
      try {
        const diff = await this.gitService.getCommitDiff(this.workspacePath, c.hash);
        diffed += 1;
        const files = diff.files.map(f => f.filePath).filter(f => this.includeFile(f)).sort();
        for (let i = 0; i < files.length; i++)
          for (let j = i+1; j < files.length; j++) {
            const k = `${files[i]}|${files[j]}`; co.set(k, (co.get(k)||0)+1);
          }
      } catch { /* skip problematic commits */ }
    }
    return Array.from(co.entries()).map(([k,c]) => { const [f1,f2]=k.split('|'); return { file1:f1, file2:f2, coChangeCount:c, strength:(c/Math.max(diffed,1))*100 }; })
      .sort((a,b) => b.strength - a.strength).slice(0, 100);
  }

  includeFile(f) {
    if (this.excludeRegExps.some(r => r.test(f))) return false;
    return this.codeExts.some(e => f.endsWith(e));
  }
}
module.exports = GitAnalyzer;
