const fs = require('fs');
let c = fs.readFileSync('src/pages/clipad/SearchHub.jsx', 'utf8');
if (!c.includes('BrainCircuit')) {
  c = c.replace(/import \{([^}]+)\} from 'lucide-react';/g, "import {$1, BrainCircuit, Inbox, Zap} from 'lucide-react';");
  fs.writeFileSync('src/pages/clipad/SearchHub.jsx', c);
}
