import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FileText, CheckCircle, MessageSquare, Calendar, Video,
  Loader2, X, ShieldAlert, AlertTriangle, ExternalLink, Zap, Layers, Copy, CheckCheck,
  Users, ArrowUpRight, Send, Plus, Volume2, VolumeX, ThumbsUp, ThumbsDown, Edit,
  Search, Sparkles, ArrowLeft, BrainCircuit, Inbox, Compass, Code2, CheckCircle2, MessageSquareText,
  Trash2, History, PlusCircle, SlidersHorizontal, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { CliPadLogo, WeftroLogo } from '@/components/ui/CliPadLogo';
import { supabase } from '@/api/supabaseClient';
import { generateText } from '@/lib/cloudflareAI';
import { buildOrgContext } from '@/lib/clipadIntelligence';
import { useAuth } from '@/lib/AuthContext';
import { isAdmin } from '@/lib/constants';
import { useToast } from '@/components/ui/use-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { searchMemoriesHybrid } from '@/lib/clipadHybridRetrievalService';
import { synthesizeGroundedAnswer } from '@/lib/clipadRAGSynthesisService';
import { isV3FeatureEnabled, V3_FLAGS } from '@/lib/clipadV3Flags';
import { getUserContextSessions, appendSessionAudit } from '@/lib/clipadContextSessionService';
import { getConnectedRecordsForEntity } from '@/lib/clipadEntityService';

const TYPE_META = {
  person:      { icon: Users,         label: 'Person',    color: 'text-primary', bg: 'bg-primary/10 border border-primary/20' },
  meeting:     { icon: Calendar,      label: 'Meeting',   color: 'text-primary', bg: 'bg-primary/10 border border-primary/20', route: (id) => `/meetings/${id}` },
  video:       { icon: Video,         label: 'Video',     color: 'text-primary', bg: 'bg-primary/10 border border-primary/20', route: (id) => `/watch/${id}` },
  doc:         { icon: FileText,      label: 'Doc',       color: 'text-primary', bg: 'bg-primary/10 border border-primary/20', route: (id, spaceId) => spaceId ? `/spaces/${spaceId}?tab=docs&docId=${id}` : null },
  task:        { icon: CheckCircle,   label: 'Task',      color: 'text-primary', bg: 'bg-primary/10 border border-primary/20', route: (id, spaceId) => spaceId ? `/spaces/${spaceId}?tab=tasks&taskId=${id}` : null },
  message:     { icon: MessageSquare, label: 'Chat',      color: 'text-primary', bg: 'bg-primary/10 border border-primary/20', route: (id, spaceId) => spaceId ? `/spaces/${spaceId}?tab=chat` : null },
  decision:    { icon: ShieldAlert,   label: 'Decision',  color: 'text-primary', bg: 'bg-primary/10 border border-primary/20', route: (id, spaceId) => spaceId ? `/spaces/${spaceId}?tab=decisions` : null },
  blocker:     { icon: AlertTriangle, label: 'Blocker',   color: 'text-primary', bg: 'bg-primary/10 border border-primary/20', route: (id, spaceId) => spaceId ? `/spaces/${spaceId}?tab=overview` : null },
  standup:     { icon: Zap,           label: 'Standup',   color: 'text-primary', bg: 'bg-primary/10 border border-primary/20', route: (id, spaceId) => spaceId ? `/spaces/${spaceId}?tab=standup` : null },
  integration: { icon: ExternalLink,  label: 'Imported',  color: 'text-primary', bg: 'bg-primary/10 border border-primary/20', route: () => `/integrations` },
  capture:     { icon: Inbox,         label: 'Capture',   color: 'text-primary', bg: 'bg-primary/10 border border-primary/20', route: () => `/capture` },
  memory:      { icon: BrainCircuit,  label: 'Memory',    color: 'text-primary', bg: 'bg-primary/10 border border-primary/20', route: () => `/capture` },
};

const FILTER_TABS = [
  { id: 'all', label: 'All Knowledge', icon: Layers },
  { id: 'person', label: 'People', icon: Users },
  { id: 'doc', label: 'Documents', icon: FileText },
  { id: 'task', label: 'Tasks', icon: CheckCircle },
  { id: 'meeting', label: 'Meetings', icon: Calendar },
  { id: 'video', label: 'Videos', icon: Video },
  { id: 'decision', label: 'Decisions', icon: ShieldAlert },
  { id: 'message', label: 'Conversations', icon: MessageSquare },
  { id: 'capture', label: 'Captures', icon: Inbox },
  { id: 'integration', label: 'Integrations', icon: ExternalLink },
];

const SUGGESTED_PROMPTS = [
  { title: "Blockers Summary", desc: "Summarize key active blockers across engineering spaces", icon: AlertTriangle },
  { title: "Strategic Decisions", desc: "Show recent decisions regarding Q3 roadmap & infrastructure", icon: ShieldAlert },
  { title: "Standup Highlights", desc: "What were the main highlights from yesterday's standups?", icon: Zap },
  { title: "Action Items", desc: "Find all active action items assigned to team members", icon: CheckCircle }
];

const FILTER_TYPE_MAP = {
  all: null,
  person: ['person'],
  doc: ['doc', 'integration'],
  task: ['task', 'blocker', 'standup'],
  meeting: ['meeting'],
  video: ['video'],
  decision: ['decision', 'blocker'],
  message: ['message'],
  capture: ['capture', 'memory'],
  integration: ['integration'],
};

const STOP_WORDS = new Set(['a','about','above','after','again','against','all','am','an','and','any','are','aren\'t','as','at','be','because','been','before','being','below','between','both','but','by','can','can\'t','cannot','could','couldn\'t','did','didn\'t','do','does','doesn\'t','doing','don\'t','down','during','each','few','for','from','further','had','hadn\'t','has','hasn\'t','have','haven\'t','having','he','he\'d','he\'ll','he\'s','her','here','here\'s','hers','herself','him','himself','his','how','how\'s','i','i\'d','i\'ll','i\'m','i\'ve','if','in','into','is','isn\'t','it','it\'s','its','itself','let\'s','me','more','most','mustn\'t','my','myself','no','nor','not','of','off','on','once','only','or','other','ought','our','ours','ourselves','out','over','own','same','shan\'t','she','she\'d','she\'ll','she\'s','should','shouldn\'t','so','some','such','than','that','that\'s','the','their','theirs','them','themselves','then','there','there\'s','these','they','they\'d','they\'ll','they\'re','they\'ve','this','those','through','to','too','under','until','up','very','was','wasn\'t','we','we\'d','we\'ll','we\'re','we\'ve','were','weren\'t','what','what\'s','when','when\'s','where','where\'s','which','while','who','who\'s','whom','why','why\'s','with','won\'t','would','wouldn\'t','you','you\'d','you\'ll','you\'re','you\'ve','check','want','please','tell','find','show']);

function extractKeywords(text) {
  if (!text) return [];
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

const matchesFilter = (itemType, filterId) => {
  if (!filterId || filterId === 'all') return true;
  const allowed = FILTER_TYPE_MAP[filterId];
  return allowed ? allowed.includes(itemType) : itemType === filterId;
};

const _spaceIdCache = new Map();
async function fetchAccessibleSpaceIds(user) {
  if (!user?.company_id) return new Set();
  const cacheKey = `${user.id}:${user.company_id}`;
  const cached = _spaceIdCache.get(cacheKey);
  if (cached && Date.now() < cached.expiry) return cached.ids;

  let ids;
  if (isAdmin(user)) {
    const { data } = await supabase.from('clipad_spaces').select('id').eq('company_id', user.company_id);
    ids = new Set((data || []).map(s => s.id));
  } else {
    const { data: memberships } = await supabase.from('clipad_space_members').select('space_id').eq('user_id', user.id);
    const memberSpaceIds = new Set((memberships || []).map(m => m.space_id));
    const { data: publicSpaces } = await supabase.from('clipad_spaces').select('id').eq('company_id', user.company_id).eq('is_private', false);
    (publicSpaces || []).forEach(s => memberSpaceIds.add(s.id));
    ids = memberSpaceIds;
  }
  _spaceIdCache.set(cacheKey, { ids, expiry: Date.now() + 60_000 });
  return ids;
}

// Dedicated Code Block component for SearchHub with top bar and snippet copy button
function SearchCodeSnippetBlock({ children, className }) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';

  const extractText = (node) => {
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map(extractText).join('');
    if (node && node.props && node.props.children) return extractText(node.props.children);
    return '';
  };

  const handleCopyCode = (e) => {
    e.stopPropagation();
    const rawText = extractText(children).replace(/\n$/, '');
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-full my-3 rounded-xl border border-border/80 bg-slate-950 text-slate-100 shadow-xs overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900/90 border-b border-slate-800/80 text-xs text-slate-400">
        <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-slate-300">
          <Code2 className="w-3.5 h-3.5 text-primary" />
          <span className="uppercase tracking-wider">{language || 'code'}</span>
        </div>
        <button
          type="button"
          onClick={handleCopyCode}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 transition-colors cursor-pointer active:scale-95"
          title="Copy snippet to clipboard"
        >
          {copied ? (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 text-slate-400" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-3.5 overflow-x-auto scrollbar-thin">
        <pre className="text-xs font-mono whitespace-pre-wrap break-words break-all leading-relaxed m-0 p-0 bg-transparent border-0 text-slate-100">
          {children}
        </pre>
      </div>
    </div>
  );
}

export default function SearchHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchMode, setSearchMode] = useState('answer'); // 'answer' (AI synthesized answer) | 'find' (direct record locator)
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [connectedRecords, setConnectedRecords] = useState([]);
  const [isLoadingConnected, setIsLoadingConnected] = useState(false);

  // Fetch connected knowledge records when selectedResult changes
  useEffect(() => {
    let isCancelled = false;
    if (!selectedResult?.id || !user?.company_id) {
      setConnectedRecords([]);
      setIsLoadingConnected(false);
      return;
    }

    async function loadConnected() {
      setIsLoadingConnected(true);
      try {
        const spaceIdSet = await fetchAccessibleSpaceIds(user);
        const records = await getConnectedRecordsForEntity({
          supabase,
          companyId: user.company_id,
          sourceId: selectedResult.id,
          sourceType: selectedResult.type,
          limit: 6,
          accessibleSpaceIds: Array.from(spaceIdSet).map(String),
        });
        if (!isCancelled) {
          setConnectedRecords(records || []);
        }
      } catch (err) {
        console.warn('[SearchHub] Failed to load connected knowledge:', err);
        if (!isCancelled) setConnectedRecords([]);
      } finally {
        if (!isCancelled) setIsLoadingConnected(false);
      }
    }

    loadConnected();
    return () => { isCancelled = true; };
  }, [selectedResult?.id, selectedResult?.type, user?.company_id]);

  // AI State
  const [aiAnswer, setAiAnswer] = useState('');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [followUpInput, setFollowUpInput] = useState('');
  const [hasPerformedSearch, setHasPerformedSearch] = useState(false);
  const chatBottomRef = React.useRef(null);
  const ragResultSourcesRef = React.useRef([]);

  const [isSpeakingMsgIndex, setIsSpeakingMsgIndex] = useState(null);
  const [copiedMsgIndex, setCopiedMsgIndex] = useState(null);
  const [votedMsgState, setVotedMsgState] = useState({}); // { [index]: 'up' | 'down' }

  const handleSpeak = (text, index) => {
    if (window.speechSynthesis.speaking && isSpeakingMsgIndex === index) {
      window.speechSynthesis.cancel();
      setIsSpeakingMsgIndex(null);
    } else {
      window.speechSynthesis.cancel();
      const cleanText = text
        .replace(/[*_#`~\[\]()\-+]/g, '')
        .trim();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.onend = () => setIsSpeakingMsgIndex(null);
      utterance.onerror = () => setIsSpeakingMsgIndex(null);
      setIsSpeakingMsgIndex(index);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgIndex(index);
    setTimeout(() => setCopiedMsgIndex(null), 2000);
  };

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isSynthesizing]);
  const companyId = user?.company_id;

  const [activeSessionId, setActiveSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [isControlsCollapsed, setIsControlsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('search_hub_controls_collapsed');
      if (cached !== null) return cached === 'true';
    }
    return user?.user_metadata?.search_hub_controls_collapsed === true;
  });

  // Sync preference across devices via user_metadata when user logs in / metadata arrives
  useEffect(() => {
    if (user?.user_metadata?.search_hub_controls_collapsed !== undefined) {
      const remotePref = !!user.user_metadata.search_hub_controls_collapsed;
      setIsControlsCollapsed(remotePref);
      try {
        localStorage.setItem('search_hub_controls_collapsed', String(remotePref));
      } catch (e) {
        // ignore
      }
    }
  }, [user?.id, user?.user_metadata?.search_hub_controls_collapsed]);

  const toggleControlsCollapsed = async () => {
    const nextState = !isControlsCollapsed;
    setIsControlsCollapsed(nextState);
    try {
      localStorage.setItem('search_hub_controls_collapsed', String(nextState));
    } catch (e) {
      // ignore
    }

    if (user?.id) {
      try {
        await supabase.auth.updateUser({
          data: { search_hub_controls_collapsed: nextState }
        });
      } catch (err) {
        console.warn('[SearchHub] Could not persist collapse preference to user_metadata:', err);
      }
    }
  };

  // Load all user chat sessions from Supabase
  const loadAllSessions = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('orbit_chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(50);
      if (!error && data) {
        setSessions(data);
      }
    } catch (err) {
      console.warn('[SearchHub] Failed to load session list:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    loadAllSessions();
  }, [loadAllSessions]);

  // Switch to an existing session from history
  const handleSelectSession = async (sessId) => {
    if (user?.id) {
      localStorage.removeItem(`search_hub_new_chat_${user.id}`);
      localStorage.setItem(`search_hub_active_session_${user.id}`, sessId);
    }
    setActiveSessionId(sessId);
    setShowHistoryModal(false);
    setIsSearching(true);
    setChatHistory([]);
    try {
      const { data: msgs } = await supabase
        .from('orbit_chat_messages')
        .select('*')
        .eq('session_id', sessId)
        .order('created_at', { ascending: true });

      if (msgs && msgs.length > 0) {
        setChatHistory(msgs.map(m => ({
          role: m.role,
          content: m.content
        })));
        setHasPerformedSearch(true);
        const firstUser = msgs.find(m => m.role === 'user');
        if (firstUser?.content) {
          setQuery(firstUser.content);
          if (runSearchRef.current) runSearchRef.current(firstUser.content, true);
        }
      } else {
        setHasPerformedSearch(false);
        setQuery('');
      }
    } catch (err) {
      console.warn('[SearchHub] Error loading session messages:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Start fresh conversation (New Chat)
  const handleStartNewChat = () => {
    if (user?.id) {
      localStorage.setItem(`search_hub_new_chat_${user.id}`, 'true');
      localStorage.removeItem(`search_hub_active_session_${user.id}`);
      localStorage.removeItem(`search_hub_query_${user.id}`);
      localStorage.removeItem(`search_hub_followup_${user.id}`);
    }
    setQuery('');
    setFollowUpInput('');
    if (user?.id) {
      localStorage.removeItem(`search_hub_query_${user.id}`);
      localStorage.removeItem(`search_hub_followup_${user.id}`);
      sessionStorage.setItem(`search_hub_new_search_${user.id}`, 'true');
    }
    setResults([]);
    setSelectedResult(null);
    setHasPerformedSearch(false);
    setSearchParams({});
    setActiveSessionId(null);
    setChatHistory([]);
    setShowHistoryModal(false);
  };

  // Delete current or specified session
  const handleDeleteCurrentChat = () => {
    const cur = sessions.find(s => s.id === activeSessionId) || { id: activeSessionId, title: query || 'This conversation' };
    setSessionToDelete(cur);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDeleteSession = async () => {
    const targetId = sessionToDelete?.id || activeSessionId;
    if (!targetId) {
      setShowDeleteConfirm(false);
      return;
    }
    try {
      await supabase.from('orbit_chat_messages').delete().eq('session_id', targetId);
      await supabase.from('orbit_chat_sessions').delete().eq('id', targetId);
    } catch (err) {
      console.warn('[SearchHub] Error deleting session:', err);
    }

    const remaining = sessions.filter(s => s.id !== targetId);
    setSessions(remaining);
    setShowDeleteConfirm(false);
    setSessionToDelete(null);

    if (activeSessionId === targetId) {
      handleStartNewChat();
    }
    toast({
      title: "Chat Deleted",
      description: "Conversation removed successfully."
    });
  };

  // Context Session Integration (Milestone 4)
  const isContextSessionsEnabled = isV3FeatureEnabled(V3_FLAGS.CONTEXT_SESSIONS_ENABLED, user);
  const [availableContextSessions, setAvailableContextSessions] = useState([]);
  const [selectedContextSessionId, setSelectedContextSessionId] = useState(() => {
    return localStorage.getItem(`search_hub_context_session_${user?.id}`) || '';
  });

  // Load active context sessions for user
  useEffect(() => {
    if (!user?.id || !companyId || !isContextSessionsEnabled) return;
    getUserContextSessions(user.id, companyId)
      .then(sessions => {
        const active = (sessions || []).filter(s => s.status === 'ACTIVE');
        setAvailableContextSessions(active);
      })
      .catch(err => {
        console.warn('[SearchHub] Could not load context sessions:', err);
      });
  }, [user?.id, companyId, isContextSessionsEnabled]);

  const handleSelectContextSession = (sessId) => {
    setSelectedContextSessionId(sessId);
    if (sessId) {
      localStorage.setItem(`search_hub_context_session_${user?.id}`, sessId);
    } else {
      localStorage.removeItem(`search_hub_context_session_${user?.id}`);
    }
  };

  // Ref so the early-mounting useEffect can call runSearch after it is defined
  const runSearchRef = React.useRef(null);

  

  // Load persistent search state on mount
  useEffect(() => {
    if (!user?.id) return;
    const isNewSearchFlag = sessionStorage.getItem(`search_hub_new_search_${user.id}`);
    if (isNewSearchFlag) {
      sessionStorage.removeItem(`search_hub_new_search_${user.id}`);
      return;
    }

    const savedQuery = localStorage.getItem(`search_hub_query_${user.id}`);
    if (savedQuery) {
      setQuery(savedQuery);
    }

    const loadPersistentChat = async () => {
      // If user explicitly initiated New Chat and hasn't started a new conversation yet, stay in empty state
      const isNewChatPending = localStorage.getItem(`search_hub_new_chat_${user.id}`) === 'true';
      if (isNewChatPending) {
        return;
      }

      const lastActiveId = localStorage.getItem(`search_hub_active_session_${user.id}`);

      try {
        let sid = lastActiveId;
        if (!sid) {
          const { data: latestSessions } = await supabase
            .from('orbit_chat_sessions')
            .select('id, title')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .limit(1);
          if (latestSessions && latestSessions.length > 0) {
            sid = latestSessions[0].id;
          }
        }

        if (sid) {
          const { data: msgs } = await supabase
            .from('orbit_chat_messages')
            .select('*')
            .eq('session_id', sid)
            .order('created_at', { ascending: true });

          if (msgs && msgs.length > 0) {
            setActiveSessionId(sid);
            localStorage.setItem(`search_hub_active_session_${user.id}`, sid);
            setChatHistory(msgs.map(m => ({
              role: m.role,
              content: m.content
            })));
            setHasPerformedSearch(true);

            const firstUserMsg = msgs.find(m => m.role === 'user');
            const queryToUse = savedQuery || firstUserMsg?.content;
            if (queryToUse) {
              setQuery(queryToUse);
              if (runSearchRef.current) runSearchRef.current(queryToUse, true);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load persistent search history:', err);
      }
    };
    loadPersistentChat();
  }, [user?.id, companyId]);

  const getOrCreateSession = async () => {
    if (!user?.id) return null;
    if (activeSessionId) return activeSessionId;

    try {
      const { data, error } = await supabase
        .from('orbit_chat_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('title', 'Search Hub AI Chat')
        .order('updated_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        setActiveSessionId(data[0].id);
        return data[0].id;
      }

      const sid = crypto.randomUUID();
      const sessionTitle = (query || followUpInput || 'Search Hub AI Chat').trim().slice(0, 50);
      if (user?.id) {
        localStorage.removeItem(`search_hub_new_chat_${user.id}`);
        localStorage.setItem(`search_hub_active_session_${user.id}`, sid);
      }
      const { error: insErr } = await supabase
        .from('orbit_chat_sessions')
        .insert({
          id: sid,
          user_id: user.id,
          company_id: companyId || null,
          title: sessionTitle || 'Search Hub AI Chat',
          model: 'moonshotai/kimi-k3',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      loadAllSessions();

      if (insErr) throw insErr;
      setActiveSessionId(sid);
      return sid;
    } catch (err) {
      console.warn('Failed to load/create persistent search session:', err);
      return null;
    }
  };

  const handleNewSearch = async () => {
    if (activeSessionId) {
      try {
        await supabase.from('orbit_chat_messages').delete().eq('session_id', activeSessionId);
        await supabase.from('orbit_chat_sessions').delete().eq('id', activeSessionId);
      } catch (err) {
        console.warn('Failed to clear persistent search session:', err);
      }
    }
    setQuery('');
    setFollowUpInput('');
    if (user?.id) {
      localStorage.removeItem(`search_hub_query_${user.id}`);
      localStorage.removeItem(`search_hub_followup_${user.id}`);
      sessionStorage.setItem(`search_hub_new_search_${user.id}`, 'true');
    }
    setResults([]);
    setSelectedResult(null);
    setHasPerformedSearch(false);
    setSearchParams({});
    setActiveSessionId(null);
    setChatHistory([]);
  };


  const safeQuery = (promise) => Promise.resolve(promise).then(res => res.data || []).catch(err => {
    console.warn('[SearchHub] Query err:', err);
    return [];
  });

  const searchPeople = async (qTerm, cid) => {
    if (!cid) return [];
    const term = `%${qTerm}%`;
    const data = await safeQuery(
      supabase.from('profiles').select('id, full_name, email, role, avatar_url').eq('company_id', cid).or(`full_name.ilike.${term},email.ilike.${term}`).limit(5)
    );
    return (data || []).map(u => ({
      type: 'person',
      id: u.id,
      label: u.full_name || u.email,
      snippet: `${u.role || 'Member'} (${u.email})`,
      avatar_url: u.avatar_url,
      raw: u
    }));
  };

  // Ref to track the current synthesis session — prevents double-firing
  const synthSessionRef = React.useRef(0);
  const lastQueryRef = React.useRef('');

  const runSearch = useCallback(async (qTerm, skipAISynthesis = false) => {
    const q = (qTerm !== undefined ? qTerm : query).trim();
    if (!q || !companyId) return;

    lastQueryRef.current = q;
    setHasPerformedSearch(true);
    setIsSearching(true);
    setResults([]);
    setSelectedResult(null);
    if (!skipAISynthesis) {
      setChatHistory([]);
    }
    setAiAnswer('');

    const accessibleSpaceIds = await fetchAccessibleSpaceIds(user);
    const spaceIdArr = Array.from(accessibleSpaceIds);
    const term = `%${q}%`;
    const cid = companyId;

    // Extract core keywords from query for broader recall (e.g. "standups", "roadmap")
    const keywords = extractKeywords(q);
    const keywordTerms = keywords.map(kw => `%${kw}%`);
    const primaryKwTerm = keywordTerms.length > 0 ? keywordTerms[0] : term;

    const [docs, tasks, messages, meetings, decisions, videos, blockers, standups, integrations, people, memories, captures, moments, cloudDocs] = await Promise.all([
      safeQuery(spaceIdArr.length > 0 ? supabase.from('clipad_docs').select('id, title, content, space_id, created_at').in('space_id', spaceIdArr).or(`title.ilike.${term},content.ilike.${term},title.ilike.${primaryKwTerm},content.ilike.${primaryKwTerm}`).limit(20) : []),
      safeQuery(spaceIdArr.length > 0 ? supabase.from('clipad_action_items').select('id, title, context, space_id, created_at').in('space_id', spaceIdArr).or(`title.ilike.${term},context.ilike.${term},title.ilike.${primaryKwTerm}`).limit(20) : []),
      safeQuery(spaceIdArr.length > 0 ? supabase.from('clipad_messages').select('id, content, space_id, created_at').in('space_id', spaceIdArr).or(`content.ilike.${term},content.ilike.${primaryKwTerm}`).limit(20) : []),
      safeQuery(spaceIdArr.length > 0 ? supabase.from('clipad_meeting_records').select('id, title, ai_summary, space_id, created_at').in('space_id', spaceIdArr).or(`title.ilike.${term},ai_summary.ilike.${term},title.ilike.${primaryKwTerm},ai_summary.ilike.${primaryKwTerm}`).limit(20) : []),
      safeQuery(spaceIdArr.length > 0 ? supabase.from('clipad_decisions').select('id, decision_text, team_space_id, created_at').in('team_space_id', spaceIdArr).or(`decision_text.ilike.${term},decision_text.ilike.${primaryKwTerm}`).limit(20) : []),
      safeQuery(spaceIdArr.length > 0 ? supabase.from('clipad_videos').select('id, title, ai_summary, space_id, created_at').in('space_id', spaceIdArr).eq('company_id', cid).or(`title.ilike.${term},ai_summary.ilike.${term}`).limit(20) : []),
      safeQuery(spaceIdArr.length > 0 ? supabase.from('clipad_blockers').select('id, description, team_space_id, detected_at').in('team_space_id', spaceIdArr).or(`description.ilike.${term},description.ilike.${primaryKwTerm}`).limit(20) : []),
      safeQuery(
        // For standups: if user asks about standups/today/updates, query all recent company standups if no keyword match
        spaceIdArr.length > 0 
          ? (keywords.some(k => ['standup', 'standups', 'today', 'daily', 'update', 'updates'].includes(k))
              ? supabase.from('clipad_standups').select('id, user_name, today, yesterday, blockers, space_id, created_at').in('space_id', spaceIdArr).order('created_at', { ascending: false }).limit(20)
              : supabase.from('clipad_standups').select('id, user_name, today, yesterday, blockers, space_id, created_at').in('space_id', spaceIdArr).or(`today.ilike.${term},yesterday.ilike.${term},blockers.ilike.${term},today.ilike.${primaryKwTerm}`).limit(20))
          : []
      ),
      safeQuery(supabase.from('clipad_imported_knowledge').select('id, title, content, provider, content_type, updated_at').eq('company_id', cid).or(`title.ilike.${term},content.ilike.${term},title.ilike.${primaryKwTerm}`).limit(20)),
      searchPeople(q, cid),
      searchMemoriesHybrid({
        queryText: q,
        companyId: cid,
        userId: user?.id,
        accessibleSpaceIds: spaceIdArr,
        limit: 15,
        enableSemantic: true
      }).catch(err => {
        console.warn('[SearchHub] Hybrid retrieval fallback:', err);
        return [];
      }),
      safeQuery(supabase.from('clipad_v3_captures').select('id, title, content, created_at').eq('user_id', user.id).or(`content.ilike.${term},content.ilike.${primaryKwTerm}`).limit(10)),
      safeQuery(supabase.from('clipad_v3_smart_moments').select('id, title, description, created_at').eq('company_id', cid).or(`description.ilike.${term},description.ilike.${primaryKwTerm}`).limit(10)),
      safeQuery(supabase.from('documents').select('id, name, file_url, category, notes, ai_summary, created_at').eq('company_id', cid).or(`name.ilike.${term},notes.ilike.${term},ai_summary.ilike.${term}`).limit(20))
    ]);

    const raw = [
      ...(people || []),
      ...(memories || []).map(m => ({
        type: 'memory',
        id: m.id,
        label: m.title || 'Memory',
        snippet: m.summary || m.content,
        created_at: m.updated_at || m.created_at,
        score: m.rrf_score || m.combined_score || null,
        metadata: m.retrieval_metadata || null
      })),
      ...(captures || []).map(c => ({ type: 'capture', id: c.id, label: c.title || 'Capture', snippet: c.content, created_at: c.created_at })),
      ...(moments || []).map(m => ({ type: 'smart_moment', id: m.id, label: m.title || 'Smart Moment', snippet: m.description, created_at: m.created_at })),
      ...(docs || []).map(d => ({ type: 'doc', id: d.id, space_id: d.space_id, label: d.title, snippet: d.content, created_at: d.created_at })),
      ...(tasks || []).map(t => ({ type: 'task', id: t.id, space_id: t.space_id, label: t.title, snippet: t.context, created_at: t.created_at })),
      ...(messages || []).map(m => ({ type: 'message', id: m.id, space_id: m.space_id, label: 'Chat Message', snippet: m.content, created_at: m.created_at })),
      ...(meetings || []).map(m => ({ type: 'meeting', id: m.id, space_id: m.space_id, label: m.title || 'Team Meeting', snippet: m.ai_summary, created_at: m.created_at })),
      ...(decisions || []).map(d => ({ type: 'decision', id: d.id, space_id: d.team_space_id, label: 'Decision', snippet: d.decision_text, created_at: d.created_at })),
      ...(videos || []).map(v => ({ type: 'video', id: v.id, space_id: v.space_id, label: v.title || 'Video', snippet: v.ai_summary, created_at: v.created_at })),
      ...(blockers || []).map(b => ({ type: 'blocker', id: b.id, space_id: b.team_space_id, label: 'Blocker', snippet: b.description, created_at: b.detected_at })),
      ...(standups || []).map(s => ({ type: 'standup', id: s.id, space_id: s.space_id, label: `Standup — ${s.user_name || 'Team member'} (${s.created_at?.slice(0, 10)})`, snippet: s.today, created_at: s.created_at })),
      ...(integrations || []).map(i => ({ type: 'integration', id: i.id, space_id: null, label: `[${i.provider}] ${i.title}`, snippet: i.content, created_at: i.updated_at, provider: i.provider })),
      ...(cloudDocs || []).map(cd => ({ type: 'doc', id: cd.id, space_id: null, label: cd.name, snippet: cd.ai_summary || cd.notes, created_at: cd.created_at, url: cd.file_url })),
    ];

    setResults(raw);
    setIsSearching(false);
    if (raw.length > 0) setSelectedResult(raw[0]);

    if (!skipAISynthesis) {
      // AI Executive Synthesis — bump session id to prevent stale callbacks
      runAISynthesis(q, raw, spaceIdArr);
    }
  }, [query, companyId, user]);
  // Keep the ref up-to-date every render so the persistent-load effect can call it safely
  runSearchRef.current = runSearch;

  const runAISynthesis = async (q, matchedResults, spaceIdArr) => {
    const sessionId = ++synthSessionRef.current;
    setIsSynthesizing(true);
    // Immediately show user prompt in the chat conversation like ChatGPT
    setChatHistory([{ role: 'user', content: q }]);

    try {
      // Feature Flag Check: Use Grounded RAG Synthesis Service if enabled
      const isRAGEnabled = isV3FeatureEnabled(V3_FLAGS.RAG_SYNTHESIS_ENABLED, user);

      if (isRAGEnabled) {
        // Grounded RAG Synthesis Pathway
        let fullText = '';
        const ragResult = await synthesizeGroundedAnswer({
          query: q,
          retrievedEvidence: matchedResults,
          user,
          onStream: (streamedText) => {
            if (synthSessionRef.current !== sessionId) return;
            fullText = streamedText;
            setChatHistory([
              { role: 'user', content: q },
              {
                role: 'assistant',
                content: streamedText,
                sources: ragResultSourcesRef.current || [],
                citations: null
              }
            ]);
          }
        });

        if (synthSessionRef.current !== sessionId) return;

        const finalContent = ragResult.answer || fullText;
        setChatHistory([
          { role: 'user', content: q },
          {
            role: 'assistant',
            content: finalContent,
            sources: ragResult.sources || [],
            citations: ragResult.citations || null,
            status: ragResult.status,
            grounded: ragResult.grounded
          }
        ]);

        const sid = await getOrCreateSession();
        if (sid) {
          await supabase.from('orbit_chat_messages').insert([
            {
              id: crypto.randomUUID(),
              session_id: sid,
              role: 'user',
              content: q,
              created_at: new Date().toISOString()
            },
            {
              id: crypto.randomUUID(),
              session_id: sid,
              role: 'assistant',
              content: finalContent,
              created_at: new Date().toISOString()
            }
          ]);
        }

        // Attach search & synthesis audit event to active context session if selected
        if (selectedContextSessionId && isContextSessionsEnabled) {
          appendSessionAudit(selectedContextSessionId, 'RAG_SYNTHESIS_EXECUTED', {
            query: q,
            grounded: ragResult.grounded,
            status: ragResult.status,
            evidence_count: matchedResults.length,
            valid_citations_count: ragResult.citations?.valid?.length || 0,
            cited_source_ids: (ragResult.citations?.valid || []).map(c => c.id)
          }).catch(err => {
            console.warn('[SearchHub] Could not log audit to context session:', err);
          });
        }
        return;
      }

      // Existing Baseline Synthesis Fallback (when RAG_SYNTHESIS_ENABLED is disabled)
      const orgCtx = await buildOrgContext({
        limit: 25,
        companyId: user?.company_id,
        userId: user?.id,
        userRole: user?.role || 'member',
        spaceIds: spaceIdArr,
      }).catch(() => ({ contextText: '' }));

      // Bail if a newer synthesis has started
      if (synthSessionRef.current !== sessionId) return;

      const resContext = matchedResults.length > 0
        ? matchedResults.map(r => `[${r.type.toUpperCase()} ID:${r.id}] ${r.label}: ${r.snippet?.substring(0, 180) || ''}`).join('\n')
        : 'No direct database records matched.';

      const promptMessages = [
        {
          role: 'system',
          content: `You are Orbit AI, an elite enterprise intelligence assistant. Give a concise, authoritative synthesis in clean markdown. Use bullet points for lists. Bold key terms. Be direct and high-signal. Do not repeat the query.`
        },
        {
          role: 'user',
          content: `Search query: "${q}"\n\nMATCHED RECORDS:\n${resContext}\n\nORGANIZATIONAL CONTEXT:\n${orgCtx.contextText || 'None'}`
        }
      ];

      const cleanText = (raw) => {
        return raw
          .replace(/<(think|thought)>[\s\S]*?<\/\1>/gi, '')
          .replace(/<(think|thought)>[\s\S]*$/gi, '')
          .replace(/<\/(think|thought)>/gi, '')
          .replace(/\\([\`*_{}[\]()#+\-.!])/g, '$1')
          .replace(/[\uFFFD\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
          .trim();
      };

      let fullText = '';
      await generateText(promptMessages, (accumulated) => {
        if (synthSessionRef.current !== sessionId) return; // stale stream
        const clean = cleanText(accumulated);
        fullText = clean;
        setChatHistory([
          { role: 'user', content: q },
          { role: 'assistant', content: clean }
        ]);
      });

      if (synthSessionRef.current === sessionId) {
        setChatHistory([
          { role: 'user', content: q },
          { role: 'assistant', content: fullText }
        ]);
        const sid = await getOrCreateSession();
        if (sid) {
          await supabase.from('orbit_chat_messages').insert([
            {
              id: crypto.randomUUID(),
              session_id: sid,
              role: 'user',
              content: q,
              created_at: new Date().toISOString()
            },
            {
              id: crypto.randomUUID(),
              session_id: sid,
              role: 'assistant',
              content: fullText,
              created_at: new Date().toISOString()
            }
          ]);
        }
      }
    } catch (e) {
      if (synthSessionRef.current === sessionId) {
        console.error('[SearchHub] AI error:', e);
        setChatHistory([{ role: 'assistant', content: 'Unable to generate AI synthesis at this time.' }]);
      }
    } finally {
      if (synthSessionRef.current === sessionId) {
        setIsSynthesizing(false);
      }
    }
  };

  const handleFollowUp = async (e) => {
    e.preventDefault();
    if (!followUpInput.trim() || isSynthesizing) return;
    const userMsg = followUpInput.trim();
    setFollowUpInput('');

    // Build the full conversation including user's question
    const updatedHistory = [...chatHistory, { role: 'user', content: userMsg }];
    setChatHistory(updatedHistory);
    setIsSynthesizing(true);

    try {
      const sid = await getOrCreateSession();
      if (sid) {
        await supabase.from('orbit_chat_messages').insert({
          id: crypto.randomUUID(),
          session_id: sid,
          role: 'user',
          content: userMsg,
          created_at: new Date().toISOString()
        });
      }

      const messages = [
        {
          role: 'system',
          content: `You are Orbit AI, an elite enterprise intelligence advisor and executive copilot.
Deliver structured, polished, and comprehensive responses comparable to top-tier AI assistants (e.g., ChatGPT-4o).
Guidelines:
1. Format with elegant, readable Markdown: bold key terms, use clean bullet points, numbered steps where sequential, and structured headers (###).
2. If displaying comparison data, schedules, or scopes, present them in clean GitHub-Flavored Markdown tables.
3. Be professional, clear, and direct. Avoid generic filler words or robotic self-referencing.
4. Base your answers accurately on organizational knowledge and the conversation context regarding "${lastQueryRef.current || 'the query'}".`
        },
        // Include prior conversation (exclude system messages that might be in history)
        ...updatedHistory.filter(m => m.role === 'user' || m.role === 'assistant')
      ];

      const cleanText = (raw) => {
        return raw
          .replace(/<(think|thought)>[\s\S]*?<\/\1>/gi, '')
          .replace(/<(think|thought)>[\s\S]*$/gi, '')
          .replace(/<\/(think|thought)>/gi, '')
          .replace(/\\([\`*_{}[\]()#+\-.!])/g, '$1')
          .replace(/[\uFFFD\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
          .trim();
      };

      let answer = '';
      await generateText(messages, (accumulated) => {
        const clean = cleanText(accumulated);
        answer = clean;
        // Stream answer in real time
        setChatHistory([...updatedHistory, { role: 'assistant', content: answer }]);
      });

      // Finalise
      setChatHistory([...updatedHistory, { role: 'assistant', content: answer }]);
      if (sid) {
        await supabase.from('orbit_chat_messages').insert({
          id: crypto.randomUUID(),
          session_id: sid,
          role: 'assistant',
          content: answer,
          created_at: new Date().toISOString()
        });
        await supabase.from('orbit_chat_sessions').update({ updated_at: new Date().toISOString() }).eq('id', sid);
      }
    } catch (err) {
      console.error('[SearchHub] Follow-up error:', err);
      toast({ title: 'Error', description: 'Could not fetch response.', variant: 'destructive' });
      setChatHistory([...updatedHistory, { role: 'assistant', content: 'Sorry, I could not process your follow-up.' }]);
    } finally {
      setIsSynthesizing(false);
    }
  };

  useEffect(() => {
    const qParam = searchParams.get('q');
    if (qParam) {
      setQuery(qParam);
      runSearch(qParam);
    }
  }, [searchParams]);

  const firstName = user?.full_name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || 'there';
  const filteredResults = useMemo(() => results.filter(r => matchesFilter(r.type, activeFilter)), [results, activeFilter]);
  const hasResults = isSearching || filteredResults.length > 0;
  const showLeftPanel = hasResults;
  return (
    <div className="flex flex-col h-full bg-background font-sans text-foreground overflow-hidden relative">
      {/* Top Right Floating Action Controls with Collapsible Toggle */}
      <div className="absolute top-3 right-4 sm:right-6 z-40 flex items-center gap-1 bg-card/90 backdrop-blur-md px-1.5 py-1 rounded-xl border border-border shadow-xs transition-all duration-300">
        {!isControlsCollapsed && (
          <div className="flex items-center gap-1">
            {isContextSessionsEnabled && availableContextSessions.length > 0 && (
              <div className="hidden md:flex items-center gap-1 mr-1 pr-1.5 border-r border-border/60">
                <Compass className="w-3.5 h-3.5 text-primary shrink-0" />
                <select
                  value={selectedContextSessionId}
                  onChange={(e) => handleSelectContextSession(e.target.value)}
                  className="text-xs bg-transparent text-muted-foreground hover:text-foreground font-medium outline-none cursor-pointer max-w-[130px] truncate"
                  title="Attach to active Context Session"
                >
                  <option value="">No Active Session</option>
                  {availableContextSessions.map((sess) => (
                    <option key={sess.id} value={sess.id}>
                      {sess.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => { loadAllSessions(); setShowHistoryModal(true); }}
              className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-lg transition-colors"
              title="View conversation history"
            >
              <History className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] font-medium hidden sm:inline">History</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleStartNewChat}
              className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-lg transition-colors"
              title="Start new conversation"
            >
              <PlusCircle className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] font-medium hidden sm:inline">New Chat</span>
            </Button>

            {hasPerformedSearch && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteCurrentChat}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors rounded-lg"
                title="Delete this chat"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}

            <div className="w-px h-3.5 bg-border mx-0.5" />
          </div>
        )}

        <button
          type="button"
          onClick={toggleControlsCollapsed}
          className="h-7 px-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-1 transition-colors text-xs font-medium"
          title={isControlsCollapsed ? "Show controls (History, New Chat)" : "Collapse controls"}
          aria-label={isControlsCollapsed ? "Show controls" : "Collapse controls"}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
          {isControlsCollapsed && (
            <span className="text-[11px] font-medium text-foreground pr-0.5">Actions</span>
          )}
        </button>
      </div>
      
      {!hasPerformedSearch ? (
        /* ── ZERO STATE (Original Centered Layout) ── */
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 overflow-y-auto">
          {/* Greeting heading */}
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground text-center mb-2 tracking-tight">
            How can I help you today, {firstName}?
          </h1>
          <p className="text-sm text-muted-foreground text-center mb-5">Search across organizational memory, decisions, action items, documents, and meetings.</p>
          {/* Dual Search Mode Selector */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <button
              type="button"
              onClick={() => setSearchMode('answer')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${searchMode === 'answer' ? 'bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/20' : 'bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
            >
              <MessageSquareText className="w-3.5 h-3.5" />
              <span>Answer Mode</span>
            </button>
            <button
              type="button"
              onClick={() => setSearchMode('find')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${searchMode === 'find' ? 'bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/20' : 'bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Find Mode</span>
            </button>
          </div>

          {/* Corporate Capsule Search Input Box */}
          <div className="w-full max-w-2xl">
            <form onSubmit={(e) => { e.preventDefault(); setSearchParams({ q: query }); runSearch(); }}>
              <div className="relative flex items-center bg-card border border-border hover:border-primary/40 focus-within:border-primary rounded-full px-3.5 py-2.5 shadow-sm transition-all w-full">
                <button
                  type="button"
                  onClick={handleStartNewChat}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 mr-1"
                  title="New chat"
                >
                  <Plus className="w-4 h-4 text-primary" />
                </button>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask Orbit AI anything..."
                  className="flex-1 bg-transparent border-0 outline-none ring-0 focus:ring-0 focus:outline-none text-sm text-foreground placeholder:text-muted-foreground px-2 min-w-0 w-full font-normal"
                />

                <div className="flex items-center gap-1 shrink-0 ml-1">
                  <button
                    type="submit"
                    disabled={!query.trim()}
                    className="w-8 h-8 rounded-full bg-primary hover:opacity-90 disabled:opacity-30 text-primary-foreground transition-all flex items-center justify-center shrink-0 shadow-xs"
                    title="Search"
                  >
                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </form>

            {/* Suggestion chips */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
              {SUGGESTED_PROMPTS.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => { setQuery(item.desc); setSearchParams({ q: item.desc }); runSearch(item.desc); }}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card border border-border hover:bg-secondary hover:border-primary/30 text-foreground text-xs font-semibold transition-all group shadow-xs active:scale-95"
                  >
                    <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
                    {item.title}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* ── SEARCH STATE (Premium Split Layout) ── */
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header specific to search state */}
            {/* Removed top header search bar per user request */}

          
{/* Top bar completely eliminated per user request */}

          {/* MAIN CONTENT AREA: Full-width Corporate AI Chat (Claude / ChatGPT style) */}
          <div className="flex-1 w-full h-full overflow-hidden flex flex-col bg-background">
             
             {/* Messages Scroll Area at Full Width so scrollbar is at the right viewport edge */}
             <div className="flex-1 overflow-y-auto w-full">
                <div className="w-full max-w-3xl lg:max-w-4xl mx-auto p-4 md:p-6 space-y-6">
                   {chatHistory.length === 0 && !isSynthesizing ? (
                      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center max-w-sm mx-auto">
                         <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-4 border border-slate-100 dark:border-border">
                           <Sparkles className="w-8 h-8 text-slate-300 dark:text-slate-600 dark:text-muted-foreground" />
                         </div>
                         <h3 className="font-bold text-slate-900 dark:text-foreground mb-2">Ready to assist</h3>
                         <p className="text-sm text-slate-500 dark:text-muted-foreground">Ask any question and Orbit AI will analyze organizational knowledge to synthesize an answer.</p>
                      </div>
                   ) : (
                      chatHistory.map((msg, idx) => (
                         <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'ml-auto flex-row-reverse max-w-2xl' : 'mr-auto w-full max-w-4xl'}`}>
                            
                            <div className="shrink-0 mt-1">
                               {msg.role === 'user' ? (
                                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center border border-slate-300 dark:border-slate-600 font-bold text-xs text-slate-600 dark:text-muted-foreground">
                                    {firstName.charAt(0)}
                                  </div>
                               ) : (
                                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-xs overflow-hidden">
                                    <WeftroLogo height={32} iconOnly />
                                  </div>
                               )}
                            </div>

                            <div className={`flex flex-col gap-1.5 flex-1 min-w-0 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                                 {msg.role === 'user' ? 'You' : 'Orbit AI'}
                                </span>
                               
                                <div className={`text-sm leading-relaxed ${msg.role === 'user' ? 'px-4 py-3 bg-secondary text-secondary-foreground border border-border/70 rounded-2xl max-w-[85%] shadow-xs' : 'py-1 text-foreground w-full'}`}>
                                   {msg.role === 'assistant' ? (
                                     <>
                                      <ReactMarkdown 
                                        remarkPlugins={[remarkGfm]}
                                        className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-800 prose-code:text-slate-900 dark:prose-code:text-slate-200 prose-code:bg-slate-100 dark:prose-code:bg-slate-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-a:text-primary"
                                        components={{
                                          p: ({ children }) => {
                                            const renderWithCitations = (child) => {
                                              if (typeof child !== 'string') return child;
                                              const parts = child.split(/(\[(?:Source:\s*)?#?R?\d+\])/gi);
                                              if (parts.length === 1) return child;
                                              return parts.map((part, pIdx) => {
                                                const match = part.match(/\[(?:Source:\s*)?#?(R?\d+)\]/i);
                                                if (!match) return part;
                                                const sourceIndex = match[1];
                                                const validCitation = msg.citations?.valid?.find(c => String(c.index).toUpperCase() === String(sourceIndex).toUpperCase());
                                                const isVerified = !!validCitation;
                                                const targetRecord = msg.sources?.find(s => String(s.index).toUpperCase() === String(sourceIndex).toUpperCase() || s.id === validCitation?.id);
                                                const isRelated = String(sourceIndex).toUpperCase().startsWith('R') || validCitation?.isRelatedEvidence;

                                                return (
                                                  <button
                                                    key={pIdx}
                                                    type="button"
                                                    onClick={() => {
                                                      if (targetRecord) {
                                                        const foundInResults = results.find(r => r.id === targetRecord.id);
                                                        if (foundInResults) {
                                                          setSelectedResult(foundInResults);
                                                          const el = document.getElementById(`result-card-${foundInResults.id}`);
                                                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                        }
                                                      }
                                                    }}
                                                    className={`inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded text-[11px] font-bold font-mono transition-all cursor-pointer shadow-xs active:scale-95 ${
                                                      isVerified
                                                        ? (isRelated
                                                            ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border border-purple-300 dark:border-purple-800 hover:bg-purple-100'
                                                            : (validCitation?.isTruncated
                                                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800 hover:bg-amber-100'
                                                                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'))
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-slate-700 hover:bg-slate-200'
                                                    }`}
                                                    title={
                                                      isVerified
                                                        ? (isRelated
                                                            ? `Related organizational context: ${validCitation.title || 'Untitled'}`
                                                            : (validCitation?.isTruncated
                                                                ? `Partial direct excerpt: ${validCitation.title || 'Untitled'}`
                                                                : `Direct source included: ${validCitation.title || 'Untitled'}`))
                                                        : `Unresolved citation index #${sourceIndex}`
                                                    }
                                                  >
                                                    <span>{isVerified ? (isRelated ? '🔗' : (validCitation?.isTruncated ? '⚠' : '✓')) : '?'}</span>
                                                    <span>{isRelated ? `Related #${sourceIndex}` : (validCitation?.isTruncated ? `Partial #${sourceIndex}` : `Source #${sourceIndex}`)}</span>
                                                  </button>
                                                );
                                              });
                                            };

                                            return <p>{React.Children.map(children, renderWithCitations)}</p>;
                                          },
                                          pre: ({ node, children, ...props }) => {
                                            const childProps = children && children.props ? children.props : {};
                                            return (
                                              <SearchCodeSnippetBlock className={childProps.className}>
                                                {children}
                                              </SearchCodeSnippetBlock>
                                            );
                                          },
                                          code: ({ node, inline, children, className, ...props }) => {
                                            if (inline) {
                                              return (
                                                <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-primary font-mono text-[11px] font-semibold break-words" {...props}>
                                                  {children}
                                                </code>
                                              );
                                            }
                                            return (
                                              <code className={`font-mono text-xs whitespace-pre-wrap break-words break-all ${className || ''}`} {...props}>
                                                {children}
                                              </code>
                                            );
                                          }
                                        }}
                                      >
                                         {msg.content}
                                      </ReactMarkdown>

                                      {/* Validated Evidence Provenance Bar */}
                                      {msg.citations && (msg.citations.valid?.length > 0 || msg.citations.unextractable?.length > 0) && (
                                        <div className="mt-3 pt-2.5 border-t border-slate-200/70 dark:border-slate-800 flex flex-wrap items-center gap-1.5">
                                          {msg.citations.valid?.length > 0 && (
                                            <>
                                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-muted-foreground mr-1">
                                                Included Sources:
                                              </span>
                                              {msg.citations.valid.map((cite) => (
                                                <button
                                                  key={cite.index}
                                                  type="button"
                                                  onClick={() => {
                                                    const found = results.find(r => r.id === cite.id);
                                                    if (found) {
                                                      setSelectedResult(found);
                                                      const el = document.getElementById(`result-card-${found.id}`);
                                                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                    }
                                                  }}
                                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${cite.isTruncated ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:border-amber-400' : 'bg-slate-100 dark:bg-slate-800/80 hover:bg-primary/10 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-primary/30'}`}
                                                  title={cite.isTruncated ? `Partial source excerpt included in prompt: ${cite.title || 'Untitled'}` : `Full source included in prompt: ${cite.title || 'Untitled'}`}
                                                >
                                                  <span className={`font-mono font-bold ${cite.isTruncated ? 'text-amber-600 dark:text-amber-400' : 'text-primary'}`}>#{cite.index}</span>
                                                  <span className="max-w-[140px] truncate">{cite.title}</span>
                                                  {cite.isTruncated && <span className="text-[9px] uppercase px-1 rounded bg-amber-200/60 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-bold">partial</span>}
                                                </button>
                                              ))}
                                            </>
                                          )}
                                          {msg.citations.unextractable?.length > 0 && (
                                            <>
                                              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400 dark:text-orange-500 mr-1 ml-1">
                                                Not Extracted:
                                              </span>
                                              {msg.citations.unextractable.map((cite) => (
                                                <button
                                                  key={cite.id}
                                                  type="button"
                                                  onClick={() => {
                                                    const found = results.find(r => r.id === cite.id);
                                                    if (found) {
                                                      setSelectedResult(found);
                                                      const el = document.getElementById(`result-card-${found.id}`);
                                                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                    }
                                                  }}
                                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors bg-orange-50 dark:bg-orange-950/30 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-800 hover:border-orange-400"
                                                  title={`Document found but could not be extracted: ${cite.title || 'Untitled'} (${cite.unextractableReason || 'unextractable'})`}
                                                >
                                                  <span className="font-mono font-bold text-orange-500 dark:text-orange-400">⚠</span>
                                                  <span className="max-w-[140px] truncate">{cite.title}</span>
                                                  <span className="text-[9px] uppercase px-1 rounded bg-orange-200/60 dark:bg-orange-900/60 text-orange-900 dark:text-orange-200 font-bold">unextractable</span>
                                                </button>
                                              ))}
                                            </>
                                          )}
                                        </div>
                                      )}
                                     </>
                                   ) : (
                                      <span>{msg.content}</span>
                                   )}
                                </div>

                                {msg.role === 'assistant' && (
                                   <div className="flex items-center gap-1 mt-1">
                                      <button onClick={() => handleCopy(msg.content, idx)} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-accent transition-colors" title="Copy text">
                                         {copiedMsgIndex === idx ? <CheckCheck className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                                      </button>
                                      <button onClick={() => handleSpeak(msg.content, idx)} className={`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-accent transition-colors ${isSpeakingMsgIndex === idx ? 'text-primary bg-primary/5 dark:bg-indigo-900/30' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`} title={isSpeakingMsgIndex === idx ? "Stop speaking" : "Read aloud"}>
                                         {isSpeakingMsgIndex === idx ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                                      </button>
                                      <div className="w-px h-3 bg-slate-200 dark:bg-slate-700 mx-1" />
                                      <button onClick={() => setVotedMsgState(p => ({...p, [idx]: 'up'}))} className={`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-accent transition-colors ${votedMsgState[idx] === 'up' ? 'text-primary' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                                         <ThumbsUp className="w-3.5 h-3.5" />
                                      </button>
                                      <button onClick={() => setVotedMsgState(p => ({...p, [idx]: 'down'}))} className={`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-accent transition-colors ${votedMsgState[idx] === 'down' ? 'text-rose-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                                         <ThumbsDown className="w-3.5 h-3.5" />
                                      </button>
                                   </div>
                                )}
                            </div>
                         </div>
                      ))
                   )}

                   {isSynthesizing && (
                      <div className="flex gap-4 max-w-3xl mr-auto">
                         <div className="shrink-0 mt-1">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-md animate-pulse overflow-hidden">
                              <WeftroLogo height={32} iconOnly />
                            </div>
                         </div>
                         <div className="flex flex-col gap-1.5 items-start">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Orbit AI</span>
                            <div className="py-2 flex items-center gap-2">
                               <Loader2 className="w-4 h-4 text-primary animate-spin" />
                               <span className="text-sm font-medium text-slate-600 dark:text-muted-foreground">Synthesizing insights...</span>
                            </div>
                         </div>
                      </div>
                   )}
                   <div ref={chatBottomRef} />
                </div>
             </div>
             
             {/* Corporate Capsule Floating Input */}
             <div className="px-4 pb-4 pt-2 bg-gradient-to-t from-background via-background/95 to-transparent shrink-0 w-full">
                <div className="max-w-3xl lg:max-w-4xl mx-auto">
                   <form 
                     onSubmit={handleFollowUp} 
                     className="relative flex items-center bg-card border border-border hover:border-primary/40 focus-within:border-primary rounded-full px-3.5 py-2 shadow-sm transition-all"
                   >
                      {/* Plus Action Button */}
                      <button
                        type="button"
                        onClick={handleStartNewChat}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 mr-1"
                        title="New Chat"
                      >
                         <Plus className="w-4 h-4 text-primary" />
                      </button>

                      {/* Text Input */}
                      <input
                        value={followUpInput}
                        onChange={e => setFollowUpInput(e.target.value)}
                        placeholder="Ask Orbit AI anything..."
                        className="flex-1 bg-transparent border-0 outline-none ring-0 focus:ring-0 text-sm text-foreground placeholder:text-muted-foreground min-w-0 px-2 font-normal"
                      />

                      {/* Right Control: Send */}
                      <div className="flex items-center gap-1 shrink-0 ml-1">
                         <button
                           type="submit"
                           disabled={!followUpInput.trim() || isSynthesizing}
                           className="w-8 h-8 rounded-full bg-primary hover:opacity-90 disabled:opacity-30 text-primary-foreground transition-all flex items-center justify-center shrink-0 shadow-xs"
                           title="Send message"
                         >
                            {isSynthesizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                         </button>
                      </div>
                   </form>
                   <p className="text-center text-[11px] text-muted-foreground/70 mt-2 font-normal">
                      Orbit AI can make mistakes. Verify important organizational info.
                   </p>
                </div>
             </div>

              {/* RIGHT SIDE: SIDEBAR CATEGORY FILTERS & SEARCH RESULTS (Hidden per user request for pure chatbot interface) */}
              <div className="hidden" aria-hidden="true">
                 {/* Right Sidebar Header: Category Filters / Quick Links */}
                 <div className="flex items-center justify-between mb-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-muted-foreground">Filters & Categories</h2>
                      {results.length > 0 && (
                        <span className="text-[11px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {filteredResults.length} {filteredResults.length === 1 ? 'result' : 'results'}
                        </span>
                      )}
                    </div>
                 </div>

                 {/* Horizontal Scrollable Category Filter Chips on the Right Side */}
                 <div className="flex items-center gap-1.5 pb-2.5 mb-3 border-b border-slate-100 dark:border-border overflow-x-auto hide-scrollbar shrink-0">
                   {FILTER_TABS.map(tab => {
                     const Icon = tab.icon;
                     const isActive = activeFilter === tab.id;
                     return (
                       <button
                         key={tab.id}
                         onClick={() => setActiveFilter(tab.id)}
                         className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors shrink-0 ${
                           isActive
                             ? 'bg-primary text-primary-foreground font-bold shadow-2xs'
                             : 'bg-slate-100 dark:bg-secondary text-slate-600 dark:text-muted-foreground hover:bg-slate-200 dark:hover:bg-accent'
                         }`}
                       >
                         <Icon className="w-3 h-3" />
                         <span>{tab.label}</span>
                       </button>
                     );
                   })}
                 </div>

                 {/* Results Section: Opens when there are search results or active search, otherwise shows clean empty helper state */}
                 {hasResults ? (
                   <div className="flex-1 flex flex-col min-h-0 overflow-hidden animate-in fade-in duration-200">
                     <div className="text-[11px] font-semibold text-slate-500 dark:text-muted-foreground mb-2 px-0.5">
                       Matching records ({filteredResults.length})
                     </div>

                     {/* Results Scrollable List */}
                     <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 pb-2 scrollbar-thin">
                        {isSearching ? (
                           <div className="flex flex-col items-center justify-center h-40">
                              <Loader2 className="w-6 h-6 text-primary animate-spin mb-2" />
                              <span className="text-xs text-slate-500 dark:text-muted-foreground">Searching workspace...</span>
                           </div>
                        ) : filteredResults.length === 0 ? (
                           <div className="flex flex-col items-center justify-center p-6 text-center bg-slate-50 dark:bg-secondary/40 border border-slate-200 dark:border-border border-dashed rounded-xl h-36">
                              <Search className="w-5 h-5 text-slate-300 mb-1.5" />
                              <span className="text-xs text-slate-500 dark:text-muted-foreground">No matches for current category filter.</span>
                           </div>
                        ) : (
                           filteredResults.map(item => {
                             const meta = TYPE_META[item.type] || TYPE_META.doc;
                             const Icon = meta.icon;
                             const isSelected = selectedResult?.id === item.id;

                             return (
                               <div
                                 id={`result-card-${item.id}`}
                                 key={`${item.type}-${item.id}`}
                                 onClick={() => setSelectedResult(item)}
                                 className={`p-3 rounded-xl border transition-all cursor-pointer ${
                                   isSelected
                                     ? 'bg-primary/5 dark:bg-primary/10 border-primary/40 shadow-xs ring-1 ring-primary/20'
                                     : 'bg-white dark:bg-card border-slate-200 dark:border-border hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
                                 }`}
                               >
                                 <div className="flex items-start justify-between gap-2 mb-1">
                                    <div className="flex items-center gap-1.5">
                                       <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider shrink-0 ${meta.bg} ${meta.color}`}>
                                         <Icon className="w-2.5 h-2.5" /> {meta.label}
                                       </span>
                                       {item.provider && (
                                          <span className="text-[9px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
                                            {item.provider}
                                          </span>
                                       )}
                                    </div>
                                    {item.created_at && (
                                       <span className="text-[10px] text-slate-400 font-medium">
                                         {new Date(item.created_at).toLocaleDateString()}
                                       </span>
                                    )}
                                 </div>
                                 <h4 className={`font-semibold text-xs leading-snug mb-1 line-clamp-1 ${isSelected ? 'text-primary font-bold' : 'text-slate-900 dark:text-foreground'}`}>
                                   {item.label}
                                 </h4>
                                 {item.snippet && (
                                   <p className="text-[11px] text-slate-500 dark:text-muted-foreground line-clamp-2 leading-relaxed">
                                     {item.snippet}
                                   </p>
                                 )}
                               </div>
                             );
                           })
                        )}
                     </div>
                     
                     {/* Selected Result Detail (Pinned at bottom of list) */}
                     {selectedResult && (
                        <div className="shrink-0 mt-2 bg-slate-50 dark:bg-secondary/40 border border-slate-200 dark:border-border rounded-xl p-3 shadow-xs animate-in slide-in-from-bottom-2 duration-200">
                           <div className="flex items-center justify-between mb-1.5 border-b border-slate-200/60 dark:border-border pb-1.5">
                              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 dark:text-muted-foreground">Preview</span>
                              {TYPE_META[selectedResult.type]?.route && (
                                 <button
                                   onClick={() => {
                                     const route = TYPE_META[selectedResult.type].route(selectedResult.id, selectedResult.space_id);
                                     if (route) navigate(route);
                                   }}
                                   className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline"
                                 >
                                   Open Record <ArrowUpRight className="w-3 h-3" />
                                 </button>
                              )}
                           </div>
                           <h3 className="font-bold text-xs text-slate-900 dark:text-foreground mb-1 leading-snug line-clamp-1">{selectedResult.label}</h3>
                           <div className="text-[11px] text-slate-600 dark:text-muted-foreground max-h-20 overflow-y-auto pr-1 mb-2">
                             {selectedResult.snippet || 'No preview available.'}
                           </div>

                           {/* Connected Knowledge Breadcrumbs */}
                           <div className="pt-2 border-t border-slate-200/60 dark:border-border">
                              <div className="flex items-center gap-1.5 mb-1.5">
                                 <BrainCircuit className="w-3 h-3 text-primary" />
                                 <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-muted-foreground">
                                    Connected Knowledge
                                 </span>
                                 {isLoadingConnected && <Loader2 className="w-2.5 h-2.5 animate-spin text-slate-400 ml-1" />}
                              </div>

                              {isLoadingConnected ? (
                                 <div className="text-[10px] text-slate-400 italic py-1">Discovering connections...</div>
                              ) : connectedRecords.length > 0 ? (
                                 <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-0.5">
                                    {connectedRecords.map((item) => {
                                       const itemMeta = TYPE_META[item.type] || TYPE_META.doc;
                                       const ItemIcon = itemMeta.icon;
                                       const relLabel = (item.relationship?.type || 'related_to').replace(/_/g, ' ');
                                       return (
                                          <button
                                             key={item.id}
                                             onClick={() => {
                                                if (item.route) {
                                                   navigate(item.route);
                                                } else {
                                                   // Select within results if present or preview directly
                                                   setSelectedResult({
                                                      id: item.id,
                                                      label: item.title,
                                                      type: item.type,
                                                      snippet: item.snippet,
                                                      space_id: item.metadata?.space_id,
                                                   });
                                                }
                                             }}
                                             title={`${relLabel} • ${item.title}`}
                                             className="group flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-white dark:bg-card border border-slate-200/80 dark:border-border/80 hover:border-primary/50 dark:hover:border-primary/50 text-slate-700 dark:text-foreground transition-colors shadow-2xs text-left max-w-full"
                                          >
                                             <ItemIcon className="w-2.5 h-2.5 shrink-0 text-primary" />
                                             <span className="truncate max-w-[140px] font-medium">{item.title}</span>
                                             <span className="text-[8px] uppercase tracking-wider px-1 py-0.2 rounded bg-slate-100 dark:bg-muted text-slate-500 dark:text-muted-foreground shrink-0">
                                                {relLabel}
                                             </span>
                                             <ArrowUpRight className="w-2.5 h-2.5 shrink-0 text-slate-400 group-hover:text-primary transition-colors" />
                                          </button>
                                       );
                                    })}
                                 </div>
                              ) : (
                                 <div className="text-[10px] text-slate-400 dark:text-muted-foreground/60 italic py-0.5">
                                    No verified 1-hop connections found for this record.
                                 </div>
                              )}
                           </div>
                        </div>
                     )}
                   </div>
                 ) : (
                   /* When no results are active, show a helpful quiet helper state while keeping category filters ready */
                   <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-50/50 dark:bg-secondary/20 border border-slate-200/60 dark:border-border/60 rounded-xl">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                        <Sparkles className="w-5 h-5 text-slate-400" />
                      </div>
                      <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Knowledge Filters</h4>
                      <p className="text-[11px] text-slate-500 dark:text-muted-foreground max-w-xs">
                        Select any category above to filter results when querying organizational knowledge.
                      </p>
                   </div>
                 )}
              </div>
          </div>
        </div>
      )}

<Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="rounded-2xl max-w-lg p-0 overflow-hidden bg-card border-border shadow-xl">
          <DialogHeader className="p-4 pb-3 border-b border-border/70 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <History className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-foreground">
                  Chat History
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Select any previous conversation to review and continue chatting.
                </DialogDescription>
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleStartNewChat}
              className="h-8 px-3 text-xs gap-1.5 rounded-lg shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New Chat</span>
            </Button>
          </DialogHeader>

          {/* Scrollable Chat Sessions List */}
          <div className="max-h-[380px] overflow-y-auto p-3 space-y-2 scrollbar-thin">
            {sessions.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No saved conversations found.
              </div>
            ) : (
              sessions.map((sess) => {
                const isActive = sess.id === activeSessionId;
                const formattedDate = new Date(sess.updated_at || sess.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <div
                    key={sess.id}
                    onClick={() => handleSelectSession(sess.id)}
                    className={`group w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isActive
                        ? 'bg-primary/10 border-primary/40 shadow-xs'
                        : 'bg-card border-border/70 hover:bg-secondary hover:border-primary/30'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground group-hover:text-foreground'
                      }`}>
                        <MessageSquare className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`text-xs font-semibold truncate ${isActive ? 'text-primary' : 'text-foreground'}`}>
                            {sess.title || 'Untitled Conversation'}
                          </p>
                          {isActive && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/40 text-primary bg-primary/5 shrink-0">
                              Active
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{formattedDate}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSessionToDelete(sess);
                        setShowDeleteConfirm(true);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-all shrink-0"
                      title="Delete this chat"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal: Delete Chat Session */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="rounded-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold flex items-center gap-2 text-rose-500">
              <Trash2 className="w-4 h-4" />
              Delete Conversation?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete <strong className="text-foreground">"{sessionToDelete?.title || 'this conversation'}"</strong>? All messages in this chat will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="rounded-xl text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteSession}
              className="rounded-xl text-xs bg-rose-600 hover:bg-rose-700 text-white font-medium"
            >
              Delete Chat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
