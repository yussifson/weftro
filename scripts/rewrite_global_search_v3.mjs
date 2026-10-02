import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'src/components/clipad/search/GlobalSearch.jsx');
let content = fs.readFileSync(file, 'utf8');

const anchor = "return createPortal(";
const anchorIdx = content.indexOf(anchor);

if (anchorIdx === -1) {
  console.error("Could not find anchor in GlobalSearch.jsx");
  process.exit(1);
}

const logicPart = content.slice(0, anchorIdx);

const newReturn = `
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh] px-4 font-sans text-slate-900 dark:text-slate-100">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm transition-opacity" 
        onClick={() => setIsOpen(false)}
      />

      <div className="relative w-full max-w-3xl flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Search Input Box */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 relative z-20 flex flex-col overflow-hidden">
          <div className="flex items-center px-4 py-3 h-[60px] gap-3">
            {isSearching
              ? <Loader2 className="w-5 h-5 text-indigo-500 shrink-0 animate-spin" />
              : <Search className="w-5 h-5 text-slate-400 shrink-0" />
            }
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search people, docs, tasks, meetings... (Enter for AI)"
              className="flex-1 bg-transparent text-slate-900 dark:text-white text-base font-medium placeholder:text-slate-400 min-w-0 border-0 outline-none ring-0 shadow-none focus:border-0 focus:outline-none focus:ring-0 focus:shadow-none p-0"
            />
            {/* AI-only trigger hint */}
            {query && !isSynthesizing && (
              <button
                onClick={() => handleSearch(undefined, false)}
                title="Press Enter to ask AI"
                className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1.5 rounded-md border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" /> Ask AI
              </button>
            )}
            <button
              onClick={() => { setIsOpen(false); navigate(\`/search?q=\${encodeURIComponent(query)}\`); }}
              title="Expand to Full-Page Search Hub"
              className="shrink-0 p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            {isSynthesizing && (
              <span className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1.5 rounded-md border border-indigo-200 dark:border-indigo-800 animate-pulse">
                <Sparkles className="w-3.5 h-3.5 animate-spin" /> Thinking...
              </span>
            )}
            {query || isSearching ? (
              <button onClick={() => { setQuery(''); setResults([]); setAiAnswer(''); setHasSearched(false); setLastQuery(''); setLastAiQuery(''); inputRef.current?.focus(); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0 p-1">
                <X className="w-5 h-5" />
              </button>
            ) : (
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0 p-1">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Filters Row + Scope Badge */}
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
              {FILTER_TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedFilter(tab.id)}
                  className={\`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors \${
                    selectedFilter === tab.id
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }\`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {hasSearched && getScopeCount(tab.id) > 0 && (
                    <span className={\`ml-0.5 text-[10px] font-bold \${selectedFilter === tab.id ? 'text-indigo-500' : 'text-slate-400'}\`}>
                      {getScopeCount(tab.id)}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {/* Scope indicator */}
            <div className="shrink-0 flex items-center gap-1 text-[10px] text-slate-400 font-medium whitespace-nowrap">
               <Hash className="w-3 h-3" />
               {hasSearched ? \`\${accessibleCount} spaces / \${totalMatchCount} matches\` : \`\${accessibleCount} spaces / \${totalDocCount}+ docs\`}
            </div>
          </div>
          
          <div className="flex-1 max-h-[50vh] overflow-y-auto bg-slate-50 dark:bg-slate-950/50">
            {/* Zero State */}
            {!hasSearched && query.length === 0 && (
              <div className="p-4">
                {recentSearches.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Recent Searches</h4>
                    <div className="space-y-1">
                      {recentSearches.map((search, idx) => (
                        <button key={\`recent-\${idx}\`} onClick={() => { setQuery(search); handleSearch(search); }}
                          className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-all group">
                          <div className="w-7 h-7 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                          </div>
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">{search}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div>
                  <div className="flex items-center justify-between mb-2 px-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Suggested Queries</h4>
                    <span className="text-[10px] text-slate-400 hidden sm:inline font-medium">Press 1-6 or click</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {dynamicSuggestions.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button key={item.key} onClick={() => { setQuery(item.text); handleSearch(item.text); }}
                          className="w-full text-left flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-sm transition-all group">
                          <div className={\`w-8 h-8 rounded-lg \${item.bg} flex items-center justify-center shrink-0\`}>
                            <Icon className={\`w-4 h-4 \${item.color}\`} />
                          </div>
                          <div className="flex-1 flex flex-col">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight mb-1">{item.text}</span>
                              <kbd className="text-[10px] font-mono font-bold px-1.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">{item.key}</kbd>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Results */}
            {hasSearched && (
              <div className="p-2 space-y-1">
                {/* AI Answer Block */}
                {(isSynthesizing || aiAnswer) && (
                  <div className="mb-4 mx-2 mt-2 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/10 dark:to-slate-900 border border-indigo-100 dark:border-indigo-800/50 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center shadow-sm">
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Orbit AI</h3>
                    </div>
                    
                    <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed space-y-3 prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-a:text-indigo-600">
                      {isSynthesizing && !aiAnswer ? (
                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="font-medium animate-pulse">Synthesizing across workspace...</span>
                        </div>
                      ) : (
                        <ThinkingAccordion content={aiAnswer} />
                      )}
                    </div>

                    {aiSources.length > 0 && !isSynthesizing && (
                      <div className="mt-4 pt-3 border-t border-indigo-100 dark:border-indigo-800/30">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 block">Sources</span>
                        <div className="flex flex-wrap gap-2">
                          {aiSources.map((src, i) => {
                            const meta = TYPE_META[src.type] || TYPE_META.doc;
                            const Icon = meta.icon;
                            return (
                              <button key={i} onClick={() => { if(meta.route) navigate(meta.route(src.id, src.space_id)); setIsOpen(false); }}
                                className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:border-indigo-300 transition-colors">
                                <Icon className="w-3 h-3" />
                                <span className="max-w-[120px] truncate">{src.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {filteredResults.length === 0 && !isSearching && !isSynthesizing ? (
                  <div className="py-12 text-center flex flex-col items-center">
                    <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="text-sm text-slate-500 font-medium">No matches found for "{query}"</p>
                    <p className="text-xs text-slate-400 mt-1">Try a different term or ask Orbit AI.</p>
                  </div>
                ) : (
                  <>
                    {peopleResults.length > 0 && selectedFilter === 'all' && (
                      <div className="px-3 py-2 mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">People</span>
                        <div className="flex flex-wrap gap-2">
                          {peopleResults.map((p, idx) => {
                            const isSelected = selectedIndex === idx;
                            return (
                              <button key={p.id} onMouseEnter={() => setSelectedIndex(idx)} className={\`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all \${isSelected ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800 shadow-sm' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'}\`}>
                                <img src={p.avatar_url || \`https://api.dicebear.com/7.x/initials/svg?seed=\${p.label}\`} className="w-5 h-5 rounded-full" alt="" />
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{p.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {(selectedFilter === 'all' ? filteredResults.filter(r => r.type !== 'person') : filteredResults).map((item, idx) => {
                      const absoluteIdx = selectedFilter === 'all' ? peopleResults.length + idx : idx;
                      const isSelected = selectedIndex === absoluteIdx;
                      const meta = TYPE_META[item.type] || TYPE_META.doc;
                      const Icon = meta.icon;

                      return (
                        <div
                          key={\`\${item.type}-\${item.id}\`}
                          onMouseEnter={() => setSelectedIndex(absoluteIdx)}
                          onClick={() => {
                            if (meta.route) {
                              const r = meta.route(item.id, item.space_id);
                              if (r) { navigate(r); setIsOpen(false); }
                            }
                          }}
                          className={\`mx-2 p-3 rounded-xl border transition-all cursor-pointer flex gap-3 \${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800/50 shadow-sm' : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'}\`}
                        >
                          <div className={\`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 \${meta.bg}\`}>
                            <Icon className={\`w-4 h-4 \${meta.color}\`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <span className="font-bold text-sm text-slate-900 dark:text-white truncate">{item.label}</span>
                                {item.provider && (
                                  <span className="shrink-0 text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                    {item.provider}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {item.created_at && (
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    {new Date(item.created_at).toLocaleDateString()}
                                  </span>
                                )}
                                {isSelected && <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />}
                              </div>
                            </div>
                            {item.snippet && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                                {item.snippet}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {hasSearched && totalMatchCount > filteredResults.length && !showAllResults && (
                       <button onClick={handleLoadMore} className="w-full py-3 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 transition-colors mt-2 rounded-lg">
                         Load more results ({totalMatchCount - filteredResults.length} hidden)
                       </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* Footer Footer */}
          <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between shrink-0">
             <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-300 font-mono">↑</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-300 font-mono">↓</kbd>
                  <span>to navigate</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-300 font-mono">Enter</kbd>
                  <span>to select/ask AI</span>
                </div>
             </div>
             <div className="flex items-center gap-2">
               <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Powered by</span>
               <div className="w-4 h-4 bg-indigo-600 rounded-sm flex items-center justify-center">
                 <Sparkles className="w-2.5 h-2.5 text-white" />
               </div>
               <span className="text-[10px] font-bold text-slate-900 dark:text-white">Orbit AI</span>
             </div>
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
};
`;

fs.writeFileSync(file, logicPart + newReturn, 'utf8');
console.log('GlobalSearch updated to ultra premium corporate design.');
