const fs = require('fs');
['ActionItems', 'KnowledgeJourney', 'DecisionLedger'].forEach(p => {
  let f = fs.readFileSync('src/pages/clipad/' + p + '.jsx', 'utf8');
  
  f = f.replace(/className="pl-8 pr-3 py-1\.5 text-xs bg-\[#006065\] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-[a-z]+-500 w-52"/g, 'className="pl-8 pr-3 py-1.5 text-xs bg-white/10 text-white border border-white/20 rounded-xl focus:outline-none focus:border-[#fad503] w-52 placeholder:text-white/50"');
  
  f = f.replace(/className="pl-8 pr-3 py-1\.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:border-[a-z]+-500 w-52"/g, 'className="pl-8 pr-3 py-1.5 text-xs bg-white/10 text-white border border-white/20 rounded-xl focus:outline-none focus:border-[#fad503] w-52 placeholder:text-white/50"');

  // Also in KnowledgeJourney, maybe it doesn't have the exact same class string. Let's make it generic.
  f = f.replace(/pl-8 pr-3 py-1\.5 text-xs bg-\[#006065\]/g, 'pl-8 pr-3 py-1.5 text-xs bg-white/10 text-white');
  
  fs.writeFileSync('src/pages/clipad/' + p + '.jsx', f);
});
