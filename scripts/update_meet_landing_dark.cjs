const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/pages/MeetLandingPage.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove force-light useEffect
const hookRegex = /useEffect\(\(\) => \{\s*const root = window\.document\.documentElement;\s*const originalClass = root\.className;\s*root\.classList\.remove\('dark'\);\s*root\.classList\.add\('light'\);\s*root\.style\.colorScheme = 'light';\s*return \(\) => \{\s*root\.className = originalClass;\s*root\.style\.colorScheme = '';\s*\};\s*\}, \[\]\);[\r\n]*/;

content = content.replace(hookRegex, '');

// 2. Remove 'light' hardcoded class on root container
content = content.replace('<div className={`light min-h-screen', '<div className={`min-h-screen');

// 3. Make background use app dark theme tokens
content = content.replace('bg-white dark:bg-card text-slate-900 dark:text-foreground', 'bg-background text-foreground');

// 4. Hero title text color to use theme foreground
content = content.replace('text-slate-800 leading-tight tracking-tight', 'text-foreground leading-tight tracking-tight');

// 5. Header background
content = content.replace('bg-white/80 dark:bg-background/80', 'bg-background/85');
content = content.replace('border-b border-slate-200 dark:border-border/50', 'border-b border-border');

// 6. Footer background
content = content.replace('bg-slate-50 dark:bg-background/50', 'bg-background');

fs.writeFileSync(filePath, content, 'utf8');
console.log('MeetLandingPage updated successfully');
