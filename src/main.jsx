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
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault?.();
  console.warn('[Deployment Sync] New asset chunk detected. Caches will be synced in the background.');
  // Purge outdated service worker / cache entries silently in the background
  try {
    if ('caches' in window) {
      caches.keys().then((keys) => {
        for (const k of keys) caches.delete(k);
      }).catch(() => {});
    }
  } catch (_) {}
});

window.addEventListener('unhandledrejection', (event) => {
  const msg = (event.reason?.message || event.reason?.toString() || '').toLowerCase();

  if (
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('importing a module script failed') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('loading chunk')
  ) {
    event.preventDefault?.();
    console.warn('[Deployment Sync] Handled dynamic import error gracefully without interrupting user session.');
    try {
      if ('caches' in window) {
        caches.keys().then((keys) => {
          for (const k of keys) caches.delete(k);
        }).catch(() => {});
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
