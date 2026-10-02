import fs from 'fs';
import path from 'path';

let file = path.join(process.cwd(), 'src/components/clipad/chat/SpaceChat.jsx');
let content = fs.readFileSync(file, 'utf8');

const anchor = "if (loading) {";
const anchorIdx = content.indexOf(anchor);

const logicPart = content.slice(0, anchorIdx);

const newReturn = `
  if (loading) {
    return (
      <div className="flex h-[600px] border border-slate-200 dark:border-slate-800 rounded-2xl items-center justify-center bg-slate-50 dark:bg-slate-900/50">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-180px)] md:h-[75vh] md:min-h-[600px] md:border border-slate-200 dark:border-slate-800 md:rounded-2xl overflow-hidden bg-white dark:bg-slate-950 relative font-sans md:shadow-lg">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/60 z-20 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Channels */}
      <div className={\`absolute md:relative z-30 h-full w-64 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300 ease-in-out shadow-xl md:shadow-none \${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}\`}>
        <div className="h-16 px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900/50">
          <h3 className="font-bold text-slate-900 dark:text-white text-base tracking-tight flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-500" /> Channels
          </h3>
          <button 
            onClick={() => setShowNewChannel(!showNewChannel)}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            title="New Channel"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-0.5 scrollbar-thin">
          {showNewChannel && (
            <div className="mb-4 p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  value={newChannelName}
                  onChange={e => setNewChannelName(e.target.value)}
                  placeholder="e.g. general"
                  className="w-full bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none font-bold placeholder:font-normal placeholder:text-slate-400"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newChannelName.trim()) {
                      createChannel(newChannelName.trim());
                    }
                  }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button 
                  onClick={() => setShowNewChannel(false)}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => newChannelName.trim() && createChannel(newChannelName.trim())}
                  disabled={creatingChannel || !newChannelName.trim()}
                  className="px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm transition-colors disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </div>
          )}
          
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 pb-2 pt-1">Space Channels</div>
          {channels.map(channel => (
            <button
              key={channel.id}
              onClick={() => { setActiveChannel(channel); setSidebarOpen(false); }}
              className={\`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all group \${
                activeChannel?.id === channel.id 
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }\`}
            >
              <Hash className={\`w-4 h-4 shrink-0 transition-colors \${activeChannel?.id === channel.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 group-hover:text-slate-500'}\`} />
              <span className="truncate">{channel.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-950 relative min-w-0">
        {activeChannel ? (
          <>
            <div className="h-16 px-4 md:px-6 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl flex items-center justify-between sticky top-0 z-10 shrink-0">
              <div className="flex items-center gap-3">
                <button 
                  className="md:hidden p-1.5 -ml-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  <Hash className="w-5 h-5 text-slate-400" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg tracking-tight">{activeChannel.name}</h3>
                </div>
              </div>
              
              <button
                onClick={handleAISummarize}
                disabled={isSummarizing || messages.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 rounded-md text-xs font-bold transition-colors disabled:opacity-50 border border-indigo-200 dark:border-indigo-800 shadow-sm"
              >
                {isSummarizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">AI Summary</span>
              </button>
            </div>

            {summaryStr && (
              <div className="mx-4 md:mx-6 mt-4 p-5 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/20 dark:to-slate-900 border border-indigo-100 dark:border-indigo-800 rounded-xl relative shadow-sm animate-in slide-in-from-top-4">
                <button 
                  onClick={() => setSummaryStr(null)}
                  className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-md bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <h4 className="flex items-center gap-2 font-bold text-indigo-900 dark:text-indigo-100 text-sm mb-3">
                  <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                  Orbit AI Summary
                </h4>
                <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {summaryStr}
                </div>
              </div>
            )}
            
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overscroll-contain p-4 md:p-6 space-y-6 scrollbar-thin">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 animate-in fade-in duration-500 max-w-sm mx-auto text-center">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full flex items-center justify-center mb-4 shadow-inner">
                    <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                  </div>
                  <p className="font-bold text-slate-900 dark:text-white text-lg mb-1">Welcome to #{activeChannel.name}</p>
                  <p className="text-sm font-medium text-slate-500">This is the start of the #{activeChannel.name} channel. Be the first to start the conversation!</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isSameUserAsPrev = i > 0 && messages[i-1].user?.id === msg.user?.id;
                  
                  return (
                    <div key={msg.id} className={\`flex gap-3 md:gap-4 group hover:bg-slate-50 dark:hover:bg-slate-900/50 p-2 -mx-2 rounded-xl transition-colors \${isSameUserAsPrev ? 'mt-1' : 'mt-6'}\`}>
                      {!isSameUserAsPrev ? (
                        <img 
                          src={msg.user?.avatar_url || \`https://api.dicebear.com/7.x/initials/svg?seed=\${msg.user?.full_name || 'User'}\`}
                          alt={msg.user?.full_name}
                          className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 object-cover shrink-0 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800"
                        />
                      ) : (
                        <div className="w-10 shrink-0 flex justify-center">
                          <span className="text-[10px] font-bold text-slate-300 dark:text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        {!isSameUserAsPrev && (
                          <div className="flex items-baseline gap-2 mb-0.5">
                            <span className="font-bold text-slate-900 dark:text-white text-[15px] tracking-tight">
                              {msg.user?.full_name || 'Unknown User'}
                            </span>
                            <span className="text-xs font-semibold text-slate-400">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        )}
                        <p className="text-[15px] text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 md:px-6 md:pb-6 bg-white dark:bg-slate-950 pt-2 shrink-0">
              <form 
                onSubmit={handleSendMessage}
                className="relative flex items-end gap-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/20 rounded-2xl overflow-hidden shadow-sm transition-all duration-200"
              >
                <textarea
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder={\`Message #\${activeChannel.name}\`}
                  className="flex-1 bg-transparent border-0 focus:ring-0 resize-none max-h-40 min-h-[56px] py-4 px-4 text-[15px] text-slate-900 dark:text-white placeholder:text-slate-400 font-medium"
                  rows={1}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  style={{ height: 'auto', maxHeight: '160px' }}
                />
                <div className="p-2 shrink-0">
                  <button 
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="p-2.5 bg-indigo-600 text-white rounded-xl disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 transition-all duration-200 shadow-sm hover:shadow active:scale-95 hover:bg-indigo-700"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </form>
              <p className="text-[11px] text-slate-400 mt-2 text-center hidden md:block font-semibold">
                <strong>Return</strong> to send, <strong>Shift + Return</strong> to add a new line
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <Hash className="w-16 h-16 mb-4 text-slate-200 dark:text-slate-800" />
            <p className="font-bold text-lg text-slate-700 dark:text-slate-300">No channels found</p>
            <p className="text-sm font-medium mt-1 text-slate-400">Create a channel in the sidebar to start chatting.</p>
          </div>
        )}
      </div>
    </div>
  );
}
`;

fs.writeFileSync(file, logicPart + newReturn, 'utf8');
console.log('SpaceChat redesigned.');
