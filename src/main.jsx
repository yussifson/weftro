import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { initPostHog } from '@/lib/posthog'
import { initClarity } from '@/lib/clarity'
import { ErrorBoundary } from '@/components/ErrorBoundary.jsx'
import { registerSW } from 'virtual:pwa-register'
import i18n from '@/i18n/config.js'
import { I18nextProvider } from 'react-i18next'



const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[System] New deployment detected — updating service worker in background.');
    if (updateSW) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('[System] App assets cached and ready for offline use.');
  }
});

// Periodic background check every 5 minutes to stay synchronized with new deployments (just like Google/OpenAI)
if (typeof window !== 'undefined') {
  setInterval(async () => {
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg) await reg.update();
      } catch (_) {}
    }
  }, 5 * 60 * 1000);
}

// PullToRefresh triggers SW check without aggressively forcing hard reload
window.addEventListener('app:refresh', async () => {
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg) await reg.update();
    } catch (_) {}
  }
});

// Handle dynamic module and chunk loading gracefully without abruptly crashing or reloading the active session
// Handle dynamic module and chunk loading gracefully:
// When a new deployment occurs, older chunk hashes on the client throw 404.
// Self-heal silently by clearing stale script caches and performing a single smooth reload.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault?.();
  console.warn('[Deployment Sync] New asset chunk detected. Auto-reloading with latest deployment...');
  try {
    if ('caches' in window) {
      caches.keys().then((keys) => {
        return Promise.all(keys.map(k => caches.delete(k)));
      }).then(() => {
        const lastReload = sessionStorage.getItem('vite_auto_reload');
        const now = Date.now();
        if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
          sessionStorage.setItem('vite_auto_reload', now.toString());
          window.location.reload();
        }
      }).catch(() => {
        window.location.reload();
      });
      return;
    }
  } catch (_) {}
  window.location.reload();
});

window.addEventListener('unhandledrejection', (event) => {
  const msg = (event.reason?.message || event.reason?.toString() || '').toLowerCase();

  if (
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('importing a module script failed') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('loading chunk') ||
    msg.includes('cannot read properties of undefined') && (msg.includes('default') || msg.includes('reading'))
  ) {
    event.preventDefault?.();
    console.warn('[Deployment Sync] Dynamic import mismatch detected. Auto-recovering session...');
    try {
      if ('caches' in window) {
        caches.keys().then((keys) => {
          return Promise.all(keys.map(k => caches.delete(k)));
        }).then(() => {
          const lastReload = sessionStorage.getItem('vite_auto_reload');
          const now = Date.now();
          if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
            sessionStorage.setItem('vite_auto_reload', now.toString());
            window.location.reload();
          }
        }).catch(() => {
          window.location.reload();
        });
        return;
      }
    } catch (_) {}
  }
});

// Initialize privacy-conscious analytics safely
initPostHog();
initClarity();

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <I18nextProvider i18n={i18n}>
        <App />
    </I18nextProvider>
  </ErrorBoundary>
)
