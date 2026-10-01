import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { generateText } from '@/lib/cloudflareAI';
import { BrainCircuit, Send, Bot, User, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function AdminAI() {
  const [messages, setMessages] = useState([
    { role: 'ai', content: "Hello Super Admin. I'm your advanced AI assistant. You can ask me to analyze system metrics, predict which companies are likely to upgrade, or query recent audit logs." }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  // Fetch global metrics for the AI Context
  const { data: globalContext } = useQuery({
    queryKey: ['admin_ai_context'],
    queryFn: async () => {
      const { data: companies } = await supabase.from('companies').select('id, name, created_at, industry_type, subscription_status');
      const { data: profiles } = await supabase.from('profiles').select('id, company_id, role, last_sign_in_at');
      return { companies: companies || [], profiles: profiles || [] };
    }
  });

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const currentInput = input;
    const newMessages = [...messages, { role: 'user', content: currentInput }];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);

    try {
      // Create summarized context
      const contextSummary = globalContext ? {
        total_companies: globalContext.companies.length,
        active_companies: globalContext.companies.filter(c => c.subscription_status === 'active').length,
        total_users: globalContext.profiles.length,
        recent_logins: globalContext.profiles.filter(p => new Date(p.last_sign_in_at) > new Date(Date.now() - 7*24*60*60*1000)).length,
      } : { status: "Fetching context..." };

      const aiPrompt = `You are the Omni-AI for a SaaS Super Admin Dashboard. 
Context Data: ${JSON.stringify(contextSummary)}

The user previously asked:
${newMessages.map(m => `${m.role}: ${m.content}`).join('\n')}

Respond professionally with clear metrics and strategic advice to the last User query. Use markdown formatting.`;

      // Add placeholder for AI response
      setMessages(prev => [...prev, { role: 'ai', content: '' }]);

      await generateText([{ role: 'user', content: aiPrompt }], (streamedText) => {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1].content = streamedText;
          return updated;
        });
      });
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1].content = "Error connecting to AI Command Center. Please check Cloudflare API keys or network connection.";
        return updated;
      });
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 h-[calc(100vh-140px)] md:h-[calc(100vh-80px)] flex flex-col w-full max-w-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Intelligence</h1>
        <p className="text-muted-foreground mt-2">Interact with the database using natural language.</p>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden border-border bg-card">
        <CardHeader className="bg-muted/50 border-b border-border py-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-indigo-500" />
            Optavel AI Assistant
          </CardTitle>
        </CardHeader>
        
        <ScrollArea className="flex-1 p-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 mb-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-indigo-500" />
                </div>
              )}
              
              <div className={`px-4 py-2 rounded-2xl max-w-[80%] ${
                msg.role === 'user' 
                  ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                  : 'bg-muted text-foreground rounded-tl-sm'
              }`}>
                {msg.content}
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-primary" />
                </div>
              )}
            </div>
          ))}
        </ScrollArea>

        <CardContent className="p-4 bg-muted/50 border-t border-border mt-auto">
          <form onSubmit={handleSend} className="flex gap-2">
            <Input 
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about companies, logins, or predictive analytics..." 
              className="flex-1 bg-background"
              disabled={isTyping}
            />
            <Button type="submit" size="icon" disabled={isTyping || !input.trim()}>
              {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
