// FileDetailPanel — Detailed analysis for a single file
import React from 'react';

export default function FileDetailPanel({ file, healthData, onClose, api }) {
  const fh = healthData?.healthMap?.[file.id] || file;
  return (
    <div className="detail-panel-overlay" onClick={onClose}>
      <div className="detail-panel" onClick={e=>e.stopPropagation()}>
        <div className="panel-header">
          <span className="file-icon">📄</span><span className="file-path">{file.path}</span>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>
        <div className="health-badge" style={{background:fh.color}}>{fh.label} — Score: {fh.score}</div>
        <div className="metrics-section">
          {[{l:'Changes (90d)',v:`${fh.commitCount||0} commits`,p:fh.changeFrequency||0,c:'#ff8c42'},
            {l:'Complexity',v:`Cyclomatic: ${fh.cyclomaticComplexity||0}`,p:fh.complexityScore||0,c:'#ff4444'},
            {l:'Test Coverage',v:`${fh.testCoverage||0}%`,p:fh.testCoverage||0,c:'#57c785'},
            {l:'TODOs',v:`${fh.todoCount||0} found`,p:Math.min(100,(fh.todoCount||0)*10),c:'#e6c35c'}
          ].map(m => (
            <div key={m.l} className="metric">
              <div className="metric-label">{m.l}</div><div className="metric-value">{m.v}</div>
              <div className="metric-bar"><div className="bar-fill" style={{width:`${m.p}%`,background:m.c}}></div></div>
            </div>
          ))}
        </div>
        <div className="coupling-section"><h4>🔗 Change Coupling</h4>
          <div className="coupled-files">
            {healthData?.coupling?.filter(c=>c.file1===file.id||c.file2===file.id).slice(0,5).map(c => {
              const cf = c.file1===file.id ? c.file2 : c.file1;
              return <div key={cf} className="coupled-item"><span>{cf.split('/').pop()}</span><span>{Math.round(c.strength)}%</span></div>;
            }) || <div className="no-coupling">No strong coupling</div>}
          </div>
        </div>
        <div className="recommendations-section"><h4>📋 Recommendations</h4>
          <ul>{fh.score<20&&<li>🔴 CRITICAL: Refactor immediately.</li>}
            {fh.score>=20&&fh.score<40&&<li>🟠 Hotspot: Schedule refactor within 2 weeks.</li>}
            {fh.changeFrequency>70&&fh.complexityScore>60&&<li>⚡ Split into smaller modules.</li>}
            {(fh.testCoverage||0)<50&&<li>🧪 Add tests (coverage {fh.testCoverage||0}%).</li>}
            {(fh.todoCount||0)>5&&<li>📝 Address {fh.todoCount} TODOs.</li>}
            {fh.cyclomaticComplexity>50&&<li>🔧 Reduce cyclomatic complexity.</li>}
          </ul>
        </div>
        <div className="action-buttons">
          <button className="action-btn" style={{background:'#007acc',color:'#fff'}} onClick={()=>api.call('/api/desktop/open-file',{method:'POST',body:JSON.stringify({path:file.path})})}>📂 Open</button>
          <button className="action-btn" style={{background:'#2a2a3e',color:'#e8e8f0'}} onClick={()=>window.open(`https://github.com/${file.path}`,'_blank')}>📜 History</button>
          <button className="action-btn" style={{background:'#2a2a3e',color:'#57c785'}} onClick={onClose}>✅ Done</button>
        </div>
      </div>
    </div>
  );
}
