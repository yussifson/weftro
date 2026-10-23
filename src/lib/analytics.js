/**
 * Weftro Centralized Analytics & Tag Management Dispatcher
 * Bridges Single-Page Application (SPA) lifecycle, PostHog, and Google Tag Manager (GTM/GA4)
 * GTM Container ID: GTM-WHXWNNN9
 * GA4 Measurement ID: G-2C8BQ2LQTV
 */

// Safe helper to push to window.dataLayer
export const pushDataLayer = (payload) => {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  try {
    window.dataLayer.push(payload);
  } catch (err) {
    console.warn('[Analytics] dataLayer push error:', err);
  }
};

/**
 * Standard Analytics Events Spec for Weftro
 */
export const trackAnalyticsEvent = (eventName, params = {}) => {
  if (typeof window === 'undefined') return;

  // Strict sanitization: Strip passwords, tokens, full transcripts and sensitive secrets
  const sanitized = { ...params };
  delete sanitized.password;
  delete sanitized.token;
  delete sanitized.accessToken;
  delete sanitized.secret;
  delete sanitized.transcript;
  delete sanitized.content;

  // 1. Dispatch into GTM dataLayer for GA4
  pushDataLayer({
    event: eventName,
    ...sanitized,
    timestamp: new Date().toISOString()
  });

  // 2. Also forward to PostHog if available
  if (window.posthog && typeof window.posthog.capture === 'function') {
    try {
      window.posthog.capture(eventName, sanitized);
    } catch (e) {
      // ignore
    }
  }
};

/**
 * SPA Route Change tracking for GTM & GA4
 */
export const trackAnalyticsPageView = (pathname, search = '') => {
  if (typeof window === 'undefined') return;
  const fullPath = search ? `${pathname}${search}` : pathname;
  const pageTitle = document.title || 'Weftro';

  pushDataLayer({
    event: 'page_view',
    page_path: fullPath,
    page_location: window.location.href,
    page_title: pageTitle
  });
};
