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
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <KeyRound className="w-6 h-6 text-primary" />
            Apps & Credentials
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create client applications, manage OAuth credentials, and issue scoped API access tokens.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs px-2.5 py-1 flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            REST Gateway Online
          </Badge>
        </div>
      </div>

      {/* Secret Creation & Rotation Alerts */}
      {createdSecret && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl space-y-2 animate-in fade-in shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Application Created: <span className="underline">{createdSecret.name}</span>
            </p>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setCreatedSecret(null)}>✕</Button>
          </div>
          <p className="text-xs text-emerald-700 dark:text-emerald-400">
            Please copy your client secret now. It is stored securely as a SHA-256 hash and cannot be recovered if lost.
          </p>
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] uppercase font-bold text-emerald-800/80 dark:text-emerald-300 tracking-wider">Client Secret</span>
            <div className="font-mono text-xs p-2.5 bg-emerald-100/60 dark:bg-emerald-900/50 rounded-lg border border-emerald-200 dark:border-emerald-700 break-all select-all flex items-center justify-between">
              <span className="font-semibold text-emerald-900 dark:text-emerald-100">{createdSecret.secret}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2.5 text-xs text-emerald-800 dark:text-emerald-200 hover:bg-emerald-200/50" 
                onClick={() => {
                  navigator.clipboard.writeText(createdSecret.secret);
                  toast({ title: "Copied", description: "Client secret copied to clipboard" });
                }}
              >
                <Copy className="w-3.5 h-3.5 mr-1" />
                Copy
              </Button>
            </div>
          </div>
          <Button variant="outline" size="sm" className="mt-2 text-xs bg-white dark:bg-card" onClick={() => setCreatedSecret(null)}>
            I have stored this secret safely
          </Button>
        </div>
      )}

      {rotatedSecret && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl space-y-2 animate-in fade-in shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              Client Secret Rotated for: <span className="underline">{rotatedSecret.name}</span>
            </p>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setRotatedSecret(null)}>✕</Button>
          </div>
          <p className="text-xs text-amber-700 dark:text-amber-400">
            The previous secret was invalidated. External clients using the old secret must be updated immediately with this new one:
          </p>
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] uppercase font-bold text-amber-800/80 dark:text-amber-300 tracking-wider">New Client Secret</span>
            <div className="font-mono text-xs p-2.5 bg-amber-100/60 dark:bg-amber-900/50 rounded-lg border border-amber-200 dark:border-amber-700 break-all select-all flex items-center justify-between">
              <span className="font-semibold text-amber-900 dark:text-amber-100">{rotatedSecret.secret}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2.5 text-xs text-amber-800 dark:text-amber-200 hover:bg-amber-200/50" 
                onClick={() => {
                  navigator.clipboard.writeText(rotatedSecret.secret);
                  toast({ title: "Copied", description: "New secret copied to clipboard" });
                }}
              >
                <Copy className="w-3.5 h-3.5 mr-1" />
                Copy
              </Button>
            </div>
          </div>
          <Button variant="outline" size="sm" className="mt-2 text-xs bg-white dark:bg-card" onClick={() => setRotatedSecret(null)}>
            I have updated my external client
          </Button>
        </div>
      )}

      {/* SECTION 1: Applications (Header + Grid) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Code2 className="w-5 h-5 text-primary" />
              Connected Applications ({apps.length})
            </h3>
            <p className="text-xs text-muted-foreground">Client credentials configured for your organization.</p>
          </div>
        </div>

        {/* Application Creation Form */}
        <Card className="border border-border/80 shadow-xs bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              Register New Application
            </CardTitle>
            <CardDescription className="text-xs">
              Generate a unique Client ID and Secret to authenticate automated jobs, MCP agents, or external tools.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateApp} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="appName" className="text-xs font-semibold text-foreground">
                  Application Name <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="appName"
                  placeholder="e.g. Ingestion Pipeline Bot" 
                  value={newAppName}
                  onChange={(e) => setNewAppName(e.target.value)}
                  className="bg-background h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="appDesc" className="text-xs font-semibold text-foreground">
                  Description
                </Label>
                <Input 
                  id="appDesc"
                  placeholder="e.g. Syncs daily customer notes and transcripts" 
                  value={newAppDescription}
                  onChange={(e) => setNewAppDescription(e.target.value)}
                  className="bg-background h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="appUris" className="text-xs font-semibold text-foreground">
                  Redirect URIs (OAuth Callbacks)
                </Label>
                <textarea 
                  id="appUris"
                  rows={2}
                  placeholder="https://workflow.example.com/oauth/callback (one URL per line)" 
                  value={newAppRedirectUris}
                  onChange={(e) => setNewAppRedirectUris(e.target.value)}
                  className="w-full text-xs font-mono p-2 rounded-md border border-input bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" disabled={!newAppName.trim()} size="sm" className="h-9 px-4 text-xs font-semibold">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Register Application
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Apps Card Grid */}
        {apps.length === 0 ? (
          <div className="p-8 rounded-xl bg-card border border-dashed flex flex-col items-center justify-center text-center">
            <KeyRound className="w-10 h-10 text-muted-foreground mb-3 opacity-40" />
            <p className="text-sm font-semibold text-foreground">No applications registered</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Register an application above to obtain a Client ID and start issuing scoped API tokens.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {apps.map(app => (
              <Card key={app.id} className="border border-border/80 bg-card shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-sm font-bold text-foreground truncate" title={app.name}>
                        {app.name}
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground line-clamp-2 mt-1 min-h-[32px]">
                        {app.description || 'No description provided.'}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className={`shrink-0 text-[10px] font-semibold ${app.is_active ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-600 border-red-500/20"}`}>
                      {app.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3 pb-3">
                  {/* Client ID Pill */}
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Client ID</span>
                    <div className="font-mono text-[11px] bg-secondary/50 px-2 py-1.5 rounded-md border border-border/60 flex items-center justify-between group">
                      <span className="truncate pr-1 text-foreground">{app.client_id}</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(app.client_id);
                          toast({ title: "Copied", description: "Client ID copied" });
                        }}
                        className="text-muted-foreground hover:text-foreground shrink-0"
                        title="Copy Client ID"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Redirect URIs list if present */}
                  {app.redirect_uris && app.redirect_uris.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Redirect Callbacks</span>
                      <div className="flex flex-wrap gap-1 max-h-14 overflow-y-auto">
                        {app.redirect_uris.map((uri, idx) => (
                          <span key={idx} className="font-mono text-[10px] bg-secondary/80 px-1.5 py-0.5 rounded text-muted-foreground truncate max-w-full">
                            {uri}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="pt-2 pb-3 border-t border-border/40 flex items-center justify-between gap-2 bg-muted/10">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs flex-1 flex items-center justify-center gap-1.5 font-medium hover:border-primary/50"
                    onClick={() => setSelectedAppForToken(app)}
                  >
                    <Key className="w-3.5 h-3.5 text-primary" />
                    Issue Token
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs px-2.5 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                    disabled={rotatingAppId === app.id}
                    onClick={() => handleRotateSecret(app)}
                    title="Rotate Client Secret"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${rotatingAppId === app.id ? 'animate-spin' : ''}`} />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: Token Generation Modal / Form */}
      {selectedAppForToken && (
        <Card className="border-2 border-primary/30 shadow-lg bg-card animate-in fade-in">
          <CardHeader className="pb-3 border-b border-border/60 bg-primary/5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <Key className="w-4 h-4 text-primary" />
                  Issue API Access Token for "{selectedAppForToken.name}"
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Select the granular scopes this bearer token will be permitted to access.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setSelectedAppForToken(null)}>✕</Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {AVAILABLE_SCOPES.map(s => {
                const isChecked = selectedScopes.includes(s.id);
                return (
                  <label key={s.id} className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer ${isChecked ? 'bg-primary/5 border-primary/40 shadow-xs' : 'bg-background hover:bg-muted/30 border-border/60'}`}>
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
                      className="mt-0.5 rounded border-input"
                    />
                    <div className="min-w-0">
                      <span className="font-mono text-xs font-semibold block text-foreground truncate">{s.label}</span>
                      <span className="text-[11px] text-muted-foreground line-clamp-1">{s.desc}</span>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
              <Button variant="outline" size="sm" onClick={() => setSelectedAppForToken(null)}>Cancel</Button>
              <Button size="sm" onClick={handleGenerateToken} disabled={selectedScopes.length === 0} className="font-semibold">
                Generate Access Token ({selectedScopes.length} Scopes)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SECTION 3: Newly Generated Token Banner */}
      {createdToken && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl space-y-2 animate-in fade-in shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Token Generated for {createdToken.appName}
            </p>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setCreatedToken(null)}>✕</Button>
          </div>
          <p className="text-xs text-emerald-700 dark:text-emerald-400">
            Copy this bearer token now. For security purposes, it will never be displayed in full again.
          </p>
          <div className="font-mono text-xs p-2.5 bg-emerald-100/60 dark:bg-emerald-900/50 rounded-lg border border-emerald-200 dark:border-emerald-700 break-all select-all flex items-center justify-between">
            <span className="font-semibold text-emerald-900 dark:text-emerald-100">{createdToken.token}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 px-2.5 text-xs text-emerald-800 dark:text-emerald-200 hover:bg-emerald-200/50" 
              onClick={() => {
                navigator.clipboard.writeText(createdToken.token);
                toast({ title: "Copied", description: "API Token copied to clipboard" });
              }}
            >
              <Copy className="w-3.5 h-3.5 mr-1" />
              Copy
            </Button>
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {createdToken.scopes.map(s => (
              <Badge key={s} variant="secondary" className="text-[10px] font-mono bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">{s}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 4: Active Issued API Tokens (Table / Card) */}
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <Key className="w-4 h-4 text-primary" />
                Active API Tokens ({tokens.length})
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Live bearer credentials issued across your applications.
              </CardDescription>
            </div>
            {apps.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs flex items-center gap-1.5 h-8 font-medium"
                onClick={() => setSelectedAppForToken(apps[0])}
              >
                <Plus className="w-3.5 h-3.5 text-primary" />
                Issue Token
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {tokens.length === 0 ? (
            <div className="p-6 rounded-lg bg-muted/20 border border-dashed flex flex-col items-center justify-center text-center">
              <Key className="w-8 h-8 text-muted-foreground mb-2 opacity-40" />
              <p className="text-sm font-medium text-foreground">No active tokens issued</p>
              <p className="text-xs text-muted-foreground mt-0.5">Click "Issue Token" to generate a scoped token for an application.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tokens.map(tok => {
                const isRevoked = Boolean(tok.revoked_at);
                const isExpired = tok.expires_at && new Date(tok.expires_at) < new Date();
                return (
                  <div key={tok.id} className="p-3.5 rounded-xl border border-border/80 bg-card shadow-2xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-xs text-foreground truncate">{tok.app?.name || 'Custom Integration'}</span>
                        {isRevoked ? (
                          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 text-[10px] shrink-0">Revoked</Badge>
                        ) : isExpired ? (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] shrink-0">Expired</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] shrink-0">Active</Badge>
                        )}
                      </div>
                      {!isRevoked && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-destructive hover:bg-destructive/10"
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
                    <div className="text-[10px] text-muted-foreground flex items-center justify-between pt-1 border-t border-border/40 font-mono">
                      <span>Rate limit: {tok.rate_limit_rpm || 120} RPM</span>
                      <span>Issued: {new Date(tok.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
