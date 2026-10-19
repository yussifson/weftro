// src/lib/weftroDeveloperDocs.js
// Verified knowledge base and OpenAPI reference for the dedicated Developer AI Assistant.
// Strictly derived from docs/openapi.yaml and deployed Supabase Edge Function: /functions/v1/connect.

export const DEVELOPER_PLATFORM_KNOWLEDGE = {
  version: "v1",
  gateway_url: "https://www.weftro.com",
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
    { name: "captures:write", desc: "Ingest raw external content into the capture pipeline" },
    { name: "moments:read", desc: "Read extracted meeting/video smart moments and decisions" },
    { name: "entities:read", desc: "Read knowledge graph entities and relationship nodes" },
    { name: "sources:read", desc: "Read source provenance metadata" },
    { name: "memory:write", desc: "Create verified, durable organizational memories with provenance and idempotency" },
    { name: "apps:manage", desc: "Register apps, rotate client secrets, issue and revoke tokens" },
    { name: "webhooks:manage", desc: "Create, inspect, update, rotate secrets, and delete webhook subscriptions and delivery history" }
  ],
  endpoints: [
    {
      method: "GET",
      path: "/api/v1/health",
      scope: "none",
      description: "Gateway health check probe.",
      example: `curl -X GET "https://www.weftro.com/api/v1/health"`
    },
    {
      method: "GET",
      path: "/api/v1/capabilities",
      scope: "none",
      description: "Discover supported capabilities, active routes, and auth schemes.",
      example: `curl -X GET "https://www.weftro.com/api/v1/capabilities"`
    },
    {
      method: "POST",
      path: "/api/v1/search",
      scope: "search:read",
      description: "Grounded semantic search across organizational memory with confidence scores and provenance.",
      body: { query: "string (required)", limit: "number (1-50, default 10)", offset: "number (default 0)" },
      example: `curl -X POST "https://www.weftro.com/api/v1/search" \\
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
      example: `curl -X POST "https://www.weftro.com/api/v1/context/query" \\
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
      example: `curl -X GET "https://www.weftro.com/api/v1/memories?limit=20" \\
  -H "Authorization: Bearer cpd_..."`
    },
    {
      method: "POST",
      path: "/api/v1/memories",
      scope: "memory:write",
      description: "Create verified organizational memory with provenance and idempotency.",
      body: { title: "string (required)", content: "string (required)", memory_type: "string", memory_tier: "string", importance: "number (0-1)", confidence_score: "number (0-1)", source_id: "uuid (optional)" },
      example: `curl -X POST "https://www.weftro.com/api/v1/memories" \\
  -H "Authorization: Bearer cpd_..." \\
  -H "Idempotency-Key: idemp_123456" \\
  -H "Content-Type: application/json" \\
  -d '{"title": "Core Tenet", "content": "Always enforce server-side tenant isolation", "memory_type": "FACT"}'`
    },
    {
      method: "GET",
      path: "/api/v1/memories/:id",
      scope: "memory:read",
      description: "Retrieve a specific organizational memory by ID.",
      example: `curl -X GET "https://www.weftro.com/api/v1/memories/<ID>" \\
  -H "Authorization: Bearer cpd_..."`
    },
    {
      method: "GET",
      path: "/api/v1/entities/:id",
      scope: "entities:read",
      description: "Retrieve knowledge graph entity node and its cross-links.",
      example: `curl -X GET "https://www.weftro.com/api/v1/entities/<ID>" \\
  -H "Authorization: Bearer cpd_..."`
    },
    {
      method: "GET",
      path: "/api/v1/captures",
      scope: "captures:read",
      description: "List captures for the authorized tenant.",
      example: `curl -X GET "https://www.weftro.com/api/v1/captures" \\
  -H "Authorization: Bearer cpd_..."`
    },
    {
      method: "POST",
      path: "/api/v1/captures",
      scope: "captures:write",
      description: "Ingest external content into capture pipeline with queue scheduling.",
      body: { content: "string (required)", title: "string (optional)", source_type: "string (optional)", capture_type: "string (optional)", context_session_id: "uuid (optional)" },
      example: `curl -X POST "https://www.weftro.com/api/v1/captures" \\
  -H "Authorization: Bearer cpd_..." \\
  -H "Idempotency-Key: idemp_cap_123" \\
  -H "Content-Type: application/json" \\
  -d '{"content": "New architecture spec discussion note", "source_type": "cli_capture"}'`
    },
    {
      method: "GET",
      path: "/api/v1/captures/:id",
      scope: "captures:read",
      description: "Retrieve specific capture transcript, source type, and queue state.",
      example: `curl -X GET "https://www.weftro.com/api/v1/captures/<ID>" \\
  -H "Authorization: Bearer cpd_..."`
    },
    {
      method: "GET",
      path: "/api/v1/captures/:id/status",
      scope: "captures:read",
      description: "Get capture processing and background queue job status.",
      example: `curl -X GET "https://www.weftro.com/api/v1/captures/<ID>/status" \\
  -H "Authorization: Bearer cpd_..."`
    },
    {
      method: "GET",
      path: "/api/v1/smart-moments",
      scope: "moments:read",
      description: "List extracted meeting and video smart moments.",
      example: `curl -X GET "https://www.weftro.com/api/v1/smart-moments" \\
  -H "Authorization: Bearer cpd_..."`
    },
    {
      method: "GET",
      path: "/api/v1/sources/:id",
      scope: "sources:read",
      description: "Retrieve source metadata and provenance.",
      example: `curl -X GET "https://www.weftro.com/api/v1/sources/<ID>" \\
  -H "Authorization: Bearer cpd_..."`
    },
    {
      method: "GET",
      path: "/api/v1/apps",
      scope: "apps:manage",
      description: "List registered developer applications for the authorized organization.",
      example: `curl -X GET "https://www.weftro.com/api/v1/apps" \\
  -H "Authorization: Bearer <JWT_OR_APPS_MANAGE_TOKEN>"`
    },
    {
      method: "POST",
      path: "/api/v1/apps",
      scope: "apps:manage",
      description: "Register a new developer application. Returns client_id and one-time unhashed client_secret.",
      body: { name: "string (required)", description: "string (optional)", redirect_uris: "string[] (optional)" }
    },
    {
      method: "GET",
      path: "/api/v1/apps/:id",
      scope: "apps:manage",
      description: "Retrieve developer application details.",
      example: `curl -X GET "https://www.weftro.com/api/v1/apps/<ID>" \\
  -H "Authorization: Bearer <JWT_OR_APPS_MANAGE_TOKEN>"`
    },
    {
      method: "PATCH",
      path: "/api/v1/apps/:id",
      scope: "apps:manage",
      description: "Update developer application name, description, or active status.",
      body: { name: "string (optional)", description: "string (optional)", is_active: "boolean (optional)" }
    },
    {
      method: "DELETE",
      path: "/api/v1/apps/:id",
      scope: "apps:manage",
      description: "Delete developer application and revoke its client credentials.",
      example: `curl -X DELETE "https://www.weftro.com/api/v1/apps/<ID>" \\
  -H "Authorization: Bearer <JWT_OR_APPS_MANAGE_TOKEN>"`
    },
    {
      method: "POST",
      path: "/api/v1/apps/:id/rotate-secret",
      scope: "apps:manage",
      description: "Rotate client secret. Previous secret is immediately invalidated.",
      example: `curl -X POST "https://www.weftro.com/api/v1/apps/<ID>/rotate-secret" \\
  -H "Authorization: Bearer <JWT_OR_APPS_MANAGE_TOKEN>"`
    },
    {
      method: "GET",
      path: "/api/v1/tokens",
      scope: "apps:manage",
      description: "List active scoped API access tokens without revealing secrets.",
      example: `curl -X GET "https://www.weftro.com/api/v1/tokens" \\
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
      example: `curl -X POST "https://www.weftro.com/api/v1/tokens/<ID>/revoke" \\
  -H "Authorization: Bearer <JWT_OR_APPS_MANAGE_TOKEN>"`
    },
    {
      method: "GET",
      path: "/api/v1/webhooks",
      scope: "webhooks:manage",
      description: "List webhook subscriptions registered for the authorized company tenant.",
      example: `curl -X GET "https://www.weftro.com/api/v1/webhooks" \\
  -H "Authorization: Bearer cpd_..."`
    },
    {
      method: "POST",
      path: "/api/v1/webhooks",
      scope: "webhooks:manage",
      description: "Register an outbound webhook subscription. Returns endpoint record and unhashed signing secret (whsec_...) ONCE.",
      body: { endpoint_url: "string (HTTPS required, SSRF protected)", events: "string[]", description: "string (optional)" }
    },
    {
      method: "GET",
      path: "/api/v1/webhooks/:id",
      scope: "webhooks:manage",
      description: "Retrieve webhook subscription details and active status.",
      example: `curl -X GET "https://www.weftro.com/api/v1/webhooks/<ID>" \\
  -H "Authorization: Bearer cpd_..."`
    },
    {
      method: "PATCH",
      path: "/api/v1/webhooks/:id",
      scope: "webhooks:manage",
      description: "Update webhook subscription events filter, description, or active status.",
      body: { events: "string[] (optional)", is_active: "boolean (optional)", description: "string (optional)" }
    },
    {
      method: "DELETE",
      path: "/api/v1/webhooks/:id",
      scope: "webhooks:manage",
      description: "Delete webhook subscription cleanly.",
      example: `curl -X DELETE "https://www.weftro.com/api/v1/webhooks/<ID>" \\
  -H "Authorization: Bearer cpd_..."`
    },
    {
      method: "POST",
      path: "/api/v1/webhooks/:id/rotate-secret",
      scope: "webhooks:manage",
      description: "Rotate the signing secret for a webhook subscription. Invalidate previous secret immediately.",
      example: `curl -X POST "https://www.weftro.com/api/v1/webhooks/<ID>/rotate-secret" \\
  -H "Authorization: Bearer cpd_..."`
    },
    {
      method: "POST",
      path: "/api/v1/webhooks/:id/test",
      scope: "webhooks:manage",
      description: "Dispatch a signed test event to verify receiver signature checking and delivery.",
      example: `curl -X POST "https://www.weftro.com/api/v1/webhooks/<ID>/test" \\
  -H "Authorization: Bearer cpd_..."`
    },
    {
      method: "GET",
      path: "/api/v1/webhooks/:id/deliveries",
      scope: "webhooks:manage",
      description: "List recent delivery logs, HTTP response status codes, latency, and payloads for an endpoint.",
      example: `curl -X GET "https://www.weftro.com/api/v1/webhooks/<ID>/deliveries" \\
  -H "Authorization: Bearer cpd_..."`
    },
    {
      method: "POST",
      path: "/api/v1/webhooks/deliveries/:id/retry",
      scope: "webhooks:manage",
      description: "Retry an eligible webhook delivery using current subscription credentials.",
      example: `curl -X POST "https://www.weftro.com/api/v1/webhooks/deliveries/<DELIVERY_ID>/retry" \\
  -H "Authorization: Bearer cpd_..."`
    }
  ],
  webhooks: {
    signature_header: "X-Weftro-Signature",
    event_id_header: "X-Weftro-Event-Id",
    timestamp_header: "X-Weftro-Timestamp",
    supported_events: [
      { name: "capture.created", desc: "Fired when a new capture or recording session begins" },
      { name: "capture.processed", desc: "Fired when background queue processing of audio/video capture finishes" },
      { name: "memory.created", desc: "Fired when a new synthesized organizational memory is indexed" },
      { name: "memory.updated", desc: "Fired when an existing organizational memory is enriched or re-indexed" },
      { name: "smart_moment.detected", desc: "Fired when a decision or high-importance moment is identified" }
    ],
    verification_snippet: `// Node.js signature verification
const crypto = require('crypto');
function verifyWeftroWebhook(payload, signatureHeader, secret) {
  const parts = Object.fromEntries(signatureHeader.split(',').map(s => s.split('=')));
  const timestamp = parts.t;
  const signature = parts.v1;
  const signedPayload = \`\${timestamp}.\${typeof payload === 'string' ? payload : JSON.stringify(payload)}\`;
  const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}`
  },
  mcp_support: {
    protocol_version: "2024-11-05",
    server_package: "@weftro/mcp-server",
    transport: "stdio",
    client_config_sample: `{
  "mcpServers": {
    "weftro": {
      "command": "node",
      "args": ["packages/weftro-mcp/index.js"],
      "env": {
        "WEFTRO_API_URL": "https://www.weftro.com",
        "WEFTRO_TOKEN": "<YOUR_SCOPED_CONNECT_TOKEN>"
      }
    }
  }
}`,
    tools: [
      { name: "search_organizational_memory", scope: "search:read", desc: "Execute semantic search across memories and technical notes" },
      { name: "query_organizational_context", scope: "context:read", desc: "Retrieve context sessions and chronologically bound captures" },
      { name: "get_memory_by_id", scope: "memory:read", desc: "Retrieve specific memory record content and metadata by UUID" },
      { name: "list_organizational_memories", scope: "memory:read", desc: "List paginated organizational memories with status filters" },
      { name: "get_entity_by_id", scope: "entities:read", desc: "Retrieve knowledge graph entity node and relationships" },
      { name: "list_captures", scope: "captures:read", desc: "List captures, source types, and processing states" },
      { name: "get_capture_by_id", scope: "captures:read", desc: "Retrieve specific capture transcript and queue status" },
      { name: "list_smart_moments", scope: "moments:read", desc: "List extracted smart moments, decisions, and action items" },
      { name: "get_source_provenance", scope: "sources:read", desc: "Retrieve full source provenance and creator metadata" },
      { name: "create_capture", scope: "captures:write", desc: "Ingest raw external content into the capture inbox with asynchronous queue scheduling" },
      { name: "create_organizational_memory", scope: "memory:write", desc: "Synthesize verified, durable organizational memory with provenance and idempotency" }
    ]
  },
  rate_limits: {
    default_rpm: 120,
    headers: ["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset", "Retry-After"],
    error_status: 429,
    error_code: "RATE_LIMIT_EXCEEDED"
  },
  errors: {
    400: "BAD_REQUEST - Missing or malformed parameters (or unsafe URL / SSRF violation)",
    401: "UNAUTHORIZED / INVALID_CREDENTIALS / TOKEN_REVOKED / TOKEN_EXPIRED",
    403: "FORBIDDEN (insufficient scope) / APP_INACTIVE",
    404: "RESOURCE_NOT_FOUND (nonexistent or belongs to different company)",
    429: "RATE_LIMIT_EXCEEDED",
    500: "INTERNAL_SERVER_ERROR"
  },
  roadmap: {
    phase_5: "Production MCP Server (Completed & Live)",
    phase_6: "Outbound Webhook Delivery Engine with HMAC signatures and retry queue (Completed & Live)",
    phase_7: "Developer Experience & Production Hardening"
  }
};
