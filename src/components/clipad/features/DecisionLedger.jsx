import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { ShieldAlert, CheckCircle, Clock, Archive, BrainCircuit, Sparkles, Loader2, Star, Bot } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { detectDecisions, writeOrgEvent } from '@/lib/clipadIntelligence';
import { isAdmin as isGlobalAdmin, isSpaceman } from '@/lib/constants';

export default function DecisionLedger({ workspaceId, spaceId, hasFullIntelligence, teamColor }) {
  const { user } = useAuth();
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [detected, setDetected] = useState(0);

  // RBAC checks
  const isAdmin = isGlobalAdmin(user) || isSpaceman(user);

  useEffect(() => {
    if (!spaceId) return;

    const fetchDecisions = async () => {
      setLoading(true);
      let query = supabase
        .from('clipad_decisions')
        .select('*')
        .eq('team_space_id', spaceId)
        .order('created_at', { ascending: false });

      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      }

      const { data, error } = await query;
      if (error) console.warn('DecisionLedger:', error.message);
      if (data) setDecisions(data);
      setLoading(false);
    };

    fetchDecisions();
  }, [workspaceId, spaceId, hasFullIntelligence]);

  const handleAIDetect = async () => {
    if (!spaceId) return;
    setDetecting(true);
    setDetected(0);
    try {
      // Pull recent meeting summaries for this space
      const { data: meetings } = await supabase
        .from('clipad_meeting_records')
        .select('id, title, ai_summary, transcript')
        .eq('space_id', spaceId)
        .order('created_at', { ascending: false })
        .limit(5);

      let totalAdded = 0;
      for (const meeting of (meetings || [])) {
        const text = [meeting.ai_summary, meeting.transcript].filter(Boolean).join('\n');
        if (!text) continue;
        const found = await detectDecisions(text, {
          team_space_id: spaceId,
          workspace_id: workspaceId,
          related_meeting_id: meeting.id,
        });
        for (const d of found) {
          // Deduplicate: skip if we already have a decision with the same text (case-insensitive)
          const { data: existing } = await supabase
            .from('clipad_decisions')
            .select('id')
            .eq('team_space_id', spaceId)
            .ilike('decision_text', d.decision_text.substring(0, 80))
            .limit(1);
          if (existing && existing.length > 0) continue;

          // Populate reasoning_text from rationale if available
          const insertPayload = {
            ...d,
            reasoning_text: d.rationale || null,
          };

          const { error } = await supabase.from('clipad_decisions').insert(insertPayload);
          if (!error) {
            totalAdded++;
            await writeOrgEvent({
              space_id: spaceId,
              workspace_id: workspaceId,
              event_type: 'decision_created',
              title: d.decision_text.substring(0, 80),
              actor_id: user?.id,
              source_id: meeting.id,
              source_table: 'clipad_meeting_records',
              importance: d.importance_score || 4,
            });
          }
        }
      }
      setDetected(totalAdded);
      if (totalAdded > 0) fetchDecisions();
    } catch (err) {
      console.warn('AI Detect error:', err.message);
    } finally {
      setDetecting(false);
    }
  };

  const handleSupersede = async (decisionId) => {
    if (!isAdmin) return;
    const { error } = await supabase
      .from('clipad_decisions')
      .update({ status: 'superseded' })
      .eq('id', decisionId)
      .eq('workspace_id', workspaceId);

    if (!error) {
      setDecisions(decisions.map(d => d.id === decisionId ? { ...d, status: 'superseded' } : d));
    }
  };

  if (!hasFullIntelligence) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-slate-200 dark:border-border/50 rounded-xl bg-slate-50 dark:bg-secondary/20">
        <ShieldAlert className="w-12 h-12 text-indigo-400 mb-4" />
        <h3 className="text-xl font-medium text-slate-900 dark:text-foreground mb-2">Decision Ledger is Locked</h3>
        <p className="text-slate-500 dark:text-muted-foreground max-w-md">
          Upgrade to Pro or Enterprise to access the Full Intelligence Layer and maintain an immutable ledger of team decisions.
        </p>
      </div>
    );
  }

  // Use teamColor for the active badge, defaulting to emerald if none provided
  const badgeColorClass = teamColor 
    ? `bg-gradient-to-br ${teamColor} text-white border-transparent` 
    : 'bg-emerald-100 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-transparent';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Decision Ledger
          </h2>
          <p className="text-sm text-slate-500 dark:text-muted-foreground mt-1">Immutable record of team decisions to prevent relitigation.</p>
        </div>
        {hasFullIntelligence && (
          <button
            onClick={handleAIDetect}
            disabled={detecting}
            className="flex items-center justify-center gap-2 px-6 py-3.5 sm:py-2.5 rounded-2xl sm:rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-[15px] sm:text-sm font-bold disabled:opacity-50 transition-all shadow-md active:scale-[0.98] w-full sm:w-auto mt-2 sm:mt-0"
          >
            {detecting ? <Loader2 className="w-5 h-5 sm:w-4 sm:h-4 animate-spin" /> : <Sparkles className="w-5 h-5 sm:w-4 sm:h-4" />}
            {detecting ? 'Detecting...' : detected > 0 ? `${detected} Found` : 'AI Detect'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : decisions.length === 0 ? (
        <div className="p-10 text-center text-slate-500 dark:text-muted-foreground border border-slate-200 dark:border-border/50 rounded-xl bg-slate-50 dark:bg-secondary/30 flex flex-col items-center gap-3">
          <BrainCircuit className="w-10 h-10 text-slate-300 dark:text-slate-600" />
          <p>No decisions logged yet. Decisions are automatically extracted from meetings and chats via AI.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {decisions.map(decision => (
            <div key={decision.id} className={`p-5 rounded-xl border transition-colors ${decision.status === 'active' ? 'border-slate-200 dark:border-border bg-white dark:bg-secondary/50 shadow-sm' : 'border-slate-200 dark:border-border/50 bg-slate-50 dark:bg-secondary/20 opacity-70'}`}>
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    {decision.status === 'active' ? (
                      <span className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${badgeColorClass}`}>
                        <CheckCircle className="w-3.5 h-3.5" /> Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 dark:bg-slate-400/10 px-2.5 py-1 rounded-full border border-slate-200 dark:border-transparent">
                        <Archive className="w-3.5 h-3.5" /> Superseded
                      </span>
                    )}
                    {decision.ai_detected && (
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-500/20">
                        <Bot className="w-2.5 h-2.5" /> AI
                      </span>
                    )}
                    {decision.importance_score >= 7 && (
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-500/20">
                        <Star className="w-2.5 h-2.5" /> High Impact
                      </span>
                    )}
                    <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(decision.created_at).toLocaleDateString()}
                    </span>
                    {decision.reversal_cost && (
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${decision.reversal_cost === 'high' ? 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400' : decision.reversal_cost === 'medium' ? 'border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400' : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-muted-foreground'}`}>
                        {decision.reversal_cost} Reversal Cost
                      </span>
                    )}
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-foreground mb-3">{decision.decision_text}</h4>
                  {decision.reasoning_text && (
                    <div className="text-sm text-slate-600 dark:text-muted-foreground bg-slate-50 dark:bg-card/50 p-4 rounded-xl border border-slate-100 dark:border-border/50 relative">
                      <div className="absolute top-0 bottom-0 left-0 w-1 bg-slate-200 dark:bg-slate-700 rounded-l-xl"></div>
                      <span className="font-bold text-slate-800 dark:text-foreground block mb-1 text-xs uppercase tracking-wider">AI Reasoning</span>
                      {decision.reasoning_text}
                    </div>
                  )}
                </div>
                {isAdmin && decision.status === 'active' && (
                  <button 
                    onClick={() => handleSupersede(decision.id)}
                    className="text-xs font-semibold bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-600 dark:text-foreground px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 transition-colors whitespace-nowrap shadow-sm"
                  >
                    Mark Superseded
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
