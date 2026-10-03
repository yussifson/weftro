const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');

c = c.replace(
  /<Route path="\/capture" element=\{<IntegrationsHub \/>\} \/>/g,
  `<Route path="/integrations" element={<IntegrationsHub />} />
                          <Route path="/captures" element={<CaptureInbox />} />
                          <Route path="/context-sessions" element={<ContextSessions />} />`
);

// Add imports
if (!c.includes('CaptureInbox')) {
  c = c.replace(
    /import IntegrationsHub from '.*?';/g,
    `import IntegrationsHub from '@/pages/clipad/IntegrationsHub';
import CaptureInbox from '@/pages/clipad/CaptureInbox';
import ContextSessions from '@/pages/clipad/ContextSessions';`
  );
}

fs.writeFileSync('src/App.jsx', c);
