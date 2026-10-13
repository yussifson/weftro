import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { generateText } from '@/lib/cloudflareAI';
import { format, formatDistanceToNow, isPast, addDays, differenceInDays } from 'date-fns';
import {
  CheckCircle2, AlertTriangle, Clock, Users, TrendingUp, TrendingDown,
  Minus, ArrowLeft, Sparkles, RefreshCw, Target, Zap, Shield,
  ChevronRight, User, Calendar, Flag, BarChart3, Activity, X,
  Bell, BellOff, Check, XCircle, Edit3, ExternalLink, Filter
} from 'lucide-react';

const STATUS_CONFIG = {
  open: { label: 'Open', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30', icon: Clock },
  completed: { label: 'Done', color: 'text-[#00beac]', bg: 'bg-[#006065] dark:bg-[#131A2C]/10 border-[#006065] dark:border-border/30', icon: CheckCircle2 },
  overdue: { label: 'Overdue', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', icon: AlertTriangle },
  at_risk: { label: 'At Risk', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', icon: Flag },
};

function ScoreRing({ score, size = 64, stroke = 6 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s ease' }}
      />
    </svg>
  );
}

function CommitmentCard({ commitment, onStatusChange }) {
  const [updating, setUpdating] = useState(false);
  const cfg = STATUS_CONFIG[commitment.status] || STATUS_CONFIG.open;
  const StatusIcon = cfg.icon;
  const isOverdue = commitment.due_date && isPast(new Date(commitment.due_date)) && commitment.status === 'open';
  const daysUntil = commitment.due_date ? differenceInDays(new Date(commitment.due_date), new Date()) : null;

  const markStatus = async (newStatus) => {
    setUpdating(true);
    await supabase.from('clipad_commitments').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', commitment.id);
    onStatusChange?.(commitment.id, newStatus);
    setUpdating(false);
  };

  return (
    <div className={`rounded-2xl border bg-card p-4 transition-all hover:shadow-md ${isOverdue ? 'border-red-500/30' : 'border-border'}`}>
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${isOverdue ? STATUS_CONFIG.overdue.bg : cfg.bg}`}>
          <StatusIcon className={`w-4 h-4 ${isOverdue ? STATUS_CONFIG.overdue.color : cfg.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground leading-snug mb-2">{commitment.commitment_text}</p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {commitment.owner_name && (
              <span className="flex items-center gap-1"><User className="w-3 h-3" />{commitment.owner_name}</span>
            )}
            {commitment.due_date && (
              <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-400 font-semibold' : daysUntil !== null && daysUntil <= 3 ? 'text-amber-400 font-semibold' : ''}`}>
                <Calendar className="w-3 h-3" />
                {isOverdue ? `${Math.abs(daysUntil)}d overdue` : daysUntil === 0 ? 'Due today' : daysUntil === 1 ? 'Due tomorrow' : format(new Date(commitment.due_date), 'MMM d')}
              </span>
            )}
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDistanceToNow(new Date(commitment.created_at), { addSuffix: true })}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {commitment.status !== 'completed' && (
            <button
              onClick={() => markStatus('completed')}
              disabled={updating}
              className="w-7 h-7 rounded-lg bg-[#006065] dark:bg-[#131A2C]/10 border border-[#006065] dark:border-border/20 flex items-center justify-center text-[#00beac] hover:bg-[#006065] dark:bg-[#131A2C]/20 transition-colors"
              title="Mark complete"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          )}
          {commitment.status === 'open' && (
            <button
              onClick={() => markStatus('at_risk')}
              disabled={updating}
              className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 hover:bg-amber-500/20 transition-colors"
              title="Flag at risk"
            >
              <Flag className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CommitmentIntelligence() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const companyId = user?.user_metadata?.company_id || user?.company_id;

  const [commitments, setCommitments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | open | overdue | completed | at_risk
  const [ownerFilter, setOwnerFilter] = useState('');
  const [aiInsight, setAiInsight] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [scorecards, setScorecards] = useState([]);

  const isLegacy = window.location.pathname.startsWith('/clipad');
  const basePath = isLegacy ? '/clipad' : '';

  const loadCommitments = useCallback(async () => {
    if (companyId === undefined) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clipad_commitments')
        .select('id, commitment_text, owner_name, due_date, status, created_at, updated_at, team_space_id, confidence_score')
        .eq('workspace_id', companyId)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      // Compute real-time overdue status
      const enriched = (data || []).map(c => {
        if (c.status === 'open' && c.due_date && isPast(new Date(c.due_date))) {
          return { ...c, status: 'overdue' };
        }
        return c;
      });

      setCommitments(enriched);
      buildScorecards(enriched);
    } catch (e) {
      console.error('Commitments load error:', e);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const buildScorecards = (data) => {
    const ownerMap = {};
    data.forEach(c => {
      const owner = c.owner_name || 'Unassigned';
      if (!ownerMap[owner]) ownerMap[owner] = { total: 0, completed: 0, overdue: 0, at_risk: 0, open: 0 };
      ownerMap[owner].total++;
      ownerMap[owner][c.status === 'overdue' ? 'overdue' : c.status] = (ownerMap[owner][c.status === 'overdue' ? 'overdue' : c.status] || 0) + 1;
    });
    const cards = Object.entries(ownerMap)
      .map(([name, stats]) => ({
        name,
        ...stats,
        score: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
    setScorecards(cards);
  };

  useEffect(() => { loadCommitments(); }, [loadCommitments]);

  const handleStatusChange = (id, newStatus) => {
    setCommitments(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, status: newStatus } : c);
      buildScorecards(updated);
      return updated;
    });
  };

  const runOrgInsight = async () => {
    if (!commitments.length) return;
    setLoadingAI(true);
    try {
      const open = commitments.filter(c => c.status === 'open').length;
      const overdue = commitments.filter(c => c.status === 'overdue').length;
      const completed = commitments.filter(c => c.status === 'completed').length;
      const atRisk = commitments.filter(c => c.status === 'at_risk').length;
      const total = commitments.length;

      const prompt = `You are an organizational intelligence analyst. Analyze this team's commitment health data.

STATS:
- Total commitments tracked: ${total}
- Completed: ${completed} (${Math.round((completed/total)*100)}%)
- Open: ${open}
- Overdue: ${overdue}
- At Risk: ${atRisk}
- Commitment debt (open + overdue + at_risk): ${open + overdue + atRisk}

TOP OWNERS (by volume):
${scorecards.slice(0, 5).map(s => `- ${s.name}: ${s.score}% success rate (${s.completed}/${s.total})`).join('\n')}

RECENT OVERDUE:
${commitments.filter(c => c.status === 'overdue').slice(0, 3).map(c => `- "${c.commitment_text}" (owner: ${c.owner_name || 'unknown'})`).join('\n')}

Respond in valid JSON only:
{
  "health_grade": ("A"|"B"|"C"|"D"|"F"),
  "health_score": (0-100 integer),
  "one_liner": "single sentence on the team's commitment health",
  "biggest_risk": "the single biggest risk right now",
  "velocity_trend": ("improving"|"stable"|"declining"),
  "top_recommendation": "the most important action the team should take this week",
  "commitment_debt_impact": "what this level of commitment debt means for the org"
}`;

      const raw = await generateText([
        { role: 'system', content: 'You are a data extraction AI. Respond ONLY with valid JSON.' },
        { role: 'user', content: prompt }
      ]);
      setAiInsight(JSON.parse((raw || '').replace(/```json|```/g, '').trim()));
    } catch {
      setAiInsight({ error: true, one_liner: 'AI analysis unavailable.' });
    } finally {
      setLoadingAI(false);
    }
  };

  const filtered = commitments.filter(c => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (ownerFilter && !(c.owner_name || '').toLowerCase().includes(ownerFilter.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: commitments.length,
    open: commitments.filter(c => c.status === 'open').length,
    overdue: commitments.filter(c => c.status === 'overdue').length,
    completed: commitments.filter(c => c.status === 'completed').length,
    atRisk: commitments.filter(c => c.status === 'at_risk').length,
  };
  const debt = stats.open + stats.overdue + stats.atRisk;
  const fulfillmentRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const gradeColor = { A: 'emerald', B: 'green', C: 'amber', D: 'orange', F: 'red' }[aiInsight?.health_grade] || 'slate';

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
              <h1 className="text-2xl font-black text-foreground">Commitment Intelligence</h1>
              <p className="text-sm text-muted-foreground mt-1">AI-powered accountability layer — every promise tracked, every drop-ball surfaced.</p>
            </div>
            <button
              onClick={runOrgInsight}
              disabled={loadingAI}
              className="flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/30 text-violet-400 rounded-xl text-sm font-semibold hover:bg-violet-500/20 transition-colors disabled:opacity-50"
            >
              {loadingAI ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Orbit Analysis
            </button>
          </div>
        </div>

        {/* Org Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Commitment Debt', value: debt, color: debt > 10 ? 'red' : debt > 5 ? 'amber' : 'emerald', sub: 'open + overdue + at risk' },
            { label: 'Fulfilment Rate', value: `${fulfillmentRate}%`, color: fulfillmentRate >= 70 ? 'emerald' : fulfillmentRate >= 50 ? 'amber' : 'red', sub: 'completed / total' },
            { label: 'Open', value: stats.open, color: 'blue', sub: 'active commitments' },
            { label: 'Overdue', value: stats.overdue, color: 'red', sub: 'past due date' },
            { label: 'Completed', value: stats.completed, color: 'emerald', sub: 'successfully closed' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-4">
              <p className={`text-2xl font-black text-${s.color}-400 tabular-nums`}>{s.value}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mt-1">{s.label}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* AI Insight */}
        {aiInsight && !aiInsight.error && (
          <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-5">
            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                <ScoreRing score={aiInsight.health_score || 0} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-lg font-black text-${gradeColor}-400`}>{aiInsight.health_grade}</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  <span className="text-xs font-bold text-violet-300 uppercase tracking-wider">Orbit AI Health Analysis</span>
                  {aiInsight.velocity_trend && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      aiInsight.velocity_trend === 'improving' ? 'bg-[#006065] dark:bg-[#131A2C]/10 text-[#00beac]' :
                      aiInsight.velocity_trend === 'declining' ? 'bg-red-500/10 text-red-400' : 'bg-transparent0/10 text-white/60'
                    }`}>
                      {aiInsight.velocity_trend === 'improving' ? 'â†‘' : aiInsight.velocity_trend === 'declining' ? 'â†“' : '→'} {aiInsight.velocity_trend}
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-foreground mb-2">{aiInsight.one_liner}</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                  {aiInsight.biggest_risk && (
                    <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                      <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">Biggest Risk</p>
                      <p className="text-xs text-foreground/80">{aiInsight.biggest_risk}</p>
                    </div>
                  )}
                  {aiInsight.commitment_debt_impact && (
                    <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                      <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">Debt Impact</p>
                      <p className="text-xs text-foreground/80">{aiInsight.commitment_debt_impact}</p>
                    </div>
                  )}
                  {aiInsight.top_recommendation && (
                    <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                      <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">Recommendation</p>
                      <p className="text-xs text-foreground/90">{aiInsight.top_recommendation}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Team Scorecards */}
        {scorecards.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-foreground text-sm">Team Commitment Scorecards</h2>
              <span className="text-xs text-muted-foreground ml-auto">{scorecards.length} contributors</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {scorecards.map(card => {
                const scoreColor = card.score >= 75 ? 'emerald' : card.score >= 50 ? 'amber' : 'red';
                return (
                  <div key={card.name} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                    <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center shrink-0 text-sm font-bold text-foreground">
                      {card.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-foreground truncate">{card.name}</p>
                        <span className={`text-sm font-black text-${scoreColor}-400`}>{card.score}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-${scoreColor}-500 rounded-full transition-all duration-700`}
                          style={{ width: `${card.score}%` }}
                        />
                      </div>
                      <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                        <span className="text-[#00beac]">{card.completed} done</span>
                        {card.overdue > 0 && <span className="text-red-400">{card.overdue} overdue</span>}
                        {card.at_risk > 0 && <span className="text-amber-400">{card.at_risk} at risk</span>}
                        <span>{card.open} open</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Commitment List */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-foreground text-sm">All Commitments</h2>
            </div>
            <div className="flex items-center gap-2 ml-auto flex-wrap">
              {/* Filter tabs */}
              {['all', 'open', 'overdue', 'at_risk', 'completed'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                    filter === f
                      ? 'bg-primary/10 border border-primary/30 text-primary'
                      : 'bg-white/[0.02] border border-white/5 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {f === 'all' ? `All (${stats.total})` :
                   f === 'open' ? `Open (${stats.open})` :
                   f === 'overdue' ? `Overdue (${stats.overdue})` :
                   f === 'at_risk' ? `At Risk (${stats.atRisk})` :
                   `Done (${stats.completed})`}
                </button>
              ))}
            </div>
          </div>

          {/* Owner search */}
          <div className="mb-4">
            <input
              type="text"
              value={ownerFilter}
              onChange={e => setOwnerFilter(e.target.value)}
              placeholder="Filter by person..."
              className="w-full max-w-xs px-3 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50"
            />
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 rounded-2xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Target className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-semibold text-foreground">No commitments found</p>
              <p className="text-sm mt-1">Commitments are automatically extracted from meeting transcripts and chats by Orbit AI.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(c => (
                <CommitmentCard key={c.id} commitment={c} onStatusChange={handleStatusChange} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

