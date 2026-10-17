# Weftro V3 — Phase 7 Developer Experience & Hardening Manual Test Guide

**Target Gateway:** `https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect`  
**Web Surface:** Developer Platform (`/developers`)  
**Scope:** Developer documentation, API Explorer interactive execution, credentials management, MCP server integration, and webhook configuration.

---

## 1. Documentation & Knowledge Verification

1. Navigate to **Developer Platform -> API Documentation** (`/developers/docs`).
2. Verify that all 30 endpoints are listed with correct HTTP methods, descriptions, and required scopes:
   - Apps: `GET`, `POST`, `GET :id`, `PATCH :id`, `DELETE :id`, `POST :id/rotate-secret`
   - Tokens: `GET`, `POST`, `POST :id/revoke`
   - Core API: `/search`, `/context/query`, `/memories`, `/memories/:id`, `/entities/:id`, `/captures`, `/captures/:id`, `/captures/:id/status`, `/smart-moments`, `/sources/:id`
   - Webhooks: `GET`, `POST`, `GET :id`, `PATCH :id`, `DELETE :id`, `POST :id/rotate-secret`, `GET :id/deliveries`, `POST :id/test`, `POST deliveries/:id/retry`
3. Click **Copy** on any cURL snippet and ensure the copied text formats cleanly without syntax defects.

---

## 2. Interactive API Explorer Verification

1. Navigate to **Developer Platform -> API Explorer** (`/developers/explorer`).
2. Test the newly added templates:
   - Select **Context Query**: Verify default JSON payload `{ "session_id": "00000000-..." }` loads into the editor.
   - Select **List Webhooks**: Verify method is `GET` and target path is `/api/v1/webhooks`.
   - Select **Register Webhook**: Verify default JSON payload with `endpoint_url`, `events`, and `description` loads.
3. Paste an active scoped token (`cpd_...`) into the Token Input box.
4. Click **Run Request** and observe the live response status code and JSON tree formatting.

---

## 3. Model Context Protocol (MCP) Setup Verification

1. Navigate to **Developer Platform -> MCP Server** (`/developers/mcp`).
2. Verify that the client configuration cards match the official `@weftro/mcp-server` instructions in `packages/weftro-mcp/README.md`.
3. In a terminal, run the local stdio test:
   ```bash
   WEFTRO_TOKEN="cpd_your_token" node packages/weftro-mcp/index.js
   ```
4. Send an initialize payload:
   ```json
   {"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"manual-test","version":"1.0.0"}}}
   ```
5. Confirm server replies with `weftro-mcp-server` and protocol `2024-11-05`.

---

## 4. Webhook Security & Redaction Verification

1. Navigate to **Developer Platform -> Webhooks** (`/developers/webhooks`).
2. Click **Create Webhook** and attempt to register `http://127.0.0.1:8000`.
3. Confirm the UI displays an error indicating that localhost/loopback addresses are prohibited.
4. Register a valid HTTPS webhook (e.g. `https://httpbin.org/post`).
5. Verify the one-time signing secret modal appears with prefix `whsec_`.
6. Click **Send Test Event** and verify that the delivery status shows `Delivered` and that the headers preview displays `X-Weftro-Signature`.
7. Refresh the page and confirm the plain signing secret is never displayed in subsequent table views.

---

## 5. Security & Boundary Checks

- [ ] Confirm no client secrets or raw tokens appear in console logs.
- [ ] Confirm that tokens revoked in `/developers` immediately cease to function in the API Explorer.
- [ ] Confirm cross-tenant data isolation remains enforced across all interactive queries.
