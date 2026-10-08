import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getUserCaptureSettings, updateUserCaptureSettings } from '@/lib/clipadBrowserCaptureService';
import { isV3FeatureEnabled, V3_FLAGS } from '@/lib/clipadV3Flags';
import { Shield, Power, Globe, X, Plus, AlertCircle, Chrome, Settings2, Loader2 } from 'lucide-react';
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
      </CardContent>
    </Card>
  );
}
