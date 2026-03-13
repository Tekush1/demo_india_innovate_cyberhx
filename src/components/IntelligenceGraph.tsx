import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Activity } from 'lucide-react';
import { Entity, Relationship, GraphData } from '../types';

interface GraphProps {
  data: GraphData;
  onNodeClick: (node: Entity) => void;
}

export const IntelligenceGraph: React.FC<GraphProps> = ({ data, onNodeClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<any, any> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !data.nodes.length) return;

    const updateDimensions = () => {
      if (!containerRef.current || !svgRef.current) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      if (width === 0 || height === 0) return;

      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();

      const g = svg.append("g");

      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => {
          g.attr("transform", event.transform);
        });

      zoomRef.current = zoom;
      svg.call(zoom);

      // Reset positions if they are wildly off or uninitialized
      data.nodes.forEach((n: any) => {
        if (n.x === undefined || isNaN(n.x)) n.x = width / 2;
        if (n.y === undefined || isNaN(n.y)) n.y = height / 2;
      });

      const nodeIds = new Set(data.nodes.map(n => n.id));
      const links = data.links
        .filter(l => nodeIds.has(l.source_id) && nodeIds.has(l.target_id))
        .map(l => ({
          ...l,
          source: l.source_id,
          target: l.target_id
        }));

      const simulation = d3.forceSimulation<any>(data.nodes)
        .force("link", d3.forceLink<any, any>(links).id(d => d.id).distance(150))
        .force("charge", d3.forceManyBody().strength(-600))
        .force("x", d3.forceX(width / 2).strength(0.1))
        .force("y", d3.forceY(height / 2).strength(0.1))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius(70));
      
      simulationRef.current = simulation;

      // Initial zoom to center
      svg.call(zoom.transform, d3.zoomIdentity);

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
        .attr("r", 14)
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
        .attr("stroke-width", 2)
        .attr("class", "node-circle");

      node.append("text")
        .attr("dx", 20)
        .attr("dy", 4)
        .text((d: any) => d.name)
        .attr("fill", "#fff")
        .attr("font-size", "12px")
        .attr("font-weight", "bold")
        .attr("font-family", "monospace")
        .attr("pointer-events", "none")
        .attr("style", "text-shadow: 0 0 4px rgba(0,0,0,0.8)");

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
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    
    resizeObserver.observe(containerRef.current);

    return () => {
      if (simulationRef.current) simulationRef.current.stop();
      resizeObserver.disconnect();
    };
  }, [data, onNodeClick]);

  return (
    <div ref={containerRef} className="w-full h-full bg-[#0a0a0a] overflow-hidden relative">
      <svg ref={svgRef} className="w-full h-full" />
      
      <button 
        onClick={() => {
          if (svgRef.current && zoomRef.current) {
            d3.select(svgRef.current)
              .transition()
              .duration(750)
              .call(zoomRef.current.transform, d3.zoomIdentity);
            
            if (simulationRef.current) {
              simulationRef.current.alpha(1).restart();
            }
          }
        }}
        className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/60 hover:text-white transition-all z-20 flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest"
      >
        <Activity className="w-3 h-3" />
        Recenter View
      </button>

      <div className="absolute bottom-4 left-4 flex flex-wrap gap-4 text-[10px] font-mono text-white/50 bg-black/40 p-2 rounded border border-white/10">
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> Geopolitics</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Economics</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /> Defense</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500" /> Technology</div>
      </div>
    </div>
  );
};
