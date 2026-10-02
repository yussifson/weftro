const fs = require('fs');
let sh = fs.readFileSync('src/pages/clipad/SearchHub.jsx', 'utf8');

// 1. Add CliPadLogo import
if (!sh.includes('CliPadLogo')) {
    sh = sh.replace("import { INTEGRATIONS } from '@/config/integrationsList';", "import { INTEGRATIONS } from '@/config/integrationsList';\nimport { CliPadLogo } from '@/components/ui/CliPadLogo';");
}

// 2. Fix the main Chat Header Logo
sh = sh.replace(
    /<div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">\s*<Sparkles className="w-4 h-4 text-white" \/>\s*<\/div>/g,
    `<div className="w-10 h-10 rounded-xl bg-[#006065] flex items-center justify-center shadow-md">
       <CliPadLogo size={24} color="#ffffff" />
     </div>`
);

// 3. Fix the AI Chat Bubble Avatar
sh = sh.replace(
    /<div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">\s*<Sparkles className="w-4 h-4 text-white" \/>\s*<\/div>/g,
    `<div className="w-8 h-8 rounded-xl bg-[#006065] flex items-center justify-center shadow-md">
       <CliPadLogo size={18} color="#ffffff" />
     </div>`
);

// 4. Fix the Synthesizing Loading Avatar
sh = sh.replace(
    /<div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">\s*<Sparkles className="w-4 h-4 text-white animate-pulse" \/>\s*<\/div>/g,
    `<div className="w-8 h-8 rounded-xl bg-[#006065] flex items-center justify-center shadow-md animate-pulse">
       <CliPadLogo size={18} color="#ffffff" />
     </div>`
);

// 5. Restyle the chat bubbles (ChatGPT style)
// User: `bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm rounded-3xl rounded-tr-sm px-5 py-3`
// AI: no bubble, just text
sh = sh.replace(
    /className={`p-4 text-sm leading-relaxed \${msg\.role === 'user' \? 'bg-\[#006065\] text-white shadow-sm rounded-2xl rounded-tr-sm' : 'bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl rounded-tl-sm'}`}/g,
    `className={\`text-sm leading-relaxed \${msg.role === 'user' ? 'px-5 py-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm rounded-3xl rounded-tr-sm' : 'py-2 text-slate-800 dark:text-slate-200'}\`}`
);

// 6. Remove the inner loading bubble style so it's just plain text like the real AI
sh = sh.replace(
    /<div className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-tl-sm flex items-center gap-2">/g,
    `<div className="py-2 flex items-center gap-2">`
);

// 7. Dark prose code color for the AI response (ChatGPT style avoids bright colors)
sh = sh.replace(/prose-code:text-\[#006065\] dark:prose-code:text-indigo-400/g, 'prose-code:text-slate-900 dark:prose-code:text-slate-200 prose-code:bg-slate-100 dark:prose-code:bg-slate-800 prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none');

fs.writeFileSync('src/pages/clipad/SearchHub.jsx', sh);
console.log('SearchHub AI Chat updated.');
