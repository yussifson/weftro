const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'src', 'pages', 'clipad', 'CliPadDashboard.jsx');
let content = fs.readFileSync(file, 'utf8');

const target = "<span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm ${trend > 0 ? '\\u2191' : '\\u2193'}`}>\n              {trend > 0 ? '\\u2191' : '\\u2193'} {Math.abs(trend)}%\n            </span>";
const replacement = `<span className={\`text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-0.5 \${trend > 0 ? 'text-[#006065] bg-[#006065]/10 dark:text-[#fad503] dark:bg-[#fad503]/10 border border-[#006065]/20 dark:border-[#fad503]/20' : 'text-slate-600 dark:text-muted-foreground bg-slate-100 dark:bg-secondary border border-slate-200 dark:border-border'}\`}>\n              {trend > 0 ? '\\u2191' : '\\u2193'} {Math.abs(trend)}%\n            </span>`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content, 'utf8');
console.log('Fixed StatCard classes');
