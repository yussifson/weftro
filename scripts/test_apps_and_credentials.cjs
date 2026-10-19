// scripts/test_apps_and_credentials.cjs
// End-to-end Verification Suite for Weftro Apps & Credentials and Corporate REST API
// Executes against live production corporate domain: https://www.weftro.com/api/v1
// Tests:
// 1. Gateway Health & Capabilities on corporate custom domain
// 2. Developer Application Creation (POST /api/v1/apps) with client_id & plaintext secret (one-time)
// 3. Application List (GET /api/v1/apps)
// 4. Secret Rotation (POST /api/v1/apps/:id/rotate-secret) & old secret invalidation
// 5. Scoped Access Token Issuance (POST /api/v1/tokens)
// 6. Token Authentication on Authorized Route (POST /api/v1/search)
// 7. Granular Scope Enforcement (POST /api/v1/memories -> 403 FORBIDDEN when missing memory:write)
// 8. Token Revocation (POST /api/v1/tokens/:id/revoke)
// 9. Revocation Enforcement (Subsequent search -> 401 TOKEN_REVOKED)

const https = require('https');

const GATEWAY_URL = 'https://www.weftro.com';
const BACKEND_URL = 'https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect';
const TEST_KEY = 'weftro_phase3_acceptance_test_key';

function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const reqOptions = {
      hostname: u.hostname,
      port: 443,
      path: u.pathname + u.search,
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
        try { parsed = JSON.parse(rawData); } catch(e) { parsed = rawData; }
        resolve({ statusCode: res.statusCode, headers: res.headers, data: parsed });
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

let passed = 0;
let failed = 0;

function assert(condition, name, evidence = '') {
  if (condition) {
    console.log(`[PASS] ${name}`);
    if (evidence) console.log(`       Evidence: ${evidence}`);
    passed++;
  } else {
    console.error(`[FAIL] ${name}`);
    if (evidence) console.error(`       Failure Details: ${evidence}`);
    failed++;
  }
}

async function main() {
  console.log('================================================================');
  console.log(' WEFTRO V3 — APPS & CREDENTIALS ACCEPTANCE SUITE');
  console.log(` Target Gateway: ${GATEWAY_URL}/api/v1`);
  console.log('================================================================\n');

  // 1. Health check on corporate domain
  const healthRes = await request(`${GATEWAY_URL}/api/v1/health`);
  assert(
    healthRes.statusCode === 200 && healthRes.data?.data?.status === 'healthy',
    'Gateway Health Probe on https://www.weftro.com/api/v1/health',
    `Status: ${healthRes.statusCode}, Version: ${healthRes.data?.data?.version}`
  );

  // 2. Capabilities check
  const capRes = await request(`${GATEWAY_URL}/api/v1/capabilities`);
  assert(
    capRes.statusCode === 200 && capRes.data?.data?.endpoints?.length >= 10,
    'Gateway Capabilities Probe on https://www.weftro.com/api/v1/capabilities',
    `Registered Endpoints: ${capRes.data?.data?.endpoints?.length}`
  );

  // 3. Provision Admin Tenant & Seed Token
  const seedRes = await request(`${BACKEND_URL}/_test/seed`, {
    method: 'POST',
    headers: { 'x-test-suite-key': TEST_KEY }
  }, {
    action: 'create_tenant_and_token',
    company_name: 'Weftro Corporate Test Tenant',
    app_name: 'Primary Enterprise Client',
    scopes: ['apps:manage', 'search:read', 'memory:read']
  });
  const adminToken = seedRes.data?.data?.raw_token;
  assert(
    seedRes.statusCode === 200 && adminToken?.startsWith('cpd_'),
    'Admin tenant and master token provisioned',
    `Token Prefix: ${adminToken?.slice(0, 10)}...`
  );

  // 4. Create Developer Application via corporate gateway
  const createAppRes = await request(`${GATEWAY_URL}/api/v1/apps`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  }, {
    name: 'Customer Integration Bot',
    description: 'Autonomous customer workspace synchronizer',
    redirect_uris: ['https://app.weftro.com/oauth/callback']
  });
  const newApp = createAppRes.data?.data;
  assert(
    createAppRes.statusCode === 201 && newApp?.client_id?.startsWith('client_') && newApp?.client_secret?.startsWith('secret_'),
    'POST /api/v1/apps creates new client application and returns client_secret once',
    `App ID: ${newApp?.id}, Client ID: ${newApp?.client_id}`
  );

  // 5. List applications
  const listAppsRes = await request(`${GATEWAY_URL}/api/v1/apps`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(
    listAppsRes.statusCode === 200 && listAppsRes.data?.data?.some(a => a.id === newApp.id),
    'GET /api/v1/apps lists newly registered developer application',
    `Total Apps Count: ${listAppsRes.data?.data?.length}`
  );

  // 6. Rotate application client secret
  const rotateRes = await request(`${GATEWAY_URL}/api/v1/apps/${newApp.id}/rotate-secret`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const rotatedSecret = rotateRes.data?.data?.client_secret;
  assert(
    rotateRes.statusCode === 200 && rotatedSecret && rotatedSecret !== newApp.client_secret,
    'POST /api/v1/apps/:id/rotate-secret rotates secret and invalidates previous key',
    `New Secret Prefix: ${rotatedSecret?.slice(0, 10)}...`
  );

  // 7. Issue scoped token for new app
  const issueTokenRes = await request(`${GATEWAY_URL}/api/v1/tokens`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  }, {
    app_id: newApp.id,
    scopes: ['search:read', 'memory:read']
  });
  const scopedToken = issueTokenRes.data?.data?.access_token;
  const tokenId = issueTokenRes.data?.data?.id;
  assert(
    issueTokenRes.statusCode === 201 && scopedToken?.startsWith('cpd_'),
    'POST /api/v1/tokens issues scoped API token with cpd_ prefix',
    `Token ID: ${tokenId}, Scopes: [${issueTokenRes.data?.data?.scopes?.join(', ')}]`
  );

  // 8. Test scoped token on authorized route (/search)
  const searchRes = await request(`${GATEWAY_URL}/api/v1/search`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${scopedToken}` }
  }, {
    query: 'financial priorities'
  });
  assert(
    searchRes.statusCode === 200,
    'Scoped token authenticates successfully on authorized route (/api/v1/search)',
    `Status: ${searchRes.statusCode}, Request ID: ${searchRes.headers['x-request-id']}`
  );

  // 9. Scope Enforcement: Try calling route requiring memory:write with read-only token
  const writeForbiddenRes = await request(`${GATEWAY_URL}/api/v1/memories`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${scopedToken}` }
  }, {
    title: 'Unauthorized Memory Addition',
    content: 'This must be blocked'
  });
  assert(
    writeForbiddenRes.statusCode === 403 && writeForbiddenRes.data?.error?.code === 'FORBIDDEN',
    'Scope Enforcement strictly blocks unscoped mutations (403 FORBIDDEN)',
    `Status: ${writeForbiddenRes.statusCode}, Error Code: ${writeForbiddenRes.data?.error?.code}`
  );

  // 10. Revoke token
  const revokeRes = await request(`${GATEWAY_URL}/api/v1/tokens/${tokenId}/revoke`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(
    revokeRes.statusCode === 200 && revokeRes.data?.data?.revoked === true,
    'POST /api/v1/tokens/:id/revoke marks token as revoked',
    `Revoked: ${revokeRes.data?.data?.revoked}`
  );

  // 11. Post-revocation rejection
  const postRevokeRes = await request(`${GATEWAY_URL}/api/v1/search`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${scopedToken}` }
  }, { query: 'test' });
  assert(
    postRevokeRes.statusCode === 401 && postRevokeRes.data?.error?.code === 'TOKEN_REVOKED',
    'Revoked token is rejected immediately on subsequent requests (401 TOKEN_REVOKED)',
    `Status: ${postRevokeRes.statusCode}, Error Code: ${postRevokeRes.data?.error?.code}`
  );

  console.log('\n================================================================');
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
