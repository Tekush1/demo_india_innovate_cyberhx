import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Link, 
  useLocation,
  useNavigate
} from 'react-router-dom';
import { 
  Globe, 
  Zap, 
  Shield, 
  TrendingUp, 
  Cpu, 
  Activity, 
  Search, 
  Plus, 
  Link2,
  ChevronRight,
  Info,
  BrainCircuit,
  Terminal,
  LogOut,
  LogIn,
  LayoutDashboard,
  Network
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { IntelligenceGraph } from './components/IntelligenceGraph';
import { Entity, Feed, GraphData, Relationship } from './types';
import { 
  db, 
  auth, 
  handleFirestoreError, 
  OperationType 
} from './firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  setDoc, 
  doc, 
  query, 
  orderBy, 
  limit, 
  Timestamp 
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User
} from 'firebase/auth';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [selectedNode, setSelectedNode] = useState<Entity | null>(null);
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestText, setIngestText] = useState("");
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [isFetchingNews, setIsFetchingNews] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setIsAuthReady(true);
      
      if (u) {
        // Ensure user document exists for RBAC
        try {
          await setDoc(doc(db, 'users', u.uid), {
            email: u.email,
            role: u.email === 'kushdwivediKD@gmail.com' ? 'admin' : 'user',
            lastLogin: new Date().toISOString()
          }, { merge: true });
        } catch (error) {
          console.error("User sync error", error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const ingestProjectData = async (text: string) => {
    if (!user) return;
    setIsAnalyzing(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return;

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Process this project description and extract the "Chain of Innovation". 
        Identify the Problem, the Solution, the Team, and the Technology.
        Create a chain of entities and relationships that maps this project's logic.
        
        Project Text: "${text}"
        
        Return JSON with "entities" and "relationships".
        Entity types: Team, Member, Problem, Solution, Technology.
        Relationship types: SOLVES, DEVELOPED_BY, USES, FEATURES.`,
        config: { responseMimeType: "application/json" }
      });

      const extracted = JSON.parse(response.text || "{}");
      
      if (extracted.entities) {
        for (const ent of extracted.entities) {
          try {
            const entityData = {
              id: ent.id || ent.name?.toLowerCase().replace(/\s+/g, '_'),
              name: ent.name || ent.id,
              type: ent.type || 'General',
              domain: 'Project',
              metadata: ent.metadata || {}
            };
            await setDoc(doc(db, 'entities', entityData.id), entityData, { merge: true });
          } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, `entities/${ent.id}`);
          }
        }
      }

      if (extracted.relationships) {
        for (const rel of extracted.relationships) {
          try {
            const relData = {
              source_id: rel.source_id || rel.source,
              target_id: rel.target_id || rel.target,
              type: rel.type,
              description: rel.description || '',
              timestamp: new Date().toISOString()
            };
            await addDoc(collection(db, 'relationships'), relData);
          } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, 'relationships');
          }
        }
      }

      setAiInsight(`Project "cyberhx" Ingested. Chain of Logic established: ${extracted.entities?.length || 0} nodes connected. View the graph to see the Team -> Solution -> Technology mapping.`);
    } catch (err) {
      console.error("Ingestion error", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !user) return;

    // Check if it's a simple entity match first
    const exactMatch = graphData.nodes.find(n => 
      n.name.toLowerCase() === searchQuery.toLowerCase() || 
      n.id.toLowerCase() === searchQuery.toLowerCase()
    );

    if (exactMatch) {
      setSelectedNode(exactMatch);
      setSearchQuery("");
      return;
    }

    // Otherwise, treat as a complex query
    setIsSearching(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        setAiInsight("Intelligence core offline: API Key not detected.");
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Query: "${searchQuery}"
        
        Context: You are a strategic intelligence analyst. Use the current ontology graph (Nodes: ${graphData.nodes.map(n => n.name).join(", ")}) and external real-time data to answer the query. 
        Explain how different entities in the graph are connected to this topic. "Connect the dots" between geopolitics, economics, and technology.`,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      setAiInsight(response.text || "No intelligence found for this query.");
      setSearchQuery("");
    } catch (err) {
      console.error("Search error", err);
      setAiInsight("Intelligence search failed.");
    } finally {
      setIsSearching(false);
    }
  };

  const fetchGlobalNews = async () => {
    if (!user) return;
    setIsFetchingNews(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        setAiInsight("Intelligence core offline: API Key not detected.");
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "Search for the latest global strategic, geopolitical, and technological news from the last 24 hours. Focus on major shifts, alliances, and breakthroughs.",
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      const newsText = response.text || "";
      
      // Process the news text to extract entities
      const extractionResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Extract entities and their relationships from the following news summary for a global strategic ontology.
        News: "${newsText}"
        
        Return the result as a JSON object with two arrays: "entities" and "relationships".
        Entity structure: { "id": "lowercase_id", "name": "Display Name", "type": "Organization/Country/Person/etc", "domain": "Strategic" }
        Relationship structure: { "source_id": "id1", "target_id": "id2", "type": "RELATION_TYPE", "description": "Short description", "strength": 0.5 }
        
        Only return valid JSON.`,
        config: { responseMimeType: "application/json" }
      });

      const extracted = JSON.parse(extractionResponse.text || "{}");
      
      // Save Feed
      await addDoc(collection(db, 'feeds'), {
        content: `Global News Sync: ${newsText.slice(0, 200)}...`,
        domain: 'Global News',
        timestamp: new Date().toISOString(),
        authorId: user.uid
      });

      if (extracted.entities) {
        for (const ent of extracted.entities) {
          try {
            const entityData = {
              id: ent.id || ent.name?.toLowerCase().replace(/\s+/g, '_'),
              name: ent.name || ent.id,
              type: ent.type || 'General',
              domain: ent.domain || 'Strategic',
              metadata: ent.metadata || {}
            };
            await setDoc(doc(db, 'entities', entityData.id), entityData, { merge: true });
          } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, `entities/${ent.id}`);
          }
        }
      }

      if (extracted.relationships) {
        for (const rel of extracted.relationships) {
          try {
            const relData = {
              source_id: rel.source_id || rel.source,
              target_id: rel.target_id || rel.target,
              type: rel.type,
              description: rel.description || '',
              strength: rel.strength || 0.5,
              timestamp: new Date().toISOString()
            };
            await addDoc(collection(db, 'relationships'), relData);
          } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, 'relationships');
          }
        }
      }

      setAiInsight(`News Sync Complete. Processed ${extracted.entities?.length || 0} entities and ${extracted.relationships?.length || 0} relationships from recent global reports.`);
    } catch (err) {
      console.error("News fetch error", err);
      setAiInsight("Failed to sync global news. Check connection.");
    } finally {
      setIsFetchingNews(false);
    }
  };

  // Real-time Data Sync
  useEffect(() => {
    if (!user) return;

    const unsubEntities = onSnapshot(collection(db, 'entities'), (snapshot) => {
      const nodes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Entity));
      setGraphData(prev => ({ ...prev, nodes }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'entities'));

    const unsubRels = onSnapshot(collection(db, 'relationships'), (snapshot) => {
      const links = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Relationship));
      setGraphData(prev => ({ ...prev, links }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'relationships'));

    const unsubFeeds = onSnapshot(
      query(collection(db, 'feeds'), orderBy('timestamp', 'desc'), limit(20)), 
      (snapshot) => {
        const f = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Feed));
        setFeeds(f);
      }, 
      (error) => handleFirestoreError(error, OperationType.LIST, 'feeds')
    );

    return () => {
      unsubEntities();
      unsubRels();
      unsubFeeds();
    };
  }, [user]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login failed", err);
    }
  };

  const handleLogout = () => signOut(auth);

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingestText.trim() || !user) return;
    setIsIngesting(true);
    
    try {
      // 1. Save Feed
      const feedData = {
        content: ingestText,
        domain: 'General',
        timestamp: new Date().toISOString(),
        authorId: user.uid
      };
      await addDoc(collection(db, 'feeds'), feedData);

      // 2. AI Extraction
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Extract entities and their relationships from the following text for a global strategic ontology.
          Text: "${ingestText}"
          
          Return the result as a JSON object with two arrays: "entities" and "relationships".
          Entity structure: { "id": "lowercase_id", "name": "Display Name", "type": "Organization/Country/Person/etc", "domain": "General" }
          Relationship structure: { "source_id": "id1", "target_id": "id2", "type": "RELATION_TYPE", "description": "Short description", "strength": 0.5 }
          
          Only return valid JSON.`,
          config: { responseMimeType: "application/json" }
        });

        const extracted = JSON.parse(response.text || "{}");
        
        if (extracted.entities) {
          for (const ent of extracted.entities) {
            await setDoc(doc(db, 'entities', ent.id), ent, { merge: true });
          }
        }

        if (extracted.relationships) {
          for (const rel of extracted.relationships) {
            await addDoc(collection(db, 'relationships'), {
              ...rel,
              timestamp: new Date().toISOString()
            });
          }
        }
      }

      setIngestText("");
    } catch (err) {
      console.error("Ingestion error", err);
    } finally {
      setIsIngesting(false);
    }
  };

  const generateStrategicInsight = async () => {
    if (!user) return;
    setIsAnalyzing(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        setAiInsight("Intelligence core offline: API Key not detected.");
        return;
      }
      
      const ai = new GoogleGenAI({ apiKey });
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

  if (!isAuthReady) {
    return (
      <div className="h-screen bg-[#050505] flex items-center justify-center">
        <Activity className="animate-spin text-emerald-500 w-8 h-8" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen bg-[#050505] flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full bg-[#0a0a0a] border border-white/10 p-8 rounded-2xl text-center shadow-2xl"
        >
          <BrainCircuit className="w-16 h-16 text-emerald-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold tracking-tighter uppercase italic mb-2">Ontology Engine</h1>
          <p className="text-white/40 text-sm mb-8">Access the Global Strategic Intelligence Graph</p>
          <button 
            onClick={handleLogin}
            className="w-full py-4 bg-white text-black font-bold uppercase tracking-widest rounded-xl hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center gap-3"
          >
            <LogIn className="w-5 h-5" />
            Authenticate with Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#050505] text-white font-sans overflow-hidden">
      {/* Sidebar - Control Panel */}
      <aside className="w-80 border-r border-white/10 flex flex-col bg-[#0a0a0a] z-20">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BrainCircuit className="text-emerald-500 w-6 h-6" />
              <h1 className="text-lg font-bold tracking-tighter uppercase italic">Ontology Engine</h1>
            </div>
            <button onClick={handleLogout} className="text-white/40 hover:text-red-400 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <img src={user.photoURL || ''} className="w-8 h-8 rounded-full border border-white/10" referrerPolicy="no-referrer" />
            <div className="overflow-hidden">
              <p className="text-[10px] font-bold truncate">{user.displayName}</p>
              <p className="text-[8px] text-white/40 font-mono truncate uppercase tracking-widest">Operator: {user.uid.slice(0, 8)}</p>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          <Link 
            to="/" 
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-widest transition-all group ${location.pathname === '/' ? 'bg-emerald-500/10 text-emerald-500' : 'text-white/40 hover:bg-white/5'}`}
          >
            <LayoutDashboard className={`w-4 h-4 transition-transform group-hover:scale-110 ${location.pathname === '/' ? 'text-emerald-500' : 'text-white/30'}`} />
            Intelligence Center
          </Link>
          <Link 
            to="/graph" 
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-widest transition-all group ${location.pathname === '/graph' ? 'bg-blue-500/10 text-blue-500' : 'text-white/40 hover:bg-white/5'}`}
          >
            <Network className={`w-4 h-4 transition-transform group-hover:scale-110 ${location.pathname === '/graph' ? 'text-blue-500' : 'text-white/30'}`} />
            Strategic Graph
          </Link>
        </nav>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Ingestion Section */}
          <section>
            <label className="text-[10px] font-mono uppercase text-white/50 mb-2 block">Data Ingestion</label>
            <form onSubmit={handleIngest} className="space-y-2">
              <textarea 
                value={ingestText}
                onChange={(e) => setIngestText(e.target.value)}
                placeholder="Paste intelligence report..."
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
            <span>CLOUD SYNC</span>
            <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> CONNECTED</span>
          </div>
        </div>
      </aside>

      <main className="flex-1 relative flex flex-col overflow-hidden">
        <Routes>
          <Route path="/" element={
            <div className="p-12 max-w-5xl mx-auto w-full space-y-12 overflow-y-auto h-full scrollbar-hide">
              <header className="space-y-4">
                <div className="flex items-center gap-3 text-emerald-500">
                  <Zap className="w-8 h-8" />
                  <span className="text-xs font-mono uppercase tracking-[0.4em]">Operational Status: Active</span>
                </div>
                <h1 className="text-7xl font-bold tracking-tighter uppercase italic leading-none">
                  Intelligence <br /> <span className="text-emerald-500">Center</span>
                </h1>
                <p className="text-white/40 max-w-xl text-lg font-light leading-relaxed">
                  Real-time global event tracking and strategic analysis. Monitor cascading effects across industries, markets, and nations.
                </p>
              </header>

              <div className="grid grid-cols-3 gap-6">
                <div className="bg-[#0a0a0a] border border-white/10 p-8 rounded-2xl space-y-4 hover:border-emerald-500/30 transition-colors group">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                    <Activity className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold uppercase italic tracking-tight">{graphData.nodes.length}</h3>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono">Active Entities</p>
                  </div>
                </div>
                <div className="bg-[#0a0a0a] border border-white/10 p-8 rounded-2xl space-y-4 hover:border-blue-500/30 transition-colors group">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold uppercase italic tracking-tight">{graphData.links.length}</h3>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono">Strategic Links</p>
                  </div>
                </div>
                <div className="bg-[#0a0a0a] border border-white/10 p-8 rounded-2xl space-y-4 hover:border-purple-500/30 transition-colors group">
                  <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold uppercase italic tracking-tight">Level 4</h3>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono">Security Clearance</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={fetchGlobalNews}
                  disabled={isFetchingNews}
                  className="flex-1 py-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-[0.2em] rounded-2xl transition-all shadow-2xl shadow-emerald-500/20 flex items-center justify-center gap-4"
                >
                  {isFetchingNews ? <Activity className="animate-spin w-6 h-6" /> : <Globe className="w-6 h-6" />}
                  Sync Global News
                </button>
                <button 
                  onClick={generateStrategicInsight}
                  disabled={isAnalyzing}
                  className="flex-1 py-6 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-[0.2em] rounded-2xl transition-all shadow-2xl shadow-blue-500/20 flex items-center justify-center gap-4"
                >
                  {isAnalyzing ? <Activity className="animate-spin w-6 h-6" /> : <Zap className="w-6 h-6" />}
                  AI Strategic Analysis
                </button>
              </div>

              <div className="bg-[#0a0a0a] border border-white/10 p-8 rounded-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-white/40">Recent Intelligence Feeds</h3>
                  <Link to="/graph" className="text-[10px] text-emerald-500 hover:underline flex items-center gap-1">
                    View Full Graph <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="space-y-4">
                  {feeds.slice(0, 5).map(feed => (
                    <div key={feed.id} className="group cursor-pointer">
                      <div className="flex justify-between text-[10px] font-mono text-white/20 mb-1 group-hover:text-emerald-500/50 transition-colors">
                        <span>{feed.domain}</span>
                        <span>{new Date(feed.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-white/60 group-hover:text-white transition-colors leading-relaxed">{feed.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          } />
          <Route path="/graph" element={
            <div className="w-full h-full relative">
              <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start pointer-events-none z-10">
                <div className="bg-black/80 backdrop-blur-md border border-white/10 p-4 rounded-lg pointer-events-auto flex flex-col gap-3 min-w-[300px]">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold tracking-tighter uppercase italic flex items-center gap-2">
                      <Globe className="w-5 h-5 text-blue-500" />
                      Unified Strategic Graph
                    </h2>
                  </div>
                  
                  <form onSubmit={handleSearch} className="relative group">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isSearching ? 'text-blue-500 animate-pulse' : 'text-white/30 group-focus-within:text-blue-400'}`} />
                    <input 
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search entities or ask 'Why is oil price high?'..."
                      className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-xs font-mono focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                    />
                    {isSearching && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Activity className="w-3 h-3 animate-spin text-blue-500" />
                      </div>
                    )}
                  </form>

                  <div className="flex gap-4">
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
                    onClick={() => ingestProjectData(`Team Name: cyberhx Kushagra Dwivedi – Team Leader, Technocrats Institute of Technology (Excellence), Bhopal Nikhil Mahalik – Team Member, Technocrats Institute of Technology & Science (TIT&S), Bhopal Satyam Sharma – Team Member, Technocrats Institute of Technology (Excellence), Bhopal Samit Pal – Team Member, Technocrats Institute of Technology (Excellence), Bhopal PROBLEM STATEMENT Global events are highly interconnected... SOLUTION Build a Real-Time Global Intelligence Graph... TECHNOLOGY USED Python, FastAPI, Neo4j, React, D3.js...`)}
                    disabled={isAnalyzing}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase tracking-widest rounded flex items-center gap-2 transition-all shadow-lg shadow-purple-500/20"
                  >
                    {isAnalyzing ? <Activity className="animate-spin w-3 h-3" /> : <Link2 className="w-3 h-3" />}
                    Process cyberhx Project
                  </button>
                </div>
              </header>

              <div className="w-full h-full">
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

              {/* Node Detail Panel */}
              <AnimatePresence>
                {selectedNode && (
                  <motion.aside 
                    initial={{ x: 400 }}
                    animate={{ x: 0 }}
                    exit={{ x: 400 }}
                    className="absolute top-0 right-0 w-96 h-full border-l border-white/10 bg-[#0a0a0a] p-6 z-40 overflow-y-auto"
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
          } />
        </Routes>
      </main>
      </div>
  );
}
