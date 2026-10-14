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
  onNeedRefresh() {
    console.log('New service worker update available — deferred until deliberate page refresh.');
    window.dispatchEvent(new CustomEvent('app:updateAvailable'));
  },
  onOfflineReady() {
    console.log('App is ready for offline use');
  }
});

// PullToRefresh triggers SW check without aggressively forcing hard reload
window.addEventListener('app:refresh', async () => {
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg) await reg.update();
    } catch (_) {}
  }
});

// Listen for Vite chunk loading errors
window.addEventListener('vite:preloadError', async (event) => {
  if (sessionStorage.getItem('vite-reload')) {
    sessionStorage.removeItem('vite-reload');
    return;
  }
  sessionStorage.setItem('vite-reload', 'true');
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
  }
  window.location.reload(true);
});

window.addEventListener('unhandledrejection', async (event) => {
  const msg = event.reason?.message || '';

  if (msg.includes('Failed to fetch dynamically imported module') || msg.includes('Importing a module script failed')) {
    if (sessionStorage.getItem('vite-reload')) {
      sessionStorage.removeItem('vite-reload');
      return;
    }
    sessionStorage.setItem('vite-reload', 'true');
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    }
    window.location.reload(true);
    return;
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
