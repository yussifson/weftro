const fs = require('fs');
let c = fs.readFileSync('src/pages/clipad/IntegrationsHub.jsx', 'utf8');

c = c.replace(
  /return matchesCategory && matchesSearch;/g,
  "if (!['super_admin', 'admin'].includes(userRole) && !ALLOWED_FOR_EVERYONE.includes(i.id)) return false;\n    return matchesCategory && matchesSearch;"
);

fs.writeFileSync('src/pages/clipad/IntegrationsHub.jsx', c);
