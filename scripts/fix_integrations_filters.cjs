const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src/pages/clipad/IntegrationsHub.jsx');
let code = fs.readFileSync(file, 'utf8');

const searchBlockStart = code.indexOf('{/* Search + Filter */}');
const myConnStart = code.indexOf('My Connections Panel');
const beforeMyConn = code.lastIndexOf('{', myConnStart);

const beforeSearch = code.slice(0, searchBlockStart);
const afterSearch = code.slice(beforeMyConn);

const newSearchBlock = `{/* Modern Tab Filters */}
        <div className="flex items-center gap-6 overflow-x-auto hide-scrollbar border-b border-slate-200 dark:border-slate-800 pb-px mb-8">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={\`py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap \${activeCategory === cat ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'}\`}
            >
              {cat}
            </button>
          ))}
        </div>

        `;

fs.writeFileSync(file, beforeSearch + newSearchBlock + afterSearch);
console.log('Updated filters layout');
