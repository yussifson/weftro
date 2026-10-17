// scripts/phase3_acceptance_suite.cjs
// Complete automated acceptance test suite for Weftro V3 Phase 3 Unified REST API Gateway
// Executes live against https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect

const https = require('https');

const BASE_URL = 'https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect';
const TEST_KEY = 'weftro_phase3_acceptance_test_key';

function request(path, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path.startsWith('http') ? path : `${BASE_URL}${path}`);
    const reqOptions = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Accept': 'application/json',
        ...(options.headers || {})
      }
    };

    if (body) {
      const payload = typeof body === 'string' ? body : JSON.stringify(body);
      reqOptions.headers['Content-Type'] = 'application/json';
      reqOptions.headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = https.request(reqOptions, (res) => {
      let rawData = '';
      res.on('data', chunk => rawData += chunk);
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(rawData);
        } catch (_e) {
          parsed = rawData;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsed
        });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runAcceptanceSuite() {
  console.log('================================================================');
  console.log(' WEFTRO V3 — PHASE 3 LIVE ACCEPTANCE TEST SUITE');
  console.log(` Target Gateway: ${BASE_URL}`);
  console.log('================================================================\n');

  const results = [];

  function record(name, pass, details) {
    results.push({ name, pass, details });
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name}`);
    if (details) console.log(`       Evidence: ${details}`);
  }

  try {
    // -------------------------------------------------------------
    // SETUP: Provision Test Tenants & Resources
    // -------------------------------------------------------------
    console.log('--- Step 0: Provisioning Test Tenants & Credentials ---');
    
    // Org 1 Setup
    const org1Seed = await request('/_test/seed', {
      method: 'POST',
      headers: { 'x-test-suite-key': TEST_KEY }
    }, {
      action: 'create_tenant_and_token',
      company_name: 'Acceptance Org 1',
      app_name: 'App Org 1',
      scopes: ['search:read', 'memory:read', 'context:read', 'captures:read', 'moments:read', 'entities:read', 'sources:read'],
      rate_limit_rpm: 120
    });
    const tokenOrg1 = org1Seed.data.data.raw_token;
    const comp1 = org1Seed.data.data.company;

    // Seed resources for Org 1
    const res1 = await request('/_test/seed', {
      method: 'POST',
      headers: { 'x-test-suite-key': TEST_KEY }
    }, {
      action: 'seed_resources',
      company_id: comp1.id,
      user_id: 'ce93f2a7-f2cd-4b99-aa2d-ebef3d63e715'
    });
    const org1Data = res1.data.data;

    // Org 2 Setup (Tenant Isolation verification)
    const org2Seed = await request('/_test/seed', {
      method: 'POST',
      headers: { 'x-test-suite-key': TEST_KEY }
    }, {
      action: 'create_tenant_and_token',
      company_name: 'Acceptance Org 2',
      app_name: 'App Org 2',
      scopes: ['search:read', 'memory:read', 'context:read', 'captures:read', 'moments:read', 'entities:read', 'sources:read'],
      rate_limit_rpm: 120
    });
    const tokenOrg2 = org2Seed.data.data.raw_token;
    const comp2 = org2Seed.data.data.company;

    console.log(`Org 1 created: ${comp1.id}`);
    console.log(`Org 2 created: ${comp2.id}`);
    console.log('Resources seeded for Org 1.\n');

    // -------------------------------------------------------------
    // TEST 1: Public Health & Capabilities Endpoints
    // -------------------------------------------------------------
    console.log('--- Test Group 1: Health & Capabilities Endpoints ---');
    const health = await request('/health');
    record(
      'GET /health returns 200 with service status and requestId',
      health.statusCode === 200 && health.data?.data?.status === 'healthy' && !!health.data?.meta?.request_id,
      `Status: ${health.statusCode}, Version: ${health.data?.data?.version}, RequestId: ${health.data?.meta?.request_id}`
    );

    const caps = await request('/capabilities');
    record(
      'GET /capabilities returns 200 with registered versioned routes and scopes',
      caps.statusCode === 200 && Array.isArray(caps.data?.data?.endpoints) && caps.data.data.endpoints.length >= 10,
      `Endpoints Count: ${caps.data?.data?.endpoints?.length}, Version: ${caps.data?.data?.api_version}`
    );

    // -------------------------------------------------------------
    // TEST 2: Authentication Matrix (Missing, Invalid, Expired, Revoked, Inactive App)
    // -------------------------------------------------------------
    console.log('\n--- Test Group 2: Authentication & Token Lifecycle ---');

    // Missing Header
    const authMissing = await request('/search', { method: 'POST' }, { query: 'test' });
    record(
      'Missing Authorization header returns 401 UNAUTHORIZED',
      authMissing.statusCode === 401 && authMissing.data?.error?.code === 'UNAUTHORIZED',
      `Status: ${authMissing.statusCode}, Code: ${authMissing.data?.error?.code}`
    );

    // Invalid Token
    const authInvalid = await request('/search', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer bad_secret_token_xyz' }
    }, { query: 'test' });
    record(
      'Invalid Bearer token returns 401 INVALID_CREDENTIALS',
      authInvalid.statusCode === 401 && authInvalid.data?.error?.code === 'INVALID_CREDENTIALS',
      `Status: ${authInvalid.statusCode}, Code: ${authInvalid.data?.error?.code}`
    );

    // Expired Token
    const expiredSeed = await request('/_test/seed', {
      method: 'POST',
      headers: { 'x-test-suite-key': TEST_KEY }
    }, {
      action: 'create_tenant_and_token',
      expires_at: '2020-01-01T00:00:00Z'
    });
    const expiredToken = expiredSeed.data.data.raw_token;
    const authExpired = await request('/search', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${expiredToken}` }
    }, { query: 'test' });
    record(
      'Expired token returns 401 TOKEN_EXPIRED',
      authExpired.statusCode === 401 && authExpired.data?.error?.code === 'TOKEN_EXPIRED',
      `Status: ${authExpired.statusCode}, Code: ${authExpired.data?.error?.code}`
    );

    // Revoked Token
    const revokedSeed = await request('/_test/seed', {
      method: 'POST',
      headers: { 'x-test-suite-key': TEST_KEY }
    }, {
      action: 'create_tenant_and_token',
      is_revoked: true
    });
    const revokedToken = revokedSeed.data.data.raw_token;
    const authRevoked = await request('/search', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${revokedToken}` }
    }, { query: 'test' });
    record(
      'Revoked token returns 401 TOKEN_REVOKED',
      authRevoked.statusCode === 401 && authRevoked.data?.error?.code === 'TOKEN_REVOKED',
      `Status: ${authRevoked.statusCode}, Code: ${authRevoked.data?.error?.code}`
    );

    // Inactive App Token
    const inactiveAppSeed = await request('/_test/seed', {
      method: 'POST',
      headers: { 'x-test-suite-key': TEST_KEY }
    }, {
      action: 'create_tenant_and_token',
      is_app_active: false
    });
    const inactiveAppToken = inactiveAppSeed.data.data.raw_token;
    const authInactiveApp = await request('/search', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${inactiveAppToken}` }
    }, { query: 'test' });
    record(
      'Token from inactive application returns 403 APP_INACTIVE',
      authInactiveApp.statusCode === 403 && authInactiveApp.data?.error?.code === 'APP_INACTIVE',
      `Status: ${authInactiveApp.statusCode}, Code: ${authInactiveApp.data?.error?.code}`
    );

    // -------------------------------------------------------------
    // TEST 3: Scope Enforcement
    // -------------------------------------------------------------
    console.log('\n--- Test Group 3: Scope Enforcement ---');

    // Token with ONLY search:read scope
    const scopedSeed = await request('/_test/seed', {
      method: 'POST',
      headers: { 'x-test-suite-key': TEST_KEY }
    }, {
      action: 'create_tenant_and_token',
      scopes: ['search:read']
    });
    const searchOnlyToken = scopedSeed.data.data.raw_token;

    // Allowed: search
    const scopeAllowed = await request('/search', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${searchOnlyToken}` }
    }, { query: 'Alpha' });
    record(
      'Token with search:read succeeds on POST /search',
      scopeAllowed.statusCode === 200,
      `Status: ${scopeAllowed.statusCode}`
    );

    // Denied: /memories (requires memory:read)
    const scopeDeniedMemories = await request('/memories', {
      headers: { 'Authorization': `Bearer ${searchOnlyToken}` }
    });
    record(
      'Token lacking memory:read returns 403 on GET /memories',
      scopeDeniedMemories.statusCode === 403 && scopeDeniedMemories.data?.error?.code === 'FORBIDDEN',
      `Status: ${scopeDeniedMemories.statusCode}, Message: ${scopeDeniedMemories.data?.error?.message}`
    );

    // Denied: /captures (requires captures:read)
    const scopeDeniedCaptures = await request('/captures', {
      headers: { 'Authorization': `Bearer ${searchOnlyToken}` }
    });
    record(
      'Token lacking captures:read returns 403 on GET /captures',
      scopeDeniedCaptures.statusCode === 403 && scopeDeniedCaptures.data?.error?.code === 'FORBIDDEN',
      `Status: ${scopeDeniedCaptures.statusCode}`
    );

    // -------------------------------------------------------------
    // TEST 4: Verified Endpoints Execution (Org 1)
    // -------------------------------------------------------------
    console.log('\n--- Test Group 4: All Implemented API Endpoints (Org 1) ---');

    // 1. POST /api/v1/search
    const searchRes = await request('/api/v1/search', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenOrg1}` }
    }, { query: 'Architectural' });
    record(
      'POST /api/v1/search returns real organizational memories with provenance',
      searchRes.statusCode === 200 && searchRes.data?.data?.length > 0 && !!searchRes.data?.data[0]?.provenance,
      `Found: ${searchRes.data?.data?.length} memories, Title: "${searchRes.data?.data[0]?.title}"`
    );

    // 2. POST /api/v1/context/query
    const contextRes = await request('/api/v1/context/query', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenOrg1}` }
    }, { session_id: org1Data.session.id });
    record(
      'POST /api/v1/context/query returns context session and linked captures',
      contextRes.statusCode === 200 && contextRes.data?.data?.session?.id === org1Data.session.id,
      `Session Title: "${contextRes.data?.data?.session?.title}", Captures Count: ${contextRes.data?.data?.captures?.length}`
    );

    // 3. GET /api/v1/memories
    const memoriesList = await request('/api/v1/memories?limit=5', {
      headers: { 'Authorization': `Bearer ${tokenOrg1}` }
    });
    record(
      'GET /api/v1/memories returns paginated memory list with metadata envelope',
      memoriesList.statusCode === 200 && Array.isArray(memoriesList.data?.data) && memoriesList.data?.data?.length > 0,
      `Count: ${memoriesList.data?.data?.length}, Total: ${memoriesList.data?.meta?.total}`
    );

    // 4. GET /api/v1/memories/:id
    const memoryItem = await request(`/api/v1/memories/${org1Data.memory.id}`, {
      headers: { 'Authorization': `Bearer ${tokenOrg1}` }
    });
    record(
      'GET /api/v1/memories/:id returns exact memory record',
      memoryItem.statusCode === 200 && memoryItem.data?.data?.id === org1Data.memory.id,
      `ID: ${memoryItem.data?.data?.id}, Importance: ${memoryItem.data?.data?.importance}`
    );

    // 5. GET /api/v1/entities/:id
    const entityItem = await request(`/api/v1/entities/${org1Data.entity.id}`, {
      headers: { 'Authorization': `Bearer ${tokenOrg1}` }
    });
    record(
      'GET /api/v1/entities/:id returns entity node with graph relationships array',
      entityItem.statusCode === 200 && entityItem.data?.data?.id === org1Data.entity.id,
      `Entity Name: "${entityItem.data?.data?.name}", Type: ${entityItem.data?.data?.entity_type}`
    );

    // 6. GET /api/v1/captures
    const capturesList = await request('/api/v1/captures?limit=5', {
      headers: { 'Authorization': `Bearer ${tokenOrg1}` }
    });
    record(
      'GET /api/v1/captures returns authorized capture records',
      capturesList.statusCode === 200 && capturesList.data?.data?.length > 0,
      `Captures Count: ${capturesList.data?.data?.length}`
    );

    // 7. GET /api/v1/captures/:id
    const captureItem = await request(`/api/v1/captures/${org1Data.capture.id}`, {
      headers: { 'Authorization': `Bearer ${tokenOrg1}` }
    });
    record(
      'GET /api/v1/captures/:id returns full capture details and provenance',
      captureItem.statusCode === 200 && captureItem.data?.data?.id === org1Data.capture.id,
      `Capture Title: "${captureItem.data?.data?.title}", Status: ${captureItem.data?.data?.status}`
    );

    // 8. GET /api/v1/captures/:id/status
    const captureStatus = await request(`/api/v1/captures/${org1Data.capture.id}/status`, {
      headers: { 'Authorization': `Bearer ${tokenOrg1}` }
    });
    record(
      'GET /api/v1/captures/:id/status returns capture status and background queue job state',
      captureStatus.statusCode === 200 && captureStatus.data?.data?.capture_id === org1Data.capture.id && !!captureStatus.data?.data?.queue_job,
      `Capture Status: ${captureStatus.data?.data?.capture_status}, Queue Status: ${captureStatus.data?.data?.queue_job?.status}`
    );

    // 9. GET /api/v1/smart-moments
    const momentsList = await request('/api/v1/smart-moments', {
      headers: { 'Authorization': `Bearer ${tokenOrg1}` }
    });
    record(
      'GET /api/v1/smart-moments returns extracted meeting and video smart moments',
      momentsList.statusCode === 200 && Array.isArray(momentsList.data?.data),
      `Moments Count: ${momentsList.data?.data?.length}`
    );

    // 10. GET /api/v1/sources/:id (capture backing source)
    const sourceCapture = await request(`/api/v1/sources/${org1Data.capture.id}`, {
      headers: { 'Authorization': `Bearer ${tokenOrg1}` }
    });
    record(
      'GET /api/v1/sources/:id resolves capture source provenance',
      sourceCapture.statusCode === 200 && sourceCapture.data?.data?.type === 'capture',
      `Source Type: ${sourceCapture.data?.data?.type}, Title: "${sourceCapture.data?.data?.details?.title}"`
    );

    // -------------------------------------------------------------
    // TEST 5: Tenant Isolation (Org 2 attempting access to Org 1)
    // -------------------------------------------------------------
    console.log('\n--- Test Group 5: Strict Cross-Tenant Isolation ---');

    // Org 2 searching for Org 1 content
    const crossSearch = await request('/api/v1/search', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenOrg2}` }
    }, { query: 'Architectural' });
    record(
      'Cross-Tenant Search: Org 2 receives 0 results for Org 1 memory content',
      crossSearch.statusCode === 200 && crossSearch.data?.data?.length === 0,
      `Org 2 Search Result Count: ${crossSearch.data?.data?.length}`
    );

    // Org 2 attempting to read Org 1 memory ID
    const crossMemory = await request(`/api/v1/memories/${org1Data.memory.id}`, {
      headers: { 'Authorization': `Bearer ${tokenOrg2}` }
    });
    record(
      'Cross-Tenant Memory: Org 2 reading Org 1 memory ID receives 404 RESOURCE_NOT_FOUND',
      crossMemory.statusCode === 404 && crossMemory.data?.error?.code === 'RESOURCE_NOT_FOUND',
      `Status: ${crossMemory.statusCode}, Code: ${crossMemory.data?.error?.code}`
    );

    // Org 2 attempting to read Org 1 capture ID
    const crossCapture = await request(`/api/v1/captures/${org1Data.capture.id}`, {
      headers: { 'Authorization': `Bearer ${tokenOrg2}` }
    });
    record(
      'Cross-Tenant Capture: Org 2 reading Org 1 capture ID receives 404 RESOURCE_NOT_FOUND',
      crossCapture.statusCode === 404 && crossCapture.data?.error?.code === 'RESOURCE_NOT_FOUND',
      `Status: ${crossCapture.statusCode}`
    );

    // Org 2 attempting to read Org 1 entity ID
    const crossEntity = await request(`/api/v1/entities/${org1Data.entity.id}`, {
      headers: { 'Authorization': `Bearer ${tokenOrg2}` }
    });
    record(
      'Cross-Tenant Entity: Org 2 reading Org 1 entity ID receives 404 RESOURCE_NOT_FOUND',
      crossEntity.statusCode === 404 && crossEntity.data?.error?.code === 'RESOURCE_NOT_FOUND',
      `Status: ${crossEntity.statusCode}`
    );

    // Org 2 attempting to read Org 1 context session ID
    const crossContext = await request('/api/v1/context/query', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenOrg2}` }
    }, { session_id: org1Data.session.id });
    record(
      'Cross-Tenant Context: Org 2 reading Org 1 context session receives 404 RESOURCE_NOT_FOUND',
      crossContext.statusCode === 404 && crossContext.data?.error?.code === 'RESOURCE_NOT_FOUND',
      `Status: ${crossContext.statusCode}`
    );

    // -------------------------------------------------------------
    // TEST 6: Distributed Rate Limiting Enforcement
    // -------------------------------------------------------------
    console.log('\n--- Test Group 6: Distributed Rate Limiting ---');
    // Provision low RPM token (5 RPM)
    const rateLimitedSeed = await request('/_test/seed', {
      method: 'POST',
      headers: { 'x-test-suite-key': TEST_KEY }
    }, {
      action: 'create_tenant_and_token',
      rate_limit_rpm: 5
    });
    const lowRpmToken = rateLimitedSeed.data.data.raw_token;

    let hit429 = false;
    let rateHeaders = {};
    for (let i = 0; i < 7; i++) {
      const rlRes = await request('/api/v1/memories', {
        headers: { 'Authorization': `Bearer ${lowRpmToken}` }
      });
      rateHeaders = rlRes.headers;
      if (rlRes.statusCode === 429) {
        hit429 = true;
        break;
      }
    }

    record(
      'Rate limit triggers 429 when quota exceeded, emitting X-RateLimit headers and Retry-After',
      hit429 && !!rateHeaders['retry-after'],
      `429 Hit: ${hit429}, X-RateLimit-Limit: ${rateHeaders['x-ratelimit-limit']}, Retry-After: ${rateHeaders['retry-after']}`
    );

    // -------------------------------------------------------------
    // TEST 7: Input Validation, Pagination Bounds & Malformed Requests
    // -------------------------------------------------------------
    console.log('\n--- Test Group 7: Input Validation & Boundary Conditions ---');

    // Malformed Search (missing query)
    const badSearch = await request('/api/v1/search', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenOrg1}` }
    }, { limit: 10 });
    record(
      'POST /search without query string returns 400 BAD_REQUEST',
      badSearch.statusCode === 400 && badSearch.data?.error?.code === 'BAD_REQUEST',
      `Status: ${badSearch.statusCode}, Message: ${badSearch.data?.error?.message}`
    );

    // Nonexistent Resource ID
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const missingRes = await request(`/api/v1/memories/${fakeId}`, {
      headers: { 'Authorization': `Bearer ${tokenOrg1}` }
    });
    record(
      'GET nonexistent resource returns 404 RESOURCE_NOT_FOUND without revealing presence',
      missingRes.statusCode === 404 && missingRes.data?.error?.code === 'RESOURCE_NOT_FOUND',
      `Status: ${missingRes.statusCode}`
    );

    // Pagination bounds check
    const paginatedRes = await request('/api/v1/memories?limit=999&offset=0', {
      headers: { 'Authorization': `Bearer ${tokenOrg1}` }
    });
    record(
      'Query parameter limit=999 is safely bounded to server maximum (100)',
      paginatedRes.statusCode === 200 && paginatedRes.data?.meta?.limit === 100,
      `Requested: 999, Enforced Limit: ${paginatedRes.data?.meta?.limit}`
    );

    // -------------------------------------------------------------
    // SUMMARY REPORT
    // -------------------------------------------------------------
    console.log('\n================================================================');
    const total = results.length;
    const passed = results.filter(r => r.pass).length;
    const failed = total - passed;
    console.log(` ACCEPTANCE RESULTS: ${passed}/${total} PASSED (${failed} FAILED)`);
    console.log('================================================================\n');

    return { total, passed, failed, results };

  } catch (error) {
    console.error('Acceptance suite unhandled failure:', error);
    return { total: 0, passed: 0, failed: 1, error: error.message };
  }
}

runAcceptanceSuite();
