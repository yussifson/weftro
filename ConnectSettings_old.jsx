import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/api/supabaseClient';
import { createConnectApp, revokeToken } from '@/lib/clipadOAuthService';
import { registerWebhook, getWebhooks, deleteWebhook } from '@/lib/clipadWebhookService';
import { isV3FeatureEnabled, V3_FLAGS } from '@/lib/clipadV3Flags';
import { Loader2, Webhook, KeyRound, Globe, Trash2, Plus, TerminalSquare, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

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
      toast({ title: 'Error loading Connect settings', variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleCreateApp = async (e) => {
    e.preventDefault();
    if (!newAppName.trim()) return;
    try {
      const newApp = await createConnectApp(user.id, companyId, { 
        name: newAppName.trim(), 
        description: 'Created from Connect Hub' 
      });
      setApps([newApp, ...apps]);
      setCreatedSecret(newApp.raw_secret); // Only time we show it!
      setNewAppName('');
      toast({ title: 'Application registered' });
    } catch (e) {
      toast({ title: 'Error creating app', variant: 'destructive' });
    }
  };

  const handleCreateWebhook = async (e) => {
    e.preventDefault();
    if (!newWebhookUrl.trim()) return;
    try {
      const wh = await registerWebhook(user.id, companyId, { 
        endpointUrl: newWebhookUrl.trim(),
        events: ['memory.created', 'capture.processed']
      });
      setWebhooks([wh, ...webhooks]);
      setNewWebhookUrl('');
      toast({ title: 'Webhook registered' });
    } catch (e) {
      toast({ title: 'Error registering webhook', variant: 'destructive' });
    }
  };

  const handleDeleteWebhook = async (id) => {
    try {
      await deleteWebhook(id);
      setWebhooks(webhooks.filter(w => w.id !== id));
      toast({ title: 'Webhook removed' });
    } catch (e) {
      toast({ title: 'Error removing webhook', variant: 'destructive' });
    }
  };

  if (!isConnectEnabled) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center border border-border rounded-xl bg-card">
        <KeyRound className="w-8 h-8 text-muted-foreground mb-4" />
        <h3 className="text-lg font-bold">Connect API is Disabled</h3>
        <p className="text-sm text-muted-foreground max-w-sm mt-2">
          Your organization has disabled API access and developer applications.
        </p>
      </div>
    );
  }

  if (loading) return <Loader2 className="w-6 h-6 animate-spin text-muted-foreground m-6" />;

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-xl p-6">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <TerminalSquare className="w-5 h-5 text-blue-500" />
          Clipad Connect
        </h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Securely connect external applications and AI systems to your Clipad Knowledge Graph.
          All requests dynamically respect your existing Row-Level Security and organizational permissions.
        </p>
        
        <div className="flex gap-4 mt-4 text-xs font-bold">
          <span className="px-2 py-1 bg-background rounded border border-border text-foreground">API: Active</span>
          <span className={`px-2 py-1 rounded border ${isMcpEnabled ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>MCP: {isMcpEnabled ? 'Active' : 'Disabled'}</span>
          <span className={`px-2 py-1 rounded border ${isWebhooksEnabled ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>Webhooks: {isWebhooksEnabled ? 'Active' : 'Disabled'}</span>
        </div>
      </div>

      {/* Developer Apps Section */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
          <KeyRound className="w-5 h-5 text-primary" />
          Developer Applications (OAuth)
        </h3>
        
        {createdSecret && (
          <div className="bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 p-4 rounded-lg mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-400">Save your Client Secret now!</p>
              <p className="text-xs text-amber-700 dark:text-amber-500 mt-1">This is the only time it will be shown. Do not commit it to frontend code.</p>
              <code className="block mt-2 bg-amber-200/50 dark:bg-black/20 p-2 rounded text-xs select-all break-all text-foreground">
                {createdSecret}
              </code>
              <button onClick={() => setCreatedSecret(null)} className="mt-2 text-xs font-bold text-amber-800 hover:underline">I have saved it</button>
            </div>
          </div>
        )}

        <form onSubmit={handleCreateApp} className="flex gap-3 mb-6">
          <input 
            type="text" 
            placeholder="App Name (e.g. My External AI Assistant)"
            value={newAppName}
            onChange={(e) => setNewAppName(e.target.value)}
            className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button type="submit" disabled={!newAppName.trim()} className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold rounded-lg transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create App
          </button>
        </form>

        <div className="space-y-3">
          {apps.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No connected applications found.</p>
          ) : (
            apps.map(app => (
              <div key={app.id} className="p-4 border border-border rounded-lg bg-background flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-foreground text-sm">{app.name}</h4>
                  <p className="text-xs text-muted-foreground font-mono mt-1">Client ID: {app.client_id}</p>
                </div>
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-secondary text-secondary-foreground text-xs font-bold rounded-md">
                    {app.is_active ? 'Active' : 'Revoked'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Webhooks Section */}
      {isWebhooksEnabled && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
            <Webhook className="w-5 h-5 text-primary" />
            Outbound Webhooks
          </h3>
          
          <form onSubmit={handleCreateWebhook} className="flex gap-3 mb-6">
            <input 
              type="url" 
              placeholder="https://your-server.com/clipad-webhook"
              value={newWebhookUrl}
              onChange={(e) => setNewWebhookUrl(e.target.value)}
              className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button type="submit" disabled={!newWebhookUrl.trim()} className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground text-sm font-bold rounded-lg transition-colors flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Webhook
            </button>
          </form>

          <div className="space-y-3">
            {webhooks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No active webhooks.</p>
            ) : (
              webhooks.map(wh => (
                <div key={wh.id} className="p-4 border border-border rounded-lg bg-background flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-foreground text-sm">{wh.endpoint_url}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Events: {wh.events.join(', ')}
                    </p>
                  </div>
                  <button onClick={() => handleDeleteWebhook(wh.id)} className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
