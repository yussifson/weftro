import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, PhoneCall, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/api/supabaseClient';

export default function SupportAIChat() {
  const [messages, setMessages] = useState([
    { id: 1, text: "Hi there! I'm the KERINT Support Assistant. How can I help you today?", sender: 'ai' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatId, setChatId] = useState(null);
  const [status, setStatus] = useState('ai_handling');
  const [guestId] = useState(() => {
    let id = localStorage.getItem('clipad_guest_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('clipad_guest_id', id);
    }
    return id;
  });
  const endOfMessagesRef = useRef(null);

  const scrollToBottom = () => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (!chatId) return;

    const messageChannel = supabase.channel(`guest:support_chat_messages:chat_id=eq.${chatId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_chat_messages', filter: `chat_id=eq.${chatId}` }, payload => {
        const newMsg = payload.new;
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id || (m.sender === newMsg.sender && m.text === newMsg.text))) {
            return prev;
          }
          return [...prev, { id: newMsg.id, text: newMsg.text, sender: newMsg.sender, name: newMsg.sender === 'admin' ? 'Admin' : '' }];
        });
      })
      .subscribe();

    const chatChannel = supabase.channel(`guest:support_chats:id=eq.${chatId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'support_chats', filter: `id=eq.${chatId}` }, payload => {
        if (payload.new.status) {
          setStatus(payload.new.status);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(chatChannel);
    };
  }, [chatId]);

  const handleEscalate = async () => {
    setIsTyping(true);
    try {
      // Create chat session if it doesn't exist
      let currentChatId = chatId;
      if (!currentChatId) {
        const { data: newChat } = await supabase.from('support_chats').insert({ user_id: guestId, status: 'escalated' }).select('id').single();
        if (newChat) {
          currentChatId = newChat.id;
          setChatId(currentChatId);
          // Insert previous messages for context
          const messagesToInsert = messages.map(m => ({
            chat_id: currentChatId,
            sender: m.sender,
            text: m.text
          }));
          await supabase.from('support_chat_messages').insert(messagesToInsert).catch(console.error);
        }
      } else {
        await supabase.from('support_chats').update({ status: 'escalated' }).eq('id', currentChatId);
      }

      const replyText = "I am transferring you to a human Support Admin. Please hold on and keep this chat open. They will reply here shortly.";
      setMessages(prev => [...prev, { id: Date.now(), text: replyText, sender: 'ai' }]);
      if (currentChatId) {
        await supabase.from('support_chat_messages').insert({ chat_id: currentChatId, sender: 'ai', text: replyText });
      }
      setStatus('escalated');
    } catch (e) {
      console.error(e);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { id: Date.now(), text: input.trim(), sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    const textToSend = input.trim();
    setInput('');

    if (status === 'escalated' || status === 'admin_joined') {
      if (chatId) {
        supabase.from('support_chat_messages').insert({ chat_id: chatId, sender: 'user', text: textToSend }).catch(console.error);
      }
      return;
    }

    setIsTyping(true);

    // Simulate AI response
    setTimeout(async () => {
      let aiResponse = "I understand. I can help with general questions about KERINT's features, pricing, or getting started.";
      const lowerInput = userMessage.text.toLowerCase();
      let shouldEscalate = false;
      
      if (lowerInput.includes('human') || lowerInput.includes('agent') || lowerInput.includes('admin') || lowerInput.includes('support')) {
        shouldEscalate = true;
      } else if (lowerInput.includes('pricing') || lowerInput.includes('cost')) {
        aiResponse = "KERINT has a Free Starter plan, a Pro plan at $49/mo, and Enterprise solutions. You can check the Pricing page for exact details.";
      } else if (lowerInput.includes('hi') || lowerInput.includes('hello')) {
        aiResponse = "Hello! How can I assist you with KERINT today?";
      }

      if (shouldEscalate) {
        await handleEscalate();
      } else {
        setMessages(prev => [...prev, { id: Date.now() + 1, text: aiResponse, sender: 'ai' }]);
        setIsTyping(false);
      }
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 dark:bg-background/50">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${
              msg.sender === 'user' 
                ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                : msg.sender === 'admin'
                  ? 'bg-indigo-50 border border-indigo-100 text-indigo-900 rounded-tl-sm shadow-sm'
                  : 'bg-white dark:bg-card border border-slate-200 dark:border-border text-slate-700 dark:text-foreground rounded-tl-sm shadow-sm'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                {msg.sender === 'ai' ? <Bot className="w-3.5 h-3.5 text-primary" /> : msg.sender === 'admin' ? <User className="w-3.5 h-3.5 text-indigo-600" /> : <User className="w-3.5 h-3.5 opacity-70" />}
                <span className={`text-[10px] font-semibold opacity-70 uppercase tracking-wider ${msg.sender === 'admin' ? 'text-indigo-600 font-bold' : ''}`}>
                  {msg.sender === 'ai' ? 'Support AI' : msg.sender === 'admin' ? 'Live Admin' : 'You'}
                </span>
              </div>
              <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-2xl rounded-tl-sm p-4 shadow-sm flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>

      <div className="p-4 bg-white dark:bg-card border-t border-slate-100 flex flex-col gap-3">
        {status !== 'escalated' && status !== 'admin_joined' && (
          <Button 
            variant="outline" 
            onClick={handleEscalate}
            className="w-full text-xs font-semibold gap-2 border-orange-200 text-orange-600 hover:bg-orange-50"
          >
            <PhoneCall className="w-3.5 h-3.5" /> Talk to a Human Agent
          </Button>
        )}
        {(status === 'escalated' || status === 'admin_joined') && (
          <div className="text-center pb-2">
            <span className={`text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full ${status === 'admin_joined' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700 animate-pulse'}`}>
              {status === 'admin_joined' ? 'Admin Connected' : 'Waiting for Admin...'}
            </span>
          </div>
        )}
        <form onSubmit={handleSend} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={status === 'admin_joined' ? "Type to live agent..." : "Type your message..."}
            className="w-full pl-4 pr-12 py-3 bg-slate-50 dark:bg-background border border-slate-200 dark:border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-full text-sm outline-none transition-all"
          />
          <button 
            type="submit" 
            disabled={!input.trim() || isTyping}
            className="absolute right-1.5 p-2 bg-primary text-white rounded-full disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
