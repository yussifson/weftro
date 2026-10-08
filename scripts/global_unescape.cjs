const fs = require('fs');
const path = require('path');

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      walk(path.join(dir, file), fileList);
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

const allFiles = walk('src');
const badFiles = [];
for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('\\`') || content.includes('\\$')) {
    badFiles.push(file);
    
    // Fix it directly
    let fixedContent = content.replace(/\\`/g, '`').replace(/\\\$/g, '$');
    fs.writeFileSync(file, fixedContent, 'utf8');
  }
}
console.log('Fixed files:', badFiles);
