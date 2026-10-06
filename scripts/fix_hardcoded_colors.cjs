const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let original = content;

      content = content
        .replace(/bg-\[#f8fafc\](?!\s+dark:)/g, 'bg-[#f8fafc] dark:bg-background')
        .replace(/dark:bg-slate-900/g, 'dark:bg-card')
        .replace(/dark:bg-slate-950/g, 'dark:bg-background')
        .replace(/dark:border-slate-800/g, 'dark:border-border')
        .replace(/dark:border-slate-700/g, 'dark:border-border')
        .replace(/dark:hover:bg-slate-800/g, 'dark:hover:bg-accent')
        .replace(/dark:hover:bg-slate-700/g, 'dark:hover:bg-accent')
        .replace(/dark:text-slate-300/g, 'dark:text-muted-foreground')
        .replace(/dark:text-slate-400/g, 'dark:text-muted-foreground')
        .replace(/dark:text-white/g, 'dark:text-foreground');

      // Also clean up any border-[#006065] (which was the hardcoded teal) 
      // in dark mode, we want border-border or similar. 
      // Actually, if it's border-[#006065], we can add dark:border-border
      content = content.replace(/border-\[#006065\](?!\s+dark:)/g, 'border-[#006065] dark:border-border');

      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDir(path.join(__dirname, '..', 'src'));
console.log('Done!');
