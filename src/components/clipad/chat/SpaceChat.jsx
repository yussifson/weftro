import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Hash, Plus, Send, MessageSquare, Sparkles, Loader2, Menu, X, Search } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { invokeCloudflareAi } from '@/lib/cloudflareAI';

export default function SpaceChat({ spaceId }) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [creatingChannel, setCreatingChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryStr, setSummaryStr] = useState(null);

  useEffect(() => {
    if (spaceId) {
      fetchChannels();
    }
  }, [spaceId]);

  useEffect(() => {
    let subscription;
    let pollInterval;
    if (activeChannel) {
      fetchMessages();
      
      subscription = supabase
        .channel(`messages:${activeChannel.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'clipad_messages', filter: `channel_id=eq.${activeChannel.id}` }, payload => {
          fetchMessages();
        })
        .subscribe();
        
      // Fallback polling every 3 seconds in case realtime isn't enabled for the table yet
      pollInterval = setInterval(() => {
        fetchMessages();
      }, 3000);
    }
    return () => {
      if (subscription) supabase.removeChannel(subscription);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [activeChannel]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  const fetchChannels = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clipad_channels')
        .select('*')
        .eq('space_id', spaceId)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        setChannels(data);
        setActiveChannel(data[0]);
      } else {
        createChannel('general');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createChannel = async (name) => {
    setCreatingChannel(true);
    try {
      const { data, error } = await supabase
        .from('clipad_channels')
        .insert({
          space_id: spaceId,
          name: name.toLowerCase().replace(/\s+/g, '-')
        })
        .select()
        .single();
        
      if (error) throw error;
      
      setChannels(prev => [...prev, data]);
      if (!activeChannel) setActiveChannel(data);
      setNewChannelName('');
      setShowNewChannel(false);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error creating channel', variant: 'destructive' });
    } finally {
      setCreatingChannel(false);
    }
  };

  const fetchMessages = async () => {
    if (!activeChannel) return;
    try {
      const { data, error } = await supabase
        .from('clipad_messages')
        .select('*, user:user_id(full_name, avatar_url)')
        .eq('channel_id', activeChannel.id)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChannel || !user) return;
    
    const content = newMessage.trim();
    setNewMessage('');
    
    try {
      const { error } = await supabase
        .from('clipad_messages')
        .insert({
          channel_id: activeChannel.id,
          space_id: spaceId,
          user_id: user.id,
          content
        });
        
      if (error) throw error;
      fetchMessages(); // Fetch immediately after sending
    } catch (err) {
      console.error(err);
      toast({ title: 'Failed to send message', variant: 'destructive' });
    }
  };

  const handleAISummarize = async () => {
    if (!messages || messages.length === 0) {
      toast({ title: 'No messages to summarize' });
      return;
    }
    setIsSummarizing(true);
    setSummaryStr(null);
    try {
      // Build a transcript of the last 100 messages
      const recentMessages = messages.slice(-100);
      const transcript = recentMessages.map(m => `${m.user?.full_name}: ${m.content}`).join('\n');
      const prompt = `Summarize the following chat conversation into a concise bulleted list highlighting the key points, decisions, and action items:\n\n${transcript}`;
      
      const response = await invokeCloudflareAi(prompt, "You are an AI assistant. Provide a concise summary.");
      setSummaryStr(response);
      toast({ title: 'Summary generated successfully' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Failed to generate summary', variant: 'destructive' });
    } finally {
      setIsSummarizing(false);
    }
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);

  
  if (loading) {
    return (
      <div className="flex h-[600px] border border-slate-200 dark:border-border rounded-2xl items-center justify-center bg-slate-50 dark:bg-card/50">
        <Loader2 className="w-8 h-8 text-[#006065] dark:text-[#fad503] animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-180px)] md:h-[75vh] md:min-h-[600px] md:border border-slate-200 dark:border-border md:rounded-2xl overflow-hidden bg-white dark:bg-background relative font-sans md:shadow-lg">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="absolute inset-0 bg-slate-900/40 dark:bg-background/60 z-20 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Channels */}
      <div className={`absolute md:relative z-30 h-full w-64 bg-slate-50 dark:bg-card border-r border-slate-200 dark:border-border flex flex-col transition-transform duration-300 ease-in-out shadow-xl md:shadow-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-4 border-b border-slate-200 dark:border-border flex flex-col gap-3 shrink-0 bg-white dark:bg-card/50">
          <div className="flex items-center justify-between w-full">
            <h2 className="font-bold text-lg text-slate-900 dark:text-foreground">Space Chats</h2>
            <button 
              onClick={() => setShowNewChannel(!showNewChannel)}
              className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-accent flex items-center justify-center text-slate-500 dark:text-muted-foreground hover:text-slate-700 dark:text-foreground transition-colors"
              title="New Chat"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search chats..." className="w-full bg-slate-100 dark:bg-background text-slate-900 dark:text-foreground border border-transparent focus:border-[#006065] dark:border-border rounded-xl px-4 py-2 pl-9 text-sm focus:outline-none transition-all" />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-0.5 scrollbar-thin">
          {showNewChannel && (
            <div className="mb-4 p-3 bg-white dark:bg-background rounded-xl border border-slate-200 dark:border-border shadow-sm animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-border pb-2 mb-2">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  value={newChannelName}
                  onChange={e => setNewChannelName(e.target.value)}
                  placeholder="e.g. general"
                  className="w-full bg-transparent text-sm text-slate-900 dark:text-foreground focus:outline-none font-bold placeholder:font-normal placeholder:text-slate-400"
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
                  className="px-2.5 py-1 text-xs font-semibold text-slate-500 dark:text-muted-foreground hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => newChannelName.trim() && createChannel(newChannelName.trim())}
                  disabled={creatingChannel || !newChannelName.trim()}
                  className="px-3 py-1.5 text-xs font-bold bg-[#006065] dark:bg-[#131A2C] text-white hover:bg-[#004e52] hover:bg-[#004e52] text-white text-white rounded-md shadow-sm transition-colors disabled:opacity-50"
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
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all group ${
                activeChannel?.id === channel.id 
                  ? 'bg-[#006065] dark:bg-[#131A2C]/10 dark:bg-[#006065] dark:bg-[#131A2C]/30 text-[#006065] dark:text-[#fad503] dark:text-[#006065] dark:text-[#fad503] shadow-sm' 
                  : 'text-slate-600 dark:text-muted-foreground hover:bg-slate-200 dark:hover:bg-accent hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Hash className={`w-4 h-4 shrink-0 transition-colors ${activeChannel?.id === channel.id ? 'text-[#006065] dark:text-[#fad503] dark:text-[#006065] dark:text-[#fad503]' : 'text-slate-400 group-hover:text-slate-500 dark:text-muted-foreground'}`} />
              <span className="truncate">{channel.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-background relative min-w-0">
        {activeChannel ? (
          <>
            <div className="h-16 px-4 md:px-6 border-b border-slate-200 dark:border-border bg-white/95 dark:bg-background/95 backdrop-blur-xl flex items-center justify-between sticky top-0 z-10 shrink-0">
              <div className="flex items-center gap-3">
                <button 
                  className="md:hidden p-1.5 -ml-1.5 text-slate-500 dark:text-muted-foreground hover:text-slate-900 dark:text-foreground hover:bg-slate-100 dark:hover:bg-accent rounded-md transition-colors"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  <Hash className="w-5 h-5 text-slate-400" />
                  <h3 className="font-bold text-slate-900 dark:text-foreground text-lg tracking-tight">{activeChannel.name}</h3>
                </div>
              </div>
              
              <button
                onClick={handleAISummarize}
                disabled={isSummarizing || messages.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#006065] dark:bg-[#131A2C]/5 hover:bg-[#006065] dark:bg-[#131A2C]/10 dark:bg-[#006065] dark:bg-[#131A2C]/20 dark:hover:bg-[#006065] dark:bg-[#131A2C]/40 text-[#006065] dark:text-[#fad503] dark:text-[#006065] dark:text-[#fad503] rounded-md text-xs font-bold transition-colors disabled:opacity-50 border border-[#006065] dark:border-border/30 dark:border-[#006065] dark:border-border/40 shadow-sm"
              >
                {isSummarizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">AI Summary</span>
              </button>
            </div>

            {summaryStr && (
              <div className="mx-4 md:mx-6 mt-4 p-5 bg-gradient-to-br from-[#006065]/5 to-white dark:from-[#006065]/20 dark:to-slate-900 border border-[#006065] dark:border-border/20 dark:border-[#006065] dark:border-border/40 rounded-xl relative shadow-sm animate-in slide-in-from-top-4">
                <button 
                  onClick={() => setSummaryStr(null)}
                  className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-md bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-accent transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <h4 className="flex items-center gap-2 font-bold text-slate-900 dark:text-foreground dark:text-slate-100 text-sm mb-3">
                  <div className="w-6 h-6 rounded-md bg-[#006065] dark:bg-[#131A2C] text-white hover:bg-[#004e52] flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                  Orbit AI Summary
                </h4>
                <div className="text-sm text-slate-700 dark:text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {summaryStr}
                </div>
              </div>
            )}
            
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overscroll-contain p-4 md:p-6 space-y-6 scrollbar-thin">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 animate-in fade-in duration-500 max-w-sm mx-auto text-center">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-card border border-slate-200 dark:border-border rounded-full flex items-center justify-center mb-4 shadow-inner">
                    <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-600 dark:text-muted-foreground" />
                  </div>
                  <p className="font-bold text-slate-900 dark:text-foreground text-lg mb-1">Welcome to #{activeChannel.name}</p>
                  <p className="text-sm font-medium text-slate-500 dark:text-muted-foreground">This is the start of the #{activeChannel.name} channel. Be the first to start the conversation!</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isMe = msg.user?.id === user?.id;
                  const showTail = i === 0 || messages[i-1].user?.id !== msg.user?.id;
                  const senderName = msg.user?.full_name || 'User';
                  const avatarUrl = msg.user?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${senderName}`;
                  
                  return (
                    <div key={msg.id} className={`flex items-end gap-2 max-w-[85%] group ${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                      {!isMe && showTail ? (
                        <img src={avatarUrl} alt={senderName} className="w-7 h-7 rounded-full shrink-0 object-cover" />
                      ) : (
                        !isMe && <div className="w-7 shrink-0" />
                      )}

                      <div className={`relative px-4 py-2.5 text-[14.5px] leading-relaxed rounded-2xl shadow-sm ${isMe 
                        ? 'bg-[#006065] dark:bg-[#131A2C] text-white font-medium rounded-br-sm' 
                        : 'bg-white dark:bg-card text-slate-900 dark:text-foreground border border-slate-200 dark:border-border rounded-bl-sm'}`}>
                        
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
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 md:px-6 md:pb-6 bg-white dark:bg-background pt-2 shrink-0">
              <form 
                onSubmit={handleSendMessage}
                className="relative flex items-center gap-2 bg-slate-100 dark:bg-background border border-transparent rounded-full px-2 shadow-sm transition-all duration-200 focus-within:ring-2 focus-within:ring-[#006065]"
              >
                <textarea
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder={`Message #${activeChannel.name}`}
                  className="flex-1 bg-transparent border-0 focus:ring-0 resize-none max-h-40 min-h-[56px] py-4 px-4 text-[15px] text-slate-900 dark:text-foreground placeholder:text-slate-500 dark:text-muted-foreground font-medium"
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
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-[#006065] dark:bg-[#131A2C] hover:bg-[#004e52] text-white disabled:opacity-50 disabled:bg-slate-300 transition-all shadow-md active:scale-95 shrink-0 mb-1"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </form>
              
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 dark:text-muted-foreground">
            <Hash className="w-16 h-16 mb-4 text-slate-200 dark:text-slate-800" />
            <p className="font-bold text-lg text-slate-700 dark:text-muted-foreground">No channels found</p>
            <p className="text-sm font-medium mt-1 text-slate-400">Create a channel in the sidebar to start chatting.</p>
          </div>
        )}
      </div>
    </div>
  );
}
