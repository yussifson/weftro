import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { generateText } from '@/lib/cloudflareAI';
import { Target, MessageCircle, AlertCircle, ArrowRight, CheckCircle2, Clock, Send, Loader2, CheckCheck } from 'lucide-react';

export default function FollowUpEngine({ spaceId, workspaceId }) {
  const { user } = useAuth();
  const [nudges, setNudges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState(null);
  const [sentIds, setSentIds] = useState(new Set());

  useEffect(() => {
    analyzeFollowUps();
  }, [spaceId, workspaceId]);

  async function analyzeFollowUps() {
    setLoading(true);
    try {
      let query = supabase
        .from('clipad_action_items')
        .select('*, assignee:assigned_to(id, full_name, email)')
        .eq('is_complete', false);

      if (spaceId) query = query.eq('space_id', spaceId);
      else if (workspaceId) query = query.eq('company_id', workspaceId);

      const { data: items } = await query;
      if (!items || items.length === 0) { setLoading(false); return; }

      const generatedNudges = [];
      const now = new Date();

      // Generate AI-crafted nudge messages for overdue/due-today items
      const relevantItems = items.filter(item => {
        if (!item.due_date) return false;
        const diffDays = Math.round((now - new Date(item.due_date)) / (1000 * 60 * 60 * 24));
        return diffDays >= 0; // overdue or due today
      });

      for (const item of relevantItems) {
        const dueDate = new Date(item.due_date);
        const diffDays = Math.round((now - dueDate) / (1000 * 60 * 60 * 24));
        const isOverdue = diffDays > 0;
        const assigneeName = item.assignee?.full_name || item.assigned_to_name || 'Team member';
        const firstName = assigneeName.split(' ')[0];

        // Use AI to generate a context-aware, personalized nudge message
        let draftMessage = '';
        try {
          const aiMsg = await generateText([
            {
              role: 'system',
              content: 'You are a professional team communication assistant. Write a short, friendly, professional nudge message (2-3 sentences max) for a team member. Be empathetic, not accusatory. Focus on offering help and moving forward.',
            },
            {
              role: 'user',
              content: `Write a nudge message to ${firstName} about the task "${item.title}" which is ${isOverdue ? `${diffDays} day(s) overdue` : 'due today'}. Context: ${item.description || 'No additional context'}.`,
            },
          ]);
          draftMessage = typeof aiMsg === 'string' ? aiMsg : `Hi ${firstName}, just following up on "${item.title}". ${isOverdue ? `It's ${diffDays} day(s) overdue.` : 'It\'s due today!'} Let me know if you need any help getting this done.`;
        } catch {
          draftMessage = `Hi ${firstName}, following up on "${item.title}" which is ${isOverdue ? `${diffDays} day(s) overdue` : 'due today'}. Please let me know if you need any support!`;
        }

        generatedNudges.push({
          id: isOverdue ? `overdue_${item.id}` : `today_${item.id}`,
          type: isOverdue ? 'overdue' : 'today',
          title: isOverdue ? `Overdue Task: ${item.title}` : `Due Today: ${item.title}`,
          description: isOverdue
            ? `${assigneeName} is ${diffDays} day(s) late on this commitment.`
            : `This is scheduled for completion today by ${assigneeName}.`,
          draftMessage,
          assigneeId: item.assignee?.id || item.assigned_to,
          assigneeEmail: item.assignee?.email,
          assigneeName,
          spaceId: item.space_id || spaceId,
          item,
        });
      }

      setNudges(generatedNudges.sort((a, b) => {
        if (a.type === 'overdue' && b.type !== 'overdue') return -1;
        if (b.type === 'overdue' && a.type !== 'overdue') return 1;
        return 0;
      }));
    } catch (err) {
      console.error('[FollowUpEngine]', err);
    } finally {
      setLoading(false);
    }
  }

  const handleSendNudge = async (nudge) => {
    if (sendingId || sentIds.has(nudge.id)) return;
    setSendingId(nudge.id);

    try {
      // Send nudge as a chat message or notification
      // First try to create a notification record
      const notifPayload = {
        user_id: nudge.assigneeId,
        type: 'follow_up_nudge',
        title: nudge.title,
        message: nudge.draftMessage,
        sender_id: user?.id,
        related_entity_type: 'action_item',
        related_entity_id: nudge.item?.id,
        is_read: false,
        created_at: new Date().toISOString(),
      };

      // Try to insert a notification
      const { error: notifError } = await supabase
        .from('clipad_notifications')
        .insert(notifPayload);

      if (notifError) {
        // If notification table doesn't exist yet, fall back to logging an org event
        await supabase.from('clipad_org_events').insert({
          space_id: nudge.spaceId,
          workspace_id: workspaceId,
          event_type: 'follow_up_sent',
          title: `Follow-up sent: ${nudge.item?.title}`,
          description: nudge.draftMessage,
          actor_id: user?.id,
          source_id: nudge.item?.id,
          source_table: 'clipad_action_items',
          importance: 3,
        });
      }

      setSentIds(prev => new Set([...prev, nudge.id]));
    } catch (err) {
      console.error('[FollowUpEngine] Send error:', err);
    } finally {
      setSendingId(null);
    }
  };

  if (loading) return (
    <div className="py-8 flex flex-col items-center justify-center gap-2">
      <Loader2 className="w-6 h-6 border-primary text-primary animate-spin" />
      <p className="text-xs text-slate-500 dark:text-muted-foreground">Analyzing follow-ups and drafting AI messages...</p>
    </div>
  );

  if (nudges.length === 0) return null;

  return (
    <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-border bg-slate-50 dark:bg-background/50 dark:bg-secondary/20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-400">
            <Target className="w-4 h-4" />
          </div>
          <h2 className="font-bold text-slate-900 dark:text-foreground text-base">AI Follow-Up Engine</h2>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 rounded-full">
          {nudges.length} Nudges
        </span>
      </div>
      
      <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
        {nudges.map((nudge) => (
          <div key={nudge.id} className={`p-4 rounded-xl border bg-slate-50 dark:bg-secondary/30 transition-all ${sentIds.has(nudge.id) ? 'border-emerald-200 dark:border-emerald-800/50 opacity-60' : 'border-slate-100 dark:border-border'}`}>
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-2">
                {nudge.type === 'overdue' ? (
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                ) : (
                  <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                )}
                <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">{nudge.title}</h4>
              </div>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-muted-foreground mb-3">{nudge.description}</p>
            
            <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-lg p-3 relative">
              <div className="absolute -top-2 left-3 bg-white dark:bg-card px-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" /> AI Draft
                </span>
              </div>
              <p className="text-sm text-slate-700 dark:text-foreground italic mt-1">"{nudge.draftMessage}"</p>
            </div>
            
            <div className="mt-3 flex justify-end">
              {sentIds.has(nudge.id) ? (
                <span className="text-xs font-bold text-[#006065] dark:text-[#00beac] flex items-center gap-1.5">
                  <CheckCheck className="w-4 h-4" /> Nudge Sent
                </span>
              ) : (
                <button
                  onClick={() => handleSendNudge(nudge)}
                  disabled={!!sendingId}
                  className="text-xs font-bold bg-primary text-primary-foreground px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {sendingId === nudge.id ? (
                    <><Loader2 className="w-3 h-3 animate-spin" /> Sending...</>
                  ) : (
                    <><Send className="w-3 h-3" /> Send Nudge</>
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

