import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { TrendingDown, Clock, DollarSign, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function MeetingROIDashboard({ workspaceId, spaceId }) {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState({
    totalMeetings: 0,
    hoursSaved: 0,
    moneySaved: 0,
    lowRoiMeetings: 0,
    meetingsAnalyzed: 0
  });
  const [loading, setLoading] = useState(true);

  // Assuming an average hourly loaded cost of $65 for a team member
  const AVERAGE_HOURLY_COST = 65;
  const AVERAGE_MEETING_ATTENDEES = 4; // Approximated for ROI

  useEffect(() => {
    fetchMetrics();
  }, [workspaceId, spaceId]);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      // Fetch meetings. Filter by spaceId if provided, else workspaceId
      let query = supabase.from('clipad_meeting_metrics').select('necessity_score');
      
      if (spaceId) {
        // If we want space-specific, we'd join with meeting_records. 
        // For now, if we don't have a direct space_id on metrics, we fetch all for workspace.
        // Assuming metrics table has workspace_id
        if (workspaceId) query = query.eq('workspace_id', workspaceId);
      } else if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        setMetrics({ totalMeetings: 0, hoursSaved: 0, moneySaved: 0, lowRoiMeetings: 0, meetingsAnalyzed: 0 });
        setLoading(false);
        return;
      }

      const totalAnalyzed = data.length;
      // Meetings with score < 40 are deemed "Should have been an async video"
      const lowRoiCount = data.filter(m => m.necessity_score !== null && m.necessity_score < 40).length;
      
      // Calculate savings: If those low ROI meetings were instead async videos (10 mins instead of 60 mins)
      // Saved 50 mins per attendee.
      const savedHoursPerMeeting = (50 / 60) * AVERAGE_MEETING_ATTENDEES;
      const totalHoursSaved = lowRoiCount * savedHoursPerMeeting;
      const totalMoneySaved = totalHoursSaved * AVERAGE_HOURLY_COST;

      setMetrics({
        totalMeetings: totalAnalyzed, // We only know about analyzed ones right now
        meetingsAnalyzed: totalAnalyzed,
        lowRoiMeetings: lowRoiCount,
        hoursSaved: Math.round(totalHoursSaved),
        moneySaved: Math.round(totalMoneySaved)
      });

    } catch (err) {
      console.error("Error fetching meeting ROI:", err);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-2xl p-6 shadow-sm flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-2xl p-6 shadow-sm relative overflow-hidden group">
      {/* Subtle background glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#006065] dark:bg-[#131A2C]/10 rounded-full blur-3xl group-hover:bg-[#006065] dark:bg-[#131A2C]/20 transition-colors"></div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-foreground flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-[#006065]" />
              Meeting ROI & Savings
            </h3>
            <p className="text-sm text-slate-500 dark:text-muted-foreground mt-1">
              Estimated savings by replacing low-ROI meetings with async video.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-[#006065] dark:bg-[#131A2C]/10 dark:bg-[#006065] dark:bg-[#131A2C]/10 text-[#004e52] dark:text-[#00beac] rounded-full text-xs font-semibold border border-emerald-200 dark:border-[#006065] dark:border-border/20">
            <Sparkles className="w-3.5 h-3.5" /> AI Analyzed
          </div>
        </div>

        {metrics.meetingsAnalyzed === 0 ? (
          <div className="bg-slate-50 dark:bg-secondary/50 rounded-xl p-6 text-center border border-slate-100 dark:border-border/50">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-600 dark:text-foreground">No meeting data analyzed yet.</p>
            <p className="text-xs text-slate-500 dark:text-muted-foreground mt-1">Run your first meeting to start calculating ROI.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Metric 1: Low ROI Meetings */}
            <div className="bg-slate-50 dark:bg-secondary/50 rounded-xl p-4 border border-slate-100 dark:border-border">
              <div className="flex items-center gap-2 mb-2 text-slate-600 dark:text-muted-foreground">
                <AlertCircle className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Preventable</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-foreground">{metrics.lowRoiMeetings}</span>
                <span className="text-sm text-slate-500 dark:text-muted-foreground">meetings</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-muted-foreground mt-2">Flagged as reducible to async</p>
            </div>

            {/* Metric 2: Hours Saved */}
            <div className="bg-[#006065] dark:bg-[#131A2C]/10 dark:bg-emerald-900/10 rounded-xl p-4 border border-emerald-100 dark:border-emerald-800/30">
              <div className="flex items-center gap-2 mb-2 text-[#004e52] dark:text-[#00beac]">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Time Saved</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-[#004e52] dark:text-[#00beac]">{metrics.hoursSaved}</span>
                <span className="text-sm text-[#006065]/70 dark:text-[#00beac]/70">hours</span>
              </div>
              <p className="text-xs text-[#006065]/70 dark:text-[#00beac]/70 mt-2">Potential reclaimed team time</p>
            </div>

            {/* Metric 3: Money Saved */}
            <div className="bg-[#006065] dark:bg-[#131A2C]/10 dark:bg-emerald-900/10 rounded-xl p-4 border border-emerald-100 dark:border-emerald-800/30">
              <div className="flex items-center gap-2 mb-2 text-[#004e52] dark:text-[#00beac]">
                <DollarSign className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Cost Saved</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-[#004e52] dark:text-[#00beac]">$</span>
                <span className="text-3xl font-black text-[#004e52] dark:text-[#00beac]">{metrics.moneySaved.toLocaleString()}</span>
              </div>
              <p className="text-xs text-[#006065]/70 dark:text-[#00beac]/70 mt-2">Estimated payroll savings</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

