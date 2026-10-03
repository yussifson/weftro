const fs = require('fs');
let c = fs.readFileSync('src/pages/clipad/ClipadChat.jsx', 'utf8');

// Header Area
c = c.replace(/className="border-b border-white\/10 p-3 sm:p-4 flex items-center justify-between shrink-0 bg-\[#006065\]"/g, 'className="border-b border-slate-200 dark:border-slate-800 p-3 sm:p-4 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900/40"');
c = c.replace(/<h2 className="font-bold text-lg text-white">\{activeRoomName\}<\/h2>/g, '<h2 className="font-bold text-lg text-slate-900 dark:text-white">{activeRoomName}</h2>');
c = c.replace(/<p className="text-xs text-white\/60">/g, '<p className="text-xs text-slate-500 dark:text-slate-400">');
c = c.replace(/<p className="text-xs text-white\/60 mt-0\.5 truncate">/g, '<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">');

// Header Action Buttons
c = c.replace(/hover:bg-white\/10 text-white/g, 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300');
c = c.replace(/className="w-10 h-10 rounded-full hover:bg-white\/10 text-white"/g, 'className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"');

// System Messages
c = c.replace(/className="mx-auto bg-\[#006065\] text-white px-4 py-1\.5 rounded-lg text-xs font-semibold shadow-sm max-w-\[85%\] text-center"/g, 'className="mx-auto bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-4 py-1.5 rounded-lg text-xs font-semibold shadow-sm max-w-[85%] text-center border border-slate-200 dark:border-slate-700"');

// User Bubbles
// isMine ? "bg-[#006065] text-[#fad503] rounded-2xl rounded-tr-sm" : "bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-sm"
c = c.replace(/isMine \? "bg-\[#006065\] text-\[#fad503\] rounded-2xl rounded-tr-sm" : "bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-sm"/g, 'isMine ? "bg-[#006065] text-white rounded-2xl rounded-tr-sm shadow-sm" : "bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-sm shadow-sm"');

// Message input area
c = c.replace(/className="p-3 sm:p-4 bg-\[#006065\] border-t border-white\/10 shrink-0"/g, 'className="p-3 sm:p-4 bg-white dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-800 shrink-0"');

// Input field
c = c.replace(/className="flex-1 bg-white\/10 border-white\/20 text-white placeholder:text-white\/50 rounded-full px-4 py-5 focus-visible:ring-\[#00beac\]"/g, 'className="flex-1 bg-slate-100 dark:bg-slate-950 border-transparent text-slate-900 dark:text-white placeholder:text-slate-500 rounded-full px-4 py-5 focus-visible:ring-[#006065] focus-visible:ring-2 focus-visible:border-transparent focus-visible:outline-none"');

// Send button
c = c.replace(/className="w-10 h-10 rounded-full bg-\[#00beac\] hover:bg-\[#00beac\]\/90 text-white shadow-md"/g, 'className="w-10 h-10 rounded-full bg-[#006065] hover:bg-[#004e52] text-white shadow-md transition-colors"');

fs.writeFileSync('src/pages/clipad/ClipadChat.jsx', c);
