// Coupling Analyzer — Finds hidden dependencies via change coupling
class CouplingAnalyzer {
  findCouplingClusters(couplingData) {
    const g = new Map();
    for (const e of couplingData) {
      if (e.strength > 30) {
        if (!g.has(e.file1)) g.set(e.file1,[]); if (!g.has(e.file2)) g.set(e.file2,[]);
        g.get(e.file1).push(e.file2); g.get(e.file2).push(e.file1);
      }
    }
    const visited = new Set(), clusters = [];
    for (const [node] of g) {
      if (!visited.has(node)) {
        const cluster = [], q = [node]; visited.add(node);
        while (q.length) {
          const c = q.shift(); cluster.push(c);
          for (const n of (g.get(c)||[])) if (!visited.has(n)) { visited.add(n); q.push(n); }
        }
        if (cluster.length > 1) clusters.push({ files:cluster, size:cluster.length, worstHealth:null });
      }
    }
    return clusters.sort((a,b) => b.size - a.size);
  }

  generateRecommendations(cluster, fhm) {
    const r = [];
    let healthiest = null, hs = 0;
    for (const f of cluster.files) { const h = fhm[f]; if (h && h.score > hs) { hs = h.score; healthiest = f; } }
    r.push({ type:'extract', message:`Extract shared logic from ${cluster.files.length} coupled files into a separate module`, effort:cluster.files.length*2 });
    if (healthiest) r.push({ type:'refactor', message:`Use ${healthiest} as template for refactoring this cluster`, effort:Math.ceil(cluster.files.length/2) });
    return r;
  }
}
module.exports = CouplingAnalyzer;
