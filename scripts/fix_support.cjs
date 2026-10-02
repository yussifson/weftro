const fs = require('fs');
let s = fs.readFileSync('src/pages/clipad/CliPadSupport.jsx', 'utf8');

// Page wrapper
s = s.replace(/min-h-full bg-transparent  text-white dark:text-slate-100/g, 'min-h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100');
s = s.replace(/min-h-full bg-transparent/g, 'min-h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100');

// Typography
s = s.replace(/text-white\/70/g, 'text-slate-500 dark:text-slate-400');
s = s.replace(/text-white\/90 dark:text-foreground/g, 'text-slate-900 dark:text-slate-100');

// Form Card
s = s.replace(/bg-\[#006065\] text-white dark:bg-\[#006065\] rounded-3xl p-8 border border-white\/15 dark:border-white\/15/g, 'bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white');

// Inputs
s = s.replace(/bg-white\/10 dark:bg-secondary border-white\/15 dark:border-white\/15 text-white dark:text-foreground/g, 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-[#006065] dark:focus:border-[#fad503]');
s = s.replace(/bg-white\/10 dark:bg-secondary/g, 'bg-slate-50 dark:bg-slate-800');

// Primary Buttons
s = s.replace(/bg-primary hover:bg-primary\/90 text-white/g, 'bg-[#006065] hover:bg-[#004e52] text-[#fad503]');
s = s.replace(/bg-primary\/20 text-primary hover:bg-primary\/30/g, 'bg-[#006065]/10 text-[#006065] dark:text-[#fad503] hover:bg-[#006065]/20 dark:hover:bg-[#006065]/40');
s = s.replace(/bg-primary hover:bg-primary\/90 text-primary-foreground/g, 'bg-[#006065] hover:bg-[#004e52] text-[#fad503]');

// Sent check mark
s = s.replace(/text-emerald-500/g, 'text-[#006065] dark:text-[#fad503]');
s = s.replace(/bg-emerald-500\/10/g, 'bg-[#006065]/10 dark:bg-[#006065]/30');
s = s.replace(/text-emerald-400/g, 'text-[#fad503]');

fs.writeFileSync('src/pages/clipad/CliPadSupport.jsx', s);
console.log('Support themed.');
