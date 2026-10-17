# Weftro V3 — Shared Cross-Agent Dependencies Record

**Coordinating Agents:**
- `AGENT-API-MCP`: API, MCP & Developer Platform Engineering Agent
- `AGENT-RAG`: RAG, Retrieval & Organizational Intelligence Agent

**Date Established:** 2026-10-17  
**Protocol Compliance:** Mandatory Coordination before changing shared files or database models.

---

## 1. Shared Database Schemas & Ownership Boundary

| Table Name | Producing / Governing Agent | Consuming Agent | Coordination Rule |
|---|---|---|---|
| `clipad_v3_memories` | `AGENT-RAG` (Memory engine, embeddings, vector indexing, retrieval logic) | `AGENT-API-MCP` (Exposes via `/api/v1/memories` & `/api/v1/search`) | No column or constraint changes without prior compatibility review. API gateway must not alter internal memory structure. |
| `clipad_v3_captures` | `AGENT-API-MCP` (Phase 2 capture queue & ingestion pipeline) | `AGENT-RAG` (Source ingestion, chunking, context binding) | Provenance structure and capture statuses (`QUEUED`, `PROCESSING`, `PROCESSED`) are canonical. |
| `clipad_v3_context_sessions` | Shared Core | Both Agents | Session identifier links captures, memories, and conversational grounding. |
| `clipad_v3_smart_moments` | Shared Intelligence Core | Both Agents | Meeting & video insights. Auto-conversion to memory must preserve provenance. |
| `clipad_v3_entities` & `clipad_v3_entity_relationships` | `AGENT-RAG` (Knowledge graph builder) | `AGENT-API-MCP` (Exposes via `/api/v1/entities/:id`) | Normalized entity schema with strict tenant company ID enforcement. |
| `clipad_v3_events` | Shared Core | Both Agents | Centralized audit log. Neither agent may log plain-text passwords or secret tokens. |

---

## 2. Shared Code Files & Services

1. `src/lib/clipadConnectService.js`:
   - Acts as the internal domain interface between the REST API / MCP layer and underlying intelligence retrieval.
   - Any modifications to `getAuthorizedContext` must maintain backward compatibility with `tests/ClipadV3Phase7Connect.test.js`.

2. `src/lib/clipadIntelligenceGovernanceService.js`:
   - Enforces space membership, tenant boundaries, and privacy tiers (`PERSONAL`, `TEAM`, `ORGANIZATIONAL`).
   - Both agents must pass query contexts through governance filters.

3. `src/lib/clipadMemoryService.js`:
   - Normalized memory operations.

---

## 3. Integration Decision Log
- **2026-10-17 [Decision 3-01]:** REST API Gateway implemented as a thin routing and authentication layer in `supabase/functions/connect/index.ts`. All retrieval logic references database tables with RLS and company ID constraints. No duplicate RAG or memory engine was created.
- **2026-10-17 [Decision 3-02]:** Rate limiting implemented at PostgreSQL layer (`clipad_v3_api_rate_limits` and `check_api_rate_limit` RPC) to guarantee multi-instance consistency across Cloudflare Edge Runtime workers.
