const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(__dirname, '../src/pages/MeetLandingPage.jsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Clock container in header
content = content.replace(
  'bg-slate-100 dark:bg-secondary/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-border/60 shadow-inner text-slate-700 dark:text-foreground',
  'bg-secondary/80 px-3 py-1.5 rounded-xl border border-border shadow-inner text-foreground'
);

// 2. LanguageSwitcher border/bg
content = content.replace(
  'border border-slate-200 dark:border-border bg-background hover:bg-slate-50 dark:hover:bg-secondary text-slate-700 dark:text-foreground',
  'border border-border bg-background hover:bg-secondary text-foreground'
);

// 3. Dropdown Menu
content = content.replace(
  'border-slate-100 rounded-xl',
  'border-border bg-popover text-popover-foreground rounded-xl shadow-xl'
);
content = content.replace(
  /hover:bg-slate-50 dark:bg-background/g,
  'hover:bg-secondary'
);
content = content.replace(
  /text-slate-700 dark:text-foreground/g,
  'text-foreground'
);

// 4. Meeting code input
content = content.replace(
  'border-slate-200 dark:border-border rounded-xl leading-5 bg-transparent placeholder-slate-400 dark:placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary',
  'border-border rounded-xl leading-5 bg-card/60 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#fad503] focus:border-[#fad503]'
);

// 5. Slide carousel navigation buttons
content = content.replace(
  /bg-white dark:bg-card hover:bg-slate-50 dark:bg-background shadow-md border border-slate-100/g,
  'bg-card hover:bg-secondary text-foreground shadow-md border border-border'
);

// 6. Slide indicator dots
content = content.replace(
  'bg-slate-200 dark:bg-accent w-2 hover:bg-slate-300',
  'bg-muted w-2 hover:bg-muted-foreground/40'
);

// 7. Support panel header border
content = content.replace(
  'border-b border-slate-100',
  'border-b border-border'
);
content = content.replace(
  'bg-white dark:bg-card shadow-[-10px_0_30px_rgba(0,0,0,0.05)]',
  'bg-card shadow-[-10px_0_30px_rgba(0,0,0,0.5)] border-l border-border'
);

// 8. Contact section support cards
content = content.replace(
  /bg-primary\/10 flex items-center justify-center mb-6/g,
  'bg-secondary flex items-center justify-center mb-6 border border-border'
);

// 9. Input boxes in support form
content = content.replace(
  /className="w-full mt-1 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary\/50"/g,
  'className="w-full mt-1 px-4 py-2 bg-background border border-border text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-[#fad503]/50"'
);

// 10. Dialog share link popup
content = content.replace(
  'bg-white dark:bg-[#1a1f2e]',
  'bg-card border-border'
);
content = content.replace(
  'bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4',
  'bg-background border border-border rounded-2xl p-4'
);
content = content.replace(
  'bg-white dark:bg-white/5 px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10',
  'bg-card px-4 py-3 rounded-xl border border-border'
);
content = content.replace(
  'text-slate-700 dark:text-slate-200 font-mono',
  'text-foreground font-mono'
);

fs.writeFileSync(targetFile, content, 'utf8');
console.log('Polished MeetLandingPage.jsx dark classes');
