const fs = require('fs');
const file = 'src/pages/clipad/CliPadDashboard.jsx';
let c = fs.readFileSync(file, 'utf8');

if (!c.includes('OrganizationalInsights')) {
  c = c.replace(
    "import BlockerRadar from '@/components/clipad/features/BlockerRadar';",
    "import BlockerRadar from '@/components/clipad/features/BlockerRadar';\nimport OrganizationalInsights from '@/components/clipad/features/OrganizationalInsights';"
  );
}

// Render it under the top stats or below Quick Actions
// Let's find a good spot: 
const insertionStr = `
        {/* Phase 9: Organizational Insights & Analytics */}
        <div className="mb-8">
          <OrganizationalInsights />
        </div>
`;

// Insert it right after the stat cards (which is right before "<div><h2 className="text-xl font-bold...")
c = c.replace(
  /        <\/div>\s*<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">/m,
  "        </div>\n" + insertionStr + "\n        <div className=\"grid grid-cols-1 lg:grid-cols-3 gap-8\">"
);

fs.writeFileSync(file, c);
console.log('Injected OrganizationalInsights into CliPadDashboard');
