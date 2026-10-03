const fs = require('fs');
let c = fs.readFileSync('src/pages/clipad/IntegrationsHub.jsx', 'utf8');

c = c.replace(
  /const isAllowedToConnect = true; \/\/ Visibility handled in filtering/g,
  'const isAllowedToConnect = ALLOWED_FOR_EVERYONE.includes(integration.id);'
);

fs.writeFileSync('src/pages/clipad/IntegrationsHub.jsx', c);
