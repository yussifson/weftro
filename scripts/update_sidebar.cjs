const fs = require('fs');
let c = fs.readFileSync('src/components/clipad/ClipadSidebar.jsx', 'utf8');

c = c.replace(
  /{ label: 'Capture', path: '\/capture', icon: Plug },/g, 
  "{ label: 'My Captures', path: '/captures', icon: Inbox },\n    { label: 'Context Sessions', path: '/context-sessions', icon: Layers },\n    { label: 'Integrations', path: '/integrations', icon: Plug },"
);

if (!c.includes('Inbox')) {
  c = c.replace(/import {([^}]+)} from "lucide-react";/g, "import {$1, Inbox, Layers} from \"lucide-react\";");
}

fs.writeFileSync('src/components/clipad/ClipadSidebar.jsx', c);
