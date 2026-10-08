const fs = require('fs');
const path = 'src/pages/clipad/IntegrationsHub.jsx';
let content = fs.readFileSync(path, 'utf8');

// Replace "A??," and "A,A" with empty space or bullet
content = content.replace(/A[,\?]+[o\?z]+/g, '—');
content = content.replace(/A,A/g, '•');
content = content.replace(/A\?\?,/g, '');
content = content.replace(/A\?\?,/g, '');
content = content.replace(/A?/g, '');
content = content.replace(/A,\?\?/g, '');
content = content.replace(/A,\?o\?z/g, '');

fs.writeFileSync(path, content);
console.log('IntegrationsHub cleaned!');
