const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

let filesFixed = 0;

walk('src', (filePath) => {
  if (filePath.endsWith('.jsx') || filePath.endsWith('.js')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    content = content.split('Ã¢â‚¬â€').join('—');
    content = content.split('Ã¢â‚¬Â¢').join('•');
    content = content.split('Ã¢â€â‚¬').join('─');
    content = content.split('Ã¢â€ â‚¬').join('─');

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      filesFixed++;
    }
  }
});

console.log(`Fixed encodings in ${filesFixed} files.`);
