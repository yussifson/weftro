const fs = require('fs');
const path = require('path');

function search(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (['node_modules', '.git', 'dist', 'dev-dist'].includes(entry.name)) continue;
    if (entry.isDirectory()) {
      search(full);
    } else if (/\.(jsx?|tsx?)$/i.test(entry.name)) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.includes("classList.add('light')") || content.includes("classList.remove('dark')")) {
        console.log('Found force-light in:', full);
      }
    }
  }
}

search(path.resolve(__dirname, '../src'));
