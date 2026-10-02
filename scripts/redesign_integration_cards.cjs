const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src/pages/clipad/IntegrationsHub.jsx');
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
    /className=\{\`group relative bg-card border \$\{integration.border\} rounded-2xl p-5 flex flex-col gap-4 hover:shadow-md transition-all duration-200 \$\{\!isAllowedToConnect \? 'opacity-75' : ''\}\`\}/g,
    "className={`group relative bg-white dark:bg-slate-900 border ${isConnected ? 'border-indigo-200 dark:border-indigo-800 ring-1 ring-indigo-500/10' : 'border-slate-200 dark:border-slate-800'} rounded-2xl p-6 flex flex-col gap-5 shadow-sm hover:shadow-lg transition-all duration-300 ${!isAllowedToConnect ? 'opacity-75' : 'hover:-translate-y-1'}`}"
);

fs.writeFileSync(file, code);
console.log('Cards redesigned');
