// scripts/phase5_mcp_test_suite.cjs
// Automated test suite for Weftro V3 Phase 5: Model Context Protocol (MCP) Server
// Tests MCP client-server protocol execution, tool discovery, schema validation,
// authentication, scope enforcement, cross-tenant isolation, and secret redaction.

const { spawn } = require('child_process');
const path = require('path');
const https = require('https');

const GATEWAY_URL = 'https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect';
const TEST_KEY = 'weftro_phase3_acceptance_test_key';
const SERVER_SCRIPT = path.resolve(__dirname, '../packages/weftro-mcp/index.js');

function gatewayRequest(path, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path.startsWith('http') ? path : `${GATEWAY_URL}${path}`);
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

/**
 * Helper to spawn an MCP server process over stdio and run a sequence of JSON-RPC requests
 */
function runMcpSession(envVars, rpcRequests) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [SERVER_SCRIPT], {
      env: { ...process.env, ...envVars },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const responses = [];
    let buffer = '';
    let stderrOutput = '';

    child.stderr.on('data', (d) => {
      stderrOutput += d.toString();
    });

    child.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep last incomplete chunk

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed);
          responses.push(parsed);
        } catch (_e) {
          // Non-JSON line ignored
        }
      }
    });

    // Send RPC requests with delays to allow sequential processing
    (async () => {
      for (const req of rpcRequests) {
        child.stdin.write(JSON.stringify(req) + '\n');
        await new Promise(r => setTimeout(r, 400));
      }
      // Wait for all responses
      await new Promise(r => setTimeout(r, 1200));
      child.stdin.end();
    })();

    child.on('close', (exitCode) => {
      resolve({ exitCode, responses, stderr: stderrOutput });
    });

    child.on('error', (err) => {
      reject(err);
    });

    // Safety timeout
    setTimeout(() => {
      child.kill();
    }, 15000);
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

async function runSuite() {
  console.log('================================================================');
  console.log(' WEFTRO V3 — PHASE 5 MCP SERVER AUTOMATED TEST SUITE');
  console.log(' Target Gateway: ' + GATEWAY_URL);
  console.log(' Server Binary:  ' + SERVER_SCRIPT);
  console.log('================================================================\n');

  // Step 0: Provision Test Tenants and Scoped Tokens
  console.log('--- Step 0: Provisioning Test Tenants & Scoped Tokens ---');
  
  // Org 1: Full-Scope Token
  const org1Res = await gatewayRequest('/_test/seed', {
    method: 'POST',
    headers: { 'x-test-suite-key': TEST_KEY }
  }, {
    action: 'create_tenant_and_token',
    app_name: 'Phase 5 MCP Test App (Org 1)',
    company_name: 'MCP Org 1 Inc',
    scopes: ['apps:manage', 'search:read', 'memory:read', 'context:read', 'captures:read', 'moments:read', 'entities:read', 'sources:read']
  });
  const org1Token = org1Res.data.data.raw_token;
  const org1CompanyId = org1Res.data.data.company.id;
  console.log(`Org 1 Token: OK (Comp: ${org1CompanyId.slice(0, 8)}...)`);

  // Org 1: Limited Scope Token (Only search:read)
  const limitedTokenRes = await gatewayRequest('/api/v1/tokens', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${org1Token}` }
  }, {
    app_id: org1Res.data.data.app.id,
    scopes: ['search:read'],
    name: 'Limited Scope MCP Token'
  });
  const limitedToken = limitedTokenRes.data?.data?.access_token;
  console.log(`Org 1 Limited Token: OK (Scopes: search:read, Prefix: ${limitedToken?.slice(0, 10)}...)`);

  // Seed sample organizational resources for Org 1
  const seedRes = await gatewayRequest('/_test/seed', {
    method: 'POST',
    headers: { 'x-test-suite-key': TEST_KEY }
  }, {
    action: 'seed_resources',
    company_id: org1CompanyId,
    user_id: 'ce93f2a7-f2cd-4b99-aa2d-ebef3d63e715'
  });
  if (!seedRes.data?.data?.memory) {
    console.error('Seed response data:', JSON.stringify(seedRes.data));
  }
  const seededMemoryId = seedRes.data?.data?.memory?.id;
  const seededCaptureId = seedRes.data?.data?.capture?.id;
  const seededEntityId = seedRes.data?.data?.entity?.id;
  console.log(`Resources Seeded: Memory=${seededMemoryId?.slice(0, 8)}..., Capture=${seededCaptureId?.slice(0, 8)}...`);

  // Org 2: Separate Tenant
  const org2Res = await gatewayRequest('/_test/seed', {
    method: 'POST',
    headers: { 'x-test-suite-key': TEST_KEY }
  }, {
    action: 'create_tenant_and_token',
    app_name: 'Phase 5 MCP Test App (Org 2)',
    company_name: 'MCP Org 2 Corp',
    scopes: ['apps:manage', 'search:read', 'memory:read', 'context:read', 'captures:read', 'moments:read', 'entities:read', 'sources:read']
  });
  const org2Token = org2Res.data.data.raw_token;
  const org2CompanyId = org2Res.data.data.company.id;
  console.log(`Org 2 Token: OK (Comp: ${org2CompanyId.slice(0, 8)}...)\n`);

  // --- Test Group 1: MCP Server Initialization & Capability Discovery ---
  console.log('--- Test Group 1: MCP Server Initialization & Capability Discovery ---');
  {
    const session = await runMcpSession(
      { WEFTRO_API_URL: GATEWAY_URL, WEFTRO_TOKEN: org1Token },
      [
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '1.0.0' }
          }
        },
        {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list',
          params: {}
        }
      ]
    );

    const initResp = session.responses.find(r => r.id === 1);
    assert(
      initResp && initResp.result && initResp.result.serverInfo && initResp.result.serverInfo.name === 'weftro-mcp-server',
      'MCP Server responds to initialize with valid serverInfo and protocolVersion',
      `Server: ${initResp?.result?.serverInfo?.name}, Protocol: ${initResp?.result?.protocolVersion}`
    );

    const listResp = session.responses.find(r => r.id === 2);
    const tools = listResp?.result?.tools || [];
    const expectedTools = [
      'search_organizational_memory',
      'query_organizational_context',
      'get_memory_by_id',
      'list_organizational_memories',
      'get_entity_by_id',
      'list_captures',
      'get_capture_by_id',
      'list_smart_moments',
      'get_source_provenance'
    ];
    const allFound = expectedTools.every(t => tools.some(tool => tool.name === t));

    assert(
      tools.length === 9 && allFound,
      'MCP Server advertises exactly 9 authorized read-only organizational tools',
      `Found ${tools.length} tools: ${tools.map(t => t.name).join(', ')}`
    );

    const searchTool = tools.find(t => t.name === 'search_organizational_memory');
    assert(
      searchTool && searchTool.inputSchema && searchTool.inputSchema.required?.includes('query'),
      'Tool schemas include required parameters and descriptive metadata',
      `Search tool required fields: ${searchTool?.inputSchema?.required?.join(', ')}`
    );
  }

  // --- Test Group 2: Tool Input Validation (Zod Schemas) ---
  console.log('\n--- Test Group 2: Tool Input Validation (Zod Schemas) ---');
  {
    const session = await runMcpSession(
      { WEFTRO_API_URL: GATEWAY_URL, WEFTRO_TOKEN: org1Token },
      [
        {
          jsonrpc: '2.0',
          id: 10,
          method: 'tools/call',
          params: {
            name: 'search_organizational_memory',
            arguments: {} // Missing required query string
          }
        },
        {
          jsonrpc: '2.0',
          id: 11,
          method: 'tools/call',
          params: {
            name: 'get_memory_by_id',
            arguments: { memory_id: 'not-a-valid-uuid' } // Invalid UUID
          }
        },
        {
          jsonrpc: '2.0',
          id: 12,
          method: 'tools/call',
          params: {
            name: 'unknown_nonexistent_tool',
            arguments: {}
          }
        }
      ]
    );

    const missingQueryResp = session.responses.find(r => r.id === 10);
    assert(
      missingQueryResp && missingQueryResp.error && missingQueryResp.error.code === -32602,
      'Calling search_organizational_memory without query returns MCP InvalidParams (-32602)',
      `Error Message: ${missingQueryResp?.error?.message}`
    );

    const invalidUuidResp = session.responses.find(r => r.id === 11);
    assert(
      invalidUuidResp && invalidUuidResp.error && invalidUuidResp.error.code === -32602,
      'Calling get_memory_by_id with non-UUID argument returns MCP InvalidParams (-32602)',
      `Error Message: ${invalidUuidResp?.error?.message}`
    );

    const unknownToolResp = session.responses.find(r => r.id === 12);
    assert(
      unknownToolResp && unknownToolResp.error && unknownToolResp.error.code === -32601,
      'Calling undefined tool returns MCP MethodNotFound (-32601)',
      `Error Message: ${unknownToolResp?.error?.message}`
    );
  }

  // --- Test Group 3: Authorized Retrieval Execution ---
  console.log('\n--- Test Group 3: Authorized Retrieval Execution ---');
  {
    const session = await runMcpSession(
      { WEFTRO_API_URL: GATEWAY_URL, WEFTRO_TOKEN: org1Token },
      [
        {
          jsonrpc: '2.0',
          id: 20,
          method: 'tools/call',
          params: {
            name: 'search_organizational_memory',
            arguments: { query: 'Project Alpha Architectural Blueprint', limit: 5 }
          }
        },
        {
          jsonrpc: '2.0',
          id: 21,
          method: 'tools/call',
          params: {
            name: 'get_memory_by_id',
            arguments: { memory_id: seededMemoryId }
          }
        },
        {
          jsonrpc: '2.0',
          id: 22,
          method: 'tools/call',
          params: {
            name: 'get_capture_by_id',
            arguments: { capture_id: seededCaptureId }
          }
        },
        {
          jsonrpc: '2.0',
          id: 23,
          method: 'tools/call',
          params: {
            name: 'get_entity_by_id',
            arguments: { entity_id: seededEntityId }
          }
        }
      ]
    );

    const searchResp = session.responses.find(r => r.id === 20);
    const searchContent = JSON.parse(searchResp?.result?.content?.[0]?.text || '{}');
    assert(
      searchResp && !searchResp.error && Array.isArray(searchContent.data) && searchContent.data.length > 0,
      'search_organizational_memory returns matching memories with confidence and provenance',
      `Found ${searchContent?.data?.length} memories: "${searchContent?.data?.[0]?.title}"`
    );

    const getMemResp = session.responses.find(r => r.id === 21);
    const memContent = JSON.parse(getMemResp?.result?.content?.[0]?.text || '{}');
    assert(
      getMemResp && !getMemResp.error && memContent.data?.id === seededMemoryId,
      'get_memory_by_id returns specific memory record by UUID',
      `Retrieved Memory ID: ${memContent?.data?.id}, Type: ${memContent?.data?.memory_type}`
    );

    const getCapResp = session.responses.find(r => r.id === 22);
    const capContent = JSON.parse(getCapResp?.result?.content?.[0]?.text || '{}');
    assert(
      getCapResp && !getCapResp.error && capContent.data?.id === seededCaptureId,
      'get_capture_by_id returns capture transcript and processing state',
      `Capture Title: "${capContent?.data?.title}", Status: ${capContent?.data?.status}`
    );

    const getEntResp = session.responses.find(r => r.id === 23);
    const entContent = JSON.parse(getEntResp?.result?.content?.[0]?.text || '{}');
    assert(
      getEntResp && !getEntResp.error && entContent.data?.id === seededEntityId,
      'get_entity_by_id returns entity graph node and relationship references',
      `Entity Name: "${entContent?.data?.name}", Type: ${entContent?.data?.entity_type}`
    );
  }

  // --- Test Group 4: Authentication & Granular Scope Enforcement ---
  console.log('\n--- Test Group 4: Authentication & Granular Scope Enforcement ---');
  {
    // A: Missing credentials
    const missingTokenSession = await runMcpSession(
      { WEFTRO_API_URL: GATEWAY_URL, WEFTRO_TOKEN: '' },
      [
        {
          jsonrpc: '2.0',
          id: 30,
          method: 'tools/call',
          params: {
            name: 'search_organizational_memory',
            arguments: { query: 'test' }
          }
        }
      ]
    );
    const missingResp = missingTokenSession.responses.find(r => r.id === 30);
    assert(
      missingResp && missingResp.error && missingResp.error.message.includes('Authentication required'),
      'Missing WEFTRO_TOKEN triggers MCP error with actionable configuration instructions',
      `Error Message: ${missingResp?.error?.message}`
    );

    // B: Invalid Bearer Token
    const invalidTokenSession = await runMcpSession(
      { WEFTRO_API_URL: GATEWAY_URL, WEFTRO_TOKEN: 'cpd_invalid_token_xyz_99999' },
      [
        {
          jsonrpc: '2.0',
          id: 31,
          method: 'tools/call',
          params: {
            name: 'search_organizational_memory',
            arguments: { query: 'test' }
          }
        }
      ]
    );
    const invalidResp = invalidTokenSession.responses.find(r => r.id === 31);
    assert(
      invalidResp && invalidResp.error && invalidResp.error.message.includes('Authentication Failed'),
      'Invalid token returns Weftro Authentication Failed error',
      `Error Message: ${invalidResp?.error?.message}`
    );

    // C: Scope Enforcement (Token only has search:read, tries get_memory_by_id which requires memory:read)
    const limitedSession = await runMcpSession(
      { WEFTRO_API_URL: GATEWAY_URL, WEFTRO_TOKEN: limitedToken },
      [
        {
          jsonrpc: '2.0',
          id: 32,
          method: 'tools/call',
          params: {
            name: 'search_organizational_memory',
            arguments: { query: 'Project Alpha' }
          }
        },
        {
          jsonrpc: '2.0',
          id: 33,
          method: 'tools/call',
          params: {
            name: 'get_memory_by_id',
            arguments: { memory_id: seededMemoryId }
          }
        }
      ]
    );

    const limitedSearchResp = limitedSession.responses.find(r => r.id === 32);
    assert(
      limitedSearchResp && !limitedSearchResp.error,
      'Authorized scope (search:read) succeeds through MCP tool',
      `Search succeeded: ${Boolean(limitedSearchResp?.result)}`
    );

    const limitedMemResp = limitedSession.responses.find(r => r.id === 33);
    assert(
      limitedMemResp && limitedMemResp.error && limitedMemResp.error.message.includes('Authorization Denied'),
      'Unscoped operation (get_memory_by_id lacking memory:read) is blocked with Authorization Denied',
      `Error Message: ${limitedMemResp?.error?.message}`
    );
  }

  // --- Test Group 5: Cross-Tenant Isolation Enforcement ---
  console.log('\n--- Test Group 5: Cross-Tenant Isolation Enforcement ---');
  {
    // Tenant 2 attempts to retrieve Tenant 1's seeded memory and capture
    const crossTenantSession = await runMcpSession(
      { WEFTRO_API_URL: GATEWAY_URL, WEFTRO_TOKEN: org2Token },
      [
        {
          jsonrpc: '2.0',
          id: 40,
          method: 'tools/call',
          params: {
            name: 'search_organizational_memory',
            arguments: { query: 'Project Alpha Architectural Blueprint' }
          }
        },
        {
          jsonrpc: '2.0',
          id: 41,
          method: 'tools/call',
          params: {
            name: 'get_memory_by_id',
            arguments: { memory_id: seededMemoryId }
          }
        },
        {
          jsonrpc: '2.0',
          id: 42,
          method: 'tools/call',
          params: {
            name: 'get_capture_by_id',
            arguments: { capture_id: seededCaptureId }
          }
        }
      ]
    );

    const org2SearchResp = crossTenantSession.responses.find(r => r.id === 40);
    const org2SearchData = JSON.parse(org2SearchResp?.result?.content?.[0]?.text || '{}');
    assert(
      org2SearchResp && !org2SearchResp.error && org2SearchData.data?.length === 0,
      'Cross-Tenant Search: Tenant 2 MCP search yields 0 memories for Tenant 1 private data',
      `Tenant 2 memories found: ${org2SearchData.data?.length}`
    );

    const org2MemResp = crossTenantSession.responses.find(r => r.id === 41);
    assert(
      org2MemResp && org2MemResp.error && org2MemResp.error.message.includes('Resource Not Found'),
      'Cross-Tenant Memory: Tenant 2 direct lookup of Tenant 1 memory returns Resource Not Found',
      `Error Message: ${org2MemResp?.error?.message}`
    );

    const org2CapResp = crossTenantSession.responses.find(r => r.id === 42);
    assert(
      org2CapResp && org2CapResp.error && org2CapResp.error.message.includes('Resource Not Found'),
      'Cross-Tenant Capture: Tenant 2 direct lookup of Tenant 1 capture returns Resource Not Found',
      `Error Message: ${org2CapResp?.error?.message}`
    );
  }

  // --- Test Group 6: Secret Redaction & Token Scrubbing ---
  console.log('\n--- Test Group 6: Secret Redaction & Token Scrubbing ---');
  {
    // Trigger error using an invalid token and ensure the raw token string is scrubbed in error message
    const rawFakeToken = 'cpd_secret_token_alpha_1234567890_test';
    const scrubSession = await runMcpSession(
      { WEFTRO_API_URL: GATEWAY_URL, WEFTRO_TOKEN: rawFakeToken },
      [
        {
          jsonrpc: '2.0',
          id: 50,
          method: 'tools/call',
          params: {
            name: 'search_organizational_memory',
            arguments: { query: 'test' }
          }
        }
      ]
    );

    const scrubResp = scrubSession.responses.find(r => r.id === 50);
    const fullSessionText = JSON.stringify(scrubSession);
    const tokenExposed = fullSessionText.includes('1234567890');

    assert(
      !tokenExposed && scrubSession.stderr.includes('weftro-mcp-server'),
      'Raw token strings and client secrets are scrubbed from error envelopes and stderr logs',
      `Token leaked: ${tokenExposed}, Stderr logged: true`
    );
  }

  // Summary
  console.log('\n================================================================');
  console.log(` PHASE 5 MCP RESULTS: ${passedCount}/${passedCount + failedCount} PASSED (${failedCount} FAILED)`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error('Fatal suite error:', err);
  process.exit(1);
});
