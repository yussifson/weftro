const fs = require('fs');

let f = fs.readFileSync('src/pages/clipad/CliPadSettings.jsx', 'utf8');

// Page wrapper
f = f.replace(/min-h-full bg-\[#f8fafc\] text-white/g, 'min-h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100');

// Sidebar Tabs
f = f.replace(/bg-\[#fad503\] text-\[#006065\] border-\[#00beac\]/g, 'bg-white dark:bg-slate-900 text-[#006065] dark:text-[#fad503] border-slate-200 dark:border-slate-800');
f = f.replace(/bg-\[#006065\] text-white\/80 border-white\/10 hover:bg-white\/10 hover:text-white/g, 'bg-transparent text-slate-600 dark:text-slate-400 border-transparent hover:bg-white dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white');
f = f.replace(/text-\[#00beac\]/g, 'text-[#006065] dark:text-[#fad503]');
f = f.replace(/text-white\/70/g, 'text-slate-500 dark:text-slate-400');

// Cards (Enterprise Features, Profile, Notifications, Meeting Defaults)
f = f.replace(/bg-\[#006065\] border border-white\/10 rounded-2xl p-4 md:p-8 text-white shadow-md/g, 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-8 text-slate-900 dark:text-white shadow-sm');
f = f.replace(/bg-\[#006065\] border border-white\/10 rounded-3xl p-6 sm:p-10 mb-8 shadow-md text-white/g, 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 mb-8 shadow-sm text-slate-900 dark:text-white');

// Inner elements inside cards
f = f.replace(/bg-white\/10 text-white/g, 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white');
f = f.replace(/border-white\/20/g, 'border-slate-200 dark:border-slate-700');
f = f.replace(/border-white\/10/g, 'border-slate-200 dark:border-slate-700');
f = f.replace(/bg-white\/5/g, 'bg-slate-50 dark:bg-slate-800/50');
f = f.replace(/text-white/g, 'text-slate-900 dark:text-white');
f = f.replace(/bg-\[#fad503\] text-\[#006065\]/g, 'bg-[#006065] text-white dark:bg-[#fad503] dark:text-[#006065]');
f = f.replace(/text-\[#fad503\]/g, 'text-[#006065] dark:text-[#fad503]');

// Toggles
f = f.replace(/bg-\[#00beac\]/g, 'bg-[#006065] dark:bg-[#fad503]');
f = f.replace(/bg-white\/20/g, 'bg-slate-200 dark:bg-slate-700');
f = f.replace(/bg-\[#006065\]/g, 'bg-white');

fs.writeFileSync('src/pages/clipad/CliPadSettings.jsx', f);
