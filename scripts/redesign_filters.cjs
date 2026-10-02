const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src/pages/clipad/IntegrationsHub.jsx');
let code = fs.readFileSync(file, 'utf8');

const oldFiltersRegex = /<div className="flex items-center gap-6 overflow-x-auto hide-scrollbar border-b border-slate-200 dark:border-slate-800 pb-px mb-8">[\s\S]*?<\/div>/;

const newFilters = `<div className="flex items-center overflow-x-auto hide-scrollbar bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-xl mb-8 w-max">
          {CATEGORIES.map(cat => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={\`px-5 py-2 text-sm font-bold transition-all rounded-lg whitespace-nowrap \${isActive ? 'bg-white dark:bg-slate-900 text-[#006065] dark:text-[#fad503] shadow-sm ring-1 ring-black/5 dark:ring-white/10' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5'}\`}
              >
                {cat}
              </button>
            );
          })}
        </div>`;

code = code.replace(oldFiltersRegex, newFilters);
fs.writeFileSync(file, code);
console.log('Filters redesigned as pills.');
