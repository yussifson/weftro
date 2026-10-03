const fs = require('fs');
let c = fs.readFileSync('src/pages/clipad/ClipadChat.jsx', 'utf8');

c = c.replace(
  /"flex flex-col bg-\[#006065\] text-white border-r border-white\/10 transition-all duration-300 z-20 shrink-0"/g,
  '"flex flex-col bg-slate-50 dark:bg-slate-900/40 text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 transition-all duration-300 z-20 shrink-0"'
);

c = c.replace(
  /"border-b border-white\/10 flex items-center justify-between shrink-0"/g,
  '"border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0"'
);

c = c.replace(
  /<h2 className="font-bold text-lg text-white">Chats<\/h2>/g,
  '<h2 className="font-bold text-lg text-slate-900 dark:text-white">Chats</h2>'
);

// Sidebar Search input
c = c.replace(
  /bg-white\/10 border-white\/20 text-white placeholder:text-white\/50/g,
  'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400'
);

c = c.replace(
  /text-white\/40/g,
  'text-slate-400'
);

// More action buttons
c = c.replace(
  /text-white\/80/g,
  'text-slate-600 dark:text-slate-300'
);

fs.writeFileSync('src/pages/clipad/ClipadChat.jsx', c);
