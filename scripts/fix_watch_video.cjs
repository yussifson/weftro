const fs = require('fs');
let content = fs.readFileSync('src/pages/clipad/WatchVideo.jsx', 'utf8');

content = content.split('className="w-full px-3 py-2 rounded-lg text-sm bg-[#006065] text-white dark:bg-black/50 text-white dark:text-white border border-amber-200/50"')
  .join('className="w-full px-3 py-2 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 focus:ring-[#006065]"');

content = content.split('className="flex-1 py-3 rounded-xl bg-[#006065] text-white dark:bg-secondary hover:bg-transparent dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold text-sm transition-all border border-white/15 dark:border-white/15 shadow-sm"')
  .join('className="flex-1 py-3 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 font-semibold text-sm shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"');

fs.writeFileSync('src/pages/clipad/WatchVideo.jsx', content);
