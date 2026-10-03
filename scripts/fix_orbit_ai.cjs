const fs = require('fs');
let ai = fs.readFileSync('src/components/layout/GlobalAIAssistant.jsx', 'utf8');

// Header Background
ai = ai.split('bg-white/95 dark:bg-[#0A0F1C]/95 md:bg-slate-50/95 md:dark:bg-[#0A0F1C]/95 backdrop-blur-md px-4 py-3 flex justify-between items-center shrink-0 sticky top-0 z-[101] border-b border-slate-100 dark:border-white/5').join('bg-[#006065] text-white backdrop-blur-md px-4 py-3 flex justify-between items-center shrink-0 sticky top-0 z-[101] border-b border-[#006065]/50');

// Fix icons in header
ai = ai.split('w-8 h-8 rounded-full bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500').join('w-8 h-8 rounded-full bg-transparent hover:bg-white/10 text-white/80 hover:text-white');
ai = ai.split('w-6 h-6 rounded-full bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400').join('w-6 h-6 rounded-full bg-transparent hover:bg-white/10 text-white/80 hover:text-white');

// Sidebar/Main background
ai = ai.split('className={`flex bg-white dark:bg-[#0A0F1C] z-[70] transition-all duration-300 overflow-hidden').join('className={`flex bg-slate-50 dark:bg-slate-950 z-[70] transition-all duration-300 overflow-hidden');
ai = ai.split('className={`flex bg-white dark:bg-[#0A0F1C]').join('className={`flex bg-slate-50 dark:bg-slate-950');

// History Sidebar
ai = ai.split('bg-muted/20').join('bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800');

// Chat container background
ai = ai.split('relative bg-white dark:bg-[#0A0F1C] md:bg-slate-50/50 md:dark:bg-transparent md:scrollbar-primary').join('relative bg-slate-50 dark:bg-slate-950 md:scrollbar-primary');

// Input Area
ai = ai.split('bg-white dark:bg-[#0A0F1C] border-t border-slate-100 dark:border-white/5').join('bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]');

// Change App Icon (AI Avatar)
ai = ai.split('<CliPadLogo size={18} className="text-primary" />').join('<img src="/clipad-app-icon.png" alt="CliPad" className="w-5 h-5 object-contain" />');
ai = ai.split('<div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 mt-0.5">').join('<div className="w-8 h-8 rounded-full bg-transparent flex items-center justify-center shrink-0 mt-0.5 shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">');

// Message Bubble Restyling (ChatGPT style)
// User bubble:
ai = ai.split('w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-450 border border-slate-200 dark:border-white/10').join('w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm bg-[#006065] text-[#fad503] font-bold border border-[#006065]/20 text-xs');

// Bubbles background:
ai = ai.split('px-5 py-3 rounded-xl text-[13px] leading-relaxed max-w-[80%] shadow-sm break-words').join('px-5 py-3.5 rounded-2xl text-[14px] leading-relaxed max-w-[85%] break-words');
ai = ai.split("? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100'").join("? 'bg-[#f1f1f1] dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'");

// Actually wait, ChatGPT AI messages are completely transparent background and fill width
ai = ai.split(": 'bg-white dark:bg-[#131A2B] border border-slate-100 dark:border-white/5 text-slate-700 dark:text-foreground'").join(": 'bg-transparent text-slate-800 dark:text-slate-200 w-full px-0 shadow-none'");

fs.writeFileSync('src/components/layout/GlobalAIAssistant.jsx', ai);
