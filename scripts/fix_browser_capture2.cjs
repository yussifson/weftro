const fs = require('fs');
let content = fs.readFileSync('src/components/clipad/features/BrowserCaptureSettings.jsx', 'utf8');
content = content.replace("replace(/^https?:\\\\/\\\\//, '')", "replace(/^https?:\\/\\//, '')");
fs.writeFileSync('src/components/clipad/features/BrowserCaptureSettings.jsx', content);
console.log('Fixed BrowserCaptureSettings regex!');
