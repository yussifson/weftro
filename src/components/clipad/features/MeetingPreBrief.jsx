import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { generateText } from '@/lib/cloudflareAI';
import { format, subDays } from 'date-fns';
import {
  Sparkles, RefreshCw, Clock, AlertTriangle, CheckCircle2, Scale,
  X, ChevronDown, ChevronUp, FileText, Users, Calendar, Zap,
  Play, Target, TrendingUp, Shield
} from 'lucide-react';

/**
 * MeetingPreBrief
 * Props:
 *   spaceId: string â€” the team space to brief on
 *   meetingTitle?: string â€” optional meeting title for context
 *   onClose?: () => void â€” close handler
 *   compact?: boolean â€” small/embedded mode
 */
export default function MeetingPreBrief({ spaceId, meetingTitle, onClose, compact = false }) {
  const { user } = useAuth();
  const companyId = user?.user_metadata?.company_id || user?.company_id;

  const [context, setContext] = useState(null);
  const [brief, setBrief] = useState(null);
  const [loadingContext, setLoadingContext] = useState(true);
  const [generatingBrief, setGeneratingBrief] = useState(false);
  const [expanded, setExpanded] = useState(!compact);

  const since14 = subDays(new Date(), 14).toISOString();

  const loadContext = useCallback(async () => {
    if (!spaceId) return;
    setLoadingContext(true);
    try {
      const [blockers, commitments, decisions, knowledge] = await Promise.allSettled([
        supabase.from('clipad_blockers').select('id, description, created_at').eq('team_space_id', spaceId).eq('resolved', false).limit(5),
        supabase.from('clipad_commitments').select('id, commitment_text, owner_name, due_date, status').eq('team_space_id', spaceId).in('status', ['open', 'at_risk']).limit(5),
        supabase.from('clipad_decisions').select('id, decision_text, created_at, outcome_status').eq('team_space_id', spaceId).order('created_at', { ascending: false }).limit(4),
        supabase.from('clipad_imported_knowledge').select('id, title, provider, ai_summary, imported_at').eq('team_space_id', spaceId).gte('imported_at', since14).order('imported_at', { ascending: false }).limit(5),
      ]);

      setContext({
        blockers: blockers.status === 'fulfilled' ? (blockers.value.data || []) : [],
        commitments: commitments.status === 'fulfilled' ? (commitments.value.data || []) : [],
        decisions: decisions.status === 'fulfilled' ? (decisions.value.data || []) : [],
        knowledge: knowledge.status === 'fulfilled' ? (knowledge.value.data || []) : [],
      });
    } catch (e) {
      console.error('PreBrief context error:', e);
    } finally {
      setLoadingContext(false);
    }
  }, [spaceId]);

  useEffect(() => { loadContext(); }, [loadContext]);

  const generateBrief = async () => {
    if (!context) return;
    setGeneratingBrief(true);
    try {
      const prompt = `You are an executive meeting coach. Generate a punchy pre-meeting briefing so participants can walk in fully prepared.

MEETING: "${meetingTitle || 'Upcoming Meeting'}"
DATE: ${format(new Date(), 'EEEE, MMMM d, yyyy')}

OPEN BLOCKERS (${context.blockers.length}):
${context.blockers.map(b => `- ${b.description}`).join('\n') || 'None'}

OPEN COMMITMENTS (${context.commitments.length}):
${context.commitments.map(c => `- ${c.commitment_text} (${c.owner_name || 'unassigned'}, status: ${c.status})`).join('\n') || 'None'}

RECENT DECISIONS (${context.decisions.length}):
${context.decisions.map(d => `- ${d.decision_text}`).join('\n') || 'None'}

RECENT KNOWLEDGE (${context.knowledge.length} items synced in last 14 days):
${context.knowledge.map(k => `- [${k.provider}] ${k.title}`).join('\n') || 'None'}

Generate a sharp, executive-quality pre-meeting brief. Respond in valid JSON only:
{
  "headline": "3-5 word meeting context descriptor",
  "one_liner": "Single sentence capturing the most critical thing to resolve in this meeting",
  "must_discuss": ["item 1", "item 2", "item 3"],
  "watch_out_for": "The biggest risk going into this meeting",
  "quick_wins": "1-2 things the team can resolve quickly in this meeting",
  "recommended_agenda_order": ["first item", "second item", "third item"],
  "pre_read_note": "Optional single insight participants should know before joining"
}`;

      const raw = await generateText([
        { role: 'system', content: 'You are a data extraction AI. Respond ONLY with valid JSON.' },
        { role: 'user', content: prompt }
      ]);
      setBrief(JSON.parse((raw || '').replace(/```json|```/g, '').trim()));
    } catch (e) {
      setBrief({ error: true, one_liner: 'Brief generation failed. Check AI connection.' });
    } finally {
      setGeneratingBrief(false);
    }
  };

  const totalSignals = (context?.blockers.length || 0) + (context?.commitments.length || 0) + (context?.decisions.length || 0);

  if (compact && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full flex items-center gap-3 p-3 rounded-xl bg-violet-500/5 border border-violet-500/20 hover:bg-violet-500/10 transition-colors text-left"
      >
        <Sparkles className="w-4 h-4 text-violet-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Orbit Pre-Brief</p>
          <p className="text-xs text-muted-foreground">{totalSignals} signals loaded â€” tap to expand</p>
        </div>
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-violet-500/30 bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/5 bg-violet-500/5">
        <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">Orbit Pre-Brief</p>
          {meetingTitle && <p className="text-xs text-muted-foreground truncate">{meetingTitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {compact && (
            <button onClick={() => setExpanded(false)} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-white/5 transition-colors">
              <ChevronUp className="w-4 h-4" />
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-white/5 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Context signals */}
        {loadingContext ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-8 rounded-lg bg-white/5 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Blockers', value: context?.blockers.length, color: 'red', icon: AlertTriangle },
              { label: 'Open Commitments', value: context?.commitments.length, color: 'amber', icon: CheckCircle2 },
              { label: 'Recent Decisions', value: context?.decisions.length, color: 'indigo', icon: Scale },
            ].map(s => {
              const Icon = s.icon;
              return (
                <div key={s.label} className={`p-2 rounded-xl text-center bg-${s.color}-500/5 border border-${s.color}-500/20`}>
                  <p className={`text-lg font-black text-${s.color}-400`}>{s.value}</p>
                  <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide mt-0.5 leading-tight">{s.label}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Context lists */}
        {!loadingContext && context && (
          <div className="space-y-3">
            {context.blockers.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1.5">Unresolved Blockers</p>
                <div className="space-y-1">
                  {context.blockers.map(b => (
                    <div key={b.id} className="flex items-start gap-2 text-xs text-foreground/80">
                      <AlertTriangle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{b.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {context.commitments.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1.5">Open Commitments</p>
                <div className="space-y-1">
                  {context.commitments.map(c => (
                    <div key={c.id} className="flex items-start gap-2 text-xs text-foreground/80">
                      <CheckCircle2 className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{c.commitment_text} {c.owner_name ? `(${c.owner_name})` : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {context.decisions.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1.5">Recent Decisions</p>
                <div className="space-y-1">
                  {context.decisions.map(d => (
                    <div key={d.id} className="flex items-start gap-2 text-xs text-foreground/80">
                      <Scale className="w-3 h-3 text-indigo-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{d.decision_text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Generate brief button */}
        {!brief && !generatingBrief && (
          <button
            onClick={generateBrief}
            disabled={loadingContext}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-500/10 border border-violet-500/30 text-violet-400 rounded-xl text-sm font-semibold hover:bg-violet-500/20 transition-colors disabled:opacity-40"
          >
            <Zap className="w-4 h-4" />
            Generate Orbit Pre-Brief
          </button>
        )}

        {generatingBrief && (
          <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
            <RefreshCw className="w-4 h-4 animate-spin text-violet-400" />
            <span className="text-sm">Orbit is preparing your brief...</span>
          </div>
        )}

        {/* AI Brief output */}
        {brief && !brief.error && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-violet-500/5 border border-violet-500/20">
              <p className="text-xs font-black text-violet-300 uppercase tracking-wider mb-1">{brief.headline || 'Meeting Focus'}</p>
              <p className="text-sm font-semibold text-foreground">{brief.one_liner}</p>
            </div>

            {brief.must_discuss?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-foreground uppercase tracking-wider mb-1.5">Must Discuss</p>
                <div className="space-y-1">
                  {brief.must_discuss.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                      <span className="w-4 h-4 rounded-full bg-primary/20 text-primary text-[9px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {brief.watch_out_for && (
              <div className="p-2.5 rounded-xl bg-red-500/5 border border-red-500/20">
                <p className="text-[9px] font-bold text-red-400 uppercase tracking-wider mb-0.5">Watch Out For</p>
                <p className="text-xs text-foreground/80">{brief.watch_out_for}</p>
              </div>
            )}

            {brief.quick_wins && (
              <div className="p-2.5 rounded-xl bg-[#006065] dark:bg-[#131A2C]/5 border border-[#006065]/20">
                <p className="text-[9px] font-bold text-[#00beac] uppercase tracking-wider mb-0.5">Quick Wins</p>
                <p className="text-xs text-foreground/80">{brief.quick_wins}</p>
              </div>
            )}

            {brief.recommended_agenda_order?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Suggested Agenda Order</p>
                <div className="space-y-1">
                  {brief.recommended_agenda_order.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="w-4 h-4 rounded bg-white/5 text-[9px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={generateBrief}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Regenerate
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

