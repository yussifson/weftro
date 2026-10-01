import React, { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import CustomPDFViewer from "@/components/documents/CustomPDFViewer";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { generateText } from "@/lib/cloudflareAI";
import { powerSync } from "@/api/PowerSyncConnector";
import { useToast } from "@/components/ui/use-toast";
import {
  X, Download, ExternalLink, Brain, Send, ChevronRight, ChevronDown,
  FileText, Image, Sheet, Presentation, Loader2, Sparkles,
  MessageSquare, RefreshCw, Copy, CheckCheck, Maximize2,
  Minimize2, AlertCircle, FileQuestion
} from "lucide-react";
import ReactMarkdown from 'react-markdown';
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// ─── Detect file type from URL or extension ─────────────────────────────────
function getFileType(doc) {
  const ext = (doc.file_type || doc.file_url?.split(".").pop()?.split("?")[0] || "").toLowerCase();
  if (["pdf"].includes(ext)) return "pdf";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"].includes(ext)) return "image";
  if (["doc", "docx", "ppt", "pptx", "xls", "xlsx"].includes(ext)) return "office";
  if (["csv", "txt", "md", "json"].includes(ext)) return "text";
  if (doc.file_url?.includes("docs.google.com") || doc.file_url?.includes("drive.google.com")) return "google";
  return "unknown";
}

// ─── AI Suggestion Chips ─────────────────────────────────────────────────────
const AI_SUGGESTIONS = [
  { label: "Summarize", prompt: "Provide a concise summary of this document." },
  { label: "Key Points", prompt: "List the key points and main takeaways from this document." },
  { label: "Action Items", prompt: "What action items or follow-ups are required based on this document?" },
  { label: "Risks & Issues", prompt: "Identify any risks, concerns, or legal issues in this document." },
  { label: "Key Dates", prompt: "Extract all important dates and deadlines mentioned in this document." },
  { label: "Obligations", prompt: "What obligations or responsibilities are outlined in this document?" },
];

// ─── AI Chat Message ─────────────────────────────────────────────────────────
function ChatMessage({ msg }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (msg.role === "user") {
    return (
      <div className="flex justify-end mb-3">
        <div className="max-w-[85%] bg-primary text-white px-4 py-2.5 rounded-2xl rounded-tr-md text-sm leading-relaxed">
          <ReactMarkdown 
            className="prose prose-sm prose-invert break-words max-w-none"
            components={{
              a: ({ href, children, ...props }) => {
                let safeHref = href;
                if (safeHref && !safeHref.startsWith('http') && !safeHref.startsWith('/') && !safeHref.startsWith('mailto:')) {
                  safeHref = 'https://' + safeHref;
                }
                return (
                  <a 
                    href={safeHref} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    onClick={(e) => e.stopPropagation()} 
                    className="text-primary-foreground hover:underline font-semibold underline-offset-2 break-all"
                    {...props}
                  >
                    {children}
                  </a>
                );
              }
            }}
          >
            {msg.content}
          </ReactMarkdown>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 mb-3 group">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Brain className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-muted/60 border border-border rounded-2xl rounded-tl-md px-4 py-3 text-sm text-foreground leading-relaxed">
          <ReactMarkdown 
            className="prose prose-sm dark:prose-invert break-words max-w-none"
            components={{
              a: ({ href, children, ...props }) => {
                let safeHref = href;
                if (safeHref && !safeHref.startsWith('http') && !safeHref.startsWith('/') && !safeHref.startsWith('mailto:')) {
                  safeHref = 'https://' + safeHref;
                }
                return (
                  <a 
                    href={safeHref} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    onClick={(e) => e.stopPropagation()} 
                    className="text-primary hover:underline font-semibold underline-offset-2 break-all"
                    {...props}
                  >
                    {children}
                  </a>
                );
              }
            }}
          >
            {msg.content}
          </ReactMarkdown>
        </div>
        <button
          onClick={copy}
          className="mt-1 ml-1 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {copied ? <CheckCheck className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

// ─── Document Renderer ───────────────────────────────────────────────────────
function DocumentRenderer({ doc, type }) {
  const [iframeError, setIframeError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  if (!doc.file_url) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
        <FileQuestion className="w-16 h-16 opacity-30" />
        <p className="font-medium">No file attached to this document</p>
        <p className="text-sm">Add a file URL or upload a file to preview it here.</p>
      </div>
    );
  }

  if (type === "image") {
    return (
      <div className="flex items-center justify-center h-full p-4 bg-checkerboard">
        <img
          src={doc.file_url}
          alt={doc.name}
          className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
          onLoad={() => setIsLoading(false)}
        />
      </div>
    );
  }

  if (type === "pdf") {
    return (
      <div className="relative w-full h-full">
        <CustomPDFViewer url={doc.file_url} name={doc.name} />
      </div>
    );
  }

  if (type === "office") {
    const embedUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(doc.file_url)}`;
    return (
      <div className="relative w-full h-full">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/30 z-10 pointer-events-none">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading Office Viewer...</p>
            </div>
          </div>
        )}
        <iframe
          src={embedUrl}
          title={doc.name}
          className="w-full h-full border-0"
          onLoad={() => setIsLoading(false)}
          onError={() => { setIframeError(true); setIsLoading(false); }}
        />
        {iframeError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground bg-background">
            <AlertCircle className="w-12 h-12 text-amber-400" />
            <p className="font-medium">Could not load Office viewer</p>
            <p className="text-sm text-center max-w-xs">The file URL may not be publicly accessible. Office Web Viewer requires a public URL.</p>
            <Button size="sm" variant="outline" onClick={() => window.open(doc.file_url, "_blank")}>
              <Download className="w-4 h-4 mr-2" /> Download File
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (type === "google") {
    const embedUrl = doc.file_url.replace("/view", "/preview").replace("/edit", "/preview");
    return (
      <iframe
        src={embedUrl}
        title={doc.name}
        className="w-full h-full border-0"
        allow="autoplay"
      />
    );
  }

  // Unknown / fallback
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
      <FileText className="w-16 h-16 opacity-30" />
      <div className="text-center">
        <p className="font-medium">{doc.name}</p>
        <p className="text-sm mt-1">Preview not available for this file type</p>
      </div>
      <Button variant="outline" onClick={() => window.open(doc.file_url, "_blank")}>
        <ExternalLink className="w-4 h-4 mr-2" /> Open / Download File
      </Button>
    </div>
  );
}

// ─── Main SmartDocumentViewer ────────────────────────────────────────────────
export default function SmartDocumentViewer({ doc, onClose }) {
  if (!doc) return null;

  const docName = doc.name || "Document";
  const { toast } = useToast();
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `Hello! I'm your AI document assistant. I'm ready to help you analyze **${docName}**.\n\nYou can ask me anything about this document, or use the quick actions below to get started instantly.`
    }
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [aiPanelExpanded, setAiPanelExpanded] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [quickAnalysisOpen, setQuickAnalysisOpen] = useState(true);
  const [extractedText, setExtractedText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const chatEndRef = useRef(null);
  const fileType = getFileType(doc);

  useEffect(() => {
    async function extract() {
      if (!doc?.file_url) return;
      setIsExtracting(true);
      try {
        if (fileType === 'pdf') {
          const loadingTask = pdfjsLib.getDocument({ url: doc.file_url });
          const pdf = await loadingTask.promise;
          let text = '';
          const maxPages = Math.min(pdf.numPages, 15);
          for (let i = 1; i <= maxPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map(item => item.str).join(' ') + '\n';
          }
          setExtractedText(text.trim());
        } else if (fileType === 'text') {
          const res = await fetch(doc.file_url);
          const text = await res.text();
          setExtractedText(text.slice(0, 15000));
        }
      } catch (err) {
        console.error("Failed to extract document text:", err);
      } finally {
        setIsExtracting(false);
      }
    }
    extract();
  }, [doc?.file_url, fileType]);

  const docContext = `
Document Name: ${docName}
Category: ${doc.category || "—"}
Uploaded By: ${doc.uploaded_by || "—"}
Date: ${doc.filing_date?.split("T")[0] || "—"}
Expiry Date: ${doc.expiry_date || "N/A"}
Signature Status: ${doc.signature_status || "—"}
Tags: ${doc.tags || "none"}
Notes: ${doc.notes || "none"}
${doc.ai_summary ? `Existing Summary: ${doc.ai_summary}` : ""}
`.trim();

  const sendMessage = useCallback(async (userPrompt) => {
    const prompt = userPrompt || input.trim();
    if (!prompt || isThinking) return;
    setInput("");
    setIsThinking(true);

    const userMsg = { role: "user", content: prompt };
    setMessages(prev => [...prev, userMsg]);

    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);

    try {
      const systemPrompt = `You are an expert document analyst and business intelligence assistant embedded inside Slate, a business management platform.
You are analyzing the following document metadata:
${docContext}

${extractedText ? `--- EXTRACTED DOCUMENT TEXT ---\n${extractedText}\n-------------------------------` : ""}

Provide helpful, structured, and actionable insights. Be concise but thorough. Use bullet points for lists. Format your response clearly.`;

      const response = await generateText([
        { role: "system", content: systemPrompt },
        ...messages.filter(m => m.role !== "assistant" || messages.indexOf(m) > 0),
        userMsg
      ]);

      const aiMsg = { role: "assistant", content: response || "I wasn't able to generate a response. Please try again." };
      setMessages(prev => [...prev, aiMsg]);

      // Save first AI summary to database
      if (!doc.ai_summary && messages.length <= 2) {
        try {
          await powerSync.execute("UPDATE documents SET ai_summary = ? WHERE id = ?", [response.slice(0, 500), doc.id]);
        } catch (e) { /* Non-fatal */ }
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I encountered an error. Please check your connection and try again."
      }]);
    } finally {
      setIsThinking(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [input, isThinking, messages, docContext, doc]);

  const fileIconMap = {
    pdf: <FileText className="w-4 h-4 text-red-500" />,
    image: <Image className="w-4 h-4 text-blue-500" />,
    office: <Sheet className="w-4 h-4 text-green-600" />,
    google: <ExternalLink className="w-4 h-4 text-blue-600" />,
    unknown: <FileText className="w-4 h-4 text-muted-foreground" />,
  };

  const content = (
    <div className={`fixed inset-0 z-[99999] bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center ${isFullscreen ? 'p-0' : 'p-2 md:p-6 lg:p-8'}`}>
      <div className={`bg-background shadow-2xl border border-border flex flex-col overflow-hidden transition-all duration-300 ${
        isFullscreen ? "w-full h-full rounded-none" : "w-full max-w-[1400px] h-[92vh] rounded-xl"
      }`}>
        
        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center flex-shrink-0">
            {fileIconMap[fileType]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate text-sm">{doc.name}</p>
            <div className="flex items-center gap-2 flex-wrap">
              {doc.category && <Badge className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary">{doc.category}</Badge>}
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{fileType.toUpperCase()}</span>
              {doc.expiry_date && <span className="text-[10px] text-amber-500">Expires: {doc.expiry_date}</span>}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {doc.file_url && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground"
                onClick={() => window.open(doc.file_url, "_blank")}
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground"
              onClick={() => setIsFullscreen(f => !f)}
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
            <button
              onClick={() => setAiPanelExpanded(v => !v)}
              className="hidden md:flex h-8 px-2 items-center gap-1 text-xs font-medium text-primary hover:bg-primary/5 dark:hover:bg-primary/10 rounded-lg transition-colors"
              title="Toggle AI Panel"
            >
              <Brain className="w-3.5 h-3.5" />
              {aiPanelExpanded ? "Hide AI" : "Show AI"}
            </button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* Document View */}
          <div className={`flex-1 bg-muted/20 overflow-hidden transition-all duration-300 ${!aiPanelExpanded ? "w-full" : ""}`}>
            <DocumentRenderer doc={doc} type={fileType} />
          </div>

          {/* AI Panel */}
          {aiPanelExpanded && (
            <div className="w-full md:w-[380px] flex-shrink-0 border-l border-border flex flex-col bg-background">
              


              {/* Document Reading Status */}
              {isExtracting && (
                <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border-b border-border flex-shrink-0">
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  <span className="text-[11px] text-primary font-medium">Reading document content...</span>
                </div>
              )}
              {!isExtracting && extractedText && (
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border-b border-border flex-shrink-0">
                  <CheckCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">Document content loaded — AI can answer questions about it</span>
                </div>
              )}

              {/* Suggestion Chips - Collapsible */}
              <div className="border-b border-border flex-shrink-0">
                <button
                  onClick={() => setQuickAnalysisOpen(o => !o)}
                  className="w-full flex items-center justify-between px-3 py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-medium hover:text-foreground transition-colors"
                >
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Quick Analysis
                  </span>
                  {quickAnalysisOpen
                    ? <ChevronDown className="w-3 h-3" />
                    : <ChevronRight className="w-3 h-3" />
                  }
                </button>
                {quickAnalysisOpen && (
                  <div className="px-3 pb-2.5 flex flex-wrap gap-1.5">
                    {AI_SUGGESTIONS.map(s => (
                      <button
                        key={s.label}
                        onClick={() => sendMessage(s.prompt)}
                        disabled={isThinking}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 dark:bg-primary/20 dark:text-primary dark:hover:bg-primary/30 font-medium transition-colors disabled:opacity-50"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {messages.map((msg, i) => (
                  <ChatMessage key={i} msg={msg} />
                ))}
                {isThinking && (
                  <div className="flex gap-2 mb-3">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Brain className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="bg-muted/60 border border-border rounded-2xl rounded-tl-md px-4 py-3">
                      <div className="flex gap-1 items-center">
                        <span className="w-2 h-2 bg-primary-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 bg-primary-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 bg-primary-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-border flex-shrink-0">
                <div className="relative">
                  <Textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Ask anything about this document..."
                    rows={2}
                    className="resize-none text-sm pr-11 py-2.5"
                    disabled={isThinking}
                  />
                  <button
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || isThinking}
                    className="absolute right-2 bottom-2 w-7 h-7 rounded-lg bg-primary hover:hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                  >
                    {isThinking ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <Send className="w-3.5 h-3.5 text-white" />}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5 text-center">Enter to send · Shift+Enter for new line</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
