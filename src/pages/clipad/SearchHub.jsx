import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FileText, CheckCircle, MessageSquare, Calendar, Video,
  Loader2, X, ShieldAlert, AlertTriangle, ExternalLink, Zap, Layers, Copy, CheckCheck,
  Users, ArrowUpRight, Send, Plus, Volume2, VolumeX, ThumbsUp, ThumbsDown, Edit,
  Search, Sparkles, ArrowLeft
, BrainCircuit, Inbox, Compass} from 'lucide-react';
import { CliPadLogo } from '@/components/ui/CliPadLogo';
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
      safeQuery(supabase.from('clipad_v3_captures').select('id, title, content, created_at').eq('user_id', user.id).ilike('content', term).limit(10)),
      safeQuery(supabase.from('clipad_v3_smart_moments').select('id, title, description, created_at').eq('company_id', cid).ilike('description', term).limit(10))
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
            setChatHistory([{
              role: 'assistant',
              content: streamedText,
              sources: ragResultSourcesRef.current || [],
              citations: null
            }]);
          }
        });

        if (synthSessionRef.current !== sessionId) return;

        const finalContent = ragResult.answer || fullText;
        setChatHistory([{
          role: 'assistant',
          content: finalContent,
          sources: ragResult.sources || [],
          citations: ragResult.citations || null,
          status: ragResult.status,
          grounded: ragResult.grounded
        }]);

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
    <div className="flex flex-col h-screen bg-background font-sans text-foreground overflow-hidden">
      
      {!hasPerformedSearch ? (
        /* ── ZERO STATE (Original Centered Layout) ── */
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 overflow-y-auto">
          {/* Greeting heading */}
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground text-center mb-2 tracking-tight">
            How can I help you today, {firstName}?
          </h1>
          <p className="text-sm text-muted-foreground text-center mb-8">Search across organizational memory, decisions, action items, documents, and meetings.</p>

          {/* Search Input Bar */}
          <div className="w-full max-w-2xl">
            <form onSubmit={(e) => { e.preventDefault(); setSearchParams({ q: query }); runSearch(); }}>
              <div className="relative flex items-center bg-card border border-border rounded-full pl-5 pr-2 py-2 shadow-sm hover:border-primary/40 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all w-full">
                <Search className="w-5 h-5 text-muted-foreground shrink-0 mr-2" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search decisions, documents, action items, standups..."
                  className="flex-1 bg-transparent border-0 outline-none ring-0 focus:ring-0 focus:outline-none text-base font-normal placeholder:text-muted-foreground text-foreground px-1 min-w-0 w-full"
                />

                {query && (
                  <button type="button" onClick={() => setQuery('')} className="p-1.5 text-muted-foreground hover:text-foreground mr-1 shrink-0 rounded-full hover:bg-secondary transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="submit"
                  disabled={!query.trim()}
                  className="w-10 h-10 bg-primary hover:bg-primary/90 disabled:opacity-30 text-primary-foreground rounded-full flex items-center justify-center transition-all active:scale-95 shrink-0 shadow-sm"
                  title="Search"
                >
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
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

          
            {/* CLEAN COMPACT TOP HEADER */}
            <div className="shrink-0 bg-white dark:bg-card border-b border-slate-200 dark:border-border px-4 md:px-6 py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleNewSearch}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors bg-primary text-white shadow-xs hover:bg-primary/90"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> New Search
                </button>
                {query && (
                  <span className="text-xs text-slate-500 dark:text-muted-foreground hidden sm:inline">
                    Query: <strong className="text-slate-800 dark:text-slate-200">"{query}"</strong>
                  </span>
                )}
              </div>

              {/* Context Session Attachment Selector (Milestone 4) */}
              {isContextSessionsEnabled && availableContextSessions.length > 0 && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <Compass className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-xs font-bold text-slate-500 dark:text-muted-foreground whitespace-nowrap hidden sm:inline">Session:</span>
                  <select
                    value={selectedContextSessionId}
                    onChange={(e) => handleSelectContextSession(e.target.value)}
                    className="text-xs bg-slate-100 dark:bg-secondary border border-slate-200 dark:border-border rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-200 font-medium outline-none focus:ring-1 focus:ring-primary cursor-pointer max-w-[180px] truncate"
                    title="Attach search synthesis to an active Context Session"
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
            </div>

          {/* MAIN CONTENT AREA: Responsive Split. Chat on Left, Results + Right Filters on Right */}
          <div className="flex-1 w-full max-w-screen-2xl mx-auto p-3 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 h-full overflow-hidden transition-all duration-300">
             
             {/* LEFT SIDE: ORBIT AI CHAT (Takes 7-8 columns, full width on mobile) */}
             <div className="col-span-1 lg:col-span-7 xl:col-span-8 flex flex-col h-full bg-white dark:bg-card border border-slate-200 dark:border-border rounded-2xl shadow-xs overflow-hidden relative">
                
                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                   {chatHistory.length === 0 && !isSynthesizing ? (
                      <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto">
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
                                  <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-xs">
                                    <CliPadLogo size={18} color="#ffffff" />
                                  </div>
                               )}
                            </div>

                            <div className={`flex flex-col gap-1.5 flex-1 min-w-0 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                                 {msg.role === 'user' ? 'You' : 'Orbit AI'}
                                </span>
                               
                                <div className={`text-sm leading-relaxed ${msg.role === 'user' ? 'px-5 py-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-foreground shadow-xs rounded-3xl rounded-tr-sm' : 'py-2 text-slate-800 dark:text-slate-200 w-full'}`}>
                                   {msg.role === 'assistant' ? (
                                     <>
                                      <ReactMarkdown 
                                        remarkPlugins={[remarkGfm]}
                                        className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-800 prose-code:text-slate-900 dark:prose-code:text-slate-200 prose-code:bg-slate-100 dark:prose-code:bg-slate-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-a:text-primary"
                                        components={{
                                          p: ({ children }) => {
                                            const renderWithCitations = (child) => {
                                              if (typeof child !== 'string') return child;
                                              const parts = child.split(/(\[Source:\s*#?\d+\])/gi);
                                              if (parts.length === 1) return child;
                                              return parts.map((part, pIdx) => {
                                                const match = part.match(/\[Source:\s*#?(\d+)\]/i);
                                                if (!match) return part;
                                                const sourceIndex = parseInt(match[1], 10);
                                                const validCitation = msg.citations?.valid?.find(c => c.index === sourceIndex);
                                                const isVerified = !!validCitation;
                                                const targetRecord = msg.sources?.find(s => s.index === sourceIndex);

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
                                                    className={`inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded text-[11px] font-bold font-mono transition-all cursor-pointer shadow-xs active:scale-95 ${isVerified ? (validCitation?.isTruncated ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800 hover:bg-amber-100' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100') : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-slate-700 hover:bg-slate-200'}`}
                                                    title={isVerified ? (validCitation?.isTruncated ? `Partial source excerpt: ${validCitation.title || 'Untitled'}` : `Source included: ${validCitation.title || 'Untitled'}`) : `Unresolved citation index #${sourceIndex}`}
                                                  >
                                                    <span>{isVerified ? (validCitation?.isTruncated ? '⚠' : '✓') : '?'}</span>
                                                    <span>{validCitation?.isTruncated ? `Partial excerpt #${sourceIndex}` : `Source #${sourceIndex}`}</span>
                                                  </button>
                                                );
                                              });
                                            };

                                            return <p>{React.Children.map(children, renderWithCitations)}</p>;
                                          }
                                        }}
                                      >
                                         {msg.content}
                                      </ReactMarkdown>

                                      {/* Validated Evidence Provenance Bar */}
                                      {msg.citations && msg.citations.valid && msg.citations.valid.length > 0 && (
                                        <div className="mt-3 pt-2.5 border-t border-slate-200/70 dark:border-slate-800 flex flex-wrap items-center gap-1.5">
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
                            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-md animate-pulse">
                              <CliPadLogo size={18} color="#ffffff" />
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
                
                {/* Chat Input */}
                <div className="p-4 bg-white dark:bg-card border-t border-slate-100 dark:border-border shrink-0">
                   <form onSubmit={handleFollowUp} className="relative flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-border rounded-xl px-2 py-1.5 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all shadow-xs">
                      <input
                        value={followUpInput}
                        onChange={e => setFollowUpInput(e.target.value)}
                        placeholder="Ask a follow-up question..."
                        className="flex-1 bg-transparent border-none outline-none ring-0 text-sm px-3 py-2 text-slate-900 dark:text-foreground placeholder:text-slate-400 focus:ring-0"
                      />
                      <button
                        type="submit"
                        disabled={!followUpInput.trim() || isSynthesizing}
                        className="p-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-40 transition-colors shrink-0 shadow-xs"
                      >
                         {isSynthesizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
                      </button>
                   </form>
                   <p className="text-center text-[10px] text-slate-400 font-medium mt-2">
                      Orbit AI synthesizes across live organizational memory and documents. Verify critical items directly with sources.
                   </p>
                </div>

             </div>

              {/* RIGHT SIDE: SIDEBAR CATEGORY FILTERS & SEARCH RESULTS */}
              {/* Category filters are PERMANENTLY accessible on the right side. The results list automatically opens when results exist, closes when none. */}
              <div className="col-span-1 lg:col-span-5 xl:col-span-4 flex flex-col h-full overflow-hidden bg-white dark:bg-card border border-slate-200 dark:border-border rounded-2xl shadow-xs p-4 animate-in fade-in duration-300">
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
                           <div className="text-[11px] text-slate-600 dark:text-muted-foreground max-h-20 overflow-y-auto pr-1">
                             {selectedResult.snippet || 'No preview available.'}
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
    </div>
  );
}

