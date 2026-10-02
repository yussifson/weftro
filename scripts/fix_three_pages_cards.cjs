const fs = require('fs');

['DecisionLedger', 'ActionItems', 'KnowledgeJourney'].forEach(p => {
  let code = fs.readFileSync('src/pages/clipad/' + p + '.jsx', 'utf8');

  // Fix bg-[#006065] card background outside of header
  code = code.replace(/bg-\[#006065\] border rounded-2xl/g, 'bg-white dark:bg-slate-900 border rounded-2xl');
  code = code.replace(/bg-\[#006065\] border border-slate-200/g, 'bg-white dark:bg-slate-900 border border-slate-200');

  // Fix text-white inside ActionItems row text
  code = code.replace(/'text-white'/g, "'text-slate-900 dark:text-white'");

  // Fix border-emerald-500/30 or blue-500/50
  code = code.replace(/border-emerald-500\/30/g, 'border-[#006065]/30 dark:border-[#fad503]/30');
  code = code.replace(/border-blue-500\/50/g, 'border-[#006065]/50 dark:border-[#fad503]/50');

  // Knowledge Journey card internals
  code = code.replace(/bg-blue-500\/10/g, 'bg-[#006065]/10 dark:bg-[#006065]/30');
  code = code.replace(/text-blue-500/g, 'text-[#006065] dark:text-[#fad503]');
  code = code.replace(/bg-indigo-500\/10/g, 'bg-[#006065]/10 dark:bg-[#006065]/30');
  code = code.replace(/text-indigo-400/g, 'text-[#006065] dark:text-[#fad503]');
  
  // Specific fix for text-white in KnowledgeJourney nodes that aren't the header
  if (p === 'KnowledgeJourney') {
    code = code.replace(/className="text-sm font-semibold text-white/g, 'className="text-sm font-semibold text-slate-900 dark:text-white');
    code = code.replace(/className="font-bold text-white/g, 'className="font-bold text-slate-900 dark:text-white');
    code = code.replace(/className="text-xs text-white\/70/g, 'className="text-xs text-slate-500 dark:text-slate-400');
    code = code.replace(/text-white\/60 hover:text-white/g, 'text-slate-400 hover:text-slate-900 dark:hover:text-white');
    code = code.replace(/border-white\/10 dark:border-slate-800/g, 'border-slate-100 dark:border-slate-800');
    code = code.replace(/border-white\/10/g, 'border-slate-100 dark:border-slate-800');
  }

  fs.writeFileSync('src/pages/clipad/' + p + '.jsx', code);
});
