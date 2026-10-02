const fs = require('fs');
let kt = fs.readFileSync('src/pages/clipad/KnowledgeTimeline.jsx', 'utf8');

kt = kt.replace(/text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-\[#00beac\]/g, 'text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#006065] dark:focus:border-[#fad503]');
kt = kt.replace(/<span className="font-medium text-white">/g, '<span className="font-medium text-slate-900 dark:text-white">');

fs.writeFileSync('src/pages/clipad/KnowledgeTimeline.jsx', kt);
