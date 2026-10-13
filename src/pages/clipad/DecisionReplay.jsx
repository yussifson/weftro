import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { generateText } from '@/lib/cloudflareAI';
import { format, formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft, Scale, Clock, Users, FileText, Video, GitBranch,
  AlertTriangle, CheckCircle2, Target, Sparkles, Link2, Play,
  ChevronRight, TrendingUp, TrendingDown, Minus, ExternalLink,
  MessageSquare, Shield, Zap, Eye, Edit3, Plus, X, Save, RefreshCw, Activity
} from 'lucide-react';
import { OrbitLoader } from '@/components/ui/orbit-loader';

const OUTCOME_OPTIONS = [
  { value: 'successful', label: 'Successful', icon: TrendingUp, color: 'text-[#006065]', bg: 'bg-[#006065] dark:bg-[#131A2C]/10 border-[#006065] dark:border-border/30' },
  { value: 'partial', label: 'Partially', icon: Minus, color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/30' },
  { value: 'unsuccessful', label: 'Unsuccessful', icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/30' },
  { value: 'pending', label: 'Still Pending', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
];

function SkeletonLine({ w = 'full', h = 4 }) {
  return <div className={`w-${w} h-${h} bg-white/5 rounded animate-pulse`} />;
}

export default function DecisionReplay() {
  const { decisionId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const companyId = user?.user_metadata?.company_id || user?.company_id;

  const [decision, setDecision] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contextChain, setContextChain] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [relatedMeeting, setRelatedMeeting] = useState(null);
  const [relatedVideo, setRelatedVideo] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analysingAI, setAnalysingAI] = useState(false);
  const [showOutcomeEditor, setShowOutcomeEditor] = useState(false);
  const [outcomeValue, setOutcomeValue] = useState('');
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [savingOutcome, setSavingOutcome] = useState(false);

  const loadDecision = useCallback(async () => {
    if (!decisionId || !companyId) return;
    setLoading(true);
    try {
      // Load the decision itself
      const { data: dec } = await supabase
        .from('clipad_decisions')
        .select('*')
        .eq('id', decisionId)
        .single();

      if (!dec) { setLoading(false); return; }
      setDecision(dec);
      setOutcomeValue(dec.outcome_status || '');
      setOutcomeNotes(dec.outcome_notes || '');

      // Build context chain: related meetings, commitments, blockers
      const [meetingRes, commitRes, blockerRes, knowledgeRes] = await Promise.allSettled([
        dec.meeting_id
          ? supabase.from('clipad_meetings').select('id, title, created_at, duration_seconds').eq('id', dec.meeting_id).single()
          : Promise.resolve({ data: null }),
        supabase.from('clipad_commitments').select('id, commitment_text, owner_name, due_date, status, created_at')
          .eq('team_space_id', dec.team_space_id).order('created_at', { ascending: false }).limit(5),
        supabase.from('clipad_blockers').select('id, description, resolved, created_at')
          .eq('team_space_id', dec.team_space_id).order('created_at', { ascending: false }).limit(5),
        supabase.from('clipad_imported_knowledge').select('id, title, provider, content_type, imported_at')
          .eq('company_id', companyId).ilike('title', `%${dec.decision_text?.split(' ').slice(0, 3).join(' ')}%`).limit(4),
      ]);

      if (meetingRes.status === 'fulfilled' && meetingRes.value.data) {
        setRelatedMeeting(meetingRes.value.data);
      }

      const chain = [];
      if (commitRes.status === 'fulfilled' && commitRes.value.data?.length) {
        commitRes.value.data.forEach(c => chain.push({ type: 'commitment', ...c }));
      }
      if (blockerRes.status === 'fulfilled' && blockerRes.value.data?.length) {
        blockerRes.value.data.forEach(b => chain.push({ type: 'blocker', ...b }));
      }
      if (knowledgeRes.status === 'fulfilled' && knowledgeRes.value.data?.length) {
        knowledgeRes.value.data.forEach(k => chain.push({ type: 'knowledge', ...k }));
      }
      setContextChain(chain);

      // Find conflicting decisions (other decisions from same company on similar topics)
      const words = (dec.decision_text || '').split(' ').filter(w => w.length > 4).slice(0, 4);
      if (words.length > 0) {
        const conflictPromises = words.map(w =>
          supabase.from('clipad_decisions')
            .select('id, decision_text, rationale, created_at, status, team_space_id')
            .eq('workspace_id', companyId)
            .neq('id', decisionId)
            .ilike('decision_text', `%${w}%`)
            .limit(3)
        );
        const conflictResults = await Promise.allSettled(conflictPromises);
        const conflictMap = new Map();
        conflictResults.forEach(r => {
          if (r.status === 'fulfilled' && r.value.data) {
            r.value.data.forEach(d => conflictMap.set(d.id, d));
          }
        });
        setConflicts(Array.from(conflictMap.values()).slice(0, 5));
      }

      // Load associated video if any
      if (dec.meeting_id) {
        const { data: vid } = await supabase
          .from('clipad_videos')
          .select('id, title, duration_seconds')
          .eq('meeting_id', dec.meeting_id)
          .maybeSingle();
        setRelatedVideo(vid);
      }
    } catch (e) {
      console.error('Decision load error:', e);
    } finally {
      setLoading(false);
    }
  }, [decisionId, companyId]);

  useEffect(() => { loadDecision(); }, [loadDecision]);

  const runAIAnalysis = async () => {
    if (!decision) return;
    setAnalysingAI(true);
    try {
      const prompt = `You are an organizational intelligence analyst. Analyze this decision and give a sharp, structured assessment.

DECISION: "${decision.decision_text}"
RATIONALE: "${decision.rationale || 'Not recorded'}"
DATE: ${decision.created_at}
STATUS: ${decision.status || 'active'}
OUTCOME: ${decision.outcome_status || 'not yet recorded'}

CONTEXT CHAIN (${contextChain.length} items):
${contextChain.slice(0, 5).map(c => `- [${c.type}] ${c.commitment_text || c.description || c.title}`).join('\n')}

RELATED DECISIONS THAT MAY CONFLICT:
${conflicts.slice(0, 3).map(c => `- "${c.decision_text}" (${format(new Date(c.created_at), 'MMM yyyy')})`).join('\n')}

Respond in valid JSON only:
{
  "impact_score": (1-10 integer),
  "risk_level": ("low"|"medium"|"high"|"critical"),
  "key_insight": "one sentence insight about this decision",
  "what_went_well": "brief analysis of positive aspects",
  "watch_out_for": "brief analysis of risks or concerns",
  "conflict_summary": "plain English summary of any conflicts found or 'No conflicts detected'",
  "recommended_next_action": "the single most important next step"
}`;

      const raw = await generateText([
        { role: 'system', content: 'You are a data extraction AI. Respond ONLY with valid JSON.' },
        { role: 'user', content: prompt }
      ]);
      const cleaned = (raw || '').replace(/```json|```/g, '').trim();
      setAiAnalysis(JSON.parse(cleaned));
    } catch {
      setAiAnalysis({ error: true, key_insight: 'Analysis unavailable. Check AI connection.' });
    } finally {
      setAnalysingAI(false);
    }
  };

  const saveOutcome = async () => {
    if (!outcomeValue || !decisionId) return;
    setSavingOutcome(true);
    try {
      await supabase.from('clipad_decisions').update({
        outcome_status: outcomeValue,
        outcome_notes: outcomeNotes,
        outcome_recorded_at: new Date().toISOString(),
      }).eq('id', decisionId);
      setDecision(prev => ({ ...prev, outcome_status: outcomeValue, outcome_notes: outcomeNotes }));
      setShowOutcomeEditor(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingOutcome(false);
    }
  };

  const isLegacy = window.location.pathname.startsWith('/clipad');
  const basePath = isLegacy ? '/clipad' : '';

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <SkeletonLine w="48" h={6} />
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <SkeletonLine w="full" h={8} />
            <SkeletonLine w="3/4" h={4} />
            <SkeletonLine w="1/2" h={4} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!decision) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Scale className="w-12 h-12 text-muted-foreground mx-auto" />
          <p className="text-lg text-foreground font-semibold">Decision not found</p>
          <button onClick={() => navigate(`${basePath}/decisions`)} className="text-primary hover:underline text-sm">
            Back to Decision Ledger
          </button>
        </div>
      </div>
    );
  }

  const outcomeOption = OUTCOME_OPTIONS.find(o => o.value === decision.outcome_status);
  const riskColor = { low: 'emerald', medium: 'amber', high: 'orange', critical: 'red' }[aiAnalysis?.risk_level] || 'slate';

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">

        {/* Back + Header */}
        <div>
          <button
            onClick={() => navigate(`${basePath}/decisions`)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Decision Ledger
          </button>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <Scale className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Decision Replay</p>
                <p className="text-xs text-muted-foreground">{format(new Date(decision.created_at), 'MMMM d, yyyy • h:mm a')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {decision.status === 'active' && (
                <span className="px-2.5 py-1 rounded-full bg-[#006065] dark:bg-[#131A2C]/10 border border-[#006065] dark:border-border/30 text-[#00beac] text-xs font-bold">Active</span>
              )}
              {decision.ai_detected && (
                <span className="px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-400 text-xs font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> AI-Detected
                </span>
              )}
            </div>
          </div>
        </div>

        {/* The Decision — Hero Card */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 rounded-t-2xl" />
          <h1 className="text-xl md:text-2xl font-bold text-foreground leading-snug mb-4">
            {decision.decision_text}
          </h1>
          {decision.rationale && (
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 mb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Rationale</p>
              <p className="text-sm text-foreground/80 leading-relaxed">{decision.rationale}</p>
            </div>
          )}

          {/* Meta grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            {decision.importance_score && (
              <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 text-center">
                <p className="text-2xl font-black text-foreground">{decision.importance_score}<span className="text-sm font-normal text-muted-foreground">/10</span></p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mt-1">Impact</p>
              </div>
            )}
            {decision.confidence_score && (
              <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 text-center">
                <p className="text-2xl font-black text-foreground">{decision.confidence_score}<span className="text-sm font-normal text-muted-foreground">/10</span></p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mt-1">Confidence</p>
              </div>
            )}
            {decision.participants?.length > 0 && (
              <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 text-center">
                <p className="text-2xl font-black text-foreground">{decision.participants.length}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mt-1">Participants</p>
              </div>
            )}
            <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 text-center">
              <p className="text-2xl font-black text-foreground">{contextChain.length}</p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mt-1">Context Items</p>
            </div>
          </div>
        </div>

        {/* Outcome Tracker */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-foreground text-sm">Decision Outcome</h2>
            </div>
            <button
              onClick={() => setShowOutcomeEditor(!showOutcomeEditor)}
              className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 font-medium transition-colors"
            >
              {showOutcomeEditor ? <X className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
              {showOutcomeEditor ? 'Cancel' : 'Record Outcome'}
            </button>
          </div>

          {!showOutcomeEditor ? (
            outcomeOption ? (
              <div className={`flex items-center gap-3 p-3 rounded-xl border ${outcomeOption.bg}`}>
                <outcomeOption.icon className={`w-5 h-5 ${outcomeOption.color}`} />
                <div>
                  <p className={`font-semibold ${outcomeOption.color}`}>{outcomeOption.label}</p>
                  {decision.outcome_notes && <p className="text-xs text-muted-foreground mt-0.5">{decision.outcome_notes}</p>}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-white/10 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <p className="text-sm">No outcome recorded yet. Track this decision's result to build organizational memory.</p>
              </div>
            )
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {OUTCOME_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setOutcomeValue(opt.value)}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${outcomeValue === opt.value ? opt.bg : 'border-white/5 bg-white/[0.02] hover:bg-white/5'}`}
                  >
                    <opt.icon className={`w-4 h-4 ${outcomeValue === opt.value ? opt.color : 'text-muted-foreground'}`} />
                    <span className={`text-xs font-semibold ${outcomeValue === opt.value ? opt.color : 'text-muted-foreground'}`}>{opt.label}</span>
                  </button>
                ))}
              </div>
              <textarea
                value={outcomeNotes}
                onChange={e => setOutcomeNotes(e.target.value)}
                placeholder="Add context about the outcome (optional)..."
                rows={2}
                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
              />
              <button
                onClick={saveOutcome}
                disabled={!outcomeValue || savingOutcome}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-primary/90 transition-colors"
              >
                {savingOutcome ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Outcome
              </button>
            </div>
          )}
        </div>

        {/* Related Meeting + Video Jump */}
        {(relatedMeeting || relatedVideo) && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Video className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-foreground text-sm">Source Meeting</h2>
            </div>
            <div className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <Video className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{relatedMeeting?.title || relatedVideo?.title || 'Meeting Recording'}</p>
                {relatedMeeting?.created_at && (
                  <p className="text-xs text-muted-foreground">{format(new Date(relatedMeeting.created_at), 'MMM d, yyyy')}</p>
                )}
              </div>
              {relatedVideo && (
                <button
                  onClick={() => navigate(`${basePath}/watch/${relatedVideo.id}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/20 text-primary rounded-lg text-xs font-semibold hover:bg-primary/20 transition-colors"
                >
                  <Play className="w-3 h-3" fill="currentColor" />
                  Jump to Video
                </button>
              )}
              {relatedMeeting && !relatedVideo && (
                <button
                  onClick={() => navigate(`${basePath}/meetings/${relatedMeeting.id}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 text-foreground rounded-lg text-xs font-semibold hover:bg-white/10 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open Meeting
                </button>
              )}
            </div>
          </div>
        )}

        {/* Context Chain */}
        {contextChain.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <GitBranch className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-foreground text-sm">Context Chain</h2>
              <span className="ml-auto text-xs text-muted-foreground">{contextChain.length} items</span>
            </div>
            <div className="space-y-2">
              {contextChain.map((item, i) => {
                const typeConfig = {
                  commitment: { icon: CheckCircle2, color: 'text-[#00beac]', bg: 'bg-[#006065] dark:bg-[#131A2C]/10 border-[#006065] dark:border-border/20', label: 'Commitment' },
                  blocker: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', label: 'Blocker' },
                  knowledge: { icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', label: 'Knowledge' },
                }[item.type] || { icon: Link2, color: 'text-white/60', bg: 'bg-transparent0/10 border-slate-500/20', label: 'Related' };
                const TypeIcon = typeConfig.icon;
                const text = item.commitment_text || item.description || item.title || '';
                return (
                  <div key={item.id || i} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${typeConfig.bg} border`}>
                      <TypeIcon className={`w-3.5 h-3.5 ${typeConfig.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${typeConfig.color}`}>{typeConfig.label}</span>
                        {item.created_at && <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>}
                      </div>
                      <p className="text-sm text-foreground/80 line-clamp-2">{text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Conflict Detector */}
        {conflicts.length > 0 && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h2 className="font-semibold text-amber-300 text-sm">Potential Decision Conflicts</h2>
              <span className="ml-auto text-xs text-amber-400/70">{conflicts.length} found</span>
            </div>
            <p className="text-xs text-amber-400/80 mb-3">These decisions may be related to or contradict this one. Review carefully.</p>
            <div className="space-y-2">
              {conflicts.map(c => (
                <button
                  key={c.id}
                  onClick={() => navigate(`${basePath}/decisions/${c.id}/replay`)}
                  className="w-full flex items-start gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 hover:bg-amber-500/10 transition-colors text-left group"
                >
                  <Scale className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground line-clamp-2">{c.decision_text}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(c.created_at), 'MMM d, yyyy')}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-400/50 group-hover:text-amber-400 transition-colors shrink-0 mt-0.5" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Orbit AI Analysis */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <h2 className="font-semibold text-foreground text-sm">Orbit AI Analysis</h2>
            </div>
            {!aiAnalysis && !analysingAI && (
              <button
                onClick={runAIAnalysis}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-lg text-xs font-semibold hover:bg-violet-500/20 transition-colors"
              >
                <Zap className="w-3 h-3" />
                Run Analysis
              </button>
            )}
          </div>

          {analysingAI && (
            <div className="flex items-center gap-3 py-6 justify-center text-muted-foreground">
              <RefreshCw className="w-4 h-4 animate-spin text-violet-400" />
              <span className="text-sm">Orbit is analyzing this decision...</span>
            </div>
          )}

          {aiAnalysis && !aiAnalysis.error && (
            <div className="space-y-4">
              {/* Impact + Risk */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                  <p className="text-2xl font-black text-foreground">{aiAnalysis.impact_score}<span className="text-sm font-normal text-muted-foreground">/10</span></p>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mt-1">AI Impact Score</p>
                </div>
                <div className={`p-3 rounded-xl border text-center bg-${riskColor}-500/10 border-${riskColor}-500/30`}>
                  <p className={`text-lg font-black capitalize text-${riskColor}-400`}>{aiAnalysis.risk_level}</p>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mt-1">Risk Level</p>
                </div>
              </div>

              {/* Key Insight */}
              <div className="p-3 rounded-xl bg-violet-500/5 border border-violet-500/20">
                <p className="text-xs font-bold text-violet-300 uppercase tracking-wider mb-1">Key Insight</p>
                <p className="text-sm text-foreground/90">{aiAnalysis.key_insight}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {aiAnalysis.what_went_well && (
                  <div className="p-3 rounded-xl bg-[#006065] dark:bg-[#131A2C]/5 border border-[#006065] dark:border-border/20">
                    <p className="text-xs font-bold text-[#00beac] uppercase tracking-wider mb-1">What Went Well</p>
                    <p className="text-sm text-foreground/80">{aiAnalysis.what_went_well}</p>
                  </div>
                )}
                {aiAnalysis.watch_out_for && (
                  <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                    <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">Watch Out For</p>
                    <p className="text-sm text-foreground/80">{aiAnalysis.watch_out_for}</p>
                  </div>
                )}
              </div>

              {aiAnalysis.conflict_summary && aiAnalysis.conflict_summary !== 'No conflicts detected' && (
                <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                  <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1">Conflict Analysis</p>
                  <p className="text-sm text-foreground/80">{aiAnalysis.conflict_summary}</p>
                </div>
              )}

              {aiAnalysis.recommended_next_action && (
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Recommended Next Action</p>
                  <p className="text-sm text-foreground/90">{aiAnalysis.recommended_next_action}</p>
                </div>
              )}

              <button
                onClick={runAIAnalysis}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className="w-3 h-3" /> Re-analyze
              </button>
            </div>
          )}

          {!aiAnalysis && !analysingAI && (
            <div className="text-center py-6 text-muted-foreground">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Run an AI analysis to get impact scoring, risk level, conflict detection, and recommended next actions.</p>
            </div>
          )}
        </div>

        {/* Participants */}
        {decision.participants?.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-foreground text-sm">Decision Participants</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {decision.participants.map((p, i) => (
                <span key={i} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-foreground">{p}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

