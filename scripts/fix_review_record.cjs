const fs = require('fs');
let c = fs.readFileSync('src/pages/clipad/RecordVideo.jsx', 'utf8');

c = c.replace(/className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-black\/5 dark:border-white\/5 shadow-\[0_2px_10px_rgba\(0,0,0,0\.04\)\] text-white dark:text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500\/60 transition-all"/g, 'className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#006065]/20 focus:border-[#006065] transition-all"');

c = c.replace(/className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-black\/5 dark:border-white\/5 shadow-\[0_2px_10px_rgba\(0,0,0,0\.04\)\] text-white dark:text-white text-sm focus:outline-none focus:border-indigo-500\/60 transition-all"/g, 'className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#006065]/20 focus:border-[#006065] transition-all"');

// Fix description and transcript textarea
c = c.replace(/className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-black\/5 dark:border-white\/5 shadow-\[0_2px_10px_rgba\(0,0,0,0\.04\)\] text-white dark:text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500\/60 transition-all resize-none min-h-\[120px\]"/g, 'className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#006065]/20 focus:border-[#006065] transition-all resize-none min-h-[120px]"');

// Fix Save & Upload button
c = c.replace(/className="flex items-center gap-2 px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold shadow-lg shadow-indigo-600\/25 transition-all"/g, 'className="flex items-center gap-2 px-8 py-3 rounded-xl bg-[#006065] hover:bg-[#004a4e] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold shadow-lg shadow-[#006065]/25 transition-all"');

// Fix secondary Discard button
c = c.replace(/className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white\/80 dark:text-foreground font-bold transition-all"/g, 'className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 dark:text-slate-300 font-bold transition-all"');

fs.writeFileSync('src/pages/clipad/RecordVideo.jsx', c);
