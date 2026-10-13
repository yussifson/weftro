import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Activity, TrendingDown, TrendingUp, Users, Loader2, RefreshCw } from 'lucide-react';
import { generateText } from '@/lib/cloudflareAI';

export default function MeetingNecessityWidget({ workspaceId }) {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [lastAnalyzed, setLastAnalyzed] = useState(null);

  useEffect(() => {
    if (workspaceId) {
      loadMetrics();

      const sub = supabase
        .channel('public:clipad_meeting_metrics')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'clipad_meeting_metrics', filter: `workspace_id=eq.${workspaceId}` }, loadMetrics)
        .subscribe();

      return () => supabase.removeChannel(sub);
    }
  }, [workspaceId]);

  const loadMetrics = async () => {
    setLoading(true);
    // Try to load existing computed metrics first
    const { data: existing } = await supabase
      .from('clipad_meeting_metrics')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (existing && existing.length > 0) {
      setMetrics(existing);
      setLastAnalyzed(existing[0]?.created_at);
      setLoading(false);
      return;
    }

    // No metrics yet — auto-analyze from raw meetings
    await analyzeFromMeetings();
  };

  const analyzeFromMeetings = async () => {
    setAnalyzing(true);

    try {
      // Fetch the most recent meetings with summaries
      const { data: meetings } = await supabase
        .from('clipad_meeting_records')
        .select('id, title, ai_summary, created_at, ended_at')
        .eq('company_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(8);

      if (!meetings || meetings.length === 0) {
        setMetrics([]);
        setAnalyzing(false);
        setLoading(false);
        return;
      }

      // For each meeting, ask AI to compute a necessity score
      const analyzedMetrics = await Promise.all(
        meetings.slice(0, 5).map(async (meeting) => {
          if (!meeting.ai_summary || meeting.ai_summary === 'No transcript recorded.' || meeting.ai_summary === 'Generating summary...') {
            return {
              id: meeting.id,
              title: meeting.title || 'Untitled Meeting',
              necessity_score: 50,
              recommendation: 'Optimal',
              created_at: meeting.created_at,
              engagement_metrics: { participant_count: 0 },
              ai_reasoning: 'No transcript data available for analysis.',
            };
          }

          try {
            const aiResult = await generateText([
              {
                role: 'system',
                content: 'You are a meeting efficiency analyst. Analyze the meeting summary and return ONLY valid JSON with these exact keys: "necessity_score" (integer 0-100, where 100 = absolutely critical, 50 = somewhat useful, 0 = could have been an email), "recommendation" (one of: "Critical", "Optimal", "Reducible", "Redundant"), "reasoning" (one sentence explaining the score). Do NOT wrap in markdown.',
              },
              {
                role: 'user',
                content: `Meeting title: "${meeting.title}"\nMeeting summary: ${meeting.ai_summary.substring(0, 800)}`,
              },
            ]);

            const text = typeof aiResult === 'string' ? aiResult : aiResult?.response || '';
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanText);

            return {
              id: meeting.id,
              title: meeting.title || 'Untitled Meeting',
              necessity_score: Math.min(100, Math.max(0, parsed.necessity_score || 50)),
              recommendation: parsed.recommendation || 'Optimal',
              created_at: meeting.created_at,
              engagement_metrics: { participant_count: 0 },
              ai_reasoning: parsed.reasoning || '',
            };
          } catch {
            return {
              id: meeting.id,
              title: meeting.title || 'Untitled Meeting',
              necessity_score: 50,
              recommendation: 'Optimal',
              created_at: meeting.created_at,
              engagement_metrics: { participant_count: 0 },
              ai_reasoning: '',
            };
          }
        })
      );

      // Save results to the metrics table for caching
      const inserts = analyzedMetrics.map(m => ({
        workspace_id: workspaceId,
        meeting_id: m.id,
        title: m.title,
        necessity_score: m.necessity_score,
        recommendation: m.recommendation,
        ai_reasoning: m.ai_reasoning,
        engagement_metrics: m.engagement_metrics,
        created_at: new Date().toISOString(),
      }));

      const { error: insertError } = await supabase
        .from('clipad_meeting_metrics')
        .upsert(inserts, { onConflict: 'workspace_id,meeting_id', ignoreDuplicates: false });

      if (insertError) {
        console.warn('Could not cache metrics (table may not exist yet):', insertError.message);
      }

      setMetrics(analyzedMetrics);
      setLastAnalyzed(new Date().toISOString());
    } catch (err) {
      console.error('Meeting necessity analysis failed:', err);
    }

    setAnalyzing(false);
    setLoading(false);
  };

  if (loading || analyzing) {
    return (
      <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-slate-200 dark:border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-indigo-500" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-foreground">Meeting Necessity Index</h2>
        </div>
        <div className="flex items-center gap-3 py-6 justify-center text-slate-400 dark:text-slate-500 dark:text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">{analyzing ? 'AI is analyzing your meetings…' : 'Loading…'}</span>
        </div>
      </div>
    );
  }

  const avgScore = metrics.length > 0
    ? Math.round(metrics.reduce((acc, m) => acc + (m.necessity_score || 0), 0) / metrics.length)
    : 0;

  return (
    <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-slate-200 dark:border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-500" />
            Meeting Necessity Index
          </h2>
          <p className="text-sm text-slate-500 dark:text-muted-foreground mt-1">AI analysis of meeting ROI and engagement.</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className={`text-2xl font-bold ${avgScore > 70 ? 'text-[#006065] dark:text-[#00beac]' : avgScore > 40 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
            {avgScore}
            <span className="text-xs font-medium text-slate-500 dark:text-muted-foreground block uppercase tracking-wider">Avg Score</span>
          </div>
          <button
            onClick={analyzeFromMeetings}
            disabled={analyzing}
            className="text-xs text-slate-400 hover:text-primary transition-colors flex items-center gap-1"
            title="Re-analyze"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {metrics.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-muted-foreground italic">No meetings have been analyzed yet. Run meetings and the AI will compute necessity scores automatically.</p>
        ) : (
          metrics.map(m => (
            <div key={m.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-secondary/50 rounded-lg border border-slate-100 dark:border-border/50">
              <div className="flex-1 min-w-0 pr-4">
                <p className="text-sm font-medium text-slate-900 dark:text-foreground truncate">
                  {m.title || 'Untitled Meeting'}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-slate-500 dark:text-muted-foreground flex items-center gap-1">
                    <Users className="w-3 h-3" /> {m.engagement_metrics?.participant_count || 0}
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    m.necessity_score > 70 ? 'bg-[#006065] dark:bg-[#131A2C]/20 text-[#004e52] dark:bg-[#004e52]/30 dark:text-[#00beac]' :
                    m.necessity_score > 40 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {m.recommendation || 'Optimal'}
                  </span>
                </div>
                {m.ai_reasoning && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 dark:text-muted-foreground mt-1 line-clamp-1">{m.ai_reasoning}</p>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${m.necessity_score > 70 ? 'bg-[#006065] dark:bg-[#131A2C]' : m.necessity_score > 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${m.necessity_score || 0}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-foreground w-6 text-right">
                  {m.necessity_score}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

