import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  BookOpen,
  Cpu,
  KeyRound,
  ShieldCheck,
  Code2,
  ArrowRight,
  Trash2,
  PlusCircle,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Security redaction and cleanup: strips token secrets, raw think tags, and internal prompt artifacts
function sanitizeAssistantOutput(text) {
  if (typeof text !== 'string') return text;
  return text
    // Remove reasoning / thinking tags from newer models
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<think>[\s\S]*/gi, '') // unclosed think during streaming
    .replace(/<\/?(?:system|instruction|admin|prompt|rules|developer|override)>/gi, '')
    .replace(/\[\/?INST\]/gi, '')
    .replace(/<\/?s>/gi, '')
    .replace(/<\|im_start\|>|<\|im_end\|>/gi, '')
    // Redact Bearer tokens and client secrets
    .replace(/(cpd_[a-zA-Z0-9_-]{8})[a-zA-Z0-9_-]+/g, '$1••••••••')
    .replace(/(secret_[a-zA-Z0-9_-]{8})[a-zA-Z0-9_-]+/g, '$1••••••••')
    .replace(/(client_[a-zA-Z0-9_-]{8})[a-zA-Z0-9_-]+/g, '$1••••••••')
    .replace(/(Bearer\s+)[a-zA-Z0-9_.-]{20,}/gi, '$1••••••••••••••••')
    .trimStart();
}

const INITIAL_MESSAGES = [
  {
    role: 'assistant',
    content: `👋 **Welcome to the Weftro Developer Copilot!**

I am your dedicated enterprise AI architect and technical advisor for the Weftro Developer Platform, Connect API v1, and MCP ecosystem:

* **Connect REST API (\`/api/v1\`):** Bearer token authentication, search, sessions, captures, and rate limits.
* **Model Context Protocol (MCP):** Connect Cursor IDE, Claude Desktop, and agentic workflows to live company intelligence.
* **Apps, Secrets & Scopes:** Granular OAuth scopes (\`search:read\`, \`memory:read\`, \`context:read\`, \`apps:manage\`).
* **Webhooks & Events:** Real-time subscriptions for \`memory.created\`, \`moment.detected\`, and HMAC signature verification.
* **Production Code Generation:** Runnable cURL, TypeScript/Node.js, and Python SDK integrations.

Select a quick prompt from the right or enter your technical requirement below.`
  }
];

const QUICK_TOPICS = [
  {
    category: 'API & Authentication',
    icon: KeyRound,
    prompts: [
      { label: 'How do I authenticate with Bearer tokens?', query: 'Provide a complete guide and cURL example on how to authenticate with Bearer tokens using the Weftro Connect API v1.' },
      { label: 'How do I rotate client secrets?', query: 'How do I rotate my developer client secret securely without downtime?' },
      { label: 'Explain all available API scopes', query: 'List all available API scopes for Weftro applications in a markdown comparison table with descriptions.' }
    ]
  },
  {
    category: 'MCP & Agent Integrations',
    icon: Cpu,
    prompts: [
      { label: 'Show me Cursor MCP configuration', query: 'Show me the exact .cursor/mcp.json configuration file to connect Cursor to Weftro MCP server with Bearer auth.' },
      { label: 'How do I query memories via MCP?', query: 'Which MCP tools are available to search and retrieve organizational memories? Provide tool names and parameters.' },
      { label: 'Configure Claude Desktop MCP', query: 'How do I configure claude_desktop_config.json to query Weftro MCP?' }
    ]
  },
  {
    category: 'Endpoints & Data Flow',
    icon: TerminalSquare,
    prompts: [
      { label: 'How do I search memories via API?', query: 'Show me an example cURL request and JSON response structure for POST /api/v1/search.' },
      { label: 'How does context session query work?', query: 'How do I query a context session and linked captures via /api/v1/context/query?' },
      { label: 'What rate limits are enforced?', query: 'Provide a table of rate limits, quotas, and response headers enforced on the Weftro API Gateway.' }
    ]
  }
];

export default function DeveloperAIAssistant() {
  const { user } = useAuth();
  const { toast } = useToast();
  const storageKey = `clipad_dev_copilot_history_${user?.id || 'default'}`;

  // Load persistent chat history from localStorage
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return INITIAL_MESSAGES;
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Sync messages to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch (_) {}
  }, [messages, storageKey]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Handle Clear Conversation History
  const handleConfirmDeleteHistory = () => {
    try {
      localStorage.removeItem(storageKey);
    } catch (_) {}
    setMessages(INITIAL_MESSAGES);
    setShowDeleteConfirm(false);
    toast({
      title: "History Cleared",
      description: "Developer Copilot conversation history has been reset."
    });
  };

  // Start a new conversation while preserving history or resetting view
  const handleStartNewChat = () => {
    setMessages(INITIAL_MESSAGES);
    toast({
      title: "New Conversation",
      description: "Started a fresh Copilot session."
    });
  };

  const handleSend = async (e, directText = null) => {
    e?.preventDefault();
    const query = (directText || input).trim();
    if (!query || isLoading) return;

    // Sanitize user query
    const sanitizedQuery = sanitizeAssistantOutput(query);
    const newMessages = [...messages, { role: 'user', content: sanitizedQuery }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const systemPrompt = `You are the Weftro Enterprise Developer Copilot, a senior API architect and systems engineer.
Your purpose is to provide authoritative, production-grade technical guidance for developers integrating with the Weftro V3 Connect API, MCP Protocol, and Developer Platform.

OFFICIAL VERIFIED DEVELOPER KNOWLEDGE BASE:
${JSON.stringify(DEVELOPER_PLATFORM_KNOWLEDGE, null, 2)}

CORE GUIDELINES:
1. Deliver structured, corporate-level responses. Never say you are a mock AI or simulate placeholder responses.
2. Provide real, valid cURL commands, Python (requests/httpx), and TypeScript/JavaScript snippets.
3. When presenting structured data, comparisons, scopes, headers, or parameters, ALWAYS format them in clean GitHub-Flavored Markdown tables.
4. Base URL: https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect (or /api/v1/* via API Gateway).
5. Authentication uses Bearer tokens in the HTTP Authorization header: "Authorization: Bearer cpd_...".
6. Never output or prompt for real production database passwords or confidential private keys.
7. Support MCP (Model Context Protocol) JSON-RPC 2.0 specifications for tools including search_memories, query_context_session, get_smart_moments, list_entities, and trigger_capture.
8. When providing diagrams, flowcharts, or architecture layouts, wrap them cleanly inside code blocks or structured tables so they can be scrolled horizontally.`;

      const promptPayload = [
        { role: 'system', content: systemPrompt },
        ...newMessages.slice(-8) // Bounded conversation context window
      ];

      let streamBuffer = '';
      await generateText(promptPayload, (token) => {
        streamBuffer = token;
        const cleaned = sanitizeAssistantOutput(streamBuffer);
        setMessages([...newMessages, { role: 'assistant', content: cleaned }]);
      });

      if (!streamBuffer) {
        setMessages([...newMessages, {
          role: 'assistant',
          content: "I am ready to help with your Weftro API or MCP integration. What technical implementation would you like to explore?"
        }]);
      }
    } catch (err) {
      console.error('[DeveloperCopilot] Error:', err);
      setMessages([...newMessages, {
        role: 'assistant',
        content: `⚠️ **Service Notice:** Unable to reach AI endpoint (${err.message || 'connection timeout'}). Please check your network or consult the API Documentation tab.`
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

  // Custom Markdown renderers for tables, pre, and code to guarantee horizontal scrolling
  const markdownComponents = useMemo(() => ({
    table: ({ node, ...props }) => (
      <div className="w-full my-3 overflow-x-auto rounded-xl border border-border bg-card/60 shadow-xs scrollbar-thin">
        <table className="w-full text-xs text-left border-collapse min-w-[500px]" {...props} />
      </div>
    ),
    thead: ({ node, ...props }) => (
      <thead className="bg-secondary/70 text-foreground font-semibold border-b border-border" {...props} />
    ),
    th: ({ node, ...props }) => (
      <th className="px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap text-foreground" {...props} />
    ),
    td: ({ node, ...props }) => (
      <td className="px-3.5 py-2 text-xs border-b border-border/40 text-muted-foreground whitespace-normal" {...props} />
    ),
    pre: ({ node, children, ...props }) => (
      <div className="w-full my-3 overflow-x-auto rounded-xl border border-border bg-slate-950 text-slate-100 p-3.5 shadow-xs scrollbar-thin">
        <pre className="text-xs font-mono whitespace-pre leading-relaxed min-w-max" {...props}>
          {children}
        </pre>
      </div>
    ),
    code: ({ node, inline, children, ...props }) => {
      if (inline) {
        return (
          <code className="px-1.5 py-0.5 rounded bg-muted/80 text-primary font-mono text-[11px] font-semibold" {...props}>
            {children}
          </code>
        );
      }
      return (
        <code className="font-mono text-xs whitespace-pre" {...props}>
          {children}
        </code>
      );
    }
  }), []);

  return (
    <div className="h-full w-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Top Copilot Bar */}
      <div className="h-12 border-b border-border bg-card/50 px-4 md:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Bot className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-foreground tracking-wide">Developer Copilot</span>
          <Badge variant="outline" className="text-[10px] py-0 px-2 bg-primary/5 text-primary border-primary/20">
            GPT & Kimi Engine
          </Badge>
        </div>

        {/* Toolbar: New Chat & Delete History */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStartNewChat}
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5"
            title="Start new conversation"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Chat</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
            title="Delete conversation history"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

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
                    className={`max-w-[90%] md:max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      isAssistant
                        ? 'bg-card border border-border/80 text-foreground shadow-xs rounded-tl-sm'
                        : 'bg-primary text-primary-foreground font-medium rounded-tr-sm shadow-xs'
                    }`}
                  >
                    {isAssistant ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none break-words [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:my-2 [&>ol]:my-2">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
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
                <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-card border border-border/80 flex items-center gap-2.5 text-xs text-muted-foreground shadow-xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  <span>Synthesizing enterprise technical response...</span>
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
              className="h-11 px-5 rounded-xl font-medium shadow-xs flex items-center gap-2"
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
              <span>Grounded Enterprise Knowledge</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Responses are anchored to live Weftro Connect API v1 specifications, OpenAPI schemas, and MCP tool protocols. Sensitive keys and secrets are automatically redacted.
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Modal: Delete Chat History */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="rounded-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold flex items-center gap-2 text-rose-500">
              <Trash2 className="w-4 h-4" />
              Delete Conversation History?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              This will permanently remove all messages and code snippets from your Developer Copilot history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="rounded-xl text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteHistory}
              className="rounded-xl text-xs bg-rose-600 hover:bg-rose-700 text-white font-medium"
            >
              Delete History
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
