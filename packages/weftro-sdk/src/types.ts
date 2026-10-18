export interface WeftroClientOptions {
  /** API token (e.g. cpd_... or Supabase Auth JWT) */
  apiKey: string;
  /** Base URL of the Connect Gateway (defaults to production gateway) */
  baseUrl?: string;
  /** Request timeout in milliseconds (defaults to 30000ms) */
  timeoutMs?: number;
  /** Custom fetch implementation (defaults to globalThis.fetch) */
  fetch?: typeof fetch;
  /** Custom user-agent header prefix */
  userAgent?: string;
}

export interface RequestOptions {
  /** Optional idempotency key for mutations (POST /captures, POST /memories) */
  idempotencyKey?: string;
  /** Abort signal to cancel the request */
  signal?: AbortSignal;
  /** Per-request timeout override in milliseconds */
  timeoutMs?: number;
}

export interface ApiResponse<T> {
  data: T;
  meta: ResponseMeta;
}

export interface ResponseMeta {
  api_version: string;
  timestamp: string;
  request_id?: string;
  count?: number;
  total?: number;
  limit?: number;
  offset?: number;
  query?: string;
  idempotent_replay?: boolean;
  [key: string]: unknown;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  request_id?: string;
  details?: unknown;
}

// -------------------------------------------------------------
// Capabilities & Health
// -------------------------------------------------------------
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unavailable';
  service: string;
  version: string;
  uptime_check: string;
}

export interface CapabilitiesInfo {
  api_version: string;
  authentication: string[];
  supported_scopes: string[];
  endpoints: Array<{
    path: string;
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    scope: string;
    description: string;
  }>;
}

// -------------------------------------------------------------
// Search & Intelligence
// -------------------------------------------------------------
export interface SearchParams {
  query: string;
  limit?: number;
  offset?: number;
}

export interface MemoryResult {
  id: string;
  title: string;
  content: string;
  summary?: string;
  memory_type: string;
  memory_tier: string;
  confidence: number;
  provenance: {
    source_type?: string;
    source_id?: string | null;
    created_at?: string;
    last_updated_at?: string;
  };
}

export interface ContextQueryParams {
  sessionId: string;
  limit?: number;
  offset?: number;
}

export interface ContextQueryResult {
  session: {
    id: string;
    title: string;
    status: string;
    description?: string;
  };
  captures: Array<{
    id: string;
    title: string;
    content: string;
    status: string;
    capture_type: string;
  }>;
}

// -------------------------------------------------------------
// Organizational Memories
// -------------------------------------------------------------
export interface ListMemoriesParams {
  limit?: number;
  offset?: number;
  tier?: 'personal' | 'team' | 'organizational';
  type?: string;
}

export interface CreateMemoryParams {
  title: string;
  content: string;
  summary?: string;
  memory_type?: 'FACT' | 'DECISION' | 'PATTERN' | 'PROCEDURE';
  memory_tier?: 'personal' | 'team' | 'organizational';
  importance?: number;
  confidence_score?: number;
  source_type?: string;
  source_id?: string | null;
  source_metadata?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface MemoryRecord {
  id: string;
  company_id: string;
  user_id?: string | null;
  title: string;
  content: string;
  summary?: string;
  memory_type: string;
  memory_tier: string;
  status: string;
  confidence_score: number;
  importance: number;
  source_type: string;
  source_id?: string | null;
  created_at: string;
  updated_at: string;
}

// -------------------------------------------------------------
// Captures Ingestion & Queue
// -------------------------------------------------------------
export interface ListCapturesParams {
  limit?: number;
  offset?: number;
}

export interface CreateCaptureParams {
  title?: string;
  content?: string;
  source_type?: string;
  capture_type?: string;
  context_session_id?: string | null;
  metadata?: Record<string, unknown>;
  provenance?: Record<string, unknown>;
}

export interface CaptureRecord {
  id: string;
  company_id: string;
  user_id?: string | null;
  context_session_id?: string | null;
  source_type: string;
  capture_type: string;
  title: string;
  content?: string;
  status: 'QUEUED' | 'PROCESSING' | 'PROCESSED' | 'FAILED';
  visibility: string;
  created_at: string;
  queue_job?: {
    id: string;
    status: string;
    scheduled_at: string;
    attempt_count: number;
    max_attempts: number;
  } | null;
}

export interface CaptureStatusRecord {
  id: string;
  status: string;
  processed_at?: string | null;
  queue_job?: {
    status: string;
    attempt_count: number;
    last_error_message?: string | null;
  } | null;
}

// -------------------------------------------------------------
// Knowledge Graph & Smart Moments
// -------------------------------------------------------------
export interface EntityRecord {
  id: string;
  company_id: string;
  name: string;
  entity_type: string;
  description?: string;
  relationships: Array<{
    target_id: string;
    relation_type: string;
    weight: number;
  }>;
}

export interface ListSmartMomentsParams {
  type?: 'DECISION' | 'ACTION_ITEM' | 'KEY_INSIGHT';
  limit?: number;
  offset?: number;
}

export interface SmartMomentRecord {
  id: string;
  title: string;
  content: string;
  moment_type: string;
  confidence: number;
  status: string;
  created_at: string;
}

export interface SourceRecord {
  source_id: string;
  type: string;
  details: Record<string, unknown>;
}

// -------------------------------------------------------------
// Developer Apps & Scoped Tokens
// -------------------------------------------------------------
export interface DeveloperApp {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  client_id: string;
  redirect_uris: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAppParams {
  name: string;
  description?: string;
  redirect_uris?: string[];
}

export interface CreateAppResult extends DeveloperApp {
  client_secret: string; // One-time unhashed secret
}

export interface RotateSecretResult {
  id: string;
  client_id: string;
  client_secret: string;
  rotated_at: string;
}

export interface IssueTokenParams {
  app_id: string;
  scopes: string[];
  expires_in_days?: number;
  rate_limit_rpm?: number;
}

export interface IssuedTokenResult {
  id: string;
  token: string; // Plain token returned once (cpd_...)
  scopes: string[];
  expires_at?: string | null;
  rate_limit_rpm: number;
  created_at: string;
}

export interface TokenRecord {
  id: string;
  app_id: string;
  scopes: string[];
  expires_at?: string | null;
  rate_limit_rpm: number;
  created_at: string;
}

// -------------------------------------------------------------
// Webhooks Engine
// -------------------------------------------------------------
export interface WebhookSubscription {
  id: string;
  company_id: string;
  endpoint_url: string;
  events: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateWebhookParams {
  endpoint_url: string;
  events: Array<'capture.created' | 'capture.processed' | 'memory.created' | 'memory.updated' | 'smart_moment.detected'>;
}

export interface CreateWebhookResult extends WebhookSubscription {
  secret: string; // Plain signing secret (whsec_...)
}

export interface WebhookDeliveryRecord {
  id: string;
  webhook_id: string;
  event_type: string;
  status: 'delivered' | 'failed';
  response_status?: number;
  duration_ms: number;
  created_at: string;
}
