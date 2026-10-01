import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Search, Sparkles, FileText, CheckCircle, MessageSquare, Calendar, Video,
  Loader2, X, ShieldAlert, AlertTriangle, ArrowRight, ExternalLink, Zap, Lock,
  Command, Bot, CornerDownLeft, Filter, Check, Layers, ChevronRight, Copy,
  CheckCheck, Folder, Clock, User, Users, Hash
} from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { generateText } from '@/lib/cloudflareAI';
import { buildOrgContext } from '@/lib/clipadIntelligence';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { isAdmin, isSpaceman } from '@/lib/constants';
import { useToast } from '@/components/ui/use-toast';
import ThinkingAccordion, { parseThinking } from '@/components/chat/ThinkingAccordion';

// ─── Type metadata ─────────────────────────────────────────────────────────────
const TYPE_META = {
  meeting:     { icon: Calendar,      label: 'Meeting',   color: 'text-blue-700 dark:text-blue-400',       bg: 'bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700/50',     route: (id) => `/meetings/${id}` },
  video:       { icon: Video,         label: 'Video',     color: 'text-purple-700 dark:text-purple-400',   bg: 'bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700/50', route: (id) => `/watch/${id}` },
  doc:         { icon: FileText,      label: 'Doc',       color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700/50', route: (id, spaceId) => spaceId ? `/spaces/${spaceId}?tab=docs&docId=${id}` : null },
  task:        { icon: CheckCircle,   label: 'Task',      color: 'text-amber-700 dark:text-amber-400',     bg: 'bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/50',   route: (id, spaceId) => spaceId ? `/spaces/${spaceId}?tab=tasks&taskId=${id}` : null },
  message:     { icon: MessageSquare, label: 'Chat',      color: 'text-indigo-700 dark:text-indigo-400',   bg: 'bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700/50', route: (id, spaceId) => spaceId ? `/spaces/${spaceId}?tab=chat` : null },
  decision:    { icon: ShieldAlert,   label: 'Decision',  color: 'text-rose-700 dark:text-rose-400',       bg: 'bg-rose-100 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-700/50',     route: (id, spaceId) => spaceId ? `/spaces/${spaceId}?tab=decisions` : null },
  blocker:     { icon: AlertTriangle, label: 'Blocker',   color: 'text-orange-700 dark:text-orange-400',   bg: 'bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700/50', route: (id, spaceId) => spaceId ? `/spaces/${spaceId}?tab=overview` : null },
  standup:     { icon: Zap,           label: 'Standup',   color: 'text-teal-700 dark:text-teal-400',       bg: 'bg-teal-100 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-700/50',     route: (id, spaceId) => spaceId ? `/spaces/${spaceId}?tab=standup` : null },
  integration: { icon: ExternalLink,  label: 'Imported',  color: 'text-slate-700 dark:text-slate-400',     bg: 'bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700',   route: () => `/integrations` },
  person:      { icon: User,          label: 'Person',    color: 'text-violet-700 dark:text-violet-400',   bg: 'bg-violet-100 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-700/50', route: () => null },
};

const FILTER_TABS = [
  { id: 'all',      label: 'All',       icon: Layers },
  { id: 'doc',      label: 'Docs',      icon: FileText },
  { id: 'task',     label: 'Tasks',     icon: CheckCircle },
  { id: 'meeting',  label: 'Meetings',  icon: Calendar },
  { id: 'decision', label: 'Decisions', icon: ShieldAlert },
  { id: 'message',  label: 'Chats',     icon: MessageSquare },
  { id: 'people',   label: 'People',    icon: User },
];

const FILTER_TYPE_MAP = {
  all:      null,
  doc:      ['doc', 'integration'],
  task:     ['task', 'blocker', 'standup'],
  meeting:  ['meeting', 'video'],
  decision: ['decision', 'blocker'],
  message:  ['message'],
  people:   ['person'],
};

const matchesFilter = (itemType, filterId) => {
  if (!filterId || filterId === 'all') return true;
  const allowed = FILTER_TYPE_MAP[filterId];
  return allowed ? allowed.includes(itemType) : itemType === filterId;
};

// ─── Smart relevance scoring ─────────────────────────────────────────────────
function scoreResult(result, query) {
  const q = query.toLowerCase();
  const label = (result.label || '').toLowerCase();
  const snippet = (result.snippet || '').toLowerCase();
  let score = 0;
  // Exact title match = highest
  if (label === q) score += 100;
  // Title starts with query
  else if (label.startsWith(q)) score += 60;
  // Title contains query
  else if (label.includes(q)) score += 40;
  // Content contains query
  else if (snippet.includes(q)) score += 15;
  // Recency boost: results have created_at, newer = higher score
  if (result.created_at) {
    const ageDays = (Date.now() - new Date(result.created_at).getTime()) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 20 - ageDays * 0.5); // decay over 40 days
  }
  // Boost people cards to top when they match
  if (result.type === 'person') score += 80;
  return score;
}

// ─── Module-level cache for space ID lookups (60s TTL) ──────────────────────
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

// ─── People search ─────────────────────────────────────────────────────────
async function searchPeople(query, companyId) {
  const term = `%${query}%`;
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, department, avatar_url')
    .eq('company_id', companyId)
    .or(`full_name.ilike.${term},email.ilike.${term}`)
    .limit(5);
  return (data || []).map(p => ({
    type: 'person',
    id: p.id,
    space_id: null,
    label: p.full_name || p.email,
    snippet: [p.role, p.department].filter(Boolean).join(' · ') || p.email,
    email: p.email,
    avatar_url: p.avatar_url,
    department: p.department,
  }));
}

// ─── Suggestion config ───────────────────────────────────────────────────────
const DEFAULT_SUGGESTIONS = [
  { key: '1', text: 'What decisions were made last week?',   type: 'decision', icon: ShieldAlert,   color: 'text-rose-700 dark:text-rose-400',    bg: 'bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60' },
  { key: '2', text: 'Show me overdue tasks across spaces',   type: 'task',     icon: CheckCircle,   color: 'text-amber-700 dark:text-amber-400',  bg: 'bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60' },
  { key: '3', text: 'Find recent meetings about pricing',    type: 'meeting',  icon: Calendar,      color: 'text-blue-700 dark:text-blue-400',    bg: 'bg-blue-100 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60' },
  { key: '4', text: 'Any active blockers in engineering?',   type: 'blocker',  icon: AlertTriangle, color: 'text-orange-700 dark:text-orange-400',bg: 'bg-orange-100 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800/60' },
  { key: '5', text: 'What videos were recorded this month?', type: 'video',    icon: Video,         color: 'text-purple-700 dark:text-purple-400',bg: 'bg-purple-100 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60' },
  { key: '6', text: 'Summarize key updates from standups',   type: 'standup',  icon: Zap,           color: 'text-teal-700 dark:text-teal-400',    bg: 'bg-teal-100 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60' },
];

// ─── Highlight matched text ──────────────────────────────────────────────────
function Highlight({ text, query }) {
  if (!text || !query) return <span>{text}</span>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 dark:bg-yellow-800/60 text-inherit rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </span>
  );
}

// ─── Person activity card ─────────────────────────────────────────────────────
function PersonCard({ person, navigate, setIsOpen }) {
  const [activity, setActivity] = useState(null);
  useEffect(() => {
    async function load() {
      const [meetings, tasks, standups] = await Promise.all([
        supabase.from('clipad_meeting_records').select('id, title').ilike('attendees_json', `%${person.email}%`).limit(3).catch(() => ({ data: [] })),
        supabase.from('clipad_action_items').select('id, title, status').eq('assignee_id', person.id).order('created_at', { ascending: false }).limit(3).catch(() => ({ data: [] })),
        supabase.from('clipad_standups').select('id, today, created_at').eq('user_id', person.id).order('created_at', { ascending: false }).limit(2).catch(() => ({ data: [] })),
      ]);
      setActivity({
        meetings: meetings.data || [],
        tasks: tasks.data || [],
        standups: standups.data || [],
      });
    }
    load();
  }, [person.id, person.email]);

  return (
    <div className="mb-4 p-4 rounded-2xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/50">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400 font-bold text-sm shrink-0">
          {person.label?.charAt(0).toUpperCase() || '?'}
        </div>
        <div>
          <div className="font-bold text-sm text-slate-900 dark:text-white">{person.label}</div>
          <div className="text-[11px] text-slate-500">{person.snippet}</div>
        </div>
        <span className="ml-auto text-[10px] font-bold text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/50 px-2 py-0.5 rounded-full border border-violet-200 dark:border-violet-700">Person</span>
      </div>
      {!activity && <div className="text-[11px] text-slate-400 animate-pulse">Loading activity…</div>}
      {activity && (
        <div className="grid grid-cols-3 gap-2 text-[11px]">
          <div>
            <div className="font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Meetings</div>
            {activity.meetings.length === 0 ? <div className="text-slate-400">None found</div> : activity.meetings.map(m => <div key={m.id} className="text-slate-700 dark:text-slate-300 truncate">{m.title}</div>)}
          </div>
          <div>
            <div className="font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Tasks</div>
            {activity.tasks.length === 0 ? <div className="text-slate-400">None found</div> : activity.tasks.map(t => <div key={t.id} className="text-slate-700 dark:text-slate-300 truncate">{t.title}</div>)}
          </div>
          <div>
            <div className="font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Zap className="w-3 h-3" /> Standups</div>
            {activity.standups.length === 0 ? <div className="text-slate-400">None found</div> : activity.standups.map(s => <div key={s.id} className="text-slate-700 dark:text-slate-300 truncate">{s.today?.substring(0, 60)}</div>)}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GlobalSearch() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState(() => {
    try { return JSON.parse(localStorage.getItem('clipad_recent_searches')) || []; } catch { return []; }
  });
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiSources, setAiSources] = useState([]);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [lastQuery, setLastQuery] = useState('');
  const [lastAiQuery, setLastAiQuery] = useState('');
  const [copiedAnswer, setCopiedAnswer] = useState(false);
  const [spacesMap, setSpacesMap] = useState({});
  const [dynamicSuggestions, setDynamicSuggestions] = useState(DEFAULT_SUGGESTIONS);
  const [accessibleCount, setAccessibleCount] = useState(0);
  const [totalDocCount, setTotalDocCount] = useState(0);
  const [showAllResults, setShowAllResults] = useState(false);
  const [totalMatchCount, setTotalMatchCount] = useState(0);

  const inputRef = useRef(null);
  const overlayRef = useRef(null);
  const debounceRef = useRef(null);

  const handleResultClick = useCallback((res) => {
    const meta = TYPE_META[res.type];
    const route = meta?.route(res.id, res.space_id);
    if (route) { navigate(route); setIsOpen(false); }
  }, [navigate]);

  // ── Load space names + integration suggestions ─────────────────────────────
  useEffect(() => {
    if (!user?.company_id) return;
    supabase.from('clipad_spaces').select('id, name').eq('company_id', user.company_id).then(({ data }) => {
      if (data) { const map = {}; data.forEach(s => { map[s.id] = s.name; }); setSpacesMap(map); }
    });
    // Total doc count for scope badge
    supabase.from('clipad_docs').select('id', { count: 'exact', head: true })
      .then(({ count }) => { if (count) setTotalDocCount(count); }).catch(() => {});
    // Dynamic integration suggestions
    supabase.from('clipad_integrations').select('provider').eq('company_id', user.company_id).eq('status', 'active')
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        const activeProviders = data.map(d => d.provider);
        const newSuggestions = [...DEFAULT_SUGGESTIONS];
        if (activeProviders.includes('gmail') || activeProviders.includes('outlook'))
          newSuggestions.unshift({ key: 'dyn1', text: 'Find recent emails about invoices', type: 'integration', icon: FileText, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60' });
        if (activeProviders.includes('jira') || activeProviders.includes('linear'))
          newSuggestions.unshift({ key: 'dyn2', text: 'Show me my active Jira tickets', type: 'integration', icon: CheckCircle, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60' });
        if (activeProviders.includes('slack') || activeProviders.includes('ms_teams'))
          newSuggestions.unshift({ key: 'dyn3', text: 'Summarize recent Slack messages', type: 'message', icon: MessageSquare, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60' });
        const finalSuggestions = newSuggestions.slice(0, 6).map((item, i) => ({ ...item, key: (i + 1).toString() }));
        setDynamicSuggestions(finalSuggestions);
      });
  }, [user]);

  // ── Global Keyboard (⌘K, Esc, arrows) ────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); e.stopPropagation(); setIsOpen(v => !v); return;
      }
      if (!isOpen) return;
      if (e.key === 'Escape') { e.preventDefault(); setIsOpen(false); }
      else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex(i => { const n = Math.min(i + 1, results.filter(r => matchesFilter(r.type, selectedFilter)).length - 1); document.getElementById(`search-item-${n}`)?.scrollIntoView({ block: 'nearest' }); return n; });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex(i => { const p = Math.max(i - 1, -1); document.getElementById(`search-item-${p}`)?.scrollIntoView({ block: 'nearest' }); return p; });
      } else if (e.key === 'Tab') {
        // Tab cycles through filter tabs
        e.preventDefault();
        setSelectedFilter(prev => {
          const ids = FILTER_TABS.map(t => t.id);
          const idx = ids.indexOf(prev);
          return ids[(idx + 1) % ids.length];
        });
      } else if (e.key === 'Enter') {
        const filtered = results.filter(r => matchesFilter(r.type, selectedFilter));
        if (focusedIndex >= 0 && filtered[focusedIndex]) { e.preventDefault(); handleResultClick(filtered[focusedIndex]); }
      }
    };
    const handleCustomOpen = () => setIsOpen(true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('open-global-search', handleCustomOpen);
    return () => { document.removeEventListener('keydown', onKey, true); window.removeEventListener('open-global-search', handleCustomOpen); };
  }, [isOpen, results, selectedFilter, focusedIndex, handleResultClick]);

  useEffect(() => {
    if (isOpen) { setTimeout(() => inputRef.current?.focus(), 100); }
    else { setQuery(''); setResults([]); setAiAnswer(''); setAiSources([]); setHasSearched(false); setFocusedIndex(-1); setSelectedFilter('all'); setCopiedAnswer(false); setShowAllResults(false); setTotalMatchCount(0); setLastQuery(''); setLastAiQuery(''); }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // ── Core DB search (no AI) — called on debounce ────────────────────────────
  const runDbSearch = useCallback(async (q, limit = 6) => {
    if (!q.trim() || !user?.company_id) return [];
    const accessibleSpaceIds = await fetchAccessibleSpaceIds(user);
    const spaceIdArr = Array.from(accessibleSpaceIds);
    setAccessibleCount(spaceIdArr.length);
    const term = `%${q}%`;
    const spaceIdsStr = spaceIdArr.length > 0 ? spaceIdArr.join(',') : '00000000-0000-0000-0000-000000000000';
    const cid = user.company_id;
    // Wrap every query safely so one failing query never breaks the whole search
    const safeQuery = (promise) => Promise.resolve(promise).then(res => res.data || []).catch(err => {
      console.warn('[GlobalSearch] query error:', err);
      return [];
    });

    const [docs, tasks, messages, meetings, decisions, videos, blockers, standups, integrations, people] = await Promise.all([
      // Docs: space filter
      safeQuery(
        spaceIdArr.length > 0
          ? supabase.from('clipad_docs').select('id, title, content, space_id, created_at').in('space_id', spaceIdArr).ilike('title', term).limit(limit)
          : []
      ),
      // Tasks: space filter
      safeQuery(
        spaceIdArr.length > 0
          ? supabase.from('clipad_action_items').select('id, title, context, space_id, created_at').in('space_id', spaceIdArr).ilike('title', term).limit(limit)
          : []
      ),
      // Messages: full content match
      safeQuery(
        spaceIdArr.length > 0
          ? supabase.from('clipad_messages').select('id, content, space_id, created_at').in('space_id', spaceIdArr).ilike('content', term).limit(limit)
          : []
      ),
      // Meetings: space filter
      safeQuery(
        spaceIdArr.length > 0
          ? supabase.from('clipad_meeting_records').select('id, title, ai_summary, space_id, created_at').in('space_id', spaceIdArr).ilike('title', term).limit(limit)
          : []
      ),
      // Decisions: decision text
      safeQuery(
        spaceIdArr.length > 0
          ? supabase.from('clipad_decisions').select('id, decision_text, team_space_id, created_at').in('team_space_id', spaceIdArr).ilike('decision_text', term).limit(limit)
          : []
      ),
      // Videos: space filter + company_id
      safeQuery(
        spaceIdArr.length > 0
          ? supabase.from('clipad_videos').select('id, title, ai_summary, space_id, created_at').in('space_id', spaceIdArr).eq('company_id', cid).ilike('title', term).limit(limit)
          : []
      ),
      // Blockers
      safeQuery(
        spaceIdArr.length > 0
          ? supabase.from('clipad_blockers').select('id, description, team_space_id, detected_at').in('team_space_id', spaceIdArr).ilike('description', term).limit(limit)
          : []
      ),
      // Standups: space filter
      safeQuery(
        spaceIdArr.length > 0
          ? supabase.from('clipad_standups').select('id, user_name, today, yesterday, blockers, space_id, created_at').in('space_id', spaceIdArr).ilike('today', term).limit(limit)
          : []
      ),
      // Integration knowledge: title + full content
      safeQuery(
        supabase.from('clipad_imported_knowledge').select('id, title, content, provider, content_type, updated_at').eq('company_id', cid).ilike('title', term).limit(limit)
      ),
      // People search
      Promise.resolve(searchPeople(q, cid)).catch(() => []),
    ]);

    const raw = [
      ...(people || []),
      ...(docs || []).map(d => ({ type: 'doc', id: d.id, space_id: d.space_id, label: d.title, snippet: d.content?.substring(0, 200), created_at: d.created_at })),
      ...(tasks || []).map(t => ({ type: 'task', id: t.id, space_id: t.space_id, label: t.title, snippet: t.context?.substring(0, 200), created_at: t.created_at })),
      ...(messages || []).map(m => ({ type: 'message', id: m.id, space_id: m.space_id, label: 'Chat Message', snippet: m.content?.substring(0, 200), created_at: m.created_at })),
      ...(meetings || []).map(m => ({ type: 'meeting', id: m.id, space_id: m.space_id, label: m.title || 'Team Meeting', snippet: m.ai_summary?.substring(0, 200), created_at: m.created_at })),
      ...(decisions || []).map(d => ({ type: 'decision', id: d.id, space_id: d.team_space_id, label: 'Decision', snippet: d.decision_text?.substring(0, 200), created_at: d.created_at })),
      ...(videos || []).map(v => ({ type: 'video', id: v.id, space_id: v.space_id, label: v.title || 'Video', snippet: v.ai_summary?.substring(0, 200), created_at: v.created_at })),
      ...(blockers || []).map(b => ({ type: 'blocker', id: b.id, space_id: b.team_space_id, label: 'Blocker', snippet: b.description?.substring(0, 200), created_at: b.detected_at })),
      ...(standups || []).map(s => ({ type: 'standup', id: s.id, space_id: s.space_id, label: `Standup — ${s.user_name || 'Team member'} (${s.created_at?.slice(0, 10)})`, snippet: s.today?.substring(0, 200), created_at: s.created_at })),
      ...(integrations || []).map(i => ({ type: 'integration', id: i.id, space_id: null, label: `[${i.provider}] ${i.title}`, snippet: i.content?.substring(0, 200), created_at: i.updated_at })),
    ];

    // Smart ranking: sort by relevance score descending
    return raw.sort((a, b) => scoreResult(b, q) - scoreResult(a, q));
  }, [user]);

  // ── Live debounced search (fires 300ms after typing) ──────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const q = query.trim();
    if (!q) { setResults([]); setHasSearched(false); setAiAnswer(''); return; }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (q === lastQuery) return;
      setLastQuery(q);
      setIsSearching(true);
      setFocusedIndex(-1);
      setShowAllResults(false);
      try {
        const formatted = await runDbSearch(q, 6);
        setResults(formatted);
        setHasSearched(true);
        setTotalMatchCount(formatted.length);
        // Background wide-count
        runDbSearch(q, 50).then(all => setTotalMatchCount(all.length)).catch(() => {});
      } catch (err) {
        console.error('[GlobalSearch live]', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query, isOpen, lastQuery, runDbSearch]);

  // ── AI Synthesis — only fires on explicit Enter ────────────────────────────
  const handleSearch = useCallback(async (forcedQuery, aiOnly = false) => {
    const q = (forcedQuery || query).trim();
    if (!q) return;

    if (q) {
      setRecentSearches(prev => {
        const ns = [q, ...prev.filter(s => s !== q)].slice(0, 3);
        localStorage.setItem('clipad_recent_searches', JSON.stringify(ns));
        return ns;
      });
    }

    // Don't re-run AI if already synthesizing for this query
    if (q === lastAiQuery && (aiAnswer || isSynthesizing)) return;
    setLastAiQuery(q);

    // If query changed from live search, make sure DB results are current
    if (!aiOnly && q !== lastQuery) {
      setIsSearching(true);
      try {
        const fresh = await runDbSearch(q, 6);
        setResults(fresh);
        setHasSearched(true);
      } catch (_) {}
      setIsSearching(false);
    }

    // Start AI synthesis
    setIsSynthesizing(true);
    setAiAnswer('');
    setAiSources([]);

    try {
      const accessibleSpaceIds = await fetchAccessibleSpaceIds(user);
      const spaceIdArr = Array.from(accessibleSpaceIds);
      const userRole = isAdmin(user) ? 'Company Admin' : isSpaceman(user) ? 'Spaceman (Space Admin)' : 'Member';

      const [orgContextResult] = await Promise.all([
        buildOrgContext({ limit: 25, companyId: user.company_id, userId: user.id, userRole: user?.role || 'member' })
          .catch(e => { console.warn('[GlobalSearch] org context:', e.message); return { contextText: '' }; }),
      ]);

      const currentResults = results.length > 0 ? results : await runDbSearch(q, 6).catch(() => []);
      const fullOrgContext = orgContextResult?.contextText?.length > 50 ? orgContextResult.contextText : '';

      const keywordResultsContext = currentResults.length > 0
        ? `\n\nKEYWORD SEARCH RESULTS (${currentResults.length} records matched "${q}"):\n` +
          currentResults.map(r => `[${r.type.toUpperCase()} ID:${r.id}] ${r.label}: ${r.snippet || ''}`).join('\n')
        : `\n\nKEYWORD SEARCH: No records matched "${q}" directly — check org context.`;

      const now = new Date();
      const timeContext = `CURRENT DATE & TIME: ${now.toLocaleDateString()} ${now.toLocaleTimeString()} (${Intl.DateTimeFormat().resolvedOptions().timeZone})`;
      const userDepartment = user?.department ? ` in the ${user.department} department` : '';
      const userIndustry = user?.company_industry ? ` in the ${user.company_industry} industry` : '';

      let streamingAnswer = '';
      await generateText([
        {
          role: 'system',
          content: `You are Orbit AI, an enterprise intelligence assistant.

CRITICAL CONTEXT:
- ${timeContext}.
- Responding to "${user?.full_name || 'a user'}".
- Role: "${userRole}"${userDepartment}${userIndustry}.
- Access scoped strictly to ${spaceIdArr.length} authorized spaces.

ORGANIZATIONAL CONTEXT:
${fullOrgContext ? `FULL ORG CONTEXT:\n${fullOrgContext}` : ''}
${keywordResultsContext}

Instructions:
Be clear, direct, and concise (2-4 sentences). Focus on actionable enterprise answers.
DO NOT use slow internal reasoning or <think> tags. Keep responses instant.
If the requested data is found, state exact details, assignees, or dates.
DO NOT mention internal IDs (e.g. M-123, I-456, or UUIDs) in your text response. Use titles instead.
After your answer, list source IDs as JSON: SOURCES:[{"id":"<id>","type":"<type>"}].`,
        },
        { role: 'user', content: `Query: "${q}"` },
      ], (accumulated) => {
        const clean = accumulated
          .replace(/<(think|thought)>[\s\S]*?<\/\1>/gi, '')
          .replace(/<(think|thought)>[\s\S]*$/gi, '')
          .replace(/<\/(think|thought)>/gi, '');
        setAiAnswer(clean.replace(/SOURCES:.*$/s, '').trim());
        streamingAnswer = accumulated;
      }, { fast: true });

      const sourcesMatch = (streamingAnswer || '').match(/SOURCES:\s*(\[.*?\])/s);
      let sources = [];
      if (sourcesMatch) { try { sources = JSON.parse(sourcesMatch[1]); } catch { /* ignore */ } }
      setAiSources(sources.map(s => currentResults.find(r => r.id === s.id)).filter(Boolean));
    } catch (err) {
      console.error('[GlobalSearch AI]', err);
    } finally {
      setIsSynthesizing(false);
    }
  }, [query, user, lastAiQuery, aiAnswer, isSynthesizing, results, runDbSearch]);

  // ── Load More ─────────────────────────────────────────────────────────────
  const handleLoadMore = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setIsSearching(true);
    try {
      const all = await runDbSearch(q, 50);
      setResults(all);
      setTotalMatchCount(all.length);
      setShowAllResults(true);
    } catch (err) { console.error('[GlobalSearch] loadMore:', err); }
    finally { setIsSearching(false); }
  }, [query, runDbSearch]);

  const filteredResults = useMemo(() => results.filter(r => matchesFilter(r.type, selectedFilter)), [results, selectedFilter]);
  const peopleResults = useMemo(() => results.filter(r => r.type === 'person'), [results]);

  // ── Keyboard handler inside input ────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (!hasSearched && !query && ['1','2','3','4','5','6'].includes(e.key)) {
      const idx = parseInt(e.key, 10) - 1;
      if (dynamicSuggestions[idx]) { e.preventDefault(); setQuery(dynamicSuggestions[idx].text); handleSearch(dynamicSuggestions[idx].text); return; }
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIndex >= 0 && filteredResults[focusedIndex]) { handleResultClick(filteredResults[focusedIndex]); }
      else { handleSearch(); } // Enter triggers AI synthesis
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedIndex(i => Math.min(i + 1, filteredResults.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedIndex(i => Math.max(i - 1, -1)); }
  };

  const handleCopyAnswer = () => {
    if (!aiAnswer) return;
    navigator.clipboard.writeText(aiAnswer);
    setCopiedAnswer(true);
    toast({ title: 'Copied', description: 'AI answer copied to clipboard.' });
    setTimeout(() => setCopiedAnswer(false), 2000);
  };

  const getScopeCount = (filterId) => {
    if (filterId === 'all') return results.length;
    return results.filter(r => matchesFilter(r.type, filterId)).length;
  };

  if (!isOpen) {
    return (
      <>
        <div className="hidden md:block w-full max-w-sm rounded-full p-[1.5px] bg-gradient-to-r from-blue-500 to-pink-500 hover:shadow-md transition-shadow cursor-text group">
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center h-10 w-full bg-[#006065] rounded-full px-4 text-white/60 hover:text-white transition-colors"
          >
            <Search className="w-[18px] h-[18px] shrink-0 text-white/60" />
            <div className="w-[1px] h-5 bg-white/20 mx-3 shrink-0" />
            <span className="text-[14px] font-medium flex-1 text-left whitespace-nowrap overflow-hidden text-ellipsis tracking-tight text-white/50 group-hover:text-white/70">
              Search people, docs, tasks…
            </span>
            <kbd className="text-[10px] font-mono bg-white/10 px-1.5 py-0.5 rounded text-white/50 border border-white/15 shrink-0 hidden lg:block tracking-wider font-bold shadow-sm">⌘K</kbd>
          </button>
        </div>
        <button onClick={() => setIsOpen(true)} className="md:hidden p-2 text-white/60 hover:text-white transition-colors active:scale-95 rounded-lg hover:bg-white/10" title="Search">
          <Search className="w-5 h-5" />
        </button>
      </>
    );
  }

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[6vh] sm:pt-[9vh] px-3 sm:px-4 pb-6 bg-[#006065]/80 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === overlayRef.current) setIsOpen(false); }}
    >
      <style>{`
        @keyframes spotlightFadeIn {
          0% { opacity: 0; transform: scale(0.98) translateY(-8px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      <div className="w-full max-w-[720px] flex flex-col relative" style={{ animation: 'spotlightFadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)' }}>

        {/* Gradient Search Input Box */}
        <div className="bg-gradient-to-r from-purple-500 via-pink-400 to-amber-500 p-[1.5px] rounded-xl shadow-lg relative z-20">
          <div className="bg-[#005055] rounded-[10px] flex items-center px-4 py-3 h-[52px] gap-3">
            {isSearching
              ? <Loader2 className="w-5 h-5 text-white/60 shrink-0 animate-spin" />
              : <Search className="w-5 h-5 text-white/60 shrink-0" />
            }
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search people, docs, tasks, meetings… (Enter for AI)"
              className="flex-1 bg-transparent text-white text-[16px] font-medium placeholder:text-white/40 min-w-0 border-0 outline-none ring-0 shadow-none focus:border-0 focus:outline-none focus:ring-0 focus:shadow-none"
              style={{ border: 'none', outline: 'none', boxShadow: 'none', background: 'transparent' }}
            />
            {/* AI-only trigger hint */}
            {query && !isSynthesizing && (
              <button
                onClick={() => handleSearch(undefined, false)}
                title="Press Enter to ask AI"
                className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-[#fad503] bg-[#00beac]/10 px-2 py-1 rounded-lg border border-[#00beac]/30 hover:bg-[#00beac]/20 transition-colors"
              >
                <Sparkles className="w-3 h-3" /> Ask AI
              </button>
            )}
            <button
              onClick={() => { setIsOpen(false); navigate(`/search?q=${encodeURIComponent(query)}`); }}
              title="Expand to Full-Page Search Hub"
              className="shrink-0 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            {isSynthesizing && (
              <span className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-[#fad503] bg-[#00beac]/10 px-2 py-1 rounded-lg border border-[#00beac]/30 animate-pulse">
                <Sparkles className="w-3 h-3 animate-spin" /> AI thinking…
              </span>
            )}
            {query || isSearching ? (
              <button onClick={() => { setQuery(''); setResults([]); setAiAnswer(''); setHasSearched(false); setLastQuery(''); setLastAiQuery(''); inputRef.current?.focus(); }} className="text-white/50 hover:text-white shrink-0">
                <X className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={() => setIsOpen(false)} className="text-white/50 hover:text-white shrink-0">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Results Panel */}
        <div className="bg-[#006065] rounded-b-xl shadow-xl border-x border-b border-white/10 mt-[-10px] pt-[10px] relative z-10 flex flex-col min-h-[300px]">

          {/* Filters Row + Scope Badge */}
          <div className="px-6 py-3 border-b border-white/10 flex items-center gap-3 flex-wrap">
            <div className="flex flex-wrap items-center gap-1.5 flex-1">
              {FILTER_TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedFilter(tab.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    selectedFilter === tab.id
                      ? 'bg-[#00beac] text-[#00beac] font-bold'
                      : 'bg-white/10 border border-white/15 text-white/70 hover:bg-white/20 hover:text-white'
                  }`}
                >
                  <tab.icon className="w-3 h-3" />
                  {tab.label}
                  {hasSearched && getScopeCount(tab.id) > 0 && (
                    <span className={`ml-0.5 text-[10px] font-bold ${selectedFilter === tab.id ? 'text-white/80' : 'text-slate-400'}`}>
                      {getScopeCount(tab.id)}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {/* Scope indicator */}
            {hasSearched && (
              <div className="shrink-0 flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                <Hash className="w-3 h-3" />
                {accessibleCount} spaces · {totalMatchCount} matches
              </div>
            )}
            {!hasSearched && totalDocCount > 0 && (
              <div className="shrink-0 flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                <Hash className="w-3 h-3" />
                {accessibleCount} spaces · {totalDocCount}+ docs indexed
              </div>
            )}
          </div>

          <div className="flex-1 max-h-[48vh] overflow-y-auto">
            {/* Zero State */}
            {!hasSearched && query.length === 0 && (
              <div className="pb-4">
                <div className="px-6 py-4">
                  {recentSearches.length > 0 && (
                    <div className="mb-5">
                      <h4 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2">Recent</h4>
                      <div className="space-y-1">
                        {recentSearches.map((search, idx) => (
                          <button key={`recent-${idx}`} onClick={() => { setQuery(search); handleSearch(search); }}
                            className="w-full text-left flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                            </div>
                            <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">{search}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Suggested AI Queries</h4>
                    <span className="text-[11px] text-slate-400 hidden sm:inline">Press 1-6 or click</span>
                  </div>
                  <div className="space-y-1.5">
                    {dynamicSuggestions.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button key={item.key} onClick={() => { setQuery(item.text); handleSearch(item.text); }}
                          className="w-full text-left flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                          <div className={`w-7 h-7 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
                            <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                          </div>
                          <div className="flex-1 flex items-center justify-between">
                            <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">{item.text}</span>
                            <kbd className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">{item.key}</kbd>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Results (shown as soon as hasSearched) */}
            {(hasSearched || query.length > 0) && (
              <div className="px-6 py-4">

                {/* AI Answer */}
                {isSynthesizing && !aiAnswer && (
                  <div className="space-y-2 py-3 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-3.5 h-3.5 text-violet-500 animate-pulse" />
                      <span className="text-[11px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">AI is synthesizing…</span>
                    </div>
                    <div className="h-3.5 bg-slate-100 dark:bg-slate-800 rounded w-full animate-pulse" />
                    <div className="h-3.5 bg-slate-100 dark:bg-slate-800 rounded w-4/5 animate-pulse" />
                    <div className="h-3.5 bg-slate-100 dark:bg-slate-800 rounded w-5/6 animate-pulse" />
                  </div>
                )}
                {aiAnswer && (() => {
                  const { thinking, content: cleanAnswer, isThinkingDone } = parseThinking(aiAnswer);
                  return (
                    <div className="mb-5 p-4 rounded-2xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                        <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">AI Answer</span>
                        {filteredResults.filter(r => r.type !== 'person').length === 0 && (
                          <span className="text-[10px] text-slate-400 font-medium">— answering from knowledge base</span>
                        )}
                        <button onClick={handleCopyAnswer} className="ml-auto text-slate-400 hover:text-slate-600 transition-colors" title="Copy answer">
                          {copiedAnswer ? <CheckCheck className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      {thinking && <ThinkingAccordion thinking={thinking} isThinkingDone={isThinkingDone} />}
                      {cleanAnswer && <p className="text-[13px] text-slate-800 dark:text-slate-200 leading-relaxed">{cleanAnswer}</p>}
                    </div>
                  );
                })()}

                {/* People cards (always shown first when found) */}
                {peopleResults.length > 0 && selectedFilter === 'all' && (
                  peopleResults.map(person => (
                    <PersonCard key={person.id} person={person} navigate={navigate} setIsOpen={setIsOpen} />
                  ))
                )}

                {/* Standard results list */}
                {filteredResults.filter(r => r.type !== 'person' || selectedFilter === 'people').length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Results</h4>
                      {hasSearched && (
                        <span className="text-[10px] text-slate-400">
                          {showAllResults ? `${filteredResults.length} results` : `Top ${filteredResults.filter(r=>r.type!=='person').length} of ${totalMatchCount > filteredResults.length ? `${totalMatchCount}+` : filteredResults.length}`}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      {filteredResults.filter(r => r.type !== 'person').map((res, i) => {
                        const meta = TYPE_META[res.type] || {};
                        const Icon = meta.icon || FileText;
                        const isFocused = focusedIndex === i;
                        const spaceName = res.space_id ? spacesMap[res.space_id] : null;
                        return (
                          <button
                            key={`${res.type}-${res.id}`}
                            id={`search-item-${i}`}
                            onClick={() => handleResultClick(res)}
                            className={`w-full text-left flex items-start gap-3 p-3 rounded-xl transition-all ${
                              isFocused
                                ? 'bg-slate-100 dark:bg-slate-800 ring-2 ring-primary/40'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-lg ${meta.bg || 'bg-slate-100'} flex items-center justify-center shrink-0 mt-0.5`}>
                              <Icon className={`w-4 h-4 ${meta.color || 'text-slate-600'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] font-bold text-slate-900 dark:text-white truncate">
                                  <Highlight text={res.label} query={query} />
                                </span>
                                <span className="text-[10px] text-slate-400 shrink-0">{meta.label}</span>
                                {spaceName && <span className="text-[10px] text-slate-400 shrink-0 hidden sm:inline">· {spaceName}</span>}
                              </div>
                              {/* Expanded snippet: 2 lines when focused, 1 line otherwise */}
                              {res.snippet && (
                                <p className={`text-[12px] text-slate-500 mt-0.5 ${isFocused ? 'line-clamp-3' : 'truncate'}`}>
                                  <Highlight text={res.snippet} query={query} />
                                </p>
                              )}
                              {/* Expanded source detail when focused */}
                              {isFocused && res.created_at && (
                                <span className="text-[10px] text-slate-400 mt-1 block">
                                  {new Date(res.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                              )}
                            </div>
                            {isFocused && (
                              <div className="shrink-0 self-center">
                                <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 shadow-sm">↵</kbd>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* View All button */}
                    {!showAllResults && totalMatchCount > filteredResults.filter(r=>r.type!=='person').length && (
                      <button
                        onClick={handleLoadMore}
                        disabled={isSearching}
                        className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all text-[12px] font-semibold group"
                      >
                        {isSearching ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…</> : <><ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" /> View all {totalMatchCount}+ results for "{query}"</>}
                      </button>
                    )}
                    {showAllResults && <div className="mt-3 text-center text-[11px] text-slate-400">Showing all {filteredResults.length} results</div>}
                  </div>
                )}

                {/* Empty state */}
                {hasSearched && filteredResults.length === 0 && !aiAnswer && !isSynthesizing && (
                  <div className="text-center py-10">
                    <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                      <Search className="w-5 h-5 text-slate-400" />
                    </div>
                    <p className="font-semibold text-slate-700 dark:text-slate-300 text-[13px]">No matches found for "{query}"</p>
                    <p className="text-[12px] text-slate-400 mt-1">Try different keywords, or press <kbd className="px-1 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono">Enter</kbd> to ask AI.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-slate-50/80 dark:bg-card border-t border-slate-100 dark:border-slate-800/60 px-6 py-3 flex items-center justify-between rounded-b-xl shrink-0 mt-auto">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <kbd className="w-5 h-5 flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-sans font-bold text-slate-600 shadow-sm">↓</kbd>
                <kbd className="w-5 h-5 flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-sans font-bold text-slate-600 shadow-sm">↑</kbd>
                <span className="text-[11px] text-slate-500 font-medium">Navigate</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 h-5 flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-sans font-bold text-slate-600 shadow-sm">Tab</kbd>
                <span className="text-[11px] text-slate-500 font-medium">Filter</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="w-6 h-5 flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-sans font-bold text-slate-600 shadow-sm">↵</kbd>
                <span className="text-[11px] text-slate-500 font-medium">AI + Open</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 h-5 flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-sans font-bold text-slate-600 shadow-sm">Esc</kbd>
              <span className="text-[11px] text-slate-500 font-medium">Close</span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
