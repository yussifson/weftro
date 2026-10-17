import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { generateText } from '@/lib/cloudflareAI';
import { DEVELOPER_PLATFORM_KNOWLEDGE } from '@/lib/weftroDeveloperDocs';
import { Bot, Send, User, Sparkles, TerminalSquare, ShieldAlert, Copy, CheckCircle2, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Security redaction pattern: Redacts Bearer tokens, client secrets, and sensitive credentials
function redactSecrets(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/(cpd_[a-zA-Z0-9_-]{8})[a-zA-Z0-9_-]+/g, '$1••••••••')
    .replace(/(secret_[a-zA-Z0-9_-]{8})[a-zA-Z0-9_-]+/g, '$1••••••••')
    .replace(/(client_[a-zA-Z0-9_-]{8})[a-zA-Z0-9_-]+/g, '$1••••••••')
    .replace(/(Bearer\s+)[a-zA-Z0-9_.-]{20,}/gi, '$1••••••••••••••••');
}

const INITIAL_MESSAGES = [
  {
    role: 'assistant',
    content: `👋 **Welcome to the Weftro Developer Assistant!**

I am specifically dedicated to helping you build and integrate applications with Weftro:
* **Connect REST API (/api/v1):** Authentication, headers, pagination, rate limits, and errors.
* **Credentials & Scopes:** Managing Client IDs, Client Secrets, and granular token scopes.
* **Model Context Protocol (MCP):** Configuring Cursor, Claude Desktop, and AI agents.
* **Examples & Troubleshooting:** Formulating cURL commands and debugging HTTP status codes.

How can I assist your integration today?`
  }
];

export default function DeveloperAIAssistant() {
  const { user } = useAuth();
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (e) => {
    e?.preventDefault();
    const query = input.trim();
    if (!query || isLoading) return;

    // Redact any user-pasted sensitive token before saving to message history
    const sanitizedQuery = redactSecrets(query);
    const newMessages = [...messages, { role: 'user', content: sanitizedQuery }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const systemPrompt = `You are the Weftro Developer Platform AI Assistant.
Your sole mission is to provide accurate, concise, and production-grade guidance for developers building on the Weftro V3 Connect API, Developer Platform, and MCP Protocol.

VERIFIED CAPABILITIES KNOWLEDGE BASE:
${JSON.stringify(DEVELOPER_PLATFORM_KNOWLEDGE, null, 2)}

STRICT OPERATING INSTRUCTIONS:
1. ONLY describe endpoints, routes, scopes, and tools that exist in the knowledge base above (/api/v1/*).
2. Base URL: https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect
3. Authentication requires Bearer tokens ("Authorization: Bearer cpd_...").
4. If asked about features in future phases (e.g., Phase 5 production MCP streaming, Phase 6 webhook delivery worker), state clearly that they are planned for upcoming releases.
5. NEVER ask for or output raw secrets, API tokens, passwords, or company internal database passwords.
6. Provide clear, runnable cURL and code snippets when requested.
7. Format your response cleanly using Markdown and code blocks.`;

      const promptPayload = [
        { role: 'system', content: systemPrompt },
        ...newMessages.slice(-6) // bounded conversation window
      ];

      let streamBuffer = '';
      await generateText(promptPayload, (token) => {
        streamBuffer = token;
        setMessages([...newMessages, { role: 'assistant', content: redactSecrets(streamBuffer) }]);
      }, { fast: true });

      if (!streamBuffer) {
        setMessages([...newMessages, { role: 'assistant', content: "I'm ready to help with Weftro API integration questions. Please try again." }]);
      }
    } catch (err) {
      console.error('[DeveloperAIAssistant] Error:', err);
      setMessages([...newMessages, {
        role: 'assistant',
        content: `⚠️ **Unable to complete request:** ${err.message || 'AI service unavailable.'}. Please refer to the **API Documentation** tab for standard specs.`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="flex flex-col h-[750px] bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
            <TerminalSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-foreground">Weftro Developer AI Assistant</h3>
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-mono">
                API v1 Grounded
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Technical advisor for Weftro REST API, MCP, and application development</p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5"
          onClick={() => setMessages(INITIAL_MESSAGES)}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Chat
        </Button>
      </div>

      {/* Suggested Quick Questions */}
      <div className="px-4 py-2.5 bg-secondary/30 border-b border-border/60 flex items-center gap-2 overflow-x-auto text-xs shrink-0">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0">Quick prompts:</span>
        {[
          "How do I search memories via API?",
          "How do I rotate my client secret?",
          "Explain available API scopes",
          "Show me the Cursor MCP config"
        ].map((prompt, i) => (
          <button
            key={i}
            onClick={() => { setInput(prompt); }}
            className="px-2.5 py-1 rounded-full bg-background border border-border hover:border-primary/50 text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl p-4 text-sm ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground font-medium rounded-tr-none'
                  : 'bg-muted/40 border border-border text-foreground rounded-tl-none space-y-2'
              }`}
            >
              {msg.role === 'user' ? (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              )}

              {msg.role === 'assistant' && idx > 0 && (
                <div className="flex items-center justify-end pt-1 mt-1 border-t border-border/40">
                  <button
                    onClick={() => copyToClipboard(msg.content, idx)}
                    className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                  >
                    {copiedIndex === idx ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy answer</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-[#fad503] flex items-center justify-center text-[#006065] shrink-0 font-bold text-xs mt-0.5">
                {user?.email ? user.email[0].toUpperCase() : <User className="w-4 h-4" />}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              Generating verified technical answer...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-3.5 border-t border-border bg-background flex items-center gap-2 shrink-0">
        <Input
          placeholder="Ask about Weftro APIs, scopes, MCP configuration, rate limits..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
          className="flex-1 bg-secondary/30 text-sm"
        />
        <Button type="submit" disabled={!input.trim() || isLoading} className="h-10 px-4 flex items-center gap-1.5">
          <Send className="w-4 h-4" />
          <span>Ask</span>
        </Button>
      </form>
    </div>
  );
}
