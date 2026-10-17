# Weftro V3 — Phase 4 Manual In-App Testing Guide
## Developer Identity, Applications, Credentials & Authorization Scopes

> **Audience:** QA Engineers, Product Reviewers, Developers  
> **Environment:** Main Production Application UI (`https://app.weftro.com` or local dev instance)  
> **Backend Gateway:** `https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect`  
> **Prerequisites:** An authenticated organization member account.

---

### Overview of Phase 4 Capabilities
In Phase 4, Weftro provides an end-to-end Developer Platform management experience:
1. **Application Registration:** Create OAuth and API integration clients with auto-generated Client IDs and secure one-time secret display.
2. **Secret Rotation:** Instantly roll credentials with immediate invalidation of legacy secrets without disrupting organization data.
3. **Granular Scoped Tokens:** Generate personal and service API Bearer tokens (`cpd_...`) with precise capability scopes (`search:read`, `memory:read`, `context:read`, etc.).
4. **Token Revocation:** Revoke compromised or retired access tokens immediately from the UI.
5. **Multi-Tenant Protection:** Rigorous isolation ensuring applications and tokens are strictly bounded to the creator's organization.

---

### Step-by-Step In-App Verification Protocol

#### Test Step 1: Navigate to the Developer Settings Hub
1. Open the main Weftro application in your web browser.
2. Sign in with your company account.
3. In the sidebar or top navigation, click on **Settings** (⚙️) or **Integrations Hub**.
4. Select the **Developer Connect** or **API & MCP** tab.
5. **Expected Outcome:**
   - The page displays the **Developer Connect** interface.
   - Status cards show **REST API Online**, **Model Context Protocol (MCP)** quickstart instructions, and **Event Webhooks**.
   - Below, you will see two management panels: **Developer Apps (OAuth)** and **API Access Tokens**.

---

#### Test Step 2: Register a New Developer Application
1. In the **Developer Apps (OAuth)** panel, locate the **New Application Name** input field.
2. Enter `Internal Data Pipeline` and click the **Create App** button.
3. **Expected Outcome:**
   - A success toast notification appears: *"App Created: Save your client secret now."*
   - An alert banner displays the one-time **Client Secret** (e.g. `secret_...`) with a **Copy** button.
   - Click the **Copy** button to verify the clipboard integration.
   - Click **I have saved it** to dismiss the one-time display.
   - The newly created app appears in the list showing its name, **Active** badge, and full **Client ID**.

---

#### Test Step 3: Rotate Client Secret
1. On the newly created application card, click the **Rotate Secret** button (with the refresh icon).
2. A confirmation prompt appears asking if you want to proceed and warning that previous credentials will lose access.
3. Confirm the rotation.
4. **Expected Outcome:**
   - The button shows a rotating spinner while processing.
   - A success toast notification confirms: *"Secret Rotated: Save your new client secret now."*
   - A green banner displays the new `secret_...` and confirms the old secret is immediately invalid.
   - Click **I have saved it** to dismiss.

---

#### Test Step 4: Generate a Scoped API Token from the UI
1. On the application card, click the **Generate Token** button (with key icon).
2. A token configuration panel opens beneath the app with selectable capability scopes:
   - `search:read` (Execute semantic queries)
   - `memory:read` (Read organizational memories)
   - `context:read` (Read context sessions and timeline)
   - `captures:read` (Read captures and queue status)
   - `moments:read` (Read detected smart moments)
   - `entities:read` (Read knowledge graph entities)
   - `sources:read` (Read source provenance metadata)
   - `apps:manage` (Manage applications and credentials)
3. Select `search:read` and `memory:read`.
4. Click **Generate Access Token**.
5. **Expected Outcome:**
   - A green card reveals your newly issued Bearer token beginning with `cpd_...`.
   - Badges display the granted scopes (`search:read`, `memory:read`).
   - Click the **Copy** button to copy the token.
   - In the adjacent **API Access Tokens** list, the new token appears with an **Active** badge, rate limit (120 RPM), and creation timestamp.

---

#### Test Step 5: Verify Token Scope Enforcement (Optional Live cURL Check)
To verify that the token generated in the UI respects its scopes:
1. Open your browser console or terminal and make a test call using your copied token:
   ```bash
   curl -X POST "https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect/api/v1/search" \
     -H "Authorization: Bearer <COPIED_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{"query": "roadmap"}'
   ```
   **Expected Status:** `200 OK` (authorized by `search:read`).
2. Make a test call to an unscoped endpoint (`/api/v1/captures`):
   ```bash
   curl -X GET "https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect/api/v1/captures" \
     -H "Authorization: Bearer <COPIED_TOKEN>"
   ```
   **Expected Status:** `403 Forbidden` (`{"error":{"code":"FORBIDDEN","message":"Insufficient scope: captures:read required."}}`).

---

#### Test Step 6: Revoke the Token in the UI
1. In the **API Access Tokens** panel, locate the token you generated in Step 4.
2. Click the red **Revoke** button.
3. Confirm the revocation dialog.
4. **Expected Outcome:**
   - A toast notification confirms: *"API token has been revoked successfully."*
   - The token status immediately changes to a red **Revoked** badge.
   - The Revoke button disappears.
   - Any further requests with this token immediately return `401 TOKEN_REVOKED`.

---

#### Test Step 7: Multi-Tenant Isolation Verification
1. Sign in with a user account belonging to a second organization.
2. Navigate to **Developer Connect**.
3. **Expected Outcome:**
   - The applications and tokens created in Organization 1 are completely absent from Organization 2's dashboard.
   - Attempting to inspect or issue tokens for Organization 1's client ID yields no results and returns `404 Not Found`.

---

### Verification Summary Checklist
- [x] Application created and one-time secret presented safely.
- [x] Client ID visible and easy to copy.
- [x] Secret rotation works cleanly with confirmation prompt.
- [x] Scoped token modal allows selecting exact required permissions.
- [x] Newly minted token is shown once and saved in hashed form.
- [x] Token respects scope boundaries (`200` for permitted, `403` for forbidden).
- [x] Token revocation takes effect immediately with UI status updated.
- [x] Cross-tenant isolation prevents any leakage between companies.
