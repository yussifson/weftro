const fs = require('fs');

let main = fs.readFileSync('src/main.jsx', 'utf8');

const overlayUI = `
function showUpdateOverlay() {
  if (document.getElementById('clipad-update-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'clipad-update-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,96,101,0.9);backdrop-filter:blur(10px);z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;color:white;font-family:sans-serif;animation: fadeIn 0.3s ease;';
  overlay.innerHTML = \`
    <style>@keyframes spin { 100% { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }</style>
    <div style="width:40px;height:40px;border:3px solid rgba(255,255,255,0.3);border-top-color:#fad503;border-radius:50%;animation:spin 1s linear infinite;margin-bottom:20px;"></div>
    <h2 style="margin:0 0 8px 0;font-size:24px;font-weight:bold;">Applying Update</h2>
    <p style="margin:0;color:rgba(255,255,255,0.8);">Seamlessly transitioning to the latest version...</p>
  \`;
  document.body.appendChild(overlay);
}
`;

// Insert the overlayUI at the top
main = main.replace("const updateSW = registerSW({", overlayUI + "\n\nconst updateSW = registerSW({");

// Modify onNeedRefresh
main = main.replace(/onNeedRefresh\(\) \{\s*console\.log\('New content available, refreshing\.\.\.'\);\s*updateSW\(true\);\s*\}/, `onNeedRefresh() {
    console.log('New content available. Update prepared.');
    // We do not force updateSW(true) here anymore, it will apply on restart.
    // Or we show a subtle non-intrusive update prompt to the user.
    window.dispatchEvent(new CustomEvent('app:updateAvailable'));
  }`);

// Modify chunk load error handlers
main = main.replace(/window\.location\.reload\(true\);/g, `showUpdateOverlay(); setTimeout(() => window.location.reload(true), 800);`);

fs.writeFileSync('src/main.jsx', main);
