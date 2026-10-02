const fs = require('fs');
let dl = fs.readFileSync('src/pages/clipad/DecisionLedger.jsx', 'utf8');

// Page wrapper
dl = dl.replace(/bg-\[#f8fafc\] text-white/g, 'bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100');

// Internal texts
dl = dl.replace(/<span className="font-bold text-white">/g, '<span className="font-bold text-slate-900 dark:text-white">');
dl = dl.replace(/<p className="text-sm text-white leading-relaxed">/g, '<p className="text-sm text-slate-900 dark:text-white leading-relaxed">');
dl = dl.replace(/<span className="font-medium text-white/g, '<span className="font-medium text-slate-900 dark:text-white');

fs.writeFileSync('src/pages/clipad/DecisionLedger.jsx', dl);
