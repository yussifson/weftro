/**
 * Remote MCP Acceptance Test Suite for Weftro V3
 *
 * Validates Streamable HTTP & SSE remote MCP capabilities directly against
 * the live edge function endpoint:
 *   https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect/mcp
 */

const https = require('https');

const GATEWAY_URL = 'https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect';
const MCP_ENDPOINT = `${GATEWAY_URL}/mcp`;
const TEST_KEY = 'weftro_phase3_acceptance_test_key';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${message}`);
    if (details) console.log(`       Evidence: ${details}`);
  } else {
    failedTests++;
    console.error(`[FAIL] ${message}`);
    if (details) console.error(`       Details: ${details}`);
  }
}

function requestJson(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const reqOpts = {
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.pathname + (parsed.search || ''),
      method: options.method || 'GET',
      headers: {
        'Accept': 'application/json, text/event-stream',
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = https.request(reqOpts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (_e) {
          json = data;
        }
        resolve({ status: res.status, statusCode: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runRemoteMcpSuite() {
  console.log('================================================================');
  console.log(' WEFTRO V3 — REMOTE STREAMABLE HTTP MCP ACCEPTANCE SUITE');
  console.log(` Target Endpoint: ${MCP_ENDPOINT}`);
  console.log('================================================================\n');

  try {
    // 0. Seed test tenants
    console.log('--- Step 0: Provisioning Test Tenants ---');
    const org1Res = await requestJson(`${GATEWAY_URL}/_test/seed`, {
      method: 'POST',
      headers: { 'x-test-suite-key': TEST_KEY }
    }, {
      action: 'create_tenant_and_token',
      company_name: `Remote MCP Org 1 ${Date.now()}`,
      scopes: ['search:read', 'context:read', 'memory:read', 'entities:read', 'captures:read', 'moments:read', 'sources:read', 'captures:write', 'memory:write']
    });

    const org2Res = await requestJson(`${GATEWAY_URL}/_test/seed`, {
      method: 'POST',
      headers: { 'x-test-suite-key': TEST_KEY }
    }, {
      action: 'create_tenant_and_token',
      company_name: `Remote MCP Org 2 ${Date.now()}`,
      scopes: ['search:read', 'memory:read'] // Read-only scopes
    });

    const tenant1 = org1Res.body.data;
    const tenant2 = org2Res.body.data;
    const token1 = tenant1.raw_token;
    const token2 = tenant2.raw_token;

    // Seed resources for tenant 1
    await requestJson(`${GATEWAY_URL}/_test/seed`, {
      method: 'POST',
      headers: { 'x-test-suite-key': TEST_KEY }
    }, {
      action: 'seed_resources',
      company_id: tenant1.company.id,
      user_id: tenant1.user_id
    });

    console.log(`Tenant 1: ${tenant1.company.id}`);
    console.log(`Tenant 2: ${tenant2.company.id}\n`);

    // Group 1: Protocol Discovery & SSE Stream
    console.log('--- Test Group 1: Remote Transport Discovery & Protocol Handshake ---');

    // 1.1 GET /mcp (SSE stream probe)
    const sseRes = await requestJson(MCP_ENDPOINT, { method: 'GET' });
    assert(
      sseRes.statusCode === 200 && sseRes.headers['content-type']?.includes('text/event-stream'),
      'GET /mcp responds with text/event-stream for SSE-capable clients',
      `Status: ${sseRes.statusCode}, Content-Type: ${sseRes.headers['content-type']}, Body: ${typeof sseRes.body === 'string' ? sseRes.body.trim() : JSON.stringify(sseRes.body)}`
    );

    // 1.2 POST /mcp initialize without credentials
    const initRes = await requestJson(MCP_ENDPOINT, { method: 'POST' }, {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'ChatGPT-Cloud-Client', version: '1.0' }
      }
    });

    assert(
      initRes.statusCode === 200 && initRes.body.result?.protocolVersion === '2024-11-05',
      'POST /mcp handles initialize without auth, returning protocol 2024-11-05 and serverInfo',
      `Server: ${initRes.body.result?.serverInfo?.name}, Protocol: ${initRes.body.result?.protocolVersion}`
    );

    // 1.3 POST /mcp notifications/initialized
    const initializedRes = await requestJson(MCP_ENDPOINT, { method: 'POST' }, {
      jsonrpc: '2.0',
      method: 'notifications/initialized'
    });

    assert(
      initializedRes.statusCode === 204,
      'POST /mcp handles notifications/initialized with HTTP 204 No Content',
      `Status: ${initializedRes.statusCode}`
    );

    // 1.4 POST /mcp ping
    const pingRes = await requestJson(MCP_ENDPOINT, { method: 'POST' }, {
      jsonrpc: '2.0',
      id: 2,
      method: 'ping'
    });

    assert(
      pingRes.statusCode === 200 && pingRes.body.result !== undefined,
      'POST /mcp responds to ping',
      `Result: ${JSON.stringify(pingRes.body.result)}`
    );

    // 1.5 POST /mcp tools/list
    const toolsListRes = await requestJson(MCP_ENDPOINT, { method: 'POST' }, {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/list'
    });

    const tools = toolsListRes.body.result?.tools || [];
    assert(
      toolsListRes.statusCode === 200 && tools.length === 11,
      'POST /mcp tools/list returns all 11 standardized tool definitions with JSON schemas',
      `Tools Count: ${tools.length}, Names: ${tools.map(t => t.name).join(', ')}`
    );

    // Group 2: Authentication & Scope Enforcement
    console.log('\n--- Test Group 2: Remote MCP Authentication & Scopes ---');

    // 2.1 Unauthenticated tool call
    const unauthCallRes = await requestJson(MCP_ENDPOINT, { method: 'POST' }, {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'search_organizational_memory',
        arguments: { query: 'architectural' }
      }
    });

    assert(
      unauthCallRes.statusCode === 401 && unauthCallRes.body.error?.code === -32600,
      'Calling tools without Authorization header returns MCP error (-32600) with 401',
      `Status: ${unauthCallRes.statusCode}, Error: ${unauthCallRes.body.error?.message}`
    );

    // 2.2 Invalid token
    const invalidTokRes = await requestJson(MCP_ENDPOINT, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer cpd_invalid_bogus_token_12345' }
    }, {
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'search_organizational_memory',
        arguments: { query: 'architectural' }
      }
    });

    assert(
      invalidTokRes.statusCode === 401 && invalidTokRes.body.error?.code === -32600,
      'Calling tools with invalid token is rejected with 401',
      `Status: ${invalidTokRes.statusCode}, Error: ${invalidTokRes.body.error?.message}`
    );

    // 2.3 Forbidden write tool (Tenant 2 has read-only scopes, attempts create_capture)
    const forbiddenWriteRes = await requestJson(MCP_ENDPOINT, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token2}` }
    }, {
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: {
        name: 'create_capture',
        arguments: { content: 'Unauthorized write attempt' }
      }
    });

    assert(
      forbiddenWriteRes.statusCode === 403 && forbiddenWriteRes.body.error?.message?.includes('captures:write required'),
      'Calling write tool without write scope returns 403 Forbidden with scope requirement',
      `Status: ${forbiddenWriteRes.statusCode}, Error: ${forbiddenWriteRes.body.error?.message}`
    );

    // Group 3: Read Tool Operations & Tenant Isolation
    console.log('\n--- Test Group 3: Read Operations & Strict Tenant Isolation ---');

    // 3.1 Authorized search_organizational_memory for Tenant 1
    const searchRes = await requestJson(MCP_ENDPOINT, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token1}` }
    }, {
      jsonrpc: '2.0',
      id: 7,
      method: 'tools/call',
      params: {
        name: 'search_organizational_memory',
        arguments: { query: 'Architectural Blueprint' }
      }
    });

    const parsedSearchText = JSON.parse(searchRes.body.result?.content?.[0]?.text || '{}');
    assert(
      searchRes.statusCode === 200 && parsedSearchText.data?.length > 0,
      'search_organizational_memory returns matching memories for authorized tenant',
      `Found: ${parsedSearchText.data?.length} memories, Title: "${parsedSearchText.data?.[0]?.title}"`
    );

    // 3.2 Cross-Tenant Isolation: Tenant 2 searches for Tenant 1's secret memory
    const crossSearchRes = await requestJson(MCP_ENDPOINT, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token2}` }
    }, {
      jsonrpc: '2.0',
      id: 8,
      method: 'tools/call',
      params: {
        name: 'search_organizational_memory',
        arguments: { query: 'Architectural Blueprint' }
      }
    });

    const parsedCrossSearchText = JSON.parse(crossSearchRes.body.result?.content?.[0]?.text || '{}');
    assert(
      crossSearchRes.statusCode === 200 && (parsedCrossSearchText.data?.length === 0 || !parsedCrossSearchText.data),
      'Cross-tenant isolation: Tenant 2 receives 0 memories when searching for Tenant 1 data',
      `Count: ${parsedCrossSearchText.data?.length || 0}`
    );

    // 3.3 Direct Memory Lookup by ID
    const memoryId = parsedSearchText.data?.[0]?.id;
    const memLookupRes = await requestJson(MCP_ENDPOINT, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token1}` }
    }, {
      jsonrpc: '2.0',
      id: 9,
      method: 'tools/call',
      params: {
        name: 'get_memory_by_id',
        arguments: { memory_id: memoryId }
      }
    });

    const parsedMem = JSON.parse(memLookupRes.body.result?.content?.[0]?.text || '{}');
    assert(
      memLookupRes.statusCode === 200 && parsedMem.data?.id === memoryId,
      'get_memory_by_id retrieves memory record for authorized tenant',
      `Retrieved Memory ID: ${parsedMem.data?.id}, Confidence: ${parsedMem.data?.confidence_score}`
    );

    // 3.4 Cross-Tenant Memory Direct Access
    const crossMemRes = await requestJson(MCP_ENDPOINT, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token2}` }
    }, {
      jsonrpc: '2.0',
      id: 10,
      method: 'tools/call',
      params: {
        name: 'get_memory_by_id',
        arguments: { memory_id: memoryId }
      }
    });

    assert(
      crossMemRes.statusCode === 404,
      'Cross-tenant isolation: Tenant 2 cannot access Tenant 1 memory by UUID (404)',
      `Status: ${crossMemRes.statusCode}, Error: ${crossMemRes.body.error?.message}`
    );

    // Group 4: Mutation Tools (create_capture & create_organizational_memory)
    console.log('\n--- Test Group 4: Remote Mutation Tools & Idempotency ---');

    // 4.1 create_capture
    const idempotencyKeyCap = `mcp_cap_${Date.now()}`;
    const createCapRes = await requestJson(MCP_ENDPOINT, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token1}` }
    }, {
      jsonrpc: '2.0',
      id: 11,
      method: 'tools/call',
      params: {
        name: 'create_capture',
        arguments: {
          title: 'Remote MCP Capture Test',
          content: 'This capture was ingested via Streamable HTTP remote MCP transport.',
          source_type: 'remote_mcp',
          idempotency_key: idempotencyKeyCap
        }
      }
    });

    const parsedCap = JSON.parse(createCapRes.body.result?.content?.[0]?.text || '{}');
    assert(
      createCapRes.statusCode === 200 && parsedCap.data?.status === 'QUEUED' && parsedCap.data?.queue_job?.status === 'queued',
      'create_capture tool creates capture in QUEUED state with scheduled queue job',
      `Capture ID: ${parsedCap.data?.id}, Status: ${parsedCap.data?.status}, Queue Status: ${parsedCap.data?.queue_job?.status}`
    );

    // 4.2 create_capture idempotent replay
    const replayCapRes = await requestJson(MCP_ENDPOINT, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token1}` }
    }, {
      jsonrpc: '2.0',
      id: 12,
      method: 'tools/call',
      params: {
        name: 'create_capture',
        arguments: {
          title: 'Remote MCP Capture Test',
          content: 'This capture was ingested via Streamable HTTP remote MCP transport.',
          source_type: 'remote_mcp',
          idempotency_key: idempotencyKeyCap
        }
      }
    });

    const parsedReplayCap = JSON.parse(replayCapRes.body.result?.content?.[0]?.text || '{}');
    assert(
      replayCapRes.statusCode === 200 && parsedReplayCap.data?.id === parsedCap.data?.id,
      'create_capture with duplicate idempotency key replays exact original resource',
      `Original ID: ${parsedCap.data?.id}, Replayed ID: ${parsedReplayCap.data?.id}`
    );

    // 4.3 create_organizational_memory
    const idempotencyKeyMem = `mcp_mem_${Date.now()}`;
    const createMemRes = await requestJson(MCP_ENDPOINT, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token1}` }
    }, {
      jsonrpc: '2.0',
      id: 13,
      method: 'tools/call',
      params: {
        name: 'create_organizational_memory',
        arguments: {
          title: 'Remote MCP Architecture Memory',
          content: 'Streamable HTTP remote MCP transport has been successfully verified on Weftro Connect Gateway.',
          memory_type: 'FACT',
          memory_tier: 'organizational',
          importance: 0.9,
          confidence_score: 1.0,
          idempotency_key: idempotencyKeyMem
        }
      }
    });

    const parsedCreatedMem = JSON.parse(createMemRes.body.result?.content?.[0]?.text || '{}');
    assert(
      createMemRes.statusCode === 200 && parsedCreatedMem.data?.status === 'ACTIVE' && parsedCreatedMem.data?.importance === 0.9,
      'create_organizational_memory tool synthesizes active durable memory record',
      `Memory ID: ${parsedCreatedMem.data?.id}, Status: ${parsedCreatedMem.data?.status}, Importance: ${parsedCreatedMem.data?.importance}`
    );

    // 4.4 Cross-Tenant Isolation of Created Mutation
    const crossMemReadRes = await requestJson(MCP_ENDPOINT, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token2}` }
    }, {
      jsonrpc: '2.0',
      id: 14,
      method: 'tools/call',
      params: {
        name: 'get_memory_by_id',
        arguments: { memory_id: parsedCreatedMem.data?.id }
      }
    });

    assert(
      crossMemReadRes.statusCode === 404,
      'Cross-tenant isolation: Tenant 2 cannot access newly created mutation belonging to Tenant 1',
      `Status: ${crossMemReadRes.statusCode}`
    );

    console.log('\n================================================================');
    console.log(` REMOTE MCP ACCEPTANCE RESULTS: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
    console.log('================================================================');

    if (failedTests > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during remote MCP acceptance test suite:', err);
    process.exit(1);
  }
}

runRemoteMcpSuite();
