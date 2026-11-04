# Weftro V3 — Enterprise Knowledge Capture & Connected Intelligence Platform

[![Production](https://img.shields.io/badge/Production-Live-emerald)](https://weftro.com)
[![Status](https://img.shields.io/badge/System-Stable-brightgreen)](https://weftro.com)
[![License](https://img.shields.io/badge/License-Proprietary-blue.svg)](LICENSE)

Weftro is a full-stack enterprise platform combining asynchronous video recording, real-time collaboration, structured organizational memory, and connected knowledge retrieval into a unified workspace.

Built with an offline-first architecture, local relational database caching, and high-performance browser transcoding, Weftro enables distributed teams to capture, index, search, and act on organizational decisions with zero context loss.

---

## 🌟 Key Capabilities

### 1. HD Meeting & Asynchronous Video Capture
- **In-Browser Video & Screen Recording**: Picture-in-picture recording with native WebM duration cue recovery, client-side transcoding options (MP4, WebM, WAV), and dynamic bitrate scaling.
- **Interactive Player Experience**: Timestamped contextual comments, scrub-anchored reactions, live emoji floating animations, playback acceleration, and picture-in-picture support.
- **Enterprise Access Governance**: Granular privacy controls (Internal, External, Locked/Scheduled Release) with company tenant isolation.

### 2. Organizational Memory & Knowledge Graph
- **Unified Knowledge Mesh**: Automatically extracts and connects meetings, conversations, documents, and action items into a queryable knowledge graph.
- **Decision Ledger & Timeline**: Chronological log of team decisions, commitment tracking, and risk predictions extracted from team interactions.
- **Bi-Directional Context Linking**: 1-hop relationship discovery across tasks, spaces, documents, and recordings.

### 3. Orbit Intelligence & Unified Search
- **Dual-Mode Search Engine**:
  - **Answer Mode**: Evidence-grounded conversational synthesis citing verified company source documents and transcripts.
  - **Search Mode**: Fast, faceted keyword and entity indexing across organizational memory with instant previews.
- **Role-Based Scope Security**: Context assembly respects space permissions, company tenant boundaries, and access tiers prior to retrieval.

### 4. Enterprise Spaces & Real-Time Sync
- **Persistent Spaces**: Collaborative team spaces uniting video updates, shared knowledge vaults, and real-time activity feeds.
- **Offline-First Synchronization**: Relational SQLite storage via PowerSync with background sync queues, conflict resolution, and local mutation tracking.
- **Unified Communications**: Direct and channel messaging with threaded discussion, audio transcription, and persistent attachment vaults.

### 5. Developer Platform & Model Context Protocol (MCP)
- **Official MCP Server**: Connects external agents and desktop clients to Weftro knowledge graphs via standard `stdio` transport.
- **OpenAPI Connect Gateway & SDK**: Type-safe REST SDK (`@weftro/sdk`) for programmatically querying memories, indexing captures, and dispatching event webhooks.

---

## 🏗 System Architecture

```
weftro/
├── public/                       # Static assets, branding, and manifest
├── src/
│   ├── api/                      # Supabase client, PowerSync offline connector, REST gateways
│   ├── components/               # Production UI component library
│   │   ├── clipad/               # Space dashboard, team settings, knowledge views, modals
│   │   ├── layout/               # App layout, responsive sidebars, navigation, floating assistants
│   │   ├── ui/                   # Design system primitives (shadcn/ui-inspired Tailwind components)
│   │   └── video/                # Video rooms, WebRTC interfaces, timeline scrubbers
│   ├── hooks/                    # Reusable reactive state, media stream, and integration hooks
│   ├── lib/                      # Auth, RBAC, RAG synthesis, graph algorithms, format utilities
│   ├── pages/                    # Route-level views (Dashboard, Spaces, Watch, Search, Dev Platform)
│   └── services/                 # Telemetry, sync queues, audio processing pipelines
├── packages/
│   ├── weftro-mcp/               # Official Model Context Protocol (MCP) server
│   └── weftro-sdk/               # TypeScript SDK for Weftro Connect API
└── supabase/                     # PostgreSQL schemas, RLS policies, and Edge Functions
```

---

## 🛠 Tech Stack

- **Frontend & App Layer**: React 18, Vite 6, Tailwind CSS, Lucide Icons, Radix UI primitives.
- **Backend & Data**: Supabase (PostgreSQL 15 with Row Level Security, Storage, Edge Functions).
- **Offline Synchronization**: PowerSync (wa-sqlite WebAssembly driver + indexed database sync).
- **Media & Audio Engineering**: WebRTC, Web Audio API, FFmpeg WebAssembly transcoding, custom WebM EBML cue injection.
- **Search & Ingestion**: pg_trgm fuzzy matching, semantic indexing, hybrid retrieval pipelines.
- **Internationalization & Telemetry**: i18next, privacy-conscious event tracing, automated error boundaries.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **Package Manager**: npm v9+ (or pnpm)
- **Supabase Account**: A Supabase project with database and auth enabled

### 1. Clone & Install

```bash
git clone https://github.com/yussifson/weftro.git
cd weftro
npm install
```

### 2. Environment Configuration

Copy the example environment configuration and supply your credentials:

```bash
cp .env.example .env.local
```

Required keys:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_PAYSTACK_PUBLIC_KEY=your-paystack-key
```

### 3. Development Server

Start the local development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### 4. Production Build

Test compilation and build static production bundles:

```bash
npm run build
```

---

## 🛡 Security & Multi-Tenancy

- **Row Level Security (RLS)**: Enforced across all PostgreSQL tables. Tenant boundary queries filter strictly on `company_id`.
- **Role-Based Access Control (RBAC)**: Fine-grained permissions covering four organizational tiers: `Admin`, `Spaceman`, `Member`, and `Developer`.
- **Safe Media Delivery**: Direct signed storage streams with sanitized file headers, CORS enforcement, and content-type verification.

---

## 📄 License

Proprietary enterprise software. All rights reserved © 2026 Weftro Technologies.
