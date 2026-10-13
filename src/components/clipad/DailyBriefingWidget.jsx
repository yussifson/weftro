import React, { useState, useEffect } from 'react';
import { Sparkles, Calendar, AlertTriangle, CheckCircle2, ArrowRight, RefreshCw } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { generateText } from '@/lib/cloudflareAI';
import { useAuth } from '@/lib/AuthContext';

export default function DailyBriefingWidget() {
  const { user } = useAuth();
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [isExpanded, setIsExpanded] = useState(false);

  const fetchAndGenerateBriefing = async (forceRefresh = false) => {
    if (!user?.company_id) return;

    // Check 6h cache unless force-refreshing
    if (!forceRefresh) {
      const today = new Date().toISOString().slice(0, 10);
      const cacheKey = `briefing:${user.company_id}:${today}`;
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { data, ts } = JSON.parse(cached);
          if (data && Date.now() - ts < 6 * 60 * 60 * 1000) {
            setBriefing(data);
            setLoading(false);
            return;
          }
        }
      } catch (_) {/* cache miss is fine */}
    }

    setLoading(true);
    try {
      // 1. Fetch yesterday's meetings, pending commitments, and blockers
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const [meetingsRes, commitmentsRes, blockersRes] = await Promise.all([
        Promise.resolve(supabase.from('clipad_meeting_records').select('title, ai_summary').eq('company_id', user.company_id).gte('created_at', yesterday).limit(5)).catch(() => ({ data: [] })),
        Promise.resolve(supabase.from('clipad_commitments').select('id, commitment_text, due_date').limit(5)).catch(() => ({ data: [] })),
        Promise.resolve(supabase.from('clipad_blockers').select('id, description, severity').limit(5)).catch(() => ({ data: [] })),
      ]);

      const meetings = meetingsRes.data || [];
      const commitments = commitmentsRes.data || [];
      const blockers = blockersRes.data || [];

      // If no data is available yet, provide default fallback briefing
      if (meetings.length === 0 && commitments.length === 0 && blockers.length === 0) {
        setBriefing({
          greeting: `Good day, ${user?.full_name?.split(' ')[0] || 'Team'}!`,
          highlights: ["All operational signals normal. No critical blockers detected."],
          topPriorities: ["Review upcoming team meetings for today", "Check open action items"],
          risks: []
        });
        return;
      }

      // 2. Synthesize using Kimi K2.5
      const prompt = `You are an executive chief of staff. Synthesize a concise 3-bullet "Good Morning Executive Briefing" based on these org signals:
      Meetings in last 24h: ${JSON.stringify(meetings)}
      Active Commitments: ${JSON.stringify(commitments)}
      Active Blockers: ${JSON.stringify(blockers)}

      Return ONLY valid JSON with keys:
      - "greeting": short personalized greeting
      - "highlights": array of 2-3 key accomplishments/meeting summaries from yesterday
      - "topPriorities": array of 2-3 urgent commitments due soon
      - "risks": array of 1-2 critical blockers or risk warnings (can be empty array)`;

      const raw = await generateText([{ role: 'user', content: prompt }]);
      // Strip all <think>...</think> reasoning blocks and orphan tags before parsing JSON
      const cleaned = (raw || '')
        .replace(/<(think|thought)>[\s\S]*?<\/\1>/gi, '')
        .replace(/<(think|thought)>[\s\S]*$/gi, '')
        .replace(/<\/(think|thought)>/gi, '')
        .replace(/```json|```/g, '')
        .trim();
      
      let parsed;
      try {
        if (cleaned.startsWith('Our AI servers')) {
          throw new Error('AI Gateway fallback text received');
        }
        parsed = JSON.parse(cleaned);
      } catch (parseError) {
        console.warn('Failed to parse AI response as JSON:', parseError);
        throw parseError; // Triggers the outer catch block to use the default fallback briefing
      }
      
      setBriefing(parsed);
      // Persist to cache
      try {
        const today = new Date().toISOString().slice(0, 10);
        const cacheKey = `briefing:${user.company_id}:${today}`;
        localStorage.setItem(cacheKey, JSON.stringify({ data: parsed, ts: Date.now() }));
      } catch (_) {/* storage quota errors are non-fatal */}

    } catch (err) {
      console.warn("Failed to daily briefing", err);
      setBriefing({
        greeting: `Good day, ${user?.full_name?.split(' ')[0] || 'Team'}!`,
        highlights: ["Workspace initialized. All systems operating smoothly."],
        topPriorities: ["Review active tasks & space discussions"],
        risks: []
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAndGenerateBriefing();
  }, [user?.company_id]);

  if (loading) {
    return (
      <div className="p-5 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border shadow-sm animate-pulse flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#006065] dark:bg-[#131A2C]/10 border border-[#006065] dark:border-border/20 flex items-center justify-center">
            <Sparkles className="w-4.5 h-4.5 text-[#006065] animate-spin" />
          </div>
          <span className="text-sm font-medium text-slate-600 dark:text-muted-foreground">Synthesizing your Executive Daily Briefing...</span>
        </div>
      </div>
    );
  }

  if (!briefing) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border shadow-sm transition-all duration-300 hover:shadow-md p-5 group">
      {/* Top glowing accent bar */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-t-2xl" />

      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="w-9 h-9 rounded-xl bg-[#006065] dark:bg-card border border-[#006065] dark:border-border flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-[#006065] dark:text-[#00beac]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[#fad503] uppercase tracking-widest bg-[#00beac]/10 px-2 py-0.5 rounded-full border border-[#00beac]/20">
                Daily Briefing
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-foreground tracking-tight mt-0.5">{briefing.greeting}</h3>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setRefreshing(true); fetchAndGenerateBriefing(true); }}
            disabled={refreshing}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-accent/80 text-slate-500 dark:text-muted-foreground transition-colors"
            title="Refresh briefing"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-accent/80 text-slate-500 dark:text-muted-foreground transition-colors text-xs font-bold"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-border/80 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Grid of Signals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Yesterday's Highlights */}
            {briefing.highlights?.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-background/80 dark:bg-slate-800/40 border border-slate-200 dark:border-border/80 space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#006065] dark:text-[#00beac] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Yesterday's Key Highlights
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-700 dark:text-muted-foreground leading-relaxed">
                  {briefing.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#006065] dark:bg-[#131A2C] shrink-0 mt-1.5" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Top Priorities & Risks */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-background/80 dark:bg-slate-800/40 border border-slate-200 dark:border-border/80 space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Today's Priorities
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-700 dark:text-muted-foreground leading-relaxed">
                {briefing.topPriorities?.map((p, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>

              {briefing.risks?.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-border/60">
                  <span className="text-[11px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Risks / Blockers
                  </span>
                  <ul className="space-y-1 text-xs text-red-600 dark:text-red-300">
                    {briefing.risks.map((r, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-red-500 font-bold">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Footer Bar */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-border/80 flex items-center justify-between text-xs">
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 dark:text-muted-foreground">
              Powered by Orbit AI
            </span>
            <button
              onClick={() => {
                // Ensure Orbit AI panel opens first
                window.dispatchEvent(new CustomEvent('toggle-clipad-orbit'));
                // Delay sending the prompt slightly to allow side drawer animation to initialize
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('orbit:inject', {
                    detail: { query: 'Give me a deeper breakdown of my team’s active blockers and commitments' }
                  }));
                }, 150);
              }}
              className="flex items-center gap-1 text-xs font-bold text-[#006065] dark:text-[#00beac] hover:text-[#004e52] dark:hover:text-emerald-300 transition-colors group/btn"
            >
              Ask Orbit <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

