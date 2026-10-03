const fs = require('fs');
let c = fs.readFileSync('src/pages/clipad/ClipadChat.jsx', 'utf8');

c = c.replace(
  /isActive \? "bg-\[#00beac\] text-\[#00beac\] font-bold" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"/g,
  'isActive ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-sm border border-slate-200 dark:border-slate-700" : "hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 cursor-pointer"'
);

c = c.replace(
  /className="w-11 h-11 rounded-full bg-\[#00beac\] text-\[#00beac\] hover:bg-\[#00beac\]\/90 shrink-0 shadow-lg transition-all hover:scale-105 active:scale-95"/g,
  'className="w-11 h-11 rounded-full bg-[#006065] text-white hover:bg-[#004e52] shrink-0 shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center"'
);

fs.writeFileSync('src/pages/clipad/ClipadChat.jsx', c);
