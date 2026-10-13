import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/api/supabaseClient';
import { createConnectApp, revokeToken } from '@/lib/clipadOAuthService';
import { registerWebhook, getWebhooks, deleteWebhook } from '@/lib/clipadWebhookService';
import { isV3FeatureEnabled, V3_FLAGS } from '@/lib/clipadV3Flags';
import { Loader2, Webhook, KeyRound, Globe, Trash2, Plus, TerminalSquare, AlertCircle, ShieldCheck, Cpu, Code2, Copy, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ConnectSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [apps, setApps] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Forms
  const [newAppName, setNewAppName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [createdSecret, setCreatedSecret] = useState(null);

  const companyId = user?.user_metadata?.company_id || user?.company_id;
  const isConnectEnabled = isV3FeatureEnabled(V3_FLAGS.CONNECT_ENABLED, user);
  const isWebhooksEnabled = isV3FeatureEnabled(V3_FLAGS.WEBHOOKS_ENABLED, user);
  const isMcpEnabled = isV3FeatureEnabled(V3_FLAGS.MCP_ENABLED, user);

  useEffect(() => {
    if (user && isConnectEnabled) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user, isConnectEnabled]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load Developer Apps
      const { data: appsData } = await supabase
        .from('clipad_v3_connect_apps')
        .select('*')
        .eq('company_id', companyId);
      setApps(appsData || []);

      // Load Webhooks
      if (isWebhooksEnabled) {
        const whs = await getWebhooks(companyId);
        setWebhooks(whs || []);
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to load connect settings.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApp = async (e) => {
    e.preventDefault();
    if (!newAppName.trim()) return;
    try {
      const result = await createConnectApp(user.id, companyId, {
        name: newAppName,
        description: 'Created via Integrations Hub',
        redirectUris: []
      });
      setCreatedSecret({ id: result.id, client_id: result.client_id, secret: result.plain_secret });
      toast({ title: "App Created", description: "Save your client secret now." });
      setNewAppName('');
      await loadData();
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleCreateWebhook = async (e) => {
    e.preventDefault();
    if (!newWebhookUrl.trim()) return;
    try {
      await registerWebhook(user.id, companyId, newWebhookUrl, ['capture.created', 'smart_moment.detected']);
      toast({ title: "Webhook Registered", description: "Events will now be pushed to " + newWebhookUrl });
      setNewWebhookUrl('');
      await loadData();
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDeleteWebhook = async (id) => {
    try {
      await deleteWebhook(id);
      toast({ title: "Deleted", description: "Webhook removed successfully." });
      await loadData();
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  if (!isConnectEnabled) {
    return (
      <Card className="border-dashed bg-secondary/20 max-w-3xl mx-auto mt-6">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <KeyRound className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
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
        <p className="text-muted-foreground text-lg">Securely integrate Clipad\'s Intelligence Graph into your custom applications and workflows.</p>
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

      {/* MCP Quickstart Card */}
      <Card className="border border-emerald-500/30 bg-emerald-500/5 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2 text-foreground">
              <Cpu className="w-5 h-5 text-emerald-500" />
              Model Context Protocol (MCP) Server
            </CardTitle>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-mono text-xs">
              mcp-v1.0 active
            </Badge>
          </div>
          <CardDescription>
            Connect Cursor, Claude Desktop, Windsurf, or custom AI agents directly to your Clipad Knowledge Graph.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3.5 bg-background border border-border rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <TerminalSquare className="w-3.5 h-3.5 text-primary" /> Claude Desktop & Cursor Config (claude_desktop_config.json)
              </span>
            </div>
            <pre className="font-mono text-xs bg-secondary/50 p-3 rounded-lg overflow-x-auto text-foreground">
{`{
  "mcpServers": {
    "clipad": {
      "command": "npx",
      "args": ["-y", "@clipad/mcp-server"],
      "env": {
        "CLIPAD_COMPANY_ID": "${companyId || 'YOUR_COMPANY_ID'}",
        "CLIPAD_API_URL": "${import.meta.env.VITE_SUPABASE_URL || 'https://api.clipad.com'}"
      }
    }
  }
}`}
            </pre>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-card border border-border">
              <span className="font-semibold text-foreground block mb-1">🔍 Tool: search_memory</span>
              <p className="text-muted-foreground text-[11px]">Query organizational decisions, meeting records, and synced docs with semantic search.</p>
            </div>
            <div className="p-3 rounded-lg bg-card border border-border">
              <span className="font-semibold text-foreground block mb-1">⚡ Tool: capture_context</span>
              <p className="text-muted-foreground text-[11px]">Stream code snippets, terminal traces, and architecture notes into the company memory.</p>
            </div>
            <div className="p-3 rounded-lg bg-card border border-border">
              <span className="font-semibold text-foreground block mb-1">🌐 Tool: query_graph</span>
              <p className="text-muted-foreground text-[11px]">Traverse entity relationships across teams, spaces, decisions, and external integrations.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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

            {createdSecret && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm font-bold text-green-800 dark:text-green-400 mb-2">App Created Successfully!</p>
                <p className="text-xs text-green-700 dark:text-green-500 mb-2">Copy this secret now. It will not be shown again.</p>
                <div className="font-mono text-xs p-2 bg-black/5 dark:bg-white/5 rounded break-all select-all">
                  {createdSecret.secret}
                </div>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => setCreatedSecret(null)}>I have saved it</Button>
              </div>
            )}

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
                        </code>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

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
                              {wh.events.map(e => <Badge key={e} variant="secondary" className="text-[10px]">{e}</Badge>)}
                            </div>
                          </div>
                          <button onClick={() => handleDeleteWebhook(wh.id)} className="text-red-500 hover:text-red-600 p-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
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
