const fs = require('fs');

const unescapeFiles = [
  'src/components/clipad/features/CaptureInbox.jsx',
  'src/components/clipad/features/ConnectSettings.jsx',
  'src/lib/clipadConnectService.js',
  'src/lib/clipadWebhookService.js'
];

for (const file of unescapeFiles) {
  let content = fs.readFileSync(file, 'utf8');
  let fixedContent = content.replace(/\\`/g, '`').replace(/\\\$/g, '$');
  fs.writeFileSync(file, fixedContent, 'utf8');
  console.log(`Unescaped ${file}`);
}

// And BrowserCaptureSettings needs the specific regex fix, plus maybe unescape?
let bcsContent = fs.readFileSync('src/components/clipad/features/BrowserCaptureSettings.jsx', 'utf8');
bcsContent = bcsContent.replace("replace(/^https?:\\\\/\\\\//, '')", "replace(/^https?:\\/\\//, '')");
// also unescape in case there are template literals
bcsContent = bcsContent.replace(/\\`/g, '`').replace(/\\\$/g, '$');
fs.writeFileSync('src/components/clipad/features/BrowserCaptureSettings.jsx', bcsContent, 'utf8');
console.log('Fixed BrowserCaptureSettings!');

