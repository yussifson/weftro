const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.jsx')) results.push(file);
    }
  });
  return results;
}

const files = walk('src');
let matches = [];
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    if (line.match(/import /) || line.match(/className=/) || line.match(/id=/)) return;
    if (line.match(/>.*clipad.*</i) || line.match(/["'`].*clipad.*["'`]/i)) {
      if (!line.match(/clipad_/i) && !line.match(/\/clipad/i) && !line.match(/clipad\.com/i) && !line.match(/CliPadLogo/i)) {
        matches.push(`${f}:${i+1}:${line.trim()}`);
      }
    }
  });
});
console.log(matches.join('\n'));
