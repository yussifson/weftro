import React, { useState, useEffect } from 'react';
import { Brain, Sparkles, ArrowRight, Zap, Target, Lightbulb } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';

export default function AIInsightsPanel({ spaceId, workspaceId }) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function generateInsights() {
      setLoading(true);
      try {
        // Mocking an AI pattern analysis based on actual DB records
        // Real implementation would pass recent space data through `invokeCloudflareAi`
        
        let query = supabase.from('clipad_meeting_records').select('title, status').limit(10);
        if (spaceId) query = query.eq('space_id', spaceId);
        else if (workspaceId) query = query.eq('workspace_id', workspaceId);
        
        const { data: meetings } = await query;
        
        // Let's create some contextual mock insights
        const generatedInsights = [];
        
        if (meetings && meetings.length > 3) {
          generatedInsights.push({
            id: 1,
            type: 'efficiency',
            icon: Zap,
            color: 'text-amber-500',
            bg: 'bg-amber-50 dark:bg-amber-500/10',
            title: 'Meeting Redundancy Detected',
            description: `We noticed 3 recent meetings in this space with overlapping topics. Consider recording an async video update instead of the next sync to save ~2.5 hours of team time.`,
            action: 'Record Video Update'
          });
        }
        
        generatedInsights.push({
          id: 2,
          type: 'knowledge',
          icon: Lightbulb,
          color: 'text-[#006065]',
          bg: 'bg-[#006065] dark:bg-[#131A2C]/10 dark:bg-[#006065] dark:bg-[#131A2C]/10',
          title: 'Undocumented Decisions',
          description: 'Several recent meetings mentioned "pricing architecture" but no formal decisions were logged. Should we draft a decision record for this?',
          action: 'Draft Decision'
        });

        setInsights(generatedInsights);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    generateInsights();
  }, [spaceId, workspaceId]);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[200px]">
        <div className="w-8 h-8 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin mb-4" />
        <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Analyzing workspace patterns...</p>
      </div>
    );
  }

  if (insights.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl p-6 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
        <Brain className="w-32 h-32" />
      </div>
      
      <div className="flex items-center gap-2 mb-6 relative z-10">
        <div className="w-8 h-8 rounded-lg bg-indigo-500 text-white flex items-center justify-center shadow-sm">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <h3 className="font-bold text-indigo-950 dark:text-indigo-100">AI Intelligence</h3>
          <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Proactive Insights</p>
        </div>
      </div>

      <div className="space-y-4 relative z-10">
        {insights.map((insight) => {
          const Icon = insight.icon;
          return (
            <div key={insight.id} className="bg-white dark:bg-card rounded-xl p-4 shadow-sm border border-slate-100 dark:border-border">
              <div className="flex gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${insight.bg} ${insight.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">{insight.title}</h4>
                  <p className="text-sm text-slate-600 dark:text-muted-foreground leading-relaxed mb-3">
                    {insight.description}
                  </p>
                  <button className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors">
                    {insight.action} <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

