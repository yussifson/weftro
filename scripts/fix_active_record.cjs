const fs = require('fs');
let c = fs.readFileSync('src/pages/clipad/RecordVideo.jsx', 'utf8');

c = c.replace(/className="fixed bottom-10 left-1\/2 -translate-x-1\/2 z-50 flex items-center gap-2 p-2 bg-white\/50 \/80 backdrop-blur-3xl border border-black\/5 dark:border-white\/5 rounded-full shadow-\[0_8px_30px_rgba\(0,0,0,0\.12\)\]"/g, 'className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[24px] shadow-xl"');

// Fix buttons inside the pill:
c = c.replace(/w-12 h-12 rounded-full/g, 'w-10 h-10 rounded-full');
c = c.replace(/bg-white dark:bg-slate-900 text-white dark:text-white/g, 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white');
c = c.replace(/bg-red-600 hover:bg-red-500 text-white/g, 'bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm px-4 h-10 w-auto rounded-full gap-2 shadow-md');

// The active recording view (bg-black layout fix)
c = c.replace(/className="min-h-full bg-\[\#f0f2f5\]  text-white dark:text-slate-100 page-enter overflow-x-hidden pb-24 md:pb-8"/g, 'className={`min-h-full ${phase === \'setup\' ? \'bg-slate-50 dark:bg-slate-950\' : \'bg-slate-100 dark:bg-slate-900\'} page-enter overflow-x-hidden pb-24 md:pb-8`}');

// Nav header fixes
c = c.replace(/text-white\/90 dark:text-foreground/g, 'text-slate-700 dark:text-slate-200');
c = c.replace(/<ArrowLeft className="w-4 h-4 text-white\/70" \/>/g, '<ArrowLeft className="w-4 h-4 text-slate-500" />');
c = c.replace(/<span className="text-foreground font-semibold">Record Async Video<\/span>/g, '<span className="text-slate-900 dark:text-white font-bold text-sm">Record Async Video</span>');

// Fix the video container itself in active mode
c = c.replace(/rounded-3xl overflow-hidden bg-black aspect-video shadow-2xl ring-1 ring-white\/10 select-none/g, 'rounded-3xl overflow-hidden bg-white dark:bg-black aspect-video shadow-xl border border-slate-200 dark:border-slate-800 select-none ring-4 ring-white dark:ring-transparent');

// Fix preview layout
c = c.replace(/bg-slate-100 dark:bg-slate-900/g, 'bg-slate-50 dark:bg-slate-950');
c = c.replace(/text-muted-foreground/g, 'text-slate-500');

fs.writeFileSync('src/pages/clipad/RecordVideo.jsx', c);
