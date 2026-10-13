import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '@/lib/posthog';
import { handleClarityRouteChange } from '@/lib/clarity';

/**
 * Route listener component to accurately capture pageviews in single-page apps
 */
export default function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    // 1. Track PostHog pageview on every client-side navigation
    trackPageView(location.pathname, location.search);

    // 2. Pause/Resume Clarity session recording on sensitive routes
    handleClarityRouteChange(location.pathname);
  }, [location.pathname, location.search]);

  return null;
}
