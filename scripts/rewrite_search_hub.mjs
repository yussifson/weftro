import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'src/pages/clipad/SearchHub.jsx');
let content = fs.readFileSync(file, 'utf8');

const anchor = "const showLeftPanel = isSearching || filteredResults.length > 0;";
const anchorIdx = content.indexOf(anchor);

if (anchorIdx === -1) {
  console.error("Could not find anchor in SearchHub.jsx");
  process.exit(1);
}

const logicPart = content.slice(0, anchorIdx + anchor.length);

const newReturn = `
  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 overflow-hidden">
      
      {/* TOP HEADER & SEARCH BAR (ALWAYS VISIBLE) */}
      <header className="h-16 shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 md:px-8 gap-4 md:gap-8 z-10 shadow-sm">
        <div className="hidden md:flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-sm">
            <Search className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">Search Hub</span>
        </div>

        <div className="flex-1 max-w-3xl">
          <form onSubmit={(e) => { e.preventDefault(); setSearchParams({ q: query }); runSearch(); }} className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            </div>
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search organizational memory, decisions, tasks, standups..."
              className="block w-full pl-10 pr-12 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 transition-all placeholder:text-slate-400"
            />
            {query && (
              <div className="absolute inset-y-0 right-0 pr-1 flex items-center gap-1">
                <button type="button" onClick={() => { setQuery(''); setHasPerformedSearch(false); }} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-md">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </form>
        </div>
      </header>

      {/* FILTER TABS (Only if searched) */}
      {hasPerformedSearch && (
        <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 py-2 overflow-x-auto hide-scrollbar flex gap-2">
          {FILTER_TABS.map(tab => {
             const Icon = tab.icon;
             const isActive = activeFilter === tab.id;
             return (
               <button
                 key={tab.id}
                 onClick={() => setActiveFilter(tab.id)}
                 className={\`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors \${isActive ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'}\`}
               >
                 <Icon className="w-3.5 h-3.5" /> {tab.label}
               </button>
             );
          })}
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 overflow-hidden relative flex">
        
        {!hasPerformedSearch ? (
          /* ZERO STATE */
          <div className="flex-1 overflow-y-auto px-4 py-16 flex flex-col items-center">
             <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-6">
               <Layers className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
             </div>
             <h1 className="text-3xl font-black text-slate-900 dark:text-white text-center mb-3 tracking-tight">
               How can I help you, {firstName}?
             </h1>
             <p className="text-slate-500 text-center max-w-md mb-10 text-sm">
               Instantly search and synthesize information across all your spaces, meetings, docs, and decisions.
             </p>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl w-full">
               {SUGGESTED_PROMPTS.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => { setQuery(item.desc); setSearchParams({ q: item.desc }); runSearch(item.desc); }}
                      className="group flex flex-col items-start text-left p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-md text-indigo-600 dark:text-indigo-400">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-sm">{item.title}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
                    </button>
                  );
               })}
             </div>
          </div>
        ) : (
          /* SPLIT LAYOUT RESULTS */
          <div className="flex-1 w-full max-w-screen-2xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 h-full overflow-hidden">
             
             {/* LEFT SIDE: SEARCH RESULTS */}
             <div className="col-span-1 lg:col-span-5 flex flex-col h-full overflow-hidden">
                <div className="flex items-center justify-between mb-3 shrink-0 px-1">
                   <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Results</h2>
                   <span className="text-xs font-semibold bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">{filteredResults.length} found</span>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 pb-6 scrollbar-hide">
                   {isSearching ? (
                      <div className="flex flex-col items-center justify-center h-40">
                         <Loader2 className="w-6 h-6 text-indigo-500 animate-spin mb-2" />
                         <span className="text-xs text-slate-500">Searching workspace...</span>
                      </div>
                   ) : filteredResults.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-dashed rounded-xl h-40">
                         <Search className="w-6 h-6 text-slate-300 mb-2" />
                         <span className="text-sm text-slate-500">No results found for your query.</span>
                      </div>
                   ) : (
                      filteredResults.map(item => {
                        const meta = TYPE_META[item.type] || TYPE_META.doc;
                        const Icon = meta.icon;
                        const isSelected = selectedResult?.id === item.id;

                        return (
                          <div
                            key={\`\${item.type}-\${item.id}\`}
                            onClick={() => setSelectedResult(item)}
                            className={\`p-4 rounded-xl border transition-all cursor-pointer \${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800 shadow-sm ring-1 ring-indigo-500/20' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm'}\`}
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                               <div className="flex items-center gap-2">
                                  <span className={\`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0 \${meta.bg} \${meta.color}\`}>
                                    <Icon className="w-3 h-3" /> {meta.label}
                                  </span>
                                  {item.provider && (
                                     <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                       {item.provider}
                                     </span>
                                  )}
                               </div>
                               {item.created_at && (
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    {new Date(item.created_at).toLocaleDateString()}
                                  </span>
                               )}
                            </div>
                            <h4 className={\`font-bold text-sm leading-snug mb-1.5 line-clamp-1 \${isSelected ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-900 dark:text-white'}\`}>
                              {item.label}
                            </h4>
                            {item.snippet && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                {item.snippet}
                              </p>
                            )}
                          </div>
                        );
                      })
                   )}
                </div>
                
                {/* Selected Result Detail (Pinned at bottom of list) */}
                {selectedResult && (
                   <div className="shrink-0 mt-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-lg animate-in slide-in-from-bottom-4 duration-300">
                      <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                         <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Record Preview</span>
                         {TYPE_META[selectedResult.type]?.route && (
                            <button
                              onClick={() => {
                                const route = TYPE_META[selectedResult.type].route(selectedResult.id, selectedResult.space_id);
                                if (route) navigate(route);
                              }}
                              className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-2 py-1 rounded transition-colors"
                            >
                              Open <ArrowUpRight className="w-3 h-3" />
                            </button>
                         )}
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2 leading-snug">{selectedResult.label}</h3>
                      <div className="text-xs text-slate-600 dark:text-slate-300 max-h-32 overflow-y-auto pr-2">
                        {selectedResult.snippet || 'No content preview available.'}
                      </div>
                   </div>
                )}
             </div>
             
             {/* RIGHT SIDE: ORBIT AI CHAT */}
             <div className="col-span-1 lg:col-span-7 flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden relative">
                
                {/* Chat Header */}
                <div className="h-14 border-b border-slate-100 dark:border-slate-800 px-5 flex items-center gap-3 shrink-0 bg-slate-50 dark:bg-slate-900/50">
                   <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-inner">
                      <Sparkles className="w-4 h-4 text-white" />
                   </div>
                   <div>
                     <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-none">Orbit AI Synthesis</h3>
                     <span className="text-[10px] text-slate-500 font-medium">Enterprise Intelligence Engine</span>
                   </div>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                   {chatHistory.length === 0 && !isSynthesizing ? (
                      <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto">
                         <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-700">
                           <Sparkles className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                         </div>
                         <h3 className="font-bold text-slate-900 dark:text-white mb-2">No active synthesis</h3>
                         <p className="text-sm text-slate-500">Ask a question above and Orbit AI will analyze your organizational knowledge to synthesize an answer.</p>
                      </div>
                   ) : (
                      chatHistory.map((msg, idx) => (
                         <div key={idx} className={\`flex gap-4 max-w-3xl \${msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}\`}>
                            
                            <div className="shrink-0 mt-1">
                               {msg.role === 'user' ? (
                                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center border border-slate-300 dark:border-slate-600">
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{firstName.charAt(0)}</span>
                                  </div>
                               ) : (
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
                                    <Sparkles className="w-4 h-4 text-white" />
                                  </div>
                               )}
                            </div>

                            <div className={\`flex flex-col gap-1.5 \${msg.role === 'user' ? 'items-end' : 'items-start'}\`}>
                               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                                 {msg.role === 'user' ? 'You' : 'Orbit AI'}
                               </span>
                               
                               <div className={\`p-4 text-sm leading-relaxed \${msg.role === 'user' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-2xl rounded-tr-sm' : 'bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl rounded-tl-sm'}\`}>
                                  {msg.role === 'assistant' ? (
                                     <ReactMarkdown 
                                       remarkPlugins={[remarkGfm]}
                                       className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-700 prose-code:text-indigo-600 dark:prose-code:text-indigo-400 prose-a:text-indigo-600"
                                     >
                                        {msg.content}
                                     </ReactMarkdown>
                                  ) : (
                                     <span>{msg.content}</span>
                                  )}
                               </div>

                               {msg.role === 'assistant' && (
                                  <div className="flex items-center gap-1 mt-1">
                                     <button onClick={() => handleCopy(msg.content, idx)} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Copy text">
                                        {copiedMsgIndex === idx ? <CheckCheck className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                     </button>
                                     <button onClick={() => handleSpeak(msg.content, idx)} className={\`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors \${isSpeakingMsgIndex === idx ? 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}\`} title={isSpeakingMsgIndex === idx ? "Stop speaking" : "Read aloud"}>
                                        {isSpeakingMsgIndex === idx ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                                     </button>
                                     <div className="w-px h-3 bg-slate-200 dark:bg-slate-700 mx-1" />
                                     <button onClick={() => setVotedMsgState(p => ({...p, [idx]: 'up'}))} className={\`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors \${votedMsgState[idx] === 'up' ? 'text-emerald-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}\`}>
                                        <ThumbsUp className="w-3.5 h-3.5" />
                                     </button>
                                     <button onClick={() => setVotedMsgState(p => ({...p, [idx]: 'down'}))} className={\`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors \${votedMsgState[idx] === 'down' ? 'text-rose-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}\`}>
                                        <ThumbsDown className="w-3.5 h-3.5" />
                                     </button>
                                  </div>
                               )}
                            </div>
                         </div>
                      ))
                   )}

                   {isSynthesizing && (
                      <div className="flex gap-4 max-w-3xl mr-auto">
                         <div className="shrink-0 mt-1">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
                              <Sparkles className="w-4 h-4 text-white animate-pulse" />
                            </div>
                         </div>
                         <div className="flex flex-col gap-1.5 items-start">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Orbit AI</span>
                            <div className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-tl-sm flex items-center gap-2">
                               <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                               <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Synthesizing insights...</span>
                            </div>
                         </div>
                      </div>
                   )}
                   <div ref={chatBottomRef} />
                </div>
                
                {/* Chat Input */}
                <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0">
                   <form onSubmit={handleFollowUp} className="relative flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all shadow-sm">
                      <input
                        value={followUpInput}
                        onChange={e => setFollowUpInput(e.target.value)}
                        placeholder="Ask a follow-up question..."
                        className="flex-1 bg-transparent border-none outline-none ring-0 text-sm px-3 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-0"
                      />
                      <button
                        type="submit"
                        disabled={!followUpInput.trim() || isSynthesizing}
                        className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-colors shrink-0"
                      >
                         {isSynthesizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
                      </button>
                   </form>
                   <p className="text-center text-[10px] text-slate-400 font-medium mt-2">
                      Orbit AI can make mistakes. Consider verifying important organizational facts.
                   </p>
                </div>

             </div>
          </div>
        )}
      </div>
    </div>
  );
}
`;

fs.writeFileSync(file, logicPart + newReturn, 'utf8');
console.log('SearchHub updated to ultra premium design.');
