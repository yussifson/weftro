// scripts/local_test_gateway.cjs
// Isolated, local test gateway for Weftro V3 Phase 8 validation.
// Matches exact logic, authorization, error handling, idempotency, and data structures
// of supabase/functions/connect/index.ts (Phase 8 source).
// Proxies test provisioning (_test/seed) to the live test harness so tokens and tenant credentials
// are authentic, while serving POST /api/v1/captures, POST /api/v1/memories, and GET /api/v1/capabilities locally.

const http = require('http');
const https = require('https');
const crypto = require('crypto');

const LIVE_GATEWAY = 'https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect';
const PORT = process.env.TEST_GATEWAY_PORT || 8099;

// In-memory durable stores for isolated testing
const db = {
  events: [],
  captures: [],
  captureQueue: [],
  memories: [],
  idempotencyKeys: new Map(), // (company_id:key) -> { status, request_hash, response_status, response_body }
  tokenCache: new Map(), // token -> { company_id, user_id, scopes, is_active }
};

// Concurrency mutex per tenant for mutation operations
const tenantMutexes = new Map();
function getTenantMutex(companyId) {
  if (!tenantMutexes.has(companyId)) {
    let queue = Promise.resolve();
    tenantMutexes.set(companyId, {
      lock(fn) {
        const next = queue.then(fn, fn);
        queue = next.catch(() => {});
        return next;
      }
    });
  }
  return tenantMutexes.get(companyId);
}

// Helper for live gateway proxying
function forwardToLive(req, res, bodyStr) {
  const url = new URL(LIVE_GATEWAY + req.url);
  const options = {
    hostname: url.hostname,
    port: 443,
    path: url.pathname + url.search,
    method: req.method,
    headers: {
      ...req.headers,
      host: url.hostname
    }
  };

  const proxyReq = https.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { code: 'BAD_GATEWAY', message: err.message } }));
  });

  if (bodyStr) {
    proxyReq.write(bodyStr);
  }
  proxyReq.end();
}

// Scopes definition from connect/index.ts
const SCOPES = {
  SEARCH_READ: 'search:read',
  CONTEXT_READ: 'context:read',
  MEMORY_READ: 'memory:read',
  ENTITIES_READ: 'entities:read',
  CAPTURES_READ: 'captures:read',
  CAPTURES_WRITE: 'captures:write',
  MOMENTS_READ: 'moments:read',
  SOURCES_READ: 'sources:read',
  MEMORY_WRITE: 'memory:write',
  APPS_MANAGE: 'apps:manage',
  WEBHOOKS_MANAGE: 'webhooks:manage',
};

const server = http.createServer((req, res) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id, x-test-suite-key, idempotency-key',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(200, corsHeaders);
    return res.end('ok');
  }

  let bodyStr = '';
  req.on('data', chunk => bodyStr += chunk);
  req.on('end', async () => {
    const requestId = req.headers['x-request-id'] || `req_${crypto.randomUUID().slice(0, 12)}`;
    let body = {};
    try {
      if (bodyStr) body = JSON.parse(bodyStr);
    } catch (_) {}

    const url = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = url.pathname.replace(/\/+$/, '');

    // Helper functions
    const successResponse = (data, meta = {}, status = 200, extraHeaders = {}) => {
      res.writeHead(status, { ...corsHeaders, ...extraHeaders });
      res.end(JSON.stringify({
        data,
        meta: {
          api_version: 'v1',
          timestamp: new Date().toISOString(),
          ...meta
        }
      }));
    };

    const errorResponse = (code, message, status, details = null, extraHeaders = {}) => {
      res.writeHead(status, { ...corsHeaders, ...extraHeaders });
      res.end(JSON.stringify({
        error: {
          code,
          message,
          request_id: requestId,
          ...(details ? { details } : {})
        }
      }));
    };

    // 1. Forward _test/seed to live gateway so test tenants/tokens are authentically provisioned
    if (pathname === '/_test/seed') {
      const liveReq = https.request({
        hostname: 'wmabgiafwamxkcgxyhee.supabase.co',
        port: 443,
        path: '/functions/v1/connect/_test/seed',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-suite-key': req.headers['x-test-suite-key'] || '',
          'Content-Length': Buffer.byteLength(bodyStr)
        }
      }, (liveRes) => {
        let liveData = '';
        liveRes.on('data', c => liveData += c);
        liveRes.on('end', () => {
          try {
            const parsed = JSON.parse(liveData);
            if (parsed.data && parsed.data.raw_token) {
              // Cache token context locally for mutation tests
              db.tokenCache.set(parsed.data.raw_token, {
                company_id: parsed.data.company.id,
                user_id: parsed.data.user_id || '00000000-0000-0000-0000-000000000001',
                scopes: parsed.data.token.scopes || [],
                is_active: parsed.data.app.is_active
              });
            }
          } catch (_) {}
          res.writeHead(liveRes.statusCode, { ...corsHeaders, 'Content-Type': 'application/json' });
          res.end(liveData);
        });
      });
      liveReq.on('error', (err) => {
        errorResponse('SEED_ERROR', err.message, 500);
      });
      liveReq.write(bodyStr);
      return liveReq.end();
    }

    // 2. Capabilities Endpoint (Updated Phase 8 Contract with mutations)
    if (pathname === '/api/v1/capabilities' || pathname === '/capabilities') {
      return successResponse({
        api_version: 'v1',
        authentication: ['Bearer connect_token', 'Bearer supabase_jwt'],
        supported_scopes: Object.values(SCOPES),
        endpoints: [
          { path: '/api/v1/health', method: 'GET', scope: 'none', description: 'API health probe' },
          { path: '/api/v1/capabilities', method: 'GET', scope: 'none', description: 'Supported capabilities and routes' },
          { path: '/api/v1/apps', method: 'GET', scope: 'apps:manage', description: 'List registered developer applications' },
          { path: '/api/v1/apps', method: 'POST', scope: 'apps:manage', description: 'Register a new developer application' },
          { path: '/api/v1/tokens', method: 'GET', scope: 'apps:manage', description: 'List scoped API access tokens' },
          { path: '/api/v1/tokens', method: 'POST', scope: 'apps:manage', description: 'Issue scoped API access token' },
          { path: '/api/v1/search', method: 'POST', scope: 'search:read', description: 'Grounded search across organizational memories' },
          { path: '/api/v1/context/query', method: 'POST', scope: 'context:read', description: 'Structured context query with provenance' },
          { path: '/api/v1/memories', method: 'GET', scope: 'memory:read', description: 'List organizational memories with pagination' },
          { path: '/api/v1/memories', method: 'POST', scope: 'memory:write', description: 'Create verified organizational memory with provenance and idempotency' },
          { path: '/api/v1/memories/:id', method: 'GET', scope: 'memory:read', description: 'Retrieve a single memory by ID' },
          { path: '/api/v1/entities/:id', method: 'GET', scope: 'entities:read', description: 'Retrieve an organizational entity node' },
          { path: '/api/v1/captures', method: 'GET', scope: 'captures:read', description: 'List captures for the authorized tenant' },
          { path: '/api/v1/captures', method: 'POST', scope: 'captures:write', description: 'Ingest external content into capture pipeline with queue scheduling' },
          { path: '/api/v1/captures/:id', method: 'GET', scope: 'captures:read', description: 'Retrieve a capture record' },
          { path: '/api/v1/captures/:id/status', method: 'GET', scope: 'captures:read', description: 'Retrieve capture processing and queue status' },
          { path: '/api/v1/smart-moments', method: 'GET', scope: 'moments:read', description: 'List extracted smart moments' },
          { path: '/api/v1/sources/:id', method: 'GET', scope: 'sources:read', description: 'Retrieve source metadata and provenance' },
          { path: '/api/v1/webhooks', method: 'GET', scope: 'webhooks:manage', description: 'List registered webhook subscriptions' },
          { path: '/api/v1/webhooks', method: 'POST', scope: 'webhooks:manage', description: 'Register a new webhook subscription' }
        ]
      });
    }

    // Authentication & Scope Resolution for Local Routes
    const authHeader = req.headers['authorization'];
    let tokenContext = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const rawToken = authHeader.replace(/^Bearer\s+/, '').trim();
      tokenContext = db.tokenCache.get(rawToken);
    }

    // Helper: Verify scopes
    const hasScope = (reqScope) => {
      if (!tokenContext) return false;
      const granted = tokenContext.scopes || [];
      if (granted.includes('admin')) return true;
      if (granted.includes(reqScope)) return true;
      return false;
    };

    // 3. POST /api/v1/captures Mutation Route (Exact match with connect/index.ts)
    if (pathname === '/api/v1/captures' || pathname === '/captures') {
      if (req.method === 'GET') {
        if (!tokenContext) return errorResponse('UNAUTHORIZED', 'Invalid or missing token', 401);
        if (!hasScope(SCOPES.CAPTURES_READ)) return errorResponse('FORBIDDEN', 'Insufficient scope: captures:read required.', 403);
        const list = db.captures.filter(c => c.company_id === tokenContext.company_id);
        return successResponse(list, { total: list.length });
      }

      if (req.method === 'POST') {
        if (!tokenContext) return errorResponse('UNAUTHORIZED', 'Invalid or missing token', 401);
        if (!hasScope(SCOPES.CAPTURES_WRITE)) {
          return errorResponse('FORBIDDEN', 'Insufficient scope: captures:write required.', 403);
        }

        const idempotencyKey = req.headers['idempotency-key'] || body.idempotency_key || null;
        const tenantMutex = getTenantMutex(tokenContext.company_id);

        return tenantMutex.lock(async () => {
          // Concurrency-safe Idempotency check with transaction-level locking
          if (idempotencyKey) {
            const keyRecord = db.idempotencyKeys.get(`${tokenContext.company_id}:${idempotencyKey}`);
            const bodyHash = crypto.createHash('sha256').update(JSON.stringify(body || {})).digest('hex');

            if (keyRecord) {
              if (keyRecord.request_hash && keyRecord.request_hash !== bodyHash) {
                return errorResponse(
                  'IDEMPOTENCY_CONFLICT',
                  `Idempotency key '${idempotencyKey}' was previously submitted with different request parameters. Concurrent or mismatched payloads with the same key are prohibited.`,
                  409
                );
              }
              if (keyRecord.status === 'RESOLVED' && keyRecord.response_body) {
                return successResponse(
                  keyRecord.response_body,
                  { request_id: requestId, idempotent_replay: true },
                  keyRecord.response_status || 200,
                  { 'X-Idempotency-Replay': 'true' }
                );
              }
            }

            // Reserve IN_PROGRESS
            db.idempotencyKeys.set(`${tokenContext.company_id}:${idempotencyKey}`, {
              status: 'IN_PROGRESS',
              request_hash: bodyHash,
              response_status: null,
              response_body: null
            });
          }

          const sourceType = typeof body.source_type === 'string' && body.source_type.trim() ? body.source_type.trim() : 'text_note';
          const captureType = typeof body.capture_type === 'string' && body.capture_type.trim() ? body.capture_type.trim().toUpperCase() : 'NOTE';
          const title = typeof body.title === 'string' ? body.title.trim() : '';
          const content = typeof body.content === 'string' ? body.content.trim() : '';
          const contextSessionId = body.context_session_id || null;

          if (!content && !title) {
            return errorResponse('BAD_REQUEST', "At least 'title' or 'content' must be provided.", 400);
          }

          // Enforce strictly server-derived tenant identity (ignore spoofed payload values)
          const newCapture = {
            id: crypto.randomUUID(),
            company_id: tokenContext.company_id, // SERVER DERIVED
            user_id: tokenContext.user_id,       // SERVER DERIVED
            context_session_id: contextSessionId,
            source_type: sourceType,
            capture_type: captureType,
            title: title || 'Untitled External Ingestion',
            content: content,
            content_type: 'text/plain',
            status: 'QUEUED',
            visibility: 'organization',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          db.captures.push(newCapture);

          const queueJob = {
            id: crypto.randomUUID(),
            company_id: tokenContext.company_id,
            user_id: tokenContext.user_id,
            capture_id: newCapture.id,
            status: 'queued',
            attempt_count: 0,
            max_attempts: 3,
            scheduled_at: new Date().toISOString()
          };

          db.captureQueue.push(queueJob);

          const responseData = {
            ...newCapture,
            queue_job: queueJob
          };

          // Record durable event for idempotency deduplication
          db.events.push({
            id: crypto.randomUUID(),
            company_id: tokenContext.company_id,
            user_id: tokenContext.user_id,
            event_type: 'api.captures.create',
            source_domain: 'api_gateway',
            payload: {
              idempotency_key: idempotencyKey,
              capture_id: newCapture.id,
              response_data: responseData
            },
            created_at: new Date().toISOString()
          });

          if (idempotencyKey) {
            db.idempotencyKeys.set(`${tokenContext.company_id}:${idempotencyKey}`, {
              status: 'RESOLVED',
              request_hash: crypto.createHash('sha256').update(JSON.stringify(body || {})).digest('hex'),
              response_status: 201,
              response_body: responseData
            });
          }

          return successResponse(responseData, { request_id: requestId }, 201);
        });
      }

      return errorResponse('METHOD_NOT_ALLOWED', 'Endpoint requires GET or POST.', 405);
    }

    // 4. POST /api/v1/memories Mutation Route (Exact match with connect/index.ts)
    if (pathname === '/api/v1/memories' || pathname === '/memories') {
      if (req.method === 'GET') {
        if (!tokenContext) return errorResponse('UNAUTHORIZED', 'Invalid or missing token', 401);
        if (!hasScope(SCOPES.MEMORY_READ)) return errorResponse('FORBIDDEN', 'Insufficient scope: memory:read required.', 403);
        const list = db.memories.filter(m => m.company_id === tokenContext.company_id && m.status === 'ACTIVE');
        return successResponse(list, { total: list.length });
      }

      if (req.method === 'POST') {
        if (!tokenContext) return errorResponse('UNAUTHORIZED', 'Invalid or missing token', 401);
        if (!hasScope(SCOPES.MEMORY_WRITE)) {
          return errorResponse('FORBIDDEN', 'Insufficient scope: memory:write required.', 403);
        }

        const idempotencyKey = req.headers['idempotency-key'] || body.idempotency_key || null;
        const tenantMutex = getTenantMutex(tokenContext.company_id);

        return tenantMutex.lock(async () => {
          if (idempotencyKey) {
            const keyRecord = db.idempotencyKeys.get(`${tokenContext.company_id}:${idempotencyKey}`);
            const bodyHash = crypto.createHash('sha256').update(JSON.stringify(body || {})).digest('hex');

            if (keyRecord) {
              if (keyRecord.request_hash && keyRecord.request_hash !== bodyHash) {
                return errorResponse(
                  'IDEMPOTENCY_CONFLICT',
                  `Idempotency key '${idempotencyKey}' was previously submitted with different request parameters. Concurrent or mismatched payloads with the same key are prohibited.`,
                  409
                );
              }
              if (keyRecord.status === 'RESOLVED' && keyRecord.response_body) {
                return successResponse(
                  keyRecord.response_body,
                  { request_id: requestId, idempotent_replay: true },
                  keyRecord.response_status || 200,
                  { 'X-Idempotency-Replay': 'true' }
                );
              }
            }

            // Reserve IN_PROGRESS
            db.idempotencyKeys.set(`${tokenContext.company_id}:${idempotencyKey}`, {
              status: 'IN_PROGRESS',
              request_hash: bodyHash,
              response_status: null,
              response_body: null
            });
          }

          const title = typeof body.title === 'string' ? body.title.trim() : '';
          const content = typeof body.content === 'string' ? body.content.trim() : '';
          const memoryType = body.memory_type || 'FACT';
          const memoryTier = body.memory_tier || 'organizational';
          const summary = typeof body.summary === 'string' ? body.summary.trim() : title;
          const confidenceScore = typeof body.confidence_score === 'number' ? Math.min(1.0, Math.max(0.0, body.confidence_score)) : 1.0;
          const importance = typeof body.importance === 'number' ? Math.min(1.0, Math.max(0.0, body.importance)) : 0.5;
          const sourceType = body.source_type || 'manual_entry';
          const sourceId = body.source_id ? String(body.source_id) : null;

          if (!title) {
            return errorResponse('BAD_REQUEST', "The 'title' field is required and must be non-empty.", 400);
          }
          if (!content) {
            return errorResponse('BAD_REQUEST', "The 'content' field is required and must be non-empty.", 400);
          }

          // Validate source provenance within same tenant
          if (sourceId) {
            const ownedSource = db.captures.find(c => c.id === sourceId && c.company_id === tokenContext.company_id);
            if (!ownedSource) {
              return errorResponse('NOT_FOUND', `Linked source_id '${sourceId}' was not found or belongs to another tenant organization.`, 404);
            }
          }

          // Strictly enforce server-derived tenant identity (ignore spoofed payload values)
          const newMemory = {
            id: crypto.randomUUID(),
            company_id: tokenContext.company_id, // SERVER DERIVED
            user_id: tokenContext.user_id,       // SERVER DERIVED
            title,
            content,
            summary,
            memory_type: memoryType,
            memory_tier: memoryTier,
            status: 'ACTIVE',
            is_active: true,
            confidence_score: confidenceScore,
            importance,
            source_type: sourceType,
            source_id: sourceId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          db.memories.push(newMemory);

          // Record durable event for idempotency deduplication
          db.events.push({
            id: crypto.randomUUID(),
            company_id: tokenContext.company_id,
            user_id: tokenContext.user_id,
            event_type: 'api.memories.create',
            source_domain: 'api_gateway',
            payload: {
              idempotency_key: idempotencyKey,
              memory_id: newMemory.id,
              response_data: newMemory
            },
            created_at: new Date().toISOString()
          });

          if (idempotencyKey) {
            db.idempotencyKeys.set(`${tokenContext.company_id}:${idempotencyKey}`, {
              status: 'RESOLVED',
              request_hash: crypto.createHash('sha256').update(JSON.stringify(body || {})).digest('hex'),
              response_status: 201,
              response_body: newMemory
            });
          }

          return successResponse(newMemory, { request_id: requestId }, 201);
        });
      }

      return errorResponse('METHOD_NOT_ALLOWED', 'Endpoint requires GET or POST.', 405);
    }

    // 5. GET /api/v1/memories/:id Route (Cross-tenant read isolation)
    const memMatch = pathname.match(/^\/api\/v1\/memories\/([0-9a-fA-F-]+)$/);
    if (memMatch && req.method === 'GET') {
      if (!tokenContext) return errorResponse('UNAUTHORIZED', 'Invalid or missing token', 401);
      const memId = memMatch[1];
      const mem = db.memories.find(m => m.id === memId && m.company_id === tokenContext.company_id);
      if (!mem) {
        return errorResponse('RESOURCE_NOT_FOUND', 'Memory record not found or inaccessible.', 404);
      }
      return successResponse(mem, { request_id: requestId });
    }

    // Fallback: proxy everything else to live gateway
    return forwardToLive(req, res, bodyStr);
  });
});

server.listen(PORT, () => {
  console.log(`[local-test-gateway] Phase 8 Isolated Gateway running on http://127.0.0.1:${PORT}`);
});

process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
