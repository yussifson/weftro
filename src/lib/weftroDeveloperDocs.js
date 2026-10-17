// src/lib/weftroDeveloperDocs.js
// Verified knowledge base and OpenAPI reference for the dedicated Developer AI Assistant.
// Strictly derived from docs/openapi.yaml and deployed Supabase Edge Function: /functions/v1/connect.

export const DEVELOPER_PLATFORM_KNOWLEDGE = {
  version: "v1",
  gateway_url: "https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect",
  supported_auth: [
    {
      type: "Bearer Connect Token",
      prefix: "cpd_",
      header: "Authorization: Bearer cpd_...",
      description: "For external applications, microservices, and AI agent integration."
    },
    {
      type: "Supabase User JWT",
      header: "Authorization: Bearer <supabase_session_jwt>",
      description: "For internal web dashboard access and developer identity management."
    }
  ],
  scopes: [
    { name: "search:read", desc: "Execute semantic queries across organizational memories" },
    { name: "memory:read", desc: "Read organizational memories with pagination and importance metrics" },
    { name: "context:read", desc: "Read context sessions and chronologically bound captures" },
    { name: "captures:read", desc: "Read capture records and queue processing state" },
    { name: "moments:read", desc: "Read extracted meeting/video smart moments and decisions" },
    { name: "entities:read", desc: "Read knowledge graph entities and relationship nodes" },
    { name: "sources:read", desc: "Read source provenance metadata" },
    { name: "apps:manage", desc: "Register apps, rotate client secrets, issue and revoke tokens" }
  ],
  endpoints: [
    {
      method: "GET",
      path: "/api/v1/health",
      scope: "none",
      description: "Gateway health check probe.",
      example: `curl -X GET "https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect/api/v1/health"`
    },
    {
      method: "GET",
      path: "/api/v1/capabilities",
      scope: "none",
      description: "Discover supported capabilities, active routes, and auth schemes.",
      example: `curl -X GET "https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect/api/v1/capabilities"`
    },
    {
      method: "POST",
      path: "/api/v1/search",
      scope: "search:read",
      description: "Grounded semantic search across organizational memory with confidence scores and provenance.",
      body: { query: "string (required)", limit: "number (1-50, default 10)", offset: "number (default 0)" },
      example: `curl -X POST "https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect/api/v1/search" \\
  -H "Authorization: Bearer cpd_..." \\
  -H "Content-Type: application/json" \\
  -d '{"query": "architectural roadmap", "limit": 10}'`
    },
    {
      method: "POST",
      path: "/api/v1/context/query",
      scope: "context:read",
      description: "Retrieve context session and chronologically bound captures.",
      body: { session_id: "string (required UUID)" },
      example: `curl -X POST "https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect/api/v1/context/query" \\
  -H "Authorization: Bearer cpd_..." \\
  -H "Content-Type: application/json" \\
  -d '{"session_id": "00000000-0000-0000-0000-000000000000"}'`
    },
    {
      method: "GET",
      path: "/api/v1/memories",
      scope: "memory:read",
      description: "List organizational memories with pagination.",
      params: { limit: "1-100", offset: "number" },
      example: `curl -X GET "https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect/api/v1/memories?limit=20" \\
  -H "Authorization: Bearer cpd_..."`
    },
    {
      method: "GET",
      path: "/api/v1/memories/:id",
      scope: "memory:read",
      description: "Retrieve a specific organizational memory by ID.",
      example: `curl -X GET "https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect/api/v1/memories/<ID>" \\
  -H "Authorization: Bearer cpd_..."`
    },
    {
      method: "GET",
      path: "/api/v1/entities/:id",
      scope: "entities:read",
      description: "Retrieve knowledge graph entity node and its cross-links.",
      example: `curl -X GET "https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect/api/v1/entities/<ID>" \\
  -H "Authorization: Bearer cpd_..."`
    },
    {
      method: "GET",
      path: "/api/v1/captures",
      scope: "captures:read",
      description: "List captures for the authorized tenant.",
      example: `curl -X GET "https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect/api/v1/captures" \\
  -H "Authorization: Bearer cpd_..."`
    },
    {
      method: "GET",
      path: "/api/v1/captures/:id/status",
      scope: "captures:read",
      description: "Get capture processing and background queue job status.",
      example: `curl -X GET "https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect/api/v1/captures/<ID>/status" \\
  -H "Authorization: Bearer cpd_..."`
    },
    {
      method: "GET",
      path: "/api/v1/smart-moments",
      scope: "moments:read",
      description: "List extracted meeting and video smart moments.",
      example: `curl -X GET "https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect/api/v1/smart-moments" \\
  -H "Authorization: Bearer cpd_..."`
    },
    {
      method: "GET",
      path: "/api/v1/sources/:id",
      scope: "sources:read",
      description: "Retrieve source metadata and provenance.",
      example: `curl -X GET "https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect/api/v1/sources/<ID>" \\
  -H "Authorization: Bearer cpd_..."`
    },
    {
      method: "POST",
      path: "/api/v1/apps",
      scope: "apps:manage",
      description: "Register a new developer application. Returns client_id and one-time unhashed client_secret.",
      body: { name: "string (required)", description: "string (optional)", redirect_uris: "string[] (optional)" }
    },
    {
      method: "POST",
      path: "/api/v1/apps/:id/rotate-secret",
      scope: "apps:manage",
      description: "Rotate client secret. Previous secret is immediately invalidated.",
      example: `curl -X POST "https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect/api/v1/apps/<ID>/rotate-secret" \\
  -H "Authorization: Bearer <JWT_OR_APPS_MANAGE_TOKEN>"`
    },
    {
      method: "POST",
      path: "/api/v1/tokens",
      scope: "apps:manage",
      description: "Issue a scoped API access token (cpd_...). Returned in plain text ONCE.",
      body: { app_id: "string UUID (required)", scopes: "string[]", rate_limit_rpm: "number (default 120)" }
    },
    {
      method: "POST",
      path: "/api/v1/tokens/:id/revoke",
      scope: "apps:manage",
      description: "Revoke an active API token immediately.",
      example: `curl -X POST "https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect/api/v1/tokens/<ID>/revoke" \\
  -H "Authorization: Bearer <JWT_OR_APPS_MANAGE_TOKEN>"`
    }
  ],
  mcp_support: {
    protocol_version: "1.0.0",
    client_config_sample: `{
  "mcpServers": {
    "weftro": {
      "command": "npx",
      "args": ["-y", "@weftro/mcp-server"],
      "env": {
        "WEFTRO_API_URL": "https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect",
        "WEFTRO_TOKEN": "<YOUR_CONNECT_TOKEN>"
      }
    }
  }
}`,
    tools: [
      { name: "search_memory", desc: "Search organizational decisions and knowledge" },
      { name: "capture_context", desc: "Stream code snippets or terminal traces into memory" },
      { name: "query_graph", desc: "Traverse knowledge graph entity relationships" }
    ]
  },
  rate_limits: {
    default_rpm: 120,
    headers: ["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset", "Retry-After"],
    error_status: 429,
    error_code: "RATE_LIMIT_EXCEEDED"
  },
  errors: {
    400: "BAD_REQUEST - Missing or malformed parameters",
    401: "UNAUTHORIZED / INVALID_CREDENTIALS / TOKEN_REVOKED / TOKEN_EXPIRED",
    403: "FORBIDDEN (insufficient scope) / APP_INACTIVE",
    404: "RESOURCE_NOT_FOUND (nonexistent or belongs to different company)",
    429: "RATE_LIMIT_EXCEEDED",
    500: "INTERNAL_SERVER_ERROR"
  },
  roadmap: {
    phase_5: "Production MCP Server with high-throughput persistent streams",
    phase_6: "Outbound Webhook Delivery Engine with HMAC signatures and retry queue",
    phase_7: "Developer Experience & Production Hardening"
  }
};
