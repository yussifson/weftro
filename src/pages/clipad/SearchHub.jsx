import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FileText, CheckCircle, MessageSquare, Calendar, Video,
  Loader2, X, ShieldAlert, AlertTriangle, ExternalLink, Zap, Layers, Copy, CheckCheck,
  Users, ArrowUpRight, Send, Plus, Volume2, VolumeX, ThumbsUp, ThumbsDown, Edit,
  Search, Sparkles, ArrowLeft
, BrainCircuit, Inbox} from 'lucide-react';
import { CliPadLogo } from '@/components/ui/CliPadLogo';
import { supabase } from '@/api/supabaseClient';
import { generateText } from '@/lib/cloudflareAI';
import { buildOrgContext } from '@/lib/clipadIntelligence';
import { useAuth } from '@/lib/AuthContext';
import { isAdmin } from '@/lib/constants';
import { useToast } from '@/components/ui/use-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const TYPE_META = {
  person:      { icon: Users,         label: 'Person',    color: 'text-[#006065] dark:text-[#fad503]', bg: 'bg-[#006065]/10 dark:bg-[#006065]/30 border border-[#006065]/20' },
  meeting:     { icon: Calendar,      label: 'Meeting',   color: 'text-[#006065] dark:text-[#fad503]', bg: 'bg-[#006065]/10 dark:bg-[#006065]/30 border border-[#006065]/20', route: (id) => `/meetings/${id}` },
  video:       { icon: Video,         label: 'Video',     color: 'text-[#006065] dark:text-[#fad503]', bg: 'bg-[#006065]/10 dark:bg-[#006065]/30 border border-[#006065]/20', route: (id) => `/watch/${id}` },
  doc:         { icon: FileText,      label: 'Doc',       color: 'text-[#006065] dark:text-[#fad503]', bg: 'bg-[#006065]/10 dark:bg-[#006065]/30 border border-[#006065]/20', route: (id, spaceId) => spaceId ? `/spaces/${spaceId}?tab=docs&docId=${id}` : null },
  task:        { icon: CheckCircle,   label: 'Task',      color: 'text-[#006065] dark:text-[#fad503]', bg: 'bg-[#006065]/10 dark:bg-[#006065]/30 border border-[#006065]/20', route: (id, spaceId) => spaceId ? `/spaces/${spaceId}?tab=tasks&taskId=${id}` : null },
  message:     { icon: MessageSquare, label: 'Chat',      color: 'text-[#006065] dark:text-indigo-400', bg: 'bg-[#006065]/10 border border-[#006065]/20', route: (id, spaceId) => spaceId ? `/spaces/${spaceId}?tab=chat` : null },
  decision:    { icon: ShieldAlert,   label: 'Decision',  color: 'text-[#006065] dark:text-[#fad503]', bg: 'bg-[#006065]/10 dark:bg-[#006065]/30 border border-[#006065]/20', route: (id, spaceId) => spaceId ? `/spaces/${spaceId}?tab=decisions` : null },
  blocker:     { icon: AlertTriangle, label: 'Blocker',   color: 'text-[#006065] dark:text-[#fad503]', bg: 'bg-[#006065]/10 dark:bg-[#006065]/30 border border-[#006065]/20', route: (id, spaceId) => spaceId ? `/spaces/${spaceId}?tab=overview` : null },
  standup:     { icon: Zap,           label: 'Standup',   color: 'text-[#006065] dark:text-[#fad503]', bg: 'bg-[#006065]/10 dark:bg-[#006065]/30 border border-[#006065]/20', route: (id, spaceId) => spaceId ? `/spaces/${spaceId}?tab=standup` : null },
  integration: { icon: ExternalLink,  label: 'Imported',  color: 'text-[#006065] dark:text-[#fad503]', bg: 'bg-[#006065]/10 dark:bg-[#006065]/30 border border-[#006065]/20', route: () => `/integrations` },
};

const FILTER_TABS = [
  { id: 'all', label: 'All Knowledge', icon: Layers },
  { id: 'person', label: 'People', icon: Users },
  { id: 'doc', label: 'Documents', icon: FileText },
  { id: 'task', label: 'Tasks', icon: CheckCircle },
  { id: 'meeting', label: 'Meetings', icon: Calendar },
  { id: 'decision', label: 'Decisions', icon: ShieldAlert },
  { id: 'message', label: 'Conversations', icon: MessageSquare },
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
  meeting: ['meeting', 'video'],
  decision: ['decision', 'blocker'],
  message: ['message'],
  integration: ['integration'],
};

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

export default function SearchHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [activeFilter, setActiveFilter] = useState('all');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);

  // AI State
  const [aiAnswer, setAiAnswer] = useState('');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [followUpInput, setFollowUpInput] = useState('');
  const [hasPerformedSearch, setHasPerformedSearch] = useState(false);
  const chatBottomRef = React.useRef(null);

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

  // Ref so the early-mounting useEffect can call runSearch after it is defined
  const runSearchRef = React.useRef(null);

  // Restore inputs on mount
  useEffect(() => {
    if (!user?.id) return;
    const savedQuery = localStorage.getItem(`search_hub_query_${user.id}`);
    const savedFollowUp = localStorage.getItem(`search_hub_followup_${user.id}`);
    if (savedQuery) setQuery(savedQuery);
    if (savedFollowUp) setFollowUpInput(savedFollowUp);
  }, [user?.id]);

  // Persist inputs on change
  useEffect(() => {
    if (user?.id) {
      if (query) {
        localStorage.setItem(`search_hub_query_${user.id}`, query);
      } else {
        localStorage.removeItem(`search_hub_query_${user.id}`);
      }
    }
  }, [query, user?.id]);

  useEffect(() => {
    if (user?.id) {
      if (followUpInput) {
        localStorage.setItem(`search_hub_followup_${user.id}`, followUpInput);
      } else {
        localStorage.removeItem(`search_hub_followup_${user.id}`);
      }
    }
  }, [followUpInput, user?.id]);

  // Load persistent chat history from Supabase on mount
  useEffect(() => {
    if (!user?.id) return;
    const loadPersistentChat = async () => {
      try {
        const { data: sessions } = await supabase
          .from('orbit_chat_sessions')
          .select('id')
          .eq('user_id', user.id)
          .eq('title', 'Search Hub AI Chat')
          .order('updated_at', { ascending: false })
          .limit(1);

        if (sessions && sessions.length > 0) {
          const sid = sessions[0].id;
          setActiveSessionId(sid);

          const { data: msgs } = await supabase
            .from('orbit_chat_messages')
            .select('*')
            .eq('session_id', sid)
            .order('created_at', { ascending: true });

          if (msgs && msgs.length > 0) {
            setChatHistory(msgs.map(m => ({
              role: m.role,
              content: m.content
            })));
            setHasPerformedSearch(true);

            // Re-run search matching records silently without restarting AI synthesis
            const firstUserMsg = msgs.find(m => m.role === 'user');
            if (firstUserMsg) {
              setQuery(firstUserMsg.content);
              // Use the ref so we don't reference runSearch before it is initialized
              if (runSearchRef.current) runSearchRef.current(firstUserMsg.content, true);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load persistent search messages:', err);
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
      const { error: insErr } = await supabase
        .from('orbit_chat_sessions')
        .insert({
          id: sid,
          user_id: user.id,
          company_id: companyId || null,
          title: 'Search Hub AI Chat',
          model: 'moonshotai/kimi-k3',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

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

    const [docs, tasks, messages, meetings, decisions, videos, blockers, standups, integrations, people, memories, captures, moments] = await Promise.all([
      safeQuery(spaceIdArr.length > 0 ? supabase.from('clipad_docs').select('id, title, content, space_id, created_at').in('space_id', spaceIdArr).ilike('title', term).limit(20) : []),
      safeQuery(spaceIdArr.length > 0 ? supabase.from('clipad_action_items').select('id, title, context, space_id, created_at').in('space_id', spaceIdArr).ilike('title', term).limit(20) : []),
      safeQuery(spaceIdArr.length > 0 ? supabase.from('clipad_messages').select('id, content, space_id, created_at').in('space_id', spaceIdArr).ilike('content', term).limit(20) : []),
      safeQuery(spaceIdArr.length > 0 ? supabase.from('clipad_meeting_records').select('id, title, ai_summary, space_id, created_at').in('space_id', spaceIdArr).ilike('title', term).limit(20) : []),
      safeQuery(spaceIdArr.length > 0 ? supabase.from('clipad_decisions').select('id, decision_text, team_space_id, created_at').in('team_space_id', spaceIdArr).ilike('decision_text', term).limit(20) : []),
      safeQuery(spaceIdArr.length > 0 ? supabase.from('clipad_videos').select('id, title, ai_summary, space_id, created_at').in('space_id', spaceIdArr).eq('company_id', cid).ilike('title', term).limit(20) : []),
      safeQuery(spaceIdArr.length > 0 ? supabase.from('clipad_blockers').select('id, description, team_space_id, detected_at').in('team_space_id', spaceIdArr).ilike('description', term).limit(20) : []),
      safeQuery(spaceIdArr.length > 0 ? supabase.from('clipad_standups').select('id, user_name, today, yesterday, blockers, space_id, created_at').in('space_id', spaceIdArr).ilike('today', term).limit(20) : []),
      safeQuery(supabase.from('clipad_imported_knowledge').select('id, title, content, provider, content_type, updated_at').eq('company_id', cid).ilike('title', term).limit(20)),
      searchPeople(q, cid),
      safeQuery(supabase.from('clipad_v3_memories').select('id, name, content, updated_at').eq('company_id', cid).ilike('content', term).limit(10)),
      safeQuery(supabase.from('clipad_v3_captures').select('id, title, content, created_at').eq('user_id', user.id).ilike('content', term).limit(10)),
      safeQuery(supabase.from('clipad_v3_smart_moments').select('id, title, description, created_at').eq('company_id', cid).ilike('description', term).limit(10))
    ]);

    const raw = [
      ...(people || []),
      ...(memories || []).map(m => ({ type: 'memory', id: m.id, label: m.name || 'Memory', snippet: m.content, created_at: m.updated_at })),
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
    setChatHistory([]);

    try {
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
          // Clean up raw backslash escaped quotes, braces, brackets, and raw backslash characters
          .replace(/\\([\\`*_{}[\]()#+\-.!])/g, '$1')
          // Strip out typical malformed token artifacts or corrupt byte markers sometimes outputted by LLMs
          .replace(/[\uFFFD\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
          .trim();
      };

      let fullText = '';
      await generateText(promptMessages, (accumulated) => {
        if (synthSessionRef.current !== sessionId) return; // stale stream
        const clean = cleanText(accumulated);
        fullText = clean;
        // Update chatHistory in real-time so streaming text is visible immediately
        setChatHistory([{ role: 'assistant', content: clean }]);
      });

      if (synthSessionRef.current === sessionId) {
        setChatHistory([{ role: 'assistant', content: fullText }]);
        const sid = await getOrCreateSession();
        if (sid) {
          await supabase.from('orbit_chat_messages').delete().eq('session_id', sid);
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
          content: `You are Orbit AI. The user searched for: "${lastQueryRef.current || 'unknown'}". Answer their follow-up question based on the conversation context. Use clear markdown formatting.`
        },
        // Include prior conversation (exclude system messages that might be in history)
        ...updatedHistory.filter(m => m.role === 'user' || m.role === 'assistant')
      ];

      const cleanText = (raw) => {
        return raw
          .replace(/<(think|thought)>[\s\S]*?<\/\1>/gi, '')
          .replace(/<(think|thought)>[\s\S]*$/gi, '')
          .replace(/<\/(think|thought)>/gi, '')
          .replace(/\\([\\`*_{}[\]()#+\-.!])/g, '$1')
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
  const showLeftPanel = isSearching || filteredResults.length > 0;
  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 overflow-hidden">
      
      {!hasPerformedSearch ? (
        /* ── ZERO STATE (Original Centered Layout) ── */
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 overflow-y-auto">
          {/* Greeting heading */}
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white text-center mb-2 tracking-tight">
            How can I help you today, {firstName}?
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-8">Search across organizational memory, decisions, action items, documents, and meetings.</p>

          {/* Search Input Bar */}
          <div className="w-full max-w-2xl">
            <form onSubmit={(e) => { e.preventDefault(); setSearchParams({ q: query }); runSearch(); }}>
              <div className="relative flex items-center bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-lg hover:border-[#006065]/50 focus-within:border-[#006065] focus-within:ring-4 focus-within:ring-[#006065]/10 transition-all w-full">
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search decisions, documents, action items, standups..."
                  className="flex-1 bg-transparent border-0 outline-none ring-0 text-base font-medium placeholder:text-slate-400 text-slate-900 dark:text-white px-4 min-w-0 w-full"
                />

                {query && (
                  <button type="button" onClick={() => setQuery('')} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 mr-1 shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="submit"
                  disabled={!query.trim()}
                  className="px-6 py-3 sm:py-2.5 bg-[#006065] hover:bg-[#006065]/90 disabled:opacity-40 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shrink-0 shadow-md text-sm"
                >
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span className="hidden sm:inline">Search</span>
                </button>
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
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all group shadow-sm active:scale-95"
                  >
                    <Icon className="w-3.5 h-3.5 text-[#006065] shrink-0" />
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
          <header className="h-16 shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 md:px-8 gap-4 md:gap-8 z-10 shadow-sm">
            <button 
              onClick={() => { setHasPerformedSearch(false); setQuery(''); setResults([]); setAiAnswer(''); }} 
              className="hidden md:flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg transition-colors font-bold text-sm shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" /> New Search
            </button>

            <div className="flex-1 max-w-3xl">
              <form onSubmit={(e) => { e.preventDefault(); setSearchParams({ q: query }); runSearch(); }} className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400 group-focus-within:text-[#006065] transition-colors" />
                </div>
                <input
                  type="text"
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search organizational memory..."
                  className="block w-full pl-10 pr-12 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-[#006065] focus:border-[#006065] dark:focus:ring-[#006065] transition-all placeholder:text-slate-400"
                />
                {query && (
                  <div className="absolute inset-y-0 right-0 pr-1 flex items-center gap-1">
                    <button type="button" onClick={() => { setQuery(''); setHasPerformedSearch(false); }} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-md">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </form>
            </div>
            
            <button 
              onClick={() => { setHasPerformedSearch(false); setQuery(''); setResults([]); setAiAnswer(''); }} 
              className="md:hidden p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition-colors"
              title="New Search"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </header>

          {/* FILTER TABS */}
          <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 py-2 overflow-x-auto hide-scrollbar flex gap-2">
            {FILTER_TABS.map(tab => {
               const Icon = tab.icon;
               const isActive = activeFilter === tab.id;
               return (
                 <button
                   key={tab.id}
                   onClick={() => setActiveFilter(tab.id)}
                   className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${isActive ? 'bg-[#006065] text-[#fad503] font-bold shadow-sm border border-[#006065]' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'}`}
                 >
                   <Icon className="w-3.5 h-3.5" /> {tab.label}
                 </button>
               );
            })}
          </div>

          {/* MAIN CONTENT AREA */}
          <div className="flex-1 w-full max-w-screen-2xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 h-full overflow-hidden">
             
             {/* LEFT SIDE: SEARCH RESULTS */}
             <div className="col-span-1 lg:col-span-5 flex flex-col h-full overflow-hidden">
                <div className="flex items-center justify-between mb-3 shrink-0 px-1">
                   <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Results</h2>
                   <span className="text-xs font-semibold bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">{filteredResults.length} found</span>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 pb-6 scrollbar-hide">
                   {isSearching ? (
                      <div className="flex flex-col items-center justify-center h-40">
                         <Loader2 className="w-6 h-6 text-[#006065] animate-spin mb-2" />
                         <span className="text-xs text-slate-500">Searching workspace...</span>
                      </div>
                   ) : filteredResults.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-dashed rounded-xl h-40">
                         <Search className="w-6 h-6 text-slate-300 mb-2" />
                         <span className="text-sm text-slate-500">No results found for your query.</span>
                      </div>
                   ) : (
                      filteredResults.map(item => {
                        const meta = TYPE_META[item.type] || TYPE_META.doc;
                        const Icon = meta.icon;
                        const isSelected = selectedResult?.id === item.id;

                        return (
                          <div
                            key={`${item.type}-${item.id}`}
                            onClick={() => setSelectedResult(item)}
                            className={`p-4 rounded-xl border transition-all cursor-pointer ${isSelected ? 'bg-[#006065]/5 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800 shadow-sm ring-1 ring-indigo-500/20' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm'}`}
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                               <div className="flex items-center gap-2">
                                  <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0 ${meta.bg} ${meta.color}`}>
                                    <Icon className="w-3 h-3" /> {meta.label}
                                  </span>
                                  {item.provider && (
                                     <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
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
                            <h4 className={`font-bold text-sm leading-snug mb-1.5 line-clamp-1 ${isSelected ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-900 dark:text-white'}`}>
                              {item.label}
                            </h4>
                            {item.snippet && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
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
                   <div className="shrink-0 mt-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-lg animate-in slide-in-from-bottom-4 duration-300">
                      <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                         <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Record Preview</span>
                         {TYPE_META[selectedResult.type]?.route && (
                            <button
                              onClick={() => {
                                const route = TYPE_META[selectedResult.type].route(selectedResult.id, selectedResult.space_id);
                                if (route) navigate(route);
                              }}
                              className="flex items-center gap-1 text-[11px] font-bold text-[#006065] dark:text-indigo-400 hover:bg-[#006065]/5 dark:hover:bg-indigo-900/30 px-2 py-1 rounded transition-colors"
                            >
                              Open <ArrowUpRight className="w-3 h-3" />
                            </button>
                         )}
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2 leading-snug">{selectedResult.label}</h3>
                      <div className="text-xs text-slate-600 dark:text-slate-300 max-h-32 overflow-y-auto pr-2">
                        {selectedResult.snippet || 'No content preview available.'}
                      </div>
                   </div>
                )}
             </div>
             
             {/* RIGHT SIDE: ORBIT AI CHAT */}
             <div className="col-span-1 lg:col-span-7 flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden relative">
                
                {/* Chat Header */}
                <div className="h-14 border-b border-slate-100 dark:border-slate-800 px-5 flex items-center gap-3 shrink-0 bg-slate-50 dark:bg-slate-900/50">
                   <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-inner">
                      <Sparkles className="w-4 h-4 text-white" />
                   </div>
                   <div>
                     <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-none">Orbit AI Synthesis</h3>
                     <span className="text-[10px] text-slate-500 font-medium">Enterprise Intelligence Engine</span>
                   </div>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                   {chatHistory.length === 0 && !isSynthesizing ? (
                      <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto">
                         <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-700">
                           <Sparkles className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                         </div>
                         <h3 className="font-bold text-slate-900 dark:text-white mb-2">No active synthesis</h3>
                         <p className="text-sm text-slate-500">Ask a question above and Orbit AI will analyze your organizational knowledge to synthesize an answer.</p>
                      </div>
                   ) : (
                      chatHistory.map((msg, idx) => (
                         <div key={idx} className={`flex gap-4 max-w-3xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                            
                            <div className="shrink-0 mt-1">
                               {msg.role === 'user' ? (
                                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center border border-slate-300 dark:border-slate-600">
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{firstName.charAt(0)}</span>
                                  </div>
                               ) : (
                                  <div className="w-8 h-8 rounded-xl bg-[#006065] flex items-center justify-center shadow-md">
       <CliPadLogo size={18} color="#ffffff" />
     </div>
                               )}
                            </div>

                            <div className={`flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                                 {msg.role === 'user' ? 'You' : 'Orbit AI'}
                               </span>
                               
                               <div className={`text-sm leading-relaxed ${msg.role === 'user' ? 'px-5 py-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm rounded-3xl rounded-tr-sm' : 'py-2 text-slate-800 dark:text-slate-200'}`}>
                                  {msg.role === 'assistant' ? (
                                     <ReactMarkdown 
                                       remarkPlugins={[remarkGfm]}
                                       className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-700 prose-code:text-slate-900 dark:prose-code:text-slate-200 prose-code:bg-slate-100 dark:prose-code:bg-slate-800 prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-a:text-[#006065]"
                                     >
                                        {msg.content}
                                     </ReactMarkdown>
                                  ) : (
                                     <span>{msg.content}</span>
                                  )}
                               </div>

                               {msg.role === 'assistant' && (
                                  <div className="flex items-center gap-1 mt-1">
                                     <button onClick={() => handleCopy(msg.content, idx)} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Copy text">
                                        {copiedMsgIndex === idx ? <CheckCheck className="w-3.5 h-3.5 text-[#006065]" /> : <Copy className="w-3.5 h-3.5" />}
                                     </button>
                                     <button onClick={() => handleSpeak(msg.content, idx)} className={`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${isSpeakingMsgIndex === idx ? 'text-[#006065] bg-[#006065]/5 dark:bg-indigo-900/30' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`} title={isSpeakingMsgIndex === idx ? "Stop speaking" : "Read aloud"}>
                                        {isSpeakingMsgIndex === idx ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                                     </button>
                                     <div className="w-px h-3 bg-slate-200 dark:bg-slate-700 mx-1" />
                                     <button onClick={() => setVotedMsgState(p => ({...p, [idx]: 'up'}))} className={`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${votedMsgState[idx] === 'up' ? 'text-[#006065]' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                                        <ThumbsUp className="w-3.5 h-3.5" />
                                     </button>
                                     <button onClick={() => setVotedMsgState(p => ({...p, [idx]: 'down'}))} className={`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${votedMsgState[idx] === 'down' ? 'text-rose-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
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
                            <div className="w-8 h-8 rounded-xl bg-[#006065] flex items-center justify-center shadow-md animate-pulse">
       <CliPadLogo size={18} color="#ffffff" />
     </div>
                         </div>
                         <div className="flex flex-col gap-1.5 items-start">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Orbit AI</span>
                            <div className="py-2 flex items-center gap-2">
                               <Loader2 className="w-4 h-4 text-[#006065] animate-spin" />
                               <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Synthesizing insights...</span>
                            </div>
                         </div>
                      </div>
                   )}
                   <div ref={chatBottomRef} />
                </div>
                
                {/* Chat Input */}
                <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0">
                   <form onSubmit={handleFollowUp} className="relative flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-[#006065] transition-all shadow-sm">
                      <input
                        value={followUpInput}
                        onChange={e => setFollowUpInput(e.target.value)}
                        placeholder="Ask a follow-up question..."
                        className="flex-1 bg-transparent border-none outline-none ring-0 text-sm px-3 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-0"
                      />
                      <button
                        type="submit"
                        disabled={!followUpInput.trim() || isSynthesizing}
                        className="p-2 rounded-lg bg-indigo-600 hover:bg-[#006065] text-white disabled:opacity-50 transition-colors shrink-0"
                      >
                         {isSynthesizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
                      </button>
                   </form>
                   <p className="text-center text-[10px] text-slate-400 font-medium mt-2">
                      Orbit AI can make mistakes. Consider verifying important organizational facts.
                   </p>
                </div>

             </div>
          </div>
        </div>
      )}
    </div>
  );
}
