const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src/pages/clipad/CliPadDashboard.jsx');
let code = fs.readFileSync(file, 'utf8');

// Replace dark teal bg-[#006065] text-white with premium white cards
code = code.replace(/bg-\[#006065\] text-white border border-white\/15/g, 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800');
code = code.replace(/bg-\[#006065\] text-white/g, 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800');

// Replace old accent color to indigo
code = code.replace(/bg-\[#00beac\] text-\[#00beac\]/g, 'bg-indigo-500 text-indigo-500');
code = code.replace(/text-emerald-300 bg-emerald-500\/20/g, 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/20');
code = code.replace(/text-rose-300 bg-\[#00beac\] text-\[#00beac\]\/20/g, 'text-rose-600 bg-rose-100 dark:text-rose-400 dark:bg-rose-500/20');
code = code.replace(/bg-\[rgba\(250, 213, 3, 0\.15\)\]/g, 'bg-slate-100 dark:bg-slate-800');
code = code.replace(/text-\[#fad503\]/g, 'text-indigo-600 dark:text-indigo-400');
code = code.replace(/text-white\/60/g, 'text-slate-500 dark:text-slate-400');
code = code.replace(/text-white\/70/g, 'text-slate-500 dark:text-slate-400');
code = code.replace(/text-white/g, 'text-slate-900 dark:text-white');

// Space Card overrides
code = code.replace(/border border-slate-200 dark:border-slate-800 border border-slate-200 dark:border-slate-800 dark:border-slate-200 dark:border-slate-800/g, 'border-slate-200 dark:border-slate-800');
code = code.replace(/border border-white\/15 dark:border-white\/15 hover:border-primary\/50/g, 'border-slate-200 dark:border-slate-800 hover:border-indigo-300');
code = code.replace(/group-hover:text-indigo-600 dark:text-indigo-400/g, 'group-hover:text-indigo-500 transition-colors shrink-0');

// Fix the "white" replacement which broke generic strings
code = code.replace(/dark:text-slate-900 dark:text-white/g, 'dark:text-white');
code = code.replace(/bg-white\/10 dark:bg-secondary/g, 'bg-slate-100 dark:bg-slate-800');
code = code.replace(/border-white dark:border-slate-900/g, 'border-slate-200 dark:border-slate-700');

// Ensure StatCard uses the correct container
code = code.replace(
  /function StatCard\(\{ icon: Icon, value, label, trend, accentColor, bgColor, iconColor \}\) \{([\s\S]*?)return \(([\s\S]*?)<div className=\"relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 transition-all duration-300 group hover:-translate-y-1 hover:shadow-lg shadow-md flex flex-col justify-between p-4 sm:p-5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 shadow-sm\">/g,
  `function StatCard({ icon: Icon, value, label, trend, accentColor, bgColor, iconColor }) {
  $1return ($2<div className="relative overflow-hidden rounded-2xl transition-all duration-300 group hover:-translate-y-1 hover:shadow-md shadow-sm flex flex-col justify-between p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">`
);

fs.writeFileSync(file, code);
console.log('Dashboard redesigned');
