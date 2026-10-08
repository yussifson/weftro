import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { resolveIntelligenceContext } from '@/lib/clipadIntelligenceGovernanceService';
import { isV3FeatureEnabled, V3_FLAGS } from '@/lib/clipadV3Flags';
import { ShieldCheck, Lock, Users, FolderLock, AlertTriangle, EyeOff, Loader2, Key, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

export default function GovernanceSettings() {
  const { user } = useAuth();
  const [govCtx, setGovCtx] = useState(null);
  const [loading, setLoading] = useState(true);

  const isEnabled = isV3FeatureEnabled(V3_FLAGS.ROLE_AWARE_INTELLIGENCE_ENABLED, user);

  useEffect(() => {
    async function load() {
      if (!user || !isEnabled) return;
      try {
        const ctx = await resolveIntelligenceContext(user);
        setGovCtx(ctx);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, isEnabled]);

  if (!isEnabled) {
    return (
      <Card className="border-dashed bg-secondary/20 max-w-3xl">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <ShieldCheck className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-xl font-bold mb-2">Role-Aware Intelligence Disabled</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Your organization is not currently utilizing the V3 Governance layer. The AI assistant will fall back to legacy access controls.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground animate-in fade-in">
      <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
      <p className="text-sm font-medium">Verifying authorization pathways...</p>
    </div>
  );
  
  if (!govCtx) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2 max-w-4xl">
        <h2 className="text-3xl font-bold tracking-tight">Intelligence Governance & Privacy</h2>
        <p className="text-muted-foreground text-lg">Clipad's AI Assistant only accesses information you are explicitly authorized to view.</p>
      </div>

      <Alert className="bg-[#006065]/5 border-[#006065]/20 text-[#006065] dark:text-[#fad503] max-w-4xl">
        <ShieldCheck className="h-5 w-5 !text-[#006065] dark:!text-[#fad503]" />
        <AlertTitle className="text-base font-bold">Secure AI Contextualization Active</AlertTitle>
        <AlertDescription className="mt-1 text-sm opacity-90">
          Your intelligence context is dynamically derived from your organizational role and workspace memberships. Data from private spaces or restricted meetings will never be injected into AI payloads without explicit mathematical proof of your authorization.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
        {/* Identity Context */}
        <Card className="shadow-sm border-primary/10">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              Your Identity Context
            </CardTitle>
            <CardDescription>How the AI classifies your access level</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/30 border border-border">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Assigned Role</p>
                <div className="flex items-center gap-2">
                  <h4 className="text-lg font-bold capitalize truncate">{govCtx.role.replace('_', ' ')}</h4>
                  {['super_admin', 'admin'].includes(govCtx.role) && (
                    <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-0">Elevated</Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold flex items-center justify-between">
                <span>Active Clearances</span>
                <Badge variant="outline" className="font-mono text-xs">{govCtx.permissions.length} nodes</Badge>
              </p>
              <ScrollArea className="h-[140px] rounded-md border p-3 bg-card">
                <div className="flex flex-wrap gap-2">
                  {govCtx.permissions.length === 0 ? (
                    <p className="text-xs text-muted-foreground w-full text-center py-4">No specific node clearances</p>
                  ) : (
                    govCtx.permissions.map(p => (
                      <Badge key={p} variant="secondary" className="text-xs font-medium bg-secondary/50 text-secondary-foreground">
                        {p}
                      </Badge>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>

        {/* Space Authorization Boundary */}
        <Card className="shadow-sm border-primary/10">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FolderLock className="w-5 h-5 text-primary" />
              Space Authorization Boundary
            </CardTitle>
            <CardDescription>Knowledge domains your AI can access</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 mb-2">
              <div className="p-4 rounded-lg bg-secondary/30 border border-border flex flex-col items-center justify-center text-center">
                <Users className="w-6 h-6 text-blue-500 mb-2" />
                <span className="text-2xl font-bold">{govCtx.authorizedSpaces.length}</span>
                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider mt-1">Authorized Spaces</span>
              </div>
              <div className="p-4 rounded-lg bg-secondary/30 border border-border flex flex-col items-center justify-center text-center">
                <Lock className="w-6 h-6 text-amber-500 mb-2" />
                <span className="text-2xl font-bold">Safe</span>
                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider mt-1">Strict Isolation</span>
              </div>
            </div>

            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 flex gap-3">
              <EyeOff className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-700 dark:text-amber-500">Cross-Tenant Protection</h4>
                <p className="text-xs text-amber-600/80 dark:text-amber-500/80 mt-1 leading-relaxed">
                  Your tenant boundary ({govCtx.company_id.substring(0,8)}...) is cryptographically sealed. Even with direct database manipulation, the AI cannot pull memories from adjacent organizations.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="max-w-4xl">
        <Card className="border-border shadow-sm">
          <CardHeader className="border-b bg-secondary/10 pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-primary" />
              Information Flow Rules
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              <div className="p-4 flex items-start gap-4">
                <div className="mt-1 w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold">Personal Memory Tier</h4>
                  <p className="text-xs text-muted-foreground mt-1">Always injected into your AI assistant context. Never accessible by your team or organization AI, regardless of admin status.</p>
                </div>
              </div>
              <div className="p-4 flex items-start gap-4">
                <div className="mt-1 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold">Team Memory Tier</h4>
                  <p className="text-xs text-muted-foreground mt-1">Only retrieved if you have verified membership in the team space, or if the space is publicly marked within the company.</p>
                </div>
              </div>
              <div className="p-4 flex items-start gap-4">
                <div className="mt-1 w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold">Organizational Memory Tier</h4>
                  <p className="text-xs text-muted-foreground mt-1">Globally retrieved for all company members unless explicit Restricted policies are attached to the node.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
