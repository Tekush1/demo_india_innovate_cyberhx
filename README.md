# Ontology Engine - Strategic Intelligence Platform

A full-stack strategic intelligence platform that uses Gemini AI to map global events, geopolitical shifts, and technological breakthroughs into a unified strategic graph.

## Core Functions

### `App.tsx` (Main Application Logic)

#### `ingestProjectData(text: string)`
- **Purpose**: Specifically designed to analyze project descriptions.
- **Logic**: Uses Gemini AI to extract a "Chain of Innovation" (Problem -> Solution -> Team -> Technology).
- **Output**: Populates the graph with project-specific nodes and relationships.

#### `handleSearch(e: React.FormEvent)`
- **Purpose**: Unified search and AI analysis interface.
- **Logic**: 
  - First, it attempts an exact match with existing graph nodes.
  - If no match is found, it triggers a "Strategic Analysis" using Gemini AI with **Google Search Grounding**.
- **Output**: Provides a detailed AI insight explaining how the query connects to the current global ontology.

#### `fetchGlobalNews()`
- **Purpose**: Real-time intelligence synchronization.
- **Logic**: 
  - Uses Gemini AI with Google Search to find major global shifts from the last 24 hours.
  - Extracts entities (Countries, Organizations, People) and relationships (Alliances, Conflicts, Breakthroughs).
- **Output**: Updates the global graph and adds a new entry to the intelligence feed.

#### `handleIngest(e: React.FormEvent)`
- **Purpose**: General-purpose data ingestion.
- **Logic**: Processes any raw text input, saves it to the feed, and uses AI to extract strategic entities and relationships.
- **Output**: Expands the ontology graph based on user-provided reports or articles.

#### `generateStrategicInsight()`
- **Purpose**: High-level strategic synthesis.
- **Logic**: Analyzes the current state of the graph nodes to provide a professional insight into national strategic advantages (specifically focused on the India-Global context).
- **Output**: Displays a concise strategic summary in the UI.

#### `handleLogin()` / `handleLogout()`
- **Purpose**: User authentication management.
- **Logic**: Uses Firebase Authentication (Google Provider) to manage secure access to the platform.

---

### `IntelligenceGraph.tsx` (Visualization Component)

#### `updateDimensions()`
- **Purpose**: Core rendering and responsive logic for the D3 graph.
- **Logic**: 
  - Calculates container dimensions and clears previous SVG elements.
  - Initializes the D3 force simulation with specific constraints (`forceLink`, `forceManyBody`, `forceCenter`, `forceCollide`).
  - Sets up the zoom behavior and initial centering.

#### `dragstarted()`, `dragged()`, `dragended()`
- **Purpose**: Interactive node manipulation.
- **Logic**: Standard D3 drag handlers that allow users to manually reposition nodes while maintaining the simulation's physical integrity.

#### `Recenter View (Button Handler)`
- **Purpose**: Navigation recovery.
- **Logic**: Uses D3 transitions to smoothly reset the zoom level and pan the graph back to the center of the viewport.

---

### `firebase.ts` (Infrastructure & Security)

#### `handleFirestoreError(error, operationType, path)`
- **Purpose**: Standardized error reporting and security auditing.
- **Logic**: Catches Firestore permission or network errors and bundles them with detailed authentication context (UID, email verification status, etc.) for debugging.
- **Output**: Logs a structured JSON error to the console and throws a descriptive error for the application's Error Boundary.

---

## Data Models

- **Entity**: Represents a node in the graph (e.g., "India", "Semiconductor Industry", "NATO").
- **Relationship**: Represents a link between entities (e.g., "India" -> "PARTNER" -> "USA").
- **Feed**: A chronological record of ingested intelligence and news syncs.
