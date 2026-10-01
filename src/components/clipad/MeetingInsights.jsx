import React, { useEffect, useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart3, Clock, CheckCircle, HelpCircle, Sparkles, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { invokeCloudflareAi, generateText } from '@/lib/cloudflareAI';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';

export default function MeetingInsights({ spaceId }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMeetings: 0,
    actionItemsGenerated: 0,
    actionItemsCompleted: 0,
    avgDurationMin: 0,
  });
  
  const [trends, setTrends] = useState('');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    async function fetchInsights() {
      setLoading(true);
      try {
        // 1. Fetch meetings for this space
        let meetingsQuery = supabase
          .from('clipad_meeting_records')
          .select('id, created_at, title, ai_summary, started_at, ended_at');
        
        if (spaceId) {
          meetingsQuery = meetingsQuery.eq('space_id', spaceId);
        }

        const meetingsRes = await meetingsQuery;
        if (meetingsRes.error) throw meetingsRes.error;

        const meetings = meetingsRes.data || [];
        const meetingIds = meetings.map(m => m.id);

        // 2. Fetch action items via meeting_id (no space_id field on this table)
        let actions = [];
        if (meetingIds.length > 0) {
          const actionsRes = await supabase
            .from('clipad_action_items')
            .select('is_complete')
            .in('meeting_id', meetingIds);
          if (!actionsRes.error) actions = actionsRes.data || [];
        }

        let totalDurationMin = 0;
        let validDurations = 0;
        meetings.forEach(m => {
          const start = m.started_at || m.created_at;
          const end = m.ended_at;
          if (start && end) {
            const min = (new Date(end) - new Date(start)) / 60000;
            if (min > 0 && min < 480) { // sanity check: < 8 hours
              totalDurationMin += min;
              validDurations++;
            }
          }
        });

        const completedActions = actions.filter(t => t.is_complete).length;

        setStats({
          totalMeetings: meetings.length,
          actionItemsGenerated: actions.length,
          actionItemsCompleted: completedActions,
          avgDurationMin: validDurations > 0 ? Math.round(totalDurationMin / validDurations) : 0,
        });
      } catch (err) {
        console.error('Error fetching insights:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchInsights();
  }, [spaceId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" /> Meeting Intelligence
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Meetings</CardDescription>
            <CardTitle className="text-3xl">{stats.totalMeetings}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Duration</CardDescription>
            <CardTitle className="text-3xl flex items-baseline gap-1">
              {stats.avgDurationMin} <span className="text-sm font-normal text-muted-foreground">min</span>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Action Items Generated</CardDescription>
            <CardTitle className="text-3xl text-blue-600 dark:text-blue-400">{stats.actionItemsGenerated}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Action Item Completion</CardDescription>
            <CardTitle className="text-3xl text-emerald-600 dark:text-emerald-400">
              {stats.actionItemsGenerated > 0 
                ? Math.round((stats.actionItemsCompleted / stats.actionItemsGenerated) * 100) 
                : 0}%
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold flex items-center gap-2 text-foreground">
              <Sparkles className="w-5 h-5 text-primary" /> Cross-Meeting Trend Analysis
            </h4>
            {!trends && !isSynthesizing && (
              <button 
                onClick={async () => {
                  setIsSynthesizing(true);
                  try {
                    const meetingsData = (await supabase.from('clipad_meeting_records').select('title, ai_summary').eq('space_id', spaceId).limit(5)).data;
                    const context = meetingsData.map(m => `Meeting: ${m.title}\nSummary: ${m.ai_summary}`).join('\n\n');
                    const prompt = `Based on these recent meetings, identify 3 cross-meeting themes, overarching sentiment, and any recurring unresolved topics:\n\n${context}`;
                    const res = await generateText([{ role: 'user', content: prompt }]);
                    setTrends(typeof res === 'string' ? res : res?.response || 'Could not identify trends.');
                  } catch (e) {
                    setTrends('Failed to analyze trends.');
                  } finally {
                    setIsSynthesizing(false);
                  }
                }}
                className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
              >
                Analyze Trends
              </button>
            )}
            <button 
              onClick={async () => {
                setIsGeneratingTasks(true);
                try {
                  const meetingsData = (await supabase.from('clipad_meeting_records').select('title, ai_summary').eq('space_id', spaceId).limit(5)).data;
                  const context = meetingsData.map(m => `Meeting: ${m.title}\nSummary: ${m.ai_summary}`).join('\n\n');
                  const prompt = `Based on these recent meetings, identify up to 3 distinct, specific action items. Output ONLY a raw JSON array of strings (e.g. ["Fix the login bug", "Schedule follow-up with marketing"]). No markdown, no backticks, no other text:\n\n${context}`;
                  
                  const res = await invokeCloudflareAi(prompt, "You are a task generator. Output ONLY a valid JSON array of strings.");
                  let tasksToCreate = [];
                  try {
                    tasksToCreate = JSON.parse(res);
                  } catch (e) {
                    // Try to clean markdown formatting if the AI disobeyed
                    const cleaned = res.replace(/```json/g, '').replace(/```/g, '').trim();
                    tasksToCreate = JSON.parse(cleaned);
                  }

                  if (!Array.isArray(tasksToCreate) || tasksToCreate.length === 0) throw new Error("No tasks parsed");

                  const inserts = tasksToCreate.map(title => ({
                    space_id: spaceId,
                    title,
                    is_complete: false,
                  }));

                  const { error } = await supabase.from('clipad_action_items').insert(inserts);
                  if (error) throw error;
                  
                  // Optional: write an org event
                  try {
                    const { writeOrgEvent } = await import('@/lib/clipadIntelligence');
                    await writeOrgEvent({
                      space_id: spaceId,
                      workspace_id: user?.company_id,
                      event_type: 'action_items_generated',
                      title: `AI generated ${inserts.length} action items from meetings`,
                      actor_id: user?.id,
                      source_table: 'clipad_action_items',
                      importance: 3,
                    });
                  } catch (e) { /* ignore event err */ }
                  
                  toast({ title: "Success", description: `Generated ${inserts.length} action items!`});
                } catch (e) {
                  console.error(e);
                  toast({ title: "Failed to generate tasks", variant: "destructive" });
                } finally {
                  setIsGeneratingTasks(false);
                }
              }}
              disabled={isGeneratingTasks}
              className="text-xs bg-amber-500/10 text-amber-500 px-3 py-1.5 rounded-lg font-semibold hover:bg-amber-500/20 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isGeneratingTasks ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              Auto-Generate Action Items
            </button>
          </div>
          
          {isSynthesizing && (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" /> Analyzing multiple meeting transcripts and summaries...
            </div>
          )}
          
          {trends ? (
            <div className="text-sm text-foreground prose prose-sm dark:prose-invert">
              {trends}
            </div>
          ) : !isSynthesizing ? (
            <p className="text-sm text-muted-foreground">
              Click the button above to synthesize AI trends across all your recent meetings in this space.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
