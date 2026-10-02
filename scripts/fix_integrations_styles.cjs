const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src/pages/clipad/IntegrationsHub.jsx');
let code = fs.readFileSync(file, 'utf8');

// Replace bg-[#006065] in modals to be premium white/slate
code = code.replace(/bg-\[#006065\] text-white dark:bg-\[#006065\] border border-white\/15/g, 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200');
code = code.replace(/bg-\[#006065\] text-white dark:bg-\[#006065\] border border-border/g, 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800');
code = code.replace(/text-white dark:text-white/g, 'text-slate-900 dark:text-white');
code = code.replace(/text-white\/70 dark:text-white\/60/g, 'text-slate-500 dark:text-slate-400');
code = code.replace(/text-white\/60/g, 'text-slate-400');
code = code.replace(/bg-white\/10 dark:bg-slate-800 text-white\/70/g, 'bg-slate-100 dark:bg-slate-800 text-slate-500');

// Fix primary connect button
code = code.replace(/bg-primary hover:bg-primary\/90 text-primary-foreground/g, 'bg-indigo-600 hover:bg-indigo-700 text-white');
code = code.replace(/bg-primary hover:bg-primary\/95 text-primary-foreground/g, 'bg-indigo-600 hover:bg-indigo-700 text-white');
code = code.replace(/text-primary-foreground/g, 'text-white');

// Fix Integration Cards UI to make them ultra premium
code = code.replace(/<div key=\{integration.id\} className=\{`p-4 rounded-2xl border transition-all \$\{isConnected \? 'bg-card border-primary\/20 shadow-sm' : 'bg-card border-border hover:border-primary\/30 shadow-sm'\}`\}>/g, 
`<div key={integration.id} className={\`p-5 rounded-2xl border transition-all \${isConnected ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800/50 shadow-sm' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md'}\`}>`);

// Fix "My Connections" panel styling
code = code.replace(/bg-\[#006065\] text-white dark:bg-\[#006065\] border \$\{bg\} rounded-xl px-3 py-1.5 group/g, 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border ${bg} rounded-xl px-3 py-1.5 group shadow-sm');
code = code.replace(/bg-emerald-500\/5 border border-emerald-500\/20/g, 'bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/50');
code = code.replace(/text-emerald-600 dark:text-emerald-400/g, 'text-indigo-700 dark:text-indigo-400');

fs.writeFileSync(file, code);
console.log('Updated IntegrationsHub styles');
