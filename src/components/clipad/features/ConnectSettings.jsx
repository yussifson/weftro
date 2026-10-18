import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/api/supabaseClient';
import { createConnectApp, revokeToken, rotateClientSecret, grantAccessToken } from '@/lib/clipadOAuthService';
import { registerWebhook, getWebhooks, deleteWebhook } from '@/lib/clipadWebhookService';
import { isV3FeatureEnabled, V3_FLAGS } from '@/lib/clipadV3Flags';
import { Loader2, Webhook, KeyRound, Globe, Trash2, Plus, TerminalSquare, AlertCircle, ShieldCheck, Cpu, Code2, Copy, CheckCircle2, RefreshCw, Key, Shield } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const AVAILABLE_SCOPES = [
  { id: 'search:read', label: 'search:read', desc: 'Execute semantic queries' },
  { id: 'memory:read', label: 'memory:read', desc: 'Read organizational memories' },
  { id: 'memory:write', label: 'memory:write', desc: 'Create and update verified memories' },
  { id: 'context:read', label: 'context:read', desc: 'Read context sessions and timeline' },
  { id: 'captures:read', label: 'captures:read', desc: 'Read captures and queue status' },
  { id: 'captures:write', label: 'captures:write', desc: 'Ingest content to capture pipeline' },
  { id: 'moments:read', label: 'moments:read', desc: 'Read detected smart moments' },
  { id: 'entities:read', label: 'entities:read', desc: 'Read knowledge graph entities' },
  { id: 'sources:read', label: 'sources:read', desc: 'Read source provenance metadata' },
  { id: 'apps:manage', label: 'apps:manage', desc: 'Manage applications and credentials' },
  { id: 'webhooks:manage', label: 'webhooks:manage', desc: 'Manage webhook subscriptions' },
];

export default function ConnectSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [apps, setApps] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Forms & Modals
  const [newAppName, setNewAppName] = useState('');
  const [newAppDescription, setNewAppDescription] = useState('');
  const [newAppRedirectUris, setNewAppRedirectUris] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [createdSecret, setCreatedSecret] = useState(null);
  const [rotatedSecret, setRotatedSecret] = useState(null);
  const [createdToken, setCreatedToken] = useState(null);
  const [selectedAppForToken, setSelectedAppForToken] = useState(null);
  const [selectedScopes, setSelectedScopes] = useState(['search:read', 'memory:read', 'context:read']);
  const [rotatingAppId, setRotatingAppId] = useState(null);

  const companyId = user?.user_metadata?.company_id || user?.company_id;
  const isConnectEnabled = isV3FeatureEnabled(V3_FLAGS.CONNECT_ENABLED, user);
  const isWebhooksEnabled = isV3FeatureEnabled(V3_FLAGS.WEBHOOKS_ENABLED, user);
  const isMcpEnabled = isV3FeatureEnabled(V3_FLAGS.MCP_ENABLED, user);

  useEffect(() => {
    if (user?.id && isConnectEnabled) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user?.id, isConnectEnabled]);

  const loadData = async () => {
    if (apps.length === 0 && tokens.length === 0) setLoading(true);
    try {
      // Load Developer Apps
      const { data: appsData } = await supabase
        .from('clipad_v3_connect_apps')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      setApps(appsData || []);

      // Load Tokens
      const { data: tokensData } = await supabase
        .from('clipad_v3_connect_tokens')
        .select('*, app:app_id ( id, name )')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      setTokens(tokensData || []);

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
      const parsedUris = newAppRedirectUris
        .split('\n')
        .map(u => u.trim())
        .filter(Boolean);

      const result = await createConnectApp(user.id, companyId, {
        name: newAppName.trim(),
        description: newAppDescription.trim() || 'Custom Developer Application',
        redirectUris: parsedUris
      });

      // Clear any prior rotated secret state and set newly created secret
      setRotatedSecret(null);
      setCreatedSecret({
        id: result.id,
        name: result.name,
        client_id: result.client_id,
        secret: result.raw_secret,
        timestamp: Date.now()
      });
      toast({ title: "App Created", description: "Save your client secret now." });
      setNewAppName('');
      setNewAppDescription('');
      setNewAppRedirectUris('');
      await loadData();
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleRotateSecret = async (app) => {
    if (!window.confirm(`Are you sure you want to rotate the secret for "${app.name}"? Any services using the previous secret will immediately lose access.`)) {
      return;
    }
    setRotatingAppId(app.id);
    try {
      const result = await rotateClientSecret(app.id, companyId);
      // Explicitly set rotated secret state
      setCreatedSecret(null);
      setRotatedSecret({
        id: result.id,
        name: result.name,
        client_id: result.client_id,
        secret: result.raw_secret,
        timestamp: Date.now()
      });
      toast({ title: "Secret Rotated", description: "New client secret generated successfully." });
      await loadData();
    } catch (e) {
      toast({ title: "Rotation Failed", description: e.message, variant: "destructive" });
    } finally {
      setRotatingAppId(null);
    }
  };

  const handleGenerateToken = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedAppForToken) return;
    try {
      const result = await grantAccessToken(user.id, companyId, selectedAppForToken.id, selectedScopes);
      setCreatedToken({
        token: result.access_token,
        appName: selectedAppForToken.name,
        scopes: selectedScopes,
        timestamp: Date.now()
      });
      toast({ title: "Token Generated", description: "Copy your API access token now." });
      setSelectedAppForToken(null);
      await loadData();
    } catch (e) {
      toast({ title: "Token Generation Failed", description: e.message, variant: "destructive" });
    }
  };

  const handleRevokeToken = async (tokenId) => {
    if (!window.confirm("Are you sure you want to revoke this API token? It will immediately stop working.")) return;
    try {
      await revokeToken(tokenId);
      toast({ title: "Token Revoked", description: "API token has been revoked successfully." });
      await loadData();
    } catch (e) {
      toast({ title: "Revocation Failed", description: e.message, variant: "destructive" });
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
            <CardDescription>Register client applications to authenticate and interact with Connect APIs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleCreateApp} className="space-y-3.5 p-4 bg-muted/20 rounded-xl border border-border">
              <div className="space-y-1.5">
                <Label htmlFor="appName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Application Name <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="appName"
                  placeholder="e.g. Internal Analytics Dashboard" 
                  value={newAppName}
                  onChange={(e) => setNewAppName(e.target.value)}
                  className="bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="appDesc" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Description
                </Label>
                <Input 
                  id="appDesc"
                  placeholder="e.g. Ingestion service for automated meeting transcripts" 
                  value={newAppDescription}
                  onChange={(e) => setNewAppDescription(e.target.value)}
                  className="bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="appUris" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Redirect URIs (OAuth Callbacks)
                </Label>
                <textarea 
                  id="appUris"
                  rows={2}
                  placeholder="https://app.example.com/oauth/callback (one per line)" 
                  value={newAppRedirectUris}
                  onChange={(e) => setNewAppRedirectUris(e.target.value)}
                  className="w-full text-xs font-mono p-2.5 rounded-md border border-input bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <p className="text-[11px] text-muted-foreground">Optional. Enter authorized redirect URLs for OAuth code grants.</p>
              </div>

              <Button type="submit" disabled={!newAppName.trim()} className="w-full">
                <Plus className="w-4 h-4 mr-1.5" />
                Create Application
              </Button>
            </form>

            {/* Display Newly Created Secret */}
            {createdSecret && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-lg space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-emerald-800 dark:text-emerald-400">
                    App Created: {createdSecret.name}
                  </p>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setCreatedSecret(null)}>✕</Button>
                </div>
                <p className="text-xs text-emerald-700 dark:text-emerald-500">
                  Save your client secret now. It is hashed immediately and cannot be retrieved again.
                </p>
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-emerald-800/80 dark:text-emerald-300 tracking-wider">Client Secret</span>
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
                </div>
                <Button variant="outline" size="sm" className="mt-2 text-xs" onClick={() => setCreatedSecret(null)}>
                  I have saved this secret
                </Button>
              </div>
            )}

            {/* Display Rotated Secret */}
            {rotatedSecret && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-lg space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                    <RefreshCw className="w-4 h-4 text-amber-600" />
                    Secret Rotated for: {rotatedSecret.name}
                  </p>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setRotatedSecret(null)}>✕</Button>
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-500">
                  The previous client secret has been invalidated. Copy your new secret below:
                </p>
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-amber-800/80 dark:text-amber-300 tracking-wider">New Client Secret</span>
                  <div className="font-mono text-xs p-2 bg-amber-100/50 dark:bg-amber-900/40 rounded border border-amber-200 dark:border-amber-700 break-all select-all flex items-center justify-between">
                    <span>{rotatedSecret.secret}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2 text-xs" 
                      onClick={() => {
                        navigator.clipboard.writeText(rotatedSecret.secret);
                        toast({ title: "Copied", description: "New secret copied to clipboard" });
                      }}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="mt-2 text-xs" onClick={() => setRotatedSecret(null)}>
                  I have updated my application
                </Button>
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
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-bold text-sm text-foreground">{app.name}</h4>
                        {app.description && <p className="text-xs text-muted-foreground mt-0.5">{app.description}</p>}
                      </div>
                      <Badge variant="outline" className={app.is_active ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-red-500/10 text-red-600 border-red-500/20"}>
                        {app.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    {app.redirect_uris && app.redirect_uris.length > 0 && (
                      <div className="mb-2.5">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">Redirect URIs</span>
                        <div className="flex flex-wrap gap-1">
                          {app.redirect_uris.map((uri, idx) => (
                            <code key={idx} className="text-[10px] font-mono bg-secondary/60 px-1.5 py-0.5 rounded text-foreground">
                              {uri}
                            </code>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
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

                      <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs flex items-center gap-1.5"
                          onClick={() => {
                            setSelectedAppForToken(app);
                            // Scroll down or open dialog smoothly
                          }}
                        >
                          <Key className="w-3 h-3 text-primary" />
                          Generate Token
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs flex items-center gap-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                          disabled={rotatingAppId === app.id}
                          onClick={() => handleRotateSecret(app)}
                        >
                          <RefreshCw className={`w-3 h-3 ${rotatingAppId === app.id ? 'animate-spin' : ''}`} />
                          Rotate Secret
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Token Generation Dialog Box */}
            {selectedAppForToken && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                      <Key className="w-4 h-4 text-primary" />
                      Generate Token for "{selectedAppForToken.name}"
                    </h5>
                    <p className="text-xs text-muted-foreground">Select scopes to grant to this API token.</p>
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setSelectedAppForToken(null)}>✕</Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                  {AVAILABLE_SCOPES.map(s => {
                    const isChecked = selectedScopes.includes(s.id);
                    return (
                      <label key={s.id} className="flex items-start gap-2 p-2 rounded border bg-background hover:bg-secondary/20 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedScopes([...selectedScopes, s.id]);
                            } else {
                              setSelectedScopes(selectedScopes.filter(id => id !== s.id));
                            }
                          }}
                          className="mt-0.5"
                        />
                        <div>
                          <span className="font-mono font-medium block text-foreground">{s.label}</span>
                          <span className="text-[10px] text-muted-foreground">{s.desc}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedAppForToken(null)}>Cancel</Button>
                  <Button size="sm" onClick={handleGenerateToken} disabled={selectedScopes.length === 0}>Generate Access Token</Button>
                </div>
              </div>
            )}

            {/* Display Newly Created Token */}
            {createdToken && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-lg space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-emerald-800 dark:text-emerald-400">Token Generated for {createdToken.appName}!</p>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setCreatedToken(null)}>✕</Button>
                </div>
                <p className="text-xs text-emerald-700 dark:text-emerald-500">Copy this bearer token now. It will not be visible again in full.</p>
                <div className="font-mono text-xs p-2 bg-emerald-100/50 dark:bg-emerald-900/40 rounded border border-emerald-200 dark:border-emerald-700 break-all select-all flex items-center justify-between">
                  <span>{createdToken.token}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2 text-xs" 
                    onClick={() => {
                      navigator.clipboard.writeText(createdToken.token);
                      toast({ title: "Copied", description: "API Token copied to clipboard" });
                    }}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {createdToken.scopes.map(s => (
                    <Badge key={s} variant="secondary" className="text-[10px] bg-emerald-100 dark:bg-emerald-900/60">{s}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Column 2: Active API Tokens List */}
        <Card className="shadow-sm flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Key className="w-5 h-5 text-primary" />
                  API Access Tokens
                </CardTitle>
                <CardDescription>Active credentials issued to applications and integrations.</CardDescription>
              </div>
              {apps.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs flex items-center gap-1.5"
                  onClick={() => {
                    // Pick the first active app or the latest created
                    setSelectedAppForToken(apps[0]);
                  }}
                >
                  <Plus className="w-3.5 h-3.5 text-primary" />
                  New Token
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            {tokens.length === 0 ? (
              <div className="p-6 rounded-lg bg-secondary/20 border border-dashed flex flex-col items-center justify-center text-center">
                <Key className="w-8 h-8 text-muted-foreground mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground">No active tokens issued yet.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {apps.length === 0 
                    ? "Create an application first to issue your first API access token."
                    : 'Click "New Token" above or "Generate Token" on any application.'}
                </p>
              </div>
            ) : (
              tokens.map(tok => {
                const isRevoked = Boolean(tok.revoked_at);
                const isExpired = tok.expires_at && new Date(tok.expires_at) < new Date();
                return (
                  <div key={tok.id} className="p-3.5 rounded-lg border bg-card shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-foreground">{tok.app?.name || 'Custom Application'}</span>
                        {isRevoked ? (
                          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 text-[10px]">Revoked</Badge>
                        ) : isExpired ? (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">Expired</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">Active</Badge>
                        )}
                      </div>
                      {!isRevoked && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          onClick={() => handleRevokeToken(tok.id)}
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(tok.scopes || []).map(s => (
                        <Badge key={s} variant="secondary" className="text-[10px] font-mono">{s}</Badge>
                      ))}
                    </div>
                    <div className="text-[10px] text-muted-foreground flex items-center justify-between pt-1 border-t border-border/40">
                      <span>Rate limit: {tok.rate_limit_rpm || 120} RPM</span>
                      <span>Created: {new Date(tok.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-8">

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
