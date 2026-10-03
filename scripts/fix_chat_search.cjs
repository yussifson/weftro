const fs = require('fs');
let c = fs.readFileSync('src/pages/clipad/ClipadChat.jsx', 'utf8');

c = c.replace(/bg-\[#005055\] text-white/g, 'bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white');
c = c.replace(/border-white\/15/g, 'border-slate-200 dark:border-slate-700');
c = c.replace(/placeholder:text-white\/50/g, 'placeholder:text-slate-500');

fs.writeFileSync('src/pages/clipad/ClipadChat.jsx', c);
