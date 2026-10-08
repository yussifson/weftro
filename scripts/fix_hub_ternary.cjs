const fs = require('fs');
const file = 'src/pages/clipad/IntegrationsHub.jsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
  /\{activeTab === 'inbox' \? \([\s\S]*?<CaptureInbox \/>[\s\S]*?\) : \([\s\S]*?<>/,
  "{activeTab === 'inbox' ? (\n            <CaptureInbox />\n          ) : activeTab === 'connect' && isConnectEnabled ? (\n            <ConnectSettings />\n          ) : (\n            <>"
);

c = c.replace(
  /            \)\ : activeTab === 'connect' && isConnectEnabled \? \([\s\S]*?<ConnectSettings \/>[\s\S]*?\) : null\}/,
  "            )}\n"
);

fs.writeFileSync(file, c);
console.log('Fixed ternary logic');
