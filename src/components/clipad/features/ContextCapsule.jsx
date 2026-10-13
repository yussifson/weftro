import React, { useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Sparkles, Brain, FileText, CheckCircle, ShieldAlert, Loader2, RefreshCw } from 'lucide-react';
import { generateText } from '@/lib/cloudflareAI';

export default function ContextCapsule({ spaceId, hasFullIntelligence }) {
  const [capsule, setCapsule] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateCapsule = async () => {
    if (!spaceId || !hasFullIntelligence) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch meetings for the space first
      const { data: meetingRecords } = await supabase
        .from('clipad_meeting_records')
        .select('id, title, ai_summary, created_at')
        .eq('space_id', spaceId)
        .order('created_at', { ascending: false })
        .limit(3);
        
      const meetings = meetingRecords || [];
      const meetingIds = meetings.map(m => m.id);

      // 2. Fetch other real data from the space
      let tasksRes = { data: [] };
      if (meetingIds.length > 0) {
        tasksRes = await supabase
          .from('clipad_action_items')
          .select('id, title, is_complete, created_at')
          .in('meeting_id', meetingIds)
          .eq('is_complete', false)
          .order('created_at', { ascending: false })
          .limit(5);
      }

      const [decisionsRes, blockersRes] = await Promise.all([
        supabase
          .from('clipad_decisions')
          .select('id, decision_text, rationale, status, created_at')
          .eq('team_space_id', spaceId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('clipad_blockers')
          .select('id, description, status, detected_at')
          .eq('team_space_id', spaceId)
          .eq('status', 'open')
          .limit(5)
      ]);

      const decisions = decisionsRes.data || [];
      const blockers = blockersRes.data || [];
      const tasks = tasksRes.data || [];

      // Ask AI to generate an intelligent narrative summary
      const hasData = decisions.length > 0 || blockers.length > 0 || tasks.length > 0 || meetings.length > 0;

      let aiNarrative = null;
      if (hasData) {
        const contextStr = [
          decisions.length > 0 ? `Active Decisions: ${decisions.map(d => d.decision_text).join('; ')}` : '',
          blockers.length > 0 ? `Open Blockers: ${blockers.map(b => b.description).join('; ')}` : '',
          tasks.length > 0 ? `Open Tasks: ${tasks.map(t => t.title).join('; ')}` : '',
          meetings.length > 0 ? `Recent Meetings: ${meetings.map(m => `"${m.title}" — ${m.ai_summary?.substring(0, 100) || 'No summary'}`).join('; ')}` : '',
        ].filter(Boolean).join('\n');

        try {
          const result = await generateText([
            {
              role: 'system',
              content: 'You are an AI assistant helping a team member get up to speed on their space. Write a brief, friendly 2-3 sentence narrative summary of the current state of this space based on the data provided. Be specific and helpful. Focus on what matters most right now.',
            },
            { role: 'user', content: contextStr },
          ]);
          aiNarrative = typeof result === 'string' ? result : result?.response;
        } catch (aiErr) {
          console.warn('AI narrative failed, showing raw data:', aiErr);
        }
      }

      setCapsule({
        decisions,
        blockers,
        tasks,
        meetings,
        aiNarrative,
        generated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('ContextCapsule error:', err);
      setError('Failed to generate context capsule. Please try again.');
    }
    setLoading(false);
  };

  if (!hasFullIntelligence) {
    return (
      <button
        className="w-full py-3 px-4 rounded-xl border border-slate-200 dark:border-border/50 bg-slate-50 dark:bg-secondary/30 flex items-center justify-center gap-2 text-slate-400 cursor-not-allowed opacity-70"
        title="Upgrade to Pro or Enterprise to access AI Context Capsules"
        disabled
      >
        <ShieldAlert className="w-5 h-5 text-indigo-400" />
        Context Capsules Locked — Upgrade to Pro
      </button>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-secondary/20 border border-slate-200 dark:border-border/50 rounded-xl p-5">
      {!capsule ? (
        <div className="text-center">
          <Brain className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-foreground mb-2">Need to get up to speed?</h3>
          <p className="text-sm text-slate-500 dark:text-muted-foreground mb-4">
            Generate an AI Context Capsule to instantly summarize active decisions, open blockers, and pending tasks in this space.
          </p>
          <button
            onClick={generateCapsule}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 px-4 rounded-lg transition-colors flex justify-center items-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Sparkles className="w-4 h-4" /> Generate Capsule</>}
          </button>
          {error && <p className="text-xs text-rose-500 dark:text-rose-400 mt-2">{error}</p>}
        </div>
      ) : (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex justify-between items-center border-b border-slate-200 dark:border-border/50 pb-3">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" /> Context Capsule
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">{new Date(capsule.generated_at).toLocaleTimeString()}</span>
              <button onClick={generateCapsule} disabled={loading} className="text-slate-400 hover:text-indigo-500 transition-colors p-1">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* AI Narrative Summary */}
          {capsule.aiNarrative && (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">AI Summary</span>
              </div>
              <p className="text-sm text-slate-700 dark:text-foreground leading-relaxed">{capsule.aiNarrative}</p>
            </div>
          )}

          {/* Active Decisions */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 dark:text-foreground mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#006065]" /> Active Decisions
            </h4>
            {capsule.decisions.length === 0 ? (
              <p className="text-xs text-slate-400">No active decisions recorded.</p>
            ) : (
              <ul className="space-y-1.5">
                {capsule.decisions.map(d => (
                  <li key={d.id} className="text-sm text-slate-700 dark:text-foreground bg-white dark:bg-card/40 p-2 rounded-lg border border-slate-100 dark:border-border/30">
                    {d.decision_text}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Open Blockers */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 dark:text-foreground mb-2 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500" /> Open Blockers
            </h4>
            {capsule.blockers.length === 0 ? (
              <p className="text-xs text-slate-400">No active blockers — team is unblocked!</p>
            ) : (
              <ul className="space-y-1.5">
                {capsule.blockers.map(b => (
                  <li key={b.id} className="text-sm text-amber-700 dark:text-amber-200/80 bg-amber-50 dark:bg-amber-500/5 p-2 rounded-lg border border-amber-100 dark:border-amber-500/20">
                    {b.description}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Open Tasks */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 dark:text-foreground mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" /> Open Action Items
            </h4>
            {capsule.tasks.length === 0 ? (
              <p className="text-xs text-slate-400">No open tasks right now.</p>
            ) : (
              <ul className="space-y-1.5">
                {capsule.tasks.map(t => (
                  <li key={t.id} className="text-sm text-slate-700 dark:text-foreground bg-white dark:bg-card/40 p-2 rounded-lg border border-slate-100 dark:border-border/30">
                    {t.title}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

