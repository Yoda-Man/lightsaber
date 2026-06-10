// HealthDashboard — Main React component for Lightsaber plugin
import React, { useState, useEffect } from 'react';
import ForceGraph from './ForceGraph.jsx';
import FileDetailPanel from './FileDetailPanel.jsx';
import HealthChecks from './HealthChecks.jsx';
import './styles.css';

export default function HealthDashboard({ api, workspacePath }) {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [healthData, setHealthData] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [config, setConfig] = useState({ hotspotThreshold:40, enablePulseAnimation:true });

  useEffect(() => { analyzeHealth(); }, [workspacePath]);

  const analyzeHealth = async () => {
    setLoading(true); setProgress(10); setError(null);
    try {
      setProgress(20);
      const gitCheck = await api.call('/api/lightsaber/check-git', { workspacePath });
      if (!gitCheck.isRepo) { setError('Not a Git repository.'); setLoading(false); return; }
      setProgress(40);
      const gitData = await api.call('/api/lightsaber/analyze-git', { workspacePath, commitLimit:500, daysToAnalyze:90 });
      setProgress(60);
      const complexityData = await api.call('/api/lightsaber/calculate-complexity', { workspacePath, files:gitData.files });
      setProgress(80);
      const healthResults = await api.call('/api/lightsaber/compute-health', { changeData:gitData.changeData, complexityData, workspacePath });
      setProgress(90);
      const [todos, testCoverage] = await Promise.all([
        api.call('/api/lightsaber/find-todos', { workspacePath }),
        api.call('/api/lightsaber/test-coverage', { workspacePath })
      ]);
      setProgress(95);
      const combined = await api.call('/api/lightsaber/combine-analysis', { healthScores:healthResults.scores, todos, testCoverage, coupling:gitData.coupling });
      setHealthData(combined); setSummary(healthResults.summary); setLoading(false); setProgress(100);
    } catch (err) { setError(err.message); setLoading(false); }
  };

  if (loading) return (
    <div className="lightsaber-container"><div className="loading-screen">
      <div className="lightsaber-logo">⚔️ Lightsaber</div>
      <div className="progress-bar"><div className="progress-fill" style={{width:`${progress}%`}}></div></div>
      <div className="loading-status">{progress<20&&"Checking Git..."}{progress>=20&&progress<40&&"Analyzing commits..."}{progress>=40&&progress<60&&"Calculating complexity..."}{progress>=60&&"Computing health..."}</div>
    </div></div>
  );
  if (error) return (
    <div className="lightsaber-container"><div className="error-screen">
      <div className="error-icon">⚠️</div><div className="error-message">{error}</div>
      <button className="retry-button" onClick={analyzeHealth}>Retry</button>
    </div></div>
  );

  return (
    <div className="lightsaber-container">
      <div className="dashboard-header">
        <div className="title-section"><span className="logo">⚔️</span><h1>Lightsaber — Git Health Map</h1></div>
        <button className="refresh-button" onClick={analyzeHealth}>⟳ Refresh</button>
      </div>
      <div className="dashboard-main">
        <div className="graph-container">
          <ForceGraph data={healthData} onNodeClick={setSelectedFile} enablePulse={config.enablePulseAnimation} />
        </div>
        <div className="sidebar">
          <div className="summary-card"><h3>📊 Health Summary</h3>
            <div className="summary-stats">
              <div className="stat"><span className="stat-value">{summary?.totalFiles||0}</span><span className="stat-label">Files</span></div>
              <div className="stat"><span className="stat-value">{summary?.averageHealth||0}</span><span className="stat-label">Avg Health</span></div>
              <div className="stat hotspot-stat"><span className="stat-value">{summary?.hotspotCount||0}</span><span className="stat-label">Hotspots</span></div>
            </div>
          </div>
          <HealthChecks api={api} workspacePath={workspacePath} />
          <div className="hotspots-list"><h3>🔥 Top Hotspots</h3>
            {healthData?.hotspots?.slice(0,5).map(h => (
              <div key={h.path} className="hotspot-item" onClick={()=>setSelectedFile(h)} style={{borderLeftColor:h.color}}>
                <span className="hotspot-name">{h.path.split('/').pop()}</span>
                <span className="hotspot-score" style={{color:h.color}}>{h.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {selectedFile && <FileDetailPanel file={selectedFile} healthData={healthData} onClose={()=>setSelectedFile(null)} api={api} workspacePath={workspacePath} />}
    </div>
  );
}
