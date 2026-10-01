const fs = require('fs');
const path = require('path');

const srcDir = 'c:/Users/USER/OneDrive/Documents/clipad/src';

function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(file));
    } else if (file.endsWith('.jsx') || file.endsWith('.js') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const allFiles = getFiles(srcDir);
const missingImports = new Set();

allFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  // Match `import ... from '@/...'` or `import('@/...')`
  const importRegex = /(?:from|import\(?)\s*['"]@\/([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    const fullPathWithoutExt = path.join(srcDir, importPath);
    const possibleExts = ['', '.js', '.jsx', '.ts', '.tsx', '/index.js', '/index.ts', '/index.jsx', '.css', '.json'];
    let found = false;
    
    for (const ext of possibleExts) {
      if (fs.existsSync(fullPathWithoutExt + ext)) {
        found = true;
        break;
      }
    }
    
    if (!found) {
      missingImports.add(importPath + ' (in ' + path.relative(srcDir, file) + ')');
    }
  }
  
  // Also match relative imports like `import ... from '../...'`
  const relRegex = /(?:from|import\(?)\s*['"](\.\.?\/[^'"]+)['"]/g;
  while ((match = relRegex.exec(content)) !== null) {
    const importPath = match[1];
    const fullPathWithoutExt = path.join(path.dirname(file), importPath);
    const possibleExts = ['', '.js', '.jsx', '.ts', '.tsx', '/index.js', '/index.ts', '/index.jsx', '.css', '.json'];
    let found = false;
    
    for (const ext of possibleExts) {
      if (fs.existsSync(fullPathWithoutExt + ext)) {
        found = true;
        break;
      }
    }
    
    if (!found) {
      missingImports.add(importPath + ' (in ' + path.relative(srcDir, file) + ')');
    }
  }
});

console.log('Missing imports found:');
Array.from(missingImports).forEach(i => console.log(i));
