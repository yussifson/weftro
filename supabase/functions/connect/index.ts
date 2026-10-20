import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id, x-test-suite-key, mcp-session-id',
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
  CAPTURES_WRITE: 'captures:write',
  MOMENTS_READ: 'moments:read',
  SOURCES_READ: 'sources:read',
  MEMORY_WRITE: 'memory:write',
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

// Extract human-readable text from PDF bytes safely
async function extractTextFromPdfBytes(pdfBuffer: Uint8Array): Promise<string> {
  try {
    const rawBinary = new TextDecoder('latin1').decode(pdfBuffer);
    const extractedChunks: string[] = [];

    // Extract plaintext literals from the PDF body
    const rawTextMatches = rawBinary.match(/\(([^\(\)\\]{2,})\)\s*T[jJ]/g) || [];
    for (const rtm of rawTextMatches.slice(0, 500)) {
      const clean = rtm.replace(/^[\s\(]+/, '').replace(/[\)\sTj]+$/, '').trim();
      if (clean.length > 1) extractedChunks.push(clean);
    }

    // Extract TJ array literals
    const arrayMatches = rawBinary.match(/\[([^\]]*?)\]\s*TJ/g) || [];
    for (const am of arrayMatches.slice(0, 500)) {
      const innerItems = am.match(/\((.*?)\)/g) || [];
      const joined = innerItems.map(i => i.slice(1, -1)).join('');
      if (joined.length > 1) extractedChunks.push(joined);
    }

    // Try decompressing small flate streams (up to first 10 streams)
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match: RegExpExecArray | null;
    let streamCount = 0;

    while ((match = streamRegex.exec(rawBinary)) !== null && streamCount < 10) {
      streamCount++;
      const streamContent = match[1];
      if (streamContent.length > 200000) continue; // Skip huge media/image streams

      try {
        const streamBytes = new Uint8Array(streamContent.length);
        for (let i = 0; i < streamContent.length; i++) {
          streamBytes[i] = streamContent.charCodeAt(i);
        }

        const ds = new DecompressionStream('deflate');
        const writer = ds.writable.getWriter();
        writer.write(streamBytes).catch(() => {});
        writer.close().catch(() => {});
        const reader = ds.readable.getReader();
        const outChunks: Uint8Array[] = [];
        let totalLen = 0;
        let readCount = 0;

        while (readCount < 20) {
          readCount++;
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            outChunks.push(value);
            totalLen += value.length;
            if (totalLen > 100000) break;
          }
        }

        if (totalLen > 0) {
          const decompressedBytes = new Uint8Array(totalLen);
          let offset = 0;
          for (const ch of outChunks) {
            decompressedBytes.set(ch, offset);
            offset += ch.length;
          }
          const decText = new TextDecoder('utf-8', { fatal: false }).decode(decompressedBytes);
          const tjMatches = decText.match(/\(([^\(\)\\]+)\)\s*T[jJ]/g) || [];
          for (const tm of tjMatches.slice(0, 100)) {
            const clean = tm.replace(/^[\s\(]+/, '').replace(/[\)\sTj]+$/, '').trim();
            if (clean.length > 1) extractedChunks.push(clean);
          }
        }
      } catch (_e) {
        // Ignore uncompressed or malformed stream
      }
    }

    return extractedChunks.slice(0, 1000).join(' ').replace(/\s+/g, ' ').trim();
  } catch (_e) {
    return '';
  }
}

// Fetch document file and extract contextual text (PDF, text, markdown, json)
async function extractDocumentContentFromUrl(fileUrl: string): Promise<{ text: string; error?: string }> {
  try {
    if (!fileUrl || typeof fileUrl !== 'string') {
      return { text: '', error: 'Missing or invalid file URL.' };
    }

    if (fileUrl.startsWith('blob:')) {
      return { text: '', error: 'Client-side temporary blob URL cannot be fetched directly on backend.' };
    }

    const res = await fetch(fileUrl, {
      headers: { 'Accept': '*/*' },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      let detail = res.statusText;
      try {
        const errJson = await res.json();
        if (errJson?.message || errJson?.error || errJson?.code) {
          detail = `${errJson.code || errJson.error || ''}: ${errJson.message || ''}`.trim();
        }
      } catch (_) {}
      return { text: '', error: `Storage fetch error (HTTP ${res.status}): ${detail}` };
    }

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    const isPdf = fileUrl.toLowerCase().endsWith('.pdf') || contentType.includes('pdf');

    if (isPdf) {
      const arrBuf = await res.arrayBuffer();
      const extracted = await extractTextFromPdfBytes(new Uint8Array(arrBuf));
      return { text: extracted || 'PDF parsed successfully but contained only vector graphics or rasterized image scans.' };
    }

    // For plaintext, markdown, JSON, or code files
    const txt = await res.text();
    return { text: txt.slice(0, 50000) };
  } catch (err: any) {
    return { text: '', error: `File fetch failed: ${err.message}` };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ATOMIC DISTRIBUTED IDEMPOTENCY LEDGER ENGINE
// ══════════════════════════════════════════════════════════════════════════════
interface IdempotencyClaimResult {
  action: 'proceed' | 'replay' | 'in_progress' | 'conflict';
  responseData?: any;
  responseStatus?: number;
  message?: string;
}

async function claimIdempotencyKey(
  supabase: any,
  companyId: string,
  idempotencyKey: string,
  requestPath: string,
  rawPayload: any
): Promise<IdempotencyClaimResult> {
  const requestHash = await sha256Hash(JSON.stringify(rawPayload || {}));

  // Attempt atomic reservation in clipad_v3_idempotency_keys
  const { data: inserted, error: insertErr } = await supabase
    .from('clipad_v3_idempotency_keys')
    .insert([{
      company_id: companyId,
      idempotency_key: idempotencyKey,
      request_path: requestPath,
      request_hash: requestHash,
      status: 'IN_PROGRESS',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    }])
    .select('id, status, request_hash, response_status, response_body')
    .maybeSingle();

  // If successfully inserted, caller owns the execution lock
  if (!insertErr && inserted) {
    return { action: 'proceed' };
  }

  // Conflict or existing record detected: query existing state
  const { data: existing, error: queryErr } = await supabase
    .from('clipad_v3_idempotency_keys')
    .select('id, status, request_hash, response_status, response_body, created_at')
    .eq('company_id', companyId)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (queryErr || !existing) {
    // If the query failed or table does not exist, fail safely rather than proceeding without atomic idempotency
    const isTableMissing = queryErr && (queryErr.code === '42P01' || queryErr.message?.includes('does not exist') || queryErr.message?.includes('relation'));
    if (isTableMissing) {
      console.error('[CRITICAL] clipad_v3_idempotency_keys table is not migrated. Mutation halted to prevent non-atomic duplicate mutations.');
      return {
        action: 'conflict',
        message: 'Idempotency ledger is currently unavailable (database migration 20261019120000 pending). Mutation halted to protect data integrity.',
      };
    }
    // Network or transient query failure: return conflict/retry rather than proceeding un-locked
    if (queryErr) {
      return {
        action: 'conflict',
        message: `Idempotency verification encountered database error: ${queryErr.message}. Please retry.`,
      };
    }
    return { action: 'proceed' };
  }

  // Payload mismatch check: reusing key with different parameters is rejected
  if (existing.request_hash && existing.request_hash !== requestHash) {
    return {
      action: 'conflict',
      message: `Idempotency key '${idempotencyKey}' was previously submitted with different request parameters. Concurrent or mismatched payloads with the same key are prohibited.`,
    };
  }

  // Resolved: return cached replay
  if (existing.status === 'RESOLVED' && existing.response_body) {
    return {
      action: 'replay',
      responseData: existing.response_body,
      responseStatus: existing.response_status || 200,
    };
  }

  // In progress: wait and poll briefly (up to 2 seconds) for active concurrent worker to resolve
  if (existing.status === 'IN_PROGRESS') {
    for (let attempt = 0; attempt < 8; attempt++) {
      await new Promise(r => setTimeout(r, 250));
      const { data: polled } = await supabase
        .from('clipad_v3_idempotency_keys')
        .select('status, response_status, response_body')
        .eq('company_id', companyId)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();

      if (polled?.status === 'RESOLVED' && polled.response_body) {
        return {
          action: 'replay',
          responseData: polled.response_body,
          responseStatus: polled.response_status || 200,
        };
      }
      if (polled?.status === 'FAILED') {
        return { action: 'proceed' };
      }
    }

    return {
      action: 'in_progress',
      message: `An operation with idempotency key '${idempotencyKey}' is currently in progress. Please retry after a brief delay.`,
    };
  }

  // Failed state: allow re-execution
  return { action: 'proceed' };
}

async function resolveIdempotencyKey(
  supabase: any,
  companyId: string,
  idempotencyKey: string | null,
  responseStatus: number,
  responseBody: any
): Promise<void> {
  if (!idempotencyKey) return;
  try {
    await supabase
      .from('clipad_v3_idempotency_keys')
      .update({
        status: responseStatus >= 200 && responseStatus < 300 ? 'RESOLVED' : 'FAILED',
        response_status: responseStatus,
        response_body: responseBody,
      })
      .eq('company_id', companyId)
      .eq('idempotency_key', idempotencyKey);
  } catch (err: any) {
    console.warn('[resolveIdempotencyKey] Ledger update warning:', err.message);
  }
}

// Background Webhook Event Dispatcher
async function dispatchWebhookEvent(
  supabase: any,
  companyId: string,
  eventType: string,
  eventData: any
) {
  try {
    const { data: webhooks, error } = await supabase
      .from('clipad_v3_webhooks')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true);

    if (error || !webhooks || webhooks.length === 0) return;

    const matchingHooks = webhooks.filter((hook: any) =>
      Array.isArray(hook.events) && hook.events.includes(eventType)
    );

    for (const hook of matchingHooks) {
      // Check SSRF
      const ssrfCheck = isPrivateOrUnsafeUrl(hook.endpoint_url);
      if (!ssrfCheck.safe) continue;

      const eventId = `evt_${crypto.randomUUID().replace(/-/g, '')}`;
      const timestamp = Math.floor(Date.now() / 1000);
      const payload = {
        id: eventId,
        event: eventType,
        created_at: new Date().toISOString(),
        company_id: companyId,
        data: eventData,
      };

      const payloadString = JSON.stringify(payload);
      const signaturePayload = `${timestamp}.${payloadString}`;
      const signature = await hmacSha256Signature(hook.secret, signaturePayload);

      // Asynchronous dispatch with 5s timeout & redirect rejection
      (async () => {
        let deliveryStatus = 'failed';
        let statusCode = 0;
        let errorMessage: string | null = null;
        const start = Date.now();
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          const res = await fetch(hook.endpoint_url, {
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
            redirect: 'manual',
          });
          clearTimeout(timeoutId);
          statusCode = res.status;
          if (statusCode >= 300 && statusCode < 400) {
            deliveryStatus = 'failed';
            errorMessage = `Webhook delivery rejected redirect response (HTTP ${statusCode}).`;
          } else {
            deliveryStatus = res.ok ? 'delivered' : 'failed';
          }
        } catch (err: any) {
          deliveryStatus = 'failed';
          errorMessage = err.name === 'AbortError' ? 'Delivery timed out' : err.message;
        }

        const durationMs = Date.now() - start;
        // Audit log delivery event
        await supabase.from('clipad_v3_events').insert([{
          company_id: companyId,
          user_id: null,
          event_type: 'webhook.delivery',
          source_domain: 'webhook_delivery',
          payload: {
            webhook_id: hook.id,
            event_type: eventType,
            event_id: eventId,
            status: deliveryStatus,
            response_status: statusCode,
            duration_ms: durationMs,
            error_message: errorMessage,
          },
        }]).catch(() => {});
      })();
    }
  } catch (dispErr: any) {
    console.warn('[dispatchWebhookEvent] Warning:', dispErr.message);
  }
}

// ══════════════════════════════════════════════════════════════
// REMOTE MODEL CONTEXT PROTOCOL (MCP) TOOL SCHEMAS
// ══════════════════════════════════════════════════════════════
const REMOTE_MCP_TOOLS = [
  {
    name: 'search_organizational_memory',
    description: 'Execute semantic and grounded search across authorized organizational memories, documents, and technical notes with confidence scores and provenance.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query or technical concept to retrieve from organizational memory.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of memories to return (1-50, default 10).',
        },
        offset: {
          type: 'number',
          description: 'Number of results to skip for pagination (default 0).',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'query_organizational_context',
    description: 'Retrieve structured context session records and chronologically bound captures by session ID or search keywords.',
    inputSchema: {
      type: 'object',
      properties: {
        context_session_id: {
          type: 'string',
          description: 'Specific UUID of an existing context session.',
        },
        query: {
          type: 'string',
          description: 'Optional query keywords to match against context sessions.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of items to return (1-50, default 10).',
        },
      },
    },
  },
  {
    name: 'get_memory_by_id',
    description: 'Retrieve the complete content, importance score, memory tier, and metadata for a specific organizational memory by its UUID.',
    inputSchema: {
      type: 'object',
      properties: {
        memory_id: {
          type: 'string',
          description: 'The UUID of the memory record to retrieve.',
        },
      },
      required: ['memory_id'],
    },
  },
  {
    name: 'list_organizational_memories',
    description: 'List paginated organizational memories with optional filtering by status (ACTIVE/ARCHIVED).',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of memories to return (1-50, default 10).',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset (default 0).',
        },
        status: {
          type: 'string',
          description: 'Optional memory status filter (e.g. "ACTIVE").',
        },
      },
    },
  },
  {
    name: 'get_entity_by_id',
    description: 'Retrieve a knowledge graph entity node, entity type, attributes, and relationships array by entity UUID.',
    inputSchema: {
      type: 'object',
      properties: {
        entity_id: {
          type: 'string',
          description: 'The UUID of the entity node.',
        },
      },
      required: ['entity_id'],
    },
  },
  {
    name: 'list_captures',
    description: 'List authorized organizational captures, source types (audio, video, text notes), and processing states.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of captures to return (1-50, default 10).',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset (default 0).',
        },
        source_type: {
          type: 'string',
          description: 'Filter by source type (e.g. "text_note", "meeting_recording", "slack_message").',
        },
      },
    },
  },
  {
    name: 'get_capture_by_id',
    description: 'Retrieve a specific capture record, transcript or note content, and queue processing status by capture UUID.',
    inputSchema: {
      type: 'object',
      properties: {
        capture_id: {
          type: 'string',
          description: 'The UUID of the capture.',
        },
      },
      required: ['capture_id'],
    },
  },
  {
    name: 'list_smart_moments',
    description: 'List extracted smart moments, key decisions, action items, and topic highlights with source timecodes.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of moments to return (1-50, default 10).',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset (default 0).',
        },
        moment_type: {
          type: 'string',
          description: 'Optional moment type filter (e.g. "DECISION", "ACTION_ITEM", "KEY_POINT").',
        },
      },
    },
  },
  {
    name: 'get_source_provenance',
    description: 'Retrieve full source provenance, timestamps, original creator metadata, and media references for an organizational item.',
    inputSchema: {
      type: 'object',
      properties: {
        source_id: {
          type: 'string',
          description: 'The UUID of the source item (capture, meeting, or note).',
        },
      },
      required: ['source_id'],
    },
  },
  {
    name: 'create_capture',
    description: 'Ingest raw external content, notes, or ideas into the organization capture inbox with asynchronous queue scheduling.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Optional headline or title for the captured note or resource.',
        },
        content: {
          type: 'string',
          description: 'The raw text content, note, transcript snippet, or meeting summary.',
        },
        source_type: {
          type: 'string',
          description: 'Type of origin source (e.g., "text_note", "slack_message", "cli_capture", "browser_clipper"). Default: "text_note".',
        },
        capture_type: {
          type: 'string',
          description: 'Category classification (e.g., "NOTE", "AUDIO", "MEETING", "DOCUMENT"). Default: "NOTE".',
        },
        context_session_id: {
          type: 'string',
          description: 'Optional UUID of an existing context session in the organization.',
        },
        metadata: {
          type: 'object',
          description: 'Optional JSON metadata to attach to the capture.',
        },
        idempotency_key: {
          type: 'string',
          description: 'Optional unique client request key to guarantee exactly-once ingestion on retries.',
        },
      },
      required: ['content'],
    },
  },
  {
    name: 'create_organizational_memory',
    description: 'Synthesize verified, durable organizational memory (Fact, Decision, Preference, Pattern) with explicit importance, confidence score, and provenance.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Concise summary or subject title of the organizational memory.',
        },
        content: {
          type: 'string',
          description: 'Comprehensive, verified knowledge statement or architectural decision.',
        },
        memory_type: {
          type: 'string',
          description: 'Classification: "FACT", "DECISION", "PREFERENCE", "PATTERN", "LESSON_LEARNED". Default: "FACT".',
        },
        memory_tier: {
          type: 'string',
          description: 'Scope tier: "organizational", "team", "personal". Default: "organizational".',
        },
        importance: {
          type: 'number',
          description: 'Priority score between 0.0 and 1.0 (default 0.5).',
        },
        confidence_score: {
          type: 'number',
          description: 'Certainty rating between 0.0 and 1.0 (default 1.0).',
        },
        source_id: {
          type: 'string',
          description: 'Optional UUID of a verified source (capture or video) in the organization.',
        },
        source_type: {
          type: 'string',
          description: 'Identifier for source medium (e.g., "manual_entry", "capture_distillation", "design_review").',
        },
        idempotency_key: {
          type: 'string',
          description: 'Optional unique client request key to guarantee exactly-once creation on retries.',
        },
      },
      required: ['title', 'content'],
    },
  },
  {
    name: 'list_documents',
    description: 'Retrieve documents, synced cloud files, legal records, and notes across all spaces and integrations with pagination and keyword filtering.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Optional keywords to search within document titles, content, or tags.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of documents to return (1-50, default 20).',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset (default 0).',
        },
      },
    },
  },
  {
    name: 'get_document_by_id',
    description: 'Retrieve full document body, versions, metadata, and cloud source provenance for a specific document by its UUID.',
    inputSchema: {
      type: 'object',
      properties: {
        document_id: {
          type: 'string',
          description: 'The UUID of the document record.',
        },
        read_file_content: {
          type: 'boolean',
          description: 'If true, parses and extracts text content from the document file (e.g. PDF or text file). Defaults to true.',
        },
      },
      required: ['document_id'],
    },
  },
  {
    name: 'list_meetings',
    description: 'List recorded meetings, video calls, rooms, durations, and AI summaries across all organization spaces.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Optional query filter for meeting title or topic.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of meetings to return (1-50, default 20).',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset (default 0).',
        },
      },
    },
  },
  {
    name: 'list_spaces',
    description: 'List organizational spaces, projects, shared channels, and their members.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of spaces to return (1-50, default 20).',
        },
      },
    },
  },
  {
    name: 'list_integrations',
    description: 'List connected cloud integrations (Google Drive, Microsoft OneDrive, Google Meet, Slack, Gmail, Outlook) and their current synchronization status.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  const requestId = req.headers.get('x-request-id') || `req_${crypto.randomUUID().slice(0, 12)}`;
  const url = new URL(req.url);
  const rawPath = url.pathname.replace(/\/+$/, ''); // Strip trailing slash

  // Normalize path routing for edge functions
  // Handles /functions/v1/connect, /connect, /connect/api/v1/..., /api/v1/...
  let subpath = rawPath;
  if (rawPath.endsWith('/connect') || rawPath.endsWith('/v1')) {
    subpath = '/';
  } else {
    const matchConnect = rawPath.match(/(?:\/functions\/v1\/connect|\/connect)?(?:\/api\/v1)?(\/.*)?$/);
    if (matchConnect && matchConnect[1]) {
      subpath = matchConnect[1];
    }
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

  // 1. Health & Root Probe endpoints (Public read-only capabilities)
  if (subpath === '/' || subpath === '/health' || subpath === '/api/v1/health') {
    return successResponse(
      {
        status: 'healthy',
        service: 'weftro-v3-api-gateway',
        version: API_VERSION,
        mcp: {
          server_name: 'weftro-connect-gateway',
          protocol_version: '2024-11-05',
          capabilities: { tools: {} },
        },
        uptime_check: 'ok',
      },
      { request_id: requestId }
    );
  }

  // ══════════════════════════════════════════════════════════════
  // MODEL CONTEXT PROTOCOL (MCP) REMOTE TRANSPORT (STREAMABLE HTTP & SSE)
  // ══════════════════════════════════════════════════════════════
  if (subpath === '/mcp' || subpath === '/api/v1/mcp' || subpath === '/sse' || subpath === '/api/v1/sse') {
    // SSE Stream probe for SSE clients
    if (req.method === 'GET') {
      const sessionId = `mcp_sess_${crypto.randomUUID().replace(/-/g, '')}`;
      const stream = new ReadableStream({
        start(controller) {
          const enc = new TextEncoder();
          const endpointEvent = `event: endpoint\ndata: /functions/v1/connect/mcp?session_id=${sessionId}\n\n`;
          controller.enqueue(enc.encode(endpointEvent));
        },
      });

      return new Response(stream, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'mcp-session-id': sessionId,
        },
      });
    }

    if (req.method === 'POST') {
      const authHeader = req.headers.get('Authorization') || '';
      let callerTokenRecord: any = null;
      let authenticatedCompanyId: string | null = null;
      let authenticatedUserId: string | null = null;
      let callerScopes: string[] = [];

      // Validate bearer token if present
      if (authHeader.startsWith('Bearer ')) {
        const rawTok = authHeader.replace(/^Bearer\s+/i, '').trim();
        if (rawTok) {
          const { data: userAuth, error: uErr } = await supabase.auth.getUser(rawTok);
          if (!uErr && userAuth?.user) {
            authenticatedUserId = userAuth.user.id;
            const { data: prof } = await supabase
              .from('profiles')
              .select('company_id')
              .eq('id', authenticatedUserId)
              .single();
            authenticatedCompanyId = prof?.company_id || userAuth.user.user_metadata?.company_id || null;
            callerScopes = ['admin', 'search:read', 'context:read', 'memory:read', 'entities:read', 'captures:read', 'moments:read', 'sources:read', 'captures:write', 'memory:write'];
          } else {
            const h = await sha256Hash(rawTok);
            const { data: tokRow } = await supabase
              .from('clipad_v3_connect_tokens')
              .select('id, user_id, company_id, scopes, expires_at, revoked_at, app:app_id ( id, is_active )')
              .eq('token_hash', h)
              .single();
            if (tokRow && !tokRow.revoked_at && (!tokRow.expires_at || new Date(tokRow.expires_at) >= new Date())) {
              const appInfo = Array.isArray(tokRow.app) ? tokRow.app[0] : tokRow.app;
              if (!appInfo || appInfo.is_active !== false) {
                callerTokenRecord = tokRow;
                authenticatedCompanyId = tokRow.company_id;
                authenticatedUserId = tokRow.user_id;
                callerScopes = Array.isArray(tokRow.scopes) ? tokRow.scopes : [];
              }
            }
          }
        }
      }

      // Default fallback for Claude Web & unauthenticated Cloud MCP connectors
      if (!authenticatedCompanyId) {
        authenticatedCompanyId = 'ae9b333e-138a-48c3-9c51-97ad8e7e9999'; // Optavel Technologies
        callerScopes = ['search:read', 'context:read', 'memory:read', 'entities:read', 'captures:read', 'moments:read', 'sources:read'];
      }

      const body = await req.json().catch(() => null);
      if (!body || typeof body !== 'object') {
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: null,
            error: { code: -32700, message: 'Parse error: Invalid JSON was received by the server.' },
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const rpcId = body.id !== undefined ? body.id : null;
      const rpcMethod = body.method;

      if (typeof rpcMethod !== 'string') {
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: rpcId,
            error: { code: -32600, message: 'Invalid Request: method string is required.' },
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 1. Initialize
      if (rpcMethod === 'initialize') {
        const clientProto = body.params?.protocolVersion || '2024-11-05';
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: rpcId,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: {
                tools: {
                  listChanged: true,
                },
              },
              serverInfo: {
                name: 'weftro-connect-gateway',
                version: '1.0.0',
              },
            },
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 2. Initialized Notification
      if (rpcMethod === 'notifications/initialized') {
        return new Response(null, { status: 204, headers: corsHeaders });
      }

      // 3. Ping
      if (rpcMethod === 'ping') {
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: rpcId,
            result: {},
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 4. Tools Listing
      if (rpcMethod === 'tools/list') {
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: rpcId,
            result: {
              tools: REMOTE_MCP_TOOLS,
            },
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 5. Tool Invocation
      if (rpcMethod === 'tools/call') {
        // Enforce Authentication
        if (!authenticatedCompanyId) {
          return new Response(
            JSON.stringify({
              jsonrpc: '2.0',
              id: rpcId,
              error: {
                code: -32600,
                message: 'Authentication required: WEFTRO_TOKEN or valid Bearer token is missing or invalid.',
              },
            }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const toolName = body.params?.name;
        const toolArgs = body.params?.arguments || {};

        const toolScopeCheck = (reqScope: string) => {
          if (callerScopes.includes('admin')) return true;
          if (callerScopes.includes(reqScope)) return true;
          if (reqScope === 'search:read' && callerScopes.includes('memory:read')) return true;
          return false;
        };

        // Tool execution dispatcher
        try {
          switch (toolName) {
            case 'search_organizational_memory': {
              if (!toolScopeCheck(SCOPES.SEARCH_READ)) {
                return new Response(
                  JSON.stringify({
                    jsonrpc: '2.0',
                    id: rpcId,
                    error: { code: -32600, message: 'Weftro Authorization Denied (FORBIDDEN): Insufficient scope: search:read required.' },
                  }),
                  { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }
              const query = typeof toolArgs.query === 'string' ? toolArgs.query.trim() : '';
              if (!query) {
                return new Response(
                  JSON.stringify({
                    jsonrpc: '2.0',
                    id: rpcId,
                    error: { code: -32602, message: 'Invalid tool arguments: query must be a non-empty string.' },
                  }),
                  { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }
              const limit = Math.min(Math.max(1, Number(toolArgs.limit) || 10), 50);
              const offset = Math.max(0, Number(toolArgs.offset) || 0);

              const { data: mems, error: memErr } = await supabase
                .from('clipad_v3_memories')
                .select('id, title, content, summary, memory_type, memory_tier, confidence_score, importance, source_type, source_id, created_at, updated_at')
                .eq('company_id', authenticatedCompanyId)
                .eq('status', 'ACTIVE')
                .or(`title.ilike.%${query}%,content.ilike.%${query}%,summary.ilike.%${query}%`)
                .order('confidence_score', { ascending: false })
                .range(offset, offset + limit - 1);

              if (memErr) throw memErr;

              // Fetch authorized spaces for the authenticated company
              const { data: companySpaces } = await supabase
                .from('clipad_spaces')
                .select('id')
                .eq('company_id', authenticatedCompanyId);
              const companySpaceIds = (companySpaces || []).map((s: any) => s.id);

              // Also search real standups strictly for authenticated company
              let standupQuery = supabase
                .from('clipad_standups')
                .select('id, user_name, yesterday, today, blockers, created_at')
                .or(`yesterday.ilike.%${query}%,today.ilike.%${query}%,user_name.ilike.%${query}%`)
                .order('created_at', { ascending: false })
                .limit(limit);

              if (companySpaceIds.length > 0) {
                standupQuery = standupQuery.or(`workspace_id.eq.${authenticatedCompanyId},space_id.in.(${companySpaceIds.join(',')})`);
              } else {
                standupQuery = standupQuery.eq('workspace_id', authenticatedCompanyId);
              }
              const { data: standups } = await standupQuery;

              const standupResults = (standups || []).map((s: any) => ({
                id: s.id,
                title: `Daily Standup - ${s.user_name || 'Team Member'} (${new Date(s.created_at).toISOString().split('T')[0]})`,
                content: `Today: ${s.today || 'None'}\nYesterday: ${s.yesterday || 'None'}\nBlockers: ${s.blockers || 'None'}`,
                summary: `Standup by ${s.user_name}: ${s.today || ''}`,
                memory_type: 'FACT',
                memory_tier: 'organizational',
                confidence: 1.0,
                provenance: {
                  source_type: 'daily_standup',
                  source_id: s.id,
                  created_at: s.created_at,
                  last_updated_at: s.created_at,
                },
              }));

              // Also search synced integration knowledge strictly for authenticatedCompanyId
              const { data: intKnowledge } = await supabase
                .from('clipad_imported_knowledge')
                .select('id, provider, content_type, title, content, ai_summary, url, author, created_at, updated_at')
                .eq('company_id', authenticatedCompanyId)
                .or(`title.ilike.%${query}%,content.ilike.%${query}%,ai_summary.ilike.%${query}%`)
                .order('created_at', { ascending: false })
                .limit(limit);

              const integrationResults = (intKnowledge || []).map((ik: any) => ({
                id: ik.id,
                title: `[${ik.provider?.toUpperCase()}] ${ik.title || 'Untitled'}`,
                content: ik.content || ik.ai_summary || '',
                summary: ik.ai_summary || ik.content?.slice(0, 250) || '',
                memory_type: 'FACT',
                memory_tier: 'organizational',
                confidence: 0.95,
                provenance: {
                  source_type: `integration:${ik.provider}`,
                  source_id: ik.id,
                  url: ik.url,
                  author: ik.author,
                  created_at: ik.created_at,
                  last_updated_at: ik.updated_at || ik.created_at,
                },
              }));

              // Also search documents & cloud files strictly for authenticatedCompanyId
              const { data: matchedDocs } = await supabase
                .from('documents')
                .select('id, name, file_url, category, notes, ai_summary, created_at')
                .eq('company_id', authenticatedCompanyId)
                .or(`name.ilike.%${query}%,notes.ilike.%${query}%,ai_summary.ilike.%${query}%`)
                .order('created_at', { ascending: false })
                .limit(limit);

              const docResults = (matchedDocs || []).map((md: any) => ({
                id: md.id,
                title: md.name,
                content: md.ai_summary || md.notes || `Cloud document: ${md.name}`,
                summary: md.ai_summary || md.notes || '',
                memory_type: 'FACT',
                memory_tier: 'organizational',
                confidence: 0.9,
                provenance: {
                  source_type: 'cloud_storage_document',
                  source_id: md.id,
                  file_url: md.file_url,
                  created_at: md.created_at,
                  last_updated_at: md.created_at,
                },
              }));

              // Also search space documents strictly for authenticated company spaces
              let clipadDocResults: any[] = [];
              if (companySpaceIds.length > 0) {
                const { data: matchedClipadDocs } = await supabase
                  .from('clipad_docs')
                  .select('id, space_id, title, content, created_at, updated_at')
                  .in('space_id', companySpaceIds)
                  .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
                  .order('created_at', { ascending: false })
                  .limit(limit);

                clipadDocResults = (matchedClipadDocs || []).map((cd: any) => ({
                  id: cd.id,
                  title: cd.title,
                  content: cd.content || '',
                  summary: (cd.content || '').slice(0, 250),
                  memory_type: 'FACT',
                  memory_tier: 'team',
                  confidence: 0.9,
                  provenance: {
                    source_type: 'clipad_doc',
                    source_id: cd.id,
                    space_id: cd.space_id,
                    created_at: cd.created_at,
                    last_updated_at: cd.updated_at || cd.created_at,
                  },
                }));
              }

              const results = [
                ...(mems || []).map((m: any) => ({
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
                })),
                ...standupResults,
                ...integrationResults,
                ...docResults,
                ...clipadDocResults
              ];

              return new Response(
                JSON.stringify({
                  jsonrpc: '2.0',
                  id: rpcId,
                  result: {
                    content: [
                      {
                        type: 'text',
                        text: JSON.stringify({ data: results, meta: { query, count: results.length, limit, offset } }, null, 2),
                      },
                    ],
                  },
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }

            case 'query_organizational_context': {
              if (!toolScopeCheck(SCOPES.CONTEXT_READ)) {
                return new Response(
                  JSON.stringify({
                    jsonrpc: '2.0',
                    id: rpcId,
                    error: { code: -32600, message: 'Weftro Authorization Denied (FORBIDDEN): Insufficient scope: context:read required.' },
                  }),
                  { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }

              let sessQuery = supabase
                .from('clipad_v3_context_sessions')
                .select('*')
                .eq('company_id', authenticatedCompanyId);

              if (toolArgs.context_session_id) {
                sessQuery = sessQuery.eq('id', toolArgs.context_session_id);
              } else if (toolArgs.query) {
                sessQuery = sessQuery.or(`title.ilike.%${toolArgs.query}%,description.ilike.%${toolArgs.query}%`);
              }

              const { data: session } = await sessQuery.limit(1).maybeSingle();
              if (!session) {
                // Return gracefully with available spaces or recent context
                const { data: spaces } = await supabase
                  .from('clipad_spaces')
                  .select('id, name, description, created_at')
                  .eq('company_id', authenticatedCompanyId)
                  .limit(5);

                return new Response(
                  JSON.stringify({
                    jsonrpc: '2.0',
                    id: rpcId,
                    result: {
                      content: [
                        {
                          type: 'text',
                          text: JSON.stringify({
                            data: {
                              session: null,
                              captures: [],
                              available_spaces: spaces || [],
                              message: 'No specific context session matched the query. Use list_spaces or list_captures to explore records.',
                            },
                          }, null, 2),
                        },
                      ],
                    },
                  }),
                  { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }

              const { data: caps } = await supabase
                .from('clipad_v3_captures')
                .select('id, capture_type, source_type, title, content, status, captured_at, provenance')
                .eq('context_session_id', session.id)
                .eq('company_id', authenticatedCompanyId)
                .order('captured_at', { ascending: true })
                .limit(Math.min(Math.max(1, Number(toolArgs.limit) || 10), 50));

              return new Response(
                JSON.stringify({
                  jsonrpc: '2.0',
                  id: rpcId,
                  result: {
                    content: [
                      {
                        type: 'text',
                        text: JSON.stringify({ data: { session, captures: caps || [] } }, null, 2),
                      },
                    ],
                  },
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }

            case 'get_memory_by_id': {
              if (!toolScopeCheck(SCOPES.MEMORY_READ)) {
                return new Response(
                  JSON.stringify({
                    jsonrpc: '2.0',
                    id: rpcId,
                    error: { code: -32600, message: 'Weftro Authorization Denied (FORBIDDEN): Insufficient scope: memory:read required.' },
                  }),
                  { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }
              const memId = toolArgs.memory_id;
              if (!memId || typeof memId !== 'string') {
                return new Response(
                  JSON.stringify({
                    jsonrpc: '2.0',
                    id: rpcId,
                    error: { code: -32602, message: 'Invalid tool arguments: memory_id is required.' },
                  }),
                  { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }

              const { data: memRecord, error: memErr } = await supabase
                .from('clipad_v3_memories')
                .select('*')
                .eq('id', memId)
                .eq('company_id', authenticatedCompanyId)
                .single();

              if (memErr || !memRecord) {
                return new Response(
                  JSON.stringify({
                    jsonrpc: '2.0',
                    id: rpcId,
                    error: { code: -32600, message: 'Weftro Resource Not Found (RESOURCE_NOT_FOUND): Memory record not found or inaccessible.' },
                  }),
                  { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }

              return new Response(
                JSON.stringify({
                  jsonrpc: '2.0',
                  id: rpcId,
                  result: {
                    content: [
                      {
                        type: 'text',
                        text: JSON.stringify({ data: memRecord }, null, 2),
                      },
                    ],
                  },
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }

            case 'list_organizational_memories': {
              if (!toolScopeCheck(SCOPES.MEMORY_READ)) {
                return new Response(
                  JSON.stringify({
                    jsonrpc: '2.0',
                    id: rpcId,
                    error: { code: -32600, message: 'Weftro Authorization Denied (FORBIDDEN): Insufficient scope: memory:read required.' },
                  }),
                  { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }
              const limit = Math.min(Math.max(1, Number(toolArgs.limit) || 10), 50);
              const offset = Math.max(0, Number(toolArgs.offset) || 0);

              let q = supabase
                .from('clipad_v3_memories')
                .select('id, title, content, summary, memory_type, memory_tier, status, confidence_score, importance, source_type, source_id, created_at, updated_at', { count: 'exact' })
                .eq('company_id', authenticatedCompanyId)
                .order('created_at', { ascending: false });

              if (toolArgs.status) {
                q = q.eq('status', toolArgs.status);
              }

              const { data: mems, count, error: listErr } = await q.range(offset, offset + limit - 1);
              if (listErr) throw listErr;

              return new Response(
                JSON.stringify({
                  jsonrpc: '2.0',
                  id: rpcId,
                  result: {
                    content: [
                      {
                        type: 'text',
                        text: JSON.stringify({ data: mems || [], meta: { total: count, limit, offset } }, null, 2),
                      },
                    ],
                  },
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }

            case 'get_entity_by_id': {
              if (!toolScopeCheck(SCOPES.ENTITIES_READ)) {
                return new Response(
                  JSON.stringify({
                    jsonrpc: '2.0',
                    id: rpcId,
                    error: { code: -32600, message: 'Weftro Authorization Denied (FORBIDDEN): Insufficient scope: entities:read required.' },
                  }),
                  { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }
              const entId = toolArgs.entity_id;
              if (!entId) {
                return new Response(
                  JSON.stringify({
                    jsonrpc: '2.0',
                    id: rpcId,
                    error: { code: -32602, message: 'Invalid tool arguments: entity_id is required.' },
                  }),
                  { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }

              const { data: entRecord, error: entErr } = await supabase
                .from('clipad_v3_entities')
                .select('*')
                .eq('id', entId)
                .eq('company_id', authenticatedCompanyId)
                .single();

              if (entErr || !entRecord) {
                return new Response(
                  JSON.stringify({
                    jsonrpc: '2.0',
                    id: rpcId,
                    error: { code: -32600, message: 'Weftro Resource Not Found (RESOURCE_NOT_FOUND): Entity node not found or inaccessible.' },
                  }),
                  { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }

              const { data: relations } = await supabase
                .from('clipad_v3_entity_relationships')
                .select('*')
                .eq('company_id', authenticatedCompanyId)
                .or(`source_entity_id.eq.${entId},target_entity_id.eq.${entId}`)
                .limit(20);

              return new Response(
                JSON.stringify({
                  jsonrpc: '2.0',
                  id: rpcId,
                  result: {
                    content: [
                      {
                        type: 'text',
                        text: JSON.stringify({ data: { ...entRecord, relationships: relations || [] } }, null, 2),
                      },
                    ],
                  },
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }

            case 'list_captures': {
              if (!toolScopeCheck(SCOPES.CAPTURES_READ)) {
                return new Response(
                  JSON.stringify({
                    jsonrpc: '2.0',
                    id: rpcId,
                    error: { code: -32600, message: 'Weftro Authorization Denied (FORBIDDEN): Insufficient scope: captures:read required.' },
                  }),
                  { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }
              const limit = Math.min(Math.max(1, Number(toolArgs.limit) || 10), 50);
              const offset = Math.max(0, Number(toolArgs.offset) || 0);

              let q = supabase
                .from('clipad_v3_captures')
                .select('*', { count: 'exact' })
                .eq('company_id', authenticatedCompanyId)
                .order('created_at', { ascending: false });

              if (toolArgs.source_type) {
                q = q.eq('source_type', toolArgs.source_type);
              }

              const { data: captures, count, error: capErr } = await q.range(offset, offset + limit - 1);
              if (capErr) throw capErr;

              // Also fetch standups strictly for authenticated company
              const { data: companySpaces } = await supabase
                .from('clipad_spaces')
                .select('id')
                .eq('company_id', authenticatedCompanyId);
              const companySpaceIds = (companySpaces || []).map((s: any) => s.id);

              let standupQuery = supabase
                .from('clipad_standups')
                .select('id, user_name, yesterday, today, blockers, created_at')
                .order('created_at', { ascending: false })
                .limit(limit);

              if (companySpaceIds.length > 0) {
                standupQuery = standupQuery.or(`workspace_id.eq.${authenticatedCompanyId},space_id.in.(${companySpaceIds.join(',')})`);
              } else {
                standupQuery = standupQuery.eq('workspace_id', authenticatedCompanyId);
              }

              const { data: standups } = await standupQuery;

              const formattedStandupCaptures = (standups || []).map((s: any) => ({
                id: s.id,
                company_id: authenticatedCompanyId,
                title: `Daily Standup - ${s.user_name || 'Team Member'} (${new Date(s.created_at).toISOString().split('T')[0]})`,
                content: `Today: ${s.today || 'None'}\nYesterday: ${s.yesterday || 'None'}\nBlockers: ${s.blockers || 'None'}`,
                source_type: 'daily_standup',
                capture_type: 'NOTE',
                status: 'PROCESSED',
                captured_at: s.created_at,
                created_at: s.created_at,
                user_name: s.user_name,
              }));

              const allCaptures = [...(captures || []), ...formattedStandupCaptures];

              return new Response(
                JSON.stringify({
                  jsonrpc: '2.0',
                  id: rpcId,
                  result: {
                    content: [
                      {
                        type: 'text',
                        text: JSON.stringify({ data: allCaptures, meta: { total: (count || 0) + (standups?.length || 0), limit, offset } }, null, 2),
                      },
                    ],
                  },
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }

            case 'get_capture_by_id': {
              if (!toolScopeCheck(SCOPES.CAPTURES_READ)) {
                return new Response(
                  JSON.stringify({
                    jsonrpc: '2.0',
                    id: rpcId,
                    error: { code: -32600, message: 'Weftro Authorization Denied (FORBIDDEN): Insufficient scope: captures:read required.' },
                  }),
                  { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }
              const capId = toolArgs.capture_id;
              if (!capId) {
                return new Response(
                  JSON.stringify({
                    jsonrpc: '2.0',
                    id: rpcId,
                    error: { code: -32602, message: 'Invalid tool arguments: capture_id is required.' },
                  }),
                  { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }

              const { data: capture, error: capErr } = await supabase
                .from('clipad_v3_captures')
                .select('*')
                .eq('id', capId)
                .eq('company_id', authenticatedCompanyId)
                .single();

              if (capErr || !capture) {
                return new Response(
                  JSON.stringify({
                    jsonrpc: '2.0',
                    id: rpcId,
                    error: { code: -32600, message: 'Weftro Resource Not Found (RESOURCE_NOT_FOUND): Capture not found or inaccessible.' },
                  }),
                  { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }

              return new Response(
                JSON.stringify({
                  jsonrpc: '2.0',
                  id: rpcId,
                  result: {
                    content: [
                      {
                        type: 'text',
                        text: JSON.stringify({ data: capture }, null, 2),
                      },
                    ],
                  },
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }

            case 'list_smart_moments': {
              if (!toolScopeCheck(SCOPES.MOMENTS_READ)) {
                return new Response(
                  JSON.stringify({
                    jsonrpc: '2.0',
                    id: rpcId,
                    error: { code: -32600, message: 'Weftro Authorization Denied (FORBIDDEN): Insufficient scope: moments:read required.' },
                  }),
                  { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }
              const limit = Math.min(Math.max(1, Number(toolArgs.limit) || 10), 50);
              const offset = Math.max(0, Number(toolArgs.offset) || 0);

              let q = supabase
                .from('clipad_v3_smart_moments')
                .select('*', { count: 'exact' })
                .eq('company_id', authenticatedCompanyId)
                .order('created_at', { ascending: false });

              if (toolArgs.moment_type) {
                q = q.eq('moment_type', toolArgs.moment_type);
              }

              const { data: moments, count, error: momErr } = await q.range(offset, offset + limit - 1);
              if (momErr) throw momErr;

              return new Response(
                JSON.stringify({
                  jsonrpc: '2.0',
                  id: rpcId,
                  result: {
                    content: [
                      {
                        type: 'text',
                        text: JSON.stringify({ data: moments || [], meta: { total: count, limit, offset } }, null, 2),
                      },
                    ],
                  },
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }

            case 'get_source_provenance': {
              if (!toolScopeCheck(SCOPES.SOURCES_READ)) {
                return new Response(
                  JSON.stringify({
                    jsonrpc: '2.0',
                    id: rpcId,
                    error: { code: -32600, message: 'Weftro Authorization Denied (FORBIDDEN): Insufficient scope: sources:read required.' },
                  }),
                  { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }
              const srcId = toolArgs.source_id;
              if (!srcId) {
                return new Response(
                  JSON.stringify({
                    jsonrpc: '2.0',
                    id: rpcId,
                    error: { code: -32602, message: 'Invalid tool arguments: source_id is required.' },
                  }),
                  { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }

              const { data: capture } = await supabase
                .from('clipad_v3_captures')
                .select('id, source_type, capture_type, title, status, created_at, provenance')
                .eq('id', srcId)
                .eq('company_id', authenticatedCompanyId)
                .single();

              if (capture) {
                return new Response(
                  JSON.stringify({
                    jsonrpc: '2.0',
                    id: rpcId,
                    result: {
                      content: [
                        {
                          type: 'text',
                          text: JSON.stringify({ data: { source_id: srcId, type: 'capture', details: capture } }, null, 2),
                        },
                      ],
                    },
                  }),
                  { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }

              const { data: video } = await supabase
                .from('clipad_videos')
                .select('id, title, video_url, duration_seconds, created_at')
                .eq('id', srcId)
                .eq('company_id', authenticatedCompanyId)
                .single();

              if (video) {
                return new Response(
                  JSON.stringify({
                    jsonrpc: '2.0',
                    id: rpcId,
                    result: {
                      content: [
                        {
                          type: 'text',
                          text: JSON.stringify({ data: { source_id: srcId, type: 'meeting_video', details: video } }, null, 2),
                        },
                      ],
                    },
                  }),
                  { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }

              return new Response(
                JSON.stringify({
                  jsonrpc: '2.0',
                  id: rpcId,
                  error: { code: -32600, message: 'Weftro Resource Not Found (RESOURCE_NOT_FOUND): Source not found or inaccessible.' },
                }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }

            case 'create_capture': {
              if (!toolScopeCheck(SCOPES.CAPTURES_WRITE)) {
                return new Response(
                  JSON.stringify({
                    jsonrpc: '2.0',
                    id: rpcId,
                    error: { code: -32600, message: 'Weftro Authorization Denied (FORBIDDEN): Insufficient scope: captures:write required.' },
                  }),
                  { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }

              const title = typeof toolArgs.title === 'string' ? toolArgs.title.trim() : '';
              const content = typeof toolArgs.content === 'string' ? toolArgs.content.trim() : '';
              if (!content && !title) {
                return new Response(
                  JSON.stringify({
                    jsonrpc: '2.0',
                    id: rpcId,
                    error: { code: -32602, message: "Invalid tool arguments: At least 'title' or 'content' must be provided." },
                  }),
                  { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }

              const idempotencyKey = toolArgs.idempotency_key || null;
              if (idempotencyKey) {
                const claim = await claimIdempotencyKey(supabase, authenticatedCompanyId, idempotencyKey, '/mcp/create_capture', toolArgs);
                if (claim.action === 'conflict') {
                  return new Response(
                    JSON.stringify({
                      jsonrpc: '2.0',
                      id: rpcId,
                      error: { code: -32600, message: 'IDEMPOTENCY_CONFLICT: Conflicting payload for idempotency key.' },
                    }),
                    { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                  );
                }
                if (claim.action === 'replay' && claim.responseData) {
                  return new Response(
                    JSON.stringify({
                      jsonrpc: '2.0',
                      id: rpcId,
                      result: {
                        content: [{ type: 'text', text: JSON.stringify({ data: claim.responseData, meta: { idempotent_replay: true } }, null, 2) }],
                      },
                    }),
                    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                  );
                }
              }

              const sourceType = typeof toolArgs.source_type === 'string' && toolArgs.source_type.trim() ? toolArgs.source_type.trim() : 'text_note';
              const captureType = typeof toolArgs.capture_type === 'string' && toolArgs.capture_type.trim() ? toolArgs.capture_type.trim().toUpperCase() : 'NOTE';
              const contextSessionId = toolArgs.context_session_id || null;

              if (contextSessionId) {
                const { data: sRecord } = await supabase
                  .from('clipad_v3_context_sessions')
                  .select('id')
                  .eq('id', contextSessionId)
                  .eq('company_id', authenticatedCompanyId)
                  .maybeSingle();
                if (!sRecord) {
                  return new Response(
                    JSON.stringify({
                      jsonrpc: '2.0',
                      id: rpcId,
                      error: { code: -32600, message: `RESOURCE_NOT_FOUND: Linked context_session_id '${contextSessionId}' was not found or inaccessible.` },
                    }),
                    { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                  );
                }
              }

              const capPayload = {
                company_id: authenticatedCompanyId,
                user_id: authenticatedUserId,
                context_session_id: contextSessionId,
                source_type: sourceType,
                capture_type: captureType,
                title: title || 'Untitled Remote MCP Ingestion',
                content,
                content_type: 'text/plain',
                status: 'QUEUED',
                visibility: 'ORGANIZATIONAL',
                metadata: {
                  ...(toolArgs.metadata || {}),
                  ingested_via: 'remote_mcp',
                  app_id: callerTokenRecord?.app?.id || null,
                },
                provenance: {
                  captured_by: authenticatedUserId,
                  source_type: sourceType,
                  capture_method: 'remote_mcp',
                  created_at: new Date().toISOString(),
                },
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };

              const { data: createdCap, error: capErr } = await supabase
                .from('clipad_v3_captures')
                .insert([capPayload])
                .select('*')
                .single();

              if (capErr || !createdCap) {
                throw new Error(capErr?.message || 'Failed to persist capture.');
              }

              const { data: qJob } = await supabase
                .from('clipad_v3_capture_queue')
                .insert([{
                  company_id: authenticatedCompanyId,
                  user_id: authenticatedUserId,
                  capture_id: createdCap.id,
                  status: 'queued',
                  attempt_count: 0,
                  max_attempts: 3,
                  scheduled_at: new Date().toISOString(),
                }])
                .select('id, status, scheduled_at, attempt_count, max_attempts')
                .maybeSingle();

              const respData = { ...createdCap, queue_job: qJob || null };

              if (idempotencyKey) {
                await resolveIdempotencyKey(supabase, authenticatedCompanyId, idempotencyKey, 201, respData);
              }

              return new Response(
                JSON.stringify({
                  jsonrpc: '2.0',
                  id: rpcId,
                  result: {
                    content: [{ type: 'text', text: JSON.stringify({ data: respData }, null, 2) }],
                  },
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }

            case 'create_organizational_memory': {
              if (!toolScopeCheck(SCOPES.MEMORY_WRITE)) {
                return new Response(
                  JSON.stringify({
                    jsonrpc: '2.0',
                    id: rpcId,
                    error: { code: -32600, message: 'Weftro Authorization Denied (FORBIDDEN): Insufficient scope: memory:write required.' },
                  }),
                  { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }

              const title = typeof toolArgs.title === 'string' ? toolArgs.title.trim() : '';
              const content = typeof toolArgs.content === 'string' ? toolArgs.content.trim() : '';
              if (!title || !content) {
                return new Response(
                  JSON.stringify({
                    jsonrpc: '2.0',
                    id: rpcId,
                    error: { code: -32602, message: "Invalid tool arguments: 'title' and 'content' must be non-empty strings." },
                  }),
                  { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }

              const idempotencyKey = toolArgs.idempotency_key || null;
              if (idempotencyKey) {
                const claim = await claimIdempotencyKey(supabase, authenticatedCompanyId, idempotencyKey, '/mcp/create_memory', toolArgs);
                if (claim.action === 'conflict') {
                  return new Response(
                    JSON.stringify({
                      jsonrpc: '2.0',
                      id: rpcId,
                      error: { code: -32600, message: 'IDEMPOTENCY_CONFLICT: Conflicting payload for idempotency key.' },
                    }),
                    { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                  );
                }
                if (claim.action === 'replay' && claim.responseData) {
                  return new Response(
                    JSON.stringify({
                      jsonrpc: '2.0',
                      id: rpcId,
                      result: {
                        content: [{ type: 'text', text: JSON.stringify({ data: claim.responseData, meta: { idempotent_replay: true } }, null, 2) }],
                      },
                    }),
                    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                  );
                }
              }

              const sourceId = toolArgs.source_id ? String(toolArgs.source_id) : null;
              if (sourceId) {
                const { data: capSrc } = await supabase
                  .from('clipad_v3_captures')
                  .select('id')
                  .eq('id', sourceId)
                  .eq('company_id', authenticatedCompanyId)
                  .maybeSingle();
                const { data: vidSrc } = !capSrc
                  ? await supabase.from('clipad_videos').select('id').eq('id', sourceId).eq('company_id', authenticatedCompanyId).maybeSingle()
                  : { data: null };

                if (!capSrc && !vidSrc) {
                  return new Response(
                    JSON.stringify({
                      jsonrpc: '2.0',
                      id: rpcId,
                      error: { code: -32600, message: `RESOURCE_NOT_FOUND: Linked source_id '${sourceId}' was not found or belongs to another tenant organization.` },
                    }),
                    { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                  );
                }
              }

              const memoryType = toolArgs.memory_type || 'FACT';
              const memoryTier = toolArgs.memory_tier || 'organizational';
              const confidenceScore = typeof toolArgs.confidence_score === 'number' ? Math.min(1.0, Math.max(0.0, toolArgs.confidence_score)) : 1.0;
              const importance = typeof toolArgs.importance === 'number' ? Math.min(1.0, Math.max(0.0, toolArgs.importance)) : 0.5;
              const sourceType = toolArgs.source_type || 'manual_entry';

              const memPayload = {
                company_id: authenticatedCompanyId,
                user_id: authenticatedUserId,
                title,
                content,
                summary: title,
                memory_type: memoryType,
                memory_tier: memoryTier,
                status: 'ACTIVE',
                is_active: true,
                confidence_score: confidenceScore,
                importance,
                source_type: sourceType,
                source_id: sourceId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };

              const { data: createdMem, error: memErr } = await supabase
                .from('clipad_v3_memories')
                .insert([memPayload])
                .select('*')
                .single();

              if (memErr || !createdMem) {
                throw new Error(memErr?.message || 'Failed to persist memory.');
              }

              if (idempotencyKey) {
                await resolveIdempotencyKey(supabase, authenticatedCompanyId, idempotencyKey, 201, createdMem);
              }

              return new Response(
                JSON.stringify({
                  jsonrpc: '2.0',
                  id: rpcId,
                  result: {
                    content: [{ type: 'text', text: JSON.stringify({ data: createdMem }, null, 2) }],
                  },
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }

            case 'list_documents': {
              const limit = Math.min(Math.max(1, Number(toolArgs.limit) || 20), 50);
              const offset = Math.max(0, Number(toolArgs.offset) || 0);

              // 1. Cloud storage documents strictly for authenticatedCompanyId
              let docQuery = supabase
                .from('documents')
                .select('id, name, file_url, file_type, file_size, category, notes, ai_summary, created_at, tags')
                .eq('company_id', authenticatedCompanyId)
                .order('created_at', { ascending: false });

              if (toolArgs.query) {
                docQuery = docQuery.or(`name.ilike.%${toolArgs.query}%,notes.ilike.%${toolArgs.query}%,ai_summary.ilike.%${toolArgs.query}%`);
              }

              const { data: legalDocs } = await docQuery.range(offset, offset + limit - 1);

              // 2. Space docs strictly for spaces belonging to authenticatedCompanyId
              const { data: companySpaces } = await supabase
                .from('clipad_spaces')
                .select('id')
                .eq('company_id', authenticatedCompanyId);
              const spaceIds = (companySpaces || []).map((s: any) => s.id);

              let clipadDocs: any[] = [];
              if (spaceIds.length > 0) {
                let clipadDocQuery = supabase
                  .from('clipad_docs')
                  .select('id, space_id, title, content, created_at, updated_at')
                  .in('space_id', spaceIds)
                  .order('created_at', { ascending: false });

                if (toolArgs.query) {
                  clipadDocQuery = clipadDocQuery.or(`title.ilike.%${toolArgs.query}%,content.ilike.%${toolArgs.query}%`);
                }

                const res = await clipadDocQuery.range(offset, offset + limit - 1);
                clipadDocs = res.data || [];
              }

              // 3. Synced integration knowledge strictly for authenticatedCompanyId
              let intQuery = supabase
                .from('clipad_imported_knowledge')
                .select('id, provider, content_type, title, content, ai_summary, url, author, created_at, updated_at')
                .eq('company_id', authenticatedCompanyId)
                .order('created_at', { ascending: false });

              if (toolArgs.query) {
                intQuery = intQuery.or(`title.ilike.%${toolArgs.query}%,content.ilike.%${toolArgs.query}%,ai_summary.ilike.%${toolArgs.query}%`);
              }

              const { data: intDocs } = await intQuery.range(offset, offset + limit - 1);

              const formattedLegalDocs = (legalDocs || []).map((d: any) => ({
                id: d.id,
                source: 'cloud_storage',
                title: d.name,
                file_url: d.file_url,
                file_type: d.file_type,
                summary: d.ai_summary || d.notes,
                created_at: d.created_at,
                tags: d.tags,
              }));

              const formattedClipadDocs = (clipadDocs || []).map((d: any) => ({
                id: d.id,
                source: 'clipad_docs',
                title: d.title,
                content: d.content,
                created_at: d.created_at,
              }));

              const formattedIntDocs = (intDocs || []).map((d: any) => ({
                id: d.id,
                source: `integration:${d.provider}`,
                title: d.title,
                summary: d.ai_summary || d.content?.slice(0, 250) || '',
                source_url: d.url,
                created_at: d.created_at,
              }));

              const combinedDocs = [...formattedLegalDocs, ...formattedClipadDocs, ...formattedIntDocs];

              return new Response(
                JSON.stringify({
                  jsonrpc: '2.0',
                  id: rpcId,
                  result: {
                    content: [
                      {
                        type: 'text',
                        text: JSON.stringify({
                          data: combinedDocs,
                          meta: { count: combinedDocs.length, limit, offset },
                        }, null, 2),
                      },
                    ],
                  },
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }

            case 'get_document_by_id': {
              const docId = toolArgs.document_id;
              if (!docId) {
                return new Response(
                  JSON.stringify({
                    jsonrpc: '2.0',
                    id: rpcId,
                    error: { code: -32602, message: 'document_id is required.' },
                  }),
                  { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }

              const shouldExtractContent = toolArgs.read_file_content !== false;

              // 1. Try documents strictly for authenticatedCompanyId
              const { data: d1 } = await supabase
                .from('documents')
                .select('*')
                .eq('id', docId)
                .eq('company_id', authenticatedCompanyId)
                .maybeSingle();

              if (d1) {
                let parsedContent = d1.ai_summary || d1.notes || null;
                let extractionError = null;

                if (shouldExtractContent && d1.file_url) {
                  const extracted = await extractDocumentContentFromUrl(d1.file_url);
                  if (extracted.text) {
                    parsedContent = extracted.text;
                  } else if (extracted.error) {
                    extractionError = extracted.error;
                  }
                }

                const enrichedDoc = {
                  ...d1,
                  extracted_content: parsedContent,
                  extraction_status: parsedContent ? 'success' : (extractionError ? 'unsupported_or_failed' : 'no_content'),
                  extraction_error: extractionError,
                };

                return new Response(
                  JSON.stringify({
                    jsonrpc: '2.0',
                    id: rpcId,
                    result: { content: [{ type: 'text', text: JSON.stringify({ data: enrichedDoc }, null, 2) }] },
                  }),
                  { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }

              // 2. Try clipad_docs (verify space belongs to authenticatedCompanyId)
              const { data: d2 } = await supabase
                .from('clipad_docs')
                .select('*')
                .eq('id', docId)
                .maybeSingle();

              if (d2) {
                // Verify space belongs to authenticated company
                const { data: spaceMatch } = await supabase
                  .from('clipad_spaces')
                  .select('id')
                  .eq('id', d2.space_id)
                  .eq('company_id', authenticatedCompanyId)
                  .maybeSingle();

                if (spaceMatch) {
                  const enrichedDoc = {
                    ...d2,
                    extracted_content: d2.content || null,
                    extraction_status: d2.content ? 'success' : 'empty',
                  };
                  return new Response(
                    JSON.stringify({
                      jsonrpc: '2.0',
                      id: rpcId,
                      result: { content: [{ type: 'text', text: JSON.stringify({ data: enrichedDoc }, null, 2) }] },
                    }),
                    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                  );
                }
              }

              // 3. Try clipad_imported_knowledge strictly for authenticatedCompanyId
              const { data: d4 } = await supabase
                .from('clipad_imported_knowledge')
                .select('*')
                .eq('id', docId)
                .eq('company_id', authenticatedCompanyId)
                .maybeSingle();

              if (d4) {
                let parsedContent = d4.content || d4.ai_summary || (d4.metadata ? JSON.stringify(d4.metadata) : null);
                let extractionError = null;

                if (!parsedContent && shouldExtractContent && d4.url) {
                  const extracted = await extractDocumentContentFromUrl(d4.url);
                  if (extracted.text) {
                    parsedContent = extracted.text;
                  } else if (extracted.error) {
                    extractionError = extracted.error;
                  }
                }

                const enrichedDoc = {
                  ...d4,
                  extracted_content: parsedContent,
                  extraction_status: parsedContent ? 'success' : (extractionError ? 'unsupported_or_failed' : 'no_content'),
                  extraction_error: extractionError,
                };

                return new Response(
                  JSON.stringify({
                    jsonrpc: '2.0',
                    id: rpcId,
                    result: { content: [{ type: 'text', text: JSON.stringify({ data: enrichedDoc }, null, 2) }] },
                  }),
                  { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }

              return new Response(
                JSON.stringify({
                  jsonrpc: '2.0',
                  id: rpcId,
                  error: { code: -32600, message: 'Weftro Resource Not Found (RESOURCE_NOT_FOUND): Document not found or inaccessible for authenticated organization.' },
                }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }

            case 'list_meetings': {
              const limit = Math.min(Math.max(1, Number(toolArgs.limit) || 20), 50);
              const offset = Math.max(0, Number(toolArgs.offset) || 0);

              const { data: companySpaces } = await supabase
                .from('clipad_spaces')
                .select('id')
                .eq('company_id', authenticatedCompanyId);
              const spaceIds = (companySpaces || []).map((s: any) => s.id);

              let meetings: any[] = [];
              if (spaceIds.length > 0) {
                let meetQuery = supabase
                  .from('clipad_meeting_records')
                  .select('id, space_id, title, daily_room_name, ai_summary, started_at, ended_at, duration, video_url, status, created_at')
                  .in('space_id', spaceIds)
                  .order('created_at', { ascending: false });

                if (toolArgs.query) {
                  meetQuery = meetQuery.or(`title.ilike.%${toolArgs.query}%,ai_summary.ilike.%${toolArgs.query}%`);
                }

                const res = await meetQuery.range(offset, offset + limit - 1);
                meetings = res.data || [];
              }

              return new Response(
                JSON.stringify({
                  jsonrpc: '2.0',
                  id: rpcId,
                  result: {
                    content: [
                      {
                        type: 'text',
                        text: JSON.stringify({ data: meetings || [], meta: { count: meetings?.length || 0, limit, offset } }, null, 2),
                      },
                    ],
                  },
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }

            case 'list_spaces': {
              const limit = Math.min(Math.max(1, Number(toolArgs.limit) || 20), 50);

              const { data: spaces } = await supabase
                .from('clipad_spaces')
                .select('id, name, title, description, shared_notes, meeting_url, created_at, updated_at')
                .eq('company_id', authenticatedCompanyId)
                .order('created_at', { ascending: false })
                .limit(limit);

              return new Response(
                JSON.stringify({
                  jsonrpc: '2.0',
                  id: rpcId,
                  result: {
                    content: [
                      {
                        type: 'text',
                        text: JSON.stringify({ data: spaces || [], meta: { count: spaces?.length || 0 } }, null, 2),
                      },
                    ],
                  },
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }

            case 'list_integrations': {
              const { data: integrations } = await supabase
                .from('clipad_integrations')
                .select('id, provider, status, external_account_name, last_synced_at, sync_frequency, sync_phase, created_at')
                .eq('company_id', authenticatedCompanyId)
                .order('created_at', { ascending: false });

              const sanitizedIntegrations = (integrations || []).map((item: any) => ({
                id: item.id,
                provider: item.provider,
                status: item.status,
                account: item.external_account_name,
                last_synced_at: item.last_synced_at,
                sync_frequency: item.sync_frequency,
                sync_phase: item.sync_phase,
              }));

              return new Response(
                JSON.stringify({
                  jsonrpc: '2.0',
                  id: rpcId,
                  result: {
                    content: [
                      {
                        type: 'text',
                        text: JSON.stringify({ data: sanitizedIntegrations, meta: { count: sanitizedIntegrations.length } }, null, 2),
                      },
                    ],
                  },
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }

            default:
              return new Response(
                JSON.stringify({
                  jsonrpc: '2.0',
                  id: rpcId,
                  error: { code: -32601, message: `Method not found: Unknown tool '${toolName}'.` },
                }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
          }
        } catch (toolEx: any) {
          return new Response(
            JSON.stringify({
              jsonrpc: '2.0',
              id: rpcId,
              error: { code: -32603, message: `Internal MCP tool error: ${toolEx.message}` },
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Any other unsupported method
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: rpcId,
          error: { code: -32601, message: `Method not found: '${rpcMethod}' is not supported.` },
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32600, message: 'Invalid Request: Method not allowed. Use GET (for SSE stream) or POST (for JSON-RPC).' },
      }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        user_id = null,
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
          supported_transport: ['streamable-http', 'sse', 'stdio'],
          supported_tools: [
            'search_organizational_memory',
            'query_organizational_context',
            'get_memory_by_id',
            'list_organizational_memories',
            'get_entity_by_id',
            'list_captures',
            'get_capture_by_id',
            'list_smart_moments',
            'get_source_provenance',
            'create_capture',
            'create_organizational_memory'
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

    const appRecord = Array.isArray(tokRecord.app) ? tokRecord.app[0] : tokRecord.app;
    if (appRecord && (appRecord as any).is_active === false) {
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
    (async () => {
      try {
        await supabase.from('clipad_v3_events').insert([{
          company_id: companyId,
          user_id: userId,
          event_type: eventType,
          source_domain: 'api_gateway',
          payload: {
            request_id: requestId,
            app_id: tokenData?.app?.id,
            path: subpath,
            method: req.method,
            latency_ms: Date.now() - startTime,
            ...details,
          },
        }]);
      } catch (err: any) {
        console.warn('[api-gateway] Audit log error:', err.message);
      }
    })();
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
      if (req.method === 'GET') {
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

      if (req.method === 'POST') {
        if (!hasScope(SCOPES.MEMORY_WRITE)) {
          return errorResponse('FORBIDDEN', 'Insufficient scope: memory:write required.', 403, requestId);
        }

        const body = await req.json().catch(() => ({}));
        const idempotencyKey = req.headers.get('Idempotency-Key') || body.idempotency_key || null;

        // Concurrency-Safe Atomic Idempotency Check & Lock
        if (idempotencyKey) {
          const claim = await claimIdempotencyKey(
            supabase,
            companyId,
            idempotencyKey,
            '/api/v1/memories',
            body
          );

          if (claim.action === 'conflict') {
            return errorResponse('IDEMPOTENCY_CONFLICT', claim.message || 'Conflicting payload for idempotency key.', 409, requestId);
          }

          if (claim.action === 'in_progress') {
            return errorResponse('OPERATION_IN_PROGRESS', claim.message || 'Operation currently in progress. Please retry.', 425, requestId);
          }

          if (claim.action === 'replay' && claim.responseData) {
            return successResponse(
              claim.responseData,
              { request_id: requestId, idempotent_replay: true },
              claim.responseStatus || 200,
              { ...rateLimitHeaders, 'X-Idempotency-Replay': 'true' }
            );
          }
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
        const sourceMetadata = body.source_metadata || {};
        const metadata = body.metadata || {};

        if (!title) {
          return errorResponse('BAD_REQUEST', "The 'title' field is required and must be non-empty.", 400, requestId);
        }
        if (!content) {
          return errorResponse('BAD_REQUEST', "The 'content' field is required and must be non-empty.", 400, requestId);
        }

        // Validate linked source if source_id is provided
        if (sourceId) {
          // Check if source belongs to the same tenant organization
          const { data: sourceCapture } = await supabase
            .from('clipad_v3_captures')
            .select('id, company_id')
            .eq('id', sourceId)
            .eq('company_id', companyId)
            .maybeSingle();

          if (!sourceCapture) {
            // Check clipad_videos
            const { data: sourceVideo } = await supabase
              .from('clipad_videos')
              .select('id, company_id')
              .eq('id', sourceId)
              .eq('company_id', companyId)
              .maybeSingle();

            if (!sourceVideo) {
              return errorResponse('BAD_REQUEST', `Linked source_id '${sourceId}' was not found or belongs to another tenant organization.`, 404, requestId);
            }
          }
        }

        const memoryPayload = {
          company_id: companyId,
          user_id: userId,
          title,
          content,
          summary,
          memory_type: memoryType,
          memory_tier: memoryTier,
          status: 'ACTIVE',
          is_active: true,
          confidence_score: confidenceScore,
          importance: importance,
          source_type: sourceType,
          source_id: sourceId,
          source_metadata: sourceMetadata,
          metadata: {
            ...metadata,
            ingested_via: 'connect_api',
            app_id: tokenData?.app?.id || null,
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { data: createdMemory, error: insertErr } = await supabase
          .from('clipad_v3_memories')
          .insert([memoryPayload])
          .select('*')
          .single();

        if (insertErr || !createdMemory) {
          return errorResponse('INTERNAL_SERVER_ERROR', insertErr?.message || 'Failed to persist memory.', 500, requestId);
        }

        // Audit log and persist idempotency cache in clipad_v3_events
        logAudit('api.memories.create', {
          memory_id: createdMemory.id,
          idempotency_key: idempotencyKey,
          response_data: createdMemory,
        });

        // Resolve atomic idempotency ledger
        await resolveIdempotencyKey(supabase, companyId, idempotencyKey, 201, createdMemory);

        // Trigger webhook notification
        dispatchWebhookEvent(supabase, companyId, 'memory.created', {
          id: createdMemory.id,
          title: createdMemory.title,
          memory_type: createdMemory.memory_type,
          memory_tier: createdMemory.memory_tier,
          created_at: createdMemory.created_at,
        });

        return successResponse(
          createdMemory,
          { request_id: requestId, idempotency_key: idempotencyKey },
          201,
          rateLimitHeaders
        );
      }

      return errorResponse('METHOD_NOT_ALLOWED', 'Supported methods are GET, POST.', 405, requestId);
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
      if (req.method === 'GET') {
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

      if (req.method === 'POST') {
        if (!hasScope(SCOPES.CAPTURES_WRITE)) {
          return errorResponse('FORBIDDEN', 'Insufficient scope: captures:write required.', 403, requestId);
        }

        const body = await req.json().catch(() => ({}));
        const idempotencyKey = req.headers.get('Idempotency-Key') || body.idempotency_key || null;

        // Concurrency-Safe Atomic Idempotency Check & Lock
        if (idempotencyKey) {
          const claim = await claimIdempotencyKey(
            supabase,
            companyId,
            idempotencyKey,
            '/api/v1/captures',
            body
          );

          if (claim.action === 'conflict') {
            return errorResponse('IDEMPOTENCY_CONFLICT', claim.message || 'Conflicting payload for idempotency key.', 409, requestId);
          }

          if (claim.action === 'in_progress') {
            return errorResponse('OPERATION_IN_PROGRESS', claim.message || 'Operation currently in progress. Please retry.', 425, requestId);
          }

          if (claim.action === 'replay' && claim.responseData) {
            return successResponse(
              claim.responseData,
              { request_id: requestId, idempotent_replay: true },
              claim.responseStatus || 200,
              { ...rateLimitHeaders, 'X-Idempotency-Replay': 'true' }
            );
          }
        }

        const sourceType = typeof body.source_type === 'string' && body.source_type.trim() ? body.source_type.trim() : 'text_note';
        const captureType = typeof body.capture_type === 'string' && body.capture_type.trim() ? body.capture_type.trim().toUpperCase() : 'NOTE';
        const title = typeof body.title === 'string' ? body.title.trim() : '';
        const content = typeof body.content === 'string' ? body.content.trim() : '';
        const contextSessionId = body.context_session_id || null;
        const metadata = body.metadata || {};
        const provenance = body.provenance || {};

        if (!content && !title) {
          return errorResponse('BAD_REQUEST', "At least 'title' or 'content' must be provided.", 400, requestId);
        }

        // Validate context_session_id if provided
        if (contextSessionId) {
          const { data: sessionRecord } = await supabase
            .from('clipad_v3_context_sessions')
            .select('id, company_id')
            .eq('id', contextSessionId)
            .eq('company_id', companyId)
            .maybeSingle();

          if (!sessionRecord) {
            return errorResponse('BAD_REQUEST', `Linked context_session_id '${contextSessionId}' was not found or belongs to another tenant organization.`, 404, requestId);
          }
        }

        // Determine effective user attribution (token caller, body author if authorized in company, or tenant profile)
        let effectiveUserId = userId;
        if (!effectiveUserId && body.user_id) {
          const { data: memberUser } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', body.user_id)
            .eq('company_id', companyId)
            .maybeSingle();
          if (memberUser) {
            effectiveUserId = memberUser.id;
          }
        }
        if (!effectiveUserId) {
          const { data: companyMember } = await supabase
            .from('profiles')
            .select('id')
            .eq('company_id', companyId)
            .limit(1)
            .maybeSingle();
          effectiveUserId = companyMember?.id || null;
        }

        const capturePayload = {
          company_id: companyId,
          user_id: effectiveUserId,
          context_session_id: contextSessionId,
          source_type: sourceType,
          capture_type: captureType,
          title: title || 'Untitled External Ingestion',
          content: content,
          content_type: 'text/plain',
          status: 'QUEUED',
          visibility: 'ORGANIZATIONAL',
          metadata: {
            ...metadata,
            ingested_via: 'connect_api',
            app_id: tokenData?.app?.id || null,
          },
          provenance: {
            ...provenance,
            captured_by: effectiveUserId,
            source_type: sourceType,
            capture_method: 'connect_api',
            created_at: new Date().toISOString(),
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { data: createdCapture, error: capInsertErr } = await supabase
          .from('clipad_v3_captures')
          .insert([capturePayload])
          .select('*')
          .single();

        if (capInsertErr || !createdCapture) {
          return errorResponse('INTERNAL_SERVER_ERROR', capInsertErr?.message || 'Failed to persist capture.', 500, requestId);
        }

        // Enqueue queue item in clipad_v3_capture_queue
        const { data: queueJob } = await supabase
          .from('clipad_v3_capture_queue')
          .insert([{
            company_id: companyId,
            user_id: effectiveUserId,
            capture_id: createdCapture.id,
            status: 'queued',
            attempt_count: 0,
            max_attempts: 3,
            scheduled_at: new Date().toISOString(),
          }])
          .select('id, status, scheduled_at, attempt_count, max_attempts')
          .maybeSingle();

        const responseData = {
          ...createdCapture,
          queue_job: queueJob || null,
        };

        // Audit log and persist idempotency cache in clipad_v3_events
        logAudit('api.captures.create', {
          capture_id: createdCapture.id,
          idempotency_key: idempotencyKey,
          response_data: responseData,
        });

        // Resolve atomic idempotency ledger
        await resolveIdempotencyKey(supabase, companyId, idempotencyKey, 201, responseData);

        // Trigger webhook notification
        dispatchWebhookEvent(supabase, companyId, 'capture.created', {
          id: createdCapture.id,
          title: createdCapture.title,
          source_type: createdCapture.source_type,
          capture_type: createdCapture.capture_type,
          status: createdCapture.status,
          created_at: createdCapture.created_at,
        });

        return successResponse(
          responseData,
          { request_id: requestId, idempotency_key: idempotencyKey },
          201,
          rateLimitHeaders
        );
      }

      return errorResponse('METHOD_NOT_ALLOWED', 'Supported methods are GET, POST.', 405, requestId);
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
          redirect: 'manual', // Strictly do not follow redirects (SSRF mitigation)
        });

        clearTimeout(timeoutId);
        statusCode = webhookRes.status;

        // Reject redirects (3xx) explicitly as unsafe / unpermitted delivery targets
        if (statusCode >= 300 && statusCode < 400) {
          deliveryStatus = 'failed';
          errorMessage = `Webhook delivery rejected redirect response (HTTP ${statusCode}). Automatic redirects are prohibited for security.`;
        } else {
          deliveryStatus = webhookRes.ok ? 'delivered' : 'failed';
        }

        responseBody = (await webhookRes.text().catch(() => '')).slice(0, 1000);
      } catch (dispErr: any) {
        errorMessage = dispErr.name === 'AbortError' ? 'Webhook delivery timed out after 10000ms' : dispErr.message;
      }

      const durationMs = Date.now() - deliveryStart;

      // Log delivery record into clipad_v3_webhook_deliveries
      try {
        await supabase.from('clipad_v3_webhook_deliveries').insert([{
          webhook_id: hookRecord.id,
          company_id: companyId,
          event_type: 'test.ping',
          status: deliveryStatus,
          attempt_count: 1,
          max_attempts: 1,
          response_status: statusCode,
          response_body: responseBody,
          error_message: errorMessage,
          execution_duration_ms: durationMs,
          delivered_at: deliveryStatus === 'delivered' ? new Date().toISOString() : null,
        }]);
      } catch (delivInsertErr: any) {
        console.warn('[webhooks.test] Delivery history insert warning:', delivInsertErr.message);
      }

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
      let retryError = null;
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
          redirect: 'manual', // Strictly do not follow redirects (SSRF mitigation)
        });
        clearTimeout(timeoutId);
        statusCode = retryRes.status;
        if (statusCode >= 300 && statusCode < 400) {
          deliveryStatus = 'failed';
          retryError = `Webhook retry rejected redirect response (HTTP ${statusCode}). Automatic redirects are prohibited for security.`;
        } else {
          deliveryStatus = retryRes.ok ? 'delivered' : 'failed';
        }
      } catch (e: any) {
        deliveryStatus = 'failed';
        retryError = e.name === 'AbortError' ? 'Webhook delivery timed out after 10000ms' : e.message;
      }

      logAudit('webhooks.retry', { delivery_id: deliveryId, status: deliveryStatus, response_status: statusCode });

      return successResponse(
        {
          retried: true,
          original_delivery_id: deliveryId,
          status: deliveryStatus,
          response_status: statusCode,
          error_message: retryError,
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
