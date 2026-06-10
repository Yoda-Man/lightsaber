// Health Scorer — Hotspot formula: 100 - (ChangePenalty × ComplexityPenalty × TestPenalty)
class HealthScorer {
  constructor(opts={}) { this.hotspotThreshold = opts.hotspotThreshold || 40; }

  calculateHealthScore(fd) {
    const { changeFrequency=0, complexityScore=0, testCoverage=0, todoCount=0 } = fd;
    const cp = Math.min(40, (changeFrequency/100)*40);
    const xp = Math.min(30, (complexityScore/100)*30);
    const tp = testCoverage < 50 ? 20 : 0;
    const dop = Math.min(10, (todoCount/10)*5);
    const score = Math.max(0, Math.min(100, 100 - (cp+xp+tp+dop)));

    let status, color, label;
    if (score >= 80) { status='healthy'; color='#57c785'; label='Healthy 🟢'; }
    else if (score >= 60) { status='warning'; color='#e6c35c'; label='Warning 🟡'; }
    else if (score >= 40) { status='atRisk'; color='#ff8c42'; label='At Risk 🟠'; }
    else if (score >= 20) { status='hotspot'; color='#ff4444'; label='Hotspot 🔴'; }
    else { status='critical'; color='#cc0000'; label='Critical 🔥'; }

    return { score:Math.round(score), status, color, label, penalties:{ change:Math.round(cp), complexity:Math.round(xp), test:tp, todo:dop } };
  }

  findHotspots(fhm) {
    return Object.entries(fhm).filter(([_,h]) => h.score < this.hotspotThreshold)
      .map(([p,h]) => ({ path:p, score:h.score, status:h.status, label:h.label }))
      .sort((a,b) => a.score - b.score);
  }

  generateSummary(fhm) {
    const s = Object.values(fhm).map(h => h.score);
    const hs = this.findHotspots(fhm);
    return { totalFiles:s.length, averageHealth:Math.round(s.reduce((a,b)=>a+b,0)/s.length),
      hotspotCount:hs.length, criticalCount:hs.filter(h=>h.status==='critical').length, healthyCount:s.filter(x=>x>=80).length };
  }
}
module.exports = HealthScorer;
