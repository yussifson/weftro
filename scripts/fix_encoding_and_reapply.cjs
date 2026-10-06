/**
 * Fix UTF-8 encoding corruption caused by PowerShell Set-Content.
 * 
 * Strategy:
 * 1. Get the list of files that had encoding corruption
 * 2. For each file, restore from the LAST GOOD commit (ad01a01) 
 * 3. Then re-apply all the dark mode fixes using Node.js (UTF-8 safe)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// The last commit BEFORE PowerShell corrupted files
const LAST_GOOD_COMMIT = 'ad01a01';

// Get list of files that were modified by PowerShell Set-Content
// (these are the ones that got encoding corruption)
const corruptedFiles = execSync(
  `git diff --name-only ${LAST_GOOD_COMMIT} HEAD -- src/`,
  { encoding: 'utf8', cwd: __dirname.replace(/[\\/]scripts$/, '') }
).trim().split('\n').filter(f => f.endsWith('.jsx') || f.endsWith('.tsx') || f.endsWith('.css'));

console.log(`Found ${corruptedFiles.length} files modified since last good commit`);

// Restore each file from the last good commit
let restored = 0;
for (const file of corruptedFiles) {
  try {
    execSync(`git checkout ${LAST_GOOD_COMMIT} -- "${file}"`, {
      cwd: __dirname.replace(/[\\/]scripts$/, ''),
      encoding: 'utf8'
    });
    restored++;
  } catch (e) {
    // File may not have existed in that commit (new file)
    console.log(`  Skipped (new file): ${file}`);
  }
}
console.log(`Restored ${restored} files from ${LAST_GOOD_COMMIT}`);

// Now re-apply ALL dark mode fixes using Node.js (UTF-8 safe)
function applyDarkModeFixes(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let totalFixes = 0;
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      totalFixes += applyDarkModeFixes(fullPath);
    } else if (entry.name.endsWith('.jsx') || entry.name.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const original = content;

      // ══════ WAVE 1: bg-[#006065] surfaces ══════
      // Sidebar files
      if (fullPath.includes('ClipadSidebar') || fullPath.includes('ClipadMobileNav')) {
        content = content.replace(/bg-\[#006065\](?!\s+dark:)/g, 'bg-[#006065] dark:bg-[#0D1626]');
      }
      // Top nav / layout canvas
      else if (fullPath.includes('ClipadTopNav') || fullPath.includes('ClipadLayout') || fullPath.includes('ClipadAdminLayout')) {
        content = content.replace(/bg-\[#006065\](?!\s+dark:)/g, 'bg-[#006065] dark:bg-[#0A0F1C]');
      }
      // Everything else - card surface
      else {
        content = content.replace(/bg-\[#006065\](?!\s+dark:)/g, 'bg-[#006065] dark:bg-[#131A2C]');
      }

      // ══════ WAVE 2: Semantic overrides ══════
      content = content
        .replace(/dark:bg-slate-900/g, 'dark:bg-card')
        .replace(/dark:bg-slate-950/g, 'dark:bg-background')
        .replace(/dark:border-slate-800/g, 'dark:border-border')
        .replace(/dark:border-slate-700/g, 'dark:border-border')
        .replace(/dark:hover:bg-slate-800/g, 'dark:hover:bg-accent')
        .replace(/dark:hover:bg-slate-700/g, 'dark:hover:bg-accent')
        .replace(/dark:text-slate-300/g, 'dark:text-muted-foreground')
        .replace(/dark:text-slate-400/g, 'dark:text-muted-foreground')
        .replace(/dark:text-white/g, 'dark:text-foreground');

      // border-[#006065] surfaces
      content = content.replace(/border-\[#006065\](?!\s+dark:)/g, 'border-[#006065] dark:border-border');

      // ══════ WAVE 3: Light-only classes ══════
      content = content.replace(/bg-white\/50(?!\s+dark:)/g, 'bg-white/50 dark:bg-background/80');
      content = content.replace(/bg-white\/80(?!\s+dark:)/g, 'bg-white/80 dark:bg-background/80');
      content = content.replace(/bg-white\/70(?!\s+dark:)/g, 'bg-white/70 dark:bg-background/80');
      content = content.replace(/bg-white\/90(?!\s+dark:)/g, 'bg-white/90 dark:bg-background/90');
      content = content.replace(/bg-white\/95(?!\s+dark:)/g, 'bg-white/95 dark:bg-background/95');
      content = content.replace(/bg-white(?![\w\/]|[\s]+dark:)/g, 'bg-white dark:bg-card');
      content = content.replace(/bg-slate-50(?!\s+dark:)/g, 'bg-slate-50 dark:bg-background');
      content = content.replace(/bg-gray-50(?!\s+dark:)/g, 'bg-gray-50 dark:bg-background');
      content = content.replace(/bg-gray-100(?!\s+dark:)/g, 'bg-gray-100 dark:bg-card');
      content = content.replace(/bg-slate-100(?!\s+dark:)/g, 'bg-slate-100 dark:bg-secondary');
      content = content.replace(/bg-slate-200(?!\s+dark:)/g, 'bg-slate-200 dark:bg-accent');
      content = content.replace(/bg-\[#f8fafc\](?!\s+dark:)/g, 'bg-[#f8fafc] dark:bg-background');
      content = content.replace(/text-slate-900(?!\s+dark:)/g, 'text-slate-900 dark:text-foreground');
      content = content.replace(/text-slate-700(?!\s+dark:)/g, 'text-slate-700 dark:text-foreground');
      content = content.replace(/text-slate-600(?!\s+dark:)/g, 'text-slate-600 dark:text-muted-foreground');
      content = content.replace(/text-slate-500(?!\s+dark:)/g, 'text-slate-500 dark:text-muted-foreground');
      content = content.replace(/border-slate-200(?!\s+dark:)/g, 'border-slate-200 dark:border-border');
      content = content.replace(/border-slate-300(?!\s+dark:)/g, 'border-slate-300 dark:border-border');
      content = content.replace(/hover:bg-slate-50(?!\s+dark:)/g, 'hover:bg-slate-50 dark:hover:bg-accent');
      content = content.replace(/hover:bg-slate-100(?!\s+dark:)/g, 'hover:bg-slate-100 dark:hover:bg-accent');
      content = content.replace(/text-\[#0f172a\](?!\s+dark:)/g, 'text-[#0f172a] dark:text-foreground');
      content = content.replace(/placeholder-slate-400(?!\s+dark:)/g, 'placeholder-slate-400 dark:placeholder-muted-foreground');

      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
        totalFixes++;
      }
    }
  }
  return totalFixes;
}

const srcDir = path.join(__dirname, '..', 'src');
const fixedCount = applyDarkModeFixes(srcDir);
console.log(`\n✅ Re-applied dark mode fixes to ${fixedCount} files (encoding preserved)`);
