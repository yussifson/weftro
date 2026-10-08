import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getOrganizationalMetrics } from '@/lib/clipadOrganizationalAnalyticsService';
import { getAuthorizedInsights, detectOrganizationalPatterns } from '@/lib/clipadOrganizationalLearningService';
import { isV3FeatureEnabled, V3_FLAGS } from '@/lib/clipadV3Flags';
import { Loader2, TrendingUp, AlertTriangle, Lightbulb, Activity, CheckCircle2, BookOpen, Clock, Users, ArrowRight, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

  if (!isEnabled) {
    return (
      <Card className="border-dashed border-2 bg-secondary/20">
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <ShieldAlert className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">Analytics Disabled</h3>
          <p className="text-muted-foreground max-w-md">Organizational Analytics is currently disabled or restricted for your role. Contact your administrator to enable Clipad V3 Intelligence features.</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
        <p className="text-sm font-medium animate-pulse">Analyzing organizational patterns...</p>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Organizational Intelligence</h2>
        <p className="text-muted-foreground">AI-driven analysis of recurring patterns, knowledge gaps, and execution health across your company.</p>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="relative overflow-hidden group border-blue-500/20 bg-gradient-to-b from-blue-500/5 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" />
              Execution Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {metrics.health.execution.score !== 'Insufficient data' ? metrics.health.execution.score : '--'}
            </div>
            <div className="mt-4 space-y-2">
              {metrics.health.execution.reasons.map((r, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50 mt-1.5 shrink-0" />
                  <span className="leading-tight">{r}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group border-emerald-500/20 bg-gradient-to-b from-emerald-500/5 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Decision Velocity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {metrics.health.decisionVelocity.score !== 'Insufficient data' ? metrics.health.decisionVelocity.score : '--'}
            </div>
            <div className="mt-4 space-y-2">
              {metrics.health.decisionVelocity.reasons.map((r, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 mt-1.5 shrink-0" />
                  <span className="leading-tight">{r}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group border-amber-500/20 bg-gradient-to-b from-amber-500/5 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-500" />
              Knowledge Flow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {metrics.health.knowledgeFlow.score !== 'Insufficient data' ? metrics.health.knowledgeFlow.score : '--'}
            </div>
            <div className="mt-4 space-y-2">
              {metrics.health.knowledgeFlow.reasons.map((r, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50 mt-1.5 shrink-0" />
                  <span className="leading-tight">{r}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Insights Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              Active Insights
            </h3>
            <Badge variant="secondary" className="px-3 rounded-full">
              {insights.length} Pattern{insights.length !== 1 ? 's' : ''} Detected
            </Badge>
          </div>

          {insights.length === 0 ? (
             <Card className="border-dashed bg-secondary/20">
               <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                 <div className="w-12 h-12 bg-background rounded-full flex items-center justify-center mb-4 shadow-sm">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                 </div>
                 <h4 className="text-lg font-medium mb-1">No Active Blockers</h4>
                 <p className="text-sm text-muted-foreground">The AI hasn't detected any significant recurring problems or knowledge gaps.</p>
               </CardContent>
             </Card>
          ) : (
            <div className="space-y-4">
              {insights.map(insight => (
                <Card key={insight.id} className="transition-all hover:shadow-md hover:border-primary/30">
                  <CardHeader className="pb-3 flex flex-row items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 mb-2">
                        {insight.insight_type === 'BLOCKER' || insight.insight_type === 'RECURRING_PROBLEM' ? (
                          <Badge variant="destructive" className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {insight.insight_type.replace('_', ' ')}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-500/20">
                            <Lightbulb className="w-3 h-3 mr-1" />
                            {insight.insight_type.replace('_', ' ')}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground font-medium flex items-center">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          {(insight.confidence * 100).toFixed(0)}% Confidence
                        </span>
                      </div>
                      <CardTitle className="text-lg">{insight.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">{insight.summary}</p>
                  </CardContent>
                  <CardFooter className="bg-secondary/30 border-t py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {insight.evidence_count} evidence points</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Last seen {new Date(insight.last_observed_at).toLocaleDateString()}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 text-xs font-semibold">
                      Review Pattern <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Panel */}
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Cross-Functional Impact
              </CardTitle>
              <CardDescription>How knowledge flows between teams</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.crossFunctional.bottlenecks.length > 0 ? (
                  metrics.crossFunctional.bottlenecks.map((b, idx) => (
                    <div key={idx} className="flex flex-col gap-2 p-3 rounded-lg bg-secondary/50 border border-border">
                      <span className="text-sm font-medium">{b}</span>
                      <span className="text-xs text-muted-foreground">Identified as a critical cross-team friction point based on recent meeting transcripts.</span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 rounded-lg bg-secondary/30 border border-dashed text-center">
                    <p className="text-sm text-muted-foreground">No cross-functional bottlenecks detected.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Recent Activities</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                      <Activity className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Memory Index Updated</p>
                      <p className="text-xs text-muted-foreground">1 hour ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Pattern Detection Complete</p>
                      <p className="text-xs text-muted-foreground">3 hours ago</p>
                    </div>
                  </div>
               </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
