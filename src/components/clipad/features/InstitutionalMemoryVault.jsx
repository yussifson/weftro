import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Database, Search, Bot, Lock, ArrowRight, Loader2, AlertCircle, Link, Sparkles } from 'lucide-react';
import { generateText } from '@/lib/cloudflareAI';
import { parseThinking } from '@/components/chat/ThinkingAccordion';
import { useNavigate } from 'react-router-dom';

export default function InstitutionalMemoryVault({ workspaceId }) {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [citations, setCitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleQuery = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setResponse('');

    try {
      // 1. Fetch real organizational context from the database
      const [meetingsRes, decisionsRes, blockersRes, videosRes, tasksRes, importedDataRes] = await Promise.all([
        supabase
          .from('clipad_meeting_records')
          .select('id, title, ai_summary, created_at, ended_at, host_id')
          .eq('company_id', workspaceId)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('clipad_decisions')
          .select('id, decision_text, reasoning_text, status, created_at')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('clipad_blockers')
          .select('id, description, status, detected_at, resolved_at')
          .order('detected_at', { ascending: false })
          .limit(10),
        supabase
          .from('clipad_videos')
          .select('id, title, ai_summary, created_at')
          .eq('company_id', workspaceId)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('clipad_action_items')
          .select('id, title, is_complete, created_at')
          .eq('company_id', workspaceId)
          .order('created_at', { ascending: false })
          .limit(15),
        // Include semantically relevant external knowledge based on the user's query
        supabase.functions.invoke('knowledge-search', {
          body: { query: query, company_id: workspaceId, match_count: 20 }
        }).then(res => ({ data: res.data?.results || [] })),
      ]);

      // 2. Build a rich context document from real data
      const meetings = meetingsRes.data || [];
      const decisions = decisionsRes.data || [];
      const blockers = blockersRes.data || [];
      const videos = videosRes.data || [];
      const tasks = tasksRes.data || [];
      const imported = importedDataRes.data || [];

      const contextParts = [];

      if (meetings.length > 0) {
        contextParts.push('=== MEETING HISTORY ===');
        meetings.forEach(m => {
          contextParts.push(`Meeting [ID: M-${m.id}]: "${m.title || 'Untitled'}" on ${new Date(m.created_at).toLocaleDateString()}`);
          if (m.ai_summary && m.ai_summary !== 'Generating summary...' && m.ai_summary !== 'No transcript recorded.') {
            contextParts.push(`  Summary: ${m.ai_summary}`);
          }
        });
      }

      if (decisions.length > 0) {
        contextParts.push('\n=== TEAM DECISIONS ===');
        decisions.forEach(d => {
          contextParts.push(`Decision [ID: D-${d.id}] [${d.status || 'active'}]: ${d.decision_text}`);
          if (d.reasoning_text) contextParts.push(`  Rationale: ${d.reasoning_text}`);
          contextParts.push(`  Date: ${new Date(d.created_at).toLocaleDateString()}`);
        });
      }

      if (blockers.length > 0) {
        contextParts.push('\n=== BLOCKERS & RESOLUTIONS ===');
        blockers.forEach(b => {
          contextParts.push(`Blocker [ID: B-${b.id}] [${b.status}]: ${b.description}`);
          if (b.resolved_at) contextParts.push(`  Resolved: ${new Date(b.resolved_at).toLocaleDateString()}`);
        });
      }

      if (videos.length > 0) {
        contextParts.push('\n=== ASYNC VIDEO RECORDINGS ===');
        videos.forEach(v => {
          contextParts.push(`Video [ID: V-${v.id}]: "${v.title}" (${new Date(v.created_at).toLocaleDateString()})`);
          if (v.ai_summary) contextParts.push(`  Summary: ${v.ai_summary}`);
        });
      }

      if (tasks.length > 0) {
        contextParts.push('\n=== ACTION ITEMS ===');
        tasks.forEach(t => {
          contextParts.push(`[ID: T-${t.id}] [${t.is_complete ? 'DONE' : 'OPEN'}] ${t.title}`);
        });
      }

      if (imported.length > 0) {
        contextParts.push('\n=== EXTERNAL KNOWLEDGE FROM INTEGRATIONS ===');
        contextParts.push(`(${imported.length} items imported from connected tools)`);
        imported.forEach(i => {
          contextParts.push(`\n[${i.provider?.toUpperCase()} - ${i.content_type || 'file'}] "${i.title}" (ID: I-${i.id})`);
          if (i.ai_summary) contextParts.push(`  AI Summary: ${i.ai_summary}`);
          // Include actual document content so AI can answer questions about what is IN the file
          if (i.content) contextParts.push(`  Content: ${i.content.substring(0, 1500)}`);
          if (i.ai_entities) {
            try {
              const ent = typeof i.ai_entities === 'string' ? JSON.parse(i.ai_entities) : i.ai_entities;
              if (ent?.people?.length) contextParts.push(`  People mentioned: ${ent.people.join(', ')}`);
              if (ent?.projects?.length) contextParts.push(`  Projects: ${ent.projects.join(', ')}`);
            } catch { /* ignore */ }
          }
          if (i.url) contextParts.push(`  Link: ${i.url}`);
        });
      }

      if (contextParts.length === 0) {
        setResponse('No organizational data has been recorded yet. Start by running meetings, recording decisions, or connecting integrations. The Knowledge Graph will build from your team\'s real activity.');
        setLoading(false);
        return;
      }

      const knowledgeContext = contextParts.join('\n');

      // 3. Query the real AI with full organizational context
      const aiResponse = await generateText([
        {
          role: 'system',
          content: `You are an Enterprise Knowledge Graph AI assistant with access to this organization's FULL knowledge base — including internal meetings, decisions, blockers, action items, AND documents/files imported from external integrations (Google Drive, Slack, GitHub, Zoom, Notion, etc.).

Answer questions based ONLY on the real data provided. Do NOT make up facts. If the data doesn't contain the answer, say "I don't have enough recorded data to answer that yet."
CRITICAL INSTRUCTION: DO NOT mention internal IDs (e.g. I-123, M-456, or UUIDs) in your natural text response. Use titles instead. IDs should ONLY appear inside the strictly formatted JSON at the bottom.

When you use data, ALWAYS append source details at the very end in strictly valid JSON format:
SOURCES: [{"id": "uuid", "type": "meeting/decision/task/imported", "title": "Contextual Title", "source": "Where it came from", "url": "The link URL if provided"}]

ORGANIZATIONAL KNOWLEDGE BASE:
${knowledgeContext}`
        },
        {
          role: 'user',
          content: query
        }
      ]);

      let rawResponse = typeof aiResponse === 'string' ? aiResponse : aiResponse?.response || 'Unable to generate a response.';
      let extractedCitations = [];

      // Extract sources
      const sourcesMatch = rawResponse.match(/SOURCES:\s*(\[.*?\])/s);
      if (sourcesMatch) {
        try {
          extractedCitations = JSON.parse(sourcesMatch[1]);
        } catch { /* ignore parse error */ }
        rawResponse = rawResponse.replace(/SOURCES:\s*\[.*?\]/s, '').trim();
      }

      // Strip all <think> blocks / monologue reasoning before showing to user
      const { content: cleanResponse } = parseThinking(rawResponse);
      setResponse(cleanResponse || rawResponse);
      setCitations(extractedCitations);
    } catch (err) {
      console.error('Knowledge Graph error:', err);
      setError('Failed to query the Knowledge Graph. Please check your AI configuration.');
    }

    setLoading(false);
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-md bg-[#006065] dark:bg-[#053639] text-white p-6 md:p-8">
      <div className="absolute top-0 right-0 p-4 md:p-8 opacity-10 pointer-events-none">
        <Database className="w-40 h-40 text-white" />
      </div>
      
      <div className="relative z-10 max-w-2xl">
        <div className="flex items-center gap-2 mb-3">
          <Lock className="w-4 h-4 text-[#fad503]" />
          <span className="text-xs font-bold text-[#fad503] uppercase tracking-widest">Admin Workspace</span>
        </div>
        
        <h2 className="text-2xl md:text-3xl font-black text-white flex items-center gap-2 mb-3 tracking-tight">
          Enterprise Knowledge Graph
        </h2>
        <p className="text-sm md:text-base text-white/80 mb-8 leading-relaxed">
          Unlock your organization's collective intelligence. Query the entire historical context of decisions, past blockers, and team signals to instantly find answers.
        </p>

        <form onSubmit={handleQuery} className="relative shadow-sm rounded-xl">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., 'Why did we decide to use this approach?' or 'What blockers did we resolve last month?'"
            className="w-full bg-white/10 border border-white/20 text-white rounded-xl pl-5 pr-14 py-4 focus:outline-none focus:border-[#00beac] focus:ring-2 focus:ring-[#00beac]/20 placeholder:text-white/50 text-sm md:text-base transition-all"
          />
          <button 
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 top-2 bottom-2 bg-[#00beac] hover:bg-[#00beac]/90 text-[#00beac] font-bold rounded-lg px-4 flex items-center justify-center transition-colors disabled:opacity-50 shadow-md"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin text-[#00beac]" /> : <ArrowRight className="w-5 h-5 text-[#00beac]" />}
          </button>
        </form>

        {error && (
          <div className="mt-4 flex items-center gap-2 text-rose-300 text-sm bg-rose-500/20 border border-rose-500/30 rounded-lg px-4 py-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {!response && !loading && (
          <div className="mt-8 animate-in fade-in slide-in-from-bottom-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/70 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#fad503]" /> Trending Knowledge Nodes
            </h3>
            <div className="flex flex-wrap gap-2">
              {['Project Roadmap', 'Q3 Planning', 'Design System Updates', 'Recent Blockers'].map((topic) => (
                <button
                  key={topic}
                  onClick={() => {
                    setQuery(`What is the latest context on ${topic}?`);
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-white/10 border border-white/15 rounded-full hover:bg-white/20 hover:text-white transition-colors text-white shadow-sm"
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
        )}

        {response && (
          <div className="mt-6 bg-white/10 border border-white/15 rounded-xl p-5 md:p-6 flex gap-4 animate-in fade-in slide-in-from-bottom-2 shadow-sm text-white">
            <div className="mt-0.5 shrink-0">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Bot className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-sm text-slate-700 dark:text-foreground leading-relaxed whitespace-pre-wrap">{response}</p>
              {citations.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-border">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                    <Database className="w-3 h-3" /> Semantic Graph Links
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {citations.map((cite, i) => {
                      // Attempt to parse new rich JSON citation format or fallback to old ID format
                      let type = '';
                      let id = '';
                      let title = '';
                      let source = '';
                      let url = '';
                      if (typeof cite === 'object') {
                        type = cite.type;
                        id = cite.id;
                        title = cite.title || cite.id;
                        source = cite.source || '';
                        url = cite.url || '';
                      } else {
                        // Fallback for old simple citations like "M:123" or just "123"
                        type = typeof cite === 'string' && cite.includes(':') ? cite.charAt(0) : 'U';
                        id = typeof cite === 'string' && cite.includes(':') ? cite.substring(2) : cite;
                        title = `Node ${id}`;
                      }

                      let route = '#';
                      let icon = Link;
                      let colorClass = "bg-slate-50 dark:bg-background text-slate-600 dark:text-muted-foreground border-slate-200 dark:bg-secondary dark:text-muted-foreground";
                      
                      if (type === 'M' || type === 'meeting') { route = `/clipad/meetings/${id}`; title = title !== `Node ${id}` ? title : 'Meeting Record'; colorClass = "bg-indigo-50 border-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-400"; }
                      if (type === 'V' || type === 'video') { route = `/clipad/videos/${id}`; title = title !== `Node ${id}` ? title : 'Video Record'; colorClass = "bg-purple-50 border-purple-100 text-purple-700 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-400"; }
                      if (type === 'D' || type === 'decision') { title = title !== `Node ${id}` ? title : 'Recorded Decision'; colorClass = "bg-[#006065] dark:bg-[#053639]/10 border-emerald-100 text-[#004e52] dark:bg-[#004e52]/20 dark:border-emerald-800 dark:text-[#00beac]"; }
                      if (type === 'B' || type === 'blocker') { title = title !== `Node ${id}` ? title : 'Blocker'; colorClass = "bg-amber-50 border-amber-100 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400"; }
                      if (type === 'T' || type === 'task') { title = title !== `Node ${id}` ? title : 'Action Item'; colorClass = "bg-blue-50 border-blue-100 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400"; }
                      if (type === 'I' || type === 'imported') { route = url || '#'; title = title !== `Node ${id}` ? title : 'External Knowledge'; colorClass = "bg-sky-50 border-sky-100 text-sky-700 dark:bg-sky-900/20 dark:border-sky-800 dark:text-sky-400"; }
                      
                      return (
                        <div
                          key={i}
                          onClick={() => {
                            if (route !== '#') {
                              if (route.startsWith('http')) window.open(route, '_blank');
                              else navigate(route);
                            }
                          }}
                          className={`p-3 rounded-xl border flex flex-col gap-1 transition-all ${colorClass} ${route !== '#' ? 'hover:shadow-md cursor-pointer hover:-translate-y-0.5' : 'cursor-default'}`}
                        >
                          <div className="flex items-center gap-2 font-semibold text-sm">
                            <Database className="w-3.5 h-3.5 opacity-70" />
                            <span className="truncate">{title}</span>
                          </div>
                          {source && <div className="text-xs opacity-70 ml-5.5 truncate">via {source}</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

