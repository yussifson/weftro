const fs = require('fs');
let c = fs.readFileSync('src/pages/clipad/ClipadChat.jsx', 'utf8');

c = c.replace(
  /isActive \? "bg-\[#00beac\] text-\[#00beac\] rounded-xl font-bold shadow-md mx-2 my-1" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 rounded-xl mx-2 my-1"/g,
  'isActive ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-bold shadow-sm border border-slate-200 dark:border-slate-700 mx-2 my-1" : "hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 rounded-xl mx-2 my-1 cursor-pointer transition-colors"'
);

// We also need to fix the fallback if the text replaced the first time wasn't correct.
c = c.replace(
  /isActive \? "bg-\[#00beac\] text-\[#00beac\] rounded-xl font-bold shadow-md mx-2 my-1" : "hover:bg-white\/10 text-white rounded-xl mx-2 my-1"/g,
  'isActive ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-bold shadow-sm border border-slate-200 dark:border-slate-700 mx-2 my-1" : "hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 rounded-xl mx-2 my-1 cursor-pointer transition-colors"'
);

c = c.replace(
  /isActive \? "bg-\[#006065\] text-\[#fad503\]" : "bg-white\/10 text-\[#fad503\]"/g,
  'isActive ? "bg-[#006065] text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400"'
);

c = c.replace(
  /border border-white\/20/g,
  'border border-slate-200 dark:border-slate-700'
);

c = c.replace(
  /isActive \? "text-\[#00beac\]" : "text-white"/g,
  'isActive ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-300"'
);

c = c.replace(
  /isActive \? "text-\[#00beac\]\/80" : "text-white\/60"/g,
  'isActive ? "text-slate-500 dark:text-slate-400" : "text-slate-500 dark:text-slate-400"'
);

fs.writeFileSync('src/pages/clipad/ClipadChat.jsx', c);
