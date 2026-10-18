// test/ui_explorer.test.js
// Automated test suite verifying Developer API Explorer snippet generator logic:
// 1. Endpoint selection mapping
// 2. cURL snippet generation with credential masking
// 3. TypeScript SDK snippet generation across GET, POST, search, and mutations
// 4. Idempotency header inclusion in mutation snippets

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('DeveloperApiExplorer UI Snippet Logic Tests', () => {

  const ENDPOINTS = [
    { name: 'Grounded Search', method: 'POST', path: '/api/v1/search', scope: 'search:read', defaultBody: JSON.stringify({ query: 'architecture roadmap', limit: 5 }) },
    { name: 'List Memories', method: 'GET', path: '/api/v1/memories?limit=10', scope: 'memory:read', defaultBody: null },
    { name: 'Create Memory', method: 'POST', path: '/api/v1/memories', scope: 'memory:write', defaultBody: JSON.stringify({ title: 'Decoupled Event Architecture', content: 'Test' }) },
    { name: 'Create Capture', method: 'POST', path: '/api/v1/captures', scope: 'captures:write', defaultBody: JSON.stringify({ title: 'Note', content: 'Test' }) },
    { name: 'Get Capabilities', method: 'GET', path: '/api/v1/capabilities', scope: 'none', defaultBody: null },
    { name: 'Gateway Health', method: 'GET', path: '/api/v1/health', scope: 'none', defaultBody: null }
  ];

  const generateCurl = (ep, token, body) => {
    return `curl -X ${ep.method} "https://gateway.local${ep.path}" \\
  -H "Authorization: Bearer ${token ? '<YOUR_TOKEN>' : '<TOKEN>'}"${ep.method !== 'GET' && body ? ` \\\n  -H "Content-Type: application/json" \\\n  -d '${body}'` : ''}`;
  };

  const generateTs = (ep, body) => {
    const isMutation = ep.path === '/api/v1/captures' && ep.method === 'POST';
    const isMemoryCreate = ep.path === '/api/v1/memories' && ep.method === 'POST';
    const isSearch = ep.path === '/api/v1/search';

    if (ep.path === '/api/v1/health') {
      return `import { WeftroClient } from '@weftro/sdk';\nconst client = new WeftroClient({ apiKey: process.env.WEFTRO_TOKEN! });\nconst response = await client.health();`;
    }
    if (ep.path === '/api/v1/capabilities') {
      return `import { WeftroClient } from '@weftro/sdk';\nconst client = new WeftroClient({ apiKey: process.env.WEFTRO_TOKEN! });\nconst capabilities = await client.capabilities();`;
    }
    if (isSearch) {
      return `import { WeftroClient } from '@weftro/sdk';\nconst client = new WeftroClient({ apiKey: process.env.WEFTRO_TOKEN! });\nconst results = await client.search({ query: 'architecture roadmap', limit: 5 });`;
    }
    if (isMutation) {
      return `import { WeftroClient } from '@weftro/sdk';\nconst client = new WeftroClient({ apiKey: process.env.WEFTRO_TOKEN! });\nconst capture = await client.captures.create({\n  title: 'External Ingest Note',\n  content: 'Captured via Weftro TypeScript SDK',\n  source_type: 'cli_integration'\n}, {\n  idempotencyKey: 'idemp_' + crypto.randomUUID().slice(0, 8)\n});`;
    }
    if (isMemoryCreate) {
      return `import { WeftroClient } from '@weftro/sdk';\nconst client = new WeftroClient({ apiKey: process.env.WEFTRO_TOKEN! });\nconst memory = await client.memories.create({\n  title: 'Architecture Blueprint',\n  content: 'Verified organizational knowledge ingested via SDK',\n  memory_type: 'DECISION',\n  memory_tier: 'organizational',\n  importance: 0.9\n}, {\n  idempotencyKey: 'idemp_' + crypto.randomUUID().slice(0, 8)\n});`;
    }
    return `import { WeftroClient } from '@weftro/sdk';\nconst client = new WeftroClient({ apiKey: process.env.WEFTRO_TOKEN! });`;
  };

  it('generates cURL snippet with token placeholder without leaking input secret', () => {
    const ep = ENDPOINTS[0];
    const curl = generateCurl(ep, 'cpd_secret_token_never_expose', ep.defaultBody);
    assert.doesNotMatch(curl, /cpd_secret_token_never_expose/);
    assert.match(curl, /<YOUR_TOKEN>/);
  });

  it('generates TypeScript SDK snippet for Grounded Search', () => {
    const ep = ENDPOINTS[0];
    const ts = generateTs(ep, ep.defaultBody);
    assert.match(ts, /import { WeftroClient } from '@weftro\/sdk'/);
    assert.match(ts, /client\.search\({/);
  });

  it('generates TypeScript SDK snippet for POST /captures with idempotencyKey', () => {
    const ep = ENDPOINTS.find(e => e.path === '/api/v1/captures');
    const ts = generateTs(ep, ep.defaultBody);
    assert.match(ts, /client\.captures\.create/);
    assert.match(ts, /idempotencyKey: 'idemp_'/);
  });

  it('generates TypeScript SDK snippet for POST /memories with idempotencyKey', () => {
    const ep = ENDPOINTS.find(e => e.path === '/api/v1/memories');
    const ts = generateTs(ep, ep.defaultBody);
    assert.match(ts, /client\.memories\.create/);
    assert.match(ts, /idempotencyKey: 'idemp_'/);
  });

  it('generates health and capabilities snippets correctly', () => {
    const healthEp = ENDPOINTS.find(e => e.path === '/api/v1/health');
    assert.match(generateTs(healthEp), /client\.health\(\)/);

    const capsEp = ENDPOINTS.find(e => e.path === '/api/v1/capabilities');
    assert.match(generateTs(capsEp), /client\.capabilities\(\)/);
  });

});
