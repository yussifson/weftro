import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Globe, Clock, AlertCircle, Loader2, RefreshCw, CheckCircle } from 'lucide-react';
import { generateText } from '@/lib/cloudflareAI';

export default function TimezoneFairnessWidget({ workspaceId }) {
  const [fairnessData, setFairnessData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (workspaceId) {
      loadFairnessData();
    }
  }, [workspaceId]);

  const loadFairnessData = async () => {
    setLoading(true);

    // Verify there are actually meetings before using any fairness data
    const { count, error: countError } = await supabase
      .from('clipad_meeting_records')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', workspaceId);

    if (countError || count === 0) {
      setFairnessData({ fairness_score: null, ai_analysis: null, meetings_analyzed: 0 });
      setLoading(false);
      return;
    }

    // Try cached result first
    const { data: cached } = await supabase
      .from('clipad_timezone_fairness')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached && cached.ai_analysis) {
      setFairnessData(cached);
      setLoading(false);
      return;
    }

    // No cache — analyze from real meeting data
    await analyzeFromMeetings();
  };

  const analyzeFromMeetings = async () => {
    setAnalyzing(true);
    try {
      // Fetch recent meetings with timestamps
      const { data: meetings } = await supabase
        .from('clipad_meeting_records')
        .select('title, created_at, ended_at, ai_summary')
        .eq('company_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!meetings || meetings.length === 0) {
        setFairnessData({ fairness_score: null, ai_analysis: null, meetings_analyzed: 0 });
        setAnalyzing(false);
        setLoading(false);
        return;
      }

      // Compute hour distribution of meetings
      const hourCounts = Array(24).fill(0);
      meetings.forEach(m => {
        const hour = new Date(m.created_at).getUTCHours();
        hourCounts[hour]++;
      });

      const earlyMorning = hourCounts.slice(0, 6).reduce((a, b) => a + b, 0);   // 00:00–05:59 UTC
      const businessHours = hourCounts.slice(8, 18).reduce((a, b) => a + b, 0); // 08:00–17:59 UTC
      const evening = hourCounts.slice(18, 24).reduce((a, b) => a + b, 0);       // 18:00–23:59 UTC
      const lateNight = earlyMorning; // same bucket for clarity

      const meetingHoursSummary = meetings.map(m => {
        const d = new Date(m.created_at);
        return `"${m.title || 'Meeting'}" at ${d.toUTCString().slice(17, 22)} UTC`;
      }).join('; ');

      const aiResult = await generateText([
        {
          role: 'system',
          content: `You are a workplace timezone fairness analyst. Analyze the meeting schedule and return ONLY valid JSON with these keys:
"fairness_score": integer 0-100 (100 = perfectly fair across timezones, 0 = extremely unfair/biased toward one timezone),
"fairness_label": one of "Excellent", "Good", "Needs Attention", "Poor",
"insight": a 1-2 sentence analysis of the meeting time distribution and its impact on global team members,
"recommendation": a concrete 1-sentence recommendation to improve fairness.
Do NOT wrap in markdown.`,
        },
        {
          role: 'user',
          content: `Total meetings: ${meetings.length}
Meeting times (UTC): ${meetingHoursSummary}
Distribution: Early morning (00-06 UTC): ${earlyMorning}, Business hours (08-18 UTC): ${businessHours}, Evening (18-24 UTC): ${evening}`,
        },
      ]);

      const text = typeof aiResult === 'string' ? aiResult : aiResult?.response || '';
      const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      let parsed = {};
      try {
        // Try fixing truncated JSON by appending closing brace if missing
        let toParse = cleanText;
        if (toParse.trim().startsWith('{') && !toParse.trim().endsWith('}')) {
          toParse += '"}'; // close last string and object
        }
        try {
          parsed = JSON.parse(toParse);
        } catch {
          // If still fails, try closing just the object
          parsed = JSON.parse(cleanText + '}');
        }
      } catch {
        try {
           const extract = (key) => {
               // Match the key, then the value wrapped in quotes.
               const regex = new RegExp(`"${key}"\\s*:\\s*"([\\s\\S]*?)"(?:\\s*,|\\s*}|$)`);
               const match = cleanText.match(regex);
               return match ? match[1].replace(/\\"/g, '"').replace(/\\n/g, ' ') : '';
           };
           parsed = {
               fairness_score: parseInt((cleanText.match(/"fairness_score"\s*:\s*(\d+)/) || [])[1]) || 50,
               fairness_label: extract('fairness_label') || 'Good',
               insight: extract('insight') || cleanText.replace(/[{}]/g, '').trim(),
               recommendation: extract('recommendation') || ''
           };
        } catch {
           parsed = { fairness_score: 50, fairness_label: 'Good', insight: cleanText.replace(/[{}]/g, '').trim(), recommendation: '' };
        }
      }

      const result = {
        workspace_id: workspaceId,
        fairness_score: parsed.fairness_score ?? 50,
        fairness_label: parsed.fairness_label || 'Good',
        ai_analysis: parsed.insight || '',
        recommendation: parsed.recommendation || '',
        meetings_analyzed: meetings.length,
        created_at: new Date().toISOString(),
      };

      // Cache the result
      const { error: upsertError } = await supabase
        .from('clipad_timezone_fairness')
        .upsert({ ...result }, { onConflict: 'workspace_id' });

      if (upsertError) console.warn('Could not cache timezone fairness:', upsertError.message);

      setFairnessData(result);
    } catch (err) {
      console.error('Timezone fairness analysis failed:', err);
      setFairnessData({ fairness_score: null, ai_analysis: 'Analysis failed. Please try again.', meetings_analyzed: 0 });
    }
    setAnalyzing(false);
    setLoading(false);
  };

  if (loading || analyzing) {
    return (
      <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-slate-200 dark:border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-5 h-5 text-teal-500" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Timezone Fairness</h2>
        </div>
        <div className="flex items-center gap-3 py-6 justify-center text-slate-400 dark:text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">{analyzing ? 'AI is analyzing meeting patterns…' : 'Loading…'}</span>
        </div>
      </div>
    );
  }

  const score = fairnessData?.fairness_score;
  const label = fairnessData?.fairness_label;
  const scoreColor = score >= 75 ? 'text-emerald-600 dark:text-emerald-400'
    : score >= 50 ? 'text-amber-600 dark:text-amber-400'
    : 'text-red-600 dark:text-red-400';
  const barColor = score >= 75 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-slate-200 dark:border-border p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-teal-500" />
            Timezone Fairness
          </h2>
          <p className="text-sm text-slate-500 dark:text-muted-foreground mt-1">Analyzing out-of-hours meeting burden.</p>
        </div>
        <div className="flex items-center gap-2">
          {score !== null && (
            <span className={`text-2xl font-bold ${scoreColor}`}>{score}</span>
          )}
          <button
            onClick={analyzeFromMeetings}
            disabled={analyzing}
            className="text-slate-400 hover:text-primary transition-colors p-1"
            title="Re-analyze"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {score !== null && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <span className={`text-xs font-semibold ${scoreColor}`}>{label}</span>
            <span className="text-xs text-slate-400">{fairnessData?.meetings_analyzed || 0} meetings analyzed</span>
          </div>
          <div className="h-2 bg-slate-100 dark:bg-secondary rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${score}%` }} />
          </div>
        </div>
      )}

      {fairnessData?.ai_analysis ? (
        <div className="space-y-2">
          <p className="text-sm text-slate-600 dark:text-foreground leading-relaxed">{fairnessData.ai_analysis}</p>
          {fairnessData.recommendation && (
            <div className="flex items-start gap-2 mt-3 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-100 dark:border-teal-800">
              <CheckCircle className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
              <p className="text-xs text-teal-700 dark:text-teal-300">{fairnessData.recommendation}</p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-400 italic">No meeting data yet. Start running meetings to see timezone fairness analysis.</p>
      )}
    </div>
  );
}
