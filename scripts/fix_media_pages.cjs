const fs = require('fs');

function fixPage(file) {
  let content = fs.readFileSync(file, 'utf8');

  // Fix main layout wrapper
  content = content.replace(/className="min-h-full bg-\[#f0f2f5\]\s*text-white dark:text-slate-100/g, 'className="min-h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100');
  content = content.replace(/className="min-h-full bg-\[#f0f2f5\]\s*page-enter text-white dark:text-slate-100/g, 'className="min-h-full bg-slate-50 dark:bg-slate-950 page-enter text-slate-900 dark:text-slate-100');

  // If there are top action bars, fix them to look premium
  content = content.replace(/bg-transparent border-b border-black\/5 dark:border-white\/5/g, 'bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm');
  
  // Back button text color inside the bar
  content = content.replace(/text-white\/70/g, 'text-slate-500');
  content = content.replace(/text-white\/90 dark:text-foreground/g, 'text-slate-900 dark:text-white');
  
  // SectionCard fix for MeetingRecord
  content = content.replace(/className="bg-card border border-border rounded-2xl overflow-hidden"/g, 'className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)]"');
  
  // Text inside SectionCard headers
  content = content.replace(/<span className="font-bold text-foreground">\{title\}<\/span>/g, '<span className="font-bold text-slate-900 dark:text-white">{title}</span>');
  content = content.replace(/hover:bg-white\/\[0\.02\]/g, 'hover:bg-slate-50 dark:hover:bg-slate-800/50');
  
  // Views/Text fix inside WatchVideo
  content = content.replace(/<span className="text-xs text-white\/70 dark:text-muted-foreground/g, '<span className="text-xs text-slate-500 dark:text-slate-400');
  
  // Title text in MeetingRecord
  content = content.replace(/text-gray-300/g, 'text-slate-600 dark:text-slate-300');
  
  fs.writeFileSync(file, content);
}

fixPage('src/pages/clipad/MeetingRecord.jsx');
fixPage('src/pages/clipad/WatchVideo.jsx');
