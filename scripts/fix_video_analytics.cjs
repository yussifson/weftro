const fs = require('fs');
let va = fs.readFileSync('src/pages/clipad/VideoAnalytics.jsx', 'utf8');

// 1. Wrapper text color
va = va.replace(/className="min-h-full bg-transparent  text-white dark:text-slate-100 page-enter/g, 'className="min-h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 page-enter');

// 2. StatCard Background and Text
va = va.replace(/bg-white\/60 dark:bg-\[#006065\]\/60/g, 'bg-white dark:bg-slate-900');
va = va.replace(/border-white\/15 dark:border-white\/15/g, 'border-slate-200 dark:border-slate-800');
va = va.replace(/text-white dark:text-white/g, 'text-slate-900 dark:text-white');
va = va.replace(/text-white\/70 dark:text-muted-foreground/g, 'text-slate-500 dark:text-slate-400');
va = va.replace(/bg-primary\/10 text-primary/g, 'bg-[#006065]/10 dark:bg-[#006065]/30 text-[#006065] dark:text-[#fad503]');
va = va.replace(/text-white\/70 bg-white\/10 border-white\/15 dark:bg-secondary dark:border-white\/15/g, 'text-slate-500 bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400');

// 3. Header colors
va = va.replace(/text-emerald-500/g, 'text-[#006065] dark:text-[#fad503]');

// 4. "Views Over Time" card
va = va.replace(/bg-\[#006065\] text-white dark:bg-\[#006065\]/g, 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white');
// And wait, inside the chart stroke `#00beac` -> `#006065`
va = va.replace(/stopColor="#00beac"/g, 'stopColor="#006065"');
va = va.replace(/stroke="#00beac"/g, 'stroke="#006065"');

// 5. "Engagement Score" purple card
va = va.replace(/bg-gradient-to-br from-indigo-500 to-purple-600 text-white/g, 'bg-[#006065] text-white');
va = va.replace(/bg-white\/20 h-2/g, 'bg-white/10 h-2');

// 6. Top Videos List and Viewers Panel
va = va.replace(/bg-white\/60 dark:bg-secondary\/30/g, 'bg-white dark:bg-slate-900');
va = va.replace(/hover:bg-black\/5 dark:hover:bg-white\/5/g, 'hover:bg-slate-50 dark:hover:bg-slate-800');
va = va.replace(/text-black dark:text-white/g, 'text-slate-900 dark:text-white'); // generic

fs.writeFileSync('src/pages/clipad/VideoAnalytics.jsx', va);
console.log('VideoAnalytics styled.');
