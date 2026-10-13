import posthog from 'posthog-js';

// Environment-driven PostHog initialization
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || '';
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

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
      capture_pageview: false, // Managed manually with React Router to prevent duplicates
      capture_pageleave: true,
      autocapture: true,
      disable_session_recording: isLocalhost,
      loaded: (ph) => {
        if (isLocalhost) {
          ph.opt_out_capturing();
        }
      }
    });
    isInitialized = true;
  } catch (err) {
    console.warn('[PostHog] Initialization error:', err);
  }
};

/**
 * Safely identify an authenticated user
 */
export const identifyUser = (user) => {
  if (!user || typeof window === 'undefined' || !isInitialized) return;
  try {
    posthog.identify(user.id, {
      email: user.email,
      name: user.full_name || user.user_metadata?.full_name,
      role: user.role,
      company_id: user.company_id || user.user_metadata?.company_id,
      plan: user.clipad_plan || user.subscription_plan || 'free',
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
  } catch (err) {
    console.warn('[PostHog] Reset error:', err);
  }
};

/**
 * Track custom events safely with data sanitization
 */
export const trackEvent = (eventName, properties = {}) => {
  if (typeof window === 'undefined' || !isInitialized) return;

  // Strict sanitization: ensure no sensitive content, transcripts, tokens or passwords leak
  const sanitized = { ...properties };
  delete sanitized.password;
  delete sanitized.token;
  delete sanitized.accessToken;
  delete sanitized.transcript;
  delete sanitized.secret;
  delete sanitized.content;

  try {
    posthog.capture(eventName, sanitized);
  } catch (err) {
    console.warn('[PostHog] Event capture error:', err);
  }
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
