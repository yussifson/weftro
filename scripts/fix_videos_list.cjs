const fs = require('fs');

let f = fs.readFileSync('src/pages/clipad/VideosList.jsx', 'utf8');

// Page wrapper
f = f.replace(/min-h-full bg-transparent  text-white dark:text-slate-100/g, 'min-h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100');

// Page Header texts
f = f.replace(/text-white\/70 dark:text-muted-foreground/g, 'text-slate-500 dark:text-slate-400');
f = f.replace(/text-primary/g, 'text-[#006065] dark:text-[#fad503]');
f = f.replace(/bg-primary hover:bg-primary\/90 text-white/g, 'bg-[#006065] hover:bg-[#004e52] text-[#fad503]');
f = f.replace(/shadow-primary\/20/g, 'shadow-md shadow-[#006065]/20');

// Search Bar
f = f.replace(/bg-white\/10 dark:bg-slate-800\/50/g, 'bg-slate-200 dark:bg-slate-800');
f = f.replace(/text-white dark:text-white/g, 'text-slate-900 dark:text-white');
f = f.replace(/placeholder:text-white\/50/g, 'placeholder:text-slate-400');

// Empty State
f = f.replace(/border-black\/10 dark:border-white\/10 rounded-3xl bg-transparent/g, 'border-slate-200 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900');
f = f.replace(/text-white\/50 dark:text-white\/90 mx-auto/g, 'text-slate-400 mx-auto');
f = f.replace(/text-xl font-bold text-white\/70 dark:text-muted-foreground/g, 'text-xl font-bold text-slate-900 dark:text-white');
f = f.replace(/text-white\/60 dark:text-white\/70 text-sm/g, 'text-slate-500 text-sm');

// Cards
f = f.replace(/bg-white\/95 dark:bg-\[#202c33\]\/95 backdrop-blur-3xl border border-black\/5 dark:border-white\/5 hover:border-primary\/30/g, 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#006065]/30 dark:hover:border-[#fad503]/30');
f = f.replace(/text-sm font-bold text-white dark:text-white truncate/g, 'text-sm font-bold text-slate-900 dark:text-white truncate');
f = f.replace(/text-xs text-white\/70 dark:text-muted-foreground/g, 'text-xs text-slate-500 dark:text-slate-400');
f = f.replace(/group-hover:text-primary/g, 'group-hover:text-[#006065] dark:group-hover:text-[#fad503]');
f = f.replace(/bg-white\/10 dark:bg-secondary text-white\/70 dark:text-muted-foreground text-\[10px\] uppercase font-bold/g, 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold');

fs.writeFileSync('src/pages/clipad/VideosList.jsx', f);
