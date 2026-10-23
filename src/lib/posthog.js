import posthog from 'posthog-js';
import { pushDataLayer } from './analytics';

// Environment-driven PostHog initialization
// Reads standard Vite env vars (VITE_POSTHOG_KEY, VITE_POSTHOG_HOST)
// Also supports NEXT_PUBLIC_ variants if provided via build flags
const POSTHOG_KEY = 
  import.meta.env.VITE_POSTHOG_KEY || 
  import.meta.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN || 
  import.meta.env.NEXT_PUBLIC_POSTHOG_KEY || 
  '';

const POSTHOG_HOST = 
  import.meta.env.VITE_POSTHOG_HOST || 
  import.meta.env.NEXT_PUBLIC_POSTHOG_HOST || 
  'https://us.i.posthog.com';

const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

let isInitialized = false;

/**
 * Initialize PostHog client-side analytics safely
 */
export const initPostHog = () => {
  if (typeof window === 'undefined' || isInitialized) return;

  if (!POSTHOG_KEY) {
    return;
  }

  try {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: false, // Managed cleanly with React Router in AnalyticsTracker to prevent duplicates
      capture_pageleave: true,
      autocapture: true,
      disable_session_recording: isLocalhost,
      loaded: (ph) => {
        // Expose to window for global analytics bridge
        window.posthog = ph;
      }
    });
    isInitialized = true;
    window.posthog = posthog;
  } catch (err) {
    console.warn('[PostHog] Initialization error:', err);
  }
};

/**
 * Safely identify an authenticated user and organization
 */
export const identifyUser = (user) => {
  if (!user || typeof window === 'undefined' || !isInitialized) return;
  try {
    const orgId = user.company_id || user.user_metadata?.company_id;
    const planTier = user.clipad_plan || user.subscription_plan || 'free';

    posthog.identify(user.id, {
      email: user.email,
      name: user.full_name || user.user_metadata?.full_name,
      role: user.role,
      company_id: orgId,
      plan: planTier,
      created_at: user.created_at || user.created_date
    });

    // Group / organization association if company_id is present
    if (orgId && typeof posthog.group === 'function') {
      try {
        posthog.group('company', orgId, {
          company_id: orgId,
          plan: planTier
        });
      } catch (_) {}
    }

    // Also notify GTM dataLayer
    pushDataLayer({
      event: 'user_identified',
      user_id: user.id,
      company_id: orgId,
      user_role: user.role
    });
  } catch (err) {
    console.warn('[PostHog] Identify error:', err);
  }
};

/**
 * Reset PostHog session on sign out
 */
export const resetUser = () => {
  if (typeof window === 'undefined' || !isInitialized) return;
  try {
    posthog.reset();
    pushDataLayer({ event: 'user_signed_out' });
  } catch (err) {
    console.warn('[PostHog] Reset error:', err);
  }
};

/**
 * Track custom events safely with data sanitization across PostHog & GTM/GA4
 */
export const trackEvent = (eventName, properties = {}) => {
  if (typeof window === 'undefined') return;

  // Strict sanitization: ensure no sensitive content, transcripts, tokens, secrets, or passwords leak
  const sanitized = { ...properties };
  delete sanitized.password;
  delete sanitized.token;
  delete sanitized.accessToken;
  delete sanitized.transcript;
  delete sanitized.secret;
  delete sanitized.content;

  try {
    if (isInitialized) {
      posthog.capture(eventName, sanitized);
    }
  } catch (err) {
    console.warn('[PostHog] Event capture error:', err);
  }

  // Dual-dispatch to GTM dataLayer for GA4 custom event tracking
  pushDataLayer({
    event: eventName,
    ...sanitized
  });
};

/**
 * Track SPA route transitions cleanly
 */
export const trackPageView = (pathname, search = '') => {
  if (typeof window === 'undefined' || !isInitialized) return;
  try {
    posthog.capture('$pageview', {
      $current_url: window.location.href,
      path: pathname,
      search: search
    });
  } catch (err) {
    console.warn('[PostHog] Pageview capture error:', err);
  }
};

export default posthog;
