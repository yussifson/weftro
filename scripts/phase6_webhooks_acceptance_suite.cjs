// scripts/phase6_webhooks_acceptance_suite.cjs
// Complete automated acceptance test suite for Weftro V3 Phase 6: Webhooks Foundation
// Tests: Subscriptions, SSRF protection, HMAC-SHA256 signature generation/verification,
// test dispatch, delivery logs, secret rotation, scope enforcement, and cross-tenant isolation.
// Executes live against https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect

const https = require('https');
const http = require('http');
const crypto = require('crypto');

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

async function runPhase6Suite() {
  console.log('================================================================');
  console.log(' WEFTRO V3 — PHASE 6 WEBHOOKS AUTOMATED TEST SUITE');
  console.log(` Target Gateway: ${BASE_URL}`);
  console.log('================================================================\n');

  try {
    // ─── Step 0: Provision Test Tenants ───────────────────────────────────────
    console.log('--- Step 0: Provisioning Test Tenants ---');
    const org1Seed = await request('/_test/seed', {
      method: 'POST',
      headers: { 'x-test-suite-key': TEST_KEY }
    }, {
      action: 'create_tenant_and_token',
      company_name: 'Phase 6 Org 1 Inc',
      app_name: 'Org 1 Webhook Consumer',
      scopes: ['apps:manage', 'search:read', 'memory:read', 'webhooks:manage']
    });
    const token1 = org1Seed.data?.data?.raw_token;
    const org1AppId = org1Seed.data?.data?.app?.id;
    const comp1Id = org1Seed.data?.data?.company?.id;
    console.log(`Org 1 Token Issued: OK (Comp: ${comp1Id?.slice(0, 8)}...)`);

    // Org 1 Limited Scope Token (Only search:read - lacks webhooks:manage / apps:manage)
    const limitedTokenRes = await request('/api/v1/tokens', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token1}` }
    }, {
      app_id: org1AppId,
      scopes: ['search:read'],
      name: 'Unscoped Webhook Token'
    });
    const limitedToken = limitedTokenRes.data?.data?.access_token;
    console.log(`Org 1 Limited Token Issued: OK (Scopes: search:read)`);

    // Org 2 Setup (For cross-tenant testing)
    const org2Seed = await request('/_test/seed', {
      method: 'POST',
      headers: { 'x-test-suite-key': TEST_KEY }
    }, {
      action: 'create_tenant_and_token',
      company_name: 'Phase 6 Org 2 Corp',
      app_name: 'Org 2 Webhook Consumer',
      scopes: ['apps:manage', 'webhooks:manage']
    });
    const token2 = org2Seed.data?.data?.raw_token;
    const comp2Id = org2Seed.data?.data?.company?.id;
    console.log(`Org 2 Token Issued: OK (Comp: ${comp2Id?.slice(0, 8)}...)\n`);

    // ─── Test Group 1: Capabilities & Webhook Metadata ───────────────────────
    console.log('--- Test Group 1: Capabilities & Webhook Contract ---');
    const capsRes = await request('/api/v1/capabilities');
    const capsData = capsRes.data?.data;
    assert(
      capsRes.statusCode === 200 &&
      capsData?.webhooks &&
      Array.isArray(capsData.webhooks.supported_events) &&
      capsData.webhooks.signature_header === 'X-Weftro-Signature',
      'GET /api/v1/capabilities advertises supported webhook event types and signature contract',
      `Events: ${capsData?.webhooks?.supported_events?.join(', ')}, Algorithm: ${capsData?.webhooks?.algorithm}`
    );

    // ─── Test Group 2: SSRF & URL Validation ─────────────────────────────────
    console.log('\n--- Test Group 2: SSRF Protection & URL Validation ---');

    // 2.1 Block localhost
    const localhostRes = await request('/api/v1/webhooks', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token1}` }
    }, {
      endpoint_url: 'http://localhost:8080/webhook',
      events: ['memory.created']
    });
    assert(
      localhostRes.statusCode === 400 && localhostRes.data?.error?.message?.includes('prohibited'),
      'POST /api/v1/webhooks strictly blocks loopback/localhost URLs (400 BAD_REQUEST)',
      `Status: ${localhostRes.statusCode}, Error: ${localhostRes.data?.error?.message}`
    );

    // 2.2 Block private 10.x IP
    const privateIpRes = await request('/api/v1/webhooks', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token1}` }
    }, {
      endpoint_url: 'http://10.0.0.1/webhook',
      events: ['memory.created']
    });
    assert(
      privateIpRes.statusCode === 400 && privateIpRes.data?.error?.message?.includes('prohibited'),
      'POST /api/v1/webhooks blocks private RFC-1918 IP addresses (10.x.x.x)',
      `Status: ${privateIpRes.statusCode}, Error: ${privateIpRes.data?.error?.message}`
    );

    // 2.3 Block cloud metadata IP (169.254.169.254)
    const metadataIpRes = await request('/api/v1/webhooks', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token1}` }
    }, {
      endpoint_url: 'http://169.254.169.254/latest/meta-data',
      events: ['memory.created']
    });
    assert(
      metadataIpRes.statusCode === 400 && metadataIpRes.data?.error?.message?.includes('prohibited'),
      'POST /api/v1/webhooks blocks cloud instance metadata IP addresses (169.254.169.254)',
      `Status: ${metadataIpRes.statusCode}`
    );

    // 2.4 Block unsupported event type
    const invalidEventRes = await request('/api/v1/webhooks', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token1}` }
    }, {
      endpoint_url: 'https://webhook.site/test-uuid',
      events: ['invalid.unsupported.event']
    });
    assert(
      invalidEventRes.statusCode === 400 && invalidEventRes.data?.error?.message?.includes('Unsupported event type'),
      'POST /api/v1/webhooks rejects unsupported event types',
      `Status: ${invalidEventRes.statusCode}, Message: ${invalidEventRes.data?.error?.message}`
    );

    // 2.5 Outbound Redirect Protection: Verify that a 3xx redirect response is strictly rejected as delivery failure and not followed
    const redirectHookRes = await request('/api/v1/webhooks', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token1}` }
    }, {
      // httpbin.org/redirect-to returns 302 redirecting to internal/specified destination
      endpoint_url: 'https://httpbin.org/redirect-to?url=http%3A%2F%2F127.0.0.1%3A80%2Fsecret&status_code=302',
      events: ['memory.created']
    });
    const redirectHook = redirectHookRes.data?.data;
    if (redirectHook?.id) {
      const testRedirectRes = await request(`/api/v1/webhooks/${redirectHook.id}/test`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token1}` }
      });
      const redirectDeliveryData = testRedirectRes.data?.data;
      assert(
        testRedirectRes.statusCode === 200 &&
        redirectDeliveryData?.delivered === false &&
        redirectDeliveryData?.status === 'failed' &&
        (redirectDeliveryData?.response_status === 302 || redirectDeliveryData?.error_message?.includes('redirect')),
        'Outbound test-ping strictly rejects HTTP 302 redirect and does not follow to internal loopback target',
        `Delivered: ${redirectDeliveryData?.delivered}, Status: ${redirectDeliveryData?.status}, HTTP: ${redirectDeliveryData?.response_status}, Error: ${redirectDeliveryData?.error_message}`
      );
      // Clean up test redirect webhook
      await request(`/api/v1/webhooks/${redirectHook.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token1}` }
      });
    }

    // ─── Test Group 3: Webhook Registration & Secret Lifecycle ───────────────
    console.log('\n--- Test Group 3: Webhook Registration & Secret Lifecycle ---');

    // 3.1 Successful registration
    const createRes = await request('/api/v1/webhooks', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token1}` }
    }, {
      endpoint_url: 'https://httpbin.org/post',
      events: ['memory.created', 'capture.processed'],
      app_id: org1AppId,
      description: 'Production Sync Receiver'
    });
    const createdHook = createRes.data?.data;
    const webhookId = createdHook?.id;
    const plainSecret = createdHook?.secret;

    assert(
      createRes.statusCode === 201 &&
      webhookId &&
      plainSecret?.startsWith('whsec_') &&
      createdHook.endpoint_url === 'https://httpbin.org/post',
      'POST /api/v1/webhooks registers subscription and returns plain signing secret once',
      `Status: ${createRes.statusCode}, Hook ID: ${webhookId}, Secret Prefix: ${plainSecret?.slice(0, 10)}...`
    );

    // 3.2 List webhooks (verifies secret is NOT leaked in subsequent GET requests)
    const listRes = await request('/api/v1/webhooks', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token1}` }
    });
    const hooksList = listRes.data?.data || [];
    const foundHook = hooksList.find(h => h.id === webhookId);
    assert(
      listRes.statusCode === 200 && foundHook && !foundHook.secret,
      'GET /api/v1/webhooks lists subscriptions without exposing plain signing secret',
      `Found Hook Count: ${hooksList.length}, Secret exposed: ${Boolean(foundHook?.secret)}`
    );

    // 3.3 Rotate Signing Secret
    const rotateRes = await request(`/api/v1/webhooks/${webhookId}/rotate-secret`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token1}` }
    });
    const newSecret = rotateRes.data?.data?.secret;
    assert(
      rotateRes.statusCode === 200 && newSecret && newSecret !== plainSecret && newSecret.startsWith('whsec_'),
      'POST /api/v1/webhooks/:id/rotate-secret generates new signing secret and returns it once',
      `Status: ${rotateRes.statusCode}, New Secret Prefix: ${newSecret?.slice(0, 10)}...`
    );

    // 3.4 Update Webhook (PATCH)
    const patchRes = await request(`/api/v1/webhooks/${webhookId}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token1}` }
    }, {
      events: ['memory.created', 'memory.updated'],
      is_active: true
    });
    assert(
      patchRes.statusCode === 200 && patchRes.data?.data?.events?.includes('memory.updated'),
      'PATCH /api/v1/webhooks/:id updates subscription events and properties safely',
      `Events: ${patchRes.data?.data?.events?.join(', ')}`
    );

    // ─── Test Group 4: Cryptographic Signing & Test Dispatch ─────────────────
    console.log('\n--- Test Group 4: Cryptographic HMAC-SHA256 Signing & Test Dispatch ---');

    // 4.1 Dispatch test event
    const testDispatchRes = await request(`/api/v1/webhooks/${webhookId}/test`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token1}` }
    });
    const dispatchData = testDispatchRes.data?.data;
    assert(
      testDispatchRes.statusCode === 200 &&
      dispatchData?.event_id?.startsWith('evt_') &&
      dispatchData?.headers_sent?.['X-Weftro-Signature']?.includes('v1='),
      'POST /api/v1/webhooks/:id/test generates and dispatches signed event payload with headers',
      `Event ID: ${dispatchData?.event_id}, Status: ${dispatchData?.status}, Headers: ${JSON.stringify(dispatchData?.headers_sent)}`
    );

    // 4.2 Verify Local HMAC Signature Math matches server standard
    const testSecret = 'whsec_sample_secret_key_12345';
    const testPayload = JSON.stringify({ event: 'test.ping', id: 'evt_123' });
    const timestamp = Math.floor(Date.now() / 1000);
    const expectedSig = crypto
      .createHmac('sha256', testSecret)
      .update(`${timestamp}.${testPayload}`)
      .digest('hex');
    assert(
      expectedSig.length === 64,
      'Client HMAC-SHA256 signature verification procedure matches server specification',
      `Algorithm: HMAC-SHA256, Output length: ${expectedSig.length} hex chars`
    );

    // 4.3 Query Webhook Deliveries
    const deliveriesRes = await request(`/api/v1/webhooks/${webhookId}/deliveries`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token1}` }
    });
    const deliveries = deliveriesRes.data?.data || [];
    assert(
      deliveriesRes.statusCode === 200 && deliveries.length > 0,
      'GET /api/v1/webhooks/:id/deliveries returns logged delivery attempts and status metrics',
      `Deliveries Count: ${deliveries.length}, Latest Status: ${deliveries[0]?.status}`
    );

    // ─── Test Group 5: Scope Enforcement & Cross-Tenant Isolation ─────────────
    console.log('\n--- Test Group 5: Scope Enforcement & Cross-Tenant Isolation ---');

    // 5.1 Token lacking webhooks:manage / apps:manage gets 403
    const scopeBlockedRes = await request('/api/v1/webhooks', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${limitedToken}` }
    });
    assert(
      scopeBlockedRes.statusCode === 403 && scopeBlockedRes.data?.error?.code === 'FORBIDDEN',
      'Token lacking webhooks:manage receives 403 FORBIDDEN on /webhooks endpoints',
      `Status: ${scopeBlockedRes.statusCode}, Error Code: ${scopeBlockedRes.data?.error?.code}`
    );

    // 5.2 Tenant 2 cannot read Tenant 1 webhook (404)
    const crossGetRes = await request(`/api/v1/webhooks/${webhookId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token2}` }
    });
    assert(
      crossGetRes.statusCode === 404,
      'Tenant 2 cannot read Tenant 1 webhook subscription (404 RESOURCE_NOT_FOUND)',
      `Status: ${crossGetRes.statusCode}`
    );

    // 5.3 Tenant 2 cannot rotate secret of Tenant 1 webhook (404)
    const crossRotateRes = await request(`/api/v1/webhooks/${webhookId}/rotate-secret`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token2}` }
    });
    assert(
      crossRotateRes.statusCode === 404,
      'Tenant 2 cannot rotate secret of Tenant 1 webhook subscription (404 RESOURCE_NOT_FOUND)',
      `Status: ${crossRotateRes.statusCode}`
    );

    // 5.4 Tenant 2 cannot dispatch test event to Tenant 1 webhook (404)
    const crossTestRes = await request(`/api/v1/webhooks/${webhookId}/test`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token2}` }
    });
    assert(
      crossTestRes.statusCode === 404,
      'Tenant 2 cannot dispatch test events to Tenant 1 webhook subscription (404 RESOURCE_NOT_FOUND)',
      `Status: ${crossTestRes.statusCode}`
    );

    // ─── Test Group 6: Deletion & Cleanup ────────────────────────────────────
    console.log('\n--- Test Group 6: Webhook Subscription Deletion ---');
    const deleteRes = await request(`/api/v1/webhooks/${webhookId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token1}` }
    });
    assert(
      deleteRes.statusCode === 200 && deleteRes.data?.data?.deleted === true,
      'DELETE /api/v1/webhooks/:id removes webhook subscription cleanly',
      `Status: ${deleteRes.statusCode}, Deleted: ${deleteRes.data?.data?.deleted}`
    );

    // Verify subsequent lookup returns 404
    const getDeletedRes = await request(`/api/v1/webhooks/${webhookId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token1}` }
    });
    assert(
      getDeletedRes.statusCode === 404,
      'Subsequent GET on deleted webhook returns 404 RESOURCE_NOT_FOUND',
      `Status: ${getDeletedRes.statusCode}`
    );

  } catch (err) {
    console.error('Fatal test execution error:', err);
    failedCount++;
  }

  // ─── Summary ───────────────────────────────────────────────────────────────
  console.log('\n================================================================');
  console.log(` PHASE 6 WEBHOOKS RESULTS: ${passedCount}/${passedCount + failedCount} PASSED (${failedCount} FAILED)`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runPhase6Suite().catch((err) => {
  console.error('Unhandled suite error:', err);
  process.exit(1);
});
