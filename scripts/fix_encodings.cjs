const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

const replacements = [
  { bad: /Ã¢â‚¬â€ /g, good: '—' },
  { bad: /Ã¢â‚¬Â¢/g, good: '•' },
  { bad: /Ã¢â€ \â‚¬/g, good: '─' },
  { bad: /Ã¢â€ â‚¬/g, good: '─' }
];

let filesFixed = 0;

walk('src', (filePath) => {
  if (filePath.endsWith('.jsx') || filePath.endsWith('.js')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    for (let r of replacements) {
      content = content.replace(r.bad, r.good);
    }

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      filesFixed++;
    }
  }
});

console.log(`Fixed encodings in ${filesFixed} files.`);
