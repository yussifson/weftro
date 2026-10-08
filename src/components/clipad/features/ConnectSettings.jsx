import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getApps, createConnectApp, getWebhooks, createWebhook } from '@/lib/clipadConnectService';
import { isV3FeatureEnabled, V3_FLAGS } from '@/lib/clipadV3Flags';
import { TerminalSquare, KeyRound, Webhook, Fingerprint, Loader2, Plus, ArrowRight, ShieldCheck, Cpu, Code2, Copy, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ConnectSettings() {
  const { user } = useAuth();
  const [apps, setApps] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [newAppName, setNewAppName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');

  const isEnabled = isV3FeatureEnabled(V3_FLAGS.CONNECT_ENABLED, user);
  const isMcpEnabled = isV3FeatureEnabled(V3_FLAGS.MCP_SERVER_ENABLED, user);
  const isWebhooksEnabled = isV3FeatureEnabled(V3_FLAGS.WEBHOOKS_ENABLED, user);

  useEffect(() => {
    async function load() {
      if (!user || !isEnabled) return;
      try {
        const [a, w] = await Promise.all([
          getApps(user),
          getWebhooks(user)
        ]);
        setApps(a || []);
        setWebhooks(w || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, isEnabled]);

  const handleCreateApp = async (e) => {
    e.preventDefault();
    if (!newAppName.trim()) return;
    try {
      await createConnectApp(user, newAppName);
      setNewAppName('');
      const a = await getApps(user);
      setApps(a);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateWebhook = async (e) => {
    e.preventDefault();
    if (!newWebhookUrl.trim()) return;
    try {
      await createWebhook(user, newWebhookUrl);
      setNewWebhookUrl('');
      const w = await getWebhooks(user);
      setWebhooks(w);
    } catch (e) {
      console.error(e);
    }
  };

  if (!isEnabled) {
    return (
      <Card className="border-dashed bg-secondary/20">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <TerminalSquare className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-xl font-bold mb-2">Connect API is Disabled</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Your organization has disabled API access and developer applications.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground animate-in fade-in">
      <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
      <p className="text-sm font-medium">Loading API configuration...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Developer Connect</h2>
        <p className="text-muted-foreground text-lg">Securely integrate Clipad's Intelligence Graph into your custom applications and workflows.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><TerminalSquare className="w-4 h-4"/> REST API</span>
              <span className="text-2xl font-bold text-foreground">Active</span>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
              <Code2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
        
        <Card className={isMcpEnabled ? "border-emerald-500/20 bg-emerald-500/5" : "border-border bg-secondary/20 opacity-70"}>
          <CardContent className="p-6 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Cpu className="w-4 h-4"/> MCP Protocol</span>
              <span className="text-2xl font-bold text-foreground">{isMcpEnabled ? 'Active' : 'Disabled'}</span>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isMcpEnabled ? 'bg-emerald-500/10 text-emerald-600' : 'bg-secondary text-muted-foreground'}`}>
              <Cpu className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className={isWebhooksEnabled ? "border-purple-500/20 bg-purple-500/5" : "border-border bg-secondary/20 opacity-70"}>
          <CardContent className="p-6 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Webhook className="w-4 h-4"/> Webhooks</span>
              <span className="text-2xl font-bold text-foreground">{isWebhooksEnabled ? 'Active' : 'Disabled'}</span>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isWebhooksEnabled ? 'bg-purple-500/10 text-purple-600' : 'bg-secondary text-muted-foreground'}`}>
              <Webhook className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Apps Section */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" />
              Developer Apps (OAuth)
            </CardTitle>
            <CardDescription>Create clients to authenticate on behalf of your users.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleCreateApp} className="flex flex-col gap-3">
              <Label htmlFor="appName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">New Application Name</Label>
              <div className="flex gap-2">
                <Input 
                  id="appName"
                  placeholder="e.g. Internal Analytics Dashboard" 
                  value={newAppName}
                  onChange={(e) => setNewAppName(e.target.value)}
                  className="bg-secondary/30"
                />
                <Button type="submit" disabled={!newAppName.trim()}>Create App</Button>
              </div>
            </form>

            <div className="space-y-3">
              {apps.length === 0 ? (
                <div className="p-6 rounded-lg bg-secondary/20 border border-dashed flex flex-col items-center justify-center text-center">
                  <KeyRound className="w-8 h-8 text-muted-foreground mb-2 opacity-50" />
                  <p className="text-sm text-muted-foreground">No applications created yet.</p>
                </div>
              ) : (
                apps.map(app => (
                  <div key={app.id} className="p-4 rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold">{app.name}</h4>
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Active</Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Client ID</span>
                        <code className="text-xs font-mono bg-secondary px-2 py-1.5 rounded text-foreground flex items-center justify-between group">
                          {app.client_id}
                          <Copy className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity" />
                        </code>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Client Secret</span>
                        <code className="text-xs font-mono bg-secondary px-2 py-1.5 rounded text-foreground">••••••••••••••••••••••••</code>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Webhooks Section */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Webhook className="w-5 h-5 text-primary" />
              Event Webhooks
            </CardTitle>
            <CardDescription>Receive real-time intelligence updates and capture events.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!isWebhooksEnabled ? (
              <div className="p-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex flex-col items-center justify-center text-center">
                <ShieldCheck className="w-8 h-8 text-amber-600 mb-2" />
                <h4 className="text-sm font-bold text-amber-700">Webhooks Disabled</h4>
                <p className="text-xs text-amber-600/80 mt-1">Your organization has disabled outbound webhooks for security compliance.</p>
              </div>
            ) : (
              <>
                <form onSubmit={handleCreateWebhook} className="flex flex-col gap-3">
                  <Label htmlFor="webhookUrl" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Endpoint URL</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="webhookUrl"
                      type="url"
                      placeholder="https://your-server.com/webhook" 
                      value={newWebhookUrl}
                      onChange={(e) => setNewWebhookUrl(e.target.value)}
                      className="bg-secondary/30"
                    />
                    <Button type="submit" disabled={!newWebhookUrl.trim()} variant="secondary">Add Endpoint</Button>
                  </div>
                </form>

                <div className="space-y-3">
                  {webhooks.length === 0 ? (
                    <div className="p-6 rounded-lg bg-secondary/20 border border-dashed flex flex-col items-center justify-center text-center">
                      <Webhook className="w-8 h-8 text-muted-foreground mb-2 opacity-50" />
                      <p className="text-sm text-muted-foreground">No webhooks configured.</p>
                    </div>
                  ) : (
                    webhooks.map(wh => (
                      <div key={wh.id} className="p-4 rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <h4 className="font-medium text-sm text-foreground truncate">{wh.endpoint_url}</h4>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="secondary" className="text-[10px]">capture.created</Badge>
                              <Badge variant="secondary" className="text-[10px]">smart_moment.detected</Badge>
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shrink-0 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
