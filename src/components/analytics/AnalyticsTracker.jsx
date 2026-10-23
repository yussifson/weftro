import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '@/lib/posthog';
import { handleClarityRouteChange } from '@/lib/clarity';
import { trackAnalyticsPageView } from '@/lib/analytics';

/**
 * Route listener component to accurately capture pageviews in single-page apps (GTM, GA4, PostHog, Clarity)
 */
export default function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    // 1. Track GTM dataLayer & GA4 page_view on every client-side navigation
    trackAnalyticsPageView(location.pathname, location.search);

    // 2. Track PostHog pageview on every client-side navigation
    trackPageView(location.pathname, location.search);

    // 3. Pause/Resume Clarity session recording on sensitive routes
    handleClarityRouteChange(location.pathname);
  }, [location.pathname, location.search]);

  return null;
}
