const fs = require('fs');
let content = fs.readFileSync('src/pages/clipad/MeetingRecord.jsx', 'utf8');

content = content.split('className="w-full px-3 py-2 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white dark:bg-black/50 text-white dark:text-white border border-amber-200/50"')
  .join('className="w-full px-3 py-2 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800"');

// Fix the "dark:bg-black/50 text-white dark:text-white" in general
content = content.replace(/dark:bg-black\/50 text-white dark:text-white/g, 'dark:bg-slate-900 text-slate-900 dark:text-white');
content = content.replace(/border-amber-200\/50/g, 'border-slate-200 dark:border-slate-800');

fs.writeFileSync('src/pages/clipad/MeetingRecord.jsx', content);
