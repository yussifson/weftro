const fs = require('fs');
let m = fs.readFileSync('src/pages/clipad/MeetingsList.jsx', 'utf8');

m = m.replace(
  /<div className="space-y-4">\s*\{filtered\.map\(m => \(/,
  '<div className="relative pl-6 border-l-2 border-[#006065]/20 dark:border-[#006065]/40 space-y-6">\n            {filtered.map(m => ('
);

m = m.replace(
  /<div\s*key=\{m\.id\}\s*onClick=\{\(\) => navigate\(\`\/meetings\/\$\{m\.id\}\`\)\}\s*className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-\[#006065\]\/50 dark:hover:border-\[#fad503\]\/50 cursor-pointer shadow-\[0_2px_10px_rgba\(0,0,0,0\.04\)\] hover:shadow-\[0_8px_30px_rgba\(0,0,0,0\.12\)\] transition-all hover:-translate-y-0\.5 active:scale-\[0\.98\] flex flex-col md:flex-row md:items-center gap-4"\s*>/,
  `<div key={m.id} className="relative group">
                <div className="absolute -left-[35px] w-6 h-6 rounded-full bg-[#006065] border-2 border-[#fad503] flex items-center justify-center shadow-sm mt-5">
                  <div className="w-2 h-2 rounded-full bg-[#fad503]" />
                </div>
                <div
                  onClick={() => navigate(\`/meetings/\${m.id}\`)}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#006065]/50 dark:hover:border-[#fad503]/50 cursor-pointer shadow-sm hover:shadow-lg transition-all hover:-translate-y-0.5 active:scale-[0.98] flex flex-col gap-3"
                >`
);

m = m.replace(
  /<ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-\[#006065\] dark:group-hover:text-\[#fad503\] transition-colors" \/>\s*<\/div>\s*\)\)\}/,
  `<ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-[#006065] dark:group-hover:text-[#fad503] transition-colors" />
                </div>
              </div>
            ))}`
);

fs.writeFileSync('src/pages/clipad/MeetingsList.jsx', m);
