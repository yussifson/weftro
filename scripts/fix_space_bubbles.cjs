const fs = require('fs');
let c = fs.readFileSync('src/components/clipad/chat/SpaceChat.jsx', 'utf8');

const oldMap = `                messages.map((msg, i) => {
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
                })`;

const newMap = `                messages.map((msg, i) => {
                  const isMe = msg.user?.id === user?.id;
                  const showTail = i === 0 || messages[i-1].user?.id !== msg.user?.id;
                  const senderName = msg.user?.full_name || 'User';
                  const avatarUrl = msg.user?.avatar_url || \`https://api.dicebear.com/7.x/initials/svg?seed=\${senderName}\`;
                  
                  return (
                    <div key={msg.id} className={\`flex items-end gap-2 max-w-[85%] group \${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}\`}>
                      {!isMe && showTail ? (
                        <img src={avatarUrl} alt={senderName} className="w-7 h-7 rounded-full shrink-0 object-cover" />
                      ) : (
                        !isMe && <div className="w-7 shrink-0" />
                      )}

                      <div className={\`relative px-4 py-2.5 text-[14.5px] leading-relaxed rounded-2xl shadow-sm \${isMe 
                        ? 'bg-[#006065] text-white font-medium rounded-br-sm' 
                        : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-bl-sm'}\`}>
                        
                        {!isMe && showTail && (
                          <div className="text-[11px] font-bold text-[#006065] dark:text-[#fad503] mb-0.5">{senderName}</div>
                        )}

                        <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>

                        <span className="text-[10px] opacity-70 mt-1 block text-right font-medium tracking-wide">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })`;

c = c.replace(oldMap, newMap);

c = c.replace(
  /<p className="text-\[11px\] text-slate-400 mt-2 text-center hidden md:block font-semibold">\s*<strong>Return<\/strong> to send, <strong>Shift \+ Return<\/strong> to add a new line\s*<\/p>/g,
  ''
);

fs.writeFileSync('src/components/clipad/chat/SpaceChat.jsx', c);
