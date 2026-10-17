import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/api/supabaseClient';
import {
  Webhook,
  Plus,
  Trash2,
  RotateCcw,
  Send,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  ShieldCheck,
  Activity,
  Loader2,
  Lock,
  Layers,
  ArrowRight
} from 'lucide-react';

const SUPPORTED_EVENTS = [
  { id: 'memory.created', name: 'Memory Created', desc: 'Emitted when a new organizational memory is formed' },
  { id: 'memory.updated', name: 'Memory Updated', desc: 'Emitted when an existing memory is enriched or updated' },
  { id: 'capture.created', name: 'Capture Created', desc: 'Emitted when raw text or meeting notes are uploaded' },
  { id: 'capture.processed', name: 'Capture Processed', desc: 'Emitted when background queue workers complete processing' },
  { id: 'smart_moment.detected', name: 'Smart Moment Detected', desc: 'Emitted when key decisions or action items are extracted' },
];

const BASE_URL = import.meta.env.VITE_SUPABASE_URL 
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/connect`
  : 'https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect';

export default function DeveloperWebhooks() {
  const { user } = useAuth();
  const [webhooks, setWebhooks] = useState([]);
  const [apps, setApps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSecretDisplay, setNewSecretDisplay] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  // Form State
  const [endpointUrl, setEndpointUrl] = useState('');
  const [selectedAppId, setSelectedAppId] = useState('');
  const [selectedEvents, setSelectedEvents] = useState(['memory.created', 'capture.processed']);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deliveries / Inspection State
  const [selectedHook, setSelectedHook] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const fetchWebhooks = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch(`${BASE_URL}/api/v1/webhooks`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });
      const data = await res.json();
      if (res.ok) {
        setWebhooks(data.data || []);
      }
    } catch (err) {
      console.warn('Error fetching webhooks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchApps = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch(`${BASE_URL}/api/v1/apps`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
      });
      const data = await res.json();
      if (res.ok) {
        setApps(data.data || []);
      }
    } catch (_e) {}
  };

  useEffect(() => {
    fetchWebhooks();
    fetchApps();
  }, [user]);

  const handleCopy = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleEventSelection = (eventId) => {
    setSelectedEvents((prev) =>
      prev.includes(eventId) ? prev.filter((id) => id !== eventId) : [...prev, eventId]
    );
  };

  const handleCreateWebhook = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!endpointUrl.trim()) {
      setFormError('Endpoint URL is required.');
      return;
    }
    if (selectedEvents.length === 0) {
      setFormError('Select at least one event type.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`${BASE_URL}/api/v1/webhooks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint_url: endpointUrl.trim(),
          app_id: selectedAppId || undefined,
          events: selectedEvents,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error?.message || 'Failed to create webhook subscription.');
        return;
      }

      setNewSecretDisplay(data.data?.secret);
      setEndpointUrl('');
      setSelectedEvents(['memory.created', 'capture.processed']);
      fetchWebhooks();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteWebhook = async (hookId) => {
    if (!window.confirm('Delete this webhook subscription? Events will no longer be delivered.')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      await fetch(`${BASE_URL}/api/v1/webhooks/${hookId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      fetchWebhooks();
      if (selectedHook?.id === hookId) setSelectedHook(null);
    } catch (err) {
      console.warn('Error deleting webhook:', err);
    }
  };

  const handleRotateSecret = async (hookId) => {
    if (!window.confirm('Rotate webhook signing secret? You must immediately update your receiver endpoint with the new secret.')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`${BASE_URL}/api/v1/webhooks/${hookId}/rotate-secret`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setNewSecretDisplay(data.data?.secret);
      }
    } catch (err) {
      console.warn('Error rotating secret:', err);
    }
  };

  const handleTestDispatch = async (hook) => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`${BASE_URL}/api/v1/webhooks/${hook.id}/test`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      setTestResult(data.data || data.error);
      fetchDeliveries(hook.id);
    } catch (err) {
      setTestResult({ error: true, message: err.message });
    } finally {
      setIsTesting(false);
    }
  };

  const fetchDeliveries = async (hookId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`${BASE_URL}/api/v1/webhooks/${hookId}/deliveries`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setDeliveries(data.data || []);
      }
    } catch (_e) {}
  };

  const handleSelectHook = (hook) => {
    setSelectedHook(hook);
    setTestResult(null);
    fetchDeliveries(hook.id);
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header Overview Card */}
      <Card className="bg-card/70 border-border/80">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Webhook className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  Webhook Subscriptions & Delivery Engine
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs font-mono">
                    Phase 6 Active
                  </Badge>
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground mt-0.5">
                  Receive cryptographically signed HTTP event notifications when memories, captures, or smart moments are generated.
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={() => {
                setShowCreateModal(true);
                setNewSecretDisplay(null);
              }}
              className="gap-1.5 text-xs h-9"
            >
              <Plus className="w-4 h-4" />
              New Subscription
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-muted-foreground">
            <div className="p-3.5 rounded-lg border border-border/60 bg-secondary/30">
              <div className="flex items-center gap-1.5 text-foreground font-semibold mb-1">
                <Lock className="w-4 h-4 text-primary" />
                HMAC-SHA256 Signatures
              </div>
              All payloads are signed with <code className="text-primary font-mono text-[11px]">X-Weftro-Signature</code> to ensure authenticity and integrity.
            </div>
            <div className="p-3.5 rounded-lg border border-border/60 bg-secondary/30">
              <div className="flex items-center gap-1.5 text-foreground font-semibold mb-1">
                <ShieldCheck className="w-4 h-4 text-primary" />
                SSRF Protection
              </div>
              Localhost, loopback, link-local, and cloud metadata destinations (169.254.x) are strictly prohibited.
            </div>
            <div className="p-3.5 rounded-lg border border-border/60 bg-secondary/30">
              <div className="flex items-center gap-1.5 text-foreground font-semibold mb-1">
                <Activity className="w-4 h-4 text-primary" />
                Delivery History & Retries
              </div>
              Inspect status codes, response times, and manually trigger signed ping tests or delivery replays.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* One-time secret display alert */}
      {newSecretDisplay && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-foreground space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-sm text-amber-500">
              <AlertCircle className="w-4 h-4" />
              Webhook Signing Secret (Shown Once)
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1"
              onClick={() => handleCopy('newSecret', newSecretDisplay)}
            >
              {copiedKey === 'newSecret' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy Secret
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Copy and store this secret securely in your receiver environment. It will never be shown again in plain text.
          </p>
          <pre className="p-2.5 rounded bg-muted/60 font-mono text-xs text-amber-400 select-all overflow-x-auto">
            {newSecretDisplay}
          </pre>
        </div>
      )}

      {/* Create Modal / Form Drawer */}
      {showCreateModal && (
        <Card className="bg-card border-primary/40 shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold">Register New Webhook Endpoint</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
            </div>
            <CardDescription className="text-xs">
              Configure an HTTPS endpoint URL and select the organizational events you wish to receive.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateWebhook} className="space-y-4 text-sm">
              <div>
                <Label className="text-xs font-semibold">Endpoint URL (HTTPS Recommended)</Label>
                <Input
                  placeholder="https://api.yourdomain.com/webhooks/weftro"
                  value={endpointUrl}
                  onChange={(e) => setEndpointUrl(e.target.value)}
                  className="font-mono text-xs mt-1"
                  required
                />
              </div>

              {apps.length > 0 && (
                <div>
                  <Label className="text-xs font-semibold">Associated Application (Optional)</Label>
                  <select
                    value={selectedAppId}
                    onChange={(e) => setSelectedAppId(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground mt-1"
                  >
                    <option value="">Organization-wide Webhook</option>
                    {apps.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.client_id})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <Label className="text-xs font-semibold mb-2 block">Event Subscriptions</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {SUPPORTED_EVENTS.map((evt) => {
                    const isSelected = selectedEvents.includes(evt.id);
                    return (
                      <div
                        key={evt.id}
                        onClick={() => toggleEventSelection(evt.id)}
                        className={`p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                          isSelected
                            ? 'border-primary bg-primary/10 text-foreground'
                            : 'border-border/60 bg-secondary/20 text-muted-foreground hover:bg-secondary/40'
                        }`}
                      >
                        <div className="font-semibold flex items-center justify-between">
                          <code className="text-primary font-mono text-[11px]">{evt.id}</code>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">{evt.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {formError && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                      Registering...
                    </>
                  ) : (
                    'Register Webhook'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Subscriptions List */}
      <Card className="bg-card/70 border-border/80">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold">Active Subscriptions</CardTitle>
              <CardDescription>
                Endpoints receiving event dispatches for your organization.
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {webhooks.length} Registered
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8 text-muted-foreground gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading webhooks...
            </div>
          ) : webhooks.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-border rounded-xl">
              <Webhook className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-foreground">No webhook subscriptions yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Register an endpoint to stream real-time organizational memory events to external services.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-4 gap-1 text-xs"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="w-3.5 h-3.5" />
                Register Webhook
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {webhooks.map((hook) => (
                <div key={hook.id} className="py-4 first:pt-0 last:pb-0 space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-foreground truncate max-w-md">
                        {hook.endpoint_url}
                      </span>
                      {hook.is_active ? (
                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          Disabled
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => handleSelectHook(hook)}
                      >
                        <Activity className="w-3 h-3" />
                        Inspect & Test
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-muted-foreground hover:text-foreground"
                        title="Rotate Secret"
                        onClick={() => handleRotateSecret(hook.id)}
                      >
                        <RotateCcw className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-destructive hover:bg-destructive/10"
                        title="Delete Webhook"
                        onClick={() => handleDeleteWebhook(hook.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {hook.events?.map((evt) => (
                      <Badge key={evt} variant="secondary" className="font-mono text-[10px]">
                        {evt}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inspect & Test Delivery Drawer */}
      {selectedHook && (
        <Card className="bg-card border-primary/40 shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  Delivery History & Test Console
                </CardTitle>
                <CardDescription className="font-mono text-xs text-muted-foreground mt-0.5 truncate max-w-xl">
                  {selectedHook.endpoint_url}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="gap-1.5 text-xs h-8"
                  onClick={() => handleTestDispatch(selectedHook)}
                  disabled={isTesting}
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Dispatching...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Send Test Ping
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs"
                  onClick={() => setSelectedHook(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {testResult && (
              <div className="p-3.5 rounded-xl border border-border bg-secondary/30 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-foreground">
                    {testResult.delivered ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                    )}
                    Test Dispatch: {testResult.status?.toUpperCase()}
                  </span>
                  <span className="font-mono text-muted-foreground">
                    HTTP {testResult.response_status || 0} ({testResult.duration_ms || 0}ms)
                  </span>
                </div>
                {testResult.headers_sent && (
                  <div className="font-mono text-[11px] text-muted-foreground/90 space-y-0.5 pt-1">
                    <div>
                      <span className="text-foreground/70">X-Weftro-Signature:</span>{' '}
                      {testResult.headers_sent['X-Weftro-Signature']}
                    </div>
                    <div>
                      <span className="text-foreground/70">X-Weftro-Event-Id:</span>{' '}
                      {testResult.headers_sent['X-Weftro-Event-Id']}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <div className="text-xs font-semibold text-foreground mb-2">Recent Deliveries</div>
              {deliveries.length === 0 ? (
                <div className="text-xs text-muted-foreground py-4 text-center border border-dashed rounded-lg">
                  No recorded delivery attempts yet. Click <strong>Send Test Ping</strong> to trigger a delivery.
                </div>
              ) : (
                <div className="divide-y divide-border/60 border rounded-lg overflow-hidden text-xs">
                  {deliveries.map((d) => (
                    <div key={d.id} className="p-3 flex items-center justify-between gap-4 bg-card/40">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={d.status === 'delivered' ? 'default' : 'destructive'}
                            className="text-[10px] uppercase font-mono"
                          >
                            {d.status}
                          </Badge>
                          <span className="font-mono text-foreground font-semibold">{d.event_type}</span>
                          <span className="text-muted-foreground text-[11px]">
                            {new Date(d.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          Event ID: <code className="font-mono">{d.event_id}</code>
                        </div>
                      </div>
                      <div className="text-right font-mono text-[11px] text-muted-foreground">
                        Status: HTTP {d.response_status || 0} ({d.execution_duration_ms || 0}ms)
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
