import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getUserCaptureSettings, updateUserCaptureSettings, ingestBrowserCapture } from '@/lib/clipadBrowserCaptureService';
import { isV3FeatureEnabled, V3_FLAGS } from '@/lib/clipadV3Flags';
import { Shield, Power, Globe, X, Plus, AlertCircle, Chrome, Settings2, Loader2, Send, Sparkles, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function BrowserCaptureSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newDomain, setNewDomain] = useState('');

  // Simulator State
  const [simUrl, setSimUrl] = useState('https://github.com/project/pull/42');
  const [simTitle, setSimTitle] = useState('PR #42: Distributed Cache & Edge Routing');
  const [simSelectedText, setSimSelectedText] = useState('Team agreed to deploy Redis replica on worker node to drop latency from 180ms to 24ms.');
  const [isSimulating, setIsSimulating] = useState(false);

  const handleSimulateCapture = async (e) => {
    e.preventDefault();
    if (!simUrl.trim()) return;

    setIsSimulating(true);
    try {
      let domain = '';
      try {
        const parsed = new URL(simUrl.startsWith('http') ? simUrl : `https://${simUrl}`);
        domain = parsed.hostname;
      } catch {
        domain = simUrl.replace(/^https?:\/\//, '').split('/')[0];
      }

      await ingestBrowserCapture(user, {
        url: simUrl.trim(),
        domain,
        pageTitle: simTitle.trim() || domain,
        selectedText: simSelectedText.trim(),
        captureMode: 'extension_test',
        extensionVersion: '1.2.0',
        contextSessionId: null
      });

      toast({
        title: "✓ Browser Capture Ingested",
        description: `Successfully ingested from ${domain}. Contextualization started in your inbox.`,
      });
    } catch (err) {
      console.warn('Browser capture rejected or error:', err);
      toast({
        title: "Ingestion Blocked / Error",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const companyId = user?.user_metadata?.company_id || user?.company_id;
  const isEnabledGlobal = isV3FeatureEnabled(V3_FLAGS.BROWSER_CAPTURE_ENABLED, user);

  useEffect(() => {
    async function loadSettings() {
      if (user && isEnabledGlobal) {
        try {
          const s = await getUserCaptureSettings(user.id, companyId);
          setSettings(s);
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    }
    loadSettings();
  }, [user, companyId, isEnabledGlobal]);

  const toggleCapture = async (checked) => {
    if (!settings) return;
    try {
      const s = await updateUserCaptureSettings(user.id, { is_capture_enabled: checked });
      setSettings(s);
    } catch (e) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    }
  };

  const handleAddDomain = async (e) => {
    e.preventDefault();
    if (!newDomain.trim() || !settings) return;
    
    try {
      let clean = newDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      if (settings.excluded_domains.includes(clean)) {
        setNewDomain('');
        return;
      }
      
      const newDomains = [...settings.excluded_domains, clean];
      const s = await updateUserCaptureSettings(user.id, { excluded_domains: newDomains });
      setSettings(s);
      setNewDomain('');
    } catch (e) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    }
  };

  const handleRemoveDomain = async (domain) => {
    if (!settings) return;
    try {
      const newDomains = settings.excluded_domains.filter(d => d !== domain);
      const s = await updateUserCaptureSettings(user.id, { excluded_domains: newDomains });
      setSettings(s);
    } catch (e) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    }
  };

  if (!isEnabledGlobal) return null;
  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!settings) return null;

  return (
    <Card className="shadow-sm border-border w-full animate-in fade-in">
      <CardHeader className="border-b bg-secondary/10 pb-6 flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-xl flex items-center gap-2">
            <Chrome className="w-5 h-5 text-primary" />
            Browser Extension Privacy
          </CardTitle>
          <CardDescription className="mt-1">
            Manage your extension capture settings. Excluded domains are securely rejected at the edge before ingestion.
          </CardDescription>
        </div>
        <div className="flex items-center gap-3">
          <Label htmlFor="capture-mode" className="text-sm font-semibold text-muted-foreground">Global Capture</Label>
          <Switch 
            id="capture-mode"
            checked={settings.is_capture_enabled} 
            onCheckedChange={toggleCapture} 
            className="data-[state=checked]:bg-emerald-500"
          />
        </div>
      </CardHeader>
      
      <CardContent className="pt-6 space-y-8">
        {!settings.is_capture_enabled && (
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 flex gap-3 text-amber-700 dark:text-amber-500">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div className="text-sm">
              <span className="font-bold">Global Capture Paused.</span> The browser extension is currently rejecting all contextual captures until re-enabled.
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-500" />
            <h4 className="font-bold text-foreground">Excluded Domains</h4>
          </div>
          <p className="text-sm text-muted-foreground">URLs matching these domains will never be processed by the Clipad Assistant.</p>
          
          <form onSubmit={handleAddDomain} className="flex gap-2 max-w-md">
            <div className="relative flex-1">
              <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                type="text" 
                placeholder="e.g. yourbank.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                className="pl-9 bg-secondary/30"
              />
            </div>
            <Button type="submit" disabled={!newDomain.trim()} variant="secondary">
              <Plus className="w-4 h-4 mr-2" /> Exclude
            </Button>
          </form>

          <div className="flex flex-wrap gap-2 mt-4 pt-2">
            {settings.excluded_domains.length === 0 ? (
              <p className="text-sm text-muted-foreground italic border border-dashed rounded-lg px-4 py-2 bg-secondary/20">No domains excluded.</p>
            ) : (
              settings.excluded_domains.map(domain => (
                <Badge key={domain} variant="secondary" className="px-3 py-1.5 text-sm bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-red-500/20 flex items-center gap-2 transition-colors">
                  <Globe className="w-3.5 h-3.5 opacity-70" />
                  {domain}
                  <button 
                    type="button"
                    onClick={() => handleRemoveDomain(domain)}
                    className="ml-1 hover:bg-red-500/20 rounded-full p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                    title="Remove domain"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </Badge>
              ))
            )}
          </div>
        </div>

        {/* Browser Extension Ingestion Simulator & Test Sandbox */}
        <div className="pt-6 border-t border-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h4 className="font-bold text-foreground">Test Browser Ingestion Pipeline</h4>
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-secondary px-2 py-0.5 rounded">
              Interactive Test Sandbox
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Simulate a tab capture from the Clipad Browser Extension. It tests whether your exclusions, privacy guard, and AI contextualization work as expected.
          </p>

          <form onSubmit={handleSimulateCapture} className="space-y-3 p-4 rounded-xl bg-secondary/30 border border-border">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="sim-url" className="text-xs font-semibold text-muted-foreground">Page URL</Label>
                <Input
                  id="sim-url"
                  placeholder="https://github.com/project/pull/42"
                  value={simUrl}
                  onChange={(e) => setSimUrl(e.target.value)}
                  className="mt-1 bg-background"
                />
              </div>
              <div>
                <Label htmlFor="sim-title" className="text-xs font-semibold text-muted-foreground">Page Title</Label>
                <Input
                  id="sim-title"
                  placeholder="PR #42: Distributed Cache & Edge Routing"
                  value={simTitle}
                  onChange={(e) => setSimTitle(e.target.value)}
                  className="mt-1 bg-background"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="sim-text" className="text-xs font-semibold text-muted-foreground">Highlighted / Selected Text</Label>
              <Input
                id="sim-text"
                placeholder="Team agreed to deploy Redis replica on worker node to drop latency from 180ms to 24ms."
                value={simSelectedText}
                onChange={(e) => setSimSelectedText(e.target.value)}
                className="mt-1 bg-background"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Chrome className="w-4 h-4 text-primary" />
                <span>Sends through <code className="font-mono text-[11px] text-foreground">ingestBrowserCapture()</code></span>
              </div>
              <Button
                type="submit"
                disabled={isSimulating || !simUrl.trim()}
                className="font-semibold text-xs gap-2 shrink-0 bg-primary hover:bg-primary/90 text-white"
              >
                {isSimulating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Send Simulated Capture
              </Button>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
