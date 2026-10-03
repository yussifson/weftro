const fs = require('fs');
let c = fs.readFileSync('src/pages/clipad/IntegrationsHub.jsx', 'utf8');

const oldFilter = `  const filteredIntegrations = INTEGRATIONS.filter(i => {
    const matchesCategory = activeCategory === 'All' || i.category === activeCategory;
    const matchesSearch = !searchQuery || i.name.toLowerCase().includes(searchQuery.toLowerCase()) || i.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });`;

const newFilter = `  const filteredIntegrations = INTEGRATIONS.filter(i => {
    const matchesCategory = activeCategory === 'All' || i.category === activeCategory;
    const matchesSearch = !searchQuery || i.name.toLowerCase().includes(searchQuery.toLowerCase()) || i.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filter out coming soon integrations for non-super-admins
    if (!['super_admin', 'admin'].includes(userRole) && !ALLOWED_FOR_EVERYONE.includes(i.id)) {
      return false;
    }
    
    return matchesCategory && matchesSearch;
  });`;

c = c.replace(oldFilter, newFilter);
fs.writeFileSync('src/pages/clipad/IntegrationsHub.jsx', c);
