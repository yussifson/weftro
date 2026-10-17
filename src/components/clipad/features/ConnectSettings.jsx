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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="border border-border bg-card shadow-xs rounded-2xl">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <TerminalSquare className="w-3.5 h-3.5 text-primary"/> REST API
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold text-foreground tracking-tight">Active</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  Online
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-border">
              <Code2 className="w-5 h-5 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-border bg-card shadow-xs rounded-2xl">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-primary"/> MCP Protocol
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold text-foreground tracking-tight">{isMcpEnabled ? 'Operational' : 'Disabled'}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${isMcpEnabled ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground'}`}>
                  {isMcpEnabled ? 'Ready' : 'Off'}
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-border">
              <Cpu className="w-5 h-5 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-xs rounded-2xl">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Webhook className="w-3.5 h-3.5 text-primary"/> Event Webhooks
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold text-foreground tracking-tight">{isWebhooksEnabled ? 'Streaming' : 'Disabled'}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${isWebhooksEnabled ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground'}`}>
                  {isWebhooksEnabled ? 'Live' : 'Off'}
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-border">
              <Webhook className="w-5 h-5 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MCP Quickstart Card */}
      <Card className="border border-border bg-card shadow-xs rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2.5 text-foreground">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Cpu className="w-4 h-4" />
              </div>
              Model Context Protocol (MCP) Server
            </CardTitle>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-mono text-[11px] font-semibold px-2.5 py-0.5">
              Protocol v1.0
            </Badge>
          </div>
          <CardDescription className="text-xs text-muted-foreground mt-1">
            Enterprise adapter connecting Cursor, Claude Desktop, Windsurf, or custom AI agents directly to your organizational knowledge graph.
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

      {/* REST API & cURL Explorer */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TerminalSquare className="w-5 h-5 text-primary" />
            Weftro V3 Unified REST API Gateway (/api/v1)
          </CardTitle>
          <CardDescription>
            Authenticate with Bearer Connect Tokens to query organizational intelligence, memories, captures, and smart moments with full provenance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground">1. Grounded Semantic Search (/api/v1/search)</span>
              <pre className="font-mono text-xs bg-secondary/40 p-3 rounded-lg border border-border overflow-x-auto text-foreground">
{`curl -X POST "${import.meta.env.VITE_SUPABASE_URL || 'https://wmabgiafwamxkcgxyhee.supabase.co'}/functions/v1/connect/api/v1/search" \\
  -H "Authorization: Bearer <CONNECT_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{"query": "roadmap decisions", "limit": 10}'`}
              </pre>
            </div>
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground">2. Query Memories with Provenance (/api/v1/memories)</span>
              <pre className="font-mono text-xs bg-secondary/40 p-3 rounded-lg border border-border overflow-x-auto text-foreground">
{`curl -X GET "${import.meta.env.VITE_SUPABASE_URL || 'https://wmabgiafwamxkcgxyhee.supabase.co'}/functions/v1/connect/api/v1/memories?limit=20" \\
  -H "Authorization: Bearer <CONNECT_TOKEN>"`}
              </pre>
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
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-lg">
                <p className="text-sm font-bold text-emerald-800 dark:text-emerald-400 mb-1">App Created Successfully!</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-500 mb-2">Copy this secret now. It will not be shown again.</p>
                <div className="font-mono text-xs p-2 bg-emerald-100/50 dark:bg-emerald-900/40 rounded border border-emerald-200 dark:border-emerald-700 break-all select-all flex items-center justify-between">
                  <span>{createdSecret.secret}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2 text-xs" 
                    onClick={() => {
                      navigator.clipboard.writeText(createdSecret.secret);
                      toast({ title: "Copied", description: "Secret copied to clipboard" });
                    }}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <Button variant="outline" size="sm" className="mt-2 text-xs" onClick={() => setCreatedSecret(null)}>I have saved it</Button>
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
                          <span>{app.client_id}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(app.client_id);
                              toast({ title: "Copied", description: "Client ID copied" });
                            }}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
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
