import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Entity, Relationship, GraphData } from '../types';

interface GraphProps {
  data: GraphData;
  onNodeClick: (node: Entity) => void;
}

export const IntelligenceGraph: React.FC<GraphProps> = ({ data, onNodeClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !data.nodes.length) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    const links = data.links.map(l => ({
      ...l,
      source: l.source_id,
      target: l.target_id
    }));

    const simulation = d3.forceSimulation<any>(data.nodes)
      .force("link", d3.forceLink<any, any>(links).id(d => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(60));

    const link = g.append("g")
      .attr("stroke", "#444")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", (d: any) => Math.sqrt(d.strength || 0.5) * 2);

    const node = g.append("g")
      .selectAll("g")
      .data(data.nodes)
      .join("g")
      .attr("cursor", "pointer")
      .on("click", (event, d: any) => onNodeClick(d))
      .call(d3.drag<any, any>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    node.append("circle")
      .attr("r", 12)
      .attr("fill", (d: any) => {
        switch (d.domain) {
          case 'Geopolitics': return '#ef4444';
          case 'Economics': return '#10b981';
          case 'Defense': return '#3b82f6';
          case 'Technology': return '#f59e0b';
          default: return '#6b7280';
        }
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);

    node.append("text")
      .attr("dx", 16)
      .attr("dy", 4)
      .text((d: any) => d.name)
      .attr("fill", "#fff")
      .attr("font-size", "12px")
      .attr("font-family", "monospace")
      .attr("pointer-events", "none");

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => (d.source as any).x)
        .attr("y1", (d: any) => (d.source as any).y)
        .attr("x2", (d: any) => (d.target as any).x)
        .attr("y2", (d: any) => (d.target as any).y);

      node
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [data, onNodeClick]);

  return (
    <div ref={containerRef} className="w-full h-full bg-[#0a0a0a] overflow-hidden relative">
      <svg ref={svgRef} className="w-full h-full" />
      <div className="absolute bottom-4 left-4 flex flex-wrap gap-4 text-[10px] font-mono text-white/50 bg-black/40 p-2 rounded border border-white/10">
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> Geopolitics</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Economics</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /> Defense</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500" /> Technology</div>
      </div>
    </div>
  );
};
