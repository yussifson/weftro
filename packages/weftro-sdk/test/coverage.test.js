// test/coverage.test.js
// Automated verification of 100% OpenAPI 3.1 endpoint coverage in @weftro/sdk.
// Reads docs/openapi.yaml, extracts every declared path and method, and verifies
// that a corresponding typed method is exposed on WeftroClient.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WeftroClient } from '../dist/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OPENAPI_PATH = path.resolve(__dirname, '../../../docs/openapi.yaml');

describe('@weftro/sdk OpenAPI Coverage Audit', () => {

  it('verifies all OpenAPI paths & methods have dedicated client methods', () => {
    const yamlContent = fs.readFileSync(OPENAPI_PATH, 'utf8');
    const lines = yamlContent.split(/\r?\n/);
    const openApiRoutes = [];
    let currentPath = '';

    for (const line of lines) {
      const mPath = line.match(/^\s{2}(\/api\/v1\/[^:]+):/);
      if (mPath) {
        currentPath = mPath[1];
      }
      const mMethod = line.match(/^\s{4}(get|post|patch|delete):/i);
      if (mMethod && currentPath) {
        openApiRoutes.push({
          path: currentPath,
          method: mMethod[1].toUpperCase()
        });
      }
    }


    assert(openApiRoutes.length > 0, 'Found at least one OpenAPI route in docs/openapi.yaml');

    // Instantiate mock client to inspect method tree
    const client = new WeftroClient({ apiKey: 'mock_key', fetch: async () => new Response() });

    // Explicit mapping table from OpenAPI path + method to SDK function
    const mapping = {
      'GET /api/v1/health': () => typeof client.health === 'function',
      'GET /api/v1/capabilities': () => typeof client.capabilities === 'function',
      'GET /api/v1/apps': () => typeof client.apps?.list === 'function',
      'POST /api/v1/apps': () => typeof client.apps?.create === 'function',
      'GET /api/v1/apps/{id}': () => typeof client.apps?.get === 'function',
      'PATCH /api/v1/apps/{id}': () => typeof client.apps?.update === 'function',
      'DELETE /api/v1/apps/{id}': () => typeof client.apps?.delete === 'function',
      'POST /api/v1/apps/{id}/rotate-secret': () => typeof client.apps?.rotateSecret === 'function',
      'GET /api/v1/tokens': () => typeof client.tokens?.list === 'function',
      'POST /api/v1/tokens': () => typeof client.tokens?.issue === 'function',
      'POST /api/v1/tokens/{id}/revoke': () => typeof client.tokens?.revoke === 'function',
      'GET /api/v1/webhooks': () => typeof client.webhooks?.list === 'function',
      'POST /api/v1/webhooks': () => typeof client.webhooks?.create === 'function',
      'GET /api/v1/webhooks/{id}': () => typeof client.webhooks?.get === 'function',
      'PATCH /api/v1/webhooks/{id}': () => typeof client.webhooks?.update === 'function',
      'DELETE /api/v1/webhooks/{id}': () => typeof client.webhooks?.delete === 'function',
      'POST /api/v1/webhooks/{id}/rotate-secret': () => typeof client.webhooks?.rotateSecret === 'function',
      'POST /api/v1/webhooks/{id}/test': () => typeof client.webhooks?.test === 'function',
      'GET /api/v1/webhooks/{id}/deliveries': () => typeof client.webhooks?.listDeliveries === 'function',
      'POST /api/v1/webhooks/deliveries/{id}/retry': () => typeof client.webhooks?.retryDelivery === 'function',
      'POST /api/v1/search': () => typeof client.search === 'function',
      'POST /api/v1/context/query': () => typeof client.context?.query === 'function',
      'GET /api/v1/memories': () => typeof client.memories?.list === 'function',
      'POST /api/v1/memories': () => typeof client.memories?.create === 'function',
      'GET /api/v1/memories/{id}': () => typeof client.memories?.get === 'function',
      'GET /api/v1/entities/{id}': () => typeof client.entities?.get === 'function',
      'GET /api/v1/captures': () => typeof client.captures?.list === 'function',
      'POST /api/v1/captures': () => typeof client.captures?.create === 'function',
      'GET /api/v1/captures/{id}': () => typeof client.captures?.get === 'function',
      'GET /api/v1/captures/{id}/status': () => typeof client.captures?.getStatus === 'function',
      'GET /api/v1/smart-moments': () => typeof client.smartMoments?.list === 'function',
      'GET /api/v1/sources/{id}': () => typeof client.sources?.get === 'function',
    };

    const missing = [];
    for (const route of openApiRoutes) {
      const key = `${route.method} ${route.path}`;
      const checker = mapping[key];
      if (!checker || !checker()) {
        missing.push(key);
      }
    }

    assert.equal(
      missing.length,
      0,
      `SDK is missing coverage for OpenAPI routes: ${missing.join(', ')}`
    );
  });

});
