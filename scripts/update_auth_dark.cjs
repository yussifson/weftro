const fs = require('fs');
const path = require('path');

function updateAuthPage(relPath) {
  const fullPath = path.resolve(__dirname, '..', relPath);
  let content = fs.readFileSync(fullPath, 'utf8');

  // Outer container
  content = content.replace(
    'min-h-screen w-full bg-white dark:bg-card flex flex-col lg:flex-row font-sans text-slate-900 dark:text-foreground',
    'min-h-screen w-full bg-background flex flex-col lg:flex-row font-sans text-foreground'
  );

  // Left form panel
  content = content.replace(
    'w-full lg:w-1/2 bg-white dark:bg-card flex flex-col justify-between',
    'w-full lg:w-1/2 bg-background flex flex-col justify-between'
  );

  // Submit button
  content = content.replace(
    'bg-[#006065] dark:bg-[#131A2C] hover:bg-[#004d52] text-white font-bold rounded-xl text-sm shadow-md transition-all active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer',
    'bg-[#fad503] hover:bg-yellow-400 text-[#0B1418] font-bold rounded-xl text-sm shadow-md shadow-[#fad503]/10 transition-all active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer'
  );

  // SSO and Google buttons
  content = content.replace(
    /bg-white dark:bg-card hover:bg-slate-50 dark:bg-background text-slate-700 dark:text-foreground border border-slate-200 dark:border-border rounded-xl/g,
    'bg-card hover:bg-secondary text-foreground border border-border rounded-xl'
  );

  // Inputs
  content = content.replace(
    /bg-white dark:bg-card border border-slate-200 dark:border-border text-slate-900 dark:text-foreground rounded-xl focus:border-\[#006065\] dark:border-border focus:ring-2 focus:ring-\[#006065\]\/15/g,
    'bg-card border border-border text-foreground rounded-xl focus:border-[#fad503] focus:ring-2 focus:ring-[#fad503]/20'
  );

  // Accent highlights & links
  content = content.replace(
    /text-\[#006065\]/g,
    'text-[#fad503]'
  );
  content = content.replace(
    /border-\[#006065\]/g,
    'border-[#fad503]'
  );
  content = content.replace(
    /focus:ring-\[#006065\]/g,
    'focus:ring-[#fad503]'
  );
  content = content.replace(
    /accent-\[#006065\]/g,
    'accent-[#fad503]'
  );

  // Right Panel Gradient - Use Corporate Deep Charcoal / Slate theme
  content = content.replace(
    'bg-gradient-to-br from-[#006065] via-[#005055] to-[#00393d]',
    'bg-gradient-to-br from-[#0B1418] via-[#101D22] to-[#091114] border-l border-border'
  );

  // Right Panel Device tablet frame
  content = content.replace(
    'bg-slate-900 p-2.5 rounded-[30px] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.6)] border border-slate-700/50',
    'bg-[#091114] p-2.5 rounded-[30px] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.8)] border border-[#1A2F38]'
  );

  // Inner Device Screen
  content = content.replace(
    'bg-[#f8fafc] dark:bg-background rounded-[22px]',
    'bg-[#0B1418] rounded-[22px] border border-[#1A2F38]'
  );

  // Device Sidebar
  content = content.replace(
    'bg-[#006065] dark:bg-[#131A2C] text-white p-3',
    'bg-[#091114] text-white p-3 border-r border-[#1A2F38]'
  );

  // Device Main Content View
  content = content.replace(
    'flex-1 bg-white dark:bg-card p-3.5',
    'flex-1 bg-[#101D22] p-3.5'
  );

  // Device stat cards
  content = content.replace(
    /bg-slate-50 dark:bg-background border border-slate-100/g,
    'bg-[#0B1418] border border-[#1A2F38]'
  );

  // Device records table
  content = content.replace(
    /border border-slate-100 rounded-xl/g,
    'border border-[#1A2F38] rounded-xl'
  );
  content = content.replace(
    /bg-slate-50 dark:bg-background px-2.5 py-1 border-b border-slate-100/g,
    'bg-[#0B1418] px-2.5 py-1 border-b border-[#1A2F38]'
  );
  content = content.replace(
    /divide-slate-100/g,
    'divide-[#1A2F38]'
  );
  content = content.replace(
    /border-t border-slate-100/g,
    'border-t border-[#1A2F38]'
  );

  fs.writeFileSync(fullPath, content, 'utf8');
  console.log('Updated ' + relPath);
}

updateAuthPage('src/pages/clipad/CliPadLogin.jsx');
updateAuthPage('src/pages/clipad/CliPadSignUp.jsx');
