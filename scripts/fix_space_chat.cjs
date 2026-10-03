const fs = require('fs');
let c = fs.readFileSync('src/components/clipad/chat/SpaceChat.jsx', 'utf8');

// Replace indigo with #006065 (Tailwind doesn't natively map arbitrary hex in all places smoothly if not configured, but I can use explicit arbitrary values or replace with specific classes)
c = c.replace(/text-indigo-500/g, 'text-[#006065] dark:text-[#fad503]');
c = c.replace(/text-indigo-700/g, 'text-[#006065] dark:text-[#fad503]');
c = c.replace(/text-indigo-600/g, 'text-[#006065] dark:text-[#fad503]');
c = c.replace(/text-indigo-400/g, 'text-[#006065] dark:text-[#fad503]');
c = c.replace(/text-indigo-900/g, 'text-slate-900 dark:text-white');
c = c.replace(/text-indigo-100/g, 'text-slate-100');

c = c.replace(/bg-indigo-600/g, 'bg-[#006065] text-white hover:bg-[#004e52]');
c = c.replace(/bg-indigo-700/g, 'bg-[#004e52] text-white');
c = c.replace(/bg-indigo-100/g, 'bg-[#006065]/10');
c = c.replace(/bg-indigo-50/g, 'bg-[#006065]/5');
c = c.replace(/bg-indigo-900\/20/g, 'bg-[#006065]/20');
c = c.replace(/bg-indigo-900\/30/g, 'bg-[#006065]/30');
c = c.replace(/bg-indigo-900\/40/g, 'bg-[#006065]/40');

c = c.replace(/from-indigo-50/g, 'from-[#006065]/5');
c = c.replace(/from-indigo-900\/20/g, 'from-[#006065]/20');
c = c.replace(/border-indigo-100/g, 'border-[#006065]/20');
c = c.replace(/border-indigo-800/g, 'border-[#006065]/40');
c = c.replace(/border-indigo-200/g, 'border-[#006065]/30');

c = c.replace(/focus-within:border-indigo-500/g, 'focus-within:border-[#006065]');
c = c.replace(/focus-within:ring-indigo-500\/20/g, 'focus-within:ring-[#006065]/20');

// Input Area Redesign (like ClipadChat)
c = c.replace(
  /className="relative flex items-end gap-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus-within:border-\[#006065\] focus-within:ring-4 focus-within:ring-\[#006065\]\/20 rounded-2xl overflow-hidden shadow-sm transition-all duration-200"/g,
  'className="relative flex items-center gap-2 bg-slate-100 dark:bg-slate-950 border border-transparent rounded-full px-2 shadow-sm transition-all duration-200 focus-within:ring-2 focus-within:ring-[#006065]"'
);
c = c.replace(
  /className="flex-1 bg-transparent border-0 focus:ring-0 resize-none max-h-40 min-h-\[56px\] py-4 px-4 text-\[15px\] text-slate-900 dark:text-white placeholder:text-slate-400 font-medium"/g,
  'className="flex-1 bg-transparent border-0 focus:ring-0 resize-none max-h-40 min-h-[56px] py-4 px-4 text-[15px] text-slate-900 dark:text-white placeholder:text-slate-500 font-medium"'
);
c = c.replace(
  /className="p-2\.5 bg-\[#006065\] text-white hover:bg-\[#004e52\] text-white rounded-xl disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 transition-all duration-200 shadow-sm hover:shadow active:scale-95 hover:bg-\[#004e52\] text-white"/g,
  'className="w-10 h-10 flex items-center justify-center rounded-full bg-[#006065] hover:bg-[#004e52] text-white disabled:opacity-50 disabled:bg-slate-300 transition-all shadow-md active:scale-95 shrink-0 mb-1"'
);
c = c.replace(
  /className="p-2\.5 bg-\[#006065\] text-white hover:bg-\[#004e52\] text-white rounded-xl disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 transition-all duration-200 shadow-sm hover:shadow active:scale-95 hover:bg-\[#004e52\]"/g,
  'className="w-10 h-10 flex items-center justify-center rounded-full bg-[#006065] hover:bg-[#004e52] text-white disabled:opacity-50 disabled:bg-slate-300 transition-all shadow-md active:scale-95 shrink-0 mb-1"'
);

// Sidebar "Channels" redesign
c = c.replace(
  /<div className="h-16 px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900\/50">/g,
  '<div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-3 shrink-0 bg-white dark:bg-slate-900/50">'
);
c = c.replace(
  /<h3 className="font-bold text-slate-900 dark:text-white text-base tracking-tight flex items-center gap-2">\s*<MessageSquare className="w-4 h-4 text-\[#006065\] dark:text-\[#fad503\]" \/> Channels\s*<\/h3>\s*<button\s*onClick=\{\(\) => setShowNewChannel\(!showNewChannel\)\}\s*className="p-1\.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"\s*title="New Channel"\s*>\s*<Plus className="w-4 h-4" \/>\s*<\/button>/g,
  `<div className="flex items-center justify-between w-full">
            <h2 className="font-bold text-lg text-slate-900 dark:text-white">Space Chats</h2>
            <button 
              onClick={() => setShowNewChannel(!showNewChannel)}
              className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors"
              title="New Chat"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search chats..." className="w-full bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white border border-transparent focus:border-[#006065] rounded-xl px-4 py-2 pl-9 text-sm focus:outline-none transition-all" />
          </div>`
);

fs.writeFileSync('src/components/clipad/chat/SpaceChat.jsx', c);
