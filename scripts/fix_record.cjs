const fs = require('fs');
let content = fs.readFileSync('src/pages/clipad/RecordVideo.jsx', 'utf8');

// The mode selection cards (Screen + Camera, etc)
// When not active: bg-white text-slate-700
content = content.replace(
  /'bg-\[#006065\] text-white dark:bg-\[#1a2329\] border-white\/15 dark:border-white\/5 text-white\/80 dark:text-muted-foreground hover:border-primary\/30'/g,
  "'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-[#006065]/30'"
);

// The inputs (Video Title, Space Select)
content = content.replace(
  /className="w-full px-4 py-3\.5 rounded-2xl bg-\[#006065\] text-white dark:bg-\[#1a2329\] border border-white\/15 dark:border-white\/10 text-white dark:text-white text-\[15px\] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary\/20 focus:border-primary transition-all shadow-sm"/g,
  'className="w-full px-4 py-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-[15px] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#006065]/20 focus:border-[#006065] transition-all shadow-sm"'
);
content = content.replace(
  /className="w-full px-4 py-3\.5 rounded-2xl bg-\[#006065\] text-white dark:bg-\[#1a2329\] border border-white\/15 dark:border-white\/10 text-white dark:text-white text-\[15px\] focus:outline-none focus:ring-2 focus:ring-primary\/20 focus:border-primary transition-all shadow-sm appearance-none"/g,
  'className="w-full px-4 py-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-[15px] focus:outline-none focus:ring-2 focus:ring-[#006065]/20 focus:border-[#006065] transition-all shadow-sm appearance-none"'
);

// Toggles (mic/sound)
content = content.replace(
  /<div className={`absolute top-1 w-4 h-4 rounded-full bg-\[#006065\] text-white border border-white\/15 shadow transition-all \$\{micEnabled \? 'left-5' : 'left-1'\}`} \/>/g,
  '<div className={`absolute top-1 w-4 h-4 rounded-full bg-white border border-slate-200 shadow transition-all ${micEnabled ? \'left-5\' : \'left-1\'}`} />'
);
content = content.replace(
  /<div className={`absolute top-1 w-4 h-4 rounded-full bg-\[#006065\] text-white border border-white\/15 shadow transition-all \$\{studioSound \? 'left-5' : 'left-1'\}`} \/>/g,
  '<div className={`absolute top-1 w-4 h-4 rounded-full bg-white border border-slate-200 shadow transition-all ${studioSound ? \'left-5\' : \'left-1\'}`} />'
);

// Video preview container background
content = content.replace(
  /bg-black\/5 dark:bg-\[#006065\]/g,
  'bg-slate-100 dark:bg-slate-900'
);

// Recording button bottom corner
content = content.replace(
  /className="absolute bottom-3 right-3 bg-\[#006065\] text-white dark:bg-\[#202c33\] hover:bg-black\/5 dark:hover:bg-white\/10 text-white\/90 dark:text-foreground border border-black\/5 dark:border-white\/5 px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm"/g,
  'className="absolute bottom-3 right-3 bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm"'
);

// Checkbox placeholder
content = content.replace(
  /className="w-4 h-4 bg-\[#006065\] text-white border border-white\/15 rounded-sm"/g,
  'className="w-4 h-4 bg-white border border-slate-300 rounded-sm"'
);

fs.writeFileSync('src/pages/clipad/RecordVideo.jsx', content);
