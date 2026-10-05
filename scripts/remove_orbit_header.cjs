const fs = require('fs');

let searchHub = fs.readFileSync('src/pages/clipad/SearchHub.jsx', 'utf8');

// The block has class "h-14 border-b border-slate-100 ..."
// We will just match from that div up to the closing div before {/* Chat Messages */}
searchHub = searchHub.replace(
  /<div className="h-14 border-b border-slate-100[^]*?Enterprise Intelligence Engine[^]*?<\/div>\s*<\/div>\s*<\/div>/g,
  ''
);

fs.writeFileSync('src/pages/clipad/SearchHub.jsx', searchHub);
console.log('Removed Orbit AI header.');
