# WEFTRO V3 — RAG & ORGANIZATIONAL INTELLIGENCE AUDIT REPORT
**Document Version:** 1.0.0  
**Phase:** Phase 0 (Audit & Implementation Roadmap)  
**Author:** Dedicated RAG & Organizational Intelligence Engineer  
**Status:** Audit Complete — Awaiting Explicit Approval Before Implementation  
**Target Repository:** `clipad` (`https://github.com/optavel/clipad.git`)  
**Database:** Supabase PostgreSQL with `pgvector`, Deno Edge Functions, React V3 Frontend  

---

## A. Executive Summary

Weftro is transitioning from an asynchronous video collaboration tool into a unified **AI-powered Organizational Memory and Intelligence Platform**. This audit investigated the codebase, schema migrations, backend Edge Functions, and frontend services to determine the current state of Retrieval-Augmented Generation (RAG), semantic search, contextual retrieval, and memory extraction.

### Core Audit Findings

1. **What Works Today:**
   - **Canonical Memory Schema (`clipad_v3_memories`):** A robust database table with taxonomy (`FACT`, `DECISION`, `COMMITMENT`, `PROCESS`, `POLICY`, etc.), tiers (`personal`, `team`, `organizational`), confidence scoring, lifecycle tracking (`ACTIVE`, `OUTDATED`, `SUPERSEDED`, `ARCHIVED`), and provenance metadata.
   - **Capture Queue & Asynchronous AI Extraction Pipeline (`process-capture` Edge Function):** Operational worker architecture using PostgreSQL locks (`claim_next_capture_job`) that reads raw captures/videos, invokes Cloudflare AI (`moonshotai/kimi-k3`), extracts structured entities, relationships, topics, and automatically generates `clipad_v3_memories` and `clipad_v3_smart_moments`.
   - **Connect API Gateway (`connect` Edge Function):** Strict tenant isolation, SHA-256 token hashing, RBAC/scopes (`search:read`, `memory:read`, `context:read`), distributed rate-limiting, and auditable search endpoints.
   - **Frontend Knowledge Synthesis (`SearchHub.jsx` & `buildOrgContext`):** High-level keyword search aggregation combining 13 distinct resource tables with SSE streaming answers from Cloudflare AI.

2. **What Exists but is Incomplete:**
   - **pgvector Vector Search:** The database migration `20260720120000_knowledge_intelligence_upgrade.sql` and `20260721000000_knowledge_chunking.sql` enabled the PostgreSQL `vector` extension and added `vector(768)` columns to `clipad_imported_knowledge` and `clipad_knowledge_chunks` with `match_documents` and `match_knowledge_chunks` RPC functions. However, **`clipad_v3_memories`, `clipad_v3_captures`, and `clipad_v3_smart_moments` have no vector columns or embeddings generated.**
   - **Semantic Search Abstraction (`clipadAIProvider.js`):** The `embed()` method exists as a stub returning `{ text, embedding: null, provider: 'Cloudflare-KimiCascade' }`. Embeddings are never calculated or stored during capture processing or memory creation.
   - **Search Unification:** `SearchHub.jsx` queries the database using SQL `ilike` operations against 13 separate tables in parallel, while the `connect` edge function searches `clipad_v3_memories` with `ilike`. There is no shared semantic or hybrid search layer.

3. **What is a Prototype / Simulation:**
   - **`clipad_knowledge_chunks`:** The chunking table and its `match_knowledge_chunks` RPC were created in migration `20260721000000_knowledge_chunking.sql`, but no active ingestion or background pipeline splits incoming documents or transcripts into chunks.
   - **Entity Knowledge Graph Search:** `clipad_v3_entities` and `clipad_v3_entity_relationships` are populated by `process-capture`, but retrieval in `SearchHub.jsx` and `connect/index.ts` does not traverse the graph for multi-hop reasoning.

4. **What is Missing:**
   - Unified vector embedding generation service (e.g. using Cloudflare's `@cf/baai/bge-base-en-v1.5` 768-dim model).
   - Reciprocal Rank Fusion (RRF) / Hybrid Search (BM25 Full-Text Search + pgvector Cosine Distance).
   - Document and transcript chunking engine (semantic or token-aware with parent-child provenance).
   - Source-grounded citation and hallucination verification guardrails.
   - Context window token budgeting and reranking.

5. **Key Architectural & Security Risks:**
   - **Brittle Lexical Search:** Queries like *"What did we decide about our cloud infrastructure?"* fail completely if the memory text says *"Migrated DB to pgvector"* without the exact string "cloud infrastructure".
   - **In-Memory JavaScript Filtering in `clipadMemoryService.js`:** `getMemories` fetches up to 50 memories from Supabase and applies space and text filters in client JavaScript rather than within the PostgreSQL query or RLS, which is inefficient and risks data leaks if client code is bypassed.
   - **Context Window Flooding:** `buildOrgContext` bundles up to 25 records from 13 tables into raw prompt text, risking prompt overflow, lost-in-the-middle phenomena, and expensive LLM tokens.

---

## B. Current Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              CURRENT RETRIEVAL ARCHITECTURE                             │
└────────────────────────────────────────────────────────────────────────────────────────┘

  [DATA INGESTION]
  Meetings / Transcripts   Documents / Uploads   Browser Captures   Connected Apps
            │                       │                   │                  │
            ▼                       ▼                   ▼                  ▼
    clipad_videos /          clipad_docs         clipad_v3_captures   clipad_imported_knowledge
    clipad_meeting_records                              │            (vector(768) - unpopulated)
            │                                           ▼
            │                                 clipad_v3_capture_queue
            │                                           │
            │                                           ▼
            │                             [Edge Worker: process-capture]
            │                                           │
            │                                  Cloudflare AI Kimi-k3
            │                                           │
            ▼                                           ▼
    ┌──────────────────────────────────────────────────────────────────────┐
    │                      DATABASE STORAGE (SUPABASE)                     │
    │                                                                      │
    │  clipad_v3_memories (Taxonomy, Tiers, FTS GIN index, NO vectors)     │
    │  clipad_v3_smart_moments (Decisions/Actions, FTS GIN index)          │
    │  clipad_v3_entities & clipad_v3_entity_relationships                 │
    │  clipad_knowledge_chunks (vector(768) table - unused in prod)        │
    └──────────────────────────────────┬───────────────────────────────────┘
                                       │
                ┌──────────────────────┴──────────────────────┐
                ▼                                             ▼
  [APPLICATION PATH: SearchHub.jsx]           [API PATH: connect/index.ts]
                │                                             │
      Parallel ILIKE queries                        SQL ILIKE on memories
      across 13 tables                              (company_id scoped)
                │                                             │
      buildOrgContext() prompt string                         │
                │                                             ▼
      Cloudflare AI Generation                     JSON Response envelope
      (Streamed via SSE to user)                  (Consumable by MCP / REST)
```

---

## C. Component Inventory

| Component Name | File Path & Symbol | Purpose | Actual Callers | Dependencies | Status | Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SearchHub UI & Engine** | `src/pages/clipad/SearchHub.jsx` (`runSearch`, `runAISynthesis`) | Primary in-app enterprise search interface with AI synthesis | App Router (`/search`) | `supabaseClient`, `cloudflareAI`, `clipadIntelligence` | **Operational** | Lexical `ILIKE` only; queries 13 tables simultaneously; no vector search |
| **Org Context Assembler** | `src/lib/clipadIntelligence.js` (`buildOrgContext`) | Compiles multi-table workspace context for LLM prompt | `SearchHub.jsx`, `VideoRoom.jsx`, `ClipadChat.jsx` | Supabase tables, `clipadMemoryService` | **Operational** | Hardcoded record limits; unbounded string concatenation; token budget not enforced |
| **Core Memory Service** | `src/lib/clipadMemoryService.js` (`createMemory`, `getMemories`, `supersedeMemory`) | CRUD and lifecycle management for `clipad_v3_memories` | `buildOrgContext`, `CapturePage.jsx` | `supabaseClient` | **Operational** | Applies security/space filters in client-side JS; no vector indexing |
| **AI Provider Abstraction** | `src/lib/clipadAIProvider.js` (`AIProvider.embed`, `generate`) | Modular interface for LLM text generation and vector embeddings | Internal libraries | `cloudflareAI.js` | **Incomplete** | `embed()` returns `embedding: null`; embeddings not implemented |
| **Cloudflare AI Gateway** | `src/lib/cloudflareAI.js` (`generateText`) | Direct client/proxy calls to Cloudflare Workers AI | `clipadIntelligence.js`, `SearchHub.jsx` | Cloudflare REST API / Vite proxy `/api/ai` | **Operational** | Only runs text models (`moonshotai/kimi-k3`); embedding endpoint uncalled |
| **Capture Processor** | `supabase/functions/process-capture/index.ts` | Serverless worker claiming jobs from queue and extracting intelligence | Supabase webhooks, cron, `CapturePage.jsx` | Supabase Service Role, Cloudflare AI | **Operational** | Extracts memories and graph entities, but does not compute or store embeddings |
| **Connect Gateway Search** | `supabase/functions/connect/index.ts` (`/api/v1/search`) | External REST & MCP-ready search endpoint | API clients, MCP servers, external integrations | Supabase Service Role, Connect Tokens | **Operational** | Scoped to `company_id`, but uses SQL `ilike` on memories without vector ranking |

---

## D. Data and Database Inventory

### 1. Vector Storage (Existing Schema)
- **`clipad_imported_knowledge`** (`supabase/migrations/20260720120000_knowledge_intelligence_upgrade.sql`):
  - Column: `embedding vector(768)`
  - Index: `idx_knowledge_embedding` using IVFFLAT (`lists = 100`)
  - RPC: `match_documents(query_embedding vector(768), match_threshold float, match_count int, filter_company_id uuid)`
  - *Status:* Schema exists, but records in production have `embedding = NULL`.
- **`clipad_knowledge_chunks`** (`supabase/migrations/20260721000000_knowledge_chunking.sql`):
  - Columns: `id`, `knowledge_id`, `company_id`, `chunk_index`, `content`, `token_count`, `embedding vector(768)`, `metadata jsonb`
  - Index: `idx_knowledge_chunks_embedding` using IVFFLAT
  - RPC: `match_knowledge_chunks(query_embedding vector(768), match_threshold float, match_count int, filter_company_id uuid)`
  - *Status:* Schema exists; currently zero automated chunking pipelines write to this table.

### 2. Organizational Memory Storage
- **`clipad_v3_memories`** (`supabase/migrations/20261001000000_clipad_v3_foundation.sql` & `20261001120000_clipad_v3_phase2_organizational_memory.sql`):
  - Primary canonical store for organizational knowledge.
  - Columns: `id`, `company_id`, `user_id`, `team_space_id`, `memory_tier`, `memory_type`, `title`, `content`, `summary`, `confidence_score`, `freshness_score`, `importance`, `status`, `superseded_by`, `source_type`, `source_id`, `permissions_policy`, `metadata`.
  - Indexes: Composite B-tree indexes on `(company_id, memory_tier, is_active)`, GIN Full-Text Search index on `(title || content || summary)`.
  - Missing: `embedding vector(768)`.

### 3. Context & Capture Tables
- **`clipad_v3_captures`**: Captures from text, desktop, web extension, and video transcripts.
- **`clipad_v3_capture_queue`**: Background job queue for idempotent capture processing.
- **`clipad_v3_context_sessions`**: Session groupings of related captures.
- **`clipad_v3_smart_moments`**: Key moments (decisions, action items, highlights) extracted from meetings and captures.
- **`clipad_v3_entities` & `clipad_v3_entity_relationships`**: Knowledge graph nodes and edges.

---

## E. Retrieval Pipeline Trace (End-to-End)

We traced the actual user query execution in [`SearchHub.jsx`](file:///c:/Users/USER/OneDrive/Documents/clipad/src/pages/clipad/SearchHub.jsx#L300-L440):

1. **User Types Query:** E.g., *"What is our decision on edge gateway architecture?"*
2. **Space Membership Resolution:** `fetchAccessibleSpaceIds(user)` queries `clipad_space_members` and public `clipad_spaces` to determine space IDs accessible to the caller.
3. **Scatter Database Queries (`Promise.all`):**
   - Fires 13 independent queries with `ilike('%edge gateway%')` across `clipad_docs`, `clipad_action_items`, `clipad_messages`, `clipad_meeting_records`, `clipad_decisions`, `clipad_videos`, `clipad_blockers`, `clipad_standups`, `clipad_imported_knowledge`, `profiles`, `clipad_v3_memories`, `clipad_v3_captures`, and `clipad_v3_smart_moments`.
4. **Context Gathering:**
   - Calls `buildOrgContext()` which executes another 14 database queries to assemble an organizational context string of recent activities, meetings, and active memories.
5. **Prompt Assembly:**
   - Concatenates the stringified matched records and the organizational context into a prompt payload.
6. **LLM Generation:**
   - Sends the payload to Cloudflare AI's `moonshotai/kimi-k3` model via `generateText`.
   - Streams chunks back using Server-Sent Events (SSE) and renders markdown in real-time.
7. **Session Storage:**
   - Inserts the query and assistant response into `orbit_chat_messages` for conversational persistence.

**Breakdown / Flaw in the Current Chain:**
- Step 3 relies strictly on substring matching (`ilike`). If a user asks *"How do we deploy our microservices?"*, but the memory content is *"We use Kubernetes pods for backend deployments"*, 0 records are returned, resulting in the LLM stating: *"No direct database records matched."*

---

## F. Security & Permission-Aware Retrieval Audit

### Authorization Architecture Analysis
1. **Tenant Isolation:**
   - Verified across the REST/Edge API: `POST /api/v1/search` strictly filters by `company_id = token.company_id`.
   - Verified via Live Acceptance Test Suite: Org 2 querying Org 1 memory content receives `0` results (Test Group 5 Passed).
2. **Row-Level Security (RLS):**
   - Database tables have RLS enabled with policies verifying `company_id = auth.jwt()->>'company_id'`.
3. **Vulnerabilities & Limitations Identified:**
   - **`clipadMemoryService.js` JS-Level Space Filter:** In `getMemories()`, the query filters `company_id` at the database level, but filters `team_space_id` in JavaScript:
     ```javascript
     // clipadMemoryService.js line 181
     if (mem.memory_tier === MEMORY_TIERS.TEAM && mem.team_space_id) {
       if (spaceIds.length > 0 && !spaceIds.includes(mem.team_space_id)) {
         return false; // Filtered in JS, NOT in SQL!
       }
     }
     ```
     *Impact:* Memories belonging to a private space within the same company are sent across the wire to the client browser before being excluded in JS.
     *Classification:* **VULNERABLE (Intra-tenant space privacy risk).** Must be pushed down into PostgreSQL RLS and SQL query parameters.
   - **Service-Role Bypasses:** Edge Functions (`connect` and `process-capture`) initialize Supabase with `SUPABASE_SERVICE_ROLE_KEY`. While necessary for background queue processing, manual `company_id` enforcement in application code is required to prevent accidental data leaks.

---

## G. Testing and Evidence

### Executed Tests
1. **Live Gateway Acceptance Test Suite (`scripts/phase3_acceptance_suite.cjs`):**
   - Target: `https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect`
   - Total Tests: 29
   - Passed: 29
   - Failed: 0
   - Verified:
     - Cross-tenant isolation (Org 1 vs Org 2).
     - Token lifecycle (expired, revoked, inactive application).
     - Scope enforcement (`search:read`, `memory:read`, `context:read`).
     - Resource bounds and input validation.
2. **Codebase Syntax & AST Validation:**
   - Validated via `esbuild` across all modified frontend and backend scripts.

---

## H. Technical Debt and Risks

| Risk / Debt | Severity | Impact | Urgency | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| **No vector embeddings on `clipad_v3_memories`** | **High** | Semantic queries fail completely; retrieval quality is crippled | **Immediate** | Add `embedding vector(768)` column to `clipad_v3_memories` and generate embeddings during capture processing |
| **Client-side space permission filtering** | **High** | Private space memories exposed over network to non-members | **Immediate** | Enforce space-level permissions in SQL `.in('team_space_id', spaceIds)` and PostgreSQL RLS |
| **13 Parallel Unindexed `ILIKE` Queries** | **Medium** | Severe database I/O and query latency degradation under scale | **High** | Replace scatter-gather queries with unified search over `clipad_v3_memories` and FTS indexes |
| **Lack of Document Chunking Pipeline** | **Medium** | Large documents and long transcripts cannot be semantically addressed | **Medium** | Connect document/video ingestion to semantic chunker writing to `clipad_knowledge_chunks` |
| **Unbounded Context Prompt Assembly** | **Medium** | Potential token truncation, hallucination, and high inference costs | **Medium** | Introduce dynamic token budgeting, top-k relevance cutoff, and reranking |

---

## I. Recommended Target Architecture

Weftro V3 must not rebuild its existing systems. Instead, it must connect the canonical `clipad_v3_memories` table to the existing `pgvector` infrastructure and unify search across the application and the Connect API.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               TARGET RAG ARCHITECTURE                                  │
└────────────────────────────────────────────────────────────────────────────────────────┘

  [SOURCES]
  Meetings • Transcripts • Documents • Messages • Browser Captures • Integrations
                                      │
                                      ▼
                        [INGESTION & CHUNKING ENGINE]
                  Structure-Aware & Timestamp-Aware Chunking
                                      │
                                      ▼
                     [VECTOR & EMBEDDING GENERATOR]
                 Cloudflare AI (@cf/baai/bge-base-en-v1.5)
                         768-Dimensional Embeddings
                                      │
                                      ▼
    ┌──────────────────────────────────────────────────────────────────────┐
    │                      DATABASE PERSISTENCE LAYER                      │
    │                                                                      │
    │  clipad_v3_memories:                                                 │
    │    - embedding vector(768) + HNSW Index                              │
    │    - Full-Text Search tsvector + GIN Index                           │
    │    - PostgreSQL RLS (Tenant + Space + User Scoping)                  │
    │                                                                      │
    │  clipad_knowledge_chunks:                                            │
    │    - embedding vector(768) + Parent Document Provenance              │
    └──────────────────────────────────┬───────────────────────────────────┘
                                       │
                                       ▼
                       [UNIFIED HYBRID RETRIEVAL CORE]
            Reciprocal Rank Fusion (RRF): Dense Vector + BM25 FTS
                     Permission-Aware SQL Query Pushdown
                                       │
                                       ▼
                         [CONTEXT ASSEMBLY & RERANKING]
              Relevance Thresholding • Deduplication • Token Budget
                                       │
                ┌──────────────────────┴──────────────────────┐
                ▼                                             ▼
  [IN-APP AI: SearchHub & Chat]                 [EXTERNAL: Connect API & MCP]
   Source Attribution & Citations               JSON Envelope & Vector Search
```

---

## J. Proposed Implementation Phases

### Phase 1: Embedding Infrastructure & Vector Memory Migration
- **Objective:** Enable true semantic search on Weftro's canonical memory store without disrupting existing data.
- **Existing Components Reused:** `pgvector` extension from migration `20260720120000`, Cloudflare AI infrastructure, `clipad_v3_memories`.
- **Scope:**
  1. Add `embedding vector(768)` and HNSW index to `clipad_v3_memories`.
  2. Implement `match_v3_memories` PostgreSQL RPC supporting hybrid similarity (Cosine Distance + Full-Text Search).
  3. Implement active server-side embedding generation in `process-capture` Edge Function using Cloudflare AI (`@cf/baai/bge-base-en-v1.5`).
- **Automated Tests:** Unit tests for embedding generation; DB test verifying `match_v3_memories` returns correct semantic matches with tenant isolation.
- **Rollback Plan:** Non-destructive column addition; easily reverted via SQL without impacting existing text queries.

### Phase 2: Permission-Aware Hybrid Retrieval Service
- **Objective:** Fix intra-tenant privacy leakage and provide a unified, secure retrieval service for both the UI and API.
- **Existing Components Reused:** `clipadMemoryService.js`, `fetchAccessibleSpaceIds`, `connect/index.ts`.
- **Scope:**
  1. Refactor `clipadMemoryService.js` to execute space filtering directly in PostgreSQL queries rather than client-side JavaScript.
  2. Create a unified hybrid search method `searchMemories({ query, companyId, spaceIds, userId, limit })` combining FTS + vector similarity.
  3. Update `POST /api/v1/search` in `connect/index.ts` to consume the hybrid search function.
- **Automated Tests:** Security tests verifying private space memories are never returned to non-space members; regression tests on Connect API.
- **Rollback Plan:** Standard git rollback; previous `ilike` query paths remain functional as fallback.

### Phase 3: Document Chunking & Ingestion Pipeline
- **Objective:** Split long meetings, transcripts, and documents into coherent, context-rich chunks with exact timestamp and parent provenance.
- **Existing Components Reused:** `clipad_knowledge_chunks` table, `clipad_videos`, `clipad_meeting_records`.
- **Scope:**
  1. Build a structure-aware chunker with 500-token windows, 50-token overlap, and heading/timestamp preservation.
  2. Trigger chunk generation when meeting recordings or documents are uploaded or processed.
  3. Populate `clipad_knowledge_chunks` with embeddings and link each chunk to its parent memory/document.
- **Automated Tests:** Chunker unit tests verifying boundary preservation, overlap, and token limits.

### Phase 4: Context Assembly, Citation Grounding & Evaluation Suite
- **Objective:** Ensure AI-generated responses are strictly grounded in retrieved organizational facts with clickable source citations.
- **Existing Components Reused:** `SearchHub.jsx`, `buildOrgContext`, `orbit_chat_messages`.
- **Scope:**
  1. Refactor `buildOrgContext` to use token-budgeted context assembly rather than unbounded array joining.
  2. Implement inline citation extraction `[Source: Title #timestamp]` in `SearchHub.jsx`.
  3. Establish an automated evaluation suite testing Recall@k, Mean Reciprocal Rank (MRR), and answer faithfulness against standardized test queries.
- **Automated Tests:** Evaluation test script running sample enterprise queries and scoring retrieval accuracy and citation validity.

---

## K. Coordination Plan with the API / MCP Agent

To maintain stability and prevent file conflicts:

1. **Exclusively Owned by RAG Workstream:**
   - `src/lib/clipadMemoryService.js` (Memory retrieval & search engine)
   - `src/lib/clipadAIProvider.js` (Embedding generation & model abstraction)
   - `src/lib/clipadIntelligence.js` (Context assembly & token budgeting)
   - Database migrations for vector columns, chunking, and search RPCs (`match_v3_memories`).
2. **Exclusively Owned by API / MCP Workstream:**
   - `supabase/functions/connect/index.ts` route handlers for apps, tokens, webhooks, and rate-limiting.
   - MCP protocol tools and schema definitions.
   - External developer documentation (`docs/openapi.yaml`, `docs/PHASE7_CONNECT.md`).
3. **Shared Interface Contract:**
   - **Endpoint:** `POST /api/v1/search`
   - **Contract:** The API agent defines the HTTP request/response envelope (`query`, `limit`, `results: [{ id, title, content, confidence, provenance }]`). The RAG agent provides the underlying database function (`match_v3_memories`) that executes the search. Neither agent modifies the HTTP schema without mutual alignment.

---

## L. Final Recommendation

**Recommendation:** **Refactor and extend the existing retrieval components (Option B).**

Weftro does **not** need a new vector database (Pinecone, Qdrant, Milvus, Weaviate) or an entirely new memory engine. Supabase already has `pgvector` enabled, Cloudflare Workers AI is already wired for serverless inference, and the `clipad_v3_memories` table has a clean schema with full provenance and taxonomy.

By:
1. Adding 768-dim embeddings to `clipad_v3_memories`,
2. Pushing space authorization down to SQL, and
3. Implementing Reciprocal Rank Fusion (hybrid semantic + full-text search),

Weftro will achieve high-precision, enterprise-grade organizational intelligence while maintaining 100% architectural continuity, zero customer disruption, and minimal infrastructure overhead.

---
*Report submitted for review. Implementation will commence only upon explicit user approval.*
