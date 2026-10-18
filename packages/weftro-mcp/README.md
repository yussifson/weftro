# @weftro/mcp-server

Official Model Context Protocol (MCP) server for **Weftro Organizational Memory & Intelligence**.

The `@weftro/mcp-server` allows AI clients (Cursor, Claude Desktop, Windsurf, LangChain, autonomous agents) to securely connect to Weftro via the standard `stdio` transport to search institutional memory, traverse knowledge graph entities, inspect capture records, and retrieve meeting/video smart moments.

---

## 1. Architecture & Trust Boundary

- **Zero Direct Database Connections**: The MCP server never talks directly to PostgreSQL. Every tool call delegates through the versioned **Weftro Connect API Gateway**.
- **Tenant Isolation**: All queries inherit the tenant organization (`company_id`) bound to the authorized Connect token. Callers cannot specify or override tenant boundaries.
- **Granular Scopes**: Operations require specific permissions (`search:read`, `memory:read`, `context:read`, `captures:read`, `moments:read`, `entities:read`, `sources:read`).
- **Secret Scrubbing**: Sensitive credentials (`cpd_...`, `secret_...`, Bearer tokens) are scrubbed from stderr and error envelopes.

---

## 2. Installation & Quickstart

### Prerequisites
- Node.js 18.0.0 or higher.
- A scoped Weftro Connect API token (starts with `cpd_`) issued from the **Weftro Developer Platform** (`/developers`).

### Quick Run via NPX
```bash
npx -y @weftro/mcp-server
```

### Local Workspace Execution
```bash
node packages/weftro-mcp/index.js
```

---

## 3. Client Configuration

### A. Cursor (`~/.cursor/mcp.json` or `.cursor/mcp.json`)
```json
{
  "mcpServers": {
    "weftro": {
      "command": "node",
      "args": ["packages/weftro-mcp/index.js"],
      "env": {
        "WEFTRO_API_URL": "https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect",
        "WEFTRO_TOKEN": "cpd_your_scoped_connect_token_here"
      }
    }
  }
}
```

### B. Claude Desktop (`claude_desktop_config.json`)
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "weftro": {
      "command": "node",
      "args": ["C:/absolute/path/to/clipad/packages/weftro-mcp/index.js"],
      "env": {
        "WEFTRO_API_URL": "https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect",
        "WEFTRO_TOKEN": "cpd_your_scoped_connect_token_here"
      }
    }
  }
}
```

### C. Windsurf (`~/.codeium/windsurf/mcp_config.json`)
```json
{
  "mcpServers": {
    "weftro": {
      "command": "node",
      "args": ["packages/weftro-mcp/index.js"],
      "env": {
        "WEFTRO_API_URL": "https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect",
        "WEFTRO_TOKEN": "cpd_your_scoped_connect_token_here"
      }
    }
  }
}
```

---

## 4. Environment Variables

| Variable | Description | Required | Default |
|---|---|---|---|
| `WEFTRO_TOKEN` | Scoped API access token (`cpd_...`) | **Yes** | — |
| `WEFTRO_API_URL` | Connect Gateway base URL | No | `https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect` |

---

## 5. Tool Catalog (Authorized Intelligence & Write Tools)

### A. Read-Only Intelligence Tools

| Tool Name | Scope Required | Parameters | Description |
|---|---|---|---|
| `search_organizational_memory` | `search:read` | `query` *(string, required)*<br>`limit` *(number, 1-50)*<br>`offset` *(number)* | Grounded semantic search across authorized organizational memories with relevance scores and provenance. |
| `query_organizational_context` | `context:read` | `context_session_id` *(uuid, optional)*<br>`query` *(string, optional)*<br>`limit` *(number)* | Retrieve structured context sessions and chronologically bound captures. |
| `get_memory_by_id` | `memory:read` | `memory_id` *(uuid, required)* | Retrieve complete memory text, importance score, tier, and metadata. |
| `list_organizational_memories` | `memory:read` | `limit` *(number, 1-100)*<br>`offset` *(number)*<br>`status` *(ACTIVE/ARCHIVED)* | List paginated organizational memories with status filtering. |
| `get_entity_by_id` | `entities:read` | `entity_id` *(uuid, required)* | Retrieve entity node, attributes, and cross-entity graph relationships. |
| `list_captures` | `captures:read` | `limit` *(number, 1-100)*<br>`offset` *(number)*<br>`source_type` *(string)* | List authorized captures (audio, video, notes) and queue states. |
| `get_capture_by_id` | `captures:read` | `capture_id` *(uuid, required)* | Retrieve specific capture details, raw transcripts, and queue status. |
| `list_smart_moments` | `moments:read` | `limit` *(number, 1-100)*<br>`offset` *(number)*<br>`moment_type` *(string)* | List meeting/video decisions, action items, and highlighted moments. |
| `get_source_provenance` | `sources:read` | `source_id` *(uuid, required)* | Retrieve full source provenance and creator metadata. |

### B. Write & Mutation Tools (Phase 8)

| Tool Name | Scope Required | Parameters | Description |
|---|---|---|---|
| `create_capture` | `captures:write` | `content` *(string, required)*<br>`title` *(string, optional)*<br>`source_type` *(string, optional)*<br>`capture_type` *(string, optional)*<br>`context_session_id` *(uuid, optional)*<br>`metadata` *(object, optional)*<br>`idempotency_key` *(string, optional)* | Ingest raw notes, clips, or external inputs into organization capture inbox with asynchronous queue scheduling. |
| `create_organizational_memory` | `memory:write` | `title` *(string, required)*<br>`content` *(string, required)*<br>`memory_type` *(string, optional)*<br>`memory_tier` *(string, optional)*<br>`importance` *(number 0-1, optional)*<br>`confidence_score` *(number 0-1, optional)*<br>`source_id` *(uuid, optional)*<br>`source_type` *(string, optional)*<br>`idempotency_key` *(string, optional)* | Create verified, durable organizational memory (Fact, Decision, Pattern) with provenance tracking and idempotency. |

---

## 6. Error Handling & Troubleshooting

| Error Code | Error Condition | Action Required |
|---|---|---|
| `-32600` | Missing `WEFTRO_TOKEN` | Set the `WEFTRO_TOKEN` environment variable in your client configuration. |
| `-32600` (`INVALID_CREDENTIALS`) | Expired or invalid token | Issue a new token in the Weftro Developer Platform (`/developers`). |
| `-32600` (`FORBIDDEN`) | Insufficient scope | Issue a token containing the required scope (e.g., `memory:read`). |
| `-32600` (`RESOURCE_NOT_FOUND`) | Resource does not exist | Verify the UUID or ensure the resource belongs to your organization. |
| `-32602` | Invalid tool arguments | Review tool parameter schemas (e.g., provide a valid UUID). |

---

## 7. Security Best Practices

1. **Storage**: Never hardcode `WEFTRO_TOKEN` in git repositories. Store tokens in local client config files excluded by `.gitignore`.
2. **Least Privilege**: Only grant the specific scopes your AI assistant needs (e.g., `search:read` for code assistants).
3. **Token Revocation**: If a developer machine is compromised, immediately revoke the token in the Weftro Developer Platform (`/developers/tokens`).
