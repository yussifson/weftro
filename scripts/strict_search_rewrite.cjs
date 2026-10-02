const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src/pages/clipad/SearchHub.jsx');
let code = fs.readFileSync(file, 'utf8');

// 1. Zero state big search input
code = code.replace(/hover:border-indigo-500\/50/g, 'hover:border-[#006065]/50');
code = code.replace(/focus-within:border-indigo-500/g, 'focus-within:border-[#006065]');
code = code.replace(/focus-within:ring-indigo-500\/10/g, 'focus-within:ring-[#006065]/10');

// 2. Zero state big search button
code = code.replace(/bg-indigo-600 hover:bg-indigo-700/g, 'bg-[#006065] hover:bg-[#006065]/90');

// 3. Suggestion pills
code = code.replace(/text-indigo-600/g, 'text-[#006065]');

// 4. Small top search input (active state)
code = code.replace(/group-focus-within:text-indigo-500/g, 'group-focus-within:text-[#006065]');
code = code.replace(/focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400/g, 'focus:ring-[#006065] focus:border-[#006065] dark:focus:ring-[#006065]');
code = code.replace(/focus:ring-2 focus:ring-indigo-500/g, 'focus:ring-2 focus:ring-[#006065]'); // Just in case it's formatted differently

// 5. Filter tabs (active state)
code = code.replace(/bg-indigo-100 text-indigo-700 dark:bg-indigo-900\/30 dark:text-indigo-400/g, 'bg-[#006065] text-[#fad503] font-bold shadow-sm border border-[#006065]');

// 6. Fix user message bubble we touched earlier to also be #006065 instead of indigo
// We previously changed it to bg-indigo-600 text-white
code = code.replace(/bg-indigo-600 text-white shadow-sm rounded-2xl rounded-tr-sm/g, 'bg-[#006065] text-white shadow-sm rounded-2xl rounded-tr-sm');

// 7. General cleanup of any other indigo remaining
code = code.replace(/text-indigo-500/g, 'text-[#006065]');
code = code.replace(/bg-indigo-500/g, 'bg-[#006065]');
code = code.replace(/border-indigo-500/g, 'border-[#006065]');
code = code.replace(/bg-indigo-50/g, 'bg-[#006065]/5');

fs.writeFileSync(file, code);
console.log('SearchHub strict styling rewrite complete');
