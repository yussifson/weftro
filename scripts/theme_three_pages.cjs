const fs = require('fs');
const path = require('path');

function sanitizeFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  let code = fs.readFileSync(filePath, 'utf8');

  // Wrapper
  code = code.replace(/min-h-full bg-background text-white/g, 'min-h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100');
  
  // Header container (already bg-[#006065] text-white, which is fine, just fix borders)
  code = code.replace(/border-white\/15/g, 'border-slate-200 dark:border-slate-800'); // wait, if it's the header border, white/15 is good.
  
  // Actually let's just surgically fix the cards and text.
  
  // 1. Convert any bg-[#006065] that is a card into a light/dark adaptive card
  code = code.replace(/bg-\[#006065\] border border-white\/15 rounded-2xl/g, 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl');
  code = code.replace(/bg-\[#006065\] text-white dark:bg-\[#006065\] border border-white\/10 dark:border-white\/5/g, 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800');
  code = code.replace(/bg-\[#006065\] max-w-2xl/g, 'bg-white dark:bg-slate-900 max-w-2xl'); // Empty state
  code = code.replace(/border-dashed border-white\/15 rounded-2xl bg-\[#006065\]/g, 'border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900');
  
  // 2. Fix text colors inside the cards
  code = code.replace(/<h3 className="font-semibold text-white/g, '<h3 className="font-semibold text-slate-900 dark:text-white');
  code = code.replace(/<h3 className="text-base font-bold text-white/g, '<h3 className="text-base font-bold text-slate-900 dark:text-white');
  code = code.replace(/text-white\/70/g, 'text-slate-500 dark:text-slate-400'); // Note: This will break the header p tag, we will fix it back.
  
  // 3. Fix colors
  code = code.replace(/text-amber-500/g, 'text-[#006065] dark:text-[#fad503]');
  code = code.replace(/bg-amber-500\/10/g, 'bg-[#006065]/10 dark:bg-[#006065]/30');
  code = code.replace(/border-amber-500\/20/g, 'border-[#006065]/20 dark:border-[#006065]/50');
  code = code.replace(/hover:border-amber-500\/30/g, 'hover:border-[#006065]/50');
  code = code.replace(/text-amber-600 dark:text-amber-400/g, 'text-[#006065] dark:text-[#fad503]');
  
  code = code.replace(/text-emerald-500/g, 'text-[#006065] dark:text-[#fad503]');
  code = code.replace(/bg-emerald-500\/10/g, 'bg-[#006065]/10 dark:bg-[#006065]/30');
  code = code.replace(/border-emerald-500\/20/g, 'border-[#006065]/20 dark:border-[#006065]/50');
  code = code.replace(/hover:border-emerald-500\/30/g, 'hover:border-[#006065]/50');
  
  code = code.replace(/text-blue-500/g, 'text-[#006065] dark:text-[#fad503]');
  code = code.replace(/bg-blue-500\/10/g, 'bg-[#006065]/10 dark:bg-[#006065]/30');
  code = code.replace(/border-blue-500\/20/g, 'border-[#006065]/20 dark:border-[#006065]/50');
  code = code.replace(/hover:border-blue-500\/30/g, 'hover:border-[#006065]/50');
  
  // Generic background inputs in ActionItems
  code = code.replace(/bg-\[#006065\] text-white border border-white\/15/g, 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white');
  code = code.replace(/bg-\[#005055\] text-white border border-white\/20/g, 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white');
  
  // Fix header text-white/70 back to white/70
  code = code.replace(/<p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl">/g, '<p className="text-sm text-white/70 max-w-xl">');
  code = code.replace(/<ArrowLeft className="w-4 h-4 text-slate-500 dark:text-slate-400" \/>/g, '<ArrowLeft className="w-4 h-4 text-white/70" />');
  
  fs.writeFileSync(filePath, code);
}

const files = [
  'src/pages/clipad/DecisionLedger.jsx',
  'src/pages/clipad/ActionItems.jsx',
  'src/pages/clipad/KnowledgeJourney.jsx'
];

files.forEach(f => {
  sanitizeFile(path.join(process.cwd(), f));
});

console.log('Decisions, Action Items, and Knowledge themed.');
