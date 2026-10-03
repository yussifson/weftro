import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { generateText } from '@/lib/cloudflareAI';
import { format, subDays, differenceInDays } from 'date-fns';
import {
  AlertTriangle, TrendingDown, TrendingUp, Minus, Shield, Zap,
  ArrowLeft, Sparkles, RefreshCw, Activity, BarChart3, Target,
  Clock, Users, FileText, Scale, CheckSquare, GitBranch, Eye,
  ChevronRight, X, Info, Flame
} from 'lucide-react';

const RISK_LEVELS = {
  critical: { label: 'Critical', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/40', dot: 'bg-red-500', pulse: 'animate-pulse' },
  high: { label: 'High', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30', dot: 'bg-orange-500', pulse: '' },
  medium: { label: 'Medium', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', dot: 'bg-amber-500', pulse: '' },
  low: { label: 'Low', color: 'text-[#00beac]', bg: 'bg-[#006065]/10 border-[#006065]/30', dot: 'bg-[#006065]', pulse: '' },
  healthy: { label: 'Healthy', color: 'text-[#00beac]', bg: 'bg-[#006065]/10 border-[#006065]/20', dot: 'bg-emerald-400', pulse: '' },
};

function RiskSignalBar({ label, value, max, color = 'red', tooltip }) {
  const pct = Math.min(100, max > 0 ? Math.round((value / max) * 100) : 0);
  return (
    <div className="space-y-1.5" title={tooltip}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-bold text-foreground">{value}</span>
      </div>
      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full bg-${color}-500 rounded-full transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function SpaceRiskCard({ space, signals, onClick }) {
  const riskLevel = signals.riskLevel;
  const cfg = RISK_LEVELS[riskLevel] || RISK_LEVELS.healthy;
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-2xl border p-4 transition-all hover:shadow-md hover:-translate-y-0.5 ${cfg.bg}`}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="relative shrink-0">
          <div className={`w-3 h-3 rounded-full ${cfg.dot} ${cfg.pulse}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-foreground text-sm">{space.name}</h3>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>{cfg.label} Risk</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{space.description || 'Team Space'}</p>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-2xl font-black ${cfg.color}`}>{signals.riskScore}</p>
          <p className="text-[10px] text-muted-foreground">Risk Score</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-3">
        <div className="text-center">
          <p className="text-sm font-black text-red-400">{signals.openBlockers}</p>
          <p className="text-[10px] text-muted-foreground">Blockers</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-black text-amber-400">{signals.overdueCommitments}</p>
          <p className="text-[10px] text-muted-foreground">Overdue</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-black text-foreground">{signals.recentDecisions}</p>
          <p className="text-[10px] text-muted-foreground">Decisions</p>
        </div>
      </div>
      {signals.topRiskFactor && (
        <div className="mt-3 pt-3 border-t border-white/5 flex items-start gap-2">
          <AlertTriangle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${cfg.color}`} />
          <p className="text-xs text-muted-foreground">{signals.topRiskFactor}</p>
        </div>
      )}
    </button>
  );
}

function computeRisk(signals) {
  let score = 0;
  // Blocker penalty: heavy
  score += signals.openBlockers * 15;
  // Overdue commitment penalty
  score += signals.overdueCommitments * 12;
  // At-risk commitment penalty
  score += signals.atRiskCommitments * 8;
  // Low knowledge creation (stagnation)
  if (signals.recentKnowledge === 0) score += 10;
  if (signals.recentKnowledge < 2) score += 5;
  // Low decision velocity
  if (signals.recentDecisions === 0) score += 8;
  // No recent meetings â†’ isolation
  if (signals.recentMeetings === 0) score += 12;
  // Clamp to 100
  score = Math.min(100, score);

  let riskLevel = 'healthy';
  if (score >= 80) riskLevel = 'critical';
  else if (score >= 55) riskLevel = 'high';
  else if (score >= 30) riskLevel = 'medium';
  else if (score >= 10) riskLevel = 'low';

  // Top risk factor
  let topRiskFactor = null;
  if (signals.openBlockers >= 3) topRiskFactor = `${signals.openBlockers} unresolved blockers are stalling progress`;
  else if (signals.overdueCommitments >= 3) topRiskFactor = `${signals.overdueCommitments} commitments are past due â€” accountability breakdown`;
  else if (signals.recentMeetings === 0) topRiskFactor = 'No recent activity â€” team may be siloed or disengaged';
  else if (signals.atRiskCommitments >= 2) topRiskFactor = `${signals.atRiskCommitments} commitments flagged at risk`;

  return { ...signals, riskScore: score, riskLevel, topRiskFactor };
}

export default function PredictiveRiskIntelligence() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const companyId = user?.user_metadata?.company_id || user?.company_id;

  const [spaces, setSpaces] = useState([]);
  const [spaceSignals, setSpaceSignals] = useState({});
  const [loading, setLoading] = useState(true);
  const [orgRisk, setOrgRisk] = useState(null);
  const [aiReport, setAiReport] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState(null);

  const isLegacy = window.location.pathname.startsWith('/clipad');
  const basePath = isLegacy ? '/clipad' : '';
  const since14 = subDays(new Date(), 14).toISOString();
  const since30 = subDays(new Date(), 30).toISOString();

  const loadData = useCallback(async () => {
    if (companyId === undefined) return;
    setLoading(true);
    try {
      // Get all spaces for this org
      const { data: spacesData } = await supabase
        .from('clipad_team_spaces')
        .select('id, name, description')
        .eq('workspace_id', companyId)
        .limit(20);

      if (!spacesData?.length) { setLoading(false); return; }
      setSpaces(spacesData);

      // For each space, load signal data in parallel
      const signalResults = await Promise.allSettled(
        spacesData.map(async (space) => {
          const [blockers, commitments, decisions, meetings, knowledge] = await Promise.allSettled([
            supabase.from('clipad_blockers').select('id, resolved, created_at')
              .eq('team_space_id', space.id).eq('resolved', false).limit(50),
            supabase.from('clipad_commitments').select('id, status, due_date, created_at')
              .eq('team_space_id', space.id).limit(50),
            supabase.from('clipad_decisions').select('id, created_at')
              .eq('team_space_id', space.id).gte('created_at', since14).limit(20),
            supabase.from('clipad_meetings').select('id, created_at')
              .eq('team_space_id', space.id).gte('created_at', since14).limit(20),
            supabase.from('clipad_imported_knowledge').select('id, imported_at')
              .eq('team_space_id', space.id).gte('imported_at', since14).limit(20),
          ]);

          const blockerList = blockers.status === 'fulfilled' ? (blockers.value.data || []) : [];
          const commitList = commitments.status === 'fulfilled' ? (commitments.value.data || []) : [];
          const isPastDue = (c) => c.due_date && new Date(c.due_date) < new Date();

          const signals = {
            spaceId: space.id,
            openBlockers: blockerList.length,
            overdueCommitments: commitList.filter(c => c.status === 'open' && isPastDue(c)).length,
            atRiskCommitments: commitList.filter(c => c.status === 'at_risk').length,
            recentDecisions: decisions.status === 'fulfilled' ? (decisions.value.data?.length || 0) : 0,
            recentMeetings: meetings.status === 'fulfilled' ? (meetings.value.data?.length || 0) : 0,
            recentKnowledge: knowledge.status === 'fulfilled' ? (knowledge.value.data?.length || 0) : 0,
          };

          return { spaceId: space.id, signals: computeRisk(signals) };
        })
      );

      const signalMap = {};
      signalResults.forEach(r => {
        if (r.status === 'fulfilled' && r.value) {
          signalMap[r.value.spaceId] = r.value.signals;
        }
      });
      setSpaceSignals(signalMap);

      // Org-level aggregation
      const allSignals = Object.values(signalMap);
      const totalBlockers = allSignals.reduce((s, x) => s + x.openBlockers, 0);
      const totalOverdue = allSignals.reduce((s, x) => s + x.overdueCommitments, 0);
      const criticalSpaces = allSignals.filter(x => x.riskLevel === 'critical').length;
      const highSpaces = allSignals.filter(x => x.riskLevel === 'high').length;
      const avgScore = allSignals.length ? Math.round(allSignals.reduce((s, x) => s + x.riskScore, 0) / allSignals.length) : 0;

      setOrgRisk({ totalBlockers, totalOverdue, criticalSpaces, highSpaces, avgScore, totalSpaces: spacesData.length });
    } catch (e) {
      console.error('Risk load error:', e);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { loadData(); }, [loadData]);

  const runAIReport = async () => {
    if (!orgRisk) return;
    setLoadingAI(true);
    try {
      const topRiskySpaces = spaces
        .map(s => ({ name: s.name, signals: spaceSignals[s.id] }))
        .filter(x => x.signals)
        .sort((a, b) => b.signals.riskScore - a.signals.riskScore)
        .slice(0, 5);

      const prompt = `You are an organizational risk analyst with deep expertise in team dynamics and project failure patterns.

ORG RISK SUMMARY (${orgRisk.totalSpaces} spaces analyzed):
- Average risk score: ${orgRisk.avgScore}/100
- Critical risk spaces: ${orgRisk.criticalSpaces}
- High risk spaces: ${orgRisk.highSpaces}
- Total unresolved blockers: ${orgRisk.totalBlockers}
- Total overdue commitments: ${orgRisk.totalOverdue}

TOP RISK SPACES:
${topRiskySpaces.map(s => `- ${s.name}: Risk ${s.signals.riskScore}/100 (${s.signals.riskLevel}) â€” ${s.signals.openBlockers} blockers, ${s.signals.overdueCommitments} overdue`).join('\n')}

Analyze patterns that historically precede project failures and org dysfunction. Respond in valid JSON only:
{
  "org_health_score": (0-100 integer, inverse of risk),
  "risk_trajectory": ("escalating"|"stable"|"improving"),
  "forecast": "what will happen in the next 2-4 weeks if nothing changes (2-3 sentences)",
  "pattern_detected": "the dominant failure pattern you see in this data",
  "intervention": "the single most important action leadership should take THIS WEEK",
  "silver_lining": "one positive signal in this data if any",
  "estimated_productivity_loss": "rough estimate of productivity drag from current risk levels (e.g. '20-30% capacity loss')"
}`;

      const raw = await generateText([
        { role: 'system', content: 'You are a data extraction AI. Respond ONLY with valid JSON.' },
        { role: 'user', content: prompt }
      ]);
      setAiReport(JSON.parse((raw || '').replace(/```json|```/g, '').trim()));
    } catch {
      setAiReport({ error: true, forecast: 'AI report unavailable.' });
    } finally {
      setLoadingAI(false);
    }
  };

  const sortedSpaces = spaces
    .map(s => ({ space: s, signals: spaceSignals[s.id] }))
    .filter(x => x.signals)
    .sort((a, b) => b.signals.riskScore - a.signals.riskScore);

  const orgRiskLevel = orgRisk
    ? orgRisk.avgScore >= 70 ? 'critical' : orgRisk.avgScore >= 45 ? 'high' : orgRisk.avgScore >= 20 ? 'medium' : 'healthy'
    : 'healthy';
  const orgCfg = RISK_LEVELS[orgRiskLevel];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">

        {/* Header */}
        <div>
          <button
            onClick={() => navigate(`${basePath}/dashboard`)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Dashboard
          </button>
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-black text-foreground">Predictive Risk Intelligence</h1>
                {orgRisk && (
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${orgCfg.bg} ${orgCfg.color}`}>
                    {orgCfg.label} Org Risk
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">Orbit detects failure patterns 2 weeks before they happen â€” act before it's too late.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadData}
                className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 text-muted-foreground rounded-xl text-xs font-semibold hover:text-foreground transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
              <button
                onClick={runAIReport}
                disabled={loadingAI || !orgRisk}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm font-semibold hover:bg-red-500/20 transition-colors disabled:opacity-50"
              >
                {loadingAI ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                AI Forecast
              </button>
            </div>
          </div>
        </div>

        {/* Org Stats */}
        {orgRisk && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Org Risk Score', value: orgRisk.avgScore, suffix: '/100', color: orgRisk.avgScore >= 55 ? 'red' : orgRisk.avgScore >= 30 ? 'amber' : 'emerald' },
              { label: 'Critical Spaces', value: orgRisk.criticalSpaces, color: 'red' },
              { label: 'High Risk Spaces', value: orgRisk.highSpaces, color: 'orange' },
              { label: 'Open Blockers', value: orgRisk.totalBlockers, color: 'red' },
              { label: 'Overdue Commitments', value: orgRisk.totalOverdue, color: 'amber' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl border border-border bg-card p-4 text-center">
                <p className={`text-2xl font-black text-${s.color}-400 tabular-nums`}>{s.value}{s.suffix || ''}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* AI Report */}
        {aiReport && !aiReport.error && (
          <div className={`rounded-2xl border p-5 ${
            aiReport.risk_trajectory === 'escalating' ? 'border-red-500/40 bg-red-500/5' :
            aiReport.risk_trajectory === 'improving' ? 'border-[#006065]/30 bg-[#006065]/5' :
            'border-amber-500/30 bg-amber-500/5'
          }`}>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-bold text-violet-300 uppercase tracking-wider">Orbit AI 2-Week Risk Forecast</span>
              {aiReport.risk_trajectory && (
                <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${
                  aiReport.risk_trajectory === 'escalating' ? 'bg-red-500/10 text-red-400' :
                  aiReport.risk_trajectory === 'improving' ? 'bg-[#006065]/10 text-[#00beac]' :
                  'bg-amber-500/10 text-amber-400'
                }`}>
                  {aiReport.risk_trajectory === 'escalating' ? 'â†‘ Escalating' : aiReport.risk_trajectory === 'improving' ? 'â†“ Improving' : 'â†’ Stable'}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">2-Week Forecast</p>
                <p className="text-sm text-foreground/90 leading-relaxed">{aiReport.forecast}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Pattern Detected</p>
                <p className="text-sm text-foreground/90 leading-relaxed">{aiReport.pattern_detected}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">Required Intervention</p>
                <p className="text-xs text-foreground/90">{aiReport.intervention}</p>
              </div>
              {aiReport.estimated_productivity_loss && (
                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">Productivity Impact</p>
                  <p className="text-xs text-foreground/90">{aiReport.estimated_productivity_loss}</p>
                </div>
              )}
              {aiReport.silver_lining && (
                <div className="p-3 rounded-xl bg-[#006065]/5 border border-[#006065]/20">
                  <p className="text-[10px] font-bold text-[#00beac] uppercase tracking-wider mb-1">Silver Lining</p>
                  <p className="text-xs text-foreground/90">{aiReport.silver_lining}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Space Risk Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-36 rounded-2xl bg-white/5 animate-pulse" />)}
          </div>
        ) : sortedSpaces.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-foreground">No risk data yet</p>
            <p className="text-sm mt-1">Risk signals are built from blockers, commitments, decisions, and meetings across your spaces.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-foreground text-sm">Space Risk Breakdown</h2>
              <span className="text-xs text-muted-foreground ml-1">â€” sorted by risk score</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedSpaces.map(({ space, signals }) => (
                <SpaceRiskCard
                  key={space.id}
                  space={space}
                  signals={signals}
                  onClick={() => navigate(`${basePath}/spaces/${space.id}`)}
                />
              ))}
            </div>
          </>
        )}

        {/* Risk Legend */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">How Risk Score Is Calculated</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />Unresolved Blockers (Ã—15 pts)</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />Overdue Commitments (Ã—12 pts)</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />At-Risk Commitments (Ã—8 pts)</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />Inactivity / Isolation (Ã—10-20 pts)</div>
          </div>
        </div>
      </div>
    </div>
  );
}

