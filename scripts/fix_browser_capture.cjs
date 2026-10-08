const fs = require('fs');
let content = fs.readFileSync('src/components/clipad/features/BrowserCaptureSettings.jsx', 'utf8');
content = content.replace(/\/\^https\?:\\\\\/\\\\\/\\//, '/^https?:\\/\\//'); // Actually, let's just do an exact string replace
fs.writeFileSync('src/components/clipad/features/BrowserCaptureSettings.jsx', content.replace("replace(/^https?:\\\\/\\\\//, '')", "replace(/^https?:\\/\\//, '')"));
console.log('Fixed BrowserCaptureSettings regex!');
