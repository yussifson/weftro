import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { generateText } from '@/lib/cloudflareAI';
import { AlertTriangle, ExternalLink, Loader2 } from 'lucide-react';
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

  if (loading) return null; // fail silently so UI isn't jittery
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 bg-amber-100 dark:bg-amber-900/50 p-2 rounded-full text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-2">
            Redundant Work Detected
            <span className="bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 text-xs px-2 py-0.5 rounded-full font-medium">
              Enterprise AI
            </span>
          </h3>
          <p className="text-sm text-amber-800 dark:text-amber-400 mt-1">
            Our Semantic Engine detected that another team is currently discussing or working on similar topics. 
            Consider aligning to avoid duplication of effort.
          </p>
          
          <div className="mt-3 space-y-2">
            {alerts.map(alert => {
              const idStr = alert.source_id ? alert.source_id.substring(2) : '';
              const linkUrl = alert.source_id?.startsWith('M-') ? `/clipad/meetings/${idStr}` : '#';

              return (
                <div key={alert.id} className="bg-white dark:bg-card border border-amber-100 dark:border-amber-900/50 rounded-md p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">Topic: {alert.topic_name}</p>
                    <p className="text-xs text-slate-500 dark:text-muted-foreground mt-0.5">
                      Being discussed in <strong className="text-slate-700 dark:text-foreground">{alert.space_name || 'Another Space'}</strong>
                    </p>
                    {alert.reason && <p className="text-[10px] text-slate-400 mt-1 italic">"{alert.reason}"</p>}
                  </div>
                  {linkUrl !== '#' && (
                    <a href={linkUrl} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-md transition-colors">
                      View Context <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
