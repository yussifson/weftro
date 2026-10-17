# Agent API & MCP Engineering Status Record

**Agent ID:** `AGENT-API-MCP`  
**Agent Name:** API & MCP Engineering Agent  
**Workstream:** API / MCP / Developer Platform  
**Current Phase:** Phase 5: Model Context Protocol (MCP) Server  
**Status:** `AWAITING MANUAL TESTING`  
**Current Branch:** `main`  
**Last Verified Commit:** `202e12e`  
**Target Edge Function:** `https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect`  
**Deployment Region:** `eu-west-3`

---

## 1. Assigned Responsibilities
- REST API gateway routes under `/api/v1/*`.
- Token authentication, cryptographic hashing (`SHA-256`), and scope verification.
- Developer application management (`/api/v1/apps`, `/api/v1/apps/:id`, `/api/v1/apps/:id/rotate-secret`).
- Scoped API access token issuance and revocation (`/api/v1/tokens`, `/api/v1/tokens/:id/revoke`).
- Server-side distributed rate limiting (`clipad_v3_api_rate_limits`, `check_api_rate_limit`).
- Tenant isolation and permission enforcement.
- OpenAPI 3.1 specification (`docs/openapi.yaml`).
- Developer credentials UI, application management, and developer dashboard (`ConnectSettings.jsx`).
- Model Context Protocol (MCP) server package (`packages/weftro-mcp`) and Developer MCP UI (`DeveloperMcp.jsx`).
- Webhook delivery engine (Upcoming Phase 6).

---

## 2. Phase History & Status Matrix
| Phase | Title | Status | Approval Date / Evidence |
|---|---|---|---|
| **Phase 1** | Baseline & Integrity Fixes | `APPROVED` | Verified baseline, restored queries, tests active |
| **Phase 2** | Durable Capture Queue & Worker | `APPROVED` | Deployed `process-capture`, PG queue active |
| **Phase 3** | Unified REST API Gateway | `APPROVED` | Deployed `connect`, 29/29 automated live tests passed (`14877b3`) |
| **Phase 4** | Developer Identity, Apps & Scopes | `APPROVED` | Deployed `connect`, 18/18 live acceptance tests passed, 29/29 Phase 3 regression tests passed |
| **Phase 5** | Production MCP Server | `AWAITING MANUAL TESTING` | Implemented `@weftro/mcp-server`, 18/18 Phase 5 live tests passed, 18/18 Phase 4 tests passed, 29/29 Phase 3 tests passed |
| **Phase 6** | Webhook Delivery Engine | `BLOCKED` | Awaiting Phase 5 approval |

---

## 3. Verified Artifacts & Documentation
- **OpenAPI 3.1 Contract:** `docs/openapi.yaml`
- **Phase 4 In-App Manual Test Guide:** `docs/weftro-v3/testing/phase-04-in-app-manual-test-guide.md`
- **Live Acceptance Suite Script:** `scripts/phase4_acceptance_suite.cjs` (18/18 PASSED)
- **Phase 3 Live Regression Suite:** `scripts/phase3_acceptance_suite.cjs` (29/29 PASSED)

---

## 4. Shared Dependencies with AGENT-RAG
- `clipad_v3_memories`: Memory storage and retrieval. AGENT-RAG manages chunking, embedding, and hybrid retrieval; AGENT-API-MCP exposes the read-only contract.
- `clipad_v3_captures`: Capture repository and provenance metadata.
- `clipad_v3_smart_moments`: Meeting and video insight nodes.
- `clipad_v3_context_sessions`: Context binding.
- `clipad_v3_connect_apps`: Application registry and client metadata.
- `clipad_v3_connect_tokens`: Scoped access tokens and rate limit parameters.
- `clipad_v3_events`: Audit trail for intelligence queries and API access.

---

## 5. Next Permitted Action
Awaiting user in-app manual testing results and explicit phase approval for Phase 4. No Phase 5 (MCP) code may be written until authorized.

