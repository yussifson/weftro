import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { generateText } from '@/lib/cloudflareAI';
import { Brain, FileText, Video, GitBranch, ArrowRight, MessageSquare, AlertTriangle, CheckCircle, Loader2, Network } from 'lucide-react';

export default function MemoryTimeline({ topic, workspaceId }) {
  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState([]);
  const [aiNarrative, setAiNarrative] = useState('');

  useEffect(() => {
    if (topic && workspaceId) {
      generateMemoryGraph();
    } else {
      setLoading(false);
    }
  }, [topic, workspaceId]);

  async function generateMemoryGraph() {
    setLoading(true);
    try {
      const term = `%${topic}%`;

      // Fetch ONLY real data that actually contains the topic
      const [meetingsRes, decisionsRes, blockersRes, videosRes] = await Promise.all([
        supabase
          .from('clipad_meeting_records')
          .select('id, title, created_at, ai_summary')
          .eq('workspace_id', workspaceId)
          .or(`title.ilike.${term},ai_summary.ilike.${term}`)
          .order('created_at', { ascending: true })
          .limit(8),
        supabase
          .from('clipad_decisions')
          .select('id, decision_text, rationale, created_at, status')
          .eq('workspace_id', workspaceId)
          .ilike('decision_text', term)
          .order('created_at', { ascending: true })
          .limit(8),
        supabase
          .from('clipad_blockers')
          .select('id, description, status, detected_at, resolved_at')
          .eq('workspace_id', workspaceId)
          .ilike('description', term)
          .order('detected_at', { ascending: true })
          .limit(5),
        supabase
          .from('clipad_videos')
          .select('id, title, ai_summary, created_at')
          .ilike('title', term)
          .order('created_at', { ascending: true })
          .limit(5),
      ]);

      const nodes = [];

      // Real meeting nodes only
      (meetingsRes.data || []).forEach(m => {
        nodes.push({
          id: `m_${m.id}`,
          type: 'meeting',
          title: m.title,
          date: new Date(m.created_at),
          icon: Video,
          color: 'text-indigo-500',
          bg: 'bg-indigo-50 dark:bg-indigo-500/10',
          description: m.ai_summary
            ? m.ai_summary.substring(0, 180)
            : `This meeting covered topics related to "${topic}".`,
          sourceId: m.id,
          sourceRoute: `/clipad/meetings/${m.id}`,
        });
      });

      // Real decision nodes only
      (decisionsRes.data || []).forEach(d => {
        nodes.push({
          id: `d_${d.id}`,
          type: 'decision',
          title: d.decision_text.substring(0, 80),
          date: new Date(d.created_at),
          icon: GitBranch,
          color: 'text-[#006065]',
          bg: 'bg-[#006065] dark:bg-[#131A2C]/10 dark:bg-[#006065] dark:bg-[#131A2C]/10',
          description: d.rationale || `Decision made regarding "${topic}".`,
          badge: d.status,
          sourceId: d.id,
        });
      });

      // Real blocker nodes only
      (blockersRes.data || []).forEach(b => {
        nodes.push({
          id: `b_${b.id}`,
          type: 'blocker',
          title: `Blocker: ${b.description.substring(0, 60)}`,
          date: new Date(b.detected_at || b.created_at || Date.now()),
          icon: AlertTriangle,
          color: b.status === 'resolved' ? 'text-slate-400' : 'text-amber-500',
          bg: b.status === 'resolved' ? 'bg-slate-50 dark:bg-secondary' : 'bg-amber-50 dark:bg-amber-500/10',
          description: b.status === 'resolved' && b.resolved_at
            ? `Resolved on ${new Date(b.resolved_at).toLocaleDateString()}.`
            : 'Currently open and blocking progress.',
          sourceId: b.id,
        });
      });

      // Real video nodes only
      (videosRes.data || []).forEach(v => {
        nodes.push({
          id: `v_${v.id}`,
          type: 'video',
          title: v.title,
          date: new Date(v.created_at),
          icon: FileText,
          color: 'text-purple-500',
          bg: 'bg-purple-50 dark:bg-purple-500/10',
          description: v.ai_summary?.substring(0, 180) || `Async video recording covering "${topic}".`,
          sourceId: v.id,
          sourceRoute: `/clipad/videos/${v.id}`,
        });
      });

      const sorted = nodes.sort((a, b) => a.date - b.date);
      setTimeline(sorted);

      // If we have real data, ask AI to synthesize a narrative about the topic's evolution
      if (sorted.length > 0) {
        const contextStr = sorted.map(n => `[${n.type.toUpperCase()}] ${n.title}: ${n.description}`).join('\n');
        try {
          const narrative = await generateText([
            {
              role: 'system',
              content: 'You are an organizational memory analyst. Write a 2-3 sentence narrative explaining how this topic has evolved over time based ONLY on the provided data. Be specific. Do not add any facts not in the data.',
            },
            {
              role: 'user',
              content: `Topic: "${topic}"\n\nTimeline events:\n${contextStr}`,
            },
          ]);
          setAiNarrative(typeof narrative === 'string' ? narrative : '');
        } catch { /* Narrative is optional */ }
      }

    } catch (err) {
      console.error('[MemoryTimeline]', err);
    } finally {
      setLoading(false);
    }
  }

  if (!topic) return null;

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-card rounded-3xl border border-slate-200 dark:border-border">
        <Network className="w-8 h-8 text-indigo-400 animate-pulse mb-4" />
        <p className="text-sm font-medium text-slate-500 dark:text-muted-foreground">Tracing memory graph for "{topic}"...</p>
      </div>
    );
  }

  if (timeline.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-card rounded-3xl border border-slate-200 dark:border-border">
        <Brain className="w-8 h-8 text-slate-300 dark:text-slate-600 dark:text-muted-foreground mb-4" />
        <p className="text-sm font-medium text-slate-500 dark:text-muted-foreground">No recorded history found for "{topic}".</p>
        <p className="text-xs text-slate-400 mt-1">As your team records meetings, decisions, and videos mentioning this topic, they will appear here.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-3xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md">
          <Brain className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-foreground leading-none mb-1">Memory Graph</h3>
          <p className="text-xs font-semibold text-slate-500 dark:text-muted-foreground uppercase tracking-widest">Tracing: {topic}</p>
        </div>
      </div>

      {/* AI Narrative */}
      {aiNarrative && (
        <div className="mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 rounded-xl text-sm text-slate-700 dark:text-foreground leading-relaxed">
          <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider block mb-1">AI Analysis</span>
          {aiNarrative}
        </div>
      )}

      <div className="relative pl-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-indigo-500 before:via-purple-500 before:to-emerald-500">
        <div className="space-y-8">
          {timeline.map((node) => (
            <div key={node.id} className="relative">
              <div className="absolute -left-[33px] top-1 w-6 h-6 rounded-full bg-white dark:bg-card border-4 border-white dark:border-slate-900 flex items-center justify-center z-10 shadow-sm">
                <div className={`w-3 h-3 rounded-full ${node.bg}`}></div>
              </div>
              
              <div className="bg-slate-50 dark:bg-secondary/30 rounded-2xl p-4 border border-slate-100 dark:border-border/50 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${node.bg} ${node.color}`}>
                      <node.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{node.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-muted-foreground">{node.date.toLocaleDateString()} at {node.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-slate-600 dark:text-muted-foreground mt-2 ml-11">
                  {node.description}
                </p>
                {node.sourceRoute && (
                  <div className="mt-3 ml-11">
                    <a href={node.sourceRoute} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors">
                      View Source <ArrowRight className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

