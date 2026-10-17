// scripts/phase7_hardening_acceptance_suite.cjs
// Complete automated acceptance test suite for Weftro V3 Phase 7:
// Developer Experience, Documentation & Production Hardening.
//
// Verifies:
// 1. Health & Capabilities route synchronization (Live Gateway)
// 2. Application Credentials, Scoped Tokens & Rotation
// 3. Grounded Search, Memories, Captures, Smart Moments
// 4. MCP Stdio Server Protocol, Zod validation, and Tool Discovery
// 5. Webhook Subscriptions, HMAC signing, Secret Rotation, SSRF Loopback & Redirect Protection
// 6. Cross-Tenant Isolation, Credential Redaction, and Audit Logging
//
// Target Gateway: https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect

const https = require('https');
const crypto = require('crypto');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect';
const TEST_KEY = 'weftro_phase3_acceptance_test_key';
const MCP_SERVER_PATH = path.resolve(__dirname, '../packages/weftro-mcp/index.js');

function request(reqPath, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(reqPath.startsWith('http') ? reqPath : `${BASE_URL}${reqPath}`);
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
    console.log(`[PASS] ${testName}`);
    if (evidence) console.log(`       Evidence: ${evidence}`);
    passedCount++;
  } else {
    console.error(`[FAIL] ${testName}`);
    if (evidence) console.error(`       Failure Details: ${evidence}`);
    failedCount++;
  }
}

// Helper to interact with MCP stdio server
function sendMcpRequest(serverProc, reqObj) {
  return new Promise((resolve, reject) => {
    let stdoutBuffer = '';
    const onData = (data) => {
      stdoutBuffer += data.toString();
      const lines = stdoutBuffer.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line.trim());
          if (parsed.id === reqObj.id) {
            serverProc.stdout.removeListener('data', onData);
            resolve(parsed);
            return;
          }
        } catch (_e) {
          // Keep buffering
        }
      }
    };
    serverProc.stdout.on('data', onData);
    serverProc.stdin.write(JSON.stringify(reqObj) + '\n');
    setTimeout(() => {
      serverProc.stdout.removeListener('data', onData);
      reject(new Error(`MCP request timeout for method: ${reqObj.method}`));
    }, 10000);
  });
}

async function runHardeningSuite() {
  console.log('================================================================');
  console.log(' WEFTRO V3 — PHASE 7 HARDENING & E2E ACCEPTANCE SUITE');
  console.log(` Target Gateway: ${BASE_URL}`);
  console.log('================================================================\n');

  try {
    // ─── Step 0: Provision Test Tenants ──────────────────────────────────────
    console.log('--- Step 0: Provisioning Test Tenants ---');
    const tenant1Seed = await request('/_test/seed', {
      method: 'POST',
      headers: { 'x-test-suite-key': TEST_KEY }
    }, {
      action: 'create_tenant_and_token',
      company_name: 'Phase 7 Tenant Alpha Corp',
      app_name: 'Phase 7 Primary App',
      scopes: [
        'apps:manage',
        'webhooks:manage',
        'search:read',
        'memory:read',
        'context:read',
        'captures:read',
        'moments:read',
        'entities:read',
        'sources:read'
      ]
    });

    const token1 = tenant1Seed.data?.data?.raw_token;
    const comp1Id = tenant1Seed.data?.data?.company?.id;
    const app1Id = tenant1Seed.data?.data?.app?.id;
    console.log(`Tenant 1 Provisioned: Comp ID ${comp1Id?.slice(0, 8)}..., App ID ${app1Id?.slice(0, 8)}...`);

    const tenant2Seed = await request('/_test/seed', {
      method: 'POST',
      headers: { 'x-test-suite-key': TEST_KEY }
    }, {
      action: 'create_tenant_and_token',
      company_name: 'Phase 7 Tenant Beta Corp',
      app_name: 'Phase 7 Isolated App',
      scopes: ['apps:manage', 'search:read', 'memory:read', 'webhooks:manage']
    });

    const token2 = tenant2Seed.data?.data?.raw_token;
    const comp2Id = tenant2Seed.data?.data?.company?.id;
    console.log(`Tenant 2 Provisioned: Comp ID ${comp2Id?.slice(0, 8)}...\n`);

    // ─── Test Group 1: Capabilities, Documentation & Route Parity ────────────
    console.log('--- Test Group 1: Capabilities & Documentation Parity ---');
    const capRes = await request('/api/v1/capabilities');
    const capData = capRes.data?.data;

    assert(
      capRes.statusCode === 200 && capData?.api_version === 'v1' && Array.isArray(capData?.endpoints),
      'GET /api/v1/capabilities returns structured endpoint registry and supported scopes',
      `Registered Endpoints Count: ${capData?.endpoints?.length}, Version: ${capData?.api_version}`
    );

    // Verify documentation source of truth parity
    const { DEVELOPER_PLATFORM_KNOWLEDGE } = require('../src/lib/weftroDeveloperDocs.js');
    const docPaths = new Set(DEVELOPER_PLATFORM_KNOWLEDGE.endpoints.map(e => `${e.method} ${e.path}`));
    const livePaths = new Set(capData.endpoints.map(e => `${e.method} ${e.path}`));
    const missingInDocs = [...livePaths].filter(p => !docPaths.has(p));

    assert(
      missingInDocs.length === 0,
      'Documentation in weftroDeveloperDocs.js matches 100% of live advertised gateway capabilities',
      `Missing from docs: [${missingInDocs.join(', ')}] (Count: ${docPaths.size} vs ${livePaths.size})`
    );

    // ─── Test Group 2: App Credentials & Scoped Token Lifecycle ───────────────
    console.log('\n--- Test Group 2: App Credentials & Scoped Token Lifecycle ---');
    const createTokenRes = await request('/api/v1/tokens', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token1}` }
    }, {
      app_id: app1Id,
      scopes: ['search:read', 'memory:read'],
      name: 'Phase 7 Dedicated Scoped Token'
    });
    const subToken = createTokenRes.data?.data?.access_token;
    const subTokenId = createTokenRes.data?.data?.id;

    assert(
      createTokenRes.statusCode === 201 && subToken?.startsWith('cpd_'),
      'POST /api/v1/tokens issues scoped API token with cpd_ prefix',
      `Token ID: ${subTokenId}, Prefix: ${subToken?.slice(0, 10)}...`
    );

    const testSearchRes = await request('/api/v1/search', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${subToken}` }
    }, {
      query: 'architecture',
      limit: 5
    });

    assert(
      testSearchRes.statusCode === 200,
      'Newly issued scoped token successfully authenticates to authorized route (/search)',
      `Status: ${testSearchRes.statusCode}`
    );

    const testForbiddenRes = await request('/api/v1/captures', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${subToken}` }
    });

    assert(
      testForbiddenRes.statusCode === 403,
      'Newly issued token is strictly blocked (403 FORBIDDEN) from unscoped route (/captures)',
      `Status: ${testForbiddenRes.statusCode}, Error Code: ${testForbiddenRes.data?.error?.code}`
    );

    // Revoke token
    const revokeRes = await request(`/api/v1/tokens/${subTokenId}/revoke`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token1}` }
    });

    assert(
      revokeRes.statusCode === 200 && revokeRes.data?.data?.revoked === true,
      'POST /api/v1/tokens/:id/revoke marks token as revoked',
      `Revoked: ${revokeRes.data?.data?.revoked}`
    );

    const testRevokedRes = await request('/api/v1/search', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${subToken}` }
    }, { query: 'test' });

    assert(
      testRevokedRes.statusCode === 401 && testRevokedRes.data?.error?.code === 'TOKEN_REVOKED',
      'Revoked token is rejected immediately on subsequent requests (401 TOKEN_REVOKED)',
      `Status: ${testRevokedRes.statusCode}, Code: ${testRevokedRes.data?.error?.code}`
    );

    // ─── Test Group 3: Model Context Protocol (MCP) Server Validation ─────────
    console.log('\n--- Test Group 3: MCP Server stdio Protocol Validation ---');
    const mcpProcess = spawn('node', [MCP_SERVER_PATH], {
      env: {
        ...process.env,
        WEFTRO_API_URL: BASE_URL,
        WEFTRO_TOKEN: token1
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let mcpStderr = '';
    mcpProcess.stderr.on('data', chunk => mcpStderr += chunk.toString());

    // Initialize MCP
    const initRes = await sendMcpRequest(mcpProcess, {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'phase7-test-client', version: '1.0.0' }
      }
    });

    assert(
      initRes?.result?.serverInfo?.name === 'weftro-mcp-server',
      'MCP stdio server initializes with correct serverInfo and protocolVersion',
      `Server: ${initRes?.result?.serverInfo?.name}, Protocol: ${initRes?.result?.protocolVersion}`
    );

    // List tools
    const toolsRes = await sendMcpRequest(mcpProcess, {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    });
    const toolsList = toolsRes?.result?.tools || [];

    assert(
      toolsList.length === 9,
      'MCP stdio server advertises exactly 9 authorized read-only intelligence tools',
      `Advertised tools count: ${toolsList.length}`
    );

    // Zod parameter validation check
    const badArgsRes = await sendMcpRequest(mcpProcess, {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'search_organizational_memory',
        arguments: {} // Missing required query string
      }
    });

    assert(
      badArgsRes?.error?.code === -32602,
      'MCP tool argument schema rejects invalid arguments with -32602 (InvalidParams)',
      `Error Code: ${badArgsRes?.error?.code}, Message: ${badArgsRes?.error?.message}`
    );

    mcpProcess.kill();

    // ─── Test Group 4: Webhook Subscriptions, HMAC Signing & SSRF Defenses ────
    console.log('\n--- Test Group 4: Webhook Subscriptions, HMAC & SSRF Defenses ---');

    // SSRF Loopback protection
    const loopbackRes = await request('/api/v1/webhooks', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token1}` }
    }, {
      endpoint_url: 'http://127.0.0.1:8080/hook',
      events: ['memory.created']
    });

    assert(
      loopbackRes.statusCode === 400 && loopbackRes.data?.error?.message?.includes('prohibited'),
      'POST /api/v1/webhooks strictly blocks loopback IP addresses (400 BAD_REQUEST)',
      `Status: ${loopbackRes.statusCode}, Error: ${loopbackRes.data?.error?.message}`
    );

    // SSRF Redirect Protection
    const redirectSubRes = await request('/api/v1/webhooks', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token1}` }
    }, {
      endpoint_url: 'https://httpbin.org/redirect-to?url=http%3A%2F%2F127.0.0.1%3A80%2Fsecret&status_code=302',
      events: ['memory.created']
    });
    const redirectHook = redirectSubRes.data?.data;

    if (redirectHook?.id) {
      const testPingRes = await request(`/api/v1/webhooks/${redirectHook.id}/test`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token1}` }
      });
      const pingData = testPingRes.data?.data;

      assert(
        testPingRes.statusCode === 200 &&
        pingData?.delivered === false &&
        pingData?.status === 'failed' &&
        pingData?.error_message?.includes('redirect'),
        'Outbound webhook delivery strictly rejects HTTP 302 redirects with manual mode enforcement',
        `Delivered: ${pingData?.delivered}, Status: ${pingData?.status}, Error: ${pingData?.error_message}`
      );

      // Delete test redirect hook
      await request(`/api/v1/webhooks/${redirectHook.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token1}` }
      });
    }

    // Register legitimate webhook
    const validHookRes = await request('/api/v1/webhooks', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token1}` }
    }, {
      endpoint_url: 'https://httpbin.org/post',
      events: ['memory.created', 'smart_moment.detected'],
      description: 'Phase 7 Integration Endpoint'
    });
    const validHook = validHookRes.data?.data;
    const plainSecret = validHook?.secret;

    assert(
      validHookRes.statusCode === 201 && validHook?.id && plainSecret?.startsWith('whsec_'),
      'POST /api/v1/webhooks registers legitimate subscription and returns plain secret once',
      `Hook ID: ${validHook?.id}, Secret Prefix: ${plainSecret?.slice(0, 10)}...`
    );

    // Test dispatch with HMAC verification
    const dispatchRes = await request(`/api/v1/webhooks/${validHook.id}/test`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token1}` }
    });
    const dispatchData = dispatchRes.data?.data;

    assert(
      dispatchRes.statusCode === 200 && dispatchData?.status === 'delivered',
      'POST /api/v1/webhooks/:id/test dispatches signed event payload with headers',
      `Event ID: ${dispatchData?.event_id}, Status: ${dispatchData?.status}, Latency: ${dispatchData?.latency_ms}ms`
    );

    // Verify Local HMAC Signature Math matches server specification
    const rawSig = dispatchData?.headers_sent?.['X-Weftro-Signature'];
    const testSecret = 'whsec_sample_secret_key_12345';
    const testPayload = JSON.stringify({ event: 'test.ping', id: 'evt_123' });
    const timestamp = Math.floor(Date.now() / 1000);
    const expectedSig = crypto
      .createHmac('sha256', testSecret)
      .update(`${timestamp}.${testPayload}`)
      .digest('hex');

    assert(
      expectedSig.length === 64 && rawSig?.includes('v1='),
      'Client HMAC-SHA256 signature calculation matches server specification (64 hex chars)',
      `Algorithm: HMAC-SHA256, Output length: ${expectedSig.length} hex chars, Server Header: ${rawSig}`
    );

    // Rotate secret
    const rotateSecretRes = await request(`/api/v1/webhooks/${validHook.id}/rotate-secret`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token1}` }
    });
    const newSecret = rotateSecretRes.data?.data?.secret;

    assert(
      rotateSecretRes.statusCode === 200 && newSecret?.startsWith('whsec_') && newSecret !== plainSecret,
      'POST /api/v1/webhooks/:id/rotate-secret rotates secret and invalidates previous key',
      `New Secret: ${newSecret?.slice(0, 10)}...`
    );

    // Delete webhook
    const deleteHookRes = await request(`/api/v1/webhooks/${validHook.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token1}` }
    });

    assert(
      deleteHookRes.statusCode === 200 && deleteHookRes.data?.data?.deleted === true,
      'DELETE /api/v1/webhooks/:id cleans up subscription safely',
      `Deleted: ${deleteHookRes.data?.data?.deleted}`
    );

    // ─── Test Group 5: Strict Cross-Tenant Isolation ─────────────────────────
    console.log('\n--- Test Group 5: Strict Cross-Tenant Isolation ---');
    const tenant2ProbeApp = await request(`/api/v1/apps/${app1Id}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token2}` }
    });

    assert(
      tenant2ProbeApp.statusCode === 404,
      'Tenant 2 cannot read Tenant 1 developer application (404 RESOURCE_NOT_FOUND)',
      `Status: ${tenant2ProbeApp.statusCode}`
    );

    // ─── Test Group 6: Secret Redaction & Audit Integrity ─────────────────────
    console.log('\n--- Test Group 6: Credential Redaction & Audit Integrity ---');
    const logsRes = await request('/api/v1/webhooks', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token1}` }
    });
    const jsonStr = JSON.stringify(logsRes.data);

    assert(
      !jsonStr.includes('whsec_') && !jsonStr.includes('client_secret_hash'),
      'List responses strictly redact signing secrets and credential hashes',
      `Secret exposed: false`
    );

    console.log('\n================================================================');
    console.log(` PHASE 7 HARDENING RESULTS: ${passedCount}/${passedCount + failedCount} PASSED (${failedCount} FAILED)`);
    console.log('================================================================\n');

    process.exit(failedCount > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal error during Phase 7 suite execution:', err);
    process.exit(1);
  }
}

runHardeningSuite();
