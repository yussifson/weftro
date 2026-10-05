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
      if (file.endsWith('.jsx') || file.endsWith('index.html')) results.push(file);
    }
  });
  return results;
}

const files = walk('src').concat(['index.html']);
let changedFiles = 0;
files.forEach(f => {
  if (!fs.existsSync(f)) return;
  let content = fs.readFileSync(f, 'utf8');
  let original = content;
  
  content = content.replace(/>\s*CliPad\s*</ig, '>KERINT<');
  content = content.replace(/"CliPad"/ig, '"KERINT"');
  content = content.replace(/'CliPad'/ig, "'KERINT'");
  content = content.replace(/CliPad - /ig, 'KERINT - ');
  content = content.replace(/Welcome to CliPad/ig, 'Welcome to KERINT');
  content = content.replace(/Sign in to CliPad/ig, 'Sign in to KERINT');
  content = content.replace(/New to CliPad/ig, 'New to KERINT');
  content = content.replace(/<title>CliPad/ig, '<title>KERINT');
  content = content.replace(/content="CliPad/ig, 'content="KERINT');
  content = content.replace(/CliPad Workspace/ig, 'KERINT Workspace');
  content = content.replace(/CliPad Admin/ig, 'KERINT Admin');
  content = content.replace(/CliPad Dashboard/ig, 'KERINT Dashboard');
  content = content.replace(/CliPad AI/ig, 'KERINT AI');

  if (content !== original) {
    fs.writeFileSync(f, content);
    changedFiles++;
    console.log('Updated:', f);
  }
});
console.log('Total files updated:', changedFiles);
