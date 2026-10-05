const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');
c = c.replace(/host\.includes\('KERINT'\)/, "host.includes('clipad')");
fs.writeFileSync('index.html', c);
