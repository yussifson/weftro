import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getOrganizationalMetrics } from '@/lib/clipadOrganizationalAnalyticsService';
import { getAuthorizedInsights, detectOrganizationalPatterns } from '@/lib/clipadOrganizationalLearningService';
import { isV3FeatureEnabled, V3_FLAGS } from '@/lib/clipadV3Flags';
import { Loader2, TrendingUp, AlertTriangle, Lightbulb, Activity, CheckCircle2, BookOpen } from 'lucide-react';

export default function OrganizationalInsights() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  const isEnabled = isV3FeatureEnabled(V3_FLAGS.ORGANIZATIONAL_ANALYTICS_ENABLED, user);

  useEffect(() => {
    async function loadData() {
      if (!user || !isEnabled) return;
      try {
        // Asynchronously run learning (in prod this is a background job)
        detectOrganizationalPatterns(user).catch(console.error);

        const m = await getOrganizationalMetrics(user, 30);
        const ins = await getAuthorizedInsights(user);
        
        setMetrics(m);
        setInsights(ins.filter(i => i.status !== 'resolved').slice(0, 5));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user, isEnabled]);

  if (!isEnabled) return null;
  if (loading) return <Loader2 className="w-6 h-6 animate-spin text-muted-foreground m-4" />;
  if (!metrics) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Execution Health */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
          <div className="flex items-center justify-between mb-4 relative">
            <h3 className="font-bold text-muted-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" />
              Execution Health
            </h3>
            {metrics.health.execution.score !== 'Insufficient data' && (
              <span className="text-2xl font-black text-foreground">{metrics.health.execution.score}</span>
            )}
          </div>
          <div className="space-y-2 relative">
            {metrics.health.execution.reasons.map((r, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50"></span>
                {r}
              </div>
            ))}
          </div>
        </div>

        {/* Knowledge & Memory */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
          <h3 className="font-bold text-muted-foreground flex items-center gap-2 mb-4 relative">
            <BookOpen className="w-4 h-4 text-purple-500" />
            Knowledge Flow
          </h3>
          <div className="grid grid-cols-2 gap-4 relative">
            <div>
              <p className="text-2xl font-black text-foreground">{metrics.metrics.activity.newMemories}</p>
              <p className="text-xs text-muted-foreground">New Memories</p>
            </div>
            <div>
              <p className="text-2xl font-black text-foreground">{metrics.metrics.activity.smartMoments}</p>
              <p className="text-xs text-muted-foreground">Smart Moments</p>
            </div>
          </div>
        </div>

        {/* Blockers & Decisions */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
          <h3 className="font-bold text-muted-foreground flex items-center gap-2 mb-4 relative">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Decisions & Blockers
          </h3>
          <div className="grid grid-cols-2 gap-4 relative">
            <div>
              <p className="text-2xl font-black text-foreground">{metrics.metrics.activity.decisions}</p>
              <p className="text-xs text-muted-foreground">Decisions</p>
            </div>
            <div>
              <p className="text-2xl font-black text-foreground">{metrics.metrics.activity.blockers}</p>
              <p className="text-xs text-muted-foreground">Active Blockers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Insights & Recommendations */}
      {insights.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-foreground text-lg mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            Organizational Insights & Recommendations
          </h3>
          <div className="space-y-4">
            {insights.map(insight => (
              <div key={insight.id} className="flex gap-4 p-4 rounded-xl bg-secondary/50 border border-border/50">
                <div className="shrink-0 mt-0.5">
                  {insight.insight_type === 'RECURRING_PROBLEM' ? (
                    <TrendingUp className="w-5 h-5 text-amber-500" />
                  ) : insight.insight_type === 'RECOMMENDATION' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-blue-500" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-foreground">{insight.title}</h4>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-background border border-border text-muted-foreground">
                      {insight.insight_type.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{insight.summary}</p>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      {(insight.confidence * 100).toFixed(0)}% Confidence
                    </span>
                    {insight.evidence_count > 0 && (
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        {insight.evidence_count} evidence {insight.evidence_count === 1 ? 'point' : 'points'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
