const fs = require('fs');
const file = 'src/pages/clipad/IntegrationsHub.jsx';
const content = fs.readFileSync(file, 'utf8');

const match = content.match(/\{integration\?\.name\}(.*?)\s*Import Settings/);
if (match) {
    console.log("Matched literal:", JSON.stringify(match[1]));
}
