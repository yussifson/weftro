# Weftro V3 — Phase 5 Manual Verification Guide
## Model Context Protocol (MCP) Server & Developer Platform UI

**Project:** Weftro V3  
**Agent ID:** `AGENT-API-MCP`  
**Phase:** 5 (Model Context Protocol Server)  
**Target Gateway:** `https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect`  
**MCP Package:** `@weftro/mcp-server` (`packages/weftro-mcp`)  

---

### Prerequisites
1. Navigate to the Weftro Web Application in your browser (`http://localhost:5173` or deployed URL).
2. Log in with your standard developer/admin account.

---

### Step 1: Navigate to Developer Platform MCP Tab
1. In the main application sidebar, click **Developers** (marked with the `Code2` icon).
2. Notice the horizontal subnavigation bar now features a dedicated **MCP Server** tab (with the `Cpu` icon) between **Apps & Credentials** and **Developer AI Assistant**.
3. Click **MCP Server** (`/developers/mcp`).
4. **Verification Checks:**
   - Confirm the page renders the **Model Context Protocol (MCP) Server** header with the `Phase 5 Production` status badge.
   - Confirm the three security architecture cards display:
     - **Zero Direct DB Access** (Gateway routing)
     - **Granular Scopes** (Scoped token enforcement)
     - **Read-Only Safety** (Safe retrieval constraints)
   - Confirm the **Supported MCP Tools Catalog** lists all 9 authorized read-only tools:
     1. `search_organizational_memory`
     2. `query_organizational_context`
     3. `get_memory_by_id`
     4. `list_organizational_memories`
     5. `get_entity_by_id`
     6. `list_captures`
     7. `get_capture_by_id`
     8. `list_smart_moments`
     9. `get_source_provenance`

---

### Step 2: Issue an MCP Scoped Access Token
1. In the Developer Platform subnavigation, click **Apps & Credentials** (`/developers`).
2. Under **Registered Applications**, select or create an application.
3. Under **Generate Scoped Token**:
   - Give the token a name (e.g. `Cursor MCP Token`).
   - Check the required read scopes (e.g. `search:read`, `memory:read`, `context:read`, `captures:read`, `moments:read`, `entities:read`, `sources:read`).
   - Click **Generate Token**.
4. **Copy the generated token string** (`cpd_...`). Remember this token is shown once.

---

### Step 3: Test Copyable Client Configuration
1. Return to the **MCP Server** tab (`/developers/mcp`).
2. Locate the **Cursor IDE & Claude Desktop** configuration card.
3. Click the **Copy JSON** button.
4. Verify the button briefly displays a green checkmark with `Copied`.
5. Paste into your editor and verify it contains the proper JSON structure:
   ```json
   {
     "mcpServers": {
       "weftro": {
         "command": "node",
         "args": ["packages/weftro-mcp/index.js"],
         "env": {
           "WEFTRO_API_URL": "https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect",
           "WEFTRO_TOKEN": "<YOUR_SCOPED_CONNECT_TOKEN>"
         }
       }
     }
   }
   ```

---

### Step 4: Live Stdio MCP Test (Terminal or AI Client)
To verify the MCP server responds correctly to standard JSON-RPC:

1. Open your terminal in the repository root.
2. Run the automated Phase 5 verification test suite:
   ```bash
   node scripts/phase5_mcp_test_suite.cjs
   ```
3. Observe all 18 assertions pass:
   - MCP initialization and capability advertising (9 tools).
   - Zod schema input validation (rejects empty queries or invalid UUIDs).
   - Live authorized organizational retrieval through the Edge Gateway.
   - Authentication failure when `WEFTRO_TOKEN` is missing or invalid.
   - Granular scope blocking (unscoped operations return `FORBIDDEN`).
   - Strict cross-tenant isolation (Tenant 2 receives 0 memories or 404 for Tenant 1 data).
   - Cryptographic token and secret scrubbing from error envelopes.

---

### Step 5: Regression Verification
Run the Phase 4 and Phase 3 suites to guarantee zero regression:
```bash
node scripts/phase4_acceptance_suite.cjs
node scripts/phase3_acceptance_suite.cjs
```
Verify both suites report 100% pass rate.
