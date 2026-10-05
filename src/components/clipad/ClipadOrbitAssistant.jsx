import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Bot, Send, Sparkles, X, Brain, Loader2, ExternalLink,
  Calendar, Video, ShieldAlert, AlertTriangle, RefreshCw,
  ChevronDown, Plus, Link, Mic, Paperclip, Command,
  ImageIcon, BarChart2, ListTodo, FileText, PenTool,
  MoreHorizontal, Layers, Copy, Check, RotateCcw,
  MessageSquare, Trash2, ChevronLeft, ChevronRight,
  PanelLeft, Clock, Zap, Menu, Settings
} from 'lucide-react';
import { buildOrgContext } from '@/lib/clipadIntelligence';
import { generateText } from '@/lib/cloudflareAI';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import ThinkingAccordion, { parseThinking } from '@/components/chat/ThinkingAccordion';

/* â”€â”€â”€ Source type metadata â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const SOURCE_META = {
  meeting:     { icon: Calendar,      color: 'text-blue-500',   bg: 'bg-blue-500/10'   },
  decision:    { icon: ShieldAlert,   color: 'text-rose-500',   bg: 'bg-rose-500/10'   },
  video:       { icon: Video,         color: 'text-purple-500', bg: 'bg-purple-500/10' },
  blocker:     { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  integration: { icon: Link,          color: 'text-sky-500',    bg: 'bg-sky-500/10'    },
};

/* â”€â”€â”€ Starter prompts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const STARTER_PROMPTS = [
  { icon: BarChart2,  color: 'text-blue-500',   label: 'Analyze data',      text: 'Analyze my workspace data and give me key insights' },
  { icon: ListTodo,   color: 'text-purple-500',  label: 'Make a plan',       text: 'Make a plan for my upcoming week based on my tasks' },
  { icon: FileText,   color: 'text-pink-500',    label: 'Summarize',         text: 'Summarize the recent meeting activity and decisions' },
  { icon: PenTool,    color: 'text-orange-500',  label: 'Help me write',     text: 'Help me draft an email update for the team' },
  { icon: ImageIcon,  color: 'text-[#006065]', label: 'Create image',      text: 'Create an image concept for our project presentation' },
  { icon: MoreHorizontal, color: 'text-slate-500', label: 'More',            text: 'What else can you do? Show me all your capabilities.' },
];

/* â”€â”€â”€ Markdown renderer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function renderMarkdownContent(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={i} className="my-3 bg-black/10 dark:bg-white/5 rounded-xl p-3 overflow-x-auto text-[12.5px] font-mono leading-relaxed border border-white/5">
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      i++;
      continue;
    }

    // Heading
    if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-[14px] font-bold mt-4 mb-1 text-slate-900 dark:text-white">{line.slice(4)}</h3>);
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-[15px] font-bold mt-4 mb-1 text-slate-900 dark:text-white">{line.slice(3)}</h2>);
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="text-[16px] font-bold mt-4 mb-2 text-slate-900 dark:text-white">{line.slice(2)}</h1>);
    }
    // Bullet
    else if (/^[\-\*] /.test(line)) {
      elements.push(
        <div key={i} className="flex gap-2 my-0.5">
          <span className="mt-[5px] w-1.5 h-1.5 rounded-full bg-current shrink-0 opacity-50" />
          <span>{inlineMarkdown(line.slice(2))}</span>
        </div>
      );
    }
    // Numbered list
    else if (/^\d+\. /.test(line)) {
      const num = line.match(/^(\d+)\./)[1];
      elements.push(
        <div key={i} className="flex gap-2 my-0.5">
          <span className="shrink-0 font-semibold text-primary text-[12px] min-w-[18px]">{num}.</span>
          <span>{inlineMarkdown(line.replace(/^\d+\. /, ''))}</span>
        </div>
      );
    }
    // Horizontal rule
    else if (line.startsWith('---') || line.startsWith('***')) {
      elements.push(<hr key={i} className="my-3 border-white/10" />);
    }
    // Empty line = spacing
    else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
    }
    // Regular paragraph
    else {
      elements.push(<p key={i} className="leading-relaxed">{inlineMarkdown(line)}</p>);
    }
    i++;
  }
  return elements;
}

function renderMarkdown(text) {
  if (!text) return null;
  const { thinking, content: cleanText, isThinkingDone } = parseThinking(text);

  return (
    <div>
      {thinking && <ThinkingAccordion thinking={thinking} isThinkingDone={isThinkingDone} />}
      {cleanText ? renderMarkdownContent(cleanText) : null}
    </div>
  );
}

function inlineMarkdown(text) {
  // bold, italic, code, links
  const parts = [];
  const re = /\*\*(.*?)\*\*|\*(.*?)\*|`(.*?)`|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let m;
  let k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1] !== undefined) parts.push(<strong key={k++}>{m[1]}</strong>);
    else if (m[2] !== undefined) parts.push(<em key={k++}>{m[2]}</em>);
    else if (m[3] !== undefined) parts.push(<code key={k++} className="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-[12px] font-mono">{m[3]}</code>);
    else if (m[4] !== undefined) parts.push(<a key={k++} href={m[5]} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">{m[4]}</a>);
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length > 0 ? parts : text;
}

/* â”€â”€â”€ DB Helpers (with localStorage fallback) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const LS_KEY_SESSIONS = (uid) => `orbit_sessions_${uid}`;
const LS_KEY_MSGS = (sid) => `orbit_msgs_${sid}`;

async function dbLoadSessions(userId) {
  // Always try Supabase first â€” localStorage is ONLY a write-through cache, never a primary source
  try {
    const { data, error } = await supabase
      .from('orbit_chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    const sessions = data || [];
    // Keep localStorage in sync (so offline fallback is recent)
    try { localStorage.setItem(LS_KEY_SESSIONS(userId), JSON.stringify(sessions.slice(0, 20))); } catch {}
    return sessions;
  } catch (dbErr) {
    console.warn('[OrbitFlow] Supabase session load failed, using localStorage fallback:', dbErr?.message);
    try {
      return JSON.parse(localStorage.getItem(LS_KEY_SESSIONS(userId)) || '[]');
    } catch { return []; }
  }
}

async function dbCreateSession(userId, companyId, spaceId, title) {
  const session = {
    id: crypto.randomUUID(),
    user_id: userId,
    company_id: companyId || null,
    space_id: spaceId || null,
    title: title || 'New Chat',
    model: 'moonshotai/kimi-k3',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  try {
    const { data, error } = await supabase
      .from('orbit_chat_sessions')
      .insert(session)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch {
    // Fallback to localStorage
    try {
      const existing = JSON.parse(localStorage.getItem(LS_KEY_SESSIONS(userId)) || '[]');
      existing.unshift(session);
      localStorage.setItem(LS_KEY_SESSIONS(userId), JSON.stringify(existing.slice(0, 50)));
    } catch {}
    return session;
  }
}

async function dbUpdateSessionTitle(sessionId, title, userId) {
  try {
    await supabase
      .from('orbit_chat_sessions')
      .update({ title, updated_at: new Date().toISOString() })
      .eq('id', sessionId);
  } catch {
    try {
      const existing = JSON.parse(localStorage.getItem(LS_KEY_SESSIONS(userId)) || '[]');
      const s = existing.find(x => x.id === sessionId);
      if (s) { s.title = title; s.updated_at = new Date().toISOString(); }
      localStorage.setItem(LS_KEY_SESSIONS(userId), JSON.stringify(existing));
    } catch {}
  }
}

async function dbTouchSession(sessionId, userId) {
  try {
    await supabase
      .from('orbit_chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId);
  } catch {
    try {
      const existing = JSON.parse(localStorage.getItem(LS_KEY_SESSIONS(userId)) || '[]');
      const s = existing.find(x => x.id === sessionId);
      if (s) s.updated_at = new Date().toISOString();
      localStorage.setItem(LS_KEY_SESSIONS(userId), JSON.stringify(existing));
    } catch {}
  }
}

async function dbDeleteSession(sessionId, userId) {
  try {
    await supabase.from('orbit_chat_messages').delete().eq('session_id', sessionId);
    await supabase.from('orbit_chat_sessions').delete().eq('id', sessionId);
  } catch {}
  try {
    const existing = JSON.parse(localStorage.getItem(LS_KEY_SESSIONS(userId)) || '[]');
    localStorage.setItem(LS_KEY_SESSIONS(userId), JSON.stringify(existing.filter(x => x.id !== sessionId)));
    localStorage.removeItem(LS_KEY_MSGS(sessionId));
  } catch {}
}

async function dbLoadMessages(sessionId, userId) {
  // Always prefer DB â€” this is the single source of truth for message history
  try {
    const { data, error } = await supabase
      .from('orbit_chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    const messages = (data || []).map(m => ({
      id: m.id,
      role: m.role,
      text: m.content,
      sources: m.sources || [],
      executedAction: m.executed_action || null,
      created_at: m.created_at,
    }));
    // Write-through to localStorage for offline resilience
    try { localStorage.setItem(LS_KEY_MSGS(sessionId), JSON.stringify(messages.slice(-30))); } catch {}
    return messages;
  } catch (dbErr) {
    console.warn('[OrbitFlow] Supabase message load failed, using localStorage fallback:', dbErr?.message);
    try {
      return JSON.parse(localStorage.getItem(LS_KEY_MSGS(sessionId)) || '[]');
    } catch { return []; }
  }
}

async function dbSaveMessage(sessionId, userId, role, content, sources, executedAction) {
  const msg = {
    id: crypto.randomUUID(),
    session_id: sessionId,
    role,
    content,
    sources: sources || [],
    executed_action: executedAction || null,
    created_at: new Date().toISOString(),
  };
  try {
    const { data, error } = await supabase
      .from('orbit_chat_messages')
      .insert({
        id: msg.id,
        session_id: sessionId,
        role,
        content,
        sources: sources || [],
        executed_action: executedAction || null,
      })
      .select()
      .single();
    if (error) throw error;
    return { ...msg, id: data.id };
  } catch {
    try {
      const existing = JSON.parse(localStorage.getItem(LS_KEY_MSGS(sessionId)) || '[]');
      existing.push(msg);
      localStorage.setItem(LS_KEY_MSGS(sessionId), JSON.stringify(existing));
    } catch {}
    return msg;
  }
}

/* â”€â”€â”€ Grouping sessions by date â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function groupSessionsByDate(sessions) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const week = new Date(today); week.setDate(week.getDate() - 7);

  const groups = { Today: [], Yesterday: [], 'Last 7 Days': [], Older: [] };
  for (const s of sessions) {
    const d = new Date(s.updated_at || s.created_at);
    if (d >= today) groups['Today'].push(s);
    else if (d >= yesterday) groups['Yesterday'].push(s);
    else if (d >= week) groups['Last 7 Days'].push(s);
    else groups['Older'].push(s);
  }
  return groups;
}

/* â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export default function ClipadOrbitAssistant({ isOpen = true, onClose, spaceId = null }) {
  const { user } = useAuth();
  const userId = user?.id;
  const companyId = user?.company_id || user?.user_metadata?.company_id || null;

  /* sessions */
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  /* messages */
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  /* input, file & AI state */
  const [input, setInput] = useState('');
  const [attachedFile, setAttachedFile] = useState(null); // { name, bytes, type }
  const [isTyping, setIsTyping] = useState(false);
  const [streamingText, setStreamingText] = useState('');

  /* org context */
  const [orgContext, setOrgContext] = useState(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);

  /* UI state */
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [editingTitleId, setEditingTitleId] = useState(null);
  const [editingTitleValue, setEditingTitleValue] = useState('');

  const endRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamingRef = useRef('');

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const arrayBuffer = event.target?.result;
      if (arrayBuffer) {
        setAttachedFile({
          name: file.name,
          bytes: new Uint8Array(arrayBuffer),
          type: file.type.startsWith('image/') ? 'image' : 'file',
        });
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  /* scroll to bottom on new messages */
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText, isTyping]);

  /* load sessions on open */
  useEffect(() => {
    if (isOpen && userId) {
      loadSessions();
      if (!orgContext) loadContext();
    }
  }, [isOpen, userId]);

  /* listen for injected prompts (e.g. from DailyBriefing or other widgets) */
  useEffect(() => {
    const handleInject = (e) => {
      const query = e.detail?.query;
      if (query) {
        handleSend(query);
      }
    };
    window.addEventListener('orbit:inject', handleInject);
    return () => window.removeEventListener('orbit:inject', handleInject);
  }, [handleSend]);

  const loadSessions = async () => {
    if (!userId) return;
    setSessionsLoading(true);
    try {
      const data = await dbLoadSessions(userId);
      setSessions(data);
      // Auto-select the most recent session
      if (data.length > 0 && !activeSessionId) {
        await selectSession(data[0].id);
      }
    } finally {
      setSessionsLoading(false);
    }
  };

  const loadContext = async () => {
    setIsLoadingContext(true);
    try {
      const ctx = await buildOrgContext({ limit: 20, companyId, spaceId: spaceId || undefined, userId, userRole: user?.role || user?.user_metadata?.role || 'member' });
      setOrgContext(ctx);
    } catch (err) {
      console.error('[OrbitFlow] Failed to load org context:', err);
    } finally {
      setIsLoadingContext(false);
    }
  };

  const selectSession = async (sessionId) => {
    setActiveSessionId(sessionId);
    setMessagesLoading(true);
    try {
      const msgs = await dbLoadMessages(sessionId, userId);
      setMessages(msgs);
    } finally {
      setMessagesLoading(false);
    }
    setSidebarOpen(false);
  };

  const startNewChat = async () => {
    if (!userId) return;
    const session = await dbCreateSession(userId, companyId, spaceId, 'New Chat');
    setSessions(prev => [session, ...prev]);
    setActiveSessionId(session.id);
    setMessages([]);
    setSidebarOpen(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const deleteSession = async (sessionId, e) => {
    e.stopPropagation();
    setDeletingId(sessionId);
    await dbDeleteSession(sessionId, userId);
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      const remaining = sessions.filter(s => s.id !== sessionId);
      if (remaining.length > 0) {
        await selectSession(remaining[0].id);
      } else {
        setActiveSessionId(null);
        setMessages([]);
      }
    }
    setDeletingId(null);
  };

  /* â”€â”€â”€ Source parsing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const parseSourcesFromResponse = (raw, sourceMap) => {
    if (!sourceMap) return { text: raw, sources: [] };
    const sourcesMatch = (raw || '').match(/SOURCES:\s*(\[.*?\])/s);
    let sources = [];
    let text = raw || '';
    if (sourcesMatch) {
      try { sources = JSON.parse(sourcesMatch[1]); } catch { /* ignore */ }
      text = text.replace(/SOURCES:.*$/s, '').trim();
    }
    const resolved = sources.map(s => sourceMap[s.id] || null).filter(Boolean);
    return { text, sources: resolved };
  };

  /* â”€â”€â”€ Auto-generate session title from first message â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const autoTitleSession = async (sessionId, userText) => {
    try {
      const short = await generateText([
        { role: 'system', content: 'In 4 words or less, write a concise title for this conversation. No punctuation.' },
        { role: 'user', content: userText.slice(0, 200) },
      ]);
      const title = (short || '').trim().replace(/["'.]/g, '').slice(0, 40) || 'Orbit Chat';
      await dbUpdateSessionTitle(sessionId, title, userId);
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title } : s));
    } catch { /* title stays 'New Chat' */ }
  };

  /* â”€â”€â”€ Execute agentic actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const executeAction = async (parsed) => {
    try {
      // â”€â”€ Task Management â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      if (parsed.action === 'create_task') {
        const { error } = await supabase.from('clipad_action_items').insert({
          title: parsed.title || 'Orbit Task',
          status: 'todo',
          space_id: parsed.space_id || spaceId || null,
          assigned_to: parsed.assignee || user?.full_name || null,
          due_date: parsed.due_date || null,
          is_complete: false,
          company_id: companyId,
          created_at: new Date().toISOString(),
        });
        return { ...parsed, status: error ? 'error' : 'success', error: error?.message };
      }

      if (parsed.action === 'update_task') {
        const updates = {};
        if (parsed.status) updates.status = parsed.status;
        if (parsed.assignee) updates.assigned_to = parsed.assignee;
        if (parsed.due_date) updates.due_date = parsed.due_date;
        if (parsed.is_complete !== undefined) updates.is_complete = parsed.is_complete;
        const { error } = await supabase.from('clipad_action_items')
          .update(updates).eq('id', parsed.task_id);
        return { ...parsed, status: error ? 'error' : 'success', error: error?.message };
      }

      // â”€â”€ Space Management â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      if (parsed.action === 'create_space') {
        const { error } = await supabase.from('clipad_spaces').insert({
          name: parsed.name || 'New Space',
          description: parsed.description || '',
          company_id: companyId,
          is_private: parsed.is_private || false,
          created_by: user?.id,
          created_at: new Date().toISOString(),
        });
        return { ...parsed, status: error ? 'error' : 'success', error: error?.message };
      }

      // â”€â”€ Document Drafting â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      if (parsed.action === 'draft_document' || parsed.action === 'create_document') {
        const { error } = await supabase.from('clipad_docs').insert({
          title: parsed.title || 'Untitled Draft',
          content: parsed.content || '',
          company_id: companyId,
          space_id: parsed.space_id || spaceId || null,
          author_id: user?.id,
          created_at: new Date().toISOString(),
        });
        return { ...parsed, status: error ? 'error' : 'success', error: error?.message };
      }

      // â”€â”€ Messaging â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      if (parsed.action === 'send_message') {
        const { error } = await supabase.from('chat_messages').insert({
          channel_id: parsed.channel_id || 'general',
          user_id: user?.id,
          content: parsed.message || '',
          created_at: new Date().toISOString(),
        });
        return { ...parsed, status: error ? 'error' : 'success' };
      }

      // â”€â”€ Meeting Scheduling â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      if (parsed.action === 'schedule_meeting') {
        const { error } = await supabase.from('clipad_meeting_records').insert({
          title: parsed.topic || 'Orbit Scheduled Sync',
          company_id: companyId,
          space_id: spaceId || null,
          host_id: user?.id,
          created_at: new Date().toISOString(),
        });
        return { ...parsed, status: error ? 'error' : 'success' };
      }

      // â”€â”€ Blocker Logging â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      if (parsed.action === 'log_blocker') {
        const { error } = await supabase.from('clipad_blockers').insert({
          description: parsed.description || 'Blocker',
          severity: parsed.severity || 'medium',
          status: 'open',
          team_space_id: spaceId || null,
          workspace_id: companyId,
          detected_at: new Date().toISOString(),
        });
        return { ...parsed, status: error ? 'error' : 'success' };
      }

      // â”€â”€ Decision Recording â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      if (parsed.action === 'record_decision') {
        const { error } = await supabase.from('clipad_decisions').insert({
          decision_text: parsed.decision_text || 'Decision',
          rationale: parsed.rationale || '',
          status: 'active',
          team_space_id: spaceId || null,
          workspace_id: companyId,
          created_at: new Date().toISOString(),
        });
        return { ...parsed, status: error ? 'error' : 'success' };
      }

      // â”€â”€ Commitment Tracking â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      if (parsed.action === 'log_commitment') {
        const { error } = await supabase.from('clipad_commitments').insert({
          commitment_text: parsed.commitment_text || parsed.text,
          owner_name: parsed.owner || user?.full_name,
          due_date: parsed.due_date || null,
          status: 'pending',
          created_at: new Date().toISOString(),
        });
        return { ...parsed, status: error ? 'error' : 'success' };
      }

    } catch (e) {
      return { ...parsed, status: 'error', error: e.message };
    }
    return parsed;
  };

  /* â”€â”€â”€ Main send handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const handleSend = useCallback(async (overrideText) => {
    const rawText = (overrideText || input).trim();
    const fileSnap = attachedFile;
    if ((!rawText && !fileSnap) || isTyping) return;
    setInput('');
    setAttachedFile(null);

    const userText = fileSnap
      ? `${rawText || 'Please analyze this image.'}\n\n[Attached Image: ${fileSnap.name}]`
      : rawText;

    // Ensure we have an active session
    let sessionId = activeSessionId;
    if (!sessionId) {
      const session = await dbCreateSession(userId, companyId, spaceId, 'New Chat');
      setSessions(prev => [session, ...prev]);
      setActiveSessionId(session.id);
      sessionId = session.id;
    }

    const isFirstMessage = messages.length === 0;

    // Add user message to UI immediately
    const userMsg = { id: `tmp_${Date.now()}`, role: 'user', text: userText, sources: [], created_at: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);
    setStreamingText('');
    streamingRef.current = '';

    // Persist user message
    const savedUserMsg = await dbSaveMessage(sessionId, userId, 'user', userText, [], null);
    setMessages(prev => prev.map(m => m.id === userMsg.id ? { ...m, id: savedUserMsg.id } : m));

    // Auto-title on first message
    if (isFirstMessage) {
      autoTitleSession(sessionId, rawText || fileSnap?.name || 'Image Analysis');
    }

    try {
      let fullText = '';

      if (fileSnap && fileSnap.type === 'image') {
        // â”€â”€ Vision Analysis Path â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        const promptText = `Analyze this image in detail. User prompt: ${rawText || 'Describe this image and provide key insights.'}`;
        const { analyzeImage } = await import('@/lib/cloudflareAI');
        fullText = await analyzeImage(fileSnap.bytes, promptText);
      } else {
        // â”€â”€ Standard Text Streaming Path â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        const history = messages.slice(-10).map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.text,
        }));

        const systemPrompt = `You are Orbit â€” KERINT's autonomous AI agent and organizational co-pilot. You are NOT a search tool. Your unique purpose:
â€¢ You REASON across the entire workspace to surface insights, patterns, and risks the user may not have noticed.
â€¢ You EXECUTE actions directly: create tasks, spaces, documents, log blockers, record decisions, schedule meetings.
â€¢ You MONITOR: if you see a pattern in the data (e.g., blocked tasks, missed commitments, overdue items), proactively flag it.
â€¢ You REMEMBER context across a session and can refer back to earlier parts of the conversation.

DIFFERENCE FROM OTHER FEATURES:
- Spotlight Search: used for quick record lookups ("find the Q3 meeting"). You are NOT that.
- Knowledge Graph: stores organizational memory. You QUERY it, but you go further â€” you reason across it.
- You are the ACTION layer: when something needs to be done, YOU do it.

You have live access to the full workspace data below. You are on par with GPT-4, Claude, and Gemini.
Use markdown: **bold**, bullet lists, numbered lists, code blocks, headings.

KEY RULES:
- Answer accurately from context; use general knowledge when context is insufficient (say so).
- DO NOT mention UUIDs or internal IDs in responses. Use titles.
- Cite sources at the very end: SOURCES:[{"id":"<id>","type":"<type>"}]
- Wrap internal reasoning in <think>...</think> before your final answer.
- If asked to do something, output ACTION:{...} at the end (before SOURCES).
- For write actions (send email, create GitHub issue), describe what you will do and confirm with: CONFIRM_ACTION:{...}

AGENTIC CAPABILITIES â€” output ACTION:{} to execute immediately:
1. create_task:      {"action":"create_task","title":"...","assignee":"...","due_date":"YYYY-MM-DD","space_id":"..."}
2. update_task:      {"action":"update_task","task_id":"...","status":"done","assignee":"..."}
3. create_space:     {"action":"create_space","name":"...","description":"...","is_private":false}
4. create_document:  {"action":"create_document","title":"...","content":"...","space_id":"..."}
5. send_message:     {"action":"send_message","channel_id":"...","message":"..."}
6. schedule_meeting: {"action":"schedule_meeting","topic":"...","date":"YYYY-MM-DD"}
7. log_blocker:      {"action":"log_blocker","description":"...","severity":"low|medium|high|critical"}
8. record_decision:  {"action":"record_decision","decision_text":"...","rationale":"..."}
9. log_commitment:   {"action":"log_commitment","commitment_text":"...","owner":"...","due_date":"YYYY-MM-DD"}

CURRENT WORKSPACE KNOWLEDGE:
${orgContext?.contextText || 'Workspace data is loading. You can still answer general questions while I fetch your workspace context.'}`;

        const allMessages = [
          { role: 'system', content: systemPrompt },
          ...history,
          { role: 'user', content: userText },
        ];

        await generateText(allMessages, (accumulated) => {
          streamingRef.current = accumulated;
          setStreamingText(accumulated);
          fullText = accumulated;
        });

        if (!fullText) fullText = streamingRef.current;
      }

      const { text: cleanedText, sources } = parseSourcesFromResponse(fullText, orgContext?.sourceMap || {});

      // Parse ACTION
      const actionMatch = cleanedText.match(/ACTION:\s*({.*})/s);
      let executedAction = null;
      let finalText = cleanedText;

      if (actionMatch) {
        try {
          const actionData = JSON.parse(actionMatch[1]);
          finalText = cleanedText.replace(/ACTION:.*$/s, '').trim();
          executedAction = await executeAction(actionData);
        } catch (e) {
          console.error('Failed to parse action JSON', e);
          finalText = cleanedText.replace(/ACTION:.*$/s, '').trim();
        }
      }

      setStreamingText('');

      // Save assistant message to DB
      const savedAssistantMsg = await dbSaveMessage(sessionId, userId, 'assistant', finalText, sources, executedAction);
      await dbTouchSession(sessionId, userId);
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, updated_at: new Date().toISOString() } : s));

      setMessages(prev => [...prev, {
        id: savedAssistantMsg.id,
        role: 'assistant',
        text: finalText || 'I was unable to generate a response. Please try again.',
        sources,
        executedAction,
        created_at: savedAssistantMsg.created_at,
      }]);

    } catch (err) {
      console.error('[OrbitFlow] Error:', err);
      setStreamingText('');
      
      const isSuperAdmin = user?.role === 'super_admin' || user?.user_metadata?.role === 'super_admin';
      const errText = isSuperAdmin
        ? `âš ï¸ [Admin Debug] AI Request Failed: ${err.message || 'CORS / Edge Function error'}`
        : 'Our AI servers are currently busy or experiencing a brief connection delay. Please try sending your message again in a moment!';

      const savedErr = await dbSaveMessage(sessionId, userId, 'assistant', errText, [], null);
      setMessages(prev => [...prev, { id: savedErr.id, role: 'assistant', text: errText, sources: [] }]);
    } finally {
      setIsTyping(false);
    }
  }, [input, messages, orgContext, isTyping, activeSessionId, userId, companyId, spaceId]);

  /* â”€â”€â”€ Regenerate last response â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const handleRegenerate = useCallback(async () => {
    if (isTyping || messages.length < 2) return;
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMsg) return;
    // Remove the last assistant message from UI and DB
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
    if (lastAssistant) {
      setMessages(prev => prev.filter(m => m.id !== lastAssistant.id));
      try {
        await supabase.from('orbit_chat_messages').delete().eq('id', lastAssistant.id);
      } catch {}
    }
    await handleSend(lastUserMsg.text);
  }, [messages, isTyping, handleSend]);

  /* â”€â”€â”€ Copy message â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const handleCopy = async (id, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const groupedSessions = useMemo(() => groupSessionsByDate(sessions), [sessions]);

  if (!isOpen) return null;

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');

  return (
    <div className="fixed inset-0 md:inset-auto md:bottom-6 md:right-6 w-full h-full md:w-[760px] md:h-[680px] md:max-h-[calc(100vh-6rem)] bg-white dark:bg-[#212121] md:border md:border-slate-200 dark:md:border-white/10 md:rounded-3xl flex overflow-hidden shadow-2xl z-[100] animate-in fade-in slide-in-from-bottom-8 duration-300">

      {/* â”€â”€ SIDEBAR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className={`${sidebarOpen ? 'w-[240px]' : 'w-0'} transition-all duration-300 overflow-hidden shrink-0 bg-slate-50 dark:bg-[#181818] border-r border-slate-200 dark:border-white/5 flex flex-col`}>
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-3 py-3 shrink-0">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Chats</span>
          <button
            onClick={startNewChat}
            className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
            title="New Chat"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-4" style={{ scrollbarWidth: 'none' }}>
          {sessionsLoading ? (
            <div className="flex justify-center pt-8">
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center pt-8 px-3">
              <MessageSquare className="w-5 h-5 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-[11px] text-slate-400">No chats yet. Start a new conversation!</p>
            </div>
          ) : (
            Object.entries(groupedSessions).map(([group, groupSessions]) =>
              groupSessions.length > 0 ? (
                <div key={group}>
                  <p className="text-[9px] font-bold uppercase text-slate-400/60 tracking-widest px-2 mb-1">{group}</p>
                  {groupSessions.map(session => (
                    <div
                      key={session.id}
                      onClick={() => selectSession(session.id)}
                      className={`group relative flex items-center gap-2 px-2.5 py-2 rounded-xl cursor-pointer transition-all mb-0.5 ${
                        activeSessionId === session.id
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-slate-200/60 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {editingTitleId === session.id ? (
                        <input
                          autoFocus
                          className="flex-1 bg-transparent text-[12px] font-medium outline-none border-b border-primary"
                          value={editingTitleValue}
                          onChange={e => setEditingTitleValue(e.target.value)}
                          onBlur={async () => {
                            if (editingTitleValue.trim()) {
                              await dbUpdateSessionTitle(session.id, editingTitleValue.trim(), userId);
                              setSessions(prev => prev.map(s => s.id === session.id ? { ...s, title: editingTitleValue.trim() } : s));
                            }
                            setEditingTitleId(null);
                          }}
                          onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                          onClick={e => e.stopPropagation()}
                        />
                      ) : (
                        <span className="flex-1 text-[12px] font-medium truncate leading-tight">{session.title}</span>
                      )}
                      <button
                        onClick={(e) => deleteSession(session.id, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-red-500 shrink-0"
                      >
                        {deletingId === session.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Trash2 className="w-3 h-3" />}
                      </button>
                    </div>
                  ))}
                </div>
              ) : null
            )
          )}
        </div>
      </div>

      {/* â”€â”€ MAIN PANEL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <div className="bg-white dark:bg-[#1a1a1a] px-4 py-3 flex items-center gap-2 shrink-0 border-b border-slate-100 dark:border-white/5">
          {/* Sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition-colors"
            title="Toggle chat history"
          >
            <PanelLeft className="w-4.5 h-4.5" />
          </button>

          {/* New chat */}
          <button
            onClick={startNewChat}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition-colors"
            title="New Chat"
          >
            <Plus className="w-4.5 h-4.5" />
          </button>

          {/* Session title */}
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
              <Brain className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">
                {activeSession?.title || 'Orbit AI'}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {isLoadingContext ? 'Loading workspace...' : orgContext ? 'Workspace context ready Â· Kimi K2.5' : 'Kimi K2.5'}
              </p>
            </div>
          </div>

          {/* Refresh context */}
          <button
            onClick={loadContext}
            title="Refresh workspace context"
            disabled={isLoadingContext}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingContext ? 'animate-spin' : ''}`} />
          </button>

          {/* Close */}
          {onClose && (
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition-colors">
              <X className="w-4.5 h-4.5" />
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(150,150,150,0.2) transparent' }}>

          {messagesLoading ? (
            <div className="flex justify-center pt-12">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : messages.length === 0 && !isTyping ? (
            /* â”€â”€ Welcome screen â”€â”€ */
            <div className="flex flex-col items-center text-center mt-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-violet-500/30">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-[15px] text-slate-500 dark:text-slate-400 font-medium">
                Hi {user?.full_name?.split(' ')[0] || 'there'} ðŸ‘‹
              </h2>
              <h1 className="text-[22px] font-bold text-slate-900 dark:text-white mt-1 mb-2">How can Orbit help?</h1>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 max-w-[280px] leading-relaxed mb-6">
                I have full access to your workspace â€” meetings, tasks, decisions, and more. Ask me anything.
              </p>
              <div className="grid grid-cols-2 gap-2.5 w-full max-w-[380px]">
                {STARTER_PROMPTS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(p.text)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/8 hover:bg-slate-50 dark:hover:bg-white/5 text-[12.5px] font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-all bg-white dark:bg-[#1f1f1f] text-left"
                  >
                    <p.icon className={`w-3.5 h-3.5 shrink-0 ${p.color}`} />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* â”€â”€ Messages â”€â”€ */
            messages.map((msg) => (
              <div key={msg.id} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 mr-2.5 mt-0.5 shadow-sm">
                    <Brain className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'} gap-1.5`}>
                  <div className={`text-[14px] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white px-4 py-2.5 rounded-[20px] rounded-br-sm shadow-sm'
                      : 'bg-transparent text-slate-800 dark:text-slate-200'
                  }`}>
                    {msg.role === 'assistant'
                      ? <div className="space-y-0.5">{renderMarkdown(msg.text)}</div>
                      : msg.text
                    }
                  </div>

                  {/* Source Citations */}
                  {msg.sources?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {msg.sources.map((src, i) => {
                        const meta = SOURCE_META[src.type] || {};
                        const Icon = meta.icon;
                        return (
                          <span key={i} className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-xl border border-black/5 dark:border-white/5 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 shadow-sm">
                            {Icon && <Icon className={`w-3 h-3 ${meta.color}`} />}
                            {src.title?.substring(0, 28) || src.type}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Executed Action Callout */}
                  {msg.executedAction && (
                    <div className="mt-1 bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 rounded-2xl p-3 flex items-start gap-2.5 w-full">
                      <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                        <Zap className="w-2.5 h-2.5 text-violet-600 dark:text-violet-400" />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-violet-700 dark:text-violet-300">Orbit Agent Action</p>
                        <p className="text-[11px] text-violet-600 dark:text-violet-400 mt-0.5 leading-relaxed">
                          {msg.executedAction.status === 'success' ? 'âœ… ' : msg.executedAction.status === 'error' ? 'âŒ ' : ''}
                          {msg.executedAction.action === 'create_task' ? `Created task: "${msg.executedAction.title}"` :
                           msg.executedAction.action === 'send_message' ? `Sent message to ${msg.executedAction.recipient || 'channel'}` :
                           msg.executedAction.action === 'schedule_meeting' ? `Scheduled: "${msg.executedAction.topic}"` :
                           msg.executedAction.action === 'log_blocker' ? `Logged blocker: "${msg.executedAction.description}"` :
                           msg.executedAction.action === 'record_decision' ? `Recorded decision: "${msg.executedAction.decision_text}"` :
                           msg.executedAction.action === 'draft_document' ? `Drafted: "${msg.executedAction.title}"` :
                           `Executed: ${msg.executedAction.action}`}
                          {msg.executedAction.status === 'error' && ` â€” ${msg.executedAction.error}`}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Message Actions */}
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity group-hover:opacity-100 mt-0.5">
                      <button
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                      >
                        {copiedId === msg.id ? <Check className="w-3 h-3 text-[#006065]" /> : <Copy className="w-3 h-3" />}
                        {copiedId === msg.id ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Streaming response in progress */}
          {isTyping && (
            <div className="flex justify-start w-full">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 mr-2.5 mt-0.5 shadow-sm">
                <Brain className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="max-w-[85%] text-[14px] leading-relaxed text-slate-800 dark:text-slate-200">
                {streamingText ? (
                  <div className="space-y-0.5">
                    {renderMarkdown(streamingText)}
                    <span className="inline-block w-1 h-4 bg-violet-500 animate-pulse ml-0.5 rounded-sm align-middle" />
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 h-8">
                    <span className="w-2 h-2 bg-slate-300 dark:bg-slate-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-slate-300 dark:bg-slate-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-slate-300 dark:bg-slate-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Regenerate button (shown after last assistant message) */}
          {!isTyping && lastAssistantMsg && messages.length > 0 && (
            <div className="flex justify-center">
              <button
                onClick={handleRegenerate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-all border border-transparent hover:border-slate-200 dark:hover:border-white/10"
              >
                <RotateCcw className="w-3 h-3" />
                Regenerate
              </button>
            </div>
          )}

          <div ref={endRef} />
        </div>

        {/* Input area */}
        <div className="px-4 pb-4 pt-2 shrink-0 bg-white dark:bg-[#1a1a1a] border-t border-slate-100 dark:border-white/5">
          {/* File Preview Chip */}
          {attachedFile && (
            <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 text-xs font-medium text-violet-700 dark:text-violet-300 w-fit animate-in fade-in">
              <ImageIcon className="w-3.5 h-3.5" />
              <span className="truncate max-w-[200px]">{attachedFile.name}</span>
              <button onClick={() => setAttachedFile(null)} className="hover:text-red-500 ml-1">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <div className="relative flex items-end bg-slate-50 dark:bg-[#2a2a2a] rounded-2xl p-2 border border-slate-200 dark:border-white/10 focus-within:border-violet-400/60 dark:focus-within:border-violet-500/40 transition-all shadow-sm">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder={attachedFile ? "Ask a question about this image..." : "Ask me anything..."}
              rows={1}
              className="flex-1 bg-transparent resize-none border-none focus:outline-none text-[14px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 max-h-[120px] py-1.5 px-2 leading-relaxed"
              style={{ scrollbarWidth: 'none', minHeight: '36px' }}
            />
            <button
              onClick={() => handleSend()}
              disabled={(!input.trim() && !attachedFile) || isTyping}
              className={`p-2 rounded-xl ml-1 transition-all shrink-0 ${
                (input.trim() || attachedFile) && !isTyping
                  ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-sm hover:shadow-violet-500/30 hover:shadow-md'
                  : 'bg-transparent text-transparent pointer-events-none'
              }`}
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </div>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            className="hidden"
          />

          {/* Footer */}
          <div className="flex justify-between items-center mt-2 px-1">
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <Zap className="w-3 h-3 text-violet-500" />
              <span className="font-medium">Kimi K2.5</span>
              {orgContext && <span className="text-slate-300 dark:text-slate-600">Â· Workspace ready</span>}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <Paperclip className="w-3 h-3" /> Attach Image
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

