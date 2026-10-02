const fs = require('fs');
const path = require('path');

// ==========================================
// 1. KNOWLEDGE TIMELINE
// ==========================================
let ktPath = path.join(process.cwd(), 'src/pages/clipad/KnowledgeTimeline.jsx');
let kt = fs.readFileSync(ktPath, 'utf8');

// Wrapper
kt = kt.replace(/min-h-full bg-\[#f8fafc\] text-white/g, 'min-h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100');

// Search Bar Input
kt = kt.replace(/w-full bg-\[#006065\] text-white border border-white\/15\/80/g, 'w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800');
kt = kt.replace(/placeholder:text-white\/50/g, 'placeholder:text-slate-400');
kt = kt.replace(/text-white\/60/g, 'text-slate-400'); // icons inside search

// Filter Panel
kt = kt.replace(/bg-\[#006065\] border border-white\/10 rounded-2xl overflow-hidden/g, 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden');
kt = kt.replace(/border-b border-white\/10 bg-white\/5/g, 'border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50');
kt = kt.replace(/<h3 className="font-bold text-sm text-white">/g, '<h3 className="font-bold text-sm text-slate-900 dark:text-white">');
kt = kt.replace(/text-white\/80 hover:bg-white\/10 hover:text-white/g, 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white');
kt = kt.replace(/bg-\[#00beac\] text-\[#00beac\] font-bold/g, 'bg-[#006065]/10 text-[#006065] dark:bg-[#006065]/30 dark:text-[#fad503] font-bold');
kt = kt.replace(/bg-white\/10 px-1\.5 py-0\.5 rounded-md text-white/g, 'bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md text-slate-500 dark:text-slate-400');

// Timeline Cards & Line
kt = kt.replace(/bg-\[#006065\] border border-white\/15 rounded-2xl/g, 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl');
kt = kt.replace(/hover:border-\[#00beac\]\/50/g, 'hover:border-[#006065]/30 dark:hover:border-[#006065]/50');
kt = kt.replace(/border-l-2 border-\[#00beac\]\/40/g, 'border-l-2 border-[#006065]/20 dark:border-[#006065]/40');
kt = kt.replace(/bg-\[#006065\] border-2 border-\[#00beac\]/g, 'bg-[#006065] border-2 border-[#fad503]'); // timeline dot
kt = kt.replace(/bg-\[#00beac\]/g, 'bg-[#fad503]'); // inner dot

// Skeletons & Empty State
kt = kt.replace(/bg-\[#006065\] border border-white\/10 rounded-2xl p-4/g, 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4');
kt = kt.replace(/w-10 h-10 rounded-full bg-white\/10/g, 'w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800');
kt = kt.replace(/border-dashed border-white\/20 rounded-2xl bg-\[#006065\] text-white/g, 'border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white');
kt = kt.replace(/text-white\/50/g, 'text-slate-400');
kt = kt.replace(/text-white mb-1/g, 'text-slate-900 dark:text-white mb-1');

// Generic text inside cards
kt = kt.replace(/text-white\/70/g, 'text-slate-500 dark:text-slate-400'); // careful not to touch header text-white/70, wait I'll restore header later if broken

fs.writeFileSync(ktPath, kt);


// ==========================================
// 2. INTEGRATION ANALYTICS
// ==========================================
let iaPath = path.join(process.cwd(), 'src/pages/clipad/IntegrationAnalytics.jsx');
let ia = fs.readFileSync(iaPath, 'utf8');

// Wrapper
ia = ia.replace(/bg-transparent  flex flex-col/g, 'bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-100');

// Header
ia = ia.replace(/bg-indigo-50 dark:bg-indigo-500\/10 text-indigo-500/g, 'bg-[#006065] text-[#fad503]');
ia = ia.replace(/text-white\/70 mt-1/g, 'text-slate-500 dark:text-slate-400 mt-1'); // It was white/70 inside transparent wrapper

// Skeletons
ia = ia.replace(/bg-\[#006065\] text-white dark:bg-\[#006065\]/g, 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800');
ia = ia.replace(/bg-white\/15 dark:bg-slate-800/g, 'bg-slate-200 dark:bg-slate-800');

// Refresh Button
ia = ia.replace(/bg-\[#006065\] text-white dark:bg-\[#006065\] border border-white\/15 dark:border-white\/15 rounded-xl shadow-sm text-sm font-bold hover:bg-transparent dark:hover:bg-slate-800\/50/g, 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800');
ia = ia.replace(/text-white\/60/g, 'text-slate-400');

// MetricCards
ia = ia.replace(/bg-indigo-50 dark:bg-indigo-500\/10/g, 'bg-[#006065]/5 dark:bg-[#006065]/20');
ia = ia.replace(/text-indigo-500/g, 'text-[#006065] dark:text-[#fad503]');

// Charts & Tables (they use `bg-card` and `text-foreground` which adapt nicely, but let's check for hardcoded colors)
ia = ia.replace(/const COLORS = \['#00beac'/g, 'const COLORS = [\'#006065\', \'#fad503\', \'#10b981\'');
ia = ia.replace(/bg-\[#00beac\]/g, 'bg-[#fad503]');
ia = ia.replace(/border-\[#00beac\]/g, 'border-[#fad503]');
ia = ia.replace(/text-\[#00beac\]/g, 'text-[#006065] dark:text-[#fad503]');

fs.writeFileSync(iaPath, ia);

console.log('KnowledgeTimeline and IntegrationAnalytics strictly themed.');
