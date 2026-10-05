const fs = require('fs');

let content = fs.readFileSync('src/pages/clipad/SearchHub.jsx', 'utf8');

// 1. Remove the "Orbit AI Synthesis" header box completely
content = content.replace(
  /(\s*)<div className="h-14 border-b border-slate-100.*?<\/div>\s*<\/div>\s*<\/div>\s*({\/\* Chat Messages \*\/})/s,
  '$1$2'
);

// 2. Remove local storage state restoration & persistence for query and chat history
content = content.replace(
  /\/\/ Restore inputs on mount\s*useEffect\(\(\) => \{.*?\}, \[user\?\.id\]\);\s*\/\/ Persist inputs on change\s*useEffect\(\(\) => \{.*?\}, \[query, user\?\.id\]\);\s*useEffect\(\(\) => \{.*?\}, \[followUpInput, user\?\.id\]\);/s,
  ''
);

// Also remove the supabase session loading useEffect
content = content.replace(
  /\/\/ Load persistent chat history from Supabase on mount\s*useEffect\(\(\) => \{.*?if \(\!user\?\.id\) return;.*?const loadPersistentChat.*?loadPersistentChat\(\);\s*\}, \[user\?\.id\]\);/s,
  ''
);

// 3. Remove the entire <header> element in the "search state"
content = content.replace(
  /(\{\/\* Header specific to search state \*\/\})\s*<header.*?<\/header>/s,
  '$1\n            {/* Removed top header search bar per user request */}'
);

// 4. Inject the search bar and "New Search" into the FILTER TABS row
// Currently it looks like:
// {/* FILTER TABS */}
// <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 py-2 overflow-x-auto hide-scrollbar flex gap-2">
//   {FILTER_TABS.map(tab => {
const filterTabsSearch = `
            {/* FILTER TABS & SEARCH BAR */}
            <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 py-2 overflow-x-auto hide-scrollbar flex items-center gap-3">
              <button
                onClick={() => { setHasPerformedSearch(false); setQuery(''); setResults([]); setAiAnswer(''); setSearchParams({}); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors bg-[#fad503] text-[#006065] shadow-sm border border-[#fad503] hover:brightness-105"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> New Search
              </button>

              <form onSubmit={(e) => { e.preventDefault(); setSearchParams({ q: query }); runSearch(); }} className="relative group shrink-0 w-64 md:w-80">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-3.5 w-3.5 text-slate-400 group-focus-within:text-[#006065] transition-colors" />
                </div>
                <input
                  type="text"
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search memory..."
                  className="block w-full pl-9 pr-8 py-1.5 border border-slate-200 dark:border-slate-700 rounded-full bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-[#006065] focus:border-[#006065] dark:focus:ring-[#006065] transition-all placeholder:text-slate-400 font-medium"
                />
                {query && (
                  <div className="absolute inset-y-0 right-0 pr-1 flex items-center gap-1">
                    <button type="button" onClick={() => { setQuery(''); setHasPerformedSearch(false); setSearchParams({}); }} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </form>

              <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1 shrink-0" />
              
              {FILTER_TABS.map(tab => {`;

content = content.replace(
  /(\{\/\* FILTER TABS \*\/\})\s*<div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 py-2 overflow-x-auto hide-scrollbar flex gap-2">\s*\{FILTER_TABS\.map\(tab => \{/s,
  filterTabsSearch
);

fs.writeFileSync('src/pages/clipad/SearchHub.jsx', content);
console.log('SearchHub updated successfully');
