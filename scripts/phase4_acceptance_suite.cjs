// scripts/phase4_acceptance_suite.cjs
// Complete automated acceptance test suite for Weftro V3 Phase 4:
// Developer Identity, Applications, Credentials & Scopes
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

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, evidence = '') {
  if (condition) {
    passedCount++;
    console.log(`[PASS] ${testName}`);
    if (evidence) console.log(`       Evidence: ${evidence}`);
  } else {
    failedCount++;
    console.error(`[FAIL] ${testName}`);
    if (evidence) console.error(`       Evidence: ${evidence}`);
  }
}

async function runPhase4Suite() {
  console.log('================================================================');
  console.log(' WEFTRO V3 — PHASE 4 LIVE ACCEPTANCE TEST SUITE');
  console.log(` Target Gateway: ${BASE_URL}`);
  console.log('================================================================\n');

  try {
    // 0. Seed two test companies and admin tokens (with apps:manage scope)
    console.log('--- Step 0: Provisioning Test Tenants ---');
    const org1Seed = await request('/_test/seed', {
      method: 'POST',
      headers: { 'x-test-suite-key': TEST_KEY }
    }, {
      action: 'create_tenant_and_token',
      company_name: 'Phase 4 Acceptance Tenant 1',
      app_name: 'Tenant 1 Primary App',
      scopes: ['apps:manage', 'search:read', 'memory:read']
    });

    const org2Seed = await request('/_test/seed', {
      method: 'POST',
      headers: { 'x-test-suite-key': TEST_KEY }
    }, {
      action: 'create_tenant_and_token',
      company_name: 'Phase 4 Acceptance Tenant 2',
      app_name: 'Tenant 2 Primary App',
      scopes: ['apps:manage', 'search:read']
    });

    const token1 = org1Seed.data?.data?.raw_token;
    const token2 = org2Seed.data?.data?.raw_token;
    const comp1Id = org1Seed.data?.data?.company?.id;
    const comp2Id = org2Seed.data?.data?.company?.id;

    console.log(`Org 1 Token Issued: ${token1 ? 'OK' : 'FAIL'} (Comp: ${comp1Id})`);
    console.log(`Org 2 Token Issued: ${token2 ? 'OK' : 'FAIL'} (Comp: ${comp2Id})\n`);

    // ─── Test Group 1: Application Registration & Credentials ────────────────
    console.log('--- Test Group 1: Application Registration & Credentials ---');
    
    // 1.1 Create App
    const createAppRes = await request('/api/v1/apps', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token1}` }
    }, {
      name: 'Custom ERP Sync Engine',
      description: 'Synchronizes ERP inventory events with organizational memory',
      redirect_uris: ['https://erp.example.com/oauth/callback']
    });

    const createdApp = createAppRes.data?.data;
    assert(
      createAppRes.statusCode === 201 && createdApp?.client_id && createdApp?.client_secret,
      'POST /api/v1/apps registers application and returns client_id with one-time plain client_secret',
      `Status: ${createAppRes.statusCode}, Client ID: ${createdApp?.client_id}, Secret Prefix: ${createdApp?.client_secret?.slice(0, 10)}...`
    );

    const appId = createdApp?.id;

    // 1.2 List Apps
    const listAppsRes = await request('/api/v1/apps', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token1}` }
    });
    const appsList = listAppsRes.data?.data || [];
    const foundCreatedApp = appsList.find(a => a.id === appId);
    assert(
      listAppsRes.statusCode === 200 && foundCreatedApp && !foundCreatedApp.client_secret_hash,
      'GET /api/v1/apps lists organization apps and never exposes client_secret_hash',
      `App count: ${appsList.length}, Hash exposed: ${Boolean(foundCreatedApp?.client_secret_hash)}`
    );

    // 1.3 Get Single App Details
    const getAppRes = await request(`/api/v1/apps/${appId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token1}` }
    });
    assert(
      getAppRes.statusCode === 200 && getAppRes.data?.data?.name === 'Custom ERP Sync Engine',
      'GET /api/v1/apps/:id returns specific app details',
      `Status: ${getAppRes.statusCode}, Name: "${getAppRes.data?.data?.name}"`
    );

    // 1.4 Update App Details (PATCH)
    const patchAppRes = await request(`/api/v1/apps/${appId}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token1}` }
    }, {
      name: 'Custom ERP Sync Engine (v2)',
      description: 'Updated description'
    });
    assert(
      patchAppRes.statusCode === 200 && patchAppRes.data?.data?.name === 'Custom ERP Sync Engine (v2)',
      'PATCH /api/v1/apps/:id safely updates application properties',
      `Updated Name: "${patchAppRes.data?.data?.name}"`
    );

    // ─── Test Group 2: Client Secret Rotation ────────────────────────────────
    console.log('\n--- Test Group 2: Client Secret Rotation ---');
    const rotateRes = await request(`/api/v1/apps/${appId}/rotate-secret`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token1}` }
    });
    const rotatedSecret = rotateRes.data?.data?.client_secret;
    assert(
      rotateRes.statusCode === 200 && rotatedSecret && rotatedSecret !== createdApp?.client_secret,
      'POST /api/v1/apps/:id/rotate-secret generates new client_secret and returns it once',
      `Status: ${rotateRes.statusCode}, New Secret Prefix: ${rotatedSecret?.slice(0, 10)}...`
    );

    // ─── Test Group 3: Scoped API Token Lifecycle ────────────────────────────
    console.log('\n--- Test Group 3: Scoped API Token Lifecycle ---');

    // 3.1 Issue Scoped Token
    const createTokenRes = await request('/api/v1/tokens', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token1}` }
    }, {
      app_id: appId,
      scopes: ['search:read', 'memory:read'],
      rate_limit_rpm: 60
    });
    const issuedToken = createTokenRes.data?.data;
    const rawIssuedToken = issuedToken?.access_token;
    assert(
      createTokenRes.statusCode === 201 && rawIssuedToken?.startsWith('cpd_'),
      'POST /api/v1/tokens issues scoped API token (cpd_...) with requested scopes',
      `Status: ${createTokenRes.statusCode}, Token Prefix: ${rawIssuedToken?.slice(0, 12)}..., Scopes: ${issuedToken?.scopes?.join(', ')}`
    );

    // 3.2 List Tokens for App
    const listTokensRes = await request(`/api/v1/tokens?app_id=${appId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token1}` }
    });
    const tokensList = listTokensRes.data?.data || [];
    assert(
      listTokensRes.statusCode === 200 && tokensList.length > 0 && !tokensList[0].token_hash,
      'GET /api/v1/tokens lists issued credentials without exposing token hashes',
      `Count: ${tokensList.length}, Hash exposed: ${Boolean(tokensList[0]?.token_hash)}`
    );

    // 3.3 Validate Issued Token Works against Gateway Endpoints
    const searchWithIssuedRes = await request('/api/v1/search', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${rawIssuedToken}` }
    }, { query: 'test' });
    assert(
      searchWithIssuedRes.statusCode === 200,
      'Newly issued scoped token successfully authenticates to authorized endpoints (/search)',
      `Status: ${searchWithIssuedRes.statusCode}`
    );

    // 3.4 Verify Token Cannot Access Unscoped Endpoint (e.g. captures:read)
    const unscopedRes = await request('/api/v1/captures', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${rawIssuedToken}` }
    });
    assert(
      unscopedRes.statusCode === 403,
      'Newly issued token is strictly blocked (403 FORBIDDEN) from unscoped capabilities (/captures)',
      `Status: ${unscopedRes.statusCode}, Error Code: ${unscopedRes.data?.error?.code}`
    );

    // 3.5 Revoke Token
    const revokeRes = await request(`/api/v1/tokens/${issuedToken?.id}/revoke`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token1}` }
    });
    assert(
      revokeRes.statusCode === 200 && revokeRes.data?.data?.revoked === true,
      'POST /api/v1/tokens/:id/revoke marks token as revoked',
      `Status: ${revokeRes.statusCode}, Revoked: ${revokeRes.data?.data?.revoked}`
    );

    // 3.6 Verify Revoked Token is Immediately Rejected
    const useRevokedRes = await request('/api/v1/search', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${rawIssuedToken}` }
    }, { query: 'test' });
    assert(
      useRevokedRes.statusCode === 401 && useRevokedRes.data?.error?.code === 'TOKEN_REVOKED',
      'Revoked token is rejected immediately on subsequent requests with 401 TOKEN_REVOKED',
      `Status: ${useRevokedRes.statusCode}, Code: ${useRevokedRes.data?.error?.code}`
    );

    // ─── Test Group 4: Cross-Tenant Isolation in App Management ──────────────
    console.log('\n--- Test Group 4: Cross-Tenant Isolation in App Management ---');

    // 4.1 Tenant 2 cannot view Tenant 1's app
    const t2ViewAppRes = await request(`/api/v1/apps/${appId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token2}` }
    });
    assert(
      t2ViewAppRes.statusCode === 404,
      'Tenant 2 cannot read Tenant 1 application record (404 RESOURCE_NOT_FOUND)',
      `Status: ${t2ViewAppRes.statusCode}`
    );

    // 4.2 Tenant 2 cannot update Tenant 1's app
    const t2UpdateAppRes = await request(`/api/v1/apps/${appId}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token2}` }
    }, { name: 'Hijacked App' });
    assert(
      t2UpdateAppRes.statusCode === 404,
      'Tenant 2 cannot update Tenant 1 application record (404 RESOURCE_NOT_FOUND)',
      `Status: ${t2UpdateAppRes.statusCode}`
    );

    // 4.3 Tenant 2 cannot rotate Tenant 1's secret
    const t2RotateRes = await request(`/api/v1/apps/${appId}/rotate-secret`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token2}` }
    });
    assert(
      t2RotateRes.statusCode === 404,
      'Tenant 2 cannot rotate Tenant 1 application secret (404 RESOURCE_NOT_FOUND)',
      `Status: ${t2RotateRes.statusCode}`
    );

    // 4.4 Tenant 2 cannot issue tokens for Tenant 1's app
    const t2IssueTokenRes = await request('/api/v1/tokens', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token2}` }
    }, {
      app_id: appId,
      scopes: ['search:read']
    });
    assert(
      t2IssueTokenRes.statusCode === 404,
      'Tenant 2 cannot issue tokens for Tenant 1 application (404 RESOURCE_NOT_FOUND)',
      `Status: ${t2IssueTokenRes.statusCode}`
    );

    // ─── Test Group 5: Application Deactivation & Inactive App Behavior ──────
    console.log('\n--- Test Group 5: Application Deactivation & Cascading Enforcement ---');

    // 5.1 Issue new token for app
    const freshTokenRes = await request('/api/v1/tokens', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token1}` }
    }, {
      app_id: appId,
      scopes: ['search:read', 'memory:read']
    });
    const freshToken = freshTokenRes.data?.data?.access_token;

    // 5.2 Deactivate App
    await request(`/api/v1/apps/${appId}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token1}` }
    }, { is_active: false });

    // 5.3 Attempt request with token belonging to deactivated app
    const testDeactivatedRes = await request('/api/v1/search', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${freshToken}` }
    }, { query: 'test' });
    assert(
      testDeactivatedRes.statusCode === 403 && testDeactivatedRes.data?.error?.code === 'APP_INACTIVE',
      'Token from deactivated application is rejected with 403 APP_INACTIVE',
      `Status: ${testDeactivatedRes.statusCode}, Code: ${testDeactivatedRes.data?.error?.code}`
    );

    // 5.4 Reactivate App & Verify Token Functions Again
    await request(`/api/v1/apps/${appId}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token1}` }
    }, { is_active: true });

    const testReactivatedRes = await request('/api/v1/search', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${freshToken}` }
    }, { query: 'test' });
    assert(
      testReactivatedRes.statusCode === 200,
      'Reactivating application restores access for existing valid tokens',
      `Status: ${testReactivatedRes.statusCode}`
    );

    // 5.5 Delete App
    const deleteAppRes = await request(`/api/v1/apps/${appId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token1}` }
    });
    assert(
      deleteAppRes.statusCode === 200 && deleteAppRes.data?.data?.deleted === true,
      'DELETE /api/v1/apps/:id removes application',
      `Status: ${deleteAppRes.statusCode}, Deleted: ${deleteAppRes.data?.data?.deleted}`
    );

    console.log('\n================================================================');
    console.log(` PHASE 4 ACCEPTANCE RESULTS: ${passedCount}/${passedCount + failedCount} PASSED (${failedCount} FAILED)`);
    console.log('================================================================\n');

    process.exit(failedCount === 0 ? 0 : 1);
  } catch (err) {
    console.error('Test Suite Fatal Error:', err);
    process.exit(1);
  }
}

runPhase4Suite();
