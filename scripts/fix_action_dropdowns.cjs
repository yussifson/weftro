const fs = require('fs');
let ai = fs.readFileSync('src/pages/clipad/ActionItems.jsx', 'utf8');

ai = ai.replace(/className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border/g, 'className="px-3 py-1.5 text-xs text-slate-900 dark:text-white bg-white dark:bg-slate-900 border');

fs.writeFileSync('src/pages/clipad/ActionItems.jsx', ai);
