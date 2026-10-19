import React from 'react';

/**
 * Checks whether an error is caused by a missing/stale deployment chunk
 */
export function isChunkLoadError(error) {
  if (!error) return false;
  const message = (error?.message || error?.toString() || '').toLowerCase();
  return (
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('importing a module script failed') ||
    message.includes('error loading dynamically imported module') ||
    message.includes('loading chunk') ||
    message.includes('failed to fetch') ||
    message.includes('dynamically imported module')
  );
}

/**
 * Enterprise Auto-Healing Dynamic Importer
 * 
 * When new code is deployed to production:
 * 1. Vite generates new hashed chunks (e.g., SpaceDashboard-abc.js -> SpaceDashboard-xyz.js).
 * 2. If a user is currently using the app and transitions to another page or opens a modal,
 *    their browser requests the old chunk hash which the server no longer has (404).
 * 3. Standard apps crash and show a broken screen or generic "Something went wrong" error boundary.
 * 4. safeLazy intercepts the 404, clears any service worker/browser script caches, and reloads
 *    cleanly and silently in the background or retries the import immediately so the user
 *    never sees an error or crash modal.
 */
export function safeLazy(factory, retries = 2, interval = 800) {
  return React.lazy(() => {
    return new Promise((resolve, reject) => {
      const attempt = (remainingRetries) => {
        factory()
          .then((module) => {
            // Once successfully loaded, clear any reload marker
            try {
              sessionStorage.removeItem('vite_chunk_retry');
            } catch (_) {}
            resolve(module);
          })
          .catch(async (error) => {
            if (isChunkLoadError(error)) {
              if (remainingRetries > 0) {
                // Wait briefly and try again (handles brief network hiccups or server propagation)
                setTimeout(() => attempt(remainingRetries - 1), interval);
                return;
              }

              // Exhausted retry attempts: New deployment has removed this chunk.
              // Clear caches and trigger smooth automatic reload so the user gets the new version seamlessly
              try {
                if ('caches' in window) {
                  caches.keys().then((keys) => {
                    return Promise.all(keys.map(k => caches.delete(k)));
                  }).finally(() => {
                    const lastReload = sessionStorage.getItem('vite_chunk_auto_reload');
                    const now = Date.now();
                    if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
                      sessionStorage.setItem('vite_chunk_auto_reload', now.toString());
                      window.location.reload();
                    }
                  });
                  return;
                }
              } catch (_) {}
              window.location.reload();
              return;
            }

            // Reject so ErrorBoundary or caller handles gracefully without destroying active state
            reject(error);
          });
      };

      attempt(retries);
    });
  });
}

export default safeLazy;
