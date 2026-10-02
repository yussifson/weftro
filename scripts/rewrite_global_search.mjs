import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'src/components/clipad/search/GlobalSearch.jsx');
let content = fs.readFileSync(file, 'utf8');

// Replace the teal theme with a slate/indigo corporate premium theme
content = content.replace(/bg-\[\#005055\]/g, 'bg-slate-900 dark:bg-slate-950');
content = content.replace(/bg-\[\#006065\]/g, 'bg-white dark:bg-slate-900');
content = content.replace(/bg-gradient-to-r from-purple-500 via-pink-400 to-amber-500/g, 'bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500');

// Input Box styling overrides
content = content.replace(/text-white text-\[16px\] font-medium placeholder:text-white\/40/g, 'text-white text-[16px] font-medium placeholder:text-slate-400');
content = content.replace(/text-white\/60/g, 'text-slate-400');
content = content.replace(/text-white\/50/g, 'text-slate-400');
content = content.replace(/text-white\/70/g, 'text-slate-600 dark:text-slate-400');
content = content.replace(/text-white\/80/g, 'text-slate-700 dark:text-slate-300');

// Selected filter
content = content.replace(/'bg-\[\#00beac\] text-\[\#00beac\] font-bold'/g, "'bg-indigo-600 text-white font-bold shadow-sm border-transparent'");

// Unselected filter
content = content.replace(/'bg-white\/10 border border-white\/15 text-white\/70 hover:bg-white\/20 hover:text-white'/g, "'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-white'");

// Border adjustments
content = content.replace(/border-white\/10/g, 'border-slate-200 dark:border-slate-800');
content = content.replace(/border-white\/15/g, 'border-slate-200 dark:border-slate-800');

// Highlighted result
content = content.replace(/'bg-white\/10 border-white\/20'/g, "'bg-slate-50 dark:bg-slate-800/80 border-slate-300 dark:border-slate-600 shadow-sm'");
content = content.replace(/'border-transparent hover:bg-white\/5'/g, "'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'");

// AI Answer box
content = content.replace(/bg-gradient-to-r from-\[\#00beac\]\/10 to-transparent/g, 'bg-gradient-to-r from-indigo-50 dark:from-indigo-900/20 to-transparent');
content = content.replace(/border-l-4 border-\[\#00beac\]/g, 'border-l-4 border-indigo-500');

// Text color changes for results
content = content.replace(/text-white group-hover:text-white/g, 'text-slate-900 dark:text-white');
content = content.replace(/text-white/g, 'text-slate-900 dark:text-white');

fs.writeFileSync(file, content, 'utf8');
console.log('GlobalSearch updated to premium styling.');
