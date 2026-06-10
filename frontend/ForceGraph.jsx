// ForceGraph — D3 force-directed graph: nodes = files, edges = change coupling
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export default function ForceGraph({ data, onNodeClick, enablePulse=true }) {
  const svgRef = useRef(), containerRef = useRef();
  useEffect(() => {
    if (!data?.nodes?.length) return;
    const w = containerRef.current?.clientWidth||800, h = containerRef.current?.clientHeight||600;
    d3.select(svgRef.current).selectAll('*').remove();
    const svg = d3.select(svgRef.current).attr('width',w).attr('height',h).append('g');
    d3.select(svgRef.current).call(d3.zoom().scaleExtent([0.1,4]).on('zoom',e=>svg.attr('transform',e.transform)));

    const sim = d3.forceSimulation(data.nodes)
      .force('link', d3.forceLink(data.edges).id(d=>d.id).distance(d=>100-d.strength/2).strength(d=>d.strength/100))
      .force('charge', d3.forceManyBody().strength(-200)).force('center', d3.forceCenter(w/2,h/2))
      .force('collision', d3.forceCollide().radius(d=>Math.sqrt(d.radius)+10));

    const link = svg.append('g').selectAll('line').data(data.edges).enter().append('line')
      .attr('stroke',d=>d.strength>50?'#ff4444':'#888').attr('stroke-width',d=>Math.max(1,d.strength/20)).attr('stroke-opacity',0.6);

    const node = svg.append('g').selectAll('g').data(data.nodes).enter().append('g').call(d3.drag()
      .on('start',(e,d)=>{if(!e.active)sim.alphaTarget(0.3).restart();d.fx=d.x;d.fy=d.y;})
      .on('drag',(e,d)=>{d.fx=e.x;d.fy=e.y;})
      .on('end',(e,d)=>{if(!e.active)sim.alphaTarget(0);d.fx=null;d.fy=null;}));

    node.append('circle').attr('r',d=>Math.sqrt(d.radius)*3).attr('fill',d=>d.color)
      .attr('stroke',d=>d.status==='critical'?'#ff0000':'#333').attr('stroke-width',2)
      .attr('class',d=>`node node-${d.status}`).on('click',(e,d)=>{e.stopPropagation();onNodeClick(d);});
    if(enablePulse) node.filter(d=>d.status==='critical').select('circle').attr('class','node-critical pulse');
    node.append('text').attr('dx',12).attr('dy',4).text(d=>d.name).attr('font-size','10px').attr('fill','#ccc');
    node.filter(d=>d.testCoverage!==undefined).append('circle').attr('r',d=>Math.sqrt(d.radius)*3+4)
      .attr('fill','none').attr('stroke',d=>d.testCoverage>70?'#57c785':'#ff8c42').attr('stroke-width',2)
      .attr('stroke-dasharray',d=>{const c=2*Math.PI*(Math.sqrt(d.radius)*3+4),da=c*(d.testCoverage/100);return`${da} ${c-da}`;});
    node.filter(d=>d.todoCount>0).append('g').selectAll('circle').data(d=>Array(Math.min(d.todoCount,5)).fill(d)).enter()
      .append('circle').attr('cx',(_,i)=>-8+i*4).attr('cy',d=>-Math.sqrt(d.radius)*3-5).attr('r',2).attr('fill','#e6c35c');

    sim.on('tick',()=>{link.attr('x1',d=>d.source.x).attr('y1',d=>d.source.y).attr('x2',d=>d.target.x).attr('y2',d=>d.target.y);node.attr('transform',d=>`translate(${d.x},${d.y})`);});
    return () => sim.stop();
  }, [data, onNodeClick, enablePulse]);

  return (<div ref={containerRef} className="force-graph-container">
    <svg ref={svgRef} style={{width:'100%',height:'100%',background:'#1a1a2e'}}></svg>
    <div className="graph-controls"><span>💡 Drag nodes</span><span>🔴 Hotspot</span><span>🟢 Healthy</span><span>📊 Ring=Coverage</span></div>
  </div>);
}
