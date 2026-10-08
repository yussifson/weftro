import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getUserCaptureSettings, updateUserCaptureSettings } from '@/lib/clipadBrowserCaptureService';
import { isV3FeatureEnabled, V3_FLAGS } from '@/lib/clipadV3Flags';
import { Loader2, Shield, Globe, Power, Plus, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

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
  }, [user, isEnabledGlobal, companyId]);

  const toggleCapture = async () => {
    if (!settings) return;
    try {
      const updated = await updateUserCaptureSettings(user.id, { is_capture_enabled: !settings.is_capture_enabled });
      setSettings(updated);
      toast({ title: updated.is_capture_enabled ? 'Capture Resumed' : 'Capture Paused' });
    } catch (e) {
      toast({ title: 'Error toggling capture', variant: 'destructive' });
    }
  };

  const addExcludedDomain = async (e) => {
    e.preventDefault();
    if (!newDomain.trim() || !settings) return;
    const cleanDomain = newDomain.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
    
    if (settings.excluded_domains.includes(cleanDomain)) {
      setNewDomain('');
      return;
    }

    try {
      const newDomains = [...settings.excluded_domains, cleanDomain];
      const updated = await updateUserCaptureSettings(user.id, { excluded_domains: newDomains });
      setSettings(updated);
      setNewDomain('');
      toast({ title: 'Domain excluded' });
    } catch (e) {
      toast({ title: 'Error adding domain', variant: 'destructive' });
    }
  };

  const removeExcludedDomain = async (domainToRemove) => {
    if (!settings) return;
    try {
      const newDomains = settings.excluded_domains.filter(d => d !== domainToRemove);
      const updated = await updateUserCaptureSettings(user.id, { excluded_domains: newDomains });
      setSettings(updated);
    } catch (e) {
      toast({ title: 'Error removing domain', variant: 'destructive' });
    }
  };

  if (!isEnabledGlobal) return null;
  if (loading) return <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />;

  if (!settings) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Browser Extension Privacy
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your extension settings. Excluded domains are securely rejected before ingestion.
          </p>
        </div>
        <button
          onClick={toggleCapture}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
            settings.is_capture_enabled 
              ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50' 
              : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50'
          }`}
        >
          <Power className="w-4 h-4" />
          {settings.is_capture_enabled ? 'Capture Active' : 'Capture Paused'}
        </button>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Globe className="w-4 h-4 text-muted-foreground" />
          Never Capture (Excluded Domains)
        </h4>
        
        <form onSubmit={addExcludedDomain} className="flex gap-2">
          <input 
            type="text" 
            placeholder="e.g. yourbank.com"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button type="submit" disabled={!newDomain.trim()} className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground text-sm font-bold rounded-lg transition-colors flex items-center gap-1">
            <Plus className="w-4 h-4" /> Add
          </button>
        </form>

        <div className="flex flex-wrap gap-2 mt-4">
          {settings.excluded_domains.length === 0 ? (
            <span className="text-xs text-muted-foreground italic">No excluded domains yet.</span>
          ) : (
            settings.excluded_domains.map(domain => (
              <div key={domain} className="flex items-center gap-1.5 bg-background border border-border rounded-lg pl-3 pr-1 py-1">
                <span className="text-xs font-medium text-foreground">{domain}</span>
                <button 
                  onClick={() => removeExcludedDomain(domain)}
                  className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-600 rounded-md transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
