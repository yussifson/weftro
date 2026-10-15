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

// Listen for Vite chunk loading errors and seamlessly recover without crash screens
window.addEventListener('vite:preloadError', async (event) => {
  event.preventDefault?.();
  const lastReload = sessionStorage.getItem('vite-auto-heal');
  const now = Date.now();
  if (lastReload && now - parseInt(lastReload, 10) < 30000) {
    return;
  }
  sessionStorage.setItem('vite-auto-heal', now.toString());
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      for (const k of keys) await caches.delete(k);
    }
  } catch (_) {}
  window.location.reload();
});

window.addEventListener('unhandledrejection', async (event) => {
  const msg = (event.reason?.message || event.reason?.toString() || '').toLowerCase();

  if (
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('importing a module script failed') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('loading chunk')
  ) {
    event.preventDefault?.();
    const lastReload = sessionStorage.getItem('vite-auto-heal');
    const now = Date.now();
    if (lastReload && now - parseInt(lastReload, 10) < 30000) {
      return;
    }
    sessionStorage.setItem('vite-auto-heal', now.toString());
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const k of keys) await caches.delete(k);
      }
    } catch (_) {}
    window.location.reload();
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
