import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { ErrorBoundary } from '@/components/ErrorBoundary.jsx'
import { registerSW } from 'virtual:pwa-register'
import i18n from '@/i18n/config.js'
import { I18nextProvider } from 'react-i18next'


function showUpdateOverlay() {
  if (document.getElementById('clipad-update-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'clipad-update-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,96,101,0.9);backdrop-filter:blur(10px);z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;color:white;font-family:sans-serif;animation: fadeIn 0.3s ease;';
  overlay.innerHTML = `
    <style>@keyframes spin { 100% { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }</style>
    <div style="width:40px;height:40px;border:3px solid rgba(255,255,255,0.3);border-top-color:#fad503;border-radius:50%;animation:spin 1s linear infinite;margin-bottom:20px;"></div>
    <h2 style="margin:0 0 8px 0;font-size:24px;font-weight:bold;">Applying Update</h2>
    <p style="margin:0;color:rgba(255,255,255,0.8);">Seamlessly transitioning to the latest version...</p>
  `;
  document.body.appendChild(overlay);
}


const updateSW = registerSW({
  onNeedRefresh() {
    console.log('New content available. Update prepared.');
    // We do not force updateSW(true) here anymore, it will apply on restart.
    // Or we show a subtle non-intrusive update prompt to the user.
    window.dispatchEvent(new CustomEvent('app:updateAvailable'));
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
      showUpdateOverlay(); setTimeout(() => window.location.reload(true), 800);
    }
  } else {
    showUpdateOverlay(); setTimeout(() => window.location.reload(true), 800);
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
  showUpdateOverlay(); setTimeout(() => window.location.reload(true), 800);
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
    showUpdateOverlay(); setTimeout(() => window.location.reload(true), 800);
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
