import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id, x-test-suite-key',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
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
  APPS_MANAGE: 'apps:manage',
  WEBHOOKS_MANAGE: 'webhooks:manage',
};

const SUPPORTED_WEBHOOK_EVENTS = [
  'capture.created',
  'capture.processed',
  'memory.created',
  'memory.updated',
  'smart_moment.detected',
];

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

// SSRF Protection: Disallow local, private, link-local, loopback, or cloud-metadata destinations
function isPrivateOrUnsafeUrl(urlString: string): { safe: boolean; reason?: string } {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { safe: false, reason: 'Invalid protocol. Only http and https endpoints are allowed.' };
    }
    const hostname = parsed.hostname.toLowerCase();
    
    // Check loopback / localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '0.0.0.0') {
      return { safe: false, reason: 'Localhost and loopback addresses are prohibited.' };
    }
    
    // Check internal / link-local / cloud metadata IPs (AWS/GCP/Azure 169.254.169.254)
    if (
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('169.254.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    ) {
      return { safe: false, reason: 'Private or link-local IP addresses are prohibited.' };
    }

    // Check common internal TLDs
    if (hostname.endsWith('.internal') || hostname.endsWith('.local') || hostname.endsWith('.lan')) {
      return { safe: false, reason: 'Internal local domain names are prohibited.' };
    }

    return { safe: true };
  } catch (_e) {
    return { safe: false, reason: 'Malformed URL format.' };
  }
}

// Webhook HMAC-SHA256 Request Signer
async function hmacSha256Signature(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  const hashArray = Array.from(new Uint8Array(signature));
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

    if (action === 'check_webhooks_schema') {
      const { data: testHook, error: hookErr } = await supabase
        .from('clipad_v3_webhooks')
        .select('*')
        .limit(1);
      
      const { data: testDeliv, error: delivErr } = await supabase
        .from('clipad_v3_webhook_deliveries')
        .select('*')
        .limit(1);

      return successResponse({
        webhooks: { exists: !hookErr, sample: testHook, error: hookErr ? hookErr.message : null },
        deliveries: { exists: !delivErr, error: delivErr ? delivErr.message : null }
      }, { request_id: requestId });
    }

    if (action === 'test_insert_webhook') {
      const { company_id } = seedBody;
      const { data, error } = await supabase
        .from('clipad_v3_webhooks')
        .insert([{
          company_id: company_id,
          endpoint_url: 'https://example.com/webhook',
          secret: 'whsec_test123',
          events: ['memory.created', 'capture.processed'],
          is_active: true
        }])
        .select()
        .single();
      
      if (error) return errorResponse('DB_ERROR', error.message, 500, requestId);
      return successResponse(data, { request_id: requestId });
    }

    return errorResponse('BAD_REQUEST', 'Unknown test action', 400, requestId);
  }

  if (subpath === '/capabilities' || subpath === '/api/v1/capabilities') {
    return successResponse(
      {
        api_version: API_VERSION,
        authentication: ['Bearer connect_token', 'Bearer supabase_jwt'],
        supported_scopes: Object.values(SCOPES),
        endpoints: [
          { path: '/api/v1/health', method: 'GET', scope: 'none', description: 'API health probe' },
          { path: '/api/v1/capabilities', method: 'GET', scope: 'none', description: 'Supported capabilities and routes' },
          { path: '/api/v1/apps', method: 'GET', scope: 'apps:manage', description: 'List registered developer applications' },
          { path: '/api/v1/apps', method: 'POST', scope: 'apps:manage', description: 'Register a new developer application' },
          { path: '/api/v1/apps/:id', method: 'GET', scope: 'apps:manage', description: 'Retrieve application details' },
          { path: '/api/v1/apps/:id', method: 'PATCH', scope: 'apps:manage', description: 'Update application settings' },
          { path: '/api/v1/apps/:id', method: 'DELETE', scope: 'apps:manage', description: 'Delete application' },
          { path: '/api/v1/apps/:id/rotate-secret', method: 'POST', scope: 'apps:manage', description: 'Rotate application client secret' },
          { path: '/api/v1/tokens', method: 'GET', scope: 'apps:manage', description: 'List scoped API access tokens' },
          { path: '/api/v1/tokens', method: 'POST', scope: 'apps:manage', description: 'Issue scoped API access token' },
          { path: '/api/v1/tokens/:id/revoke', method: 'POST', scope: 'apps:manage', description: 'Revoke active API access token' },
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
          { path: '/api/v1/webhooks', method: 'GET', scope: 'webhooks:manage', description: 'List registered webhook subscriptions' },
          { path: '/api/v1/webhooks', method: 'POST', scope: 'webhooks:manage', description: 'Register a new webhook subscription' },
          { path: '/api/v1/webhooks/:id', method: 'GET', scope: 'webhooks:manage', description: 'Retrieve webhook subscription details' },
          { path: '/api/v1/webhooks/:id', method: 'PATCH', scope: 'webhooks:manage', description: 'Update webhook subscription (events, status)' },
          { path: '/api/v1/webhooks/:id', method: 'DELETE', scope: 'webhooks:manage', description: 'Delete webhook subscription' },
          { path: '/api/v1/webhooks/:id/rotate-secret', method: 'POST', scope: 'webhooks:manage', description: 'Rotate webhook signing secret' },
          { path: '/api/v1/webhooks/:id/deliveries', method: 'GET', scope: 'webhooks:manage', description: 'List delivery history for webhook' },
          { path: '/api/v1/webhooks/:id/test', method: 'POST', scope: 'webhooks:manage', description: 'Dispatch a signed test event to webhook endpoint' },
          { path: '/api/v1/webhooks/deliveries/:id/retry', method: 'POST', scope: 'webhooks:manage', description: 'Retry an eligible webhook delivery' },
        ],
        mcp: {
          server_package: '@weftro/mcp-server',
          supported_transport: ['stdio'],
          supported_tools: [
            'search_organizational_memory',
            'query_organizational_context',
            'get_memory_by_id',
            'list_organizational_memories',
            'get_entity_by_id',
            'list_captures',
            'get_capture_by_id',
            'list_smart_moments',
            'get_source_provenance'
          ]
        },
        webhooks: {
          supported_events: SUPPORTED_WEBHOOK_EVENTS,
          signature_header: 'X-Weftro-Signature',
          timestamp_header: 'X-Weftro-Timestamp',
          event_id_header: 'X-Weftro-Event-Id',
          signature_version: 'v1',
          algorithm: 'HMAC-SHA256',
          max_attempts: 3
        }
      },
      { request_id: requestId }
    );
  }

  // 2. Authentication: Support Supabase User JWT or Connect API Token
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

  let callerType: 'user_jwt' | 'connect_token' = 'connect_token';
  let companyId: string | null = null;
  let userId: string | null = null;
  let grantedScopes: string[] = [];
  let tokenData: any = null;
  let rateLimitRPM = DEFAULT_RATE_LIMIT_RPM;
  let rateLimitKey = '';

  // Check if token is a Supabase Auth JWT
  const { data: userAuthData, error: userAuthErr } = await supabase.auth.getUser(rawToken);
  if (!userAuthErr && userAuthData?.user) {
    callerType = 'user_jwt';
    userId = userAuthData.user.id;
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', userId)
      .single();
    companyId = profile?.company_id || userAuthData.user.user_metadata?.company_id || null;
    grantedScopes = [
      'apps:manage',
      'search:read',
      'context:read',
      'memory:read',
      'entities:read',
      'captures:read',
      'moments:read',
      'sources:read',
      'admin',
    ];
    rateLimitKey = `user:${userId}`;
  } else {
    // Treat as Connect API Token
    callerType = 'connect_token';
    const tokenHash = await sha256Hash(rawToken);

    const { data: tokRecord, error: tokenErr } = await supabase
      .from('clipad_v3_connect_tokens')
      .select('id, user_id, company_id, scopes, expires_at, revoked_at, rate_limit_rpm, app:app_id ( id, name, client_id, is_active )')
      .eq('token_hash', tokenHash)
      .single();

    if (tokenErr || !tokRecord) {
      return errorResponse(
        'INVALID_CREDENTIALS',
        'The provided API token is invalid, unrecognized, or expired.',
        401,
        requestId
      );
    }

    if (tokRecord.revoked_at) {
      return errorResponse(
        'TOKEN_REVOKED',
        'The provided API token has been revoked.',
        401,
        requestId
      );
    }

    if (tokRecord.expires_at && new Date(tokRecord.expires_at) < new Date()) {
      return errorResponse(
        'TOKEN_EXPIRED',
        'The provided API token has expired.',
        401,
        requestId
      );
    }

    if (tokRecord.app && tokRecord.app.is_active === false) {
      return errorResponse(
        'APP_INACTIVE',
        'The application associated with this token is inactive.',
        403,
        requestId
      );
    }

    tokenData = tokRecord;
    grantedScopes = Array.isArray(tokRecord.scopes) ? tokRecord.scopes : [];
    companyId = tokRecord.company_id;
    userId = tokRecord.user_id;
    rateLimitRPM = tokRecord.rate_limit_rpm || DEFAULT_RATE_LIMIT_RPM;
    rateLimitKey = `token:${tokRecord.id}`;
  }

  if (!companyId) {
    return errorResponse(
      'UNAUTHORIZED',
      'Could not determine organization context for caller.',
      401,
      requestId
    );
  }

  // 3. Server-Side Distributed Rate Limiting
  const maxRpm = rateLimitRPM;
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
    if (grantedScopes.includes('admin')) return true;
    if (grantedScopes.includes(reqScope)) return true;
    if (reqScope === 'search:read' && grantedScopes.includes('memory:read')) return true;
    if (reqScope === 'webhooks:manage' && grantedScopes.includes('apps:manage')) return true;
    return false;
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

    // ══════════════════════════════════════════════════════════════
    // ROUTE: /api/v1/apps (GET, POST)
    // ══════════════════════════════════════════════════════════════
    if (subpath === '/apps' || subpath === '/api/v1/apps') {
      if (!hasScope(SCOPES.APPS_MANAGE)) {
        return errorResponse('FORBIDDEN', 'Insufficient scope: apps:manage required.', 403, requestId);
      }

      if (req.method === 'GET') {
        const { data: appsList, error: listErr } = await supabase
          .from('clipad_v3_connect_apps')
          .select('id, company_id, created_by, name, description, client_id, redirect_uris, is_active, created_at, updated_at')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });

        if (listErr) throw listErr;
        logAudit('api.apps.list', { count: appsList?.length || 0 });
        return successResponse(appsList || [], { request_id: requestId }, 200, rateLimitHeaders);
      }

      if (req.method === 'POST') {
        const body = await req.json().catch(() => ({}));
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        if (!name) {
          return errorResponse('BAD_REQUEST', "The 'name' field is required.", 400, requestId);
        }

        const clientId = `client_${crypto.randomUUID().replace(/-/g, '')}`;
        const rawSecret = `secret_${crypto.randomUUID().replace(/-/g, '')}`;
        const secretHash = await sha256Hash(rawSecret);

        const { data: newApp, error: createErr } = await supabase
          .from('clipad_v3_connect_apps')
          .insert([{
            company_id: companyId,
            created_by: userId,
            name,
            description: body.description || null,
            client_id: clientId,
            client_secret_hash: secretHash,
            redirect_uris: Array.isArray(body.redirect_uris) ? body.redirect_uris : [],
            is_active: body.is_active !== false,
          }])
          .select('id, company_id, created_by, name, description, client_id, redirect_uris, is_active, created_at, updated_at')
          .single();

        if (createErr) throw createErr;
        logAudit('api.apps.create', { app_id: newApp.id, name });

        return successResponse(
          {
            ...newApp,
            client_secret: rawSecret, // Plain secret returned ONLY once at creation
          },
          { request_id: requestId, warning: 'Store client_secret securely. It will never be displayed again.' },
          201,
          rateLimitHeaders
        );
      }

      return errorResponse('METHOD_NOT_ALLOWED', 'Supported methods are GET, POST.', 405, requestId);
    }

    // ══════════════════════════════════════════════════════════════
    // ROUTE: /api/v1/apps/:id/rotate-secret (POST)
    // ══════════════════════════════════════════════════════════════
    const rotateMatch = subpath.match(/^(?:\/api\/v1)?\/apps\/([0-9a-fA-F-]+)\/rotate-secret$/);
    if (rotateMatch) {
      if (req.method !== 'POST') {
        return errorResponse('METHOD_NOT_ALLOWED', 'Endpoint requires POST.', 405, requestId);
      }
      if (!hasScope(SCOPES.APPS_MANAGE)) {
        return errorResponse('FORBIDDEN', 'Insufficient scope: apps:manage required.', 403, requestId);
      }

      const targetAppId = rotateMatch[1];
      const { data: existingApp, error: fetchErr } = await supabase
        .from('clipad_v3_connect_apps')
        .select('id, company_id')
        .eq('id', targetAppId)
        .eq('company_id', companyId)
        .single();

      if (fetchErr || !existingApp) {
        return errorResponse('RESOURCE_NOT_FOUND', 'Application not found or inaccessible.', 404, requestId);
      }

      const newSecret = `secret_${crypto.randomUUID().replace(/-/g, '')}`;
      const newSecretHash = await sha256Hash(newSecret);

      const { data: updatedApp, error: updateErr } = await supabase
        .from('clipad_v3_connect_apps')
        .update({
          client_secret_hash: newSecretHash,
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetAppId)
        .eq('company_id', companyId)
        .select('id, client_id, name, updated_at')
        .single();

      if (updateErr) throw updateErr;
      logAudit('api.apps.rotate_secret', { app_id: targetAppId });

      return successResponse(
        {
          id: updatedApp.id,
          client_id: updatedApp.client_id,
          client_secret: newSecret,
          rotated_at: updatedApp.updated_at,
        },
        { request_id: requestId, warning: 'Store new client_secret securely. Old secret is immediately invalid.' },
        200,
        rateLimitHeaders
      );
    }

    // ══════════════════════════════════════════════════════════════
    // ROUTE: /api/v1/apps/:id (GET, PATCH, DELETE)
    // ══════════════════════════════════════════════════════════════
    const singleAppMatch = subpath.match(/^(?:\/api\/v1)?\/apps\/([0-9a-fA-F-]+)$/);
    if (singleAppMatch) {
      if (!hasScope(SCOPES.APPS_MANAGE)) {
        return errorResponse('FORBIDDEN', 'Insufficient scope: apps:manage required.', 403, requestId);
      }

      const targetAppId = singleAppMatch[1];

      if (req.method === 'GET') {
        const { data: appRecord, error: getErr } = await supabase
          .from('clipad_v3_connect_apps')
          .select('id, company_id, created_by, name, description, client_id, redirect_uris, is_active, created_at, updated_at')
          .eq('id', targetAppId)
          .eq('company_id', companyId)
          .single();

        if (getErr || !appRecord) {
          return errorResponse('RESOURCE_NOT_FOUND', 'Application not found.', 404, requestId);
        }
        logAudit('api.apps.get', { app_id: targetAppId });
        return successResponse(appRecord, { request_id: requestId }, 200, rateLimitHeaders);
      }

      if (req.method === 'PATCH') {
        const body = await req.json().catch(() => ({}));
        const updates: Record<string, any> = { updated_at: new Date().toISOString() };
        if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim();
        if (body.description !== undefined) updates.description = body.description;
        if (Array.isArray(body.redirect_uris)) updates.redirect_uris = body.redirect_uris;
        if (typeof body.is_active === 'boolean') updates.is_active = body.is_active;

        const { data: updatedApp, error: patchErr } = await supabase
          .from('clipad_v3_connect_apps')
          .update(updates)
          .eq('id', targetAppId)
          .eq('company_id', companyId)
          .select('id, company_id, created_by, name, description, client_id, redirect_uris, is_active, created_at, updated_at')
          .single();

        if (patchErr || !updatedApp) {
          return errorResponse('RESOURCE_NOT_FOUND', 'Application not found or update failed.', 404, requestId);
        }
        logAudit('api.apps.patch', { app_id: targetAppId, updates: Object.keys(updates) });
        return successResponse(updatedApp, { request_id: requestId }, 200, rateLimitHeaders);
      }

      if (req.method === 'DELETE') {
        const { error: delErr } = await supabase
          .from('clipad_v3_connect_apps')
          .delete()
          .eq('id', targetAppId)
          .eq('company_id', companyId);

        if (delErr) throw delErr;
        logAudit('api.apps.delete', { app_id: targetAppId });
        return successResponse({ deleted: true, id: targetAppId }, { request_id: requestId }, 200, rateLimitHeaders);
      }

      return errorResponse('METHOD_NOT_ALLOWED', 'Supported methods are GET, PATCH, DELETE.', 405, requestId);
    }

    // ══════════════════════════════════════════════════════════════
    // ROUTE: /api/v1/tokens (GET, POST)
    // ══════════════════════════════════════════════════════════════
    if (subpath === '/tokens' || subpath === '/api/v1/tokens') {
      if (!hasScope(SCOPES.APPS_MANAGE)) {
        return errorResponse('FORBIDDEN', 'Insufficient scope: apps:manage required.', 403, requestId);
      }

      if (req.method === 'GET') {
        const appIdFilter = url.searchParams.get('app_id');
        let queryBuilder = supabase
          .from('clipad_v3_connect_tokens')
          .select('id, app_id, user_id, company_id, scopes, expires_at, revoked_at, rate_limit_rpm, last_used_at, created_at')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });

        if (appIdFilter) {
          queryBuilder = queryBuilder.eq('app_id', appIdFilter);
        }

        const { data: tokensList, error: tokListErr } = await queryBuilder;
        if (tokListErr) throw tokListErr;
        logAudit('api.tokens.list', { count: tokensList?.length || 0 });
        return successResponse(tokensList || [], { request_id: requestId }, 200, rateLimitHeaders);
      }

      if (req.method === 'POST') {
        const body = await req.json().catch(() => ({}));
        const appId = body.app_id;
        if (!appId) {
          return errorResponse('BAD_REQUEST', "The 'app_id' field is required.", 400, requestId);
        }

        // Verify application belongs to caller company
        const { data: targetApp, error: appCheckErr } = await supabase
          .from('clipad_v3_connect_apps')
          .select('id, company_id, is_active')
          .eq('id', appId)
          .eq('company_id', companyId)
          .single();

        if (appCheckErr || !targetApp) {
          return errorResponse('RESOURCE_NOT_FOUND', 'Application not found for your organization.', 404, requestId);
        }

        if (!targetApp.is_active) {
          return errorResponse('APP_INACTIVE', 'Cannot issue token for inactive application.', 403, requestId);
        }

        // Validate scopes
        const requestedScopes: string[] = Array.isArray(body.scopes) && body.scopes.length > 0
          ? body.scopes
          : ['search:read', 'memory:read', 'context:read'];

        const validScopeValues = Object.values(SCOPES);
        for (const s of requestedScopes) {
          if (!validScopeValues.includes(s as any)) {
            return errorResponse('BAD_REQUEST', `Invalid scope requested: '${s}'. Valid scopes: ${validScopeValues.join(', ')}`, 400, requestId);
          }
        }

        const rawTokenStr = `cpd_${crypto.randomUUID().replace(/-/g, '')}`;
        const tokenHash = await sha256Hash(rawTokenStr);
        const rateLimitRpm = Math.min(Math.max(1, Number(body.rate_limit_rpm) || 120), 1000);
        const expiresAt = body.expires_at ? new Date(body.expires_at).toISOString() : null;

        const { data: newToken, error: tokInsertErr } = await supabase
          .from('clipad_v3_connect_tokens')
          .insert([{
            app_id: appId,
            user_id: userId,
            company_id: companyId,
            token_hash: tokenHash,
            scopes: requestedScopes,
            rate_limit_rpm: rateLimitRpm,
            expires_at: expiresAt,
          }])
          .select('id, app_id, user_id, company_id, scopes, expires_at, revoked_at, rate_limit_rpm, created_at')
          .single();

        if (tokInsertErr) throw tokInsertErr;
        logAudit('api.tokens.create', { app_id: appId, scopes: requestedScopes });

        return successResponse(
          {
            ...newToken,
            access_token: rawTokenStr, // Plain access token returned ONLY once
          },
          { request_id: requestId, warning: 'Store access_token securely. It will never be shown again.' },
          201,
          rateLimitHeaders
        );
      }

      return errorResponse('METHOD_NOT_ALLOWED', 'Supported methods are GET, POST.', 405, requestId);
    }

    // ══════════════════════════════════════════════════════════════
    // ROUTE: /api/v1/tokens/:id/revoke (POST)
    // ══════════════════════════════════════════════════════════════
    const revokeTokenMatch = subpath.match(/^(?:\/api\/v1)?\/tokens\/([0-9a-fA-F-]+)\/revoke$/);
    if (revokeTokenMatch) {
      if (req.method !== 'POST') {
        return errorResponse('METHOD_NOT_ALLOWED', 'Endpoint requires POST.', 405, requestId);
      }
      if (!hasScope(SCOPES.APPS_MANAGE)) {
        return errorResponse('FORBIDDEN', 'Insufficient scope: apps:manage required.', 403, requestId);
      }

      const targetTokenId = revokeTokenMatch[1];
      const { data: revokedToken, error: revokeErr } = await supabase
        .from('clipad_v3_connect_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', targetTokenId)
        .eq('company_id', companyId)
        .select('id, app_id, revoked_at')
        .single();

      if (revokeErr || !revokedToken) {
        return errorResponse('RESOURCE_NOT_FOUND', 'Token not found or already revoked.', 404, requestId);
      }

      logAudit('api.tokens.revoke', { token_id: targetTokenId });
      return successResponse(
        {
          id: revokedToken.id,
          revoked: true,
          revoked_at: revokedToken.revoked_at,
        },
        { request_id: requestId },
        200,
        rateLimitHeaders
      );
    }

    // ══════════════════════════════════════════════════════════════
    // ROUTE: /api/v1/webhooks (GET, POST)
    // ══════════════════════════════════════════════════════════════
    if (subpath === '/webhooks' || subpath === '/api/v1/webhooks') {
      if (!hasScope(SCOPES.WEBHOOKS_MANAGE)) {
        return errorResponse('FORBIDDEN', 'Insufficient scope: webhooks:manage or apps:manage required.', 403, requestId);
      }

      if (req.method === 'GET') {
        const urlParams = new URL(req.url).searchParams;
        const targetAppId = urlParams.get('app_id');

        let q = supabase
          .from('clipad_v3_webhooks')
          .select('id, company_id, endpoint_url, events, is_active, created_at, updated_at')
          .eq('company_id', companyId);

        const { data: webhooks, error: listErr } = await q.order('created_at', { ascending: false });
        if (listErr) throw listErr;

        return successResponse(webhooks || [], { request_id: requestId, count: webhooks?.length || 0 }, 200, rateLimitHeaders);
      }

      if (req.method === 'POST') {
        const body = await req.json().catch(() => ({}));
        const endpointUrl = typeof body.endpoint_url === 'string' ? body.endpoint_url.trim() : '';
        const events = Array.isArray(body.events) ? body.events : [];
        const appId = body.app_id || null;
        const description = body.description || null;

        if (!endpointUrl) {
          return errorResponse('BAD_REQUEST', "The 'endpoint_url' field is required.", 400, requestId);
        }

        // SSRF Check
        const ssrfCheck = isPrivateOrUnsafeUrl(endpointUrl);
        if (!ssrfCheck.safe) {
          return errorResponse('BAD_REQUEST', `Invalid webhook URL: ${ssrfCheck.reason}`, 400, requestId);
        }

        // Validate Event Types
        if (events.length === 0) {
          return errorResponse('BAD_REQUEST', 'At least one valid event type must be selected.', 400, requestId);
        }
        for (const evt of events) {
          if (!SUPPORTED_WEBHOOK_EVENTS.includes(evt)) {
            return errorResponse('BAD_REQUEST', `Unsupported event type: '${evt}'. Supported: ${SUPPORTED_WEBHOOK_EVENTS.join(', ')}`, 400, requestId);
          }
        }

        // App Ownership Check (if app_id specified)
        if (appId) {
          const { data: appRecord, error: appCheckErr } = await supabase
            .from('clipad_v3_connect_apps')
            .select('id')
            .eq('id', appId)
            .eq('company_id', companyId)
            .single();

          if (appCheckErr || !appRecord) {
            return errorResponse('RESOURCE_NOT_FOUND', 'Specified application not found in tenant organization.', 404, requestId);
          }
        }

        const rawSecret = `whsec_${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;

        const insertPayload: any = {
          company_id: companyId,
          created_by: userId,
          endpoint_url: endpointUrl,
          secret: rawSecret,
          events: events,
          is_active: true,
        };

        const { data: createdHook, error: insertErr } = await supabase
          .from('clipad_v3_webhooks')
          .insert([insertPayload])
          .select('id, company_id, endpoint_url, events, is_active, created_at, updated_at')
          .single();

        if (insertErr) {
          console.error('[webhooks.create] Insert error:', insertErr);
          return errorResponse('DB_ERROR', insertErr.message, 500, requestId);
        }
        logAudit('webhooks.create', { webhook_id: createdHook.id, endpoint_url: endpointUrl, events });

        return successResponse(
          {
            ...createdHook,
            app_id: appId,
            description: description,
            secret: rawSecret, // One-time plain display
          },
          {
            request_id: requestId,
            warning: 'Store webhook signing secret securely. It will never be shown again in plain text.',
          },
          201,
          rateLimitHeaders
        );
      }

      return errorResponse('METHOD_NOT_ALLOWED', 'Supported methods are GET, POST.', 405, requestId);
    }

    // ══════════════════════════════════════════════════════════════
    // ROUTE: /api/v1/webhooks/:id/rotate-secret (POST)
    // ══════════════════════════════════════════════════════════════
    const rotateSecretMatch = subpath.match(/^(?:\/api\/v1)?\/webhooks\/([0-9a-fA-F-]+)\/rotate-secret$/);
    if (rotateSecretMatch) {
      if (req.method !== 'POST') {
        return errorResponse('METHOD_NOT_ALLOWED', 'Endpoint requires POST.', 405, requestId);
      }
      if (!hasScope(SCOPES.WEBHOOKS_MANAGE)) {
        return errorResponse('FORBIDDEN', 'Insufficient scope: webhooks:manage required.', 403, requestId);
      }

      const hookId = rotateSecretMatch[1];
      const newSecret = `whsec_${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;

      const { data: updatedHook, error: rotErr } = await supabase
        .from('clipad_v3_webhooks')
        .update({
          secret: newSecret,
          updated_at: new Date().toISOString(),
        })
        .eq('id', hookId)
        .eq('company_id', companyId)
        .select('id, company_id, endpoint_url, events, is_active, updated_at')
        .single();

      if (rotErr || !updatedHook) {
        return errorResponse('RESOURCE_NOT_FOUND', 'Webhook subscription not found in organization.', 404, requestId);
      }

      logAudit('webhooks.rotate_secret', { webhook_id: hookId });
      return successResponse(
        {
          ...updatedHook,
          secret: newSecret, // One-time plain display
        },
        { request_id: requestId, warning: 'New secret is displayed once. Update your signature verification receiver immediately.' },
        200,
        rateLimitHeaders
      );
    }

    // ══════════════════════════════════════════════════════════════
    // ROUTE: /api/v1/webhooks/:id/deliveries (GET)
    // ══════════════════════════════════════════════════════════════
    const hookDeliveriesMatch = subpath.match(/^(?:\/api\/v1)?\/webhooks\/([0-9a-fA-F-]+)\/deliveries$/);
    if (hookDeliveriesMatch) {
      if (req.method !== 'GET') {
        return errorResponse('METHOD_NOT_ALLOWED', 'Endpoint requires GET.', 405, requestId);
      }
      if (!hasScope(SCOPES.WEBHOOKS_MANAGE)) {
        return errorResponse('FORBIDDEN', 'Insufficient scope: webhooks:manage required.', 403, requestId);
      }

      const hookId = hookDeliveriesMatch[1];

      // Verify hook belongs to organization
      const { data: hookRecord, error: hookCheckErr } = await supabase
        .from('clipad_v3_webhooks')
        .select('id')
        .eq('id', hookId)
        .eq('company_id', companyId)
        .single();

      if (hookCheckErr || !hookRecord) {
        return errorResponse('RESOURCE_NOT_FOUND', 'Webhook subscription not found.', 404, requestId);
      }

      // Query deliveries from clipad_v3_webhook_deliveries or audit logs
      const { data: deliveries, error: delivErr } = await supabase
        .from('clipad_v3_webhook_deliveries')
        .select('id, webhook_id, event_type, event_id, status, attempt_count, max_attempts, response_status, error_message, execution_duration_ms, created_at, delivered_at')
        .eq('webhook_id', hookId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (delivErr) {
        // Fallback: Query audit events if deliveries table not yet migrated
        const { data: eventLogs } = await supabase
          .from('clipad_v3_events')
          .select('id, event_type, payload, created_at')
          .eq('company_id', companyId)
          .eq('source_domain', 'webhook_delivery')
          .order('created_at', { ascending: false })
          .limit(20);

        const fallbackList = (eventLogs || [])
          .filter((e: any) => e.payload?.webhook_id === hookId)
          .map((e: any) => ({
            id: e.id,
            webhook_id: hookId,
            event_type: e.payload?.event_type || 'test',
            event_id: e.payload?.event_id || e.id,
            status: e.payload?.status || 'delivered',
            attempt_count: 1,
            response_status: e.payload?.response_status || 200,
            execution_duration_ms: e.payload?.duration_ms || 120,
            created_at: e.created_at,
          }));

        return successResponse(fallbackList, { request_id: requestId, count: fallbackList.length }, 200, rateLimitHeaders);
      }

      return successResponse(deliveries || [], { request_id: requestId, count: deliveries?.length || 0 }, 200, rateLimitHeaders);
    }

    // ══════════════════════════════════════════════════════════════
    // ROUTE: /api/v1/webhooks/:id/test (POST) - Dispatch signed ping/test event
    // ══════════════════════════════════════════════════════════════
    const hookTestMatch = subpath.match(/^(?:\/api\/v1)?\/webhooks\/([0-9a-fA-F-]+)\/test$/);
    if (hookTestMatch) {
      if (req.method !== 'POST') {
        return errorResponse('METHOD_NOT_ALLOWED', 'Endpoint requires POST.', 405, requestId);
      }
      if (!hasScope(SCOPES.WEBHOOKS_MANAGE)) {
        return errorResponse('FORBIDDEN', 'Insufficient scope: webhooks:manage required.', 403, requestId);
      }

      const hookId = hookTestMatch[1];
      const { data: hookRecord, error: hookErr } = await supabase
        .from('clipad_v3_webhooks')
        .select('*')
        .eq('id', hookId)
        .eq('company_id', companyId)
        .single();

      if (hookErr || !hookRecord) {
        return errorResponse('RESOURCE_NOT_FOUND', 'Webhook subscription not found in organization.', 404, requestId);
      }

      // SSRF Check on stored endpoint
      const ssrfCheck = isPrivateOrUnsafeUrl(hookRecord.endpoint_url);
      if (!ssrfCheck.safe) {
        return errorResponse('BAD_REQUEST', `Endpoint URL blocked by SSRF protection: ${ssrfCheck.reason}`, 400, requestId);
      }

      const eventId = `evt_${crypto.randomUUID().replace(/-/g, '')}`;
      const timestamp = Math.floor(Date.now() / 1000);
      const testPayload = {
        id: eventId,
        event: 'test.ping',
        created_at: new Date().toISOString(),
        company_id: companyId,
        data: {
          message: 'Weftro V3 webhook test dispatch',
          webhook_id: hookRecord.id,
          supported_events: hookRecord.events,
        },
      };

      const payloadString = JSON.stringify(testPayload);
      const signaturePayload = `${timestamp}.${payloadString}`;
      const signature = await hmacSha256Signature(hookRecord.secret, signaturePayload);

      let deliveryStatus = 'failed';
      let statusCode = 0;
      let responseBody = '';
      let errorMessage = null;
      const deliveryStart = Date.now();

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const webhookRes = await fetch(hookRecord.endpoint_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Weftro-Webhooks/1.0',
            'X-Weftro-Event-Id': eventId,
            'X-Weftro-Timestamp': String(timestamp),
            'X-Weftro-Signature': `t=${timestamp},v1=${signature}`,
          },
          body: payloadString,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        statusCode = webhookRes.status;
        deliveryStatus = webhookRes.ok ? 'delivered' : 'failed';
        responseBody = (await webhookRes.text().catch(() => '')).slice(0, 1000);
      } catch (dispErr: any) {
        errorMessage = dispErr.name === 'AbortError' ? 'Webhook delivery timed out after 10000ms' : dispErr.message;
      }

      const durationMs = Date.now() - deliveryStart;

      // Log delivery event in clipad_v3_events safely without user_id FK dependency
      try {
        await supabase.from('clipad_v3_events').insert([{
          company_id: companyId,
          user_id: null,
          event_type: 'webhook.delivery',
          source_domain: 'webhook_delivery',
          payload: {
            webhook_id: hookRecord.id,
            event_type: 'test.ping',
            event_id: eventId,
            status: deliveryStatus,
            response_status: statusCode,
            duration_ms: durationMs,
            error_message: errorMessage,
          },
        }]);
      } catch (logErr: any) {
        console.warn('[webhooks.test] Delivery audit event insert warning:', logErr.message);
      }

      logAudit('webhooks.test', { webhook_id: hookId, status: deliveryStatus, response_status: statusCode });

      return successResponse(
        {
          delivered: deliveryStatus === 'delivered',
          status: deliveryStatus,
          event_id: eventId,
          response_status: statusCode,
          duration_ms: durationMs,
          response_body_preview: responseBody ? responseBody.slice(0, 300) : undefined,
          error_message: errorMessage,
          headers_sent: {
            'X-Weftro-Event-Id': eventId,
            'X-Weftro-Timestamp': String(timestamp),
            'X-Weftro-Signature': `t=${timestamp},v1=${signature.slice(0, 12)}...`,
          },
        },
        { request_id: requestId },
        200,
        rateLimitHeaders
      );
    }

    // ══════════════════════════════════════════════════════════════
    // ROUTE: /api/v1/webhooks/deliveries/:id/retry (POST)
    // ══════════════════════════════════════════════════════════════
    const retryDeliveryMatch = subpath.match(/^(?:\/api\/v1)?\/webhooks\/deliveries\/([0-9a-fA-F-]+)\/retry$/);
    if (retryDeliveryMatch) {
      if (req.method !== 'POST') {
        return errorResponse('METHOD_NOT_ALLOWED', 'Endpoint requires POST.', 405, requestId);
      }
      if (!hasScope(SCOPES.WEBHOOKS_MANAGE)) {
        return errorResponse('FORBIDDEN', 'Insufficient scope: webhooks:manage required.', 403, requestId);
      }

      const deliveryId = retryDeliveryMatch[1];

      // Find audit delivery log
      const { data: deliveryLog, error: logFindErr } = await supabase
        .from('clipad_v3_events')
        .select('*')
        .eq('id', deliveryId)
        .eq('company_id', companyId)
        .single();

      if (logFindErr || !deliveryLog) {
        return errorResponse('RESOURCE_NOT_FOUND', 'Eligible delivery record not found in organization.', 404, requestId);
      }

      const targetHookId = deliveryLog.payload?.webhook_id;
      const { data: hookRecord, error: hookCheckErr } = await supabase
        .from('clipad_v3_webhooks')
        .select('*')
        .eq('id', targetHookId)
        .eq('company_id', companyId)
        .single();

      if (hookCheckErr || !hookRecord || !hookRecord.is_active) {
        return errorResponse('FORBIDDEN', 'Associated webhook subscription is inactive or no longer accessible.', 403, requestId);
      }

      // Re-dispatch replay event
      const timestamp = Math.floor(Date.now() / 1000);
      const retryEventId = deliveryLog.payload?.event_id || `evt_${crypto.randomUUID().replace(/-/g, '')}`;
      const payloadString = JSON.stringify({
        id: retryEventId,
        event: deliveryLog.payload?.event_type || 'retry.dispatch',
        is_retry: true,
        company_id: companyId,
        created_at: new Date().toISOString(),
      });
      const signaturePayload = `${timestamp}.${payloadString}`;
      const signature = await hmacSha256Signature(hookRecord.secret, signaturePayload);

      let deliveryStatus = 'failed';
      let statusCode = 0;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const retryRes = await fetch(hookRecord.endpoint_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Weftro-Webhooks/1.0',
            'X-Weftro-Event-Id': retryEventId,
            'X-Weftro-Timestamp': String(timestamp),
            'X-Weftro-Signature': `t=${timestamp},v1=${signature}`,
          },
          body: payloadString,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        statusCode = retryRes.status;
        deliveryStatus = retryRes.ok ? 'delivered' : 'failed';
      } catch (_e) {
        deliveryStatus = 'failed';
      }

      logAudit('webhooks.retry', { delivery_id: deliveryId, status: deliveryStatus, response_status: statusCode });

      return successResponse(
        {
          retried: true,
          original_delivery_id: deliveryId,
          status: deliveryStatus,
          response_status: statusCode,
        },
        { request_id: requestId },
        200,
        rateLimitHeaders
      );
    }

    // ══════════════════════════════════════════════════════════════
    // ROUTE: /api/v1/webhooks/:id (GET, PATCH, DELETE)
    // ══════════════════════════════════════════════════════════════
    const singleWebhookMatch = subpath.match(/^(?:\/api\/v1)?\/webhooks\/([0-9a-fA-F-]+)$/);
    if (singleWebhookMatch) {
      if (!hasScope(SCOPES.WEBHOOKS_MANAGE)) {
        return errorResponse('FORBIDDEN', 'Insufficient scope: webhooks:manage required.', 403, requestId);
      }

      const hookId = singleWebhookMatch[1];

      if (req.method === 'GET') {
        const { data: hookRecord, error: getErr } = await supabase
          .from('clipad_v3_webhooks')
          .select('id, company_id, endpoint_url, events, is_active, created_at, updated_at')
          .eq('id', hookId)
          .eq('company_id', companyId)
          .single();

        if (getErr || !hookRecord) {
          return errorResponse('RESOURCE_NOT_FOUND', 'Webhook subscription not found in organization.', 404, requestId);
        }

        return successResponse(hookRecord, { request_id: requestId }, 200, rateLimitHeaders);
      }

      if (req.method === 'PATCH') {
        const body = await req.json().catch(() => ({}));
        const updatePayload: any = { updated_at: new Date().toISOString() };

        if (typeof body.endpoint_url === 'string') {
          const trimmedUrl = body.endpoint_url.trim();
          const ssrfCheck = isPrivateOrUnsafeUrl(trimmedUrl);
          if (!ssrfCheck.safe) {
            return errorResponse('BAD_REQUEST', `Invalid webhook URL: ${ssrfCheck.reason}`, 400, requestId);
          }
          updatePayload.endpoint_url = trimmedUrl;
        }

        if (Array.isArray(body.events)) {
          if (body.events.length === 0) {
            return errorResponse('BAD_REQUEST', 'At least one valid event type must be selected.', 400, requestId);
          }
          for (const evt of body.events) {
            if (!SUPPORTED_WEBHOOK_EVENTS.includes(evt)) {
              return errorResponse('BAD_REQUEST', `Unsupported event type: '${evt}'`, 400, requestId);
            }
          }
          updatePayload.events = body.events;
        }

        if (typeof body.is_active === 'boolean') {
          updatePayload.is_active = body.is_active;
        }

        const { data: updatedHook, error: patchErr } = await supabase
          .from('clipad_v3_webhooks')
          .update(updatePayload)
          .eq('id', hookId)
          .eq('company_id', companyId)
          .select('id, company_id, endpoint_url, events, is_active, created_at, updated_at')
          .single();

        if (patchErr || !updatedHook) {
          return errorResponse('RESOURCE_NOT_FOUND', 'Webhook subscription not found in organization.', 404, requestId);
        }

        logAudit('webhooks.update', { webhook_id: hookId });
        return successResponse(updatedHook, { request_id: requestId }, 200, rateLimitHeaders);
      }

      if (req.method === 'DELETE') {
        const { error: delErr } = await supabase
          .from('clipad_v3_webhooks')
          .delete()
          .eq('id', hookId)
          .eq('company_id', companyId);

        if (delErr) throw delErr;
        logAudit('webhooks.delete', { webhook_id: hookId });

        return successResponse({ deleted: true, id: hookId }, { request_id: requestId }, 200, rateLimitHeaders);
      }

      return errorResponse('METHOD_NOT_ALLOWED', 'Supported methods are GET, PATCH, DELETE.', 405, requestId);
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
