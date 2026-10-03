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

// â”€â”€â”€ Type metadata â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TYPE_META = {
  meeting:     { icon: Calendar,      label: 'Meeting',   color: 'text-blue-700 dark:text-blue-400',       bg: 'bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700/50',     route: (id) => `/meetings/${id}` },
  video:       { icon: Video,         label: 'Video',     color: 'text-purple-700 dark:text-purple-400',   bg: 'bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700/50', route: (id) => `/watch/${id}` },
  doc:         { icon: FileText,      label: 'Doc',       color: 'text-[#004e52] dark:text-[#00beac]', bg: 'bg-[#006065]/20 dark:bg-[#004e52]/30 border border-emerald-200 dark:border-emerald-700/50', route: (id, spaceId) => spaceId ? `/spaces/${spaceId}?tab=docs&docId=${id}` : null },
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

// â”€â”€â”€ Smart relevance scoring â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Module-level cache for space ID lookups (60s TTL) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ People search â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    snippet: [p.role, p.department].filter(Boolean).join(' Â· ') || p.email,
    email: p.email,
    avatar_url: p.avatar_url,
    department: p.department,
  }));
}

// â”€â”€â”€ Suggestion config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const DEFAULT_SUGGESTIONS = [
  { key: '1', text: 'What decisions were made last week?',   type: 'decision', icon: ShieldAlert,   color: 'text-rose-700 dark:text-rose-400',    bg: 'bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60' },
  { key: '2', text: 'Show me overdue tasks across spaces',   type: 'task',     icon: CheckCircle,   color: 'text-amber-700 dark:text-amber-400',  bg: 'bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60' },
  { key: '3', text: 'Find recent meetings about pricing',    type: 'meeting',  icon: Calendar,      color: 'text-blue-700 dark:text-blue-400',    bg: 'bg-blue-100 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60' },
  { key: '4', text: 'Any active blockers in engineering?',   type: 'blocker',  icon: AlertTriangle, color: 'text-orange-700 dark:text-orange-400',bg: 'bg-orange-100 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800/60' },
  { key: '5', text: 'What videos were recorded this month?', type: 'video',    icon: Video,         color: 'text-purple-700 dark:text-purple-400',bg: 'bg-purple-100 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60' },
  { key: '6', text: 'Summarize key updates from standups',   type: 'standup',  icon: Zap,           color: 'text-teal-700 dark:text-teal-400',    bg: 'bg-teal-100 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60' },
];

// â”€â”€â”€ Highlight matched text â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Person activity card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      {!activity && <div className="text-[11px] text-slate-400 animate-pulse">Loading activityâ€¦</div>}
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

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Load space names + integration suggestions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
          newSuggestions.unshift({ key: 'dyn3', text: 'Summarize recent Slack messages', type: 'message', icon: MessageSquare, color: 'text-[#006065] dark:text-[#00beac]', bg: 'bg-[#006065]/20 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60' });
        const finalSuggestions = newSuggestions.slice(0, 6).map((item, i) => ({ ...item, key: (i + 1).toString() }));
        setDynamicSuggestions(finalSuggestions);
      });
  }, [user]);

  // â”€â”€ Global Keyboard (âŒ˜K, Esc, arrows) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Core DB search (no AI) â€” called on debounce â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      ...(standups || []).map(s => ({ type: 'standup', id: s.id, space_id: s.space_id, label: `Standup â€” ${s.user_name || 'Team member'} (${s.created_at?.slice(0, 10)})`, snippet: s.today?.substring(0, 200), created_at: s.created_at })),
      ...(integrations || []).map(i => ({ type: 'integration', id: i.id, space_id: null, label: `[${i.provider}] ${i.title}`, snippet: i.content?.substring(0, 200), created_at: i.updated_at })),
    ];

    // Smart ranking: sort by relevance score descending
    return raw.sort((a, b) => scoreResult(b, q) - scoreResult(a, q));
  }, [user]);

  // â”€â”€ Live debounced search (fires 300ms after typing) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ AI Synthesis â€” only fires on explicit Enter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
        : `\n\nKEYWORD SEARCH: No records matched "${q}" directly â€” check org context.`;

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

  // â”€â”€ Load More â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Keyboard handler inside input â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
              Search people, docs, tasksâ€¦
            </span>
            <kbd className="text-[10px] font-mono bg-white/10 px-1.5 py-0.5 rounded text-white/50 border border-white/15 shrink-0 hidden lg:block tracking-wider font-bold shadow-sm">âŒ˜K</kbd>
          </button>
        </div>
        <button onClick={() => setIsOpen(true)} className="md:hidden p-2 text-white/60 hover:text-white transition-colors active:scale-95 rounded-lg hover:bg-white/10" title="Search">
          <Search className="w-5 h-5" />
        </button>
      </>
    );
  }

  
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh] px-4 font-sans text-slate-900 dark:text-slate-100">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm transition-opacity" 
        onClick={() => setIsOpen(false)}
      />

      <div className="relative w-full max-w-3xl flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Search Input Box */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 relative z-20 flex flex-col overflow-hidden">
          <div className="flex items-center px-4 py-3 h-[60px] gap-3">
            {isSearching
              ? <Loader2 className="w-5 h-5 text-indigo-500 shrink-0 animate-spin" />
              : <Search className="w-5 h-5 text-slate-400 shrink-0" />
            }
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search people, docs, tasks, meetings... (Enter for AI)"
              className="flex-1 bg-transparent text-slate-900 dark:text-white text-base font-medium placeholder:text-slate-400 min-w-0 border-0 outline-none ring-0 shadow-none focus:border-0 focus:outline-none focus:ring-0 focus:shadow-none p-0"
            />
            {/* AI-only trigger hint */}
            {query && !isSynthesizing && (
              <button
                onClick={() => handleSearch(undefined, false)}
                title="Press Enter to ask AI"
                className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1.5 rounded-md border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" /> Ask AI
              </button>
            )}
            <button
              onClick={() => { setIsOpen(false); navigate(`/search?q=${encodeURIComponent(query)}`); }}
              title="Expand to Full-Page Search Hub"
              className="shrink-0 p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            {isSynthesizing && (
              <span className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1.5 rounded-md border border-indigo-200 dark:border-indigo-800 animate-pulse">
                <Sparkles className="w-3.5 h-3.5 animate-spin" /> Thinking...
              </span>
            )}
            {query || isSearching ? (
              <button onClick={() => { setQuery(''); setResults([]); setAiAnswer(''); setHasSearched(false); setLastQuery(''); setLastAiQuery(''); inputRef.current?.focus(); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0 p-1">
                <X className="w-5 h-5" />
              </button>
            ) : (
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0 p-1">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Filters Row + Scope Badge */}
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
              {FILTER_TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedFilter(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                    selectedFilter === tab.id
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {hasSearched && getScopeCount(tab.id) > 0 && (
                    <span className={`ml-0.5 text-[10px] font-bold ${selectedFilter === tab.id ? 'text-indigo-500' : 'text-slate-400'}`}>
                      {getScopeCount(tab.id)}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {/* Scope indicator */}
            <div className="shrink-0 flex items-center gap-1 text-[10px] text-slate-400 font-medium whitespace-nowrap">
               <Hash className="w-3 h-3" />
               {hasSearched ? `${accessibleCount} spaces / ${totalMatchCount} matches` : `${accessibleCount} spaces / ${totalDocCount}+ docs`}
            </div>
          </div>
          
          <div className="flex-1 max-h-[50vh] overflow-y-auto bg-slate-50 dark:bg-slate-950/50">
            {/* Zero State */}
            {!hasSearched && query.length === 0 && (
              <div className="p-4">
                {recentSearches.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Recent Searches</h4>
                    <div className="space-y-1">
                      {recentSearches.map((search, idx) => (
                        <button key={`recent-${idx}`} onClick={() => { setQuery(search); handleSearch(search); }}
                          className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-all group">
                          <div className="w-7 h-7 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                          </div>
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">{search}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div>
                  <div className="flex items-center justify-between mb-2 px-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Suggested Queries</h4>
                    <span className="text-[10px] text-slate-400 hidden sm:inline font-medium">Press 1-6 or click</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {dynamicSuggestions.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button key={item.key} onClick={() => { setQuery(item.text); handleSearch(item.text); }}
                          className="w-full text-left flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-sm transition-all group">
                          <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
                            <Icon className={`w-4 h-4 ${item.color}`} />
                          </div>
                          <div className="flex-1 flex flex-col">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight mb-1">{item.text}</span>
                              <kbd className="text-[10px] font-mono font-bold px-1.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">{item.key}</kbd>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Results */}
            {hasSearched && (
              <div className="p-2 space-y-1">
                {/* AI Answer Block */}
                {(isSynthesizing || aiAnswer) && (
                  <div className="mb-4 mx-2 mt-2 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/10 dark:to-slate-900 border border-indigo-100 dark:border-indigo-800/50 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center shadow-sm">
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Orbit AI</h3>
                    </div>
                    
                    <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed space-y-3 prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-a:text-indigo-600">
                      {isSynthesizing && !aiAnswer ? (
                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="font-medium animate-pulse">Synthesizing across workspace...</span>
                        </div>
                      ) : (
                        <ThinkingAccordion content={aiAnswer} />
                      )}
                    </div>

                    {aiSources.length > 0 && !isSynthesizing && (
                      <div className="mt-4 pt-3 border-t border-indigo-100 dark:border-indigo-800/30">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 block">Sources</span>
                        <div className="flex flex-wrap gap-2">
                          {aiSources.map((src, i) => {
                            const meta = TYPE_META[src.type] || TYPE_META.doc;
                            const Icon = meta.icon;
                            return (
                              <button key={i} onClick={() => { if(meta.route) navigate(meta.route(src.id, src.space_id)); setIsOpen(false); }}
                                className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:border-indigo-300 transition-colors">
                                <Icon className="w-3 h-3" />
                                <span className="max-w-[120px] truncate">{src.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {filteredResults.length === 0 && !isSearching && !isSynthesizing ? (
                  <div className="py-12 text-center flex flex-col items-center">
                    <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="text-sm text-slate-500 font-medium">No matches found for "{query}"</p>
                    <p className="text-xs text-slate-400 mt-1">Try a different term or ask Orbit AI.</p>
                  </div>
                ) : (
                  <>
                    {peopleResults.length > 0 && selectedFilter === 'all' && (
                      <div className="px-3 py-2 mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">People</span>
                        <div className="flex flex-wrap gap-2">
                          {peopleResults.map((p, idx) => {
                            const isSelected = selectedIndex === idx;
                            return (
                              <button key={p.id} onMouseEnter={() => setSelectedIndex(idx)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${isSelected ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800 shadow-sm' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}>
                                <img src={p.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${p.label}`} className="w-5 h-5 rounded-full" alt="" />
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{p.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {(selectedFilter === 'all' ? filteredResults.filter(r => r.type !== 'person') : filteredResults).map((item, idx) => {
                      const absoluteIdx = selectedFilter === 'all' ? peopleResults.length + idx : idx;
                      const isSelected = selectedIndex === absoluteIdx;
                      const meta = TYPE_META[item.type] || TYPE_META.doc;
                      const Icon = meta.icon;

                      return (
                        <div
                          key={`${item.type}-${item.id}`}
                          onMouseEnter={() => setSelectedIndex(absoluteIdx)}
                          onClick={() => {
                            if (meta.route) {
                              const r = meta.route(item.id, item.space_id);
                              if (r) { navigate(r); setIsOpen(false); }
                            }
                          }}
                          className={`mx-2 p-3 rounded-xl border transition-all cursor-pointer flex gap-3 ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800/50 shadow-sm' : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${meta.bg}`}>
                            <Icon className={`w-4 h-4 ${meta.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <span className="font-bold text-sm text-slate-900 dark:text-white truncate">{item.label}</span>
                                {item.provider && (
                                  <span className="shrink-0 text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                    {item.provider}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {item.created_at && (
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    {new Date(item.created_at).toLocaleDateString()}
                                  </span>
                                )}
                                {isSelected && <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />}
                              </div>
                            </div>
                            {item.snippet && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                                {item.snippet}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {hasSearched && totalMatchCount > filteredResults.length && !showAllResults && (
                       <button onClick={handleLoadMore} className="w-full py-3 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 transition-colors mt-2 rounded-lg">
                         Load more results ({totalMatchCount - filteredResults.length} hidden)
                       </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* Footer Footer */}
          <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between shrink-0">
             <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-300 font-mono">â†‘</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-300 font-mono">â†“</kbd>
                  <span>to navigate</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-300 font-mono">Enter</kbd>
                  <span>to select/ask AI</span>
                </div>
             </div>
             <div className="flex items-center gap-2">
               <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Powered by</span>
               <div className="w-4 h-4 bg-indigo-600 rounded-sm flex items-center justify-center">
                 <Sparkles className="w-2.5 h-2.5 text-white" />
               </div>
               <span className="text-[10px] font-bold text-slate-900 dark:text-white">Orbit AI</span>
             </div>
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
};

