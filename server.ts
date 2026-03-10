import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const db = new Database("ontology.db");

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS entities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    domain TEXT NOT NULL,
    metadata TEXT
  );

  CREATE TABLE IF NOT EXISTS relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    strength REAL DEFAULT 0.5,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(source_id) REFERENCES entities(id),
    FOREIGN KEY(target_id) REFERENCES entities(id)
  );

  CREATE TABLE IF NOT EXISTS feeds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    domain TEXT NOT NULL,
    source_url TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/graph", (req, res) => {
    const nodes = db.prepare("SELECT * FROM entities").all();
    const links = db.prepare("SELECT * FROM relationships").all();
    res.json({ nodes, links });
  });

  app.get("/api/feeds", (req, res) => {
    const feeds = db.prepare("SELECT * FROM feeds ORDER BY timestamp DESC LIMIT 50").all();
    res.json(feeds);
  });

  app.post("/api/ingest", async (req, res) => {
    const { content, domain, source_url } = req.body;
    
    // Save feed
    const stmt = db.prepare("INSERT INTO feeds (content, domain, source_url) VALUES (?, ?, ?)");
    stmt.run(content, domain, source_url || null);

    res.json({ status: "ingested", message: "Processing started in background (simulated for this demo)" });
  });

  // Seed data if empty
  const entityCount = db.prepare("SELECT COUNT(*) as count FROM entities").get() as { count: number };
  if (entityCount.count === 0) {
    const seedEntities = [
      { id: "india", name: "India", type: "Country", domain: "Geopolitics" },
      { id: "usa", name: "USA", type: "Country", domain: "Geopolitics" },
      { id: "china", name: "China", type: "Country", domain: "Geopolitics" },
      { id: "isro", name: "ISRO", type: "Organization", domain: "Technology" },
      { id: "semiconductors", name: "Semiconductor Supply Chain", type: "Economic Sector", domain: "Economics" },
      { id: "quad", name: "QUAD", type: "Alliance", domain: "Defense" },
    ];

    const insertEntity = db.prepare("INSERT INTO entities (id, name, type, domain) VALUES (@id, @name, @type, @domain)");
    seedEntities.forEach(e => insertEntity.run(e));

    const seedLinks = [
      { source_id: "india", target_id: "usa", type: "STRATEGIC_PARTNER", description: "Growing defense and tech cooperation" },
      { source_id: "india", target_id: "quad", type: "MEMBER", description: "Key Indo-Pacific security pillar" },
      { source_id: "usa", target_id: "quad", type: "MEMBER", description: "Leading partner in QUAD" },
      { source_id: "india", target_id: "isro", type: "GOVERNS", description: "National space agency" },
      { source_id: "india", target_id: "semiconductors", type: "INVESTS_IN", description: "India Semiconductor Mission" },
      { source_id: "china", target_id: "semiconductors", type: "DOMINATES", description: "Major manufacturing hub" },
      { source_id: "usa", target_id: "china", type: "COMPETITION", description: "Trade and tech rivalry" },
    ];

    const insertLink = db.prepare("INSERT INTO relationships (source_id, target_id, type, description) VALUES (@source_id, @target_id, @type, @description)");
    seedLinks.forEach(l => insertLink.run(l));
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve("dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
