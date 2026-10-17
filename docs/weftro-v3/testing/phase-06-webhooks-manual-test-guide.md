# Weftro V3 — Phase 6 Webhooks In-App & Manual Testing Guide

**Phase:** Phase 6 — Webhook Subscriptions & Delivery Engine  
**Agent ID:** `AGENT-API-MCP`  
**Base URL:** `https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect`  
**Frontend URL:** `/developers/webhooks`

---

## 1. Overview & Architecture

Weftro V3 Webhooks allow external applications and event consumers to subscribe to real-time organizational events.

### Security Guarantees
1. **SSRF Protection:** Webhook URLs pointing to localhost (`127.0.0.1`, `::1`), private CIDR blocks (`10.0.0.0/8`, `192.168.0.0/16`, `172.16.0.0/12`), AWS/cloud metadata services (`169.254.169.254`), or internal domain suffixes (`.internal`, `.local`) are rejected with `400 BAD_REQUEST`.
2. **HMAC-SHA256 Signatures:** Every dispatched webhook carries an `X-Weftro-Signature` header formatted as:
   ```
   X-Weftro-Signature: t=1729188000,v1=5d41402abc4b2a76b9719d911017c592...
   ```
   Computed over `${timestamp}.${rawJsonPayload}` using the webhook's dedicated secret (`whsec_...`).
3. **One-Time Secret Visibility:** The secret `whsec_...` is displayed in plain text exactly once upon creation or rotation. It is not queryable via `GET /api/v1/webhooks`.
4. **Tenant Isolation:** All operations enforce `company_id`. Organizations cannot view, modify, or receive events for other tenants.

---

## 2. In-App UI Verification

1. Navigate to **Developer Platform** via the main navigation or visit `http://localhost:5173/developers`.
2. Click on the **Webhooks** tab in the subnavigation bar.
3. **Register an Endpoint:**
   - Click **Add Webhook Endpoint**.
   - Input your HTTPS target endpoint (e.g. `https://webhook.site/...`).
   - Select the events to subscribe:
     - `capture.created`
     - `capture.processed`
     - `memory.created`
     - `memory.updated`
     - `smart_moment.detected`
   - Click **Register Webhook Endpoint**.
   - **One-Time Secret Modal:** Notice the displayed `whsec_...` key. Copy and store it securely.
4. **Trigger a Test Ping:**
   - In the webhook endpoints table, click the **Send Test Ping** button (paper airplane icon).
   - A modal displays the dispatch payload, HTTP status code (e.g. `200 OK`), round-trip latency (ms), and response body preview.
5. **View Delivery History:**
   - Click the **Delivery History** button (clock icon) to open the side drawer.
   - Inspect delivery attempts, events, status codes, and timestamps.
6. **Rotate Signing Secret:**
   - Click the **Rotate Secret** button (refresh icon) and confirm.
   - A new `whsec_...` secret is generated and shown once. Previous secrets will immediately fail signature validation.

---

## 3. Webhook Receiver Signature Verification

### Node.js (Express / Fastify / Standard HTTP)
```javascript
const crypto = require('crypto');

function verifyWeftroWebhook(rawBodyString, signatureHeader, secret) {
  if (!signatureHeader) return false;

  // Header format: t=1729188000,v1=abc123def...
  const parts = Object.fromEntries(signatureHeader.split(',').map(kv => kv.split('=')));
  const timestamp = parts.t;
  const signature = parts.v1;

  if (!timestamp || !signature) return false;

  // Replay attack prevention (optional 5-minute threshold)
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - parseInt(timestamp, 10)) > 300) {
    return false;
  }

  const signedPayload = `${timestamp}.${rawBodyString}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}
```

### Python (FastAPI / Flask)
```python
import hmac
import hashlib
import time

def verify_weftro_webhook(raw_body_bytes: bytes, signature_header: str, secret: str) -> bool:
    try:
        parts = dict(item.split("=") for item in signature_header.split(","))
        timestamp = parts.get("t")
        signature = parts.get("v1")
        if not timestamp or not signature:
            return False

        # Prevent replay attacks (> 5 min)
        if abs(time.time() - int(timestamp)) > 300:
            return False

        signed_payload = f"{timestamp}.".encode("utf-8") + raw_body_bytes
        expected_sig = hmac.new(
            secret.encode("utf-8"),
            signed_payload,
            hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(signature, expected_sig)
    except Exception:
        return False
```

---

## 4. Automated Acceptance Suite Execution

Run the live test suite against the deployed Supabase connect gateway:
```bash
node scripts/phase6_webhooks_acceptance_suite.cjs
```
**Expected Output:**
- 18 / 18 tests passing.
- Validates SSRF rejection, subscription lifecycle, secret rotation, scope enforcement, isolation, and delivery replay.
