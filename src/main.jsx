import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { ErrorBoundary } from '@/components/ErrorBoundary.jsx'
import { registerSW } from 'virtual:pwa-register'
import i18n from '@/i18n/config.js'
import { I18nextProvider } from 'react-i18next'

const updateSW = registerSW({
  onNeedRefresh() {
    console.log('New content available, refreshing...');
    updateSW(true);
  },
  onOfflineReady() {
    console.log('App is ready for offline use');
  }
});

// Allow PullToRefresh to trigger a service worker update check
window.addEventListener('app:refresh', async () => {
  if ('serviceWorker' in navigator) {
    const reg = await navigator.serviceWorker.ready;
    if (reg) {
      await reg.update();
      setTimeout(() => window.location.reload(true), 1500);
    } else {
      window.location.reload(true);
    }
  } else {
    window.location.reload(true);
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

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <I18nextProvider i18n={i18n}>
        <App />
    </I18nextProvider>
  </ErrorBoundary>
)
