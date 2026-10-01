import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { ErrorBoundary } from '@/components/ErrorBoundary.jsx'
import { registerSW } from 'virtual:pwa-register'
import i18n from '@/i18n/config.js'
import { I18nextProvider } from 'react-i18next'
import { CapacitorUpdater } from '@capgo/capacitor-updater';


CapacitorUpdater.notifyAppReady();

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
      console.log('Pull to refresh: Checking for service worker updates...');
      await reg.update();
      // Wait a moment then hard reload if updateSW didn't kick in, to ensure clean state
      setTimeout(() => window.location.reload(true), 1500);
    } else {
      window.location.reload(true);
    }
  } else {
    window.location.reload(true);
  }
});

// Listen for Vite chunk loading errors (e.g. when Vercel deploys a new version and old chunks are missing)
window.addEventListener('vite:preloadError', async (event) => {
  if (sessionStorage.getItem('vite-reload')) {
    sessionStorage.removeItem('vite-reload');
    console.error('Vite preload error persists. Stopping infinite loop.');
    return;
  }
  sessionStorage.setItem('vite-reload', 'true');
  console.warn('Vite preload error (chunk missing). Forcing hard reload...');
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

  // Handle stale Vercel chunks: "Failed to fetch dynamically imported module"
  if (msg.includes('Failed to fetch dynamically imported module') || msg.includes('Importing a module script failed')) {
    if (sessionStorage.getItem('vite-reload')) {
      sessionStorage.removeItem('vite-reload');
      console.error('Dynamic import error persists. Stopping reload loop.');
      return;
    }
    sessionStorage.setItem('vite-reload', 'true');
    console.warn('Stale deployment chunk detected. Forcing hard reload...');
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    }
    window.location.reload(true);
    return;
  }

  if (msg.includes('importScripts') && msg.includes('workbox')) {
    console.warn('Workbox importScripts failed.');
    // CAUTION: Do not unregister the service worker if offline, as reloading will show the Dinosaur error.
    if (!navigator.onLine) {
      console.log('Currently offline, ignoring Workbox update failure.');
      return;
    }
    console.warn('Forcing service worker unregistration and reload.');
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
      window.location.reload(true);
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <I18nextProvider i18n={i18n}>
        <App />
    </I18nextProvider>
  </ErrorBoundary>
)
