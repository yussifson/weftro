const fs = require('fs');
['ActionItems', 'KnowledgeJourney', 'DecisionLedger'].forEach(p => {
  let f = fs.readFileSync('src/pages/clipad/' + p + '.jsx', 'utf8');
  // Fix header icon background
  f = f.replace(/<div className="w-10 h-10 rounded-2xl bg-\[#006065\]\/10 dark:bg-\[#006065\]\/30 flex items-center justify-center">/g, '<div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">');
  // Fix header icon color
  f = f.replace(/<Scale className="w-5 h-5 text-\[#006065\] dark:text-\[#fad503\]" \/>/g, '<Scale className="w-5 h-5 text-[#fad503]" />');
  f = f.replace(/<CheckSquare className="w-5 h-5 text-\[#006065\] dark:text-\[#fad503\]" \/>/g, '<CheckSquare className="w-5 h-5 text-[#fad503]" />');
  f = f.replace(/<GitBranch className="w-5 h-5 text-\[#006065\] dark:text-\[#fad503\]" \/>/g, '<GitBranch className="w-5 h-5 text-[#fad503]" />');
  fs.writeFileSync('src/pages/clipad/' + p + '.jsx', f);
});
