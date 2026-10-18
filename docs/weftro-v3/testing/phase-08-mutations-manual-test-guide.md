# Weftro V3 — Phase 8 Mutations & Write Actions Manual Verification Guide

**Workstream:** Developer Platform / Connect API / MCP  
**Gateway Base URL:** `https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect`  
**Phase:** Phase 8: Deferred Write & Act Mutations  
**Target Scopes:** `captures:write`, `memory:write`

---

## 1. Prerequisites

1. Active developer access token with write scopes (`captures:write` and/or `memory:write`).
   - If generating via developer dashboard or CLI:
     ```bash
     # Token format starts with cpd_
     export WEFTRO_TOKEN="cpd_your_scoped_connect_token_here"
     export WEFTRO_API_URL="https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect"
     ```
2. Terminal or HTTP client (cURL, Postman, HTTPie) with TLS 1.3 support.

---

## 2. Test Step 1: Ingest External Capture (`POST /api/v1/captures`)

### A. Authorized Ingestion
```bash
curl -i -X POST "$WEFTRO_API_URL/api/v1/captures" \
  -H "Authorization: Bearer $WEFTRO_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: idemp-cap-test-001" \
  -d '{
    "title": "Autonomous Agent Verification Finding",
    "content": "Observed that distributed rate limiting successfully prevents edge burst concurrency.",
    "source_type": "cli_agent",
    "capture_type": "NOTE"
  }'
```
**Expected Response:** `HTTP 201 Created`
```json
{
  "data": {
    "id": "<UUID>",
    "company_id": "<CALLER_ORG_ID>",
    "title": "Autonomous Agent Verification Finding",
    "content": "Observed that distributed rate limiting successfully prevents edge burst concurrency.",
    "status": "QUEUED",
    "queue_job": {
      "status": "queued",
      "attempt_count": 0,
      "max_attempts": 3
    }
  },
  "meta": {
    "api_version": "v1",
    "idempotency_key": "idemp-cap-test-001"
  }
}
```

### B. Idempotent Retry Test
Repeat the exact same cURL command with `Idempotency-Key: idemp-cap-test-001`.  
**Expected Response:** `HTTP 200 OK` (Replay) or `HTTP 201 Created` with identical capture ID and no duplicate database rows.

### C. Scope Enforcement
Attempt the request using a read-only token (`captures:read`).  
**Expected Response:** `HTTP 403 Forbidden` (`FORBIDDEN: Insufficient scope: captures:write required`).

---

## 3. Test Step 2: Create Verified Organizational Memory (`POST /api/v1/memories`)

### A. Authorized Creation
```bash
curl -i -X POST "$WEFTRO_API_URL/api/v1/memories" \
  -H "Authorization: Bearer $WEFTRO_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: idemp-mem-test-001" \
  -d '{
    "title": "Stateless Edge Token Validation Pattern",
    "content": "API tokens are validated by comparing SHA-256 hashes against clipad_v3_connect_tokens while inheriting company_id boundary.",
    "memory_type": "FACT",
    "memory_tier": "organizational",
    "confidence_score": 0.98,
    "importance": 0.9
  }'
```
**Expected Response:** `HTTP 201 Created`
```json
{
  "data": {
    "id": "<UUID>",
    "company_id": "<CALLER_ORG_ID>",
    "title": "Stateless Edge Token Validation Pattern",
    "status": "ACTIVE",
    "confidence_score": 0.98,
    "importance": 0.9
  },
  "meta": {
    "api_version": "v1",
    "idempotency_key": "idemp-mem-test-001"
  }
}
```

### B. Cross-Tenant Linked Resource Rejection
Attempt to create memory linking a `source_id` belonging to a foreign tenant.  
**Expected Response:** `HTTP 404 Not Found` (`Linked source_id was not found or belongs to another tenant organization`).

---

## 4. Test Step 3: MCP Tool Invocations via Stdio

Run the MCP server locally with write token:
```bash
export WEFTRO_TOKEN="cpd_write_token_here"
node packages/weftro-mcp/index.js
```

Send JSON-RPC tool calls via stdin:
```json
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"create_capture","arguments":{"content":"Captured note via MCP tool","source_type":"claude_desktop"}}}
```
**Expected Output:** JSON-RPC result containing newly created capture record with `status: "QUEUED"`.

```json
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"create_organizational_memory","arguments":{"title":"MCP Verified Fact","content":"MCP client writes inherit organization context automatically.","memory_type":"FACT"}}}
```
**Expected Output:** JSON-RPC result containing verified active memory.
