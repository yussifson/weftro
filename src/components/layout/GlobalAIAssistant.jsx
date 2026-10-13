import { supabase} from '@/api/supabaseClient';
import { useTranslation} from "react-i18next";
import React, { useState, useRef, useEffect, useCallback} from 'react';

import { useLocation, useNavigate} from 'react-router-dom';
import { Sparkles, X, Send, User, Maximize2, Minimize2, Plus, Clock, Mic, MicOff, Paperclip, Trash2, FileText, Image, LayoutGrid, Command, ListTodo, PenTool, BarChart2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { generateText, analyzeImage} from '@/lib/cloudflareAI';
import { buildOrgContext } from '@/lib/clipadIntelligence';
import { toast} from 'react-hot-toast';
import { useMutateIndustryRecord, useDeleteIndustryRecord} from '@/hooks/useIndustryData';
import { useCompanyId} from '@/hooks/useCompanyId';
import { useQueryClient} from '@tanstack/react-query';
import { base44} from '@/api/base44Client';
import { powerSync} from "@/api/PowerSyncConnector";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ThinkingAccordion, { parseThinking } from '@/components/chat/ThinkingAccordion';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useAuth} from '@/lib/AuthContext';
import { isAdmin, isSpaceman } from '@/lib/constants';
import { CliPadLogo } from '@/components/ui/CliPadLogo';

async function fetchAccessibleSpaceIds(user) {
  if (!user?.company_id) return new Set();
  if (isAdmin(user)) {
    const { data } = await supabase.from('clipad_spaces').select('id').eq('company_id', user.company_id);
    return new Set((data || []).map(s => s.id));
  }
  const { data: memberships } = await supabase.from('clipad_space_members').select('space_id').eq('user_id', user.id);
  const memberSpaceIds = new Set((memberships || []).map(m => m.space_id));
  const { data: publicSpaces } = await supabase.from('clipad_spaces').select('id').eq('company_id', user.company_id).eq('is_private', false);
  (publicSpaces || []).forEach(s => memberSpaceIds.add(s.id));
  return memberSpaceIds;
}

const PAGE_SUGGESTIONS = {
   '/dashboard': ['What needs my attention today?', 'Summarize my recent meetings', 'Show me knowledge health alerts'],
   '/spaces': ['List my active spaces', 'Find spaces about engineering', 'Summarize the latest updates across all spaces'],
   '/meetings': ['Summarize my last meeting', 'List action items from yesterday', 'Who attended the planning meeting?'],
   '/videos': ['Find videos about onboarding', 'Summarize the townhall recording', 'List videos I recorded recently'],
   '/health': ['What knowledge is going stale?', 'Show me pending verification requests', 'How can I improve my team\'s knowledge score?'],
   '/': ['What needs my attention today?', 'Summarize my recent meetings', 'Show me knowledge health alerts']
};

// Page Context Map 
const PAGE_CONTEXT = {
  '/dashboard': { title: 'Dashboard', suite: 'KERINT', desc: 'main dashboard with activity and overview'},
  '/spaces': { title: 'Spaces', suite: 'KERINT', desc: 'team knowledge spaces'},
  '/meetings': { title: 'Meetings', suite: 'KERINT', desc: 'recorded meetings and transcripts'},
  '/videos': { title: 'Videos', suite: 'KERINT', desc: 'async video recordings and memory vault'},
  '/health': { title: 'Knowledge Health', suite: 'KERINT', desc: 'knowledge graph health and stale metrics'},
  '/settings': { title: 'Settings', suite: 'KERINT', desc: 'user and workspace settings'},
  '/': { title: 'Dashboard', suite: 'KERINT', desc: 'main dashboard'},
  '/promotions': { title: 'Promotions', suite: 'Retail', desc: 'discounts and campaigns'},
  
  // Hotel
  '/front-desk': { title: 'Front Desk', suite: 'Hotel', desc: 'guest check-in/out'},
  '/reservations': { title: 'Reservations', suite: 'Hotel', desc: 'booking management'},
  '/rooms': { title: 'Rooms', suite: 'Hotel', desc: 'room status and inventory'},
  '/housekeeping': { title: 'Housekeeping', suite: 'Hotel', desc: 'cleaning schedules'},
  '/restaurant': { title: 'Restaurant', suite: 'Hotel', desc: 'dining POS'},
  
  // Insurance
  '/policies': { title: 'Policies', suite: 'Insurance', desc: 'insurance policies'},
  '/claims': { title: 'Claims Processing', suite: 'Insurance', desc: 'insurance claims list'},
  '/premiums': { title: 'Premiums', suite: 'Insurance', desc: 'premium payment tracking'},
  '/underwriting': { title: 'Underwriting', suite: 'Insurance', desc: 'underwriting applications'},
  '/agent-performance': { title: 'Agent Performance', suite: 'Insurance', desc: 'insurance agent metrics'}
};

// Parse Agent Actions 
function parseAgentActions(text) {
 const actions = [];
 let cleanText = text;
 const startRegex = /\{\s*"tool"\s*:/gi;
 
 let match;
 while ((match = startRegex.exec(cleanText)) !== null) {
 let start = match.index;
 let braces = 0;
 let end = -1;
 let inString = false;
 let escape = false;

 for (let j = start; j < cleanText.length; j++) {
 let char = cleanText[j];
 if (char === '\\' && !escape) {
 escape = true;
 continue;
}
 if (char === '"' && !escape) {
 inString = !inString;
}
 if (!inString) {
 if (char === '{') braces++;
 if (char === '}') braces--;
}
 escape = false;

 if (braces === 0 && j > start) {
 end = j;
 break;
}
}

 if (end !== -1) {
 let jsonStr = cleanText.substring(start, end + 1);
 try {
 let obj = JSON.parse(jsonStr);
 if (obj && obj.tool) {
 actions.push(obj);
 cleanText = cleanText.substring(0, start) + cleanText.substring(end + 1);
 startRegex.lastIndex = start; 
}
} catch (e) {}
}
}

 cleanText = cleanText.replace(/<\/?[a-zA-Z0-9_]+ACTION>/gi, '').trim();
 return { cleanText, actions};
}

// Format message with markdown + styled citation links + collapsible reasoning
function FormatMessage({ content }) {
  const { thinking, content: cleanContent, isThinkingDone } = parseThinking(content);

  return (
    <div>
      {thinking && <ThinkingAccordion thinking={thinking} isThinkingDone={isThinkingDone} />}
      {cleanContent ? (
        <div className="prose prose-sm dark:prose-invert max-w-none break-words [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:mt-1 [&>ul]:mb-2 [&>ol]:mt-1 [&>ol]:mb-2 [&>ul]:pl-4 [&>ol]:pl-4">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ href, children }) => {
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
                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors no-underline border border-primary/20 mx-0.5"
                  >
                    ðŸ”— {children}
                  </a>
                );
              },
            }}
          >
            {cleanContent}
          </ReactMarkdown>
        </div>
      ) : null}
    </div>
  );
}
// Session Storage (Fallback/Types)
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

function newSession() {
 return {
 id: generateId(),
 title: 'New Chat',
 createdAt: new Date().toISOString(),
 messages: []
 };
}

// Main Component 
export default function GlobalAIAssistant({ isOpen = false, onClose, injectedContext = null, onContextConsumed}) {
 const { t} = useTranslation();
 const { user} = useAuth();
 const PORTAL_ROLES = ['client', 'patient', 'guest', 'parent', 'student', 'learner', 'trainee', 'customer', 'policyholder', 'member', 'tenant', 'landlord', 'employee'];
 const isPortalUser = PORTAL_ROLES.includes(user?.role?.toLowerCase());
 const location = useLocation();
 const navigate = useNavigate();
 const mutateRecord = useMutateIndustryRecord();
 const deleteRecord = useDeleteIndustryRecord();
 const companyId = useCompanyId();
 const queryClient = useQueryClient();

 const [sessions, setSessions] = useState([]);
 const [activeId, setActiveId] = useState(null);
 const [isInitialized, setIsInitialized] = useState(false);
 const [showHistory, setShowHistory] = useState(false);
 const [input, setInput] = useState('');
 const [isLoading, setIsLoading] = useState(false);
 const [streamingText, setStreamingText] = useState('');
 const [isExpanded, setIsExpanded] = useState(false);
 const [uploadedFile, setUploadedFile] = useState(null);
 const [pendingHiddenContext, setPendingHiddenContext] = useState(null);
 const [chatMode, setChatMode] = useState('chat');
 const [automationRegistries, setAutomationRegistries] = useState({ triggers: [], actions: [] });

 const [originalInputBeforeVoice, setOriginalInputBeforeVoice] = useState('');
 const messagesEndRef = useRef(null);
 const fileInputRef = useRef(null);
 const inputRef = useRef(null);
 
 useEffect(() => {
   if (!isLoading && inputRef.current) {
     inputRef.current.focus();
   }
 }, [isLoading]);

 const baseInputRef = useRef(''); // the text that was in input before mic started

 const { isListening: isRecording, hasSupport, toggleListening, stopListening } = useSpeechRecognition({
   onTranscript: (combined, finalPart, interimPart) => {
     // combined = all final words so far + current interim preview
     setInput(baseInputRef.current + (baseInputRef.current && combined ? ' ' : '') + combined);
   }
 });

 const handleMicToggle = () => {
   if (!isRecording) {
     // Snapshot what's already typed so we can append to it
     baseInputRef.current = input.trim();
   } else {
     // When stopping, clean up the base ref
     baseInputRef.current = '';
   }
   toggleListening();
 };

 const updateLocalSessions = (newSessions) => {
    localStorage.setItem(`orbit_sessions_${user.email}_${companyId}`, JSON.stringify(newSessions));
  };   
  const startNewChat = async () => {
    const s = newSession();
    setSessions(prev => {
      const updated = [s, ...prev];
      updateLocalSessions(updated);
      return updated;
    });
    setActiveId(s.id);
    setShowHistory(false);
    setIsExpanded(false);

    try {
      await supabase.from('orbit_chat_sessions').insert({
        id: s.id,
        user_id: user.id,
        company_id: companyId || null,
        title: s.title,
        created_at: s.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Failed to save new chat session to DB:', err);
    }
  };

  const deleteSession = async (id, e) => {
    e.stopPropagation();
    setSessions(prev => {
      let updated = prev.filter(s => s.id !== id);
      if (updated.length === 0) {
        const s = newSession();
        updated = [s];
      }
      updateLocalSessions(updated);
      if (activeId === id) setActiveId(updated[0].id);
      return updated;
    });
  };

  const loadedUserKeyRef = useRef('');

  useEffect(() => {
    if (!companyId || !user?.email) return;
    const currentKey = `${user.email}_${companyId}`;
    if (loadedUserKeyRef.current === currentKey) return;
    loadedUserKeyRef.current = currentKey;

    const loadSessions = async () => {
      try {
        const { data: dbSessions, error } = await supabase
          .from('orbit_chat_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(30);

        if (error) throw error;

        if (dbSessions && dbSessions.length > 0) {
          const populatedSessions = await Promise.all(
            dbSessions.map(async (s) => {
              const { data: msgs } = await supabase
                .from('orbit_chat_messages')
                .select('*')
                .eq('session_id', s.id)
                .order('created_at', { ascending: true });

              return {
                id: s.id,
                title: s.title || 'New Chat',
                createdAt: s.created_at,
                messages: (msgs || []).map(m => ({
                  id: m.id,
                  role: m.role,
                  content: m.content
                }))
              };
            })
          );

          setSessions(populatedSessions);
          setActiveId(populatedSessions[0].id);
          updateLocalSessions(populatedSessions);
          return;
        }

        const stored = localStorage.getItem(`orbit_sessions_${user.email}_${companyId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          const cleaned = parsed.map(s => ({
            ...s,
            messages: (s.messages || []).filter(m => m.content !== '...')
          }));
          if (cleaned && cleaned.length > 0) {
            setSessions(cleaned);
            setActiveId(cleaned[0].id);
            for (const s of cleaned) {
              await supabase.from('orbit_chat_sessions').upsert({
                id: s.id,
                user_id: user.id,
                company_id: companyId || null,
                title: s.title,
                created_at: s.createdAt || new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
              if (s.messages && s.messages.length > 0) {
                await supabase.from('orbit_chat_messages').upsert(
                  s.messages.map(m => ({
                    id: m.id || generateId(),
                    session_id: s.id,
                    role: m.role,
                    content: m.content,
                    created_at: new Date().toISOString()
                  }))
                );
              }
            }
          } else {
            throw new Error("Empty array");
          }
        } else {
          throw new Error("No data");
        }
      } catch (e) {
        const s = newSession();
        setSessions([s]);
        setActiveId(s.id);
        try {
          await supabase.from('orbit_chat_sessions').upsert({
            id: s.id,
            user_id: user.id,
            company_id: companyId || null,
            title: s.title,
            created_at: s.createdAt || new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        } catch {}
      }

      // Pre-load automation registries safely with catch fallbacks
      try {
        const [triggersRes, actionsRes] = await Promise.all([
          Promise.resolve(supabase.from('automation_triggers').select('trigger_key, display_name, data_schema').eq('is_active', true)).catch(() => ({ data: [] })),
          Promise.resolve(supabase.from('automation_actions').select('action_key, display_name, input_schema').eq('is_active', true)).catch(() => ({ data: [] })),
        ]);
        if (triggersRes.data && actionsRes.data) {
          setAutomationRegistries({ triggers: triggersRes.data, actions: actionsRes.data });
        }
      } catch (e) {}

      setIsInitialized(true);
    };
    loadSessions();
  }, [companyId, user?.email]);

 const activeSession = sessions.find(s => s.id === activeId) || sessions[0];
 const messages = activeSession?.messages || [];

 useEffect(() => {
 messagesEndRef.current?.scrollIntoView({ behavior: 'smooth'});
}, [messages]);



 const addMessages = useCallback((sessionId, newMsgs) => {
    setSessions(prev => {
      const updated = prev.map(s => {
        if (s.id === sessionId) return { ...s, messages: [...s.messages, ...newMsgs] };
        return s;
      });
      updateLocalSessions(updated);
      return updated;
    });
  }, [companyId, user?.email]);

 const getPageContext = useCallback(() => {
 const ctx = PAGE_CONTEXT[location.pathname];
 return ctx
 ? `The user is on the "${ctx.title}" page in the ${ctx.suite} suite (${ctx.desc}).`
 : `The user is on the "${location.pathname}" page.`;
}, [location.pathname]);

 const executeActionsAsync = async (actions) => {
 const results = [];
 for (const action of actions) {
 try {
 switch (action.tool) {
 case 'search_records': {
  const rt = (action.recordType || '').toLowerCase();
  const entityMap = { 'case': 'LegalCase', 'client': 'Client', 'lead': 'Lead', 'staff': 'StaffRecord', 'invoice': 'Invoice', 'task': 'Task', 'automation_rule': 'AutomationRule'};
  const entityName = entityMap[rt];
  const q = (action.query || '').toLowerCase();
  if (entityName) {
  const records = await base44.entities[entityName].list();
  const found = records.filter(r => JSON.stringify(r).toLowerCase().includes(q)).slice(0, 10);
  const simplified = found.map(r => ({ "**ID_REQUIRED_FOR_UPDATES**": r.id, ...r}));
  results.push(`Search results for ${rt} matching "${q}":\n` + JSON.stringify(simplified));
 } else {
  const records = await powerSync.getAll(`SELECT * FROM industry_records WHERE company_id = ? AND record_type = ?`, [companyId, rt]);
  const parsedRecords = records.map(r => ({ id: r.id, status: r.status, ...JSON.parse(r.data || '{}') }));
  const found = parsedRecords.filter(r => JSON.stringify(r).toLowerCase().includes(q)).slice(0, 10);
  const simplified = found.map(r => ({ "**ID_REQUIRED_FOR_UPDATES**": r.id, ...r}));
  results.push(`Search results for ${rt} matching "${q}":\n` + JSON.stringify(simplified));
 }
  break;
 }
 case 'remember': {
 if (action.fact) {
 await mutateRecord.mutateAsync({
 id: generateId(),
 recordType: 'ai_memory',
 payload: { fact: action.fact, user: user?.email},
 status: 'active',
 searchText: `${user?.email} ${action.fact}`
});
 results.push(`Fact successfully committed to long-term memory.`);
}
 break;
}
 case 'search_memory': {
 const { data: mems} = await supabase
 .from('industry_records')
 .select('*')
 .eq('company_id', companyId)
 .eq('record_type', 'ai_memory')
 .ilike('search_text', `%${user?.email}%`);
 
 if (mems && mems.length > 0) {
  const matched = mems
  .filter(m => (m.data?.fact || '').toLowerCase().includes((action.query || '').toLowerCase()))
  .map(m => m.data?.fact);
  results.push(matched.length ? `Memory results:\n${matched.join('\n')}` : `No memories found matching "${action.query}".`);
 } else {
 results.push(`Memory is empty.`);
}
 break;
}
 case 'navigate_to':
 if (action.route) {
 const dangerousRoutes = ['/logout', '/login', '/register', '/auth'];
 if (dangerousRoutes.some(r => action.route.includes(r))) {
 results.push(`Security Block: Navigation to ${action.route} is prohibited for AI agents.`);
 toast.error(`Blocked AI from navigating to ${action.route}`);
} else {
 setTimeout(() => navigate(action.route), 200);
 results.push(`Navigated to ${action.route}`);
}
}
 break;
 case 'show_toast':
 toast(action.message || 'Done!', { icon: ''});
 results.push(`Toast shown`);
 break;
 case 'create_record':
 case 'update_record': {
  if (action.tool === 'update_record' && !action.id) {
    results.push(`Error: update_record requires an 'id'. You MUST use 'search_records' first to find the ID of the record you want to update.`);
    break;
  }
  if (action.recordType && action.payload) {
  const rt = action.recordType?.toLowerCase() || '';
  const isCore = ['case', 'client', 'lead', 'staff', 'invoice', 'task', 'automation_rule'].includes(rt);
  if (isCore) {
  const entityMap = { 'case': 'LegalCase', 'client': 'Client', 'lead': 'Lead', 'staff': 'StaffRecord', 'invoice': 'Invoice', 'task': 'Task', 'automation_rule': 'AutomationRule'};
  const entityName = entityMap[rt];
  const p = { ...action.payload, company_id: companyId};
  if (action.tool === 'create_record' && !p.status) p.status = 'open';

  const res = action.tool === 'update_record'
  ? await base44.entities[entityName].update(action.id, p)
  : await base44.entities[entityName].create(p);

 queryClient.invalidateQueries({ queryKey: [rt + 's']});
 queryClient.invalidateQueries({ queryKey: ['cases']});
 results.push(`Success: ${action.tool} for ${rt}. Record ID is ${res.id}`);
} else {
 const res = await mutateRecord.mutateAsync({
 id: action.id,
 recordType: rt,
 payload: action.payload,
 status: action.payload.status || 'active',
 searchText: JSON.stringify(action.payload).toLowerCase()
});
 results.push(`Success: ${action.tool} for ${rt}. Record ID is ${res.id}`);
}
}
 break;
}
 case 'delete_record': {
  if (!action.id) {
    results.push(`Error: delete_record requires an 'id'. You MUST use 'search_records' first to find the ID of the record you want to delete.`);
    break;
  }
  if (action.id && action.recordType) {
  const rt = action.recordType?.toLowerCase() || '';
  const isCore = ['case', 'client', 'lead', 'staff', 'invoice', 'task', 'automation_rule'].includes(rt);
 if (isCore) {
 const entityMap = { 'case': 'LegalCase', 'client': 'Client', 'lead': 'Lead', 'staff': 'StaffRecord', 'invoice': 'Invoice', 'task': 'Task'};
 const entityName = entityMap[rt];
 await base44.entities[entityName].delete(action.id);
 queryClient.invalidateQueries({ queryKey: [rt + 's']});
 queryClient.invalidateQueries({ queryKey: ['cases']});
 results.push(`Success: deleted ${rt} with ID ${action.id}`);
} else {
 await deleteRecord.mutateAsync({ id: action.id, recordType: rt});
 results.push(`Success: deleted ${rt} with ID ${action.id}`);
}
}
 break;
}
 // ── CliPad-native search tools ───────────────────────────────────────────
 case 'search_meetings': {
  const q = (action.query || '').toLowerCase();
  const { data: meetings } = await supabase
    .from('clipad_meeting_records')
    .select('id, title, ai_summary, created_at, space_id')
    .eq('company_id', companyId)
    .or(`title.ilike.%${q}%,ai_summary.ilike.%${q}%`)
    .order('created_at', { ascending: false })
    .limit(8);
  results.push(`Meeting search for "${q}":\n${JSON.stringify((meetings || []).map(m => ({ id: m.id, title: m.title, summary: m.ai_summary?.substring(0, 200), date: m.created_at?.slice(0, 10) })))}`);
  break;
 }
 case 'search_videos': {
  const q = (action.query || '').toLowerCase();
  const { data: videos } = await supabase
    .from('clipad_videos')
    .select('id, title, ai_summary, created_at, duration_seconds, space_id')
    .eq('company_id', companyId)
    .or(`title.ilike.%${q}%,ai_summary.ilike.%${q}%`)
    .order('created_at', { ascending: false })
    .limit(8);
  results.push(`Video search for "${q}":\n${JSON.stringify((videos || []).map(v => ({ id: v.id, title: v.title, summary: v.ai_summary?.substring(0, 200), date: v.created_at?.slice(0, 10), duration: Math.round((v.duration_seconds || 0) / 60) + 'min' })))}`);
  break;
 }
 case 'search_decisions': {
  const q = (action.query || '').toLowerCase();
  const { data: decisions } = await supabase
    .from('clipad_decisions')
    .select('id, decision_text, rationale, created_at, importance_score')
    .ilike('decision_text', `%${q}%`)
    .order('created_at', { ascending: false })
    .limit(8);
  results.push(`Decision search for "${q}":\n${JSON.stringify((decisions || []).map(d => ({ id: d.id, decision: d.decision_text, rationale: d.rationale, date: d.created_at?.slice(0, 10), importance: d.importance_score })))}`);
  break;
 }
 case 'search_action_items': {
  const q = (action.query || '').toLowerCase();
  const { data: items } = await supabase
    .from('clipad_action_items')
    .select('id, title, is_complete, due_date, assigned_to, space_id')
    .ilike('title', `%${q}%`)
    .order('created_at', { ascending: false })
    .limit(10);
  results.push(`Action item search for "${q}":\n${JSON.stringify((items || []).map(i => ({ id: i.id, title: i.title, complete: i.is_complete, due: i.due_date, assignee: i.assigned_to })))}`);
  break;
 }
 case 'search_standups': {
  const q = (action.query || '').toLowerCase();
  const { data: standups } = await supabase
    .from('clipad_standups')
    .select('id, user_name, today, yesterday, blockers, mood, created_at, space_id')
    .or(`today.ilike.%${q}%,yesterday.ilike.%${q}%,blockers.ilike.%${q}%,user_name.ilike.%${q}%`)
    .order('created_at', { ascending: false })
    .limit(10);
  results.push(`Standup search for "${q}":\n${JSON.stringify((standups || []).map(s => ({ user: s.user_name, today: s.today, blockers: s.blockers, date: s.created_at?.slice(0, 10) })))}`);
  break;
 }
 case 'search_blockers': {
  const q = (action.query || '').toLowerCase();
  const { data: blockers } = await supabase
    .from('clipad_blockers')
    .select('id, description, severity, status, detected_at, team_space_id')
    .ilike('description', `%${q}%`)
    .eq('status', 'open')
    .order('detected_at', { ascending: false })
    .limit(8);
  results.push(`Blocker search for "${q}":\n${JSON.stringify((blockers || []).map(b => ({ id: b.id, description: b.description, severity: b.severity, date: b.detected_at?.slice(0, 10) })))}`);
  break;
 }
 // ─────────────────────────────────────────────────────────────────────────
 default:
 results.push(`Error: unknown tool ${action.tool}`);
 break;
}
} catch (err) {
 results.push(`Error executing ${action.tool}: ${err.message}`);
}
}
 return results;
};

 const handleSend = useCallback(async (overrideText, targetSid = null, hiddenContext = null) => {
 const text = (overrideText !== undefined ? overrideText : input).trim();
 if (!text && !uploadedFile) return;

 const actualHiddenContext = hiddenContext || pendingHiddenContext;
 setPendingHiddenContext(null);

 const sid = targetSid || activeId;
 const currentSessions = sessions;

 let userContent = text;
 if (uploadedFile) {
 userContent = text
 ? `${text}\n\n[Attached: ${uploadedFile.name}]`
 : `[Attached: ${uploadedFile.name}]`;
}

 addMessages(sid, [{ role: 'user', content: userContent, hiddenContext: actualHiddenContext}]);

  try {
    const activeSession = currentSessions.find(s => s.id === sid);
    if (activeSession) {
      await supabase.from('orbit_chat_sessions').upsert({
        id: activeSession.id,
        user_id: user.id,
        company_id: companyId || null,
        title: activeSession.title,
        updated_at: new Date().toISOString()
      });
      await supabase.from('orbit_chat_messages').insert({
        id: generateId(),
        session_id: activeSession.id,
        role: 'user',
        content: userContent,
        created_at: new Date().toISOString()
      });
    }
  } catch (dbErr) {
    console.warn('Failed to save user message to DB:', dbErr);
  }

  setInput('');
  const fileSnap = uploadedFile;
  setUploadedFile(null);
  setIsLoading(true);

 try {
 let responseText;

 if (fileSnap?.type === 'image') {
 const promptText = `You are an AI agent embedded in Slate enterprise SaaS. ${getPageContext()}\n\nUser says: ${text || 'Please analyze this image.'}\n\nDescribe the image and provide relevant business insights.`;
 responseText = await analyzeImage(fileSnap.bytes, promptText);
} else {
 const ctx = PAGE_CONTEXT[location.pathname] || { title: 'Unknown', suite: 'Unknown'};
  let modeContext = '';
  if (chatMode === 'flow') {
    modeContext = '\nCRITICAL MODE ACTIVE: You are in FLOW BUILDER mode. Focus strictly on designing workflows, suggesting step-by-step logic, and helping the user orchestrate system architectures. Ignore casual chat unless it pertains to flow building.';
  } else if (chatMode === 'automation') {
    modeContext = `\nCRITICAL MODE ACTIVE: You are in AUTOMATION mode. You MUST use ONLY the verified triggers and actions from the registry below. Do NOT hallucinate triggers or actions!
    
VERIFIED TRIGGERS:
${JSON.stringify(automationRegistries.triggers)}

VERIFIED ACTIONS:
${JSON.stringify(automationRegistries.actions)}

To create an automation, use the \`create_record\` tool with recordType "automation". The payload MUST match the new registry:
- name: String
- description: String
- trigger_key: MUST be exactly one of the verified trigger_keys
- steps: Array of objects [{ "action_key": "VERIFIED_ACTION_KEY", "config": { ...inputs matching input_schema... } }]
- trigger_filters: Array of objects [{ "field": "...", "operator": "equals", "value": "..." }]
- is_active: true
`;
  }

  let verticalPersona = "";
  switch(ctx.suite) {
    case 'Hospital': verticalPersona = "You are assisting in a Healthcare environment. Be highly precise, prioritize patient safety, use professional medical terminology, and strictly adhere to HIPAA privacy standards."; break;
    case 'School': verticalPersona = "You are assisting in an Educational environment. Be encouraging, focus on student success, understand academic calendars, and be helpful to teachers and administrators."; break;
    case 'Legal': verticalPersona = "You are assisting in a Legal environment. Be highly formal, prioritize strict confidentiality, use precise legal terminology, and track deadlines relentlessly."; break;
    case 'Logistics': verticalPersona = "You are assisting in a Logistics environment. Focus on efficiency, track timelines, manage supply chain terminology, and prioritize delivery success."; break;
    case 'Retail': verticalPersona = "You are assisting in a Retail environment. Focus on sales metrics, customer satisfaction, inventory turnover, and point-of-sale efficiency."; break;
    case 'Hotel': verticalPersona = "You are assisting in a Hospitality environment. Be extremely polite, focus on guest satisfaction, manage bookings efficiently, and prioritize service quality."; break;
    case 'Religion': verticalPersona = "You are assisting in a Religious/Community environment. Be deeply empathetic, respectful, focus on community engagement, and manage pastoral care delicately."; break;
    case 'HR': verticalPersona = "You are assisting in a Human Resources environment. Maintain strict confidentiality regarding employee data, be highly professional, and focus on compliance and employee well-being."; break;
    case 'Insurance': verticalPersona = "You are assisting in an Insurance environment. Be analytical, focus on risk assessment, use precise actuarial terminology, and handle claims with accuracy."; break;
    default: verticalPersona = "You are assisting in a professional business environment. Be efficient, analytical, and highly capable.";
  }

  let orgContextSection = '';
  // Always load org context — it's the brain of the system
  // 60-second TTL cache to avoid 14 parallel DB queries on every message send
  try {
    const accessibleIds = await fetchAccessibleSpaceIds(user);
    const cacheKey = `${companyId}-${Array.from(accessibleIds).sort().join(',')}`;
    const now = Date.now();
    const cached = GlobalAIAssistant._orgCtxCache;
    let contextText;
    if (cached && cached.key === cacheKey && (now - cached.ts) < 60_000) {
      contextText = cached.text;
    } else {
      const result = await buildOrgContext({ limit: 25, spaceIds: Array.from(accessibleIds), companyId, userId: user?.id, userRole: user?.role || user?.user_metadata?.role || 'member' });
      contextText = result.contextText;
      GlobalAIAssistant._orgCtxCache = { key: cacheKey, text: contextText, ts: now };
    }
    if (contextText && contextText.length > 50) {
      orgContextSection = `

ðŸ¢ LIVE ORGANIZATIONAL MEMORY — VERIFIED REAL DATA:
You have FULL access to the following live data from ${accessibleIds.size} space(s) this user is authorized to see.
This includes: standups, meetings, decisions, blockers, tasks, videos, commitments, team members, org events, and more.
ALWAYS use this data to answer questions. If the data exists below, say so clearly with specifics.
If something is NOT in this data, say you don't see it in the current data, not that it doesn't exist.
NEVER fabricate data. NEVER say something doesn't exist unless the relevant section is empty.

${contextText}
`;
    }

    // ── Integration Knowledge Search: query clipad_imported_knowledge ──────────
    try {
      const { data: knowledgeResults, error: kErr } = await supabase.functions.invoke('knowledge-search', {
        body: { query: text, company_id: companyId, match_count: 8, threshold: 0.4 }
      });
      if (!kErr && knowledgeResults?.results?.length > 0) {
        const kItems = knowledgeResults.results.slice(0, 8).map(r => {
          const parts = [`[${r.provider?.toUpperCase() || 'INTEGRATION'} – ${r.content_type || 'item'}]`];
          if (r.title) parts.push(`Title: ${r.title}`);
          if (r.ai_summary) parts.push(`Summary: ${r.ai_summary}`);
          else if (r.content) parts.push(`Content: ${r.content.substring(0, 300)}`);
          if (r.url) parts.push(`Source: ${r.url}`);
          if (r.author) parts.push(`Author: ${r.author}`);
          if (r.imported_at) parts.push(`Indexed: ${new Date(r.imported_at).toLocaleDateString()}`);
          if (r.related_graph_items && r.related_graph_items.length > 0) {
            const relStr = r.related_graph_items.map(rel => `• ${rel.relationship} → ${rel.provider?.toUpperCase()}: "${rel.title}"`).join('\n');
            parts.push(`Knowledge Graph Links:\n${relStr}`);
          }
          return parts.join('\n');
        }).join('\n\n---\n\n');

        orgContextSection += `

ðŸ”— INTEGRATION KNOWLEDGE BASE — CROSS-SYSTEM DATA:
The following items were retrieved from connected integrations (Slack, Google Drive, GitHub, Jira, Notion, etc.) relevant to the user's query.
Use these to answer questions about documents, messages, meetings, tasks, and more across all connected systems.
Always cite the source provider and title when referencing these results.

${kItems}
`;
      }
    } catch (kSearchErr) {
      console.warn('[OrbitAI] Knowledge search failed:', kSearchErr.message);
    }
  } catch (orgErr) {
    console.warn('[OrbitAI] Could not load org context:', orgErr.message);
  }

  const userRole = isAdmin(user) ? 'Company Admin' : isSpaceman(user) ? 'Spaceman (Space Admin)' : 'Member';
  const isAdminUser = isAdmin(user);
  const isSpaceAdmin = isSpaceman(user);

  const roleRestrictions = isAdminUser
    ? `You have FULL ACCESS to all company data visible to this admin.`
    : isSpaceAdmin
    ? `ROLE RESTRICTIONS: You are a Space Admin. You can see data within spaces you manage, but CANNOT access company billing, user management, admin settings, or other spaces' private data.`
    : `ROLE RESTRICTIONS: You are a regular Member. You MUST NOT reveal or discuss: company billing, subscription plans, other users' salaries or private info, admin settings, other spaces you are not a member of, or any data outside your authorized spaces. If asked about admin-only topics, politely say you don't have access to that information and suggest contacting a company admin.`;

  const now = new Date();
  const timeContext = `CURRENT DATE & TIME: ${now.toLocaleDateString()} ${now.toLocaleTimeString()} (${Intl.DateTimeFormat().resolvedOptions().timeZone})`;
  const userDepartment = user?.department ? ` in the ${user.department} department` : '';
  const userIndustry = user?.company_industry ? ` in the ${user.company_industry} industry` : '';

  const systemPrompt = `You are Orbit — a highly enthusiastic, intelligent, and entertaining AI assistant embedded in the ClipPad organizational memory and workspace.
Your personality is that of a powerful but friendly AI companion—think of a hyper-intelligent digital lion/owl hybrid! Be cheerful, slightly playful, use emojis naturally, but remain highly capable and laser-focused on orchestrating the user's workflows flawlessly.
Your current context is the ClipPad workspace, specifically the '${ctx?.title || 'Dashboard'}' page.

CRITICAL SECURITY & ROLE RULES:
- ${timeContext}. Use this to understand relative times like "today", "yesterday", or "last week".
- You are responding directly to "${user?.full_name || 'a user'}". 
- Their role is "${userRole}"${userDepartment}${userIndustry}. 
- ${roleRestrictions}
- You ONLY have access to data from the spaces this user is authorized to see (provided below).
- NEVER reveal, reference, or speculate about data from spaces or teams this user is not part of.
- NEVER discuss admin-only features (billing, user management, company settings) with Members or Space Admins.

${verticalPersona}
${modeContext}
${orgContextSection}

CRITICAL INSTRUCTIONS:
- You are a Workflow Engineer. You can orchestrate complex chains of tasks and build powerful AUTOMATIONS across the system.
- You have Long-Term Memory. You can remember facts about the user across sessions. Always check your memory or save important details when asked.
- The user is currently on page: ${location.pathname}

EXACT VERIFIED ROUTE MAP — ALWAYS USE THESE EXACT PATHS FOR navigate_to. NEVER GUESS OR INVENT PATHS:
/dashboard → Dashboard
/spaces → Spaces
/meetings → Meetings
/videos → Videos / Recordings
/record → Record Video
/health → Knowledge Health
/timeline → Knowledge Timeline (chronological feed of all synced knowledge)
/decisions → Decision Ledger (AI-detected decisions from meetings, docs, messages)
/knowledge-graph → Knowledge Graph (interactive visual graph of cross-system relationships)
/action-items → Action Items (AI-extracted tasks from all sources, exportable to Jira/ClickUp etc.)
/journey → Knowledge Journey (trace how ideas flow across Slack → Notion → Jira → GitHub)
/integrations → Integrations Hub (connect external apps)
/integration-analytics → Integration Analytics
/settings → Settings
/support → Support
/chat → Chat

CITATION RULES (MANDATORY when using INTEGRATION KNOWLEDGE BASE):
- When answering from the ðŸ”— INTEGRATION KNOWLEDGE BASE section, you MUST cite the source.
- Format citations inline like: [Source: {Provider} – "{Title}"]
- If a URL is available in the source data, format it as a markdown link: [View Source]({url})
- Always cite, never omit the source when referencing integrated data.

AGENT POWERS (return EXACTLY this JSON format inline to act):
- Search CRM: <AGENT_ACTION>{"tool":"search_records","recordType":"patient|case|client|student|staff","query":"John"}</AGENT_ACTION>
- Search Meetings: <AGENT_ACTION>{"tool":"search_meetings","query":"pricing discussion"}</AGENT_ACTION>
- Search Videos: <AGENT_ACTION>{"tool":"search_videos","query":"onboarding"}</AGENT_ACTION>
- Search Decisions: <AGENT_ACTION>{"tool":"search_decisions","query":"API architecture"}</AGENT_ACTION>
- Search Action Items: <AGENT_ACTION>{"tool":"search_action_items","query":"deploy backend"}</AGENT_ACTION>
- Search Standups: <AGENT_ACTION>{"tool":"search_standups","query":"blocker yesterday"}</AGENT_ACTION>
- Search Blockers: <AGENT_ACTION>{"tool":"search_blockers","query":"auth issue"}</AGENT_ACTION>
- Navigate: <AGENT_ACTION>{"tool":"navigate_to","route":"/patients"}</AGENT_ACTION>
- Create: <AGENT_ACTION>{"tool":"create_record","recordType":"patient","payload":{"name":"John Doe","age":30,"status":"active"}}</AGENT_ACTION>
- Update: <AGENT_ACTION>{"tool":"update_record","recordType":"patient","id":"uuid","payload":{"status":"discharged"}}</AGENT_ACTION>
- Delete: <AGENT_ACTION>{"tool":"delete_record","recordType":"patient","id":"uuid"}</AGENT_ACTION>
- Toast: <AGENT_ACTION>{"tool":"show_toast","message":"Done!"}</AGENT_ACTION>
- Remember: <AGENT_ACTION>{"tool":"remember","fact":"User prefers dark mode"}</AGENT_ACTION>
- Search Memory: <AGENT_ACTION>{"tool":"search_memory","query":"preferences"}</AGENT_ACTION>
- Request Confirmation: <AGENT_ACTION>{"tool":"ask_confirmation","actionToConfirm":{"tool":"navigate_to","route":"/classes"},"message":"Did you mean the Classes page?"}</AGENT_ACTION>

RULES FOR MULTI-STEP REASONING & AUTOMATIONS:
1. NEVER explain how the user can do something. YOU MUST do it for them.
2. THE UPDATE PROTOCOL: If you are asked to edit/update a record (like a product price), you MUST first output a search_records tool call. Read the search results, extract the "**ID_REQUIRED_FOR_UPDATES**", and then output the update_record tool call using that exact ID. NEVER call update_record without searching first!
3. When asked to CREATE a record, create the record and STOP. DO NOT use navigate_to to show the record.
4. If asked to create an ENTIRE NEW MODULE, custom feature, or a page that does NOT exist in the ROUTE MAP, you MUST use navigate_to to route the user to "/slate/BOLT" AND use show_toast to tell them: "I can help you build this! Just click 'Generate with AI' on this page."
5. ONLY use navigate_to for routes that EXACTLY appear in the ROUTE MAP above, plus "/slate/BOLT".
6. To create an AUTOMATION, use the \`create_record\` tool with recordType "automation". (See AUTOMATION mode context if active). If creating legacy automations, adapt to the new "automation" table schema instead of "automation_rule".
7. For 'case' records, use 'title' instead of 'name'.
8. If the user's input has a typo, is ambiguous, or if you are unsure which page they mean, ALWAYS use the 'ask_confirmation' tool first.
9. If the user asks for multiple distinct actions (e.g. "create a task and a lead"), ensure you output an <AGENT_ACTION> block for EACH request before summarizing.
10. Sound friendly and entertaining in your text response!`;


 const sessionMessages = currentSessions.find(s => s.id === sid)?.messages || [];
 const allMessages = [...sessionMessages, { role: 'user', content: userContent}];
 let apiMessages = [
 { role: 'system', content: systemPrompt},
 ...allMessages.slice(-20).map(m => ({ 
 role: m.role, 
 content: m.hiddenContext ? `${m.content}\n\nSystem Context:\n\`\`\`json\n${m.hiddenContext}\n\`\`\`` : m.content 
}))
 ];

  let maxSteps = 5;
  let stepCount = 0;
  let finalCleanText = "";
  const streamingMsgId = generateId();

  // Add single initial assistant message with streaming state
  addMessages(sid, [{ id: streamingMsgId, role: 'assistant', content: '...', isStreaming: true }]);

  while (stepCount < maxSteps) {
    stepCount++;

    const responseText = await generateText(apiMessages, (chunk) => {
      const displayChunk = chunk
        .replace(/<[a-zA-Z0-9_]+ACTION>.*?<\/?[a-zA-Z0-9_]+ACTION>/gis, '')
        .replace(/<[a-zA-Z0-9_]+ACTION>/gi, '');

      setSessions(prev => prev.map(s => {
        if (s.id !== sid) return s;
        return {
          ...s,
          messages: s.messages.map(m => m.id === streamingMsgId ? { ...m, content: displayChunk || '...' } : m)
        };
      }));
    });

    const { cleanText, actions } = parseAgentActions(responseText);

    if (cleanText) finalCleanText += (finalCleanText ? "\n\n" : "") + cleanText;

    if (actions.length === 0) {
      break; // AI is done
    }

    let confirmationAction = actions.find(a => a.tool === 'ask_confirmation');
    if (confirmationAction) {
      const finalMsgContent = finalCleanText || confirmationAction.message;
      setSessions(prev => prev.map(s => {
        if (s.id !== sid) return s;
        return {
          ...s,
          messages: s.messages.map(m => m.id === streamingMsgId ? {
            ...m,
            content: finalMsgContent,
            isConfirmation: true,
            pendingAction: confirmationAction.actionToConfirm,
            isStreaming: false
          } : m)
        };
      }));
      try {
        await supabase.from('orbit_chat_messages').insert({
          id: streamingMsgId,
          session_id: sid,
          role: 'assistant',
          content: finalMsgContent,
          created_at: new Date().toISOString()
        });
      } catch (dbErr) {
        console.warn('Failed to save confirmation message to DB:', dbErr);
      }
      finalCleanText = ""; // Handled via confirmation message
      break; // Pause loop
    }

    const actionResults = await executeActionsAsync(actions);

    apiMessages.push({ role: 'assistant', content: responseText });
    apiMessages.push({ role: 'system', content: `Action Results:\n${actionResults.join('\n')}` });
  }

  // Ensure streamingMsgId is updated with final text and marked as non-streaming
  if (finalCleanText) {
    setSessions(prev => prev.map(s => {
      if (s.id !== sid) return s;
      return {
        ...s,
        messages: s.messages.map(m => m.id === streamingMsgId ? { ...m, content: finalCleanText, isStreaming: false } : m)
      };
    }));
    try {
      await supabase.from('orbit_chat_messages').insert({
        id: streamingMsgId,
        session_id: sid,
        role: 'assistant',
        content: finalCleanText,
        created_at: new Date().toISOString()
      });
      await supabase.from('orbit_chat_sessions').update({ updated_at: new Date().toISOString() }).eq('id', sid);
    } catch (dbErr) {
      console.warn('Failed to save assistant response to DB:', dbErr);
    }
  } else {
    // If no text was produced, clean up the placeholder
    setSessions(prev => prev.map(s => {
      if (s.id !== sid) return s;
      return { ...s, messages: s.messages.filter(m => m.id !== streamingMsgId) };
    }));
  }
 }
} catch (err) {
 addMessages(sid, [{ role: 'assistant', content: "Error: " + err.message + ". Please try again."}]);
} finally {
 setIsLoading(false);
}
}, [input, uploadedFile, activeId, sessions, addMessages, getPageContext, companyId, queryClient, navigate, location.pathname, executeActionsAsync, chatMode]);

 // When Spotlight injects a record context, auto-start a new chat about it
 useEffect(() => {
 if (!injectedContext || !isInitialized || sessions.length === 0) return;

 // Start a fresh session for this context
 const s = newSession();
 const label = injectedContext.label || 'this record';
 const entityType = injectedContext.entityType || 'Record';
 const query = injectedContext.query || '';
 const recordJson = JSON.stringify(injectedContext.record, null, 2);

 const displayMessage = query
 ? `I searched for "${query}" and found this ${entityType}: **${label}**. Please help me with this record.`
 : `I want to ask about this ${entityType}: **${label}**. What can you tell me about this record?`;

 setSessions(prev => [s, ...prev]);
 setActiveId(s.id);
 
 // Instead of auto-sending, populate the text box so user can refine it
 setInput(displayMessage);
 setPendingHiddenContext(recordJson);

 if (onContextConsumed) onContextConsumed();
}, [injectedContext, isInitialized, onContextConsumed]);


 // Action Confirmation Handlers
 const confirmPendingAction = async (action, msgIndex) => {
 setSessions(prev => prev.map(s => {
 if (s.id !== activeId) return s;
 const msgs = [...(s.messages || [])];
 msgs[msgIndex] = { ...msgs[msgIndex], isConfirmation: false};
 return { ...s, messages: msgs};
}));
 
 setIsLoading(true);
 try {
 const actionResults = await executeActionsAsync([action]);
 addMessages(activeId, [{ role: 'system', content: `Action Confirmed & Executed. Results:\n${actionResults.join('\n')}`}]);
 toast.success("Action confirmed");
} finally {
 setIsLoading(false);
}
};

 const cancelPendingAction = (msgIndex) => {
 setSessions(prev => prev.map(s => {
 if (s.id !== activeId) return s;
 const msgs = [...(s.messages || [])];
 msgs[msgIndex] = { ...msgs[msgIndex], isConfirmation: false};
 return { ...s, messages: msgs};
}));
 addMessages(activeId, [{ role: 'user', content: "I cancelled that action."}]);
};

 // File Upload 
 const handleFileUpload = async e => {
 const file = e.target.files?.[0];
 if (!file) return;
 e.target.value = '';
 if (file.size > 10 * 1024 * 1024) { toast.error('File too large (max 10MB)'); return;}

 if (file.type.startsWith('image/')) {
 const bytes = new Uint8Array(await file.arrayBuffer());
 setUploadedFile({ name: file.name, type: 'image', bytes});
 toast.success(`Image ready: ${file.name}`);
} else {
 const text = await file.text();
 setUploadedFile({ name: file.name, type: 'text', content: text});
 toast.success(`File ready: ${file.name}`);
}
};



 const ctx = PAGE_CONTEXT[location.pathname];

 // Render 
 const content = (
 <>
 {/* Mobile Backdrop */}
 {isOpen && (
 <div className="md:hidden fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-[2px] transition-opacity" onClick={onClose} />
 )}
 
 <div 
 className={`flex bg-slate-50 dark:bg-background z-[70] transition-all duration-300 overflow-hidden ${
 // Mobile: Fullscreen native view
 isOpen ? "max-md:fixed max-md:inset-0 max-md:h-[100dvh] max-md:w-full max-md:flex-col max-md:translate-y-0 max-md:opacity-100 max-md:shadow-2xl" : "max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:h-0 max-md:translate-y-full max-md:opacity-0 max-md:pointer-events-none"
 } ${
 // Desktop: Side Panel
 isOpen ? (isExpanded ? "md:relative md:h-full md:shrink-0 md:w-[680px] md:opacity-100 md:border-l-2 md:border-l-primary/30 shadow-[-12px_0_40px_rgba(0,0,0,0.04)] dark:shadow-[-12px_0_40px_rgba(0,0,0,0.3)]" : "md:relative md:h-full md:shrink-0 md:w-[420px] md:opacity-100 md:border-l-2 md:border-l-primary/30 shadow-[-12px_0_40px_rgba(0,0,0,0.04)] dark:shadow-[-12px_0_40px_rgba(0,0,0,0.3)]") : "md:h-full md:w-0 md:opacity-0 md:border-none md:pointer-events-none"
 }`}
 >
 {/* Mobile Drag Handle */}
 <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
 <div className="w-12 h-1.5 rounded-full bg-slate-200 dark:bg-secondary" />
 </div>
 
 {/* Main Content Wrapper (Needs flex row on desktop, flex col on mobile if history is open) */}
 <div className="flex h-full w-full">
 {/* History Sidebar */}
 {showHistory && (
 <div className="w-52 shrink-0 border-r border-primary/40 bg-white dark:bg-card border-r border-slate-200 dark:border-border flex flex-col">
 <div className="px-3 py-2.5 border-b border-primary/40 flex items-center justify-between">
 <span className="text-[11px] font-semibold uppercase tracking-wider text-[#71717a] dark:text-gray-400 tracking-[0.04em]">{t("chat_history", "Chat History")}</span>
 <div className="flex items-center gap-2">
 <button onClick={startNewChat} className="p-1 hover:bg-muted rounded-md text-[#71717a] dark:text-gray-400 hover:text-primary transition-colors" title="New chat">
 <Plus className="w-3.5 h-3.5" />
 </button>
 <button onClick={() => setShowHistory(false)} className="p-1 hover:bg-muted rounded-md text-[#71717a] dark:text-gray-400 transition-colors" title="Close history">
 <X className="w-3.5 h-3.5" />
 </button>
 </div>
 </div>
 <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-primary">
 {sessions.map(s => {
 return (
 <div
 key={s.id}
 onClick={() => { setActiveId(s.id); setShowHistory(false);}}
 className={`group relative flex items-start gap-2 p-2 rounded-xl cursor-pointer text-left transition-colors ${
 s.id === activeId
 ? 'bg-slate-50 dark:bg-primary/30 border-[0.5px] border-black/9 dark:border-white/8 border-primary/20 dark:border-primary/40'
 : 'hover:bg-muted/70'
}`}
 >
 <Clock className="w-3 h-3 mt-0.5 text-[#71717a] dark:text-gray-400 shrink-0" />
 <div className="flex-1 min-w-0">
 <p className="text-[11px] font-medium text-foreground truncate leading-tight">{s.title}</p>
 <p className="text-[10px] text-[#71717a] dark:text-gray-400 mt-0.5">
 {new Date(s.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}
 </p>
 </div>
 <button
 onClick={e => deleteSession(s.id, e)}
 className="opacity-0 group-hover:opacity-100 p-0.5 text-[#71717a] dark:text-gray-400 hover:text-red-500 transition-all shrink-0"
 >
 <Trash2 className="w-3 h-3" />
 </button>
 </div>
 );
})}
 </div>
 </div>
 )}
 {/* Main Panel */}
 <div className="flex-1 flex flex-col min-w-0 relative">

  {/* Header — Solid Sticky Controls */}
  <div className="bg-[#006065] dark:bg-[#053639] text-white backdrop-blur-md px-4 py-3 flex justify-between items-center shrink-0 sticky top-0 z-[101] border-b border-[#006065] dark:border-border/50">
    <div className="flex-1"></div>
    <div className="flex items-center gap-1.5 justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button 
            className="w-8 h-8 rounded-full bg-transparent hover:bg-white/10 text-white/80 hover:text-white flex items-center justify-center transition-all"
            title="Orbit Options"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 z-[100] shadow-2xl border border-slate-200 dark:border-border bg-white dark:bg-[#053639] p-1.5">
          <DropdownMenuItem onClick={() => setShowHistory(prev => !prev)} className="cursor-pointer font-semibold text-xs py-2.5 rounded-lg">
            <Clock className="w-4 h-4 mr-2 text-emerald-600 dark:text-emerald-400" /> 
            {showHistory ? t("hide_history", "Hide History") : t("chat_history", "Chat History")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={startNewChat} className="cursor-pointer font-semibold text-xs py-2.5 rounded-lg">
            <Plus className="w-4 h-4 mr-2 text-emerald-600 dark:text-emerald-400" /> 
            {t("new_chat", "New Chat")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsExpanded(!isExpanded)} className="cursor-pointer font-semibold text-xs py-2.5 rounded-lg hidden md:flex">
            {isExpanded ? (
              <><Minimize2 className="w-4 h-4 mr-2 text-slate-500 dark:text-muted-foreground" /> {t("collapse", "Collapse Panel")}</>
            ) : (
              <><Maximize2 className="w-4 h-4 mr-2 text-slate-500 dark:text-muted-foreground" /> {t("expand", "Expand Panel")}</>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onClose} className="cursor-pointer font-semibold text-xs py-2.5 rounded-lg text-red-600 dark:text-red-400 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30">
            <X className="w-4 h-4 mr-2" /> 
            {t("close_orbitflow", "Close Orbit")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        onClick={onClose}
        className="w-8 h-8 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 flex items-center justify-center transition-all shadow-sm"
        title="Close chat"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  </div>

 {/* Messages */}
 <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 relative bg-slate-50 dark:bg-background md:scrollbar-primary">
 <div className="relative z-10 space-y-6">
 {messages.filter(m => m.role !== 'system').map((msg, i) => {
 return (
 <div key={i} className={`flex gap-3 max-w-full items-start ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
  {msg.role === 'user' ? (
    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm bg-[#006065] dark:bg-[#053639] text-[#fad503] font-bold border border-[#006065] dark:border-border/20 text-xs">
      <User className="w-4 h-4" />
    </div>
  ) : (
    <div className="w-8 h-8 rounded-full bg-transparent flex items-center justify-center shrink-0 mt-0.5 shadow-sm border border-slate-200 dark:border-border bg-white dark:bg-card">
      <img src="/clipad-app-icon.png" alt="KERINT" className="w-5 h-5 object-contain" />
    </div>
  )}
  <div className={`px-5 py-3.5 rounded-2xl text-[14px] leading-relaxed max-w-[85%] break-words ${
  msg.role === 'user'
  ? 'bg-[#f1f1f1] dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
  : 'bg-transparent text-slate-800 dark:text-slate-200 w-full px-0 shadow-none'
  }`}>
 {msg.content === '...' ? (
    <div className="flex items-center gap-1.5 py-1.5 min-w-[36px]">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-50 dark:bg-background0 animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-50 dark:bg-background0 animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-50 dark:bg-background0 animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  ) : (
    <FormatMessage content={msg.content} />
  )}
 
 {msg.isConfirmation && msg.pendingAction && (
 <div className="mt-3 flex gap-2 pt-3 border-t border-primary/40">
 <button 
 onClick={() => confirmPendingAction(msg.pendingAction, i)}
 className="bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2.5 tracking-[0.04em]"
 >
 <Sparkles className="w-3 h-3" /> {t("continue_action", "Continue Action")}
 </button>
 <button 
 onClick={() => cancelPendingAction(i)}
 className="bg-slate-100 dark:bg-secondary hover:bg-slate-200 dark:hover:bg-accent text-slate-700 dark:text-foreground px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border-[0.5px] border-black/9 dark:border-white/8 border-primary/40  tracking-[0.04em]"
 >
 {t("cancel", "Cancel")}
 </button>
 </div>
 )}
 </div>
 </div>
 );
})}

 <div ref={messagesEndRef} />
 </div>
 </div>

 {/* Zero State Welcome View */}
 {messages.length === 0 && !isLoading && (
   <div className="flex flex-col items-center justify-center h-full px-4 mt-[10vh] text-center animate-in fade-in duration-500">
     <h2 className="text-[18px] font-medium text-slate-800 dark:text-slate-200 mb-1">
       Hi {user?.full_name?.split(' ')[0] || 'there'},
     </h2>
     <h1 className="text-[22px] font-bold text-slate-900 dark:text-foreground mb-3">
       Welcome back! How can I help?
     </h1>
     <p className="text-[13px] text-slate-500 dark:text-muted-foreground max-w-[280px] mb-8 leading-relaxed">
       I'm here to help you tackle your tasks. Choose from the prompts below or just tell me what you need!
     </p>
     
     <div className="grid grid-cols-2 md:grid-cols-3 gap-2 w-full max-w-[360px]">
        <button onClick={() => handleSend("Create a highly realistic image for my current project")} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card hover:bg-slate-50 dark:hover:bg-accent transition-colors shadow-sm text-left">
          <Image className="w-[14px] h-[14px] text-emerald-500 shrink-0" /> <span className="text-[11px] font-bold text-slate-700 dark:text-muted-foreground truncate">Create image</span>
        </button>
        <button onClick={() => handleSend("Analyze my workspace data and provide insights")} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card hover:bg-slate-50 dark:hover:bg-accent transition-colors shadow-sm text-left">
          <BarChart2 className="w-[14px] h-[14px] text-blue-500 shrink-0" /> <span className="text-[11px] font-bold text-slate-700 dark:text-muted-foreground truncate">Analyze data</span>
        </button>
        <button onClick={() => handleSend("Create a detailed implementation plan for my current task")} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card hover:bg-slate-50 dark:hover:bg-accent transition-colors shadow-sm text-left">
          <ListTodo className="w-[14px] h-[14px] text-purple-500 shrink-0" /> <span className="text-[11px] font-bold text-slate-700 dark:text-muted-foreground truncate">Make a plan</span>
        </button>
        <button onClick={() => handleSend("Summarize the most important points from my recent documents")} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card hover:bg-slate-50 dark:hover:bg-accent transition-colors shadow-sm text-left">
          <FileText className="w-[14px] h-[14px] text-pink-500 shrink-0" /> <span className="text-[11px] font-bold text-slate-700 dark:text-muted-foreground truncate">Summarize text</span>
        </button>
        <button onClick={() => handleSend("Help me draft a professional message for my team")} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card hover:bg-slate-50 dark:hover:bg-accent transition-colors shadow-sm text-left">
          <PenTool className="w-[14px] h-[14px] text-orange-500 shrink-0" /> <span className="text-[11px] font-bold text-slate-700 dark:text-muted-foreground truncate">Help me write</span>
        </button>
        <button onClick={() => handleSend("What else can you do? Show me all your capabilities")} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card hover:bg-slate-50 dark:hover:bg-accent transition-colors shadow-sm text-left justify-center">
          <Sparkles className="w-[14px] h-[14px] text-slate-400 shrink-0" /> <span className="text-[11px] font-bold text-slate-700 dark:text-muted-foreground truncate">More</span>
        </button>
     </div>
   </div>
 )}

 {/* Attached File Preview */}
 {uploadedFile && (
 <div className="mx-3 mb-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-primary/20 border-[0.5px] border-black/9 dark:border-white/8 border-primary/20 dark:border-primary/40 flex items-center gap-2 shrink-0">
 {uploadedFile.type === 'image'
 ? <Image className="w-4 h-4 text-primary shrink-0" />
 : <FileText className="w-4 h-4 text-primary shrink-0" />}
 <span className="text-xs font-medium text-primary/90 dark:text-primary/70 flex-1 truncate tracking-[0.04em]">{uploadedFile.name}</span>
 <button onClick={() => setUploadedFile(null)} className="text-[#71717a] dark:text-gray-400 hover:text-red-500 transition-colors shrink-0">
 <X className="w-3.5 h-3.5" />
 </button>
 </div>
 )}

 {/* Input */}
 <div className="px-4 py-4 bg-white dark:bg-card border-t border-slate-200 dark:border-border shadow-[0_-10px_40px_rgba(0,0,0,0.03)] shrink-0 relative z-10">
   <div className="relative rounded-2xl bg-slate-50 dark:bg-[#131A2B] border border-slate-200 dark:border-border shadow-sm focus-within:ring-1 focus-within:ring-slate-300 transition-all duration-300 flex flex-col p-2">
     
     <div className="flex items-center relative">
       <textarea
         ref={inputRef}
         value={input}
         onChange={e => {
           setInput(e.target.value);
           e.target.style.height = 'auto';
           e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
         }}
         placeholder={isRecording ? 'Listening...' : 'Ask me anything...'}
         rows={1}
         className={`w-full bg-transparent border-none focus:ring-0 resize-none px-3 py-2 pr-12 text-[14px] text-slate-900 dark:text-foreground outline-none leading-relaxed min-h-[40px] max-h-[160px] overflow-y-auto ${
         isRecording ? 'placeholder:text-red-400 placeholder:animate-pulse' : 'placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-muted-foreground'
         }`}
         disabled={isLoading}
         onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend();}}}
       />
       
       <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
         {input.trim() || uploadedFile ? (
           <button
             type="button"
             onClick={() => handleSend()}
             disabled={isLoading}
             className="w-7 h-7 bg-[#006065] dark:bg-[#053639] hover:bg-[#004e52] disabled:opacity-50 text-white rounded-full flex items-center justify-center transition-all shadow-sm"
           >
             <Send className="w-3.5 h-3.5 ml-0.5" />
           </button>
         ) : (
           <button
             type="button"
             onClick={handleMicToggle}
             className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors ${
             isRecording
             ? 'text-red-500 bg-red-50 dark:bg-red-950/30 animate-pulse'
             : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-accent'
             }`}
             title={isRecording ? 'Stop recording' : 'Voice input'}
           >
             {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
           </button>
         )}
       </div>
     </div>
     
     {/* Footer Row */}
     <div className="flex items-center justify-end px-3 pt-2 mt-1 border-t border-slate-100 dark:border-border">
       <div className="flex items-center gap-4">
         <button onClick={() => toast({ title: 'Shortcuts', description: 'Press Cmd+K to search, Shift+Enter for new line.' })} className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 hover:text-slate-600 dark:text-muted-foreground transition-colors">
           <Command className="w-3.5 h-3.5" /> Shortcuts
         </button>
         <div className="flex items-center gap-1.5">
           <input ref={fileInputRef} type="file" className="hidden" accept="image/*,.pdf,.txt,.csv,.docx,.xlsx,.json,.md" onChange={handleFileUpload} />
           <button
             type="button"
             onClick={() => fileInputRef.current?.click()}
             className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 hover:text-slate-600 dark:text-muted-foreground transition-colors"
           >
             <Paperclip className="w-3.5 h-3.5" /> Attach
           </button>
         </div>
       </div>
     </div>
     
   </div>
 </div>
 </div>
 </div>
 </div>
 </>
 );

  return content;
}

