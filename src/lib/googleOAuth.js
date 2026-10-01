/**
 * Robust shared utility for Google OIDC authentication across all Optavel products.
 *
 * Key design decisions:
 * - Nonce is passed via the `state` parameter (the only mechanism that works cross-origin).
 * - sessionStorage is used only as a same-origin fallback (e.g. account.optavel.com initiated flows).
 * - Supports `login_hint` for seamless silent re-authentication without password prompts.
 * - Supports `prompt` override for flows that need explicit account selection.
 */

/**
 * Initiates a Google OIDC authentication flow.
 *
 * @param {string|null} continueUrlOverride - Full URL to redirect to after Google auth completes.
 *   If a relative path is given, it's resolved against the current origin.
 * @param {Object} options
 * @param {string} [options.loginHint] - Pre-select a Google account by email (for re-auth flows).
 * @param {string} [options.prompt] - Google prompt mode: 'select_account' | 'consent' | 'none'.
 *   Defaults to 'select_account' to show the account picker and allow silent re-auth.
 * @returns {Promise<string>} Google OAuth URL to redirect the browser to.
 */
export async function initiateGoogleOAuth(continueUrlOverride = null, options = {}) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('Google Client ID (VITE_GOOGLE_CLIENT_ID) is not configured.');
  }

  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.endsWith('.localhost'));

  // Callback always lands on account.optavel.com (or account.localhost in dev)
  let callbackOrigin = 'https://account.optavel.com';
  if (isLocalhost) {
    // Use the same port as the current page for local development
    const port = window.location.port ? `:${window.location.port}` : '';
    callbackOrigin = `${window.location.protocol}//account.localhost${port}`;
  }
  const redirectUri = encodeURIComponent(`${callbackOrigin}/auth/google-callback`);

  // Generate a cryptographically secure raw nonce
  const rawNonce = generateNonce();

  // Hash the nonce with SHA-256 – Google receives the hashed version, Supabase verifies the raw
  const hashedNonce = await hashNonce(rawNonce);

  // Resolve continue URL
  const searchParams = new URLSearchParams(window.location.search);
  const continueParam =
    continueUrlOverride ||
    searchParams.get('continue') ||
    searchParams.get('redirect') ||
    searchParams.get('redirect_uri') ||
    '/';

  let targetContinueUrl = continueParam;
  if (!continueParam.startsWith('http://') && !continueParam.startsWith('https://')) {
    // Relative path → resolve against current origin
    targetContinueUrl = `${window.location.origin}${continueParam.startsWith('/') ? '' : '/'}${continueParam}`;
  }

  // Build state — this is the ONLY reliable way to carry the nonce across cross-origin redirects
  const stateObj = {
    continue: targetContinueUrl,
    nonce: rawNonce,           // raw nonce for Supabase signInWithIdToken
    origin: window.location.origin,
    ts: Date.now(),            // timestamp allows detecting stale state objects
  };
  const state = encodeURIComponent(JSON.stringify(stateObj));

  // Also store in sessionStorage as a same-origin fallback
  // (only works when GoogleCallback is on the same origin, e.g. direct account.optavel.com flow)
  try {
    sessionStorage.setItem('optavel_google_raw_nonce', rawNonce);
    sessionStorage.setItem('optavel_google_nonce_ts', String(Date.now()));
  } catch (e) {
    // sessionStorage unavailable (private browsing etc.) — state param is the primary mechanism
  }

  // Build Google OAuth URL
  const prompt = options.prompt ?? 'select_account';
  let url = `https://accounts.google.com/o/oauth2/v2/auth` +
    `?client_id=${clientId}` +
    `&redirect_uri=${redirectUri}` +
    `&response_type=id_token` +
    `&scope=openid%20email%20profile` +
    `&state=${state}` +
    `&nonce=${hashedNonce}` +
    `&prompt=${encodeURIComponent(prompt)}`;

  if (options.loginHint) {
    url += `&login_hint=${encodeURIComponent(options.loginHint)}`;
  }

  return url;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function generateNonce() {
  // Use crypto.getRandomValues for stronger entropy
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback (should never be needed in a modern browser)
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

async function hashNonce(rawNonce) {
  const encoder = new TextEncoder();
  const data = encoder.encode(rawNonce);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
