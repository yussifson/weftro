const fs = require('fs');

let m = fs.readFileSync('src/pages/clipad/MeetingsList.jsx', 'utf8');

// Page wrapper
m = m.replace(/min-h-full bg-transparent  text-white dark:text-slate-100/g, 'min-h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100');

// Page header text
m = m.replace(/text-white\/70 dark:text-muted-foreground/g, 'text-slate-500 dark:text-slate-400');
m = m.replace(/text-primary/g, 'text-[#006065] dark:text-[#fad503]');
m = m.replace(/bg-primary hover:bg-primary\/90 text-white/g, 'bg-[#006065] hover:bg-[#004e52] text-[#fad503]');
m = m.replace(/shadow-primary\/20/g, 'shadow-[#006065]/20');

// Search & Filter
m = m.replace(/bg-white\/95 dark:bg-\[#202c33\]\/95 border border-black\/5 dark:border-white\/5 text-white dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:border-primary\/50/g, 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:border-[#006065] dark:focus:border-[#fad503]');
m = m.replace(/bg-white\/95 dark:bg-\[#202c33\]\/95 rounded-xl border border-black\/5 dark:border-white\/5/g, 'bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800');
m = m.replace(/text-white\/60 dark:text-white\/70/g, 'text-slate-400');
m = m.replace(/bg-black\/5 dark:bg-white\/10 text-white dark:text-white/g, 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white');
m = m.replace(/text-white\/70 hover:text-white\/90/g, 'text-slate-500 hover:text-slate-900');

// Empty state
m = m.replace(/border-white\/20 dark:border-white\/15/g, 'border-slate-200 dark:border-slate-800');
m = m.replace(/text-white\/50 dark:text-white\/90 mx-auto/g, 'text-slate-400 mx-auto');
m = m.replace(/text-xl font-bold text-white\/70 dark:text-muted-foreground/g, 'text-xl font-bold text-slate-900 dark:text-white');
m = m.replace(/text-white\/60 dark:text-white\/70 text-sm/g, 'text-slate-500 text-sm');

// Cards
m = m.replace(/bg-[#006065] text-white dark:bg-[#006065] animate-pulse border border-white\/15 dark:border-white\/15/g, 'bg-white dark:bg-slate-900 animate-pulse border border-slate-200 dark:border-slate-800');
m = m.replace(/bg-white\/95 dark:bg-\[#202c33\]\/95 border border-black\/5 dark:border-white\/5 hover:border-primary\/50 dark:hover:border-primary\/50/g, 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#006065]/50 dark:hover:border-[#fad503]/50');
m = m.replace(/text-lg font-bold text-white dark:text-white group-hover:text-primary/g, 'text-lg font-bold text-slate-900 dark:text-white group-hover:text-[#006065] dark:group-hover:text-[#fad503]');
m = m.replace(/bg-white\/10 dark:bg-secondary text-white\/70 dark:text-muted-foreground text-\[10px\]/g, 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px]');
m = m.replace(/text-white\/60 dark:text-muted-foreground/g, 'text-slate-500 dark:text-slate-400');
m = m.replace(/bg-primary\/10 text-primary dark:text-primary/g, 'bg-[#006065]/10 dark:bg-[#006065]/30 text-[#006065] dark:text-[#fad503]');

// Badges
m = m.replace(/bg-rose-50 dark:bg-rose-500\/10 text-rose-600 dark:text-rose-400/g, 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400');

fs.writeFileSync('src/pages/clipad/MeetingsList.jsx', m);
