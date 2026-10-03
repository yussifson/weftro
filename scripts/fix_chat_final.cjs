const fs = require('fs');
let c = fs.readFileSync('src/pages/clipad/ClipadChat.jsx', 'utf8');

c = c.replace(
  /isMe \n \? "bg-\[#006065\] text-\[#fad503\]/g,
  'isMe \n ? "bg-[#006065] text-white'
);

c = c.replace(
  /isMe \s*\? "bg-\[#006065\] text-\[#fad503\]/g,
  'isMe \n ? "bg-[#006065] text-white'
);

c = c.replace(
  /className="text-xs text-white\/70 bg-\[#006065\] text-white border border-white\/15 px-3 py-1\.5 rounded-xl  tracking-\[0\.04em\]"/g,
  'className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl tracking-[0.04em]"'
);

// We must also verify if the message input area was replaced or not.
c = c.replace(
  /className="p-3 sm:p-4 bg-\[#006065\] border-t border-white\/10 shrink-0"/g,
  'className="p-3 sm:p-4 bg-white dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-800 shrink-0"'
);

c = c.replace(
  /className="flex-1 bg-white\/10 border-white\/20 text-white placeholder:text-white\/50 rounded-full px-4 py-5 focus-visible:ring-\[#00beac\]"/g,
  'className="flex-1 bg-slate-100 dark:bg-slate-950 border-transparent text-slate-900 dark:text-white placeholder:text-slate-500 rounded-full px-4 py-5 focus-visible:ring-[#006065] focus-visible:ring-2 focus-visible:border-transparent focus-visible:outline-none"'
);

// If the previous run failed to replace it because of exact spacing, let's use a simpler match:
c = c.split('bg-[#006065] text-[#fad503] font-medium').join('bg-[#006065] text-white font-medium');

fs.writeFileSync('src/pages/clipad/ClipadChat.jsx', c);
