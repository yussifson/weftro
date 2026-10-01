import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Hash, Plus, Send, MessageSquare, Sparkles, Loader2 } from 'lucide-react';
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
      <div className="flex h-[600px] border border-border rounded-2xl items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-180px)] md:h-[75vh] md:min-h-[500px] md:border border-border md:rounded-2xl overflow-hidden bg-background relative font-sans md:shadow-lg">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="absolute inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`absolute md:relative z-30 h-full w-64 bg-card border-r border-border flex flex-col transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-4 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-md">
          <h3 className="font-bold text-foreground text-lg tracking-tight">Channels</h3>
          <button 
            onClick={() => setShowNewChannel(!showNewChannel)}
            className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-all duration-200 shadow-sm"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          {showNewChannel && (
            <div className="mb-3 p-3 bg-background rounded-xl border border-border shadow-sm animate-in fade-in slide-in-from-top-2">
              <input
                type="text"
                value={newChannelName}
                onChange={e => setNewChannelName(e.target.value)}
                placeholder="e.g. marketing-ideas"
                className="w-full bg-transparent text-sm text-foreground focus:outline-none mb-3 font-medium placeholder:text-muted-foreground/50"
                
                onKeyDown={e => {
                  if (e.key === 'Enter' && newChannelName.trim()) {
                    createChannel(newChannelName.trim());
                  }
                }}
              />
              <div className="flex justify-end gap-2">
                <button 
                  onClick={() => setShowNewChannel(false)}
                  className="px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => newChannelName.trim() && createChannel(newChannelName.trim())}
                  disabled={creatingChannel}
                  className="px-3 py-1 text-xs font-bold bg-primary text-primary-foreground rounded-md shadow hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </div>
          )}
          
          {channels.map(channel => (
            <button
              key={channel.id}
              onClick={() => { setActiveChannel(channel); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                activeChannel?.id === channel.id 
                  ? 'bg-primary/10 text-primary shadow-sm' 
                  : 'text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
              }`}
            >
              <Hash className={`w-4 h-4 shrink-0 transition-colors ${activeChannel?.id === channel.id ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
              <span className="truncate">{channel.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-background/50 relative min-w-0">
        {activeChannel ? (
          <>
            <div className="px-4 py-3 md:px-6 md:py-4 border-b border-border bg-card/80 backdrop-blur-xl flex items-center gap-3 sticky top-0 z-10 shadow-sm">
              <button 
                className="md:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                onClick={() => setSidebarOpen(true)}
              >
                <MessageSquare className="w-5 h-5" />
              </button>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Hash className="w-5 h-5 text-muted-foreground/70" />
                  <h3 className="font-bold text-foreground text-lg tracking-tight">{activeChannel.name}</h3>
                </div>
                <button
                  onClick={handleAISummarize}
                  disabled={isSummarizing || messages.length === 0}
                  className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 rounded-md text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {isSummarizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  AI Summarize
                </button>
              </div>
            </div>

            {summaryStr && (
              <div className="mx-4 md:mx-6 mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl relative">
                <button 
                  onClick={() => setSummaryStr(null)}
                  className="absolute top-2 right-2 p-1 text-amber-500/70 hover:text-amber-500 rounded-md"
                >
                  ✕
                </button>
                <h4 className="flex items-center gap-2 font-bold text-amber-500 text-sm mb-2">
                  <Sparkles className="w-4 h-4" /> Chat Summary
                </h4>
                <div className="text-sm text-foreground/80 whitespace-pre-wrap">
                  {summaryStr}
                </div>
              </div>
            )}
            
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overscroll-contain p-4 md:p-6 space-y-6 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground animate-in fade-in duration-500">
                  <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mb-4">
                    <MessageSquare className="w-8 h-8 text-primary/40" />
                  </div>
                  <p className="font-medium text-lg">Welcome to #{activeChannel.name}</p>
                  <p className="text-sm opacity-70">Be the first to start the conversation!</p>
                </div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className="flex gap-3 md:gap-4 group hover:bg-secondary/20 p-2 -mx-2 rounded-xl transition-colors">
                    <img 
                      src={msg.user?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${msg.user?.full_name || 'User'}`}
                      alt={msg.user?.full_name}
                      className="w-10 h-10 rounded-xl bg-secondary object-cover shrink-0 shadow-sm mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-bold text-foreground text-sm tracking-tight">
                          {msg.user?.full_name || 'Unknown User'}
                        </span>
                        <span className="text-xs font-medium text-muted-foreground/70">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[15px] text-foreground/90 whitespace-pre-wrap leading-relaxed">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 md:p-6 bg-background pt-2">
              <form 
                onSubmit={handleSendMessage}
                className="relative flex items-end gap-2 bg-card border border-border focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10 rounded-2xl overflow-hidden shadow-sm transition-all duration-200"
              >
                <textarea
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder={`Message #${activeChannel.name}`}
                  className="flex-1 bg-transparent border-0 focus:ring-0 resize-none max-h-32 min-h-[56px] py-4 px-4 text-[15px] text-foreground placeholder:text-muted-foreground/60 scrollbar-thin"
                  rows={1}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  style={{ height: 'auto', maxHeight: '120px' }}
                />
                <div className="p-2 shrink-0">
                  <button 
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="p-2.5 bg-primary text-primary-foreground rounded-xl disabled:opacity-50 disabled:bg-muted disabled:text-muted-foreground transition-all duration-200 shadow-sm hover:shadow active:scale-95"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
              <p className="text-[11px] text-muted-foreground/50 mt-2 text-center hidden md:block font-medium">
                <strong>Return</strong> to send, <strong>Shift + Return</strong> to add a new line
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <Hash className="w-16 h-16 mb-4 opacity-20" />
            <p className="font-medium text-lg">No channels found</p>
          </div>
        )}
      </div>
    </div>
  );
}
