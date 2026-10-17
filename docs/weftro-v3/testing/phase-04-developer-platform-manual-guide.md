# Weftro V3 — Developer Platform Manual In-App Test & Verification Guide
## Dedicated Developer Platform, Navigation, Credentials & Developer AI Assistant

> **Audience:** QA Engineers, Product Reviewers, Developers  
> **Environment:** Main Production Application UI (`https://app.weftro.com` or local environment)  
> **Backend Gateway:** `https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect`  
> **Prerequisites:** An authenticated organization member or admin account.

---

### 1. Scope of the Developer Platform
In this release, the **Developer Platform** is decoupled from the Integrations page and promoted to a first-class, dedicated destination:
- **Dedicated Navigation:** `/developers` is visible in the main application sidebar and accessible via direct URLs.
- **Clear Product Separation:**
  - `/integrations` — strictly for connecting third-party business tools (Slack, GitHub, Zoom).
  - `/developers` — technical hub for developer apps, API tokens, OpenAPI documentation, live request explorer, and developer AI assistant.
- **Dedicated Developer AI Assistant:** Grounded strictly in the live Weftro V3 Connect API specification with automatic client credential redaction.

---

### 2. Step-by-Step Verification Protocol

#### Test Step 1: Verify Main Navigation & Product Separation
1. Log in to the Weftro application with your workspace account.
2. Observe the left sidebar navigation under the **Intelligence** section.
3. **Expected Results:**
   - Both **Integrations** (Plug icon) and **Developers** (Code2 icon) are distinct, separate menu items.
   - Click **Integrations** (`/integrations`): The page focuses purely on SaaS connectors (Slack, GitHub, Zoom). If API access is enabled, it surfaces a clear external link pill pointing to **Developer Platform ↗**.
   - Click **Developers** (`/developers`): The app navigates to the dedicated **Developer Platform** hub.

---

#### Test Step 2: Direct URL Routing & Sub-Navigation Tabs
1. In the browser address bar, test direct navigation to the supported developer subpaths:
   - `https://app.weftro.com/developers` (Apps & Credentials)
   - `https://app.weftro.com/developers/assistant` (Developer AI Assistant)
   - `https://app.weftro.com/developers/explorer` (API Explorer)
   - `https://app.weftro.com/developers/docs` (API Documentation)
   - `https://app.weftro.com/developers/logs` (Audit Logs)
2. **Expected Results:**
   - Each route renders the appropriate sub-view inside the unified layout.
   - Subnavigation tab pills highlight the active tab accurately.

---

#### Test Step 3: Register an Application & Rotate Secret
1. On `/developers` (Apps & Credentials tab), enter a name (e.g. `Analytics Integration`) under **New Application Name** and click **Create App**.
2. **Expected Results:**
   - Toast notification: *"App Created"*.
   - A one-time banner reveals the unhashed `secret_...` with a **Copy** button.
   - Click **I have saved it** to dismiss.
3. On the created app card, click **Rotate Secret**.
4. Confirm the warning dialog.
5. **Expected Results:**
   - A new `secret_...` is generated and presented once.
   - The previous secret is immediately invalidated by the API gateway.

---

#### Test Step 4: Issue a Scoped Token & Revoke
1. On the application card, click **Generate Token**.
2. Select scopes (e.g., `search:read` and `memory:read`).
3. Click **Generate Access Token**.
4. **Expected Results:**
   - A one-time Bearer token (`cpd_...`) is presented with a **Copy** button.
   - In the **API Access Tokens** card, the token is listed as **Active** with its scopes and rate limit (120 RPM).
5. Click **Revoke** on the token card and confirm.
6. **Expected Results:**
   - Badge changes to red **Revoked**.
   - Any further API request using this token returns `401 TOKEN_REVOKED`.

---

#### Test Step 5: Test the Dedicated Developer AI Assistant
1. Navigate to `/developers/assistant` (or click **Developer AI Assistant** in the sub-tabs).
2. Click one of the quick prompt pills, e.g.:
   - *"How do I search memories via API?"*
   - *"Explain available API scopes"*
3. **Expected Results:**
   - The assistant replies with verified technical instructions grounded in the `/api/v1` specification.
   - Answers include the correct endpoint (`POST /api/v1/search`), headers (`Authorization: Bearer cpd_...`), and required scope (`search:read`).
4. **Credential Redaction Test:**
   - Paste a test string containing a token into the prompt: `Can I use cpd_test_1234567890abcdef for memory read?`
   - Send the message.
   - **Expected Results:**
   - In the chat history, the secret is automatically redacted to `cpd_test_1••••••••` before display and logging.

---

#### Test Step 6: Test the Interactive API Explorer
1. Navigate to `/developers/explorer`.
2. Select **Gateway Health** (`GET /api/v1/health`) from the left list.
3. Click **Send Request**.
4. **Expected Results:**
   - Status badge displays `200 OK` with latency in milliseconds.
   - Response pane displays JSON:
     ```json
     {
       "data": {
         "status": "healthy",
         "service": "weftro-v3-api-gateway",
         "version": "v1"
       }
     }
     ```
5. Select **Grounded Search** (`POST /api/v1/search`) without providing an Authorization token and click **Send Request**.
6. **Expected Results:**
   - Status badge displays `401 Unauthorized` (`UNAUTHORIZED`).

---

#### Test Step 7: Verify Audit Logs
1. Navigate to `/developers/logs`.
2. **Expected Results:**
   - Displays recent API gateway events (`api.search`, `api.apps.create`, `api.tokens.create`).
   - Shows sanitized correlation `request_id` values and latency metrics without exposing authorization bearer tokens.

---

### 3. Verification Checklist

| Checkpoint | Expected Behavior | Pass / Fail |
|---|---|---|
| Sidebar Navigation | `Developers` exists separately from `Integrations` | [ ] |
| URL Routing | `/developers/*` routes load the Developer Platform | [ ] |
| Integrations Boundary | `/integrations` focuses on SaaS tools (Slack, GitHub, Zoom) | [ ] |
| App Registration | Creates app, generates client_id and one-time secret | [ ] |
| Secret Rotation | Generates new secret and immediately invalidates old | [ ] |
| Scoped Token Issuance | Creates `cpd_...` token with selected scopes | [ ] |
| Token Revocation | Updates UI to Revoked; API rejects token with 401 | [ ] |
| Developer Assistant | Answers technical API questions accurately using v1 spec | [ ] |
| Secret Redaction | Tokens and secrets are masked in assistant messages | [ ] |
| API Explorer | Sends live HTTP requests against edge function | [ ] |
| Audit Logs | Logs gateway events with sanitized correlation IDs | [ ] |
