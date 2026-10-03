const fs = require('fs');
let c = fs.readFileSync('src/pages/clipad/IntegrationsHub.jsx', 'utf8');

const filterRegex = /const filteredIntegrations = INTEGRATIONS\.filter\(i => \{[\s\S]*?return matchesCategory && matchesSearch;\n  \}\);/;
const newFilter = `const filteredIntegrations = INTEGRATIONS.filter(i => {
    const matchesCategory = activeCategory === 'All' || i.category === activeCategory;
    const matchesSearch = !searchQuery || i.name.toLowerCase().includes(searchQuery.toLowerCase()) || i.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filter out coming soon integrations for non-super-admins
    if (!['super_admin', 'admin'].includes(userRole) && !ALLOWED_FOR_EVERYONE.includes(i.id)) {
      return false;
    }
    
    return matchesCategory && matchesSearch;
  });`;
c = c.replace(filterRegex, newFilter);

c = c.replace(
  /!isAllowedToConnect && \(\s*<span className="px-1\.5 py-0\.5 bg-amber-500\/10 text-amber-600 dark:text-amber-400 rounded-full text-\[10px\] font-bold\">\s*Coming Soon\s*<\/span>\s*\)/g,
  '!ALLOWED_FOR_EVERYONE.includes(integration.id) && (\n                            <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-[10px] font-bold">\n                              Coming Soon\n                            </span>\n                          )'
);

c = c.replace(
  /const isAllowedToConnect = isSuperAdmin\(user\) \|\| ALLOWED_FOR_EVERYONE\.includes\(integration\.id\);/g,
  'const isAllowedToConnect = true; // Visibility handled in filtering'
);

c = c.replace(
  /disabled=\{!isAllowedToConnect \|\| isConnected \|\| isSyncing \|\| isDisconnecting\}/g,
  'disabled={!ALLOWED_FOR_EVERYONE.includes(integration.id) && !["super_admin", "admin"].includes(userRole) || isConnected || isSyncing || isDisconnecting}'
);

fs.writeFileSync('src/pages/clipad/IntegrationsHub.jsx', c);
