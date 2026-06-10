// Complexity Calculator — Estimates code complexity via heuristics (no full AST)
const fs = require('fs').promises;
const path = require('path');

class ComplexityCalculator {
  constructor(workspacePath) { this.workspacePath = workspacePath; }

  async calculateForFile(filePath) {
    const fullPath = path.join(this.workspacePath, filePath);
    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      const lines = content.split('\n');
      const nonEmpty = lines.filter(l => l.trim() && !l.trim().startsWith('//') && !l.trim().startsWith('#')).length;

      let maxIndent = 0;
      for (const l of lines) { const indent = l.match(/^\s*/)[0].length; maxIndent = Math.max(maxIndent, Math.floor(indent/2)); }

      const decisions = ['if','else if','for','while','case','catch','&&','||','?'];
      let complex = 1;
      for (const d of decisions) { const m = content.match(new RegExp(`\\b${d}\\b`,'g')); if (m) complex += m.length; }
      const cc = Math.min(complex, 200);
      return { loc:nonEmpty, nestingDepth:maxIndent, cyclomaticComplexity:cc, complexityScore:Math.min(100,(cc/200)*100) };
    } catch (e) { return { loc:0, nestingDepth:0, cyclomaticComplexity:0, complexityScore:0, error:e.message }; }
  }

  async calculateForFiles(files) { const r={}; for (const f of files) r[f]=await this.calculateForFile(f); return r; }
}
module.exports = ComplexityCalculator;
