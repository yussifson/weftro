import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { generateText } from '@/lib/cloudflareAI';
import { AlertTriangle, ExternalLink, Loader2, Activity, CheckCircle } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function RedundantWorkAlert({ workspaceId, currentSpaceId }) {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (workspaceId && currentSpaceId && user?.clipad_plan === 'enterprise') {
      analyzeOverlap();
    } else {
      setLoading(false);
    }
  }, [workspaceId, currentSpaceId, user?.clipad_plan]);

  const analyzeOverlap = async () => {
    setLoading(true);
    try {
      // 1. Fetch recent activity in THIS space
      const [localMeetingsRes, localDecisionsRes] = await Promise.all([
        supabase.from('clipad_meeting_records').select('title, ai_summary').eq('space_id', currentSpaceId).order('created_at', { ascending: false }).limit(3),
        supabase.from('clipad_decisions').select('decision_text').eq('team_space_id', currentSpaceId).order('created_at', { ascending: false }).limit(3),
      ]);

      const localContext = [
        ...(localMeetingsRes.data || []).map(m => `Meeting: ${m.title} - ${m.ai_summary}`),
        ...(localDecisionsRes.data || []).map(d => `Decision: ${d.decision_text}`)
      ].join('\n');

      if (!localContext) { setLoading(false); return; }

      // 2. Fetch recent activity in OTHER spaces
      const [otherMeetingsRes, otherDecisionsRes] = await Promise.all([
        supabase.from('clipad_meeting_records').select('id, title, ai_summary, space_id, space:space_id(name)').eq('workspace_id', workspaceId).neq('space_id', currentSpaceId).order('created_at', { ascending: false }).limit(5),
        supabase.from('clipad_decisions').select('id, decision_text, team_space_id, space:team_space_id(name)').eq('workspace_id', workspaceId).neq('team_space_id', currentSpaceId).order('created_at', { ascending: false }).limit(5),
      ]);

      const otherActivity = [
        ...(otherMeetingsRes.data || []).map(m => `[ID: M-${m.id}] [Space: ${m.space?.name || 'Unknown'}] Meeting: ${m.title}`),
        ...(otherDecisionsRes.data || []).map(d => `[ID: D-${d.id}] [Space: ${d.space?.name || 'Unknown'}] Decision: ${d.decision_text}`)
      ].join('\n');

      if (!otherActivity) { setLoading(false); return; }

      // 3. Ask AI to find semantic overlap
      const aiResponse = await generateText([
        {
          role: 'system',
          content: `You are an organizational intelligence engine. Compare "Team A's Activity" with "Other Teams' Activity". If you detect any strong semantic overlap that suggests they are working on the exact same project, feature, or blocker independently, return a JSON array of the redundant topics. Otherwise, return [].
Format: [{"topic_name": "Short name", "space_name": "Name of other space", "reason": "Short reason", "source_id": "M-uuid"}]
Do NOT wrap in markdown blocks.`
        },
        {
          role: 'user',
          content: `Team A's Activity:\n${localContext}\n\nOther Teams' Activity:\n${otherActivity}`
        }
      ]);

      let parsedAlerts = [];
      try {
        let text = typeof aiResponse === 'string' ? aiResponse : aiResponse?.response || '[]';
        if (text.startsWith('```json')) text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        parsedAlerts = JSON.parse(text);
      } catch { /* ignore parse error */ }

      if (Array.isArray(parsedAlerts) && parsedAlerts.length > 0) {
        setAlerts(parsedAlerts.map(a => ({ ...a, id: Math.random().toString() })));
      }

    } catch (err) {
      console.error('[RedundantWorkAlert]', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-slate-200 dark:border-border p-5 h-full flex flex-col">
      <div className="flex flex-wrap items-center justify-between mb-4 gap-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-foreground flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-500 shrink-0" />
          <span className="leading-tight truncate">Redundant Work</span>
        </h2>
        {alerts && alerts.length > 0 && (
          <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs px-2 py-0.5 rounded-full font-bold shrink-0">
            Detected
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      ) : !alerts || alerts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
          <CheckCircle className="w-8 h-8 text-slate-300 dark:text-slate-600 dark:text-muted-foreground mb-2" />
          <p className="text-xs text-slate-500 dark:text-muted-foreground">No overlapping work detected across teams.</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <p className="text-xs text-amber-700 dark:text-amber-400 mb-3 font-medium">
            Semantic overlap detected with other spaces.
          </p>
          <div className="space-y-2 flex-1">
            {alerts.map(alert => {
              const idStr = alert.source_id ? alert.source_id.substring(2) : '';
              const linkUrl = alert.source_id?.startsWith('M-') ? `/clipad/meetings/${idStr}` : '#';

              return (
                <div key={alert.id} className="p-3 bg-slate-50 dark:bg-secondary/20 border border-slate-100 dark:border-border/50 rounded-lg flex flex-col gap-1.5">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-semibold text-slate-900 dark:text-foreground">{alert.topic_name}</p>
                    {linkUrl !== '#' && (
                      <a href={linkUrl} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded transition-colors">
                        View <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-muted-foreground">
                    Also in <strong className="text-slate-700 dark:text-foreground">{alert.space_name || 'Another Space'}</strong>
                  </p>
                  {alert.reason && <p className="text-[10px] text-slate-400 italic line-clamp-2">"{alert.reason}"</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
