import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Globe, 
  Zap, 
  Shield, 
  TrendingUp, 
  Cpu, 
  Activity, 
  Search, 
  Plus, 
  ChevronRight,
  Info,
  BrainCircuit,
  Terminal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { IntelligenceGraph } from './components/IntelligenceGraph';
import { Entity, Feed, GraphData } from './types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export default function App() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [selectedNode, setSelectedNode] = useState<Entity | null>(null);
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestText, setIngestText] = useState("");
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    fetchGraph();
    fetchFeeds();
  }, []);

  const fetchGraph = async () => {
    const res = await fetch('/api/graph');
    const data = await res.json();
    setGraphData(data);
  };

  const fetchFeeds = async () => {
    const res = await fetch('/api/feeds');
    const data = await res.json();
    setFeeds(data);
  };

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingestText.trim()) return;
    setIsIngesting(true);
    try {
      await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: ingestText, domain: 'General' })
      });
      setIngestText("");
      fetchFeeds();
    } finally {
      setIsIngesting(false);
    }
  };

  const generateStrategicInsight = async () => {
    setIsAnalyzing(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Based on the following global ontology graph nodes: ${graphData.nodes.map(n => n.name).join(", ")}, 
        provide a high-level strategic insight for India's national advantage in the current global landscape. 
        Focus on the intersection of technology, defense, and economics. Keep it concise and professional.`,
      });
      setAiInsight(response.text || "Unable to generate insights at this time.");
    } catch (err) {
      console.error(err);
      setAiInsight("Error connecting to intelligence core.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#050505] text-white font-sans overflow-hidden">
      {/* Sidebar - Control Panel */}
      <aside className="w-80 border-r border-white/10 flex flex-col bg-[#0a0a0a] z-20">
        <div className="p-6 border-bottom border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <BrainCircuit className="text-emerald-500 w-6 h-6" />
            <h1 className="text-lg font-bold tracking-tighter uppercase italic">Ontology Engine</h1>
          </div>
          <p className="text-[10px] text-white/40 font-mono uppercase tracking-widest">Global Intelligence Graph v1.0</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Ingestion Section */}
          <section>
            <label className="text-[10px] font-mono uppercase text-white/50 mb-2 block">Data Ingestion</label>
            <form onSubmit={handleIngest} className="space-y-2">
              <textarea 
                value={ingestText}
                onChange={(e) => setIngestText(e.target.value)}
                placeholder="Paste intelligence report, news feed, or strategic update..."
                className="w-full h-24 bg-black border border-white/10 rounded p-2 text-xs focus:outline-none focus:border-emerald-500/50 transition-colors font-mono resize-none"
              />
              <button 
                disabled={isIngesting}
                className="w-full py-2 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isIngesting ? <Activity className="animate-spin w-3 h-3" /> : <Plus className="w-3 h-3" />}
                Ingest Stream
              </button>
            </form>
          </section>

          {/* Real-time Feeds */}
          <section>
            <label className="text-[10px] font-mono uppercase text-white/50 mb-2 block">Live Intelligence Feed</label>
            <div className="space-y-2">
              {feeds.length === 0 ? (
                <p className="text-[10px] text-white/30 italic">No active streams...</p>
              ) : (
                feeds.map(feed => (
                  <div key={feed.id} className="p-2 bg-white/5 border-l-2 border-emerald-500 rounded-r text-[10px] font-mono">
                    <div className="flex justify-between text-white/40 mb-1">
                      <span>{feed.domain}</span>
                      <span>{new Date(feed.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="line-clamp-2">{feed.content}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="p-4 border-t border-white/10 bg-black/50">
          <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
            <span>SYSTEM STATUS</span>
            <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> OPERATIONAL</span>
          </div>
        </div>
      </aside>

      {/* Main Content - Graph Visualization */}
      <main className="flex-1 relative flex flex-col">
        <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start pointer-events-none z-10">
          <div className="bg-black/80 backdrop-blur-md border border-white/10 p-4 rounded-lg pointer-events-auto">
            <h2 className="text-2xl font-bold tracking-tighter uppercase italic flex items-center gap-2">
              <Globe className="w-6 h-6 text-blue-500" />
              Unified Strategic Graph
            </h2>
            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-1 text-[10px] font-mono text-white/60">
                <Activity className="w-3 h-3" /> {graphData.nodes.length} Entities
              </div>
              <div className="flex items-center gap-1 text-[10px] font-mono text-white/60">
                <TrendingUp className="w-3 h-3" /> {graphData.links.length} Relations
              </div>
            </div>
          </div>

          <div className="flex gap-2 pointer-events-auto">
            <button 
              onClick={generateStrategicInsight}
              disabled={isAnalyzing}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-widest rounded flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20"
            >
              {isAnalyzing ? <Activity className="animate-spin w-3 h-3" /> : <Zap className="w-3 h-3" />}
              AI Strategic Analysis
            </button>
          </div>
        </header>

        <div className="flex-1">
          <IntelligenceGraph 
            data={graphData} 
            onNodeClick={(node) => setSelectedNode(node)} 
          />
        </div>

        {/* Bottom Panel - AI Insights */}
        <AnimatePresence>
          {aiInsight && (
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[800px] bg-black/90 border border-blue-500/30 backdrop-blur-xl p-6 rounded-xl shadow-2xl z-30"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2 text-blue-400">
                  <BrainCircuit className="w-5 h-5" />
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em]">Strategic Intelligence Report</span>
                </div>
                <button onClick={() => setAiInsight(null)} className="text-white/40 hover:text-white">
                  <Plus className="w-4 h-4 rotate-45" />
                </button>
              </div>
              <div className="text-sm leading-relaxed text-white/90 font-mono">
                {aiInsight}
              </div>
              <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center text-[10px] font-mono text-white/30">
                <span>SOURCE: GEMINI-3-FLASH-PREVIEW</span>
                <span>CONFIDENCE: HIGH</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Right Sidebar - Entity Details */}
      <AnimatePresence>
        {selectedNode && (
          <motion.aside 
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            className="w-96 border-l border-white/10 bg-[#0a0a0a] p-6 z-20 overflow-y-auto"
          >
            <div className="flex justify-between items-start mb-8">
              <div>
                <span className="text-[10px] font-mono uppercase text-white/40 tracking-widest">{selectedNode.type}</span>
                <h3 className="text-2xl font-bold tracking-tighter italic uppercase">{selectedNode.name}</h3>
              </div>
              <button onClick={() => setSelectedNode(null)} className="p-2 hover:bg-white/5 rounded">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-8">
              <section>
                <label className="text-[10px] font-mono uppercase text-white/50 mb-3 block flex items-center gap-2">
                  <Info className="w-3 h-3" /> Metadata
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-white/5 rounded border border-white/5">
                    <span className="text-[9px] text-white/30 block mb-1">DOMAIN</span>
                    <span className="text-xs font-mono">{selectedNode.domain}</span>
                  </div>
                  <div className="p-3 bg-white/5 rounded border border-white/5">
                    <span className="text-[9px] text-white/30 block mb-1">STATUS</span>
                    <span className="text-xs font-mono text-emerald-400">ACTIVE</span>
                  </div>
                </div>
              </section>

              <section>
                <label className="text-[10px] font-mono uppercase text-white/50 mb-3 block flex items-center gap-2">
                  <TrendingUp className="w-3 h-3" /> Active Relationships
                </label>
                <div className="space-y-2">
                  {graphData.links
                    .filter(l => l.source_id === selectedNode.id || l.target_id === selectedNode.id)
                    .map(link => {
                      const otherId = link.source_id === selectedNode.id ? link.target_id : link.source_id;
                      const otherNode = graphData.nodes.find(n => n.id === otherId);
                      return (
                        <div key={link.id} className="p-3 bg-white/5 rounded border border-white/5 hover:border-white/20 transition-colors">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold text-blue-400">{link.type}</span>
                            <span className="text-[9px] text-white/30">{Math.round(link.strength * 100)}%</span>
                          </div>
                          <p className="text-xs font-mono text-white/80">{otherNode?.name}</p>
                          <p className="text-[10px] text-white/40 mt-1 italic">{link.description}</p>
                        </div>
                      );
                    })}
                </div>
              </section>

              <section className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-emerald-400 mb-2">
                  <Terminal className="w-4 h-4" />
                  <span className="text-[10px] font-mono uppercase">Strategic Note</span>
                </div>
                <p className="text-xs text-white/70 leading-relaxed italic">
                  Entity is currently flagged as a high-priority node in the {selectedNode.domain} sector. 
                  Recommend monitoring for shifts in relationship strength.
                </p>
              </section>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
