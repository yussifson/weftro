const fs = require('fs');
let s = fs.readFileSync('src/pages/clipad/SaveMeetingPage.jsx', 'utf8');

// Page wrapper
s = s.replace(/min-h-full bg-transparent  p-6 md:p-12/g, 'min-h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6 md:p-12 page-enter');
s = s.replace(/text-3xl font-bold text-white dark:text-white/g, 'text-3xl font-bold text-slate-900 dark:text-white');
s = s.replace(/text-white\/70 dark:text-muted-foreground/g, 'text-slate-500 dark:text-slate-400');

// Form Card
s = s.replace(/bg-\[#006065\] text-white dark:bg-\[#006065\] rounded-2xl shadow-sm border border-white\/15 dark:border-white\/15/g, 'bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white');
s = s.replace(/text-white\/90 dark:text-foreground/g, 'text-slate-900 dark:text-slate-100');

// Input styles (if it uses standard Input component, it might be fine, but let's check for any custom classes)
s = s.replace(/bg-white\/10 text-white border-white\/20/g, 'bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700');
s = s.replace(/bg-white\/10 hover:bg-white\/20 text-white/g, 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white');

// Select styles
s = s.replace(/bg-white\/10 dark:bg-slate-800\/50/g, 'bg-slate-50 dark:bg-slate-800');

// Primary button
s = s.replace(/bg-primary hover:bg-primary\/90 text-white/g, 'bg-[#006065] hover:bg-[#004e52] text-[#fad503]');

// Icons/Badges
s = s.replace(/text-emerald-500/g, 'text-[#006065] dark:text-[#fad503]');

fs.writeFileSync('src/pages/clipad/SaveMeetingPage.jsx', s);
