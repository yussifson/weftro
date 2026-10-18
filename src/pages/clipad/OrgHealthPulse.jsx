import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { generateText } from '@/lib/cloudflareAI';
import { subDays, format } from 'date-fns';
import { RefreshCw,
  Sparkles, Shield, Target, CheckCircle2, Clock, ArrowLeft
} from 'lucide-react';

const GRADE_CONFIG = {
  A: { color: 'emerald', label: 'Excellent', emoji: '🌟' },
  B: { color: 'green', label: 'Good', emoji: '✅' },
  C: { color: 'amber', label: 'Fair', emoji: '⚠️' },
  D: { color: 'orange', label: 'Poor', emoji: '🔻' },
  F: { color: 'red', label: 'Critical', emoji: '🚨' },
};

function PulseGauge({ score }) {
  const pct = Math.min(100, Math.max(0, score));
  const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 45 ? 'D' : 'F';
  const cfg = GRADE_CONFIG[grade];
  // Arc SVG
  const r = 52;
  const cx = 70, cy = 70;
  const startAngle = Math.PI;
  const endAngle = 2 * Math.PI;
  const arcLen = r * Math.PI;
  const dash = (pct / 100) * arcLen;
  const trackD = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width="140" height="80" viewBox="0 0 140 80">
          {/* Track */}
          <path d={trackD} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" strokeLinecap="round" />
          {/* Fill */}
          <path
            d={trackD}
            fill="none"
            stroke={`var(--color-${cfg.color})`}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${arcLen - dash}`}
            style={{
              stroke: cfg.color === 'emerald' ? '#10b981' :
                      cfg.color === 'green' ? '#22c55e' :
                      cfg.color === 'amber' ? '#f59e0b' :
                      cfg.color === 'orange' ? '#f97316' : '#ef4444',
              transition: 'stroke-dasharray 1.2s ease',
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span className={`text-3xl font-black text-${cfg.color}-400`}>{pct}</span>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Health</span>
        </div>
      </div>
      <div className={`mt-2 px-3 py-1 rounded-full text-xs font-black border bg-${cfg.color}-500/10 border-${cfg.color}-500/30 text-${cfg.color}-400`}>
        {cfg.emoji} Grade {grade} — {cfg.label}
      </div>
    </div>
  );
}

export default function OrgHealthPulse() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const companyId = user?.user_metadata?.company_id || user?.company_id;

  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiPulse, setAiPulse] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const isLegacy = window.location.pathname.startsWith('/clipad');
  const basePath = isLegacy ? '/clipad' : '';
  const since7 = subDays(new Date(), 7).toISOString();
  const since30 = subDays(new Date(), 30).toISOString();

  const loadMetrics = useCallback(async () => {
    if (companyId === undefined) return;
    setLoading(true);
    try {
      const [blockers, commitments, decisions, meetings, knowledge, videos] = await Promise.allSettled([
        supabase.from('clipad_blockers').select('id, resolved, created_at').eq('workspace_id', companyId).limit(200),
        supabase.from('clipad_commitments').select('id, status, due_date, created_at').eq('workspace_id', companyId).limit(500),
        supabase.from('clipad_decisions').select('id, created_at').eq('workspace_id', companyId).gte('created_at', since30).limit(100),
        supabase.from('clipad_meetings').select('id, created_at, duration_seconds').eq('workspace_id', companyId).gte('created_at', since30).limit(100),
        supabase.from('clipad_imported_knowledge').select('id, imported_at').eq('company_id', companyId).gte('imported_at', since7).limit(100),
        supabase.from('clipad_videos').select('id, created_at').eq('workspace_id', companyId).gte('created_at', since7).limit(50),
      ]);

      const bl = blockers.status === 'fulfilled' ? (blockers.value.data || []) : [];
      const cm = commitments.status === 'fulfilled' ? (commitments.value.data || []) : [];
      const dc = decisions.status === 'fulfilled' ? (decisions.value.data || []) : [];
      const mt = meetings.status === 'fulfilled' ? (meetings.value.data || []) : [];
      const kn = knowledge.status === 'fulfilled' ? (knowledge.value.data || []) : [];
      const vd = videos.status === 'fulfilled' ? (videos.value.data || []) : [];

      const openBlockers = bl.filter(b => !b.resolved).length;
      const resolvedBlockers = bl.filter(b => b.resolved).length;
      const blockerResolutionRate = bl.length > 0 ? Math.round((resolvedBlockers / bl.length) * 100) : 100;

      const overdueCommitments = cm.filter(c => c.status === 'open' && c.due_date && new Date(c.due_date) < new Date()).length;
      const completedCommitments = cm.filter(c => c.status === 'completed').length;
      const commitmentFulfillment = cm.length > 0 ? Math.round((completedCommitments / cm.length) * 100) : 0;

      const totalMeetingMins = mt.reduce((s, m) => s + ((m.duration_seconds || 0) / 60), 0);
      const avgMeetingMins = mt.length > 0 ? Math.round(totalMeetingMins / mt.length) : 0;
      const meetingDebt = totalMeetingMins > 0 ? Math.round(totalMeetingMins / 60 * 85) : 0; // avg $85/hr blended

      // Health score formula
      const blockerPenalty = Math.min(40, openBlockers * 8);
      const overduePenalty = Math.min(30, overdueCommitments * 6);
      const fulfillmentBonus = Math.min(30, (commitmentFulfillment / 100) * 30);
      const velocityBonus = Math.min(20, dc.length * 2);
      const activityBonus = Math.min(10, (kn.length + vd.length) * 2);
      const healthScore = Math.min(100, Math.max(0, 50 + fulfillmentBonus + velocityBonus + activityBonus - blockerPenalty - overduePenalty));

      setMetrics({
        healthScore: Math.round(healthScore),
        openBlockers,
        blockerResolutionRate,
        commitmentFulfillment,
        overdueCommitments,
        decisionsThisMonth: dc.length,
        meetingsThisMonth: mt.length,
        meetingCostEstimate: meetingDebt,
        knowledgeItems7d: kn.length,
        videosThisWeek: vd.length,
        totalCommitments: cm.length,
        completedCommitments,
      });
      setLastUpdated(new Date());
    } catch (e) {
      console.error('Pulse load error:', e);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { loadMetrics(); }, [loadMetrics]);

  const runAIPulse = async () => {
    if (!metrics) return;
    setLoadingAI(true);
    try {
      const prompt = `You are an organizational health analyst. Generate a punchy, actionable weekly health briefing.

METRICS:
- Health Score: ${metrics.healthScore}/100
- Open Blockers: ${metrics.openBlockers}
- Blocker Resolution Rate: ${metrics.blockerResolutionRate}%
- Commitment Fulfillment: ${metrics.commitmentFulfillment}%
- Overdue Commitments: ${metrics.overdueCommitments}
- Decisions Made (30d): ${metrics.decisionsThisMonth}
- Meetings (30d): ${metrics.meetingsThisMonth}
- Estimated Meeting Cost: $${metrics.meetingCostEstimate}
- Knowledge Items Created (7d): ${metrics.knowledgeItems7d}

Respond in valid JSON only:
{
  "headline": "punchy 8-10 word headline about this week's org health",
  "tldr": "2-sentence plain English summary a CEO would read in 10 seconds",
  "win_of_the_week": "the best thing that happened (based on metrics)",
  "priority_fix": "the single most urgent thing to fix",
  "benchmark_context": "how does this compare to healthy teams? (1 sentence)",
  "next_week_prediction": "what to expect next week if trajectory continues (1 sentence)"
}`;

      const raw = await generateText([
        { role: 'system', content: 'You are a data extraction AI. Respond ONLY with valid JSON.' },
        { role: 'user', content: prompt }
      ]);
      setAiPulse(JSON.parse((raw || '').replace(/```json|```/g, '').trim()));
    } catch {
      setAiPulse({ error: true, tldr: 'AI analysis unavailable.' });
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">

        {/* Header */}
        <div>
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-black text-foreground">CliPad Pulse</h1>
              <p className="text-sm text-muted-foreground mt-1">Your organization's vital signs — real-time health score built from every signal Orbit tracks.</p>
              {lastUpdated && <p className="text-xs text-muted-foreground/60 mt-0.5">Last updated: {format(lastUpdated, 'h:mm a')}</p>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={loadMetrics} className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 text-muted-foreground rounded-xl text-xs font-semibold hover:text-foreground transition-colors">
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
              <button
                onClick={runAIPulse}
                disabled={loadingAI || !metrics}
                className="flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/30 text-violet-400 rounded-xl text-sm font-semibold hover:bg-violet-500/20 transition-colors disabled:opacity-50"
              >
                {loadingAI ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Orbit Briefing
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />)}
          </div>
        ) : metrics ? (
          <>
            {/* Health Gauge */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <PulseGauge score={metrics.healthScore} />
                <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { label: 'Commitment Rate', value: `${metrics.commitmentFulfillment}%`, color: metrics.commitmentFulfillment >= 70 ? 'emerald' : 'amber' },
                    { label: 'Blocker Resolution', value: `${metrics.blockerResolutionRate}%`, color: metrics.blockerResolutionRate >= 70 ? 'emerald' : 'amber' },
                    { label: 'Decision Velocity', value: metrics.decisionsThisMonth, suffix: ' /30d', color: 'blue' },
                    { label: 'Open Blockers', value: metrics.openBlockers, color: metrics.openBlockers > 5 ? 'red' : 'emerald' },
                    { label: 'Overdue', value: metrics.overdueCommitments, color: metrics.overdueCommitments > 3 ? 'red' : 'emerald' },
                    { label: 'Knowledge Items (7d)', value: metrics.knowledgeItems7d, color: 'blue' },
                  ].map(m => (
                    <div key={m.label} className="rounded-xl bg-white/[0.02] border border-white/5 p-3">
                      <p className={`text-xl font-black text-${m.color}-400`}>{m.value}{m.suffix || ''}</p>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mt-0.5">{m.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Meeting cost */}
            {metrics.meetingCostEstimate > 0 && (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-center gap-4">
                <Clock className="w-8 h-8 text-amber-400 shrink-0" />
                <div>
                  <p className="font-bold text-foreground">Estimated meeting cost this month: <span className="text-amber-400">${metrics.meetingCostEstimate.toLocaleString()}</span></p>
                  <p className="text-sm text-muted-foreground">{metrics.meetingsThisMonth} meetings tracked · Use Meeting ROI data to identify which ones could be async</p>
                </div>
              </div>
            )}

            {/* AI Pulse */}
            {aiPulse && !aiPulse.error && (
              <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  <span className="text-xs font-bold text-violet-300 uppercase tracking-wider">Orbit Weekly Briefing</span>
                </div>
                {aiPulse.headline && (
                  <h2 className="text-lg font-black text-foreground">{aiPulse.headline}</h2>
                )}
                {aiPulse.tldr && (
                  <p className="text-sm text-foreground/80 leading-relaxed">{aiPulse.tldr}</p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {aiPulse.win_of_the_week && (
                    <div className="p-3 rounded-xl bg-[#006065] dark:bg-[#131A2C]/5 border border-[#006065] dark:border-border/20">
                      <p className="text-[10px] font-bold text-[#00beac] uppercase tracking-wider mb-1">Win of the Week</p>
                      <p className="text-xs text-foreground/80">{aiPulse.win_of_the_week}</p>
                    </div>
                  )}
                  {aiPulse.priority_fix && (
                    <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                      <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">Priority Fix</p>
                      <p className="text-xs text-foreground/80">{aiPulse.priority_fix}</p>
                    </div>
                  )}
                  {aiPulse.next_week_prediction && (
                    <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
                      <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">Next Week Outlook</p>
                      <p className="text-xs text-foreground/80">{aiPulse.next_week_prediction}</p>
                    </div>
                  )}
                </div>
                {aiPulse.benchmark_context && (
                  <p className="text-xs text-muted-foreground italic border-t border-white/5 pt-3">{aiPulse.benchmark_context}</p>
                )}
              </div>
            )}

            {/* Quick links */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { label: 'View Risk Intelligence', desc: 'Space-by-space risk breakdown', path: '/risk', icon: Shield, color: 'red' },
                { label: 'Commitment Engine', desc: 'Team accountability scorecards', path: '/commitments', icon: CheckCircle2, color: 'emerald' },
                { label: 'Decision Ledger', desc: 'All decisions with outcomes', path: '/decisions', icon: Target, color: 'indigo' },
              ].map(link => (
                <button
                  key={link.path}
                  onClick={() => navigate(`${basePath}${link.path}`)}
                  className="text-left p-4 rounded-2xl border border-border bg-card hover:border-primary/30 hover:bg-card/80 transition-all group"
                >
                  <div className={`w-9 h-9 rounded-xl bg-${link.color}-500/10 border border-${link.color}-500/20 flex items-center justify-center mb-3`}>
                    <link.icon className={`w-4.5 h-4.5 text-${link.color}-400`} />
                  </div>
                  <p className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">{link.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{link.desc}</p>
                </button>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

