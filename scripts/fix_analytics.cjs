const fs = require('fs');
let ia = fs.readFileSync('src/pages/clipad/IntegrationAnalytics.jsx', 'utf8');

// Metric cards styling
ia = ia.replace(/bg="bg-\[#006065\]\/10 dark:bg-slate-900 border border-slate-200 dark:border-slate-800\/30"/g, 'bg="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:border-[#006065]/30 hover:shadow-lg transition-all"');

// Chart containers
ia = ia.replace(/className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col"/g, 'className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex flex-col hover:border-[#006065]/30 transition-colors"');

// Table styling
ia = ia.replace(/className="w-full text-sm text-left"/g, 'className="w-full text-sm text-left border-collapse"');
ia = ia.replace(/className="bg-slate-50 dark:bg-slate-800\/50 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-\[10px\]"/g, 'className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-[10px] border-y border-slate-200 dark:border-slate-800"');
ia = ia.replace(/className="border-b border-slate-100 dark:border-slate-800\/50 hover:bg-slate-50 dark:hover:bg-slate-800\/30 transition-colors"/g, 'className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"');

// Fix syncs block table padding
ia = ia.replace(/<th className="px-4 py-3"/g, '<th className="px-6 py-4"');
ia = ia.replace(/<td className="px-4 py-3"/g, '<td className="px-6 py-4"');

fs.writeFileSync('src/pages/clipad/IntegrationAnalytics.jsx', ia);
