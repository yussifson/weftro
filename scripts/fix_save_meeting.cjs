const fs = require('fs');
let content = fs.readFileSync('src/pages/clipad/SaveMeetingPage.jsx', 'utf8');

// Form inputs
content = content.replace(
  /className="w-full pl-4 pr-10 py-3 rounded-xl bg-\[#006065\] text-white dark:bg-\[#006065\] border border-white\/15 dark:border-white\/15 text-white dark:text-white text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500\/30 focus:border-emerald-500\/60 transition-all cursor-pointer shadow-sm"/g,
  'className="w-full pl-4 pr-10 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#006065]/20 focus:border-[#006065] transition-all cursor-pointer shadow-sm"'
);
content = content.replace(
  /className="w-full pl-10 pr-8 py-2\.5 rounded-xl bg-\[#006065\] text-white dark:bg-\[#006065\] border border-white\/15 dark:border-white\/15 text-white dark:text-white text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500\/30 focus:border-emerald-500\/60 transition-all cursor-pointer font-semibold shadow-sm"/g,
  'className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#006065]/20 focus:border-[#006065] transition-all cursor-pointer font-semibold shadow-sm"'
);
content = content.replace(
  /className="bg-\[#006065\] text-white dark:bg-\[#006065\]"/g,
  'className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-200 dark:border-slate-800 focus-visible:ring-[#006065]"'
);

// Any other massive inputs:
// text input for title
content = content.replace(
  /className="w-full px-4 py-3 rounded-xl bg-\[#006065\] text-white dark:bg-\[#006065\] border border-white\/15 dark:border-white\/15 text-white dark:text-white text-[15px] placeholder-white\/50 focus:outline-none focus:ring-2 focus:ring-emerald-500\/30 focus:border-emerald-500\/60 transition-all shadow-sm"/g,
  'className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-[15px] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#006065]/20 focus:border-[#006065] transition-all shadow-sm"'
);

// If the previous regex fails due to exact class matching, just do split.join for the common classes
content = content.split('bg-[#006065] text-white dark:bg-[#006065] border border-white/15 dark:border-white/15 text-white dark:text-white')
  .join('bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white');

content = content.split('placeholder-white/50').join('placeholder-slate-400');
content = content.split('focus:ring-emerald-500/30 focus:border-emerald-500/60').join('focus:ring-[#006065]/20 focus:border-[#006065]');

fs.writeFileSync('src/pages/clipad/SaveMeetingPage.jsx', content);
