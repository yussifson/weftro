import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { generateText } from '@/lib/cloudflareAI';
import { DEVELOPER_PLATFORM_KNOWLEDGE } from '@/lib/weftroDeveloperDocs';
import {
  Bot,
  Send,
  User,
  Sparkles,
  TerminalSquare,
  Copy,
  CheckCircle2,
  Loader2,
  RotateCcw,
  BookOpen,
  Cpu,
  KeyRound,
  ShieldCheck,
  ChevronRight,
  Code2,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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

I am your dedicated technical advisor for the Weftro Developer Platform & Connect ecosystem:
* **Connect REST API (\`/api/v1\`):** Authentication, headers, pagination, rate limits, and errors.
* **Credentials & Scopes:** Managing Client IDs, Client Secrets, and granular token scopes.
* **Model Context Protocol (MCP):** Configuring Cursor, Claude Desktop, and AI agents.
* **Examples & Troubleshooting:** Formulating cURL commands and debugging HTTP status codes.

Choose a quick prompt on the right or type your question below to get started.`
  }
];

const QUICK_TOPICS = [
  {
    category: 'API & Authentication',
    icon: KeyRound,
    prompts: [
      { label: 'How do I authenticate with Bearer tokens?', query: 'How do I authenticate with Bearer tokens in the Connect API?' },
      { label: 'How do I rotate my client secret?', query: 'How do I rotate my client secret without breaking production?' },
      { label: 'Explain all available API scopes', query: 'Explain all available API scopes for application tokens.' }
    ]
  },
  {
    category: 'MCP & Agent Integrations',
    icon: Cpu,
    prompts: [
      { label: 'Show me the Cursor MCP config', query: 'Show me how to configure Cursor IDE to connect to Weftro MCP.' },
      { label: 'How do I query memories via MCP?', query: 'Which MCP tools are available to search and retrieve memories?' },
      { label: 'Configure Claude Desktop MCP', query: 'How do I configure Claude Desktop with Weftro MCP?' }
    ]
  },
  {
    category: 'Endpoints & Retrieval',
    icon: TerminalSquare,
    prompts: [
      { label: 'How do I search memories via API?', query: 'Show me an example cURL request to POST /api/v1/search.' },
      { label: 'How does context session query work?', query: 'How do I query a context session and linked captures via /api/v1/context/query?' },
      { label: 'What rate limits are enforced?', query: 'What rate limits and headers are enforced on the API Gateway?' }
    ]
  }
];

export default function DeveloperAIAssistant() {
  const { user } = useAuth();
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (e, directText = null) => {
    e?.preventDefault();
    const query = (directText || input).trim();
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
1. ONLY describe endpoints, routes, scopes, and tools that exist in the knowledge base above (/api/v1/* and MCP).
2. Base URL: https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect
3. Authentication requires Bearer tokens ("Authorization: Bearer cpd_...").
4. If asked about features in future phases, state clearly that they are planned for upcoming releases.
5. NEVER ask for or output raw secrets, API tokens, passwords, or company internal database passwords.
6. Provide clear, runnable cURL, JSON, and code snippets when requested.
7. Format your response cleanly using Markdown and code blocks with syntax highlighting.`;

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
    <div className="h-full w-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Main Responsive Two-Column Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
        {/* Left / Center Column: Chat Messages & Input (8 cols on lg) */}
        <div className="lg:col-span-8 flex flex-col h-full min-h-0 border-r border-border overflow-hidden bg-card/30">
          {/* Scrollable Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4 scrollbar-thin">
            {messages.map((msg, idx) => {
              const isAssistant = msg.role === 'assistant';
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-3.5 ${isAssistant ? 'justify-start' : 'justify-end'}`}
                >
                  {isAssistant && (
                    <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5 shadow-sm">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      isAssistant
                        ? 'bg-card border border-border/80 text-foreground shadow-sm rounded-tl-sm'
                        : 'bg-primary text-primary-foreground font-medium rounded-tr-sm shadow-sm'
                    }`}
                  >
                    {isAssistant ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none break-words [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:my-2 [&>ol]:my-2 [&>pre]:my-2 [&>pre]:bg-secondary/60 [&>pre]:p-3 [&>pre]:rounded-lg [&>pre]:border [&>pre]:border-border/60 [&_code]:text-xs [&_code]:font-mono">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}

                    {isAssistant && idx > 0 && (
                      <div className="flex items-center justify-end pt-2 mt-2 border-t border-border/40">
                        <button
                          onClick={() => copyToClipboard(msg.content, idx)}
                          className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                        >
                          {copiedIndex === idx ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              <span className="text-emerald-500 font-medium">Copied to clipboard</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy response</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {!isAssistant && (
                    <div className="w-7 h-7 rounded-lg bg-[#fad503] flex items-center justify-center text-[#006065] shrink-0 font-bold text-xs mt-0.5 shadow-sm">
                      {user?.email ? user.email[0].toUpperCase() : <User className="w-3.5 h-3.5" />}
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 animate-pulse">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-card border border-border/80 flex items-center gap-2.5 text-xs text-muted-foreground shadow-sm">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  <span>Synthesizing verified technical answer...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick chips bar directly above input on mobile / tablet */}
          <div className="lg:hidden px-4 py-2 bg-muted/40 border-t border-border/60 flex items-center gap-2 overflow-x-auto text-xs shrink-0 hide-scrollbar">
            <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">Try:</span>
            {[
              "Bearer auth example",
              "Cursor MCP config",
              "Rotate client secret",
              "POST /api/v1/search"
            ].map((p, i) => (
              <button
                key={i}
                onClick={() => handleSend(null, p)}
                className="px-2.5 py-1 rounded-full bg-background border border-border hover:border-primary text-xs text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Bottom Prompt Input Area */}
          <form
            onSubmit={(e) => handleSend(e)}
            className="p-4 border-t border-border bg-card/80 backdrop-blur-sm shrink-0 flex items-center gap-3"
          >
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                placeholder="Ask about endpoints, token scopes, MCP integration, or code snippets..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                className="w-full h-11 px-4 pr-10 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50"
              />
            </div>
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="h-11 px-5 rounded-xl font-medium shadow-sm flex items-center gap-2"
            >
              <span>Send</span>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>

        {/* Right Column: Quick Actions & Knowledge Hub (4 cols on lg, scrollable) */}
        <div className="hidden lg:flex lg:col-span-4 flex-col h-full bg-card/50 overflow-y-auto p-5 space-y-5 scrollbar-thin">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Instant Inquiries
            </h3>
          </div>

          {/* Categorized Quick Links */}
          <div className="space-y-4">
            {QUICK_TOPICS.map((topic, tIdx) => {
              const Icon = topic.icon;
              return (
                <div key={tIdx} className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                    <Icon className="w-3.5 h-3.5 text-primary" />
                    <span>{topic.category}</span>
                  </div>
                  <div className="space-y-1.5">
                    {topic.prompts.map((item, pIdx) => (
                      <button
                        key={pIdx}
                        onClick={() => handleSend(null, item.query)}
                        disabled={isLoading}
                        className="w-full text-left px-3 py-2 text-xs rounded-lg border border-border/70 bg-card hover:bg-secondary hover:border-primary/40 transition-all flex items-center justify-between group disabled:opacity-50"
                      >
                        <span className="text-muted-foreground group-hover:text-foreground line-clamp-1">
                          {item.label}
                        </span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5 shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Context Card */}
          <div className="mt-auto p-3.5 rounded-xl border border-border/80 bg-secondary/30 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Grounded Knowledge Base</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Responses are strictly anchored to the live Weftro Connect API v1 OpenAPI schema and MCP tool definitions. All credentials and secrets are automatically redacted.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
