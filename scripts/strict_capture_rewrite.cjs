const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src/pages/clipad/IntegrationsHub.jsx');
let code = fs.readFileSync(file, 'utf8');

// Replace tab active colors
code = code.replace(/border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400/g, 'border-[#006065] text-[#006065] dark:text-[#fad503] dark:border-[#fad503]');

// Replace Connect button
code = code.replace(/bg-indigo-600 hover:bg-indigo-700/g, 'bg-[#006065] hover:bg-[#006065]/90');

// Replace card active border
code = code.replace(/border-indigo-200 dark:border-indigo-800 ring-1 ring-indigo-500\/10/g, 'border-[#006065]/30 dark:border-[#006065]/50 ring-1 ring-[#006065]/10');

// Replace "My Connections Panel" UI
code = code.replace(/bg-indigo-50\/50 dark:bg-indigo-900\/10 border border-indigo-100 dark:border-indigo-900\/50/g, 'bg-[#006065]/5 dark:bg-[#006065]/10 border border-[#006065]/20 dark:border-[#006065]/30');
code = code.replace(/text-indigo-700 dark:text-indigo-400/g, 'text-[#006065] dark:text-[#fad503]');
code = code.replace(/text-violet-600 dark:text-violet-400/g, 'text-[#006065] dark:text-[#fad503]');
code = code.replace(/border-violet-200 dark:border-violet-800\/50/g, 'border-[#006065]/20');
code = code.replace(/bg-violet-100 dark:bg-violet-900\/40/g, 'bg-[#006065]/10 dark:bg-[#006065]/30');
code = code.replace(/text-blue-600 dark:text-blue-400/g, 'text-[#006065] dark:text-[#fad503]');
code = code.replace(/border-blue-200 dark:border-blue-800\/50/g, 'border-[#006065]/20');
code = code.replace(/bg-blue-100 dark:bg-blue-900\/40/g, 'bg-[#006065]/10 dark:bg-[#006065]/30');
code = code.replace(/border-emerald-200 dark:border-emerald-800\/50/g, 'border-[#006065]/20');
code = code.replace(/bg-emerald-100 dark:bg-emerald-900\/40/g, 'bg-[#006065]/10 dark:bg-[#006065]/30');
code = code.replace(/bg-emerald-500\/10/g, 'bg-[#006065]/10');
code = code.replace(/bg-violet-500\/10/g, 'bg-[#006065]/10');
code = code.replace(/bg-blue-500\/10/g, 'bg-[#006065]/10');

fs.writeFileSync(file, code);
console.log('Capture/IntegrationsHub page styling strict theme rewrite complete');
