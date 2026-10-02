const fs = require('fs');

let r = fs.readFileSync('src/pages/clipad/MeetingRecord.jsx', 'utf8');

// Page wrapper
r = r.replace(/min-h-full bg-transparent/g, 'min-h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100');

// Header and typography
r = r.replace(/text-white\/15/g, 'border-slate-200 dark:border-slate-800'); // wait this might affect bg
r = r.replace(/text-xl md:text-3xl font-bold text-white dark:text-white/g, 'text-xl md:text-3xl font-bold text-slate-900 dark:text-white');
r = r.replace(/text-white\/70 dark:text-muted-foreground/g, 'text-slate-500 dark:text-slate-400');
r = r.replace(/text-white\/90 dark:text-foreground/g, 'text-slate-900 dark:text-white');

// Buttons / pending states
r = r.replace(/bg-white\/10 dark:bg-secondary hover:bg-white\/15 dark:hover:bg-slate-700/g, 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white');
r = r.replace(/bg-white\/15 dark:bg-slate-800/g, 'bg-slate-200 dark:bg-slate-800');
r = r.replace(/border-white\/15 dark:border-white\/15/g, 'border-slate-200 dark:border-slate-800');

// "AI Summary Ready" pink badge is okay to keep pink or change to teal. Let's change to teal:
r = r.replace(/bg-pink-500\/10 border border-pink-500\/20 text-pink-600 dark:text-pink-400/g, 'bg-[#006065]/10 dark:bg-[#006065]/30 border border-[#006065]/20 text-[#006065] dark:text-[#fad503]');

// Cards (Action Items, Transcripts, etc)
r = r.replace(/bg-\[#006065\] text-white border border-white\/15/g, 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800');
r = r.replace(/bg-\[#006065\] text-white/g, 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white');
r = r.replace(/border-white\/15/g, 'border-slate-200 dark:border-slate-800');
r = r.replace(/bg-white\/10/g, 'bg-slate-100 dark:bg-slate-800');

fs.writeFileSync('src/pages/clipad/MeetingRecord.jsx', r);
