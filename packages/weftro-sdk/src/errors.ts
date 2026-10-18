import type { ApiErrorDetail } from './types.js';

/**
 * Base error class for all Weftro API client errors
 */
export class WeftroError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WeftroError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error raised when the Weftro Gateway responds with an HTTP error status (4xx or 5xx)
 */
export class WeftroApiError extends WeftroError {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;
  readonly details?: unknown;

  constructor(status: number, errorDetail: ApiErrorDetail | string) {
    const message = typeof errorDetail === 'string' ? errorDetail : errorDetail.message || 'Unknown API error';
    super(`Weftro API Error (${status}): ${message}`);
    this.name = 'WeftroApiError';
    this.status = status;

    if (typeof errorDetail === 'object' && errorDetail !== null) {
      this.code = errorDetail.code || 'API_ERROR';
      this.requestId = errorDetail.request_id;
      this.details = errorDetail.details;
    } else {
      this.code = 'API_ERROR';
    }

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * HTTP 401 Unauthorized error (missing, invalid, or expired credentials)
 */
export class WeftroAuthenticationError extends WeftroApiError {
  constructor(errorDetail: ApiErrorDetail | string) {
    super(401, errorDetail);
    this.name = 'WeftroAuthenticationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * HTTP 403 Forbidden error (insufficient scopes, inactive application, or permission denied)
 */
export class WeftroForbiddenError extends WeftroApiError {
  constructor(errorDetail: ApiErrorDetail | string) {
    super(403, errorDetail);
    this.name = 'WeftroForbiddenError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * HTTP 404 Not Found error (resource not found or cross-tenant access blocked)
 */
export class WeftroNotFoundError extends WeftroApiError {
  constructor(errorDetail: ApiErrorDetail | string) {
    super(404, errorDetail);
    this.name = 'WeftroNotFoundError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * HTTP 429 Rate Limit Exceeded error with server Retry-After value
 */
export class WeftroRateLimitError extends WeftroApiError {
  readonly retryAfterSeconds: number;

  constructor(errorDetail: ApiErrorDetail | string, retryAfterSeconds: number = 60) {
    super(429, errorDetail);
    this.name = 'WeftroRateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error raised when a request times out
 */
export class WeftroTimeoutError extends WeftroError {
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`Weftro request timed out after ${timeoutMs}ms`);
    this.name = 'WeftroTimeoutError';
    this.timeoutMs = timeoutMs;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error raised when client network connectivity fails or DNS cannot resolve
 */
export class WeftroNetworkError extends WeftroError {
  readonly originalError?: unknown;

  constructor(message: string, originalError?: unknown) {
    super(`Weftro Network Error: ${message}`);
    this.name = 'WeftroNetworkError';
    this.originalError = originalError;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
