# Weftro V3 — Official Model Context Protocol (MCP) User Guide

This guide describes how to connect external AI clients—including **ChatGPT**, **Claude**, **Quora / Poe**, and desktop IDEs (**Cursor**, **Claude Desktop**, **Windsurf**)—to your organizational memory and intelligence using the official Weftro MCP endpoint.

---

## 1. Remote Server Configuration

- **Server URL**: `https://www.weftro.com/mcp` (or fallback `https://www.weftro.com/api/mcp`)
- **Protocol Standard**: Model Context Protocol (`2024-11-05`)
- **Transports Supported**: Streamable HTTP (`POST`) & Server-Sent Events (`GET`)
- **Authentication**:
  - **Open / No sign-in**: Uses the default connected workspace context.
  - **Scoped Bearer Token**: Provide a token (`Authorization: Bearer cpd_...`) generated in **Weftro Developer Platform** > **Apps & Credentials** for tenant isolation and custom permission scopes.

---

## 2. Connecting Claude (Anthropic Web & Desktop)

1. Navigate to **Claude Settings** > **Connectors** (or click **Add custom connector**).
2. Enter the connector configuration:
   - **Name**: `Weftro Intelligence`
   - **Server URL**: `https://www.weftro.com/mcp`
3. Under **Authentication**:
   - Select **No sign-in** (recommended for immediate zero-config team access) or **Use your own OAuth client / Bearer token** if using scoped API keys.
4. Click **Add / Connect**.
5. Claude will probe the endpoint, discover all 11 tools, and display them in your tool list.

---

## 3. Connecting ChatGPT (OpenAI Developer Mode / Remote MCP)

1. In ChatGPT, open **Settings** > **Connected Apps** or **MCP Connectors**.
2. Click **Add New Connector**:
   - **Name**: `Weftro Intelligence`
   - **Endpoint URL**: `https://www.weftro.com/mcp`
   - **Authentication**: Select **No Authentication** (or Bearer Token if prompted).
3. ChatGPT will perform the initial handshake and display the registered organizational memory tools.

---

## 4. Connecting Cursor IDE & Claude Desktop (Local Stdio Transport)

For local desktop workflows, you can either connect over remote HTTP or use local stdio:

### Stdio Configuration (`~/.cursor/mcp.json` or `claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "weftro": {
      "command": "node",
      "args": ["packages/weftro-mcp/index.js"],
      "env": {
        "WEFTRO_API_URL": "https://www.weftro.com/mcp",
        "WEFTRO_TOKEN": "<YOUR_SCOPED_CONNECT_TOKEN>"
      }
    }
  }
}
```

---

## 5. Available Tools Directory (11 Tools)

| Tool Name | Scope Required | Type | Function |
|---|---|---|---|
| `search_organizational_memory` | `search:read` | Read | Semantic and keyword search across organizational memories, standups, and technical notes. |
| `query_organizational_context` | `context:read` | Read | Retrieve bound context sessions, chronologically linked captures, and notes. |
| `get_memory_by_id` | `memory:read` | Read | Retrieve specific memory record, importance, tier, and provenance by UUID. |
| `list_organizational_memories` | `memory:read` | Read | Paginated memory listing with status filtering (`ACTIVE`/`ARCHIVED`). |
| `get_entity_by_id` | `entities:read` | Read | Retrieve knowledge graph entity node and relationship links. |
| `list_captures` | `captures:read` | Read | List organizational captures, notes, meeting transcripts, and standup entries. |
| `get_capture_by_id` | `captures:read` | Read | Retrieve specific capture details and queue processing status by UUID. |
| `list_smart_moments` | `moments:read` | Read | Extracted decisions, action items, and topic highlights with timestamps. |
| `get_source_provenance` | `sources:read` | Read | Retrieve source metadata, original author, and media references. |
| `create_capture` | `captures:write` | Write | Ingest external text/notes into capture inbox with background queue scheduling. |
| `create_organizational_memory` | `memory:write` | Write | Synthesize verified organizational memory with tier, importance, and idempotency. |

---

## 6. Example Test Prompts

Once connected in Claude or ChatGPT, test with prompts such as:

- *"Use Weftro Intelligence to summarize the recent daily standups for the marketing team and interns."*
- *"Search organizational memory for 'Cloud Infrastructure Optimization' and explain the architecture."*
- *"List recent captures and summarize the most active discussion points."*
