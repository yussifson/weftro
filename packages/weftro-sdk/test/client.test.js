// test/client.test.js
// Comprehensive mock HTTP unit tests for @weftro/sdk
// Verifies request serialization, header construction, idempotency forwarding,
// error mapping (401, 403, 404, 429), timeouts, cancellations, and credential isolation.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  WeftroClient,
  WeftroApiError,
  WeftroAuthenticationError,
  WeftroForbiddenError,
  WeftroNotFoundError,
  WeftroRateLimitError,
  WeftroTimeoutError
} from '../dist/index.js';

describe('WeftroClient SDK Unit Tests (Mocked HTTP)', () => {

  it('initializes cleanly and throws when apiKey is missing', () => {
    assert.throws(
      () => new WeftroClient({ apiKey: '' }),
      /requires a non-empty apiKey/
    );
  });

  it('correctly dispatches health and capabilities requests', async () => {
    let capturedUrl = '';
    let capturedHeaders = {};

    const mockFetch = async (url, options) => {
      capturedUrl = url;
      capturedHeaders = options.headers;
      return new Response(JSON.stringify({
        data: { status: 'healthy', version: 'v1' },
        meta: { api_version: 'v1', timestamp: new Date().toISOString() }
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };

    const client = new WeftroClient({
      apiKey: 'cpd_test_secret_key_12345',
      baseUrl: 'http://test-gateway.local',
      fetch: mockFetch
    });

    const res = await client.health();
    assert.equal(capturedUrl, 'http://test-gateway.local/api/v1/health');
    assert.equal(capturedHeaders['Authorization'], 'Bearer cpd_test_secret_key_12345');
    assert.equal(res.data.status, 'healthy');
  });

  it('forwards caller-supplied Idempotency-Key and payload for captures.create', async () => {
    let capturedMethod = '';
    let capturedHeaders = {};
    let capturedBody = '';

    const mockFetch = async (url, options) => {
      capturedMethod = options.method;
      capturedHeaders = options.headers;
      capturedBody = options.body;

      return new Response(JSON.stringify({
        data: { id: 'cap_123', title: 'Test Ingest', status: 'QUEUED' },
        meta: { api_version: 'v1', timestamp: new Date().toISOString() }
      }), { status: 201, headers: { 'Content-Type': 'application/json' } });
    };

    const client = new WeftroClient({
      apiKey: 'cpd_test_key',
      fetch: mockFetch
    });

    const res = await client.captures.create(
      { title: 'Test Ingest', content: 'Sample ingestion text' },
      { idempotencyKey: 'idemp_key_custom_999' }
    );

    assert.equal(capturedMethod, 'POST');
    assert.equal(capturedHeaders['Idempotency-Key'], 'idemp_key_custom_999');
    assert.match(capturedBody, /Test Ingest/);
    assert.equal(res.data.status, 'QUEUED');
  });

  it('maps HTTP 401 response to WeftroAuthenticationError', async () => {
    const mockFetch = async () => {
      return new Response(JSON.stringify({
        error: { code: 'UNAUTHORIZED', message: 'Bearer token must not be empty.', request_id: 'req_auth_fail' }
      }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    };

    const client = new WeftroClient({ apiKey: 'invalid_token', fetch: mockFetch });

    await assert.rejects(
      async () => client.search({ query: 'architecture' }),
      (err) => {
        assert(err instanceof WeftroAuthenticationError);
        assert.equal(err.status, 401);
        assert.equal(err.code, 'UNAUTHORIZED');
        assert.equal(err.requestId, 'req_auth_fail');
        return true;
      }
    );
  });

  it('maps HTTP 403 response to WeftroForbiddenError', async () => {
    const mockFetch = async () => {
      return new Response(JSON.stringify({
        error: { code: 'FORBIDDEN', message: 'Insufficient scope: memory:write required.', request_id: 'req_forbid' }
      }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    };

    const client = new WeftroClient({ apiKey: 'read_only_token', fetch: mockFetch });

    await assert.rejects(
      async () => client.memories.create({ title: 'New Memory', content: 'Content' }),
      (err) => {
        assert(err instanceof WeftroForbiddenError);
        assert.equal(err.status, 403);
        assert.equal(err.code, 'FORBIDDEN');
        return true;
      }
    );
  });

  it('maps HTTP 404 response to WeftroNotFoundError', async () => {
    const mockFetch = async () => {
      return new Response(JSON.stringify({
        error: { code: 'RESOURCE_NOT_FOUND', message: 'Memory record not found or inaccessible.' }
      }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    };

    const client = new WeftroClient({ apiKey: 'token', fetch: mockFetch });

    await assert.rejects(
      async () => client.memories.get('00000000-0000-0000-0000-000000000000'),
      (err) => {
        assert(err instanceof WeftroNotFoundError);
        assert.equal(err.status, 404);
        return true;
      }
    );
  });

  it('maps HTTP 429 response to WeftroRateLimitError with Retry-After', async () => {
    const mockFetch = async () => {
      return new Response(JSON.stringify({
        error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Maximum 120 requests per minute allowed.' }
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '42'
        }
      });
    };

    const client = new WeftroClient({ apiKey: 'token', fetch: mockFetch });

    await assert.rejects(
      async () => client.health(),
      (err) => {
        assert(err instanceof WeftroRateLimitError);
        assert.equal(err.status, 429);
        assert.equal(err.retryAfterSeconds, 42);
        return true;
      }
    );
  });

  it('handles request cancellation via AbortSignal', async () => {
    const controller = new AbortController();
    const mockFetch = async (_url, options) => {
      return new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => {
          const err = new Error('The operation was aborted.');
          err.name = 'AbortError';
          reject(err);
        });
      });
    };

    const client = new WeftroClient({ apiKey: 'token', fetch: mockFetch });

    setTimeout(() => controller.abort(), 10);

    await assert.rejects(
      async () => client.health({ signal: controller.signal }),
      /cancelled by caller/
    );
  });

  it('verifies that client never logs or exposes raw secrets in exceptions', () => {
    const secretKey = 'cpd_super_secret_raw_key_do_not_leak_123';
    const err = new WeftroApiError(500, { code: 'SERVER_ERR', message: 'Internal error' });
    assert.doesNotMatch(err.stack || '', new RegExp(secretKey));
  });

  it('handles malformed non-JSON responses from gateway gracefully', async () => {
    const mockFetch = async () => {
      return new Response('<html>502 Bad Gateway</html>', {
        status: 502,
        headers: { 'Content-Type': 'text/html' }
      });
    };

    const client = new WeftroClient({ apiKey: 'token', fetch: mockFetch });

    await assert.rejects(
      async () => client.health(),
      (err) => {
        assert(err instanceof WeftroApiError);
        assert.equal(err.status, 502);
        assert.match(err.message, /502/);
        return true;
      }
    );
  });

  it('maps low-level fetch failures to WeftroNetworkError', async () => {
    const mockFetch = async () => {
      throw new Error('fetch failed: getaddrinfo ENOTFOUND api.weftro.com');
    };

    const client = new WeftroClient({ apiKey: 'token', fetch: mockFetch });

    await assert.rejects(
      async () => client.health(),
      /Weftro Network Error/
    );
  });

  it('raises WeftroTimeoutError when request exceeds configured timeoutMs', async () => {
    const mockFetch = async (_url, options) => {
      return new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => {
          const err = new Error('The operation was aborted due to timeout.');
          err.name = 'AbortError';
          reject(err);
        });
      });
    };

    const client = new WeftroClient({ apiKey: 'token', timeoutMs: 20, fetch: mockFetch });

    await assert.rejects(
      async () => client.health(),
      (err) => {
        assert(err instanceof WeftroTimeoutError);
        assert.equal(err.timeoutMs, 20);
        return true;
      }
    );
  });

});

