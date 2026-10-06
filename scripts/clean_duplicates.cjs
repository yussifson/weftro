const fs = require('fs');
const path = require('path');

let totalFixes = 0;

function cleanDuplicateDarkClasses(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      cleanDuplicateDarkClasses(fullPath);
    } else if (entry.name.endsWith('.jsx') || entry.name.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const original = content;

      // Clean up messy duplicate dark: classes that resulted from multiple script passes
      content = content.replace(/dark:bg-\[[^\]]+\](?:\/\d+)?\s+dark:bg-\[[^\]]+\](?:\/\d+)?\s+dark:bg-\[[^\]]+\](?:\/\d+)?/g, 'dark:bg-card');
      content = content.replace(/dark:bg-\[[^\]]+\](?:\/\d+)?\s+dark:bg-\[[^\]]+\](?:\/\d+)?/g, 'dark:bg-card');
      
      // Fix specific messy border class duplicates
      content = content.replace(/dark:border-border\/\d+\s+dark:border-\[[^\]]+\]\s+dark:border-border\/\d+/g, 'dark:border-border');
      content = content.replace(/dark:border-border\/\d+\s+dark:border-border/g, 'dark:border-border');
      content = content.replace(/dark:border-\[[^\]]+\]\s+dark:border-border/g, 'dark:border-border');

      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Cleaned duplicates in ${fullPath}`);
        totalFixes++;
      }
    }
  }
}

cleanDuplicateDarkClasses(path.join(__dirname, '..', 'src'));
console.log(`Cleaned duplicates in ${totalFixes} files`);
