const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(__dirname, '../src/pages/clipad/CliPadCustomPricing.jsx');
let content = fs.readFileSync(targetFile, 'utf8');

// Root background and text
content = content.replace(
  'min-h-screen bg-[#fafbfc] dark:bg-[#090d16] text-white dark:text-slate-100',
  'min-h-screen bg-background text-foreground'
);

// Header
content = content.replace(
  'bg-white/95 dark:bg-[#090d16]/95 border-b border-white/15/80 dark:border-white/10',
  'bg-background/85 border-b border-border'
);
content = content.replace(
  'text-white/80 dark:text-foreground/60 hover:text-white dark:hover:text-white',
  'text-muted-foreground hover:text-foreground'
);
content = content.replace(
  'bg-[#006065] dark:bg-[#131A2C] hover:bg-slate-800 text-white dark:bg-card text-white dark:hover:bg-white/15 dark:text-foreground',
  'bg-[#fad503] hover:bg-yellow-400 text-[#0B1418] font-bold'
);

// Success box
content = content.replace(
  'bg-[#006065] dark:bg-[#131A2C] text-white dark:bg-[#111625] border border-white/15 dark:border-white/10 rounded-3xl p-8 md:p-12 shadow-xl',
  'bg-card border border-border rounded-3xl p-8 md:p-12 shadow-xl'
);
content = content.replace(
  'bg-[#006065] dark:bg-[#131A2C]/10 text-[#006065] dark:text-[#00beac]',
  'bg-[#fad503]/15 text-[#fad503]'
);
content = content.replace(
  'text-white/80 dark:text-foreground/60',
  'text-muted-foreground'
);
content = content.replace(
  'text-[#006065] dark:text-[#00beac] flex items-center gap-1',
  'text-[#fad503] flex items-center gap-1'
);

// Form Card on right
content = content.replace(
  'lg:col-span-7 bg-[#006065] dark:bg-[#131A2C] text-white dark:bg-[#111625] border border-white/15 dark:border-white/10 rounded-3xl p-6 md:p-8 shadow-sm',
  'lg:col-span-7 bg-card border border-border rounded-3xl p-6 md:p-8 shadow-md'
);

// Lock icon
content = content.replace(
  '<Lock className="w-3 h-3 text-[#006065]" />',
  '<Lock className="w-3 h-3 text-[#fad503]" />'
);

fs.writeFileSync(targetFile, content, 'utf8');
console.log('CliPadCustomPricing.jsx updated to dark theme tokens');
