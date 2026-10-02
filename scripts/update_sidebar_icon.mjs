import fs from 'fs';
import path from 'path';

let file = path.join(process.cwd(), 'src/pages/clipad/SpaceDashboard.jsx');
let content = fs.readFileSync(file, 'utf8');

// Add PanelLeftClose and PanelLeftOpen imports
content = content.replace(/ArrowLeft,/, 'ArrowLeft, PanelLeftClose, PanelLeft, Menu,');

// Find the sidebar toggle button which looks like this:
// <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors shrink-0">
//   <ArrowLeft className={`w-4 h-4 transition-transform duration-300 ${!sidebarOpen ? 'rotate-180' : ''}`} />
// </button>

const toggleRegex = /<button onClick=\{\(\) => setSidebarOpen\(!sidebarOpen\)\}[^>]+>\s*<ArrowLeft[^>]+>\s*<\/button>/g;
const newToggle = `<button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors shrink-0" title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}>
              {sidebarOpen ? <PanelLeftClose className="w-5 h-5 transition-transform duration-300" /> : <PanelLeft className="w-5 h-5 transition-transform duration-300" />}
            </button>`;

content = content.replace(toggleRegex, newToggle);

fs.writeFileSync(file, content, 'utf8');
console.log('Sidebar icon updated.');
