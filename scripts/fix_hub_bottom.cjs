const fs = require('fs');
const file = 'src/pages/clipad/IntegrationsHub.jsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
  /            <\/>\r?\n          \) : activeTab === 'connect' && isConnectEnabled \? \(\r?\n            <ConnectSettings \/>\r?\n          \) : null\}/g,
  "            </>\n          )}"
);

fs.writeFileSync(file, c);
console.log('Fixed bottom ternary');
