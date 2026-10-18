import { HttpClient } from './http.js';
import type {
  ApiResponse,
  CapabilitiesInfo,
  CaptureRecord,
  CaptureStatusRecord,
  ContextQueryParams,
  ContextQueryResult,
  CreateAppParams,
  CreateAppResult,
  CreateCaptureParams,
  CreateMemoryParams,
  CreateWebhookParams,
  CreateWebhookResult,
  DeveloperApp,
  EntityRecord,
  HealthStatus,
  IssuedTokenResult,
  IssueTokenParams,
  ListCapturesParams,
  ListMemoriesParams,
  ListSmartMomentsParams,
  MemoryRecord,
  MemoryResult,
  RequestOptions,
  RotateSecretResult,
  SearchParams,
  SmartMomentRecord,
  SourceRecord,
  TokenRecord,
  WebhookDeliveryRecord,
  WebhookSubscription,
  WeftroClientOptions,
} from './types.js';

export class WeftroClient {
  private readonly http: HttpClient;

  constructor(options: WeftroClientOptions) {
    this.http = new HttpClient(options);
  }

  // ══════════════════════════════════════════════════════════════
  // SYSTEM & DISCOVERY
  // ══════════════════════════════════════════════════════════════

  /** GET /api/v1/health - System health status */
  async health(options?: RequestOptions): Promise<ApiResponse<HealthStatus>> {
    return this.http.request<HealthStatus>('/api/v1/health', 'GET', undefined, options);
  }

  /** GET /api/v1/capabilities - Discover supported scopes, methods, and routes */
  async capabilities(options?: RequestOptions): Promise<ApiResponse<CapabilitiesInfo>> {
    return this.http.request<CapabilitiesInfo>('/api/v1/capabilities', 'GET', undefined, options);
  }

  // ══════════════════════════════════════════════════════════════
  // GROUNDED SEARCH & CONTEXT
  // ══════════════════════════════════════════════════════════════

  /** POST /api/v1/search - Grounded search across authorized organizational memories */
  async search(params: SearchParams, options?: RequestOptions): Promise<ApiResponse<MemoryResult[]>> {
    return this.http.request<MemoryResult[]>('/api/v1/search', 'POST', params, options);
  }

  readonly context = {
    /** POST /api/v1/context/query - Retrieve context session hierarchy and linked captures */
    query: async (params: ContextQueryParams, options?: RequestOptions): Promise<ApiResponse<ContextQueryResult>> => {
      return this.http.request<ContextQueryResult>('/api/v1/context/query', 'POST', {
        session_id: params.sessionId,
        limit: params.limit,
        offset: params.offset,
      }, options);
    },
  };

  // ══════════════════════════════════════════════════════════════
  // ORGANIZATIONAL MEMORIES
  // ══════════════════════════════════════════════════════════════

  readonly memories = {
    /** GET /api/v1/memories - List organizational memories with optional tier/type filters */
    list: async (params?: ListMemoriesParams, options?: RequestOptions): Promise<ApiResponse<MemoryRecord[]>> => {
      const q = new URLSearchParams();
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.offset) q.set('offset', String(params.offset));
      if (params?.tier) q.set('tier', params.tier);
      if (params?.type) q.set('type', params.type);
      const query = q.toString() ? `?${q.toString()}` : '';
      return this.http.request<MemoryRecord[]>(`/api/v1/memories${query}`, 'GET', undefined, options);
    },

    /** GET /api/v1/memories/:id - Retrieve a single organizational memory by ID */
    get: async (id: string, options?: RequestOptions): Promise<ApiResponse<MemoryRecord>> => {
      return this.http.request<MemoryRecord>(`/api/v1/memories/${encodeURIComponent(id)}`, 'GET', undefined, options);
    },

    /** POST /api/v1/memories - Create verified organizational memory with provenance */
    create: async (params: CreateMemoryParams, options?: RequestOptions): Promise<ApiResponse<MemoryRecord>> => {
      return this.http.request<MemoryRecord>('/api/v1/memories', 'POST', params, options);
    },
  };

  // ══════════════════════════════════════════════════════════════
  // CAPTURES & INGESTION
  // ══════════════════════════════════════════════════════════════

  readonly captures = {
    /** GET /api/v1/captures - List tenant captures with pagination */
    list: async (params?: ListCapturesParams, options?: RequestOptions): Promise<ApiResponse<CaptureRecord[]>> => {
      const q = new URLSearchParams();
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.offset) q.set('offset', String(params.offset));
      const query = q.toString() ? `?${q.toString()}` : '';
      return this.http.request<CaptureRecord[]>(`/api/v1/captures${query}`, 'GET', undefined, options);
    },

    /** GET /api/v1/captures/:id - Retrieve full capture record and metadata */
    get: async (id: string, options?: RequestOptions): Promise<ApiResponse<CaptureRecord>> => {
      return this.http.request<CaptureRecord>(`/api/v1/captures/${encodeURIComponent(id)}`, 'GET', undefined, options);
    },

    /** GET /api/v1/captures/:id/status - Retrieve processing state and queue worker progress */
    getStatus: async (id: string, options?: RequestOptions): Promise<ApiResponse<CaptureStatusRecord>> => {
      return this.http.request<CaptureStatusRecord>(`/api/v1/captures/${encodeURIComponent(id)}/status`, 'GET', undefined, options);
    },

    /** POST /api/v1/captures - Ingest external content into the capture queue pipeline */
    create: async (params: CreateCaptureParams, options?: RequestOptions): Promise<ApiResponse<CaptureRecord>> => {
      return this.http.request<CaptureRecord>('/api/v1/captures', 'POST', params, options);
    },
  };

  // ══════════════════════════════════════════════════════════════
  // KNOWLEDGE GRAPH & SMART MOMENTS
  // ══════════════════════════════════════════════════════════════

  readonly entities = {
    /** GET /api/v1/entities/:id - Retrieve an organizational entity node with relations */
    get: async (id: string, options?: RequestOptions): Promise<ApiResponse<EntityRecord>> => {
      return this.http.request<EntityRecord>(`/api/v1/entities/${encodeURIComponent(id)}`, 'GET', undefined, options);
    },
  };

  readonly smartMoments = {
    /** GET /api/v1/smart-moments - List meeting and video insight moments */
    list: async (params?: ListSmartMomentsParams, options?: RequestOptions): Promise<ApiResponse<SmartMomentRecord[]>> => {
      const q = new URLSearchParams();
      if (params?.type) q.set('type', params.type);
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.offset) q.set('offset', String(params.offset));
      const query = q.toString() ? `?${q.toString()}` : '';
      return this.http.request<SmartMomentRecord[]>(`/api/v1/smart-moments${query}`, 'GET', undefined, options);
    },
  };

  readonly sources = {
    /** GET /api/v1/sources/:id - Resolve source provenance (video, capture, or transcript) */
    get: async (id: string, options?: RequestOptions): Promise<ApiResponse<SourceRecord>> => {
      return this.http.request<SourceRecord>(`/api/v1/sources/${encodeURIComponent(id)}`, 'GET', undefined, options);
    },
  };

  // ══════════════════════════════════════════════════════════════
  // DEVELOPER APPLICATIONS
  // ══════════════════════════════════════════════════════════════

  readonly apps = {
    /** GET /api/v1/apps - List registered developer applications */
    list: async (options?: RequestOptions): Promise<ApiResponse<DeveloperApp[]>> => {
      return this.http.request<DeveloperApp[]>('/api/v1/apps', 'GET', undefined, options);
    },

    /** GET /api/v1/apps/:id - Retrieve specific developer application details */
    get: async (id: string, options?: RequestOptions): Promise<ApiResponse<DeveloperApp>> => {
      return this.http.request<DeveloperApp>(`/api/v1/apps/${encodeURIComponent(id)}`, 'GET', undefined, options);
    },

    /** POST /api/v1/apps - Register a new application with client_id and one-time secret */
    create: async (params: CreateAppParams, options?: RequestOptions): Promise<ApiResponse<CreateAppResult>> => {
      return this.http.request<CreateAppResult>('/api/v1/apps', 'POST', params, options);
    },

    /** PATCH /api/v1/apps/:id - Update application name, description, or redirect URIs */
    update: async (id: string, updates: Partial<CreateAppParams> & { is_active?: boolean }, options?: RequestOptions): Promise<ApiResponse<DeveloperApp>> => {
      return this.http.request<DeveloperApp>(`/api/v1/apps/${encodeURIComponent(id)}`, 'PATCH', updates, options);
    },

    /** DELETE /api/v1/apps/:id - Delete an application and revoke associated tokens */
    delete: async (id: string, options?: RequestOptions): Promise<ApiResponse<{ deleted: boolean; id: string }>> => {
      return this.http.request<{ deleted: boolean; id: string }>(`/api/v1/apps/${encodeURIComponent(id)}`, 'DELETE', undefined, options);
    },

    /** POST /api/v1/apps/:id/rotate-secret - Rotate client secret (immediately invalidates old secret) */
    rotateSecret: async (id: string, options?: RequestOptions): Promise<ApiResponse<RotateSecretResult>> => {
      return this.http.request<RotateSecretResult>(`/api/v1/apps/${encodeURIComponent(id)}/rotate-secret`, 'POST', undefined, options);
    },
  };

  // ══════════════════════════════════════════════════════════════
  // SCOPED TOKENS LIFECYCLE
  // ══════════════════════════════════════════════════════════════

  readonly tokens = {
    /** GET /api/v1/tokens - List issued scoped tokens */
    list: async (options?: RequestOptions): Promise<ApiResponse<TokenRecord[]>> => {
      return this.http.request<TokenRecord[]>('/api/v1/tokens', 'GET', undefined, options);
    },

    /** POST /api/v1/tokens - Issue a new scoped access token (cpd_...) */
    issue: async (params: IssueTokenParams, options?: RequestOptions): Promise<ApiResponse<IssuedTokenResult>> => {
      return this.http.request<IssuedTokenResult>('/api/v1/tokens', 'POST', params, options);
    },

    /** POST /api/v1/tokens/:id/revoke - Revoke active API token */
    revoke: async (id: string, options?: RequestOptions): Promise<ApiResponse<{ revoked: boolean; id: string }>> => {
      return this.http.request<{ revoked: boolean; id: string }>(`/api/v1/tokens/${encodeURIComponent(id)}/revoke`, 'POST', undefined, options);
    },
  };

  // ══════════════════════════════════════════════════════════════
  // OUTBOUND WEBHOOKS ENGINE
  // ══════════════════════════════════════════════════════════════

  readonly webhooks = {
    /** GET /api/v1/webhooks - List organization webhook subscriptions */
    list: async (options?: RequestOptions): Promise<ApiResponse<WebhookSubscription[]>> => {
      return this.http.request<WebhookSubscription[]>('/api/v1/webhooks', 'GET', undefined, options);
    },

    /** GET /api/v1/webhooks/:id - Retrieve a single webhook subscription */
    get: async (id: string, options?: RequestOptions): Promise<ApiResponse<WebhookSubscription>> => {
      return this.http.request<WebhookSubscription>(`/api/v1/webhooks/${encodeURIComponent(id)}`, 'GET', undefined, options);
    },

    /** POST /api/v1/webhooks - Register a webhook subscription and receive plain signing secret */
    create: async (params: CreateWebhookParams, options?: RequestOptions): Promise<ApiResponse<CreateWebhookResult>> => {
      return this.http.request<CreateWebhookResult>('/api/v1/webhooks', 'POST', params, options);
    },

    /** PATCH /api/v1/webhooks/:id - Update webhook endpoint URL, events, or active state */
    update: async (id: string, updates: Partial<CreateWebhookParams> & { is_active?: boolean }, options?: RequestOptions): Promise<ApiResponse<WebhookSubscription>> => {
      return this.http.request<WebhookSubscription>(`/api/v1/webhooks/${encodeURIComponent(id)}`, 'PATCH', updates, options);
    },

    /** DELETE /api/v1/webhooks/:id - Delete a webhook subscription */
    delete: async (id: string, options?: RequestOptions): Promise<ApiResponse<{ deleted: boolean; id: string }>> => {
      return this.http.request<{ deleted: boolean; id: string }>(`/api/v1/webhooks/${encodeURIComponent(id)}`, 'DELETE', undefined, options);
    },

    /** POST /api/v1/webhooks/:id/rotate-secret - Rotate webhook signing secret */
    rotateSecret: async (id: string, options?: RequestOptions): Promise<ApiResponse<{ secret: string; rotated_at: string }>> => {
      return this.http.request<{ secret: string; rotated_at: string }>(`/api/v1/webhooks/${encodeURIComponent(id)}/rotate-secret`, 'POST', undefined, options);
    },

    /** POST /api/v1/webhooks/:id/test - Dispatch test event to subscription endpoint */
    test: async (id: string, options?: RequestOptions): Promise<ApiResponse<{ dispatched: boolean; event_id: string; delivery_status: string }>> => {
      return this.http.request<{ dispatched: boolean; event_id: string; delivery_status: string }>(`/api/v1/webhooks/${encodeURIComponent(id)}/test`, 'POST', undefined, options);
    },

    /** GET /api/v1/webhooks/:id/deliveries - List logged delivery attempts for subscription */
    listDeliveries: async (id: string, options?: RequestOptions): Promise<ApiResponse<WebhookDeliveryRecord[]>> => {
      return this.http.request<WebhookDeliveryRecord[]>(`/api/v1/webhooks/${encodeURIComponent(id)}/deliveries`, 'GET', undefined, options);
    },

    /** POST /api/v1/webhooks/deliveries/:id/retry - Trigger re-delivery attempt of failed webhook */
    retryDelivery: async (deliveryId: string, options?: RequestOptions): Promise<ApiResponse<{ retried: boolean; delivery_id: string }>> => {
      return this.http.request<{ retried: boolean; delivery_id: string }>(`/api/v1/webhooks/deliveries/${encodeURIComponent(deliveryId)}/retry`, 'POST', undefined, options);
    },
  };
}
