// HealthChecks — One-click health check buttons
import React, { useState } from 'react';

export default function HealthChecks({ api, workspacePath }) {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});

  const run = async (name, label, fn) => {
    setLoading(p=>({...p,[name]:true}));
    try { const r = await fn(); setResults(p=>({...p,[name]:r})); } catch(e) { setResults(p=>({...p,[name]:{error:e.message}})); }
    finally { setLoading(p=>({...p,[name]:false})); }
  };

  const checks = [
    { name:'todos', label:'🔍 Find TODOs', fn:async()=>{const r=await api.call('/api/lightsaber/find-todos',{workspacePath}); return {summary:`${r.todos.length} TODOs in ${Object.keys(r.byFile).length} files`}; }},
    { name:'coverage', label:'🧪 Test Coverage', fn:async()=>{const r=await api.call('/api/lightsaber/test-coverage',{workspacePath}); return {summary:`${r.ratio}% coverage, ${r.uncoveredFiles?.length||0} untested`}; }},
    { name:'hotspots', label:'🔥 Find Hotspots', fn:async()=>{const r=await api.call('/api/lightsaber/find-hotspots',{workspacePath}); return {summary:`${r.hotspots.length} hotspots. Worst: ${r.hotspots[0]?.path} (${r.hotspots[0]?.score})`}; }},
    { name:'coupling', label:'🔗 Coupling Check', fn:async()=>{const r=await api.call('/api/lightsaber/coupling-clusters',{workspacePath}); return {summary:`${r.clusters.length} clusters (${r.clusters.reduce((a,b)=>a+b.size,0)} files)`}; }},
    { name:'report', label:'📊 Full Report', fn:async()=>{const r=await api.call('/api/lightsaber/full-report',{workspacePath}); const b=new Blob([JSON.stringify(r,null,2)],{type:'application/json'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=`lightsaber-${Date.now()}.json`;a.click();URL.revokeObjectURL(u);return {summary:'Report downloaded'}; }}
  ];

  return (<div className="health-checks-card"><h3>⚡ One-Click Checks</h3>
    <div className="checks-list">{checks.map(c=>(
      <div key={c.name} className="check-item">
        <button className={`check-button${loading[c.name]?' loading':''}`} onClick={()=>run(c.name,c.label,c.fn)} disabled={loading[c.name]}>{loading[c.name]?'⟳':c.label}</button>
        {results[c.name]&&!results[c.name].error&&<div className="check-result">{results[c.name].summary||'Done'}</div>}
        {results[c.name]?.error&&<div className="check-error">⚠️ {results[c.name].error}</div>}
      </div>
    ))}</div>
  </div>);
}
