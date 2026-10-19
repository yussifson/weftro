import {
  WeftroApiError,
  WeftroAuthenticationError,
  WeftroForbiddenError,
  WeftroNotFoundError,
  WeftroRateLimitError,
  WeftroTimeoutError,
  WeftroNetworkError,
} from './errors.js';
import type { ApiResponse, RequestOptions, WeftroClientOptions } from './types.js';

export class HttpClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultTimeoutMs: number;
  private readonly customFetch: typeof fetch;
  private readonly userAgent: string;

  constructor(options: WeftroClientOptions) {
    if (!options.apiKey || typeof options.apiKey !== 'string' || !options.apiKey.trim()) {
      throw new Error('WeftroClient requires a non-empty apiKey string (e.g. cpd_... or JWT).');
    }

    this.apiKey = options.apiKey.trim();
    this.baseUrl = (options.baseUrl || 'https://www.weftro.com').replace(/\/+$/, '');
    this.defaultTimeoutMs = options.timeoutMs ?? 30000;
    this.customFetch = options.fetch ?? globalThis.fetch;
    this.userAgent = options.userAgent ? `${options.userAgent} weftro-sdk/1.0.0` : 'weftro-sdk/1.0.0';
  }

  async request<T>(
    path: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
    body?: unknown,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const timeoutMs = options?.timeoutMs ?? this.defaultTimeoutMs;

    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), timeoutMs);

    // Chain external signal if provided
    if (options?.signal) {
      options.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Accept': 'application/json',
      'User-Agent': this.userAgent,
    };

    if (options?.idempotencyKey) {
      headers['Idempotency-Key'] = options.idempotencyKey;
    }

    if (body !== undefined && method !== 'GET') {
      headers['Content-Type'] = 'application/json';
    }

    let response: Response;
    try {
      response = await this.customFetch(url, {
        method,
        headers,
        body: body !== undefined && method !== 'GET' ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (err: unknown) {
      clearTimeout(timeoutTimer);
      if (err instanceof Error && err.name === 'AbortError') {
        if (options?.signal?.aborted) {
          throw new Error('Request was cancelled by caller.');
        }
        throw new WeftroTimeoutError(timeoutMs);
      }
      throw new WeftroNetworkError(err instanceof Error ? err.message : String(err), err);
    } finally {
      clearTimeout(timeoutTimer);
    }

    const rawText = await response.text();
    let parsedJson: any = null;
    try {
      if (rawText) parsedJson = JSON.parse(rawText);
    } catch {
      // Malformed non-JSON response from upstream proxy
    }

    if (!response.ok) {
      const errorPayload = parsedJson?.error || rawText || response.statusText;

      switch (response.status) {
        case 401:
          throw new WeftroAuthenticationError(errorPayload);
        case 403:
          throw new WeftroForbiddenError(errorPayload);
        case 404:
          throw new WeftroNotFoundError(errorPayload);
        case 429: {
          const retryHeader = response.headers.get('Retry-After');
          const retrySeconds = retryHeader ? parseInt(retryHeader, 10) || 60 : 60;
          throw new WeftroRateLimitError(errorPayload, retrySeconds);
        }
        default:
          throw new WeftroApiError(response.status, errorPayload);
      }
    }

    if (!parsedJson) {
      throw new WeftroApiError(response.status, 'Received non-JSON response from Weftro Gateway.');
    }

    return parsedJson as ApiResponse<T>;
  }
}
