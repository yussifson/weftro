import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Circuit breaker: after a genuine network timeout, skip non-auth requests for 15 seconds.
let forceOfflineUntil = 0;

const customFetch = async (url, options) => {
  // If browser reports offline, fail immediately
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new TypeError('Failed to fetch: Offline');
  }

  // Auth and token endpoints are always exempt from the circuit breaker
  // — we must never block login / session refresh requests
  const isAuthEndpoint = url.includes('/auth/v1/') || url.includes('/auth/token') || url.includes('/auth/user');

  // If circuit breaker is tripped and this is NOT an auth request, fail immediately
  if (!isAuthEndpoint && Date.now() < forceOfflineUntil) {
    throw new TypeError('Failed to fetch: Offline');
  }

  let finalUrl = url;
  if (finalUrl.includes('company_id=eq.null')) {
    finalUrl = finalUrl.replace('company_id=eq.null', 'company_id=is.null');
  }

  const controller = new AbortController();
  // Uploads and Edge Functions get a longer timeout; auth gets 20s; everything else 30s
  const isUpload = finalUrl.includes('/storage/v1/object/');
  const isEdgeFunction = finalUrl.includes('/functions/v1/');
  const timeoutDuration = isUpload || isEdgeFunction ? 60000 : isAuthEndpoint ? 20000 : 30000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

  try {
    const response = await fetch(finalUrl, { ...options, signal: controller.signal });
    // Successful response (even a 4xx) — clear circuit breaker since network is working
    forceOfflineUntil = 0;
    return response;
  } catch (error) {
    // Only trip the circuit breaker for genuine network failures (not 4xx/5xx responses)
    // and only for non-auth requests
    if (!isAuthEndpoint) {
      if (error.name === 'AbortError') {
        forceOfflineUntil = Date.now() + 15000; // Shorter 15s window
        throw new TypeError('Failed to fetch: Request timeout');
      }
      if (
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('NetworkError') ||
        error.message?.includes('ERR_INTERNET_DISCONNECTED') ||
        error.message?.includes('ERR_NETWORK_CHANGED')
      ) {
        forceOfflineUntil = Date.now() + 15000;
      }
    } else if (error.name === 'AbortError') {
      // Auth timeout — don't trip breaker but do report the error properly
      throw new TypeError('Failed to fetch: Auth request timeout');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'sb-optavel-auth-token', // Explicit key prevents collisions across subdomains
  },
  global: {
    fetch: customFetch
  }
});


// Pause / resume Supabase's auto-refresh token loop based on connectivity.
// Without this, Supabase hammers the /auth/v1/token endpoint every few seconds
// when offline, flooding the console with errors.
if (typeof window !== 'undefined') {
  // Migrate existing session from old default Supabase storage key to our new explicit key.
  // This prevents existing logged-in users from being signed out after the storageKey change.
  try {
    const projectId = (supabaseUrl || '').split('//')[1]?.split('.')[0] || '';
    const oldKey = `sb-${projectId}-auth-token`;
    const newKey = 'sb-optavel-auth-token';
    if (projectId && oldKey !== newKey) {
      const existing = localStorage.getItem(oldKey);
      const alreadyMigrated = localStorage.getItem(newKey);
      if (existing && !alreadyMigrated) {
        localStorage.setItem(newKey, existing);
        console.log('[supabaseClient] Migrated auth session to new storage key.');
      }
    }
  } catch (e) { /* ignore */ }

  window.addEventListener('offline', () => {
    supabase.auth.stopAutoRefresh();
  });

  window.addEventListener('online', () => {
    // Clear the circuit breaker immediately when we come back online
    forceOfflineUntil = 0;
    supabase.auth.startAutoRefresh();
  });
}
