const fs = require('fs');
let content = fs.readFileSync('src/pages/clipad/IntegrationsHub.jsx', 'utf8');

// 1. Remove bogus </>\n)}
content = content.replace(/<\/div>\s*<\/>\s*\)\}\s*\{\/\* Actions \*\/\}/g, '</div>\n      {/* Actions */}');

// 2. Insert missing </div>
// Find `            </>\n          )}\n{/*`
content = content.replace(/<\/>\s*\)\}\s*\{\/\*.*Scope Selector Modal/g, '</>\n          )}\n      </div>\n{/* Scope Selector Modal');

fs.writeFileSync('src/pages/clipad/IntegrationsHub.jsx', content, 'utf8');
console.log('Regex replace executed');
