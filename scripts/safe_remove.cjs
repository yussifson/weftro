const fs = require('fs');
let content = fs.readFileSync('src/pages/clipad/SearchHub.jsx', 'utf8');

const target = `                  <div className="h-14 border-b border-slate-100 dark:border-slate-800 px-5 flex items-center gap-3 shrink-0 bg-slate-50 dark:bg-slate-900/50">
                     <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-inner">
                        <Sparkles className="w-4 h-4 text-white" />
                     </div>
                     <div>
                       <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-none">Orbit AI Synthesis</h3>
                       <span className="text-[10px] text-slate-500 font-medium">Enterprise Intelligence Engine</span>
                     </div>
                  </div>`;

// Replace with empty string.
content = content.replace(target, '');
fs.writeFileSync('src/pages/clipad/SearchHub.jsx', content);
console.log('Removed successfully without regex');
