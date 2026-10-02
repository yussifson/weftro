const fs = require('fs');
['ActionItems', 'KnowledgeJourney', 'DecisionLedger'].forEach(p => {
  let f = fs.readFileSync('src/pages/clipad/' + p + '.jsx', 'utf8');
  // Fix active filter
  f = f.replace(/bg-emerald-600 text-white shadow-sm/g, 'bg-[#fad503] text-[#006065] shadow-sm');
  f = f.replace(/bg-amber-600 text-white shadow-sm/g, 'bg-[#fad503] text-[#006065] shadow-sm');
  f = f.replace(/bg-blue-600 text-white shadow-sm/g, 'bg-[#fad503] text-[#006065] shadow-sm');
  f = f.replace(/text-slate-500 dark:text-slate-400 flex items-center gap-1 mr-2 uppercase tracking-wider/g, 'text-white/70 flex items-center gap-1 mr-2 uppercase tracking-wider');

  // Fix inactive filter
  f = f.replace(/bg-\[#006065\] border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-white\/10/g, 'bg-white/10 text-white border border-white/20 hover:bg-white/20');
  
  fs.writeFileSync('src/pages/clipad/' + p + '.jsx', f);
});
