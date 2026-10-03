const fs = require('fs');
let c = fs.readFileSync('src/pages/clipad/ClipadChat.jsx', 'utf8');

c = c.split('bg-[#006065] text-white sticky top-0 z-10 shadow-md')
  .join('bg-white dark:bg-slate-900/40 text-slate-900 dark:text-white sticky top-0 z-10 shadow-sm border-b border-slate-200 dark:border-slate-800');

c = c.split('bg-[#006065] text-white border-t border-white/10 backdrop-blur-md')
  .join('bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-t border-slate-200 dark:border-slate-800 backdrop-blur-md');

c = c.split('bg-[#006065] text-white border-t border-white/10 shadow-xl')
  .join('bg-white dark:bg-slate-900/40 text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-800 shadow-xl');

c = c.split('text-white/60')
  .join('text-slate-500 dark:text-slate-400');
c = c.split('text-white/70')
  .join('text-slate-500 dark:text-slate-400');
c = c.split('border-white/10')
  .join('border-slate-200 dark:border-slate-800');

// Fix text-white icons in top header
c = c.replace(
  /<button onClick=\{\(\) => setActiveRoomId\(null\)\} className="md:hidden mr-1 p-2 rounded-full hover:bg-secondary text-slate-500 hover:text-slate-900 dark:hover:text-white">/g,
  '<button onClick={() => setActiveRoomId(null)} className="md:hidden mr-1 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white">'
);

fs.writeFileSync('src/pages/clipad/ClipadChat.jsx', c);
