# Phase 3 — Manual Testing Guide: Unified REST API Gateway

**Target Environment:** Supabase Edge Runtime (`eu-west-3`)  
**Base URL:** `https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect`  
**Verified Commit:** `14877b3`  
**Security Notice:** All tests use synthetic test data. Never input production keys or passwords.

---

## 1. Prerequisites & Environment Setup

You will need a terminal with `curl` or an API testing client (Postman, Insomnia, Bruno).

Ensure the test gateway is responsive by running:
```bash
curl -i https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect/health
```
**Expected Result:**
```json
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": {
    "status": "healthy",
    "service": "weftro-v3-api-gateway",
    "version": "v1",
    "uptime_check": "ok"
  },
  "meta": {
    "api_version": "v1",
    "request_id": "req_..."
  }
}
```

---

## 2. Step-by-Step Manual Test Scenarios

### Test Scenario A: Public Capabilities Discovery
**Action:** Request available endpoints and scopes without credentials.
```bash
curl -i https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect/capabilities
```
**Expected Response:**
- HTTP status code `200 OK`.
- JSON envelope containing `data.api_version: "v1"`.
- `data.supported_scopes` listing standard scopes (`search:read`, `memory:read`, `context:read`, `captures:read`, `moments:read`, `entities:read`, `sources:read`).
- `data.endpoints` listing 12 versioned `/api/v1/*` routes.

---

### Test Scenario B: Authentication Failure Permutations

#### B1: Missing Authorization Header
**Action:**
```bash
curl -i -X POST https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect/api/v1/search \
  -H "Content-Type: application/json" \
  -d '{"query":"architecture"}'
```
**Expected Response:**
- HTTP status `401 Unauthorized`.
- Body: `{"error":{"code":"UNAUTHORIZED","message":"Missing or malformed Authorization header. Expected Bearer <token>.","request_id":"..."}}`.

#### B2: Invalid Bearer Token
**Action:**
```bash
curl -i -X POST https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect/api/v1/search \
  -H "Authorization: Bearer invalid_secret_token_abc" \
  -H "Content-Type: application/json" \
  -d '{"query":"architecture"}'
```
**Expected Response:**
- HTTP status `401 Unauthorized`.
- Body: `{"error":{"code":"INVALID_CREDENTIALS","message":"The provided API token is invalid, unrecognized, or expired.","request_id":"..."}}`.

---

### Test Scenario C: Automated Tenant Provisioning & Authenticated Requests

To execute authenticated manual calls with live test data, run the automated acceptance harness to generate an ephemeral test tenant and test token:
```bash
node -e "
const http = require('https');
const payload = JSON.stringify({ action: 'create_tenant_and_token', company_name: 'Manual Verifier Org' });
const req = http.request('https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect/_test/seed', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-test-suite-key': 'weftro_phase3_acceptance_test_key',
    'Content-Length': Buffer.byteLength(payload)
  }
}, (res) => {
  let d = ''; res.on('data', c => d += c);
  res.on('end', () => {
    const json = JSON.parse(d);
    console.log('COMPANY_ID=' + json.data.company.id);
    console.log('TEST_TOKEN=' + json.data.raw_token);
  });
});
req.write(payload); req.end();
"
```
*Note the output `TEST_TOKEN` and `COMPANY_ID`.*

#### C1: Seed Sample Data into the Test Tenant
Run:
```bash
node -e "
const http = require('https');
const payload = JSON.stringify({
  action: 'seed_resources',
  company_id: 'PASTE_COMPANY_ID_HERE',
  user_id: 'ce93f2a7-f2cd-4b99-aa2d-ebef3d63e715'
});
const req = http.request('https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect/_test/seed', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-test-suite-key': 'weftro_phase3_acceptance_test_key',
    'Content-Length': Buffer.byteLength(payload)
  }
}, (res) => {
  let d = ''; res.on('data', c => d += c);
  res.on('end', () => console.log('Seeded successfully:', JSON.parse(d).data.memory?.id));
});
req.write(payload); req.end();
"
```

#### C2: Execute Grounded Search
```bash
curl -i -X POST https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect/api/v1/search \
  -H "Authorization: Bearer PASTE_TEST_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"query":"Blueprint"}'
```
**Expected Response:**
- HTTP status `200 OK`.
- `data` array containing `"Project Alpha Architectural Blueprint"`.
- Valid provenance block (`confidence: 0.98`, `memory_type: "FACT"`, `memory_tier: "organizational"`).

#### C3: List Memories with Pagination
```bash
curl -i https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect/api/v1/memories?limit=5 \
  -H "Authorization: Bearer PASTE_TEST_TOKEN_HERE"
```
**Expected Response:**
- HTTP status `200 OK`.
- `meta.total: 1`, `meta.limit: 5`, `meta.offset: 0`.

---

### Test Scenario D: Distributed Rate Limiting Verification
Run 6 consecutive rapid requests with a low-RPM token or verify response headers:
```bash
curl -i https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect/api/v1/memories \
  -H "Authorization: Bearer PASTE_TEST_TOKEN_HERE"
```
**Expected Headers in Response:**
- `X-RateLimit-Limit: 120`
- `X-RateLimit-Remaining: 119` (decrements per request)
- `X-RateLimit-Reset: <seconds>`

---

## 3. Pass / Fail Checklist

| Checklist Item | Result (Pass/Fail) | Verified By |
|---|---|---|
| 1. Health check returns 200 with service name | [ ] | User |
| 2. Capabilities returns list of 12 routes & scopes | [ ] | User |
| 3. Missing auth returns 401 UNAUTHORIZED | [ ] | User |
| 4. Bad token returns 401 INVALID_CREDENTIALS | [ ] | User |
| 5. Authenticated search returns genuine memory | [ ] | User |
| 6. Rate limit headers emitted on valid response | [ ] | User |

## 4. Troubleshooting
If requests fail with `500 INTERNAL_SERVER_ERROR`:
1. Check that the `Authorization` header is formatted as `Bearer <token>` (with a single space).
2. Ensure you ran the Phase 3 SQL migration in your Supabase SQL editor (`public.check_api_rate_limit` RPC).
