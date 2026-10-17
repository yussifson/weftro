import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Play, Loader2, Copy, CheckCircle2, TerminalSquare, AlertCircle } from 'lucide-react';

const ENDPOINTS = [
  {
    name: 'Grounded Search',
    method: 'POST',
    path: '/api/v1/search',
    scope: 'search:read',
    defaultBody: JSON.stringify({ query: 'architecture roadmap', limit: 5 }, null, 2),
  },
  {
    name: 'List Memories',
    method: 'GET',
    path: '/api/v1/memories?limit=10',
    scope: 'memory:read',
    defaultBody: null,
  },
  {
    name: 'Get Capabilities',
    method: 'GET',
    path: '/api/v1/capabilities',
    scope: 'none',
    defaultBody: null,
  },
  {
    name: 'Gateway Health',
    method: 'GET',
    path: '/api/v1/health',
    scope: 'none',
    defaultBody: null,
  },
  {
    name: 'List Apps',
    method: 'GET',
    path: '/api/v1/apps',
    scope: 'apps:manage',
    defaultBody: null,
  },
  {
    name: 'List Tokens',
    method: 'GET',
    path: '/api/v1/tokens',
    scope: 'apps:manage',
    defaultBody: null,
  },
  {
    name: 'List Captures',
    method: 'GET',
    path: '/api/v1/captures',
    scope: 'captures:read',
    defaultBody: null,
  },
  {
    name: 'List Smart Moments',
    method: 'GET',
    path: '/api/v1/smart-moments',
    scope: 'moments:read',
    defaultBody: null,
  },
];

const BASE_URL = import.meta.env.VITE_SUPABASE_URL 
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/connect`
  : 'https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect';

export default function DeveloperApiExplorer() {
  const [selectedEndpoint, setSelectedEndpoint] = useState(ENDPOINTS[0]);
  const [tokenInput, setTokenInput] = useState('');
  const [requestBody, setRequestBody] = useState(selectedEndpoint.defaultBody || '');
  const [isLoading, setIsLoading] = useState(false);
  const [responseOutput, setResponseOutput] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleSelectEndpoint = (ep) => {
    setSelectedEndpoint(ep);
    setRequestBody(ep.defaultBody || '');
    setResponseOutput(null);
  };

  const handleExecute = async () => {
    setIsLoading(true);
    setResponseOutput(null);

    const startTime = Date.now();
    const headers = {
      'Accept': 'application/json',
    };

    if (tokenInput.trim()) {
      headers['Authorization'] = `Bearer ${tokenInput.trim()}`;
    }

    if (selectedEndpoint.method !== 'GET' && requestBody) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const url = `${BASE_URL}${selectedEndpoint.path}`;
      const res = await fetch(url, {
        method: selectedEndpoint.method,
        headers,
        body: selectedEndpoint.method !== 'GET' && requestBody ? requestBody : undefined,
      });

      const latency = Date.now() - startTime;
      let data = null;
      try {
        data = await res.json();
      } catch (_e) {
        data = await res.text();
      }

      setResponseOutput({
        status: res.status,
        statusText: res.statusText,
        latency_ms: latency,
        headers: {
          'x-ratelimit-remaining': res.headers.get('x-ratelimit-remaining'),
          'x-ratelimit-limit': res.headers.get('x-ratelimit-limit'),
          'x-request-id': res.headers.get('x-request-id'),
        },
        data,
      });
    } catch (err) {
      setResponseOutput({
        error: true,
        message: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generatedCurl = `curl -X ${selectedEndpoint.method} "${BASE_URL}${selectedEndpoint.path}" \\
  -H "Authorization: Bearer ${tokenInput ? '<YOUR_TOKEN>' : '<TOKEN>'}"${selectedEndpoint.method !== 'GET' && requestBody ? ` \\\n  -H "Content-Type: application/json" \\\n  -d '${requestBody.replace(/\n\s*/g, ' ')}'` : ''}`;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Endpoints selector */}
        <Card className="lg:col-span-1 shadow-xs border-border">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <TerminalSquare className="w-4 h-4 text-primary" />
              API Routes
            </CardTitle>
            <CardDescription className="text-xs">Select an endpoint to construct and test a live request.</CardDescription>
          </CardHeader>
          <CardContent className="p-2 space-y-1">
            {ENDPOINTS.map((ep) => {
              const isSelected = selectedEndpoint.name === ep.name;
              return (
                <button
                  key={ep.name}
                  onClick={() => handleSelectEndpoint(ep)}
                  className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between text-xs ${
                    isSelected
                      ? 'bg-primary/10 border border-primary/20 text-foreground font-semibold'
                      : 'hover:bg-muted/40 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1.5 py-0 font-mono font-bold ${
                        ep.method === 'POST' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                      }`}
                    >
                      {ep.method}
                    </Badge>
                    <span className="truncate">{ep.name}</span>
                  </div>
                  <Badge variant="secondary" className="text-[9px] font-mono">{ep.scope}</Badge>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Right Column: Request Composer & Live Response */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="shadow-xs border-border">
            <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="font-mono text-[10px] font-bold">{selectedEndpoint.method}</Badge>
                  <code className="text-xs font-mono font-semibold text-foreground">{selectedEndpoint.path}</code>
                </div>
                <CardDescription className="text-xs mt-1">Requires scope: <span className="font-mono font-semibold">{selectedEndpoint.scope}</span></CardDescription>
              </div>

              <Button onClick={handleExecute} disabled={isLoading} size="sm" className="h-8 gap-1.5 text-xs">
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                Send Request
              </Button>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="token" className="text-xs font-semibold text-muted-foreground">Bearer Connect Token (optional for public /health & /capabilities)</Label>
                <Input
                  id="token"
                  type="password"
                  placeholder="cpd_... or paste temporary access token"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="font-mono text-xs bg-secondary/30"
                />
              </div>

              {selectedEndpoint.method !== 'GET' && (
                <div className="space-y-1.5">
                  <Label htmlFor="body" className="text-xs font-semibold text-muted-foreground">JSON Request Payload</Label>
                  <textarea
                    id="body"
                    rows={4}
                    value={requestBody}
                    onChange={(e) => setRequestBody(e.target.value)}
                    className="w-full font-mono text-xs p-3 rounded-xl border border-border bg-secondary/30 text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}

              {/* Generated cURL command */}
              <div className="p-3 bg-muted/40 border border-border rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">cURL Equivalent</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCurl);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="font-mono text-[11px] overflow-x-auto text-muted-foreground">{generatedCurl}</pre>
              </div>
            </CardContent>
          </Card>

          {/* Response Pane */}
          {responseOutput && (
            <Card className="shadow-xs border-border">
              <CardHeader className="pb-2 border-b border-border/50 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">Response Status:</span>
                  <Badge
                    variant="outline"
                    className={`font-mono text-[11px] font-bold ${
                      responseOutput.status >= 200 && responseOutput.status < 300
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                        : 'bg-red-500/10 text-red-600 border-red-500/20'
                    }`}
                  >
                    {responseOutput.status || 'ERROR'} {responseOutput.statusText}
                  </Badge>
                  {responseOutput.latency_ms && (
                    <span className="text-[11px] text-muted-foreground font-mono">({responseOutput.latency_ms} ms)</span>
                  )}
                </div>
                {responseOutput.headers?.['x-ratelimit-remaining'] && (
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Rate Remaining: {responseOutput.headers['x-ratelimit-remaining']}
                  </span>
                )}
              </CardHeader>
              <CardContent className="p-4">
                <pre className="font-mono text-xs bg-secondary/50 p-3 rounded-xl overflow-x-auto max-h-[300px] text-foreground">
                  {JSON.stringify(responseOutput.data || responseOutput.message, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
