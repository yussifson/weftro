import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, User, Bot, ShieldAlert } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';

export default function AdminChatDialog({ open, onOpenChange, targetUser }) {
  const { profile } = useAuth();
  const [chatSession, setChatSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (open && targetUser) {
      loadChat();
    } else {
      setChatSession(null);
      setMessages([]);
    }
  }, [open, targetUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadChat = async () => {
    setLoading(true);
    try {
      // Get the latest chat session for this user
      const { data: session } = await supabase.from('support_chats')
        .select('*')
        .eq('user_id', targetUser.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (session) {
        setChatSession(session);
        const { data: msgs } = await supabase.from('support_chat_messages')
          .select('*')
          .eq('chat_id', session.id)
          .order('created_at', { ascending: true });
        
        if (msgs) {
          setMessages(msgs);
        }

        // Setup real-time subscription for this chat session
        const messageChannel = supabase.channel(`admin:support_chat_messages:chat_id=eq.${session.id}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_chat_messages', filter: `chat_id=eq.${session.id}` }, payload => {
            const newMsg = payload.new;
            setMessages(prev => {
              // Prevent duplicates if we already optimistic-inserted our own message
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          })
          .subscribe();

        // Save channel to clean up on unmount or session change
        window.adminSupportChatChannel = messageChannel;
      } else {
        setChatSession(null);
        setMessages([]);
      }
    } catch (err) {
      console.warn('Error loading chat:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (window.adminSupportChatChannel) {
        supabase.removeChannel(window.adminSupportChatChannel);
      }
    };
  }, []);

  const handleSendReply = async () => {
    if (!replyText.trim() || !chatSession) return;
    setSending(true);
    try {
      const newMsg = {
        chat_id: chatSession.id,
        sender: 'admin',
        text: replyText.trim(),
      };
      const { data, error } = await supabase.from('support_chat_messages').insert(newMsg).select().single();
      if (error) throw error;
      
      setMessages(prev => [...prev, data]);
      setReplyText('');

      // If status isn't admin_joined, update it
      if (chatSession.status !== 'admin_joined') {
         await supabase.from('support_chats').update({ status: 'admin_joined' }).eq('id', chatSession.id);
         setChatSession(prev => ({...prev, status: 'admin_joined'}));
      }

    } catch (err) {
      console.error('Error sending reply:', err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col rounded-2xl border-[0.5px] border-primary/20 bg-white dark:bg-card p-0 font-sans overflow-hidden">
        <DialogDescription className="sr-only">Support Chat with {targetUser?.full_name || targetUser?.email}</DialogDescription>
        
        <DialogHeader className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/30 flex-shrink-0">
          <DialogTitle className="text-slate-900 dark:text-foreground font-bold flex items-center justify-between">
            <span>Support Chat: {targetUser?.full_name || targetUser?.email}</span>
            {chatSession && (
              <span className={`text-xs px-2 py-1 rounded-full font-semibold uppercase tracking-wider ${
                chatSession.status === 'admin_joined' ? 'bg-green-100 text-green-700' :
                chatSession.status === 'escalated' ? 'bg-red-100 text-red-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {chatSession.status.replace('_', ' ')}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30 dark:bg-card/10">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
              <ShieldAlert className="w-12 h-12 opacity-20" />
              <p>No support chats found for this user.</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex w-full ${
                msg.sender === 'user' ? 'justify-end' : 
                msg.sender === 'system' ? 'justify-center' : 'justify-start'
              }`}>
                {msg.sender === 'system' ? (
                  <div className="text-xs text-slate-400 bg-slate-100 dark:bg-secondary px-3 py-1 rounded-full">
                    {msg.text}
                  </div>
                ) : (
                  <div className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      msg.sender === 'user' ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-foreground' :
                      msg.sender === 'ai' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' :
                      'bg-purple-100 dark:bg-purple-900/30 text-purple-600'
                    }`}>
                      {msg.sender === 'user' ? <User className="w-4 h-4" /> : 
                       msg.sender === 'ai' ? <Bot className="w-4 h-4" /> : 
                       <ShieldAlert className="w-4 h-4" />}
                    </div>
                    <div className={`p-3 rounded-2xl text-sm ${
                      msg.sender === 'user' 
                        ? 'bg-primary text-white rounded-tr-none' 
                        : msg.sender === 'ai'
                          ? 'bg-white dark:bg-secondary text-slate-700 dark:text-foreground border border-slate-200 dark:border-border rounded-tl-none shadow-sm'
                          : 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/50 text-slate-800 dark:text-foreground rounded-tl-none'
                    }`}>
                      {msg.sender === 'admin' && (
                        <p className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400 mb-1">
                          Admin Reply
                        </p>
                      )}
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                      <p className={`text-[10px] mt-2 text-right opacity-60`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {chatSession && (
          <div className="p-4 bg-white dark:bg-card border-t border-slate-100 dark:border-border shrink-0">
            <div className="relative flex items-center max-w-4xl mx-auto">
              <Input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Join the chat and reply as Admin..."
                className="w-full pr-12 py-6 rounded-xl bg-slate-50 dark:bg-[#28292C] border-none focus-visible:ring-1 focus-visible:ring-primary/50 text-sm"
                disabled={sending}
              />
              <Button 
                onClick={handleSendReply}
                disabled={!replyText.trim() || sending}
                size="icon"
                className="absolute right-2 h-9 w-9 rounded-lg bg-primary hover:bg-primary/90 text-white disabled:opacity-50 transition-all"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
