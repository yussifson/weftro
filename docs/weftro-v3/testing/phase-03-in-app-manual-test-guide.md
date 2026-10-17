# Phase 3 — In-App Manual Testing Guide: Weftro V3 UI

**Scope:** Manual verification directly inside the Weftro web application.  
**Tested App URL:** `http://localhost:5173` (or your deployed production URL)  
**Verified Commit:** `84ebba3`  
**No Terminal / cURL Commands Required for These Steps.**

---

## 1. Prerequisites
1. Log in to your Weftro account with an active user profile.
2. Ensure you have an active Organization selected in the top workspace selector.

---

## 2. In-App Step-by-Step Test Scenarios

### Test 1: Access Developer API & MCP Dashboard
1. Open the left sidebar navigation in the Weftro app.
2. Click on **Integrations Hub** (or navigate to `/integrations`).
3. In the sub-navigation tabs along the top of the page, locate the tabs:
   - `App Integrations`
   - `Capture Inbox`
   - **`Developer API & MCP`**
4. Click on **`Developer API & MCP`**.
5. **Expected Result:**
   - The page transitions to the **Developer Connect** view.
   - You see three overview status cards:
     - **REST API:** Shows `Active` with a green `Online` pill.
     - **MCP Protocol:** Shows `Operational` with a green `Ready` pill.
     - **Event Webhooks:** Shows `Streaming` with a green `Live` pill.
   - The **Weftro V3 Unified REST API Gateway (/api/v1)** documentation panel displays live endpoint references for `/api/v1/search` and `/api/v1/memories`.

---

### Test 2: Create a Developer Application
1. In the **Developer Connect** view, scroll down to the **Developer Apps (OAuth)** section on the left.
2. In the input box labeled **New Application Name**, type:
   `Production QA App`
3. Click the **Create App** button.
4. **Expected Result:**
   - A success toast notification appears: *"App Created — Save your client secret now."*
   - A green card appears displaying the generated **Client Secret** with a **Copy** icon and an *"I have saved it"* button.
   - Below the creation form, `Production QA App` appears in the list of registered applications with an **Active** badge and a copyable `Client ID` (e.g., `client_...`).

---

### Test 3: Create & Ingest a Capture in the Main Application
1. In the top navigation bar or sidebar, click the **+ Quick Capture** button (or navigate to `Integrations Hub -> Capture Inbox`).
2. Type or select:
   - **Title:** `Production Architecture Verification`
   - **Type:** `Note`
   - **Content:** `Weftro V3 API Gateway and Capture Engine are active.`
3. Click **Save Capture**.
4. **Expected Result:**
   - The modal closes immediately upon saving.
   - In the **Capture Inbox** tab, the newly created capture appears with status `QUEUED` and transitions to `PROCESSED`.
   - The server background worker processes the capture into organizational memory.

---

### Test 4: Verify Memory Conversion in Knowledge & Memories
1. In the left navigation, click on **Knowledge** (or **Organizational Memory**).
2. Search for `Production Architecture Verification`.
3. **Expected Result:**
   - The memory appears as an active `FACT` memory node with organizational tier visibility and confidence score.

---

### Test 5: Verify Application Deactivation & Revocation (Optional Admin Check)
1. Return to **Integrations Hub -> Developer API & MCP**.
2. Locate the registered app created in Test 2.
3. If an application is deleted or toggled inactive, requests made with tokens issued under it are immediately blocked with `403 APP_INACTIVE`.

---

## 3. Pass / Fail Acceptance Checklist

| Test Item | Verification Path | Result (Pass/Fail) |
|---|---|---|
| **1. Developer API & MCP Tab** | Integrations Hub $\rightarrow$ Developer API & MCP tab loads | [ ] |
| **2. Status Cards Online** | REST API displays `Active` / `Online` | [ ] |
| **3. App Creation** | New App creates successfully and issues Client ID | [ ] |
| **4. Secret Security Notice** | Plain secret is displayed once with copy button | [ ] |
| **5. Capture Auto-Close & Queue** | Capture modal closes immediately on save | [ ] |
| **6. Capture Ingestion** | Capture transitions from `QUEUED` to `PROCESSED` | [ ] |
