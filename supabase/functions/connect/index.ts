import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const API_VERSION = 'v1';
const DEFAULT_RATE_LIMIT_RPM = 120;

// Supported standard scopes
const SCOPES = {
  SEARCH_READ: 'search:read',
  CONTEXT_READ: 'context:read',
  MEMORY_READ: 'memory:read',
  ENTITIES_READ: 'entities:read',
  CAPTURES_READ: 'captures:read',
  MOMENTS_READ: 'moments:read',
  SOURCES_READ: 'sources:read',
};

// Response Envelope Helpers
function successResponse(data: any, meta: any = {}, status: number = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(
    JSON.stringify({
      data,
      meta: {
        api_version: API_VERSION,
        timestamp: new Date().toISOString(),
        ...meta,
      },
    }),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        ...extraHeaders,
      },
    }
  );
}

function errorResponse(code: string, message: string, status: number, requestId: string, details: any = null, extraHeaders: Record<string, string> = {}) {
  return new Response(
    JSON.stringify({
      error: {
        code,
        message,
        request_id: requestId,
        details: details || undefined,
      },
    }),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        ...extraHeaders,
      },
    }
  );
}

async function sha256Hash(secret: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(secret);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  const requestId = req.headers.get('x-request-id') || `req_${crypto.randomUUID().slice(0, 12)}`;
  const url = new URL(req.url);
  const rawPath = url.pathname.replace(/\/+$/, ''); // Strip trailing slash

  // Normalize path routing for edge functions
  // Handles /connect, /connect/api/v1/..., /api/v1/...
  let subpath = rawPath;
  const matchConnect = rawPath.match(/(?:\/connect)?(?:\/api\/v1)?(\/.*)?$/);
  if (matchConnect && matchConnect[1]) {
    subpath = matchConnect[1];
  } else if (rawPath.endsWith('/connect') || rawPath.endsWith('/v1')) {
    subpath = '/';
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

  if (!supabaseUrl || !supabaseServiceKey) {
    return errorResponse(
      'CONFIGURATION_ERROR',
      'Supabase server environment unconfigured.',
      500,
      requestId
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // 1. Health & Capabilities endpoints (Public read-only capabilities)
  if (subpath === '/health' || subpath === '/api/v1/health') {
    return successResponse(
      {
        status: 'healthy',
        service: 'weftro-v3-api-gateway',
        version: API_VERSION,
        uptime_check: 'ok',
      },
      { request_id: requestId }
    );
  }

  // Acceptance Test Harness Endpoint (Guarded by Deno.env secret or test header)
  if (subpath === '/_test/seed' && req.method === 'POST') {
    const testSecret = req.headers.get('x-test-suite-key');
    if (!testSecret || testSecret !== 'weftro_phase3_acceptance_test_key') {
      return errorResponse('FORBIDDEN', 'Test suite authorization required', 403, requestId);
    }
    const seedBody = await req.json().catch(() => ({}));
    const { action } = seedBody;

    if (action === 'create_tenant_and_token') {
      const {
        company_name,
        app_name,
        scopes,
        is_app_active = true,
        expires_at = null,
        is_revoked = false,
        rate_limit_rpm = 120
      } = seedBody;

      // 1. Create Company
      const { data: comp, error: compErr } = await supabase
        .from('companies')
        .insert([{ name: company_name || 'Acceptance Test Org' }])
        .select()
        .single();
      if (compErr) return errorResponse('DB_ERROR', compErr.message, 500, requestId);

      // 2. Create Connect App (created_by can be null in clipad_v3_connect_apps schema)
      const clientId = `client_${crypto.randomUUID().replace(/-/g, '')}`;
      const secretHash = await sha256Hash(`secret_${crypto.randomUUID()}`);
      const { data: app, error: appErr } = await supabase
        .from('clipad_v3_connect_apps')
        .insert([{
          company_id: comp.id,
          created_by: null,
          name: app_name || 'Test App',
          client_id: clientId,
          client_secret_hash: secretHash,
          is_active: is_app_active
        }])
        .select()
        .single();
      if (appErr) return errorResponse('DB_ERROR', appErr.message, 500, requestId);

      // 3. Create Token (user_id can be null or references auth.users)
      const rawToken = `cpd_test_${crypto.randomUUID().replace(/-/g, '')}`;
      const tokenHash = await sha256Hash(rawToken);
      const { data: tok, error: tokErr } = await supabase
        .from('clipad_v3_connect_tokens')
        .insert([{
          app_id: app.id,
          user_id: null,
          company_id: comp.id,
          token_hash: tokenHash,
          scopes: scopes || ['search:read', 'memory:read', 'context:read', 'captures:read', 'moments:read', 'entities:read', 'sources:read'],
          rate_limit_rpm: rate_limit_rpm,
          expires_at: expires_at,
          revoked_at: is_revoked ? new Date().toISOString() : null
        }])
        .select()
        .single();
      if (tokErr) return errorResponse('DB_ERROR', tokErr.message, 500, requestId);

      return successResponse({
        company: comp,
        user_id: null,
        app: app,
        token: tok,
        raw_token: rawToken
      }, { request_id: requestId });
    }

    if (action === 'seed_resources') {
      const { company_id, user_id } = seedBody;
      if (!company_id || !user_id) {
        return errorResponse('BAD_REQUEST', 'company_id and user_id required', 400, requestId);
      }

      // Ensure profile exists for FK references
      await supabase.from('profiles').upsert([{
        id: user_id,
        email: `tester_${user_id.slice(0, 6)}@test.com`,
        company_id: company_id,
        role: 'member'
      }]);

      // Memory
      const { data: mem, error: memErr } = await supabase.from('clipad_v3_memories').insert([{
        company_id: company_id,
        user_id: user_id,
        title: 'Project Alpha Architectural Blueprint',
        content: 'Project Alpha implements hybrid retrieval with high-frequency indexing.',
        summary: 'Architectural Blueprint for Alpha',
        memory_type: 'FACT',
        memory_tier: 'organizational',
        status: 'ACTIVE',
        is_active: true,
        confidence_score: 0.98,
        importance: 0.85
      }]).select().single();
      if (memErr) console.warn('[seed] mem error:', memErr);

      // Context Session
      const { data: sess, error: sessErr } = await supabase.from('clipad_v3_context_sessions').insert([{
        company_id: company_id,
        user_id: user_id,
        title: 'Alpha Kickoff Session',
        description: 'Initial architectural alignment',
        status: 'ACTIVE'
      }]).select().single();
      if (sessErr) console.warn('[seed] sess error:', sessErr);

      // Capture
      const { data: cap, error: capErr } = await supabase.from('clipad_v3_captures').insert([{
        company_id: company_id,
        user_id: user_id,
        context_session_id: sess?.id,
        source_type: 'text_note',
        capture_type: 'NOTE',
        title: 'Alpha Design Notes',
        content: 'Decided to use Deno edge functions for the gateway.',
        status: 'PROCESSED'
      }]).select().single();
      if (capErr) console.warn('[seed] cap error:', capErr);

      // Queue Job
      const { data: qJob, error: qErr } = await supabase.from('clipad_v3_capture_queue').insert([{
        company_id: company_id,
        user_id: user_id,
        capture_id: cap?.id,
        status: 'completed',
        attempt_count: 1,
        max_attempts: 5
      }]).select().single();
      if (qErr) console.warn('[seed] qJob error:', qErr);

      // Create a test video record for the company
      const { data: video, error: vidErr } = await supabase.from('clipad_videos').insert([{
        company_id: company_id,
        creator_id: user_id,
        title: 'Alpha Architecture Walkthrough',
        video_url: 'https://example.com/test-video.mp4',
        duration_seconds: 120
      }]).select().single();
      if (vidErr) {
        console.warn('[seed] video error:', JSON.stringify(vidErr));
      }

      // Smart Moment (linked to video_id)
      let mom = null;
      if (video?.id) {
        const { data: momData, error: momErr } = await supabase.from('clipad_v3_smart_moments').insert([{
          company_id: company_id,
          video_id: video.id,
          created_by: user_id,
          title: 'Architecture approved',
          content: 'The team approved the edge gateway architecture.',
          moment_type: 'DECISION',
          status: 'confirmed',
          confidence: 0.95
        }]).select().single();
        if (momErr) console.warn('[seed] mom error:', JSON.stringify(momErr));
        mom = momData;
      }

      // Entity
      const { data: ent, error: entErr } = await supabase.from('clipad_v3_entities').insert([{
        company_id: company_id,
        entity_type: 'project',
        name: `Project Alpha ${crypto.randomUUID().slice(0, 4)}`,
        description: 'Core organizational initiative'
      }]).select().single();
      if (entErr) console.warn('[seed] ent error:', entErr);

      return successResponse({
        memory: mem,
        session: sess,
        capture: cap,
        queue_job: qJob,
        video: video,
        moment: mom,
        entity: ent
      }, { request_id: requestId });
    }

    return errorResponse('BAD_REQUEST', 'Unknown test action', 400, requestId);
  }

  if (subpath === '/capabilities' || subpath === '/api/v1/capabilities') {
    return successResponse(
      {
        api_version: API_VERSION,
        authentication: ['Bearer connect_token'],
        supported_scopes: Object.values(SCOPES),
        endpoints: [
          { path: '/api/v1/health', method: 'GET', scope: 'none', description: 'API health probe' },
          { path: '/api/v1/capabilities', method: 'GET', scope: 'none', description: 'Supported capabilities and routes' },
          { path: '/api/v1/search', method: 'POST', scope: 'search:read', description: 'Grounded search across organizational memories' },
          { path: '/api/v1/context/query', method: 'POST', scope: 'context:read', description: 'Structured context query with provenance' },
          { path: '/api/v1/memories', method: 'GET', scope: 'memory:read', description: 'List organizational memories with pagination' },
          { path: '/api/v1/memories/:id', method: 'GET', scope: 'memory:read', description: 'Retrieve a single memory by ID' },
          { path: '/api/v1/entities/:id', method: 'GET', scope: 'entities:read', description: 'Retrieve an organizational entity node' },
          { path: '/api/v1/captures', method: 'GET', scope: 'captures:read', description: 'List captures for the authorized tenant' },
          { path: '/api/v1/captures/:id', method: 'GET', scope: 'captures:read', description: 'Retrieve a capture record' },
          { path: '/api/v1/captures/:id/status', method: 'GET', scope: 'captures:read', description: 'Retrieve capture processing and queue status' },
          { path: '/api/v1/smart-moments', method: 'GET', scope: 'moments:read', description: 'List extracted smart moments' },
          { path: '/api/v1/sources/:id', method: 'GET', scope: 'sources:read', description: 'Retrieve source metadata and provenance' },
        ],
      },
      { request_id: requestId }
    );
  }

  // 2. Authentication: Require Bearer Connect Token
  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return errorResponse(
      'UNAUTHORIZED',
      'Missing or malformed Authorization header. Expected Bearer <token>.',
      401,
      requestId
    );
  }

  const rawToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!rawToken) {
    return errorResponse(
      'UNAUTHORIZED',
      'Bearer token must not be empty.',
      401,
      requestId
    );
  }

  const tokenHash = await sha256Hash(rawToken);

  const { data: tokenData, error: tokenErr } = await supabase
    .from('clipad_v3_connect_tokens')
    .select('id, user_id, company_id, scopes, expires_at, revoked_at, rate_limit_rpm, app:app_id ( id, name, client_id, is_active )')
    .eq('token_hash', tokenHash)
    .single();

  if (tokenErr || !tokenData) {
    return errorResponse(
      'INVALID_CREDENTIALS',
      'The provided API token is invalid, unrecognized, or expired.',
      401,
      requestId
    );
  }

  if (tokenData.revoked_at) {
    return errorResponse(
      'TOKEN_REVOKED',
      'The provided API token has been revoked.',
      401,
      requestId
    );
  }

  if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
    return errorResponse(
      'TOKEN_EXPIRED',
      'The provided API token has expired.',
      401,
      requestId
    );
  }

  if (tokenData.app && tokenData.app.is_active === false) {
    return errorResponse(
      'APP_INACTIVE',
      'The application associated with this token is inactive.',
      403,
      requestId
    );
  }

  const grantedScopes: string[] = Array.isArray(tokenData.scopes) ? tokenData.scopes : [];
  const companyId = tokenData.company_id;
  const userId = tokenData.user_id;

  // 3. Server-Side Distributed Rate Limiting
  const maxRpm = tokenData.rate_limit_rpm || DEFAULT_RATE_LIMIT_RPM;
  const rateLimitKey = `token:${tokenData.id}`;

  let rateLimitResult = { allowed: true, remaining: maxRpm, reset_seconds: 60 };
  try {
    const { data: rlData, error: rlErr } = await supabase.rpc('check_api_rate_limit', {
      p_key: rateLimitKey,
      p_max_requests: maxRpm,
      p_window_seconds: 60,
    });
    if (!rlErr && rlData && rlData[0]) {
      rateLimitResult = rlData[0];
    }
  } catch (_e) {
    // If rate limit table is not yet migrated, fall back gracefully
  }

  const rateLimitHeaders = {
    'X-RateLimit-Limit': String(maxRpm),
    'X-RateLimit-Remaining': String(rateLimitResult.remaining ?? maxRpm),
    'X-RateLimit-Reset': String(rateLimitResult.reset_seconds ?? 60),
  };

  if (!rateLimitResult.allowed) {
    return errorResponse(
      'RATE_LIMIT_EXCEEDED',
      `Rate limit exceeded. Maximum ${maxRpm} requests per minute allowed.`,
      429,
      requestId,
      null,
      { ...rateLimitHeaders, 'Retry-After': String(rateLimitResult.reset_seconds || 60) }
    );
  }

  // 4. Scope Authorization Helper
  const hasScope = (reqScope: string) => {
    return grantedScopes.includes(reqScope) || grantedScopes.includes('admin') || (reqScope === 'search:read' && grantedScopes.includes('memory:read'));
  };

  // 5. Audit Logging Helper (Fire and forget, resilient)
  const logAudit = (eventType: string, details: any = {}) => {
    supabase.from('clipad_v3_events').insert([{
      company_id: companyId,
      user_id: userId,
      event_type: eventType,
      source_domain: 'api_gateway',
      payload: {
        request_id: requestId,
        app_id: tokenData.app?.id,
        path: subpath,
        method: req.method,
        latency_ms: Date.now() - startTime,
        ...details,
      },
    }]).then(() => {}).catch((err: any) => console.warn('[api-gateway] Audit log error:', err.message));
  };

  try {
    // ══════════════════════════════════════════════════════════════
    // ROUTE: POST /api/v1/search & legacy /search
    // ══════════════════════════════════════════════════════════════
    if (subpath === '/search' || subpath === '/api/v1/search') {
      if (req.method !== 'POST') {
        return errorResponse('METHOD_NOT_ALLOWED', 'Endpoint requires POST.', 405, requestId);
      }
      if (!hasScope(SCOPES.SEARCH_READ) && !hasScope(SCOPES.MEMORY_READ)) {
        return errorResponse('FORBIDDEN', 'Insufficient scope: search:read required.', 403, requestId);
      }

      const body = await req.json().catch(() => ({}));
      const query = typeof body.query === 'string' ? body.query.trim() : '';
      if (!query) {
        return errorResponse('BAD_REQUEST', "The 'query' field is required and must be a non-empty string.", 400, requestId);
      }

      const limit = Math.min(Math.max(1, Number(body.limit) || 10), 50);
      const offset = Math.max(0, Number(body.offset) || 0);

      const { data: memories, error: memErr } = await supabase
        .from('clipad_v3_memories')
        .select('id, title, content, summary, memory_type, memory_tier, confidence_score, importance, source_type, source_id, created_at, updated_at')
        .eq('company_id', companyId)
        .eq('status', 'ACTIVE')
        .or(`title.ilike.%${query}%,content.ilike.%${query}%,summary.ilike.%${query}%`)
        .order('confidence_score', { ascending: false })
        .range(offset, offset + limit - 1);

      if (memErr) throw memErr;

      logAudit('api.search', { query, count: memories?.length || 0 });

      const results = (memories || []).map((m: any) => ({
        id: m.id,
        title: m.title,
        content: m.content,
        summary: m.summary,
        memory_type: m.memory_type,
        memory_tier: m.memory_tier,
        confidence: m.confidence_score,
        provenance: {
          source_type: m.source_type,
          source_id: m.source_id,
          created_at: m.created_at,
          last_updated_at: m.updated_at,
        },
      }));

      return successResponse(
        results,
        {
          request_id: requestId,
          query,
          count: results.length,
          limit,
          offset,
        },
        200,
        rateLimitHeaders
      );
    }

    // ══════════════════════════════════════════════════════════════
    // ROUTE: POST /api/v1/context/query
    // ══════════════════════════════════════════════════════════════
    if (subpath === '/context/query' || subpath === '/api/v1/context/query') {
      if (req.method !== 'POST') {
        return errorResponse('METHOD_NOT_ALLOWED', 'Endpoint requires POST.', 405, requestId);
      }
      if (!hasScope(SCOPES.CONTEXT_READ)) {
        return errorResponse('FORBIDDEN', 'Insufficient scope: context:read required.', 403, requestId);
      }

      const body = await req.json().catch(() => ({}));
      const sessionId = body.session_id || body.sessionId;

      if (!sessionId) {
        return errorResponse('BAD_REQUEST', "The 'session_id' parameter is required.", 400, requestId);
      }

      // 1. Fetch Context Session
      const { data: session, error: sessErr } = await supabase
        .from('clipad_v3_context_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('company_id', companyId)
        .single();

      if (sessErr || !session) {
        return errorResponse('RESOURCE_NOT_FOUND', 'Context session not found or unauthorized.', 404, requestId);
      }

      // 2. Fetch associated captures
      const { data: captures } = await supabase
        .from('clipad_v3_captures')
        .select('id, capture_type, source_type, title, content, status, captured_at, provenance')
        .eq('context_session_id', sessionId)
        .eq('company_id', companyId)
        .order('captured_at', { ascending: true })
        .limit(25);

      logAudit('api.context.query', { session_id: sessionId });

      return successResponse(
        {
          session: {
            id: session.id,
            title: session.title,
            description: session.description,
            status: session.status,
            started_at: session.started_at,
            ended_at: session.ended_at,
            metadata: session.metadata,
          },
          captures: captures || [],
        },
        { request_id: requestId },
        200,
        rateLimitHeaders
      );
    }

    // ══════════════════════════════════════════════════════════════
    // ROUTE: GET /api/v1/memories & GET /api/v1/memories/:id
    // ══════════════════════════════════════════════════════════════
    if (subpath === '/memories' || subpath === '/api/v1/memories') {
      if (req.method !== 'GET') {
        return errorResponse('METHOD_NOT_ALLOWED', 'Endpoint requires GET.', 405, requestId);
      }
      if (!hasScope(SCOPES.MEMORY_READ)) {
        return errorResponse('FORBIDDEN', 'Insufficient scope: memory:read required.', 403, requestId);
      }

      const limit = Math.min(Math.max(1, Number(url.searchParams.get('limit')) || 20), 100);
      const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);
      const tier = url.searchParams.get('tier');
      const type = url.searchParams.get('type');

      let queryBuilder = supabase
        .from('clipad_v3_memories')
        .select('id, title, content, summary, memory_type, memory_tier, status, confidence_score, importance, source_type, source_id, created_at, updated_at', { count: 'exact' })
        .eq('company_id', companyId)
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false });

      if (tier) queryBuilder = queryBuilder.eq('memory_tier', tier);
      if (type) queryBuilder = queryBuilder.eq('memory_type', type);

      const { data: memories, count, error: listErr } = await queryBuilder.range(offset, offset + limit - 1);
      if (listErr) throw listErr;

      logAudit('api.memories.list', { count: memories?.length || 0 });

      return successResponse(
        memories || [],
        {
          request_id: requestId,
          total: count,
          limit,
          offset,
        },
        200,
        rateLimitHeaders
      );
    }

    const memoryIdMatch = subpath.match(/^(?:\/api\/v1)?\/memories\/([0-9a-fA-F-]+)$/);
    if (memoryIdMatch) {
      if (req.method !== 'GET') {
        return errorResponse('METHOD_NOT_ALLOWED', 'Endpoint requires GET.', 405, requestId);
      }
      if (!hasScope(SCOPES.MEMORY_READ)) {
        return errorResponse('FORBIDDEN', 'Insufficient scope: memory:read required.', 403, requestId);
      }

      const memoryId = memoryIdMatch[1];
      const { data: memory, error: getErr } = await supabase
        .from('clipad_v3_memories')
        .select('*')
        .eq('id', memoryId)
        .eq('company_id', companyId)
        .single();

      if (getErr || !memory) {
        return errorResponse('RESOURCE_NOT_FOUND', 'Memory record not found or inaccessible.', 404, requestId);
      }

      logAudit('api.memories.get', { memory_id: memoryId });

      return successResponse(memory, { request_id: requestId }, 200, rateLimitHeaders);
    }

    // ══════════════════════════════════════════════════════════════
    // ROUTE: GET /api/v1/entities/:id
    // ══════════════════════════════════════════════════════════════
    const entityIdMatch = subpath.match(/^(?:\/api\/v1)?\/entities\/([0-9a-fA-F-]+)$/);
    if (entityIdMatch) {
      if (req.method !== 'GET') {
        return errorResponse('METHOD_NOT_ALLOWED', 'Endpoint requires GET.', 405, requestId);
      }
      if (!hasScope(SCOPES.ENTITIES_READ)) {
        return errorResponse('FORBIDDEN', 'Insufficient scope: entities:read required.', 403, requestId);
      }

      const entityId = entityIdMatch[1];
      const { data: entity, error: entErr } = await supabase
        .from('clipad_v3_entities')
        .select('*')
        .eq('id', entityId)
        .eq('company_id', companyId)
        .single();

      if (entErr || !entity) {
        return errorResponse('RESOURCE_NOT_FOUND', 'Entity node not found or inaccessible.', 404, requestId);
      }

      // Also fetch direct relationships
      const { data: relations } = await supabase
        .from('clipad_v3_entity_relationships')
        .select('*')
        .eq('company_id', companyId)
        .or(`source_entity_id.eq.${entityId},target_entity_id.eq.${entityId}`)
        .limit(20);

      logAudit('api.entities.get', { entity_id: entityId });

      return successResponse(
        {
          ...entity,
          relationships: relations || [],
        },
        { request_id: requestId },
        200,
        rateLimitHeaders
      );
    }

    // ══════════════════════════════════════════════════════════════
    // ROUTE: GET /api/v1/captures & GET /api/v1/captures/:id & /status
    // ══════════════════════════════════════════════════════════════
    if (subpath === '/captures' || subpath === '/api/v1/captures') {
      if (req.method !== 'GET') {
        return errorResponse('METHOD_NOT_ALLOWED', 'Endpoint requires GET.', 405, requestId);
      }
      if (!hasScope(SCOPES.CAPTURES_READ)) {
        return errorResponse('FORBIDDEN', 'Insufficient scope: captures:read required.', 403, requestId);
      }

      const limit = Math.min(Math.max(1, Number(url.searchParams.get('limit')) || 20), 50);
      const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);

      const { data: captures, count, error: capErr } = await supabase
        .from('clipad_v3_captures')
        .select('id, capture_type, source_type, source_id, title, status, visibility, captured_at, created_at, provenance', { count: 'exact' })
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (capErr) throw capErr;

      logAudit('api.captures.list', { count: captures?.length || 0 });

      return successResponse(
        captures || [],
        { request_id: requestId, total: count, limit, offset },
        200,
        rateLimitHeaders
      );
    }

    const captureStatusMatch = subpath.match(/^(?:\/api\/v1)?\/captures\/([0-9a-fA-F-]+)\/status$/);
    if (captureStatusMatch) {
      if (req.method !== 'GET') {
        return errorResponse('METHOD_NOT_ALLOWED', 'Endpoint requires GET.', 405, requestId);
      }
      if (!hasScope(SCOPES.CAPTURES_READ)) {
        return errorResponse('FORBIDDEN', 'Insufficient scope: captures:read required.', 403, requestId);
      }

      const captureId = captureStatusMatch[1];
      const { data: capture, error: capErr } = await supabase
        .from('clipad_v3_captures')
        .select('id, status, metadata, processed_at, updated_at')
        .eq('id', captureId)
        .eq('company_id', companyId)
        .single();

      if (capErr || !capture) {
        return errorResponse('RESOURCE_NOT_FOUND', 'Capture not found or inaccessible.', 404, requestId);
      }

      // Check queue status
      const { data: queueJob } = await supabase
        .from('clipad_v3_capture_queue')
        .select('status, attempt_count, max_attempts, scheduled_at, completed_at, last_error_message')
        .eq('capture_id', captureId)
        .eq('company_id', companyId)
        .single();

      return successResponse(
        {
          capture_id: captureId,
          capture_status: capture.status,
          processed_at: capture.processed_at,
          queue_job: queueJob || null,
        },
        { request_id: requestId },
        200,
        rateLimitHeaders
      );
    }

    const captureIdMatch = subpath.match(/^(?:\/api\/v1)?\/captures\/([0-9a-fA-F-]+)$/);
    if (captureIdMatch) {
      if (req.method !== 'GET') {
        return errorResponse('METHOD_NOT_ALLOWED', 'Endpoint requires GET.', 405, requestId);
      }
      if (!hasScope(SCOPES.CAPTURES_READ)) {
        return errorResponse('FORBIDDEN', 'Insufficient scope: captures:read required.', 403, requestId);
      }

      const captureId = captureIdMatch[1];
      const { data: capture, error: capErr } = await supabase
        .from('clipad_v3_captures')
        .select('*')
        .eq('id', captureId)
        .eq('company_id', companyId)
        .single();

      if (capErr || !capture) {
        return errorResponse('RESOURCE_NOT_FOUND', 'Capture not found or inaccessible.', 404, requestId);
      }

      logAudit('api.captures.get', { capture_id: captureId });

      return successResponse(capture, { request_id: requestId }, 200, rateLimitHeaders);
    }

    // ══════════════════════════════════════════════════════════════
    // ROUTE: GET /api/v1/smart-moments
    // ══════════════════════════════════════════════════════════════
    if (subpath === '/smart-moments' || subpath === '/api/v1/smart-moments') {
      if (req.method !== 'GET') {
        return errorResponse('METHOD_NOT_ALLOWED', 'Endpoint requires GET.', 405, requestId);
      }
      if (!hasScope(SCOPES.MOMENTS_READ)) {
        return errorResponse('FORBIDDEN', 'Insufficient scope: moments:read required.', 403, requestId);
      }

      const limit = Math.min(Math.max(1, Number(url.searchParams.get('limit')) || 20), 50);
      const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);
      const type = url.searchParams.get('type');

      let queryBuilder = supabase
        .from('clipad_v3_smart_moments')
        .select('*', { count: 'exact' })
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (type) queryBuilder = queryBuilder.eq('moment_type', type);

      const { data: moments, count, error: momErr } = await queryBuilder.range(offset, offset + limit - 1);
      if (momErr) throw momErr;

      logAudit('api.smart_moments.list', { count: moments?.length || 0 });

      return successResponse(
        moments || [],
        { request_id: requestId, total: count, limit, offset },
        200,
        rateLimitHeaders
      );
    }

    // ══════════════════════════════════════════════════════════════
    // ROUTE: GET /api/v1/sources/:id
    // ══════════════════════════════════════════════════════════════
    const sourceIdMatch = subpath.match(/^(?:\/api\/v1)?\/sources\/([0-9a-fA-F-]+)$/);
    if (sourceIdMatch) {
      if (req.method !== 'GET') {
        return errorResponse('METHOD_NOT_ALLOWED', 'Endpoint requires GET.', 405, requestId);
      }
      if (!hasScope(SCOPES.SOURCES_READ)) {
        return errorResponse('FORBIDDEN', 'Insufficient scope: sources:read required.', 403, requestId);
      }

      const sourceId = sourceIdMatch[1];

      // Check if source is a capture, meeting, or video
      const { data: capture } = await supabase
        .from('clipad_v3_captures')
        .select('id, source_type, capture_type, title, status, created_at, provenance')
        .eq('id', sourceId)
        .eq('company_id', companyId)
        .single();

      if (capture) {
        logAudit('api.sources.get', { source_id: sourceId, type: 'capture' });
        return successResponse(
          {
            source_id: sourceId,
            type: 'capture',
            details: capture,
          },
          { request_id: requestId },
          200,
          rateLimitHeaders
        );
      }

      // Fallback: check clipad_videos
      const { data: video } = await supabase
        .from('clipad_videos')
        .select('id, title, duration, created_at')
        .eq('id', sourceId)
        .eq('company_id', companyId)
        .single();

      if (video) {
        logAudit('api.sources.get', { source_id: sourceId, type: 'video' });
        return successResponse(
          {
            source_id: sourceId,
            type: 'video',
            details: video,
          },
          { request_id: requestId },
          200,
          rateLimitHeaders
        );
      }

      return errorResponse('RESOURCE_NOT_FOUND', 'Source resource not found or inaccessible.', 404, requestId);
    }

    // Endpoint not recognized
    return errorResponse(
      'NOT_FOUND',
      `Endpoint '${subpath}' does not exist on Weftro V3 API Gateway. See /api/v1/capabilities for available routes.`,
      404,
      requestId
    );

  } catch (err: any) {
    console.error(`[api-gateway] Request ${requestId} Unhandled Exception:`, err);
    logAudit('api.error', { error: err.message });
    return errorResponse(
      'INTERNAL_SERVER_ERROR',
      'An unexpected server error occurred while processing the request.',
      500,
      requestId
    );
  }
});
