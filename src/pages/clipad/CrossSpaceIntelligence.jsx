import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { generateText } from '@/lib/cloudflareAI';
import { subDays, format, formatDistanceToNow } from 'date-fns';
import {
  GitMerge, AlertTriangle, Scale, CheckCircle2, RefreshCw,
  ArrowLeft, Sparkles, Shield, Eye, ChevronRight, Zap,
  Users, Network, Link2, Copy, X, ArrowRight, Activity, BarChart3
} from 'lucide-react';

function SimilarityScore({ score }) {
  const color = score >= 0.8 ? 'red' : score >= 0.6 ? 'amber' : 'blue';
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-${color}-500/10 border border-${color}-500/30 text-${color}-400`}>
      {Math.round(score * 100)}% match
    </span>
  );
}

function CollisionCard({ type, items, spaceNames, onViewSpace }) {
  const typeConfig = {
    blocker: { icon: AlertTriangle, color: 'red', label: 'Duplicate Blocker', bg: 'border-red-500/30 bg-red-500/5', tagBg: 'bg-red-500/10 border-red-500/20 text-red-400' },
    decision: { icon: Scale, color: 'amber', label: 'Conflicting Decision', bg: 'border-amber-500/30 bg-amber-500/5', tagBg: 'bg-amber-500/10 border-amber-500/20 text-amber-400' },
    commitment: { icon: CheckCircle2, color: 'blue', label: 'Duplicate Commitment', bg: 'border-blue-500/30 bg-blue-500/5', tagBg: 'bg-blue-500/10 border-blue-500/20 text-blue-400' },
  }[type] || { icon: Link2, color: 'slate', label: 'Related', bg: 'border-border', tagBg: 'bg-white/5 text-muted-foreground' };

  const Icon = typeConfig.icon;

  return (
    <div className={`rounded-2xl border p-4 ${typeConfig.bg}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${typeConfig.tagBg} border`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${typeConfig.tagBg}`}>{typeConfig.label}</span>
            <span className="text-xs text-muted-foreground">{items.length} spaces affected</span>
          </div>
          <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">
            {items[0]?.text}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="w-2 h-2 rounded-full bg-current opacity-60 shrink-0" style={{ color: i === 0 ? '#00beac' : '#64748b' }} />
            <p className="text-xs text-foreground/80 flex-1 min-w-0 truncate">{item.text}</p>
            <button
              onClick={() => onViewSpace(item.spaceId)}
              className="text-xs text-primary hover:underline shrink-0 flex items-center gap-1"
            >
              {spaceNames[item.spaceId] || 'Space'}
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Simple keyword-based similarity Ã¢â‚¬â€ no external ML needed
function computeSimilarity(a, b) {
  const tokenize = (str) =>
    (str || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3);
  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));
  if (setA.size === 0 || setB.size === 0) return 0;
  let overlap = 0;
  setA.forEach(w => { if (setB.has(w)) overlap++; });
  return overlap / Math.max(setA.size, setB.size);
}

function findCollisions(items, textKey, threshold = 0.35) {
  const collisions = [];
  const used = new Set();
  for (let i = 0; i < items.length; i++) {
    if (used.has(i)) continue;
    const group = [i];
    for (let j = i + 1; j < items.length; j++) {
      if (used.has(j)) continue;
      if (items[i].spaceId === items[j].spaceId) continue; // skip same space
      const sim = computeSimilarity(items[i][textKey], items[j][textKey]);
      if (sim >= threshold) {
        group.push(j);
        used.add(j);
      }
    }
    if (group.length > 1) {
      used.add(i);
      collisions.push(group.map(idx => ({ ...items[idx], text: items[idx][textKey] })));
    }
  }
  return collisions;
}

export default function CrossSpaceIntelligence() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const companyId = user?.user_metadata?.company_id || user?.company_id;

  const [loading, setLoading] = useState(true);
  const [spaces, setSpaces] = useState([]);
  const [spaceNames, setSpaceNames] = useState({});
  const [blockerCollisions, setBlockerCollisions] = useState([]);
  const [decisionCollisions, setDecisionCollisions] = useState([]);
  const [commitmentCollisions, setCommitmentCollisions] = useState([]);
  const [siloedSpaces, setSiloedSpaces] = useState([]);
  const [aiSummary, setAiSummary] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const isLegacy = window.location.pathname.startsWith('/clipad');
  const basePath = isLegacy ? '/clipad' : '';

  const load = useCallback(async () => {
    if (companyId === undefined) return;
    setLoading(true);
    try {
      // Load spaces
      const { data: spacesData } = await supabase
        .from('clipad_team_spaces')
        .select('id, name')
        .eq('workspace_id', companyId)
        .limit(30);

      if (!spacesData?.length) { setLoading(false); return; }
      setSpaces(spacesData);
      const nameMap = {};
      spacesData.forEach(s => { nameMap[s.id] = s.name; });
      setSpaceNames(nameMap);

      const spaceIds = spacesData.map(s => s.id);

      // Load cross-space data
      const [blockers, decisions, commitments, knowledge] = await Promise.allSettled([
        supabase.from('clipad_blockers').select('id, description, team_space_id, resolved, created_at')
          .in('team_space_id', spaceIds).eq('resolved', false).limit(200),
        supabase.from('clipad_decisions').select('id, decision_text, team_space_id, created_at, status')
          .in('team_space_id', spaceIds).order('created_at', { ascending: false }).limit(200),
        supabase.from('clipad_commitments').select('id, commitment_text, team_space_id, status, created_at')
          .in('team_space_id', spaceIds).eq('status', 'open').limit(200),
        supabase.from('clipad_imported_knowledge').select('id, team_space_id, imported_at')
          .in('team_space_id', spaceIds).gte('imported_at', subDays(new Date(), 30).toISOString()).limit(200),
      ]);

      // Find collisions
      if (blockers.status === 'fulfilled' && blockers.value.data) {
        const items = (blockers.value.data || []).map(b => ({ ...b, spaceId: b.team_space_id }));
        setBlockerCollisions(findCollisions(items, 'description', 0.3));
      }

      if (decisions.status === 'fulfilled' && decisions.value.data) {
        const items = (decisions.value.data || []).map(d => ({ ...d, spaceId: d.team_space_id }));
        setDecisionCollisions(findCollisions(items, 'decision_text', 0.35));
      }

      if (commitments.status === 'fulfilled' && commitments.value.data) {
        const items = (commitments.value.data || []).map(c => ({ ...c, spaceId: c.team_space_id }));
        setCommitmentCollisions(findCollisions(items, 'commitment_text', 0.35));
      }

      // Siloed spaces: spaces with no knowledge imports in 30 days
      if (knowledge.status === 'fulfilled') {
        const knSpaceIds = new Set((knowledge.value.data || []).map(k => k.team_space_id));
        const siloed = spacesData.filter(s => !knSpaceIds.has(s.id));
        setSiloedSpaces(siloed);
      }
    } catch (e) {
      console.error('Cross-space load error:', e);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  const runAI = async () => {
    setLoadingAI(true);
    try {
      const totalCollisions = blockerCollisions.length + decisionCollisions.length + commitmentCollisions.length;
      const prompt = `You are an organizational intelligence analyst reviewing cross-team signal data.

CROSS-SPACE ANALYSIS:
- Spaces analyzed: ${spaces.length}
- Duplicate blockers found (same problem in multiple teams): ${blockerCollisions.length}
- Conflicting/duplicate decisions across teams: ${decisionCollisions.length}
- Duplicate commitments across teams: ${commitmentCollisions.length}
- Siloed spaces (no external knowledge sharing in 30d): ${siloedSpaces.length}
- Total collision signals: ${totalCollisions}

TOP BLOCKER COLLISIONS:
${blockerCollisions.slice(0, 3).map(g => `- "${g[0]?.text?.substring(0, 80)}" (${g.length} spaces)`).join('\n')}

TOP DECISION COLLISIONS:
${decisionCollisions.slice(0, 3).map(g => `- "${g[0]?.text?.substring(0, 80)}" (${g.length} spaces)`).join('\n')}

SILOED SPACES:
${siloedSpaces.slice(0, 5).map(s => s.name).join(', ')}

Respond in valid JSON only:
{
  "org_silos_risk": ("none"|"low"|"medium"|"high"|"critical"),
  "waste_estimate": "estimated productivity waste from duplicate work (e.g. '15-25% of team capacity')",
  "headline": "10-word headline about the cross-team health",
  "biggest_collision": "describe the most critical collision and what to do about it",
  "silo_impact": "what the knowledge isolation means for these teams (1 sentence)",
  "recommended_action": "the single most important action for leadership to break these silos"
}`;

      const raw = await generateText([
        { role: 'system', content: 'Respond ONLY with valid JSON.' },
        { role: 'user', content: prompt }
      ]);
      setAiSummary(JSON.parse((raw || '').replace(/```json|```/g, '').trim()));
    } catch {
      setAiSummary({ error: true });
    } finally {
      setLoadingAI(false);
    }
  };

  const totalCollisions = blockerCollisions.length + decisionCollisions.length + commitmentCollisions.length;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-white">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">

        {/* Header */}
        <div>
          <button
            onClick={() => navigate(`${basePath}/dashboard`)}
            className="flex items-center gap-2 text-sm text-white/80 hover:text-white mb-4 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Dashboard
          </button>
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-black text-white">Cross-Space Intelligence</h1>
              <p className="text-sm text-white/80 mt-1">
                Orbit scans all spaces for duplicate blockers, conflicting decisions, and knowledge silos in real-time.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 bg-white/10 border border-white/15 text-white rounded-xl text-xs font-semibold hover:bg-white/20 transition-colors">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
              <button
                onClick={runAI}
                disabled={loadingAI || loading}
                className="flex items-center gap-2 px-4 py-2 bg-[#00beac] hover:bg-[#00beac]/90 text-[#00beac] rounded-xl text-sm font-bold transition-all shadow-md disabled:opacity-50"
              >
                {loadingAI ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                AI Silo Report
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Spaces Analyzed', value: spaces.length, color: 'text-white' },
            { label: 'Signal Collisions', value: totalCollisions, color: totalCollisions > 5 ? 'text-rose-300' : totalCollisions > 2 ? 'text-[#fad503]' : 'text-emerald-300' },
            { label: 'Siloed Spaces', value: siloedSpaces.length, color: siloedSpaces.length > 3 ? 'text-rose-300' : 'text-[#fad503]' },
            { label: 'Duplicate Blockers', value: blockerCollisions.length, color: blockerCollisions.length > 2 ? 'text-rose-300' : 'text-[#fad503]' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl border border-white/15 bg-[#006065] dark:bg-[#131A2C] text-white p-4 text-center shadow-md">
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* AI Report */}
        {aiSummary && !aiSummary.error && (
          <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-bold text-violet-300 uppercase tracking-wider">Orbit Silo Intelligence Report</span>
              {aiSummary.org_silos_risk && (
                <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${
                  aiSummary.org_silos_risk === 'critical' ? 'bg-red-500/10 text-red-400' :
                  aiSummary.org_silos_risk === 'high' ? 'bg-orange-500/10 text-orange-400' :
                  aiSummary.org_silos_risk === 'medium' ? 'bg-amber-500/10 text-amber-400' :
                  'bg-[#006065] dark:bg-[#131A2C]/10 text-[#00beac]'
                }`}>
                  {aiSummary.org_silos_risk} silo risk
                </span>
              )}
            </div>
            {aiSummary.headline && <h2 className="text-base font-black text-foreground">{aiSummary.headline}</h2>}
            {aiSummary.waste_estimate && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold">
                <Activity className="w-4 h-4" />
                Estimated waste: {aiSummary.waste_estimate}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {aiSummary.biggest_collision && (
                <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                  <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">Biggest Collision</p>
                  <p className="text-xs text-foreground/80">{aiSummary.biggest_collision}</p>
                </div>
              )}
              {aiSummary.silo_impact && (
                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">Silo Impact</p>
                  <p className="text-xs text-foreground/80">{aiSummary.silo_impact}</p>
                </div>
              )}
              {aiSummary.recommended_action && (
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">Recommended Action</p>
                  <p className="text-xs text-foreground/90">{aiSummary.recommended_action}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-32 rounded-2xl bg-white/5 animate-pulse" />)}</div>
        ) : (
          <>
            {/* Duplicate Blockers */}
            {blockerCollisions.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <h2 className="font-semibold text-foreground text-sm">Duplicate Blockers Across Teams</h2>
                  <span className="text-xs text-red-400 font-bold ml-1">{blockerCollisions.length} collision{blockerCollisions.length > 1 ? 's' : ''}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">Multiple teams are blocked on the same issue Ã¢â‚¬â€ solving it once saves everyone.</p>
                <div className="space-y-3">
                  {blockerCollisions.map((group, i) => (
                    <CollisionCard key={i} type="blocker" items={group} spaceNames={spaceNames} onViewSpace={id => navigate(`${basePath}/spaces/${id}`)} />
                  ))}
                </div>
              </section>
            )}

            {/* Decision Conflicts */}
            {decisionCollisions.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Scale className="w-4 h-4 text-amber-400" />
                  <h2 className="font-semibold text-foreground text-sm">Conflicting or Duplicate Decisions</h2>
                  <span className="text-xs text-amber-400 font-bold ml-1">{decisionCollisions.length} detected</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">These decisions may contradict or duplicate each other across teams.</p>
                <div className="space-y-3">
                  {decisionCollisions.map((group, i) => (
                    <CollisionCard key={i} type="decision" items={group} spaceNames={spaceNames} onViewSpace={id => navigate(`${basePath}/spaces/${id}`)} />
                  ))}
                </div>
              </section>
            )}

            {/* Commitment Duplicates */}
            {commitmentCollisions.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                  <h2 className="font-semibold text-foreground text-sm">Duplicate Commitments Across Teams</h2>
                  <span className="text-xs text-blue-400 font-bold ml-1">{commitmentCollisions.length} detected</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">Different teams may be duplicating effort on the same commitment.</p>
                <div className="space-y-3">
                  {commitmentCollisions.map((group, i) => (
                    <CollisionCard key={i} type="commitment" items={group} spaceNames={spaceNames} onViewSpace={id => navigate(`${basePath}/spaces/${id}`)} />
                  ))}
                </div>
              </section>
            )}

            {/* Siloed Spaces */}
            {siloedSpaces.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Network className="w-4 h-4 text-white/60" />
                  <h2 className="font-semibold text-foreground text-sm">Knowledge-Isolated Spaces</h2>
                  <span className="text-xs text-muted-foreground ml-1">{siloedSpaces.length} space{siloedSpaces.length > 1 ? 's' : ''} with no cross-team knowledge sharing (30d)</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {siloedSpaces.map(s => (
                    <button
                      key={s.id}
                      onClick={() => navigate(`${basePath}/spaces/${s.id}`)}
                      className="p-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] text-left hover:bg-white/[0.04] transition-colors group"
                    >
                      <div className="w-6 h-6 rounded-lg bg-transparent0/10 border border-slate-500/20 flex items-center justify-center mb-2">
                        <Shield className="w-3.5 h-3.5 text-white/60" />
                      </div>
                      <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">{s.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">No cross-sharing</p>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {totalCollisions === 0 && siloedSpaces.length === 0 && !loading && (
              <div className="text-center py-16">
                <Shield className="w-12 h-12 text-[#00beac] mx-auto mb-3" />
                <p className="text-lg font-bold text-foreground">No collisions detected</p>
                <p className="text-sm text-muted-foreground mt-1">Your teams are operating without significant overlap or isolation. Keep it up.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

