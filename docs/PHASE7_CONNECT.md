# Phase 7: Connect Layer (MCP, API, OAuth & Webhooks)

This document describes the Phase 7 implementation of the Connect Layer for Clipad V3.

## Architecture

The Connect Layer acts as the singular secure gateway for external applications and AI systems to interface with the Clipad Knowledge Graph.

It adheres to the strict principle that **external systems must never receive unrestricted organizational access**. 

### 1. Authorized Context Service (`clipadConnectService.js`)
Instead of allowing direct database queries, all read actions (API, MCP) are routed through `getAuthorizedContext()`.
This central boundary:
1. Validates the OAuth Access Token.
2. Resolves the User ID and Company ID from the token.
3. Enforces requested Scopes (e.g., `memory:read`, `context:read`).
4. Executes the query using standard service functions that inherently respect existing RLS and access boundaries.

### 2. OAuth & Developer Credentials (`clipadOAuthService.js`)
Provides the minimal foundation for registering external applications and granting scoped access tokens. 
- **Applications:** Stored in `clipad_v3_connect_apps`.
- **Tokens:** Stored securely hashed in `clipad_v3_connect_tokens` along with their granted scope array.

### 3. MCP Foundation
The Model Context Protocol (MCP) server foundation is mapped directly to the `clipadConnectService`. External AI agents interacting via MCP are inherently bound to the identical authentication, scope, and RLS constraints as any standard API request. 
Exposed initial tools:
- `search_clipad`
- `get_context`
- `get_entity`

### 4. Webhooks (`clipadWebhookService.js`)
An outbound event dispatcher foundation for triggering external systems on Clipad events. 
- **Registry:** Managed via `clipad_v3_webhooks`.
- **Security:** Requires an endpoint URL and secret. Outbound payloads are signed via HMAC SHA-256 (`X-Clipad-Signature`) ensuring payload integrity and origin authenticity.

### 5. UI (Connect Settings)
The `ConnectSettings.jsx` component allows users to register developer apps, generate tokens, and register webhooks. It is strictly gated by the `CONNECT_ENABLED` and `WEBHOOKS_ENABLED` feature flags.

### 6. Security Boundaries (RLS)
- Developer Apps and Webhooks are restricted via RLS so users can only manage assets belonging to their company/tenant.
- Tokens can only be revoked by the user who granted them.
- All retrieved context via the API is heavily constrained to the querying user's `company_id`.

## Future Extensions
This phase lays the foundation for "Read + Analyze". Broad "Write + Act" capabilities (such as `memory:write` or `action:execute`) are deferred to Phase 8 to ensure the authorization baseline is perfectly secure before allowing external mutations.
