/**
 * Microsoft Clarity Analytics & Heatmap Integration
 */

const CLARITY_PROJECT_ID = import.meta.env.VITE_CLARITY_PROJECT_ID || '';

const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

let isInitialized = false;

/**
 * Initialize Microsoft Clarity safely
 */
export const initClarity = () => {
  if (typeof window === 'undefined' || isInitialized || isLocalhost) return;

  if (!CLARITY_PROJECT_ID) {
    return;
  }

  try {
    (function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", CLARITY_PROJECT_ID);

    isInitialized = true;
  } catch (err) {
    console.warn('[Clarity] Initialization error:', err);
  }
};

/**
 * Pause recording on private or media-heavy call rooms
 */
export const handleClarityRouteChange = (pathname) => {
  if (typeof window === 'undefined' || !window.clarity) return;

  // Sensitive paths where screen recording/heatmaps must be paused
  const isSensitiveRoute = pathname.startsWith('/join/') || 
                          pathname.startsWith('/record') || 
                          pathname.startsWith('/watch/');

  try {
    if (isSensitiveRoute) {
      window.clarity("pause");
    } else {
      window.clarity("resume");
    }
  } catch (err) {
    console.warn('[Clarity] Route update error:', err);
  }
};
