const fs = require('fs');
const path = require('path');

let totalChanges = 0;
let fileCount = 0;

function processDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      processDir(fullPath);
    } else if (entry.name.endsWith('.jsx') || entry.name.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let original = content;
      let changes = 0;

      // ─── NAV / HEADER BARS with bg-white/50 or bg-white/80 ───
      // These are semi-transparent white overlays that look terrible in dark mode
      content = content.replace(/bg-white\/50(?!\s+dark:)/g, () => { changes++; return 'bg-white/50 dark:bg-background/80'; });
      content = content.replace(/bg-white\/80(?!\s+dark:)/g, () => { changes++; return 'bg-white/80 dark:bg-background/80'; });
      content = content.replace(/bg-white\/70(?!\s+dark:)/g, () => { changes++; return 'bg-white/70 dark:bg-background/80'; });
      content = content.replace(/bg-white\/90(?!\s+dark:)/g, () => { changes++; return 'bg-white/90 dark:bg-background/90'; });
      content = content.replace(/bg-white\/95(?!\s+dark:)/g, () => { changes++; return 'bg-white/95 dark:bg-background/95'; });

      // ─── SOLID bg-white on containers (NOT on small elements) ───
      // Only match bg-white that's NOT already followed by dark:
      content = content.replace(/bg-white(?![\w\/]|[\s]+dark:)/g, () => { changes++; return 'bg-white dark:bg-card'; });

      // ─── bg-slate-50 (light gray canvas) ───
      content = content.replace(/bg-slate-50(?!\s+dark:)/g, () => { changes++; return 'bg-slate-50 dark:bg-background'; });

      // ─── bg-gray-50 ───
      content = content.replace(/bg-gray-50(?!\s+dark:)/g, () => { changes++; return 'bg-gray-50 dark:bg-background'; });
      content = content.replace(/bg-gray-100(?!\s+dark:)/g, () => { changes++; return 'bg-gray-100 dark:bg-card'; });

      // ─── bg-slate-100 (slightly raised surface) ───
      content = content.replace(/bg-slate-100(?!\s+dark:)/g, () => { changes++; return 'bg-slate-100 dark:bg-secondary'; });

      // ─── bg-slate-200 (borders and disabled states) ───
      content = content.replace(/bg-slate-200(?!\s+dark:)/g, () => { changes++; return 'bg-slate-200 dark:bg-accent'; });

      // ─── text-slate-900 without dark override ───
      content = content.replace(/text-slate-900(?!\s+dark:)/g, () => { changes++; return 'text-slate-900 dark:text-foreground'; });

      // ─── text-slate-700 without dark override ───
      content = content.replace(/text-slate-700(?!\s+dark:)/g, () => { changes++; return 'text-slate-700 dark:text-foreground'; });

      // ─── text-slate-600 without dark override ───
      content = content.replace(/text-slate-600(?!\s+dark:)/g, () => { changes++; return 'text-slate-600 dark:text-muted-foreground'; });

      // ─── text-slate-500 without dark override ───
      content = content.replace(/text-slate-500(?!\s+dark:)/g, () => { changes++; return 'text-slate-500 dark:text-muted-foreground'; });

      // ─── border-slate-200 without dark override ───
      content = content.replace(/border-slate-200(?!\s+dark:)/g, () => { changes++; return 'border-slate-200 dark:border-border'; });

      // ─── border-slate-300 without dark override ───
      content = content.replace(/border-slate-300(?!\s+dark:)/g, () => { changes++; return 'border-slate-300 dark:border-border'; });

      // ─── hover:bg-slate-50 without dark override ───
      content = content.replace(/hover:bg-slate-50(?!\s+dark:)/g, () => { changes++; return 'hover:bg-slate-50 dark:hover:bg-accent'; });

      // ─── hover:bg-slate-100 ───
      content = content.replace(/hover:bg-slate-100(?!\s+dark:)/g, () => { changes++; return 'hover:bg-slate-100 dark:hover:bg-accent'; });

      // ─── text-[#0f172a] (hardcoded near-black) ───
      content = content.replace(/text-\[#0f172a\](?!\s+dark:)/g, () => { changes++; return 'text-[#0f172a] dark:text-foreground'; });

      // ─── placeholder-slate-400 ───
      content = content.replace(/placeholder-slate-400(?!\s+dark:)/g, () => { changes++; return 'placeholder-slate-400 dark:placeholder-muted-foreground'; });

      if (changes > 0) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`  ${fullPath}: ${changes} fixes`);
        totalChanges += changes;
        fileCount++;
      }
    }
  }
}

processDir(path.join(__dirname, '..', 'src'));
console.log(`\n✅ Total: ${totalChanges} replacements across ${fileCount} files`);
