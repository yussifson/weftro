import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DEVELOPER_PLATFORM_KNOWLEDGE } from '@/lib/weftroDeveloperDocs';
import { BookOpen, Copy, CheckCircle2, Shield, KeyRound, TerminalSquare } from 'lucide-react';

export default function DeveloperDocs() {
  const [copiedPath, setCopiedPath] = useState(null);

  const copySnippet = (text, path) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Intro & Auth Guide */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-primary" />
            Authentication & Headers
          </CardTitle>
          <CardDescription className="text-xs">
            Weftro API Gateway enforces Bearer authentication on all protected endpoints.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 bg-muted/40 border border-border rounded-xl space-y-2">
              <span className="font-bold text-foreground block">1. Connect API Tokens</span>
              <p className="text-muted-foreground text-[11px]">
                Issued to applications for external systems and scripts. Begins with <code className="font-mono bg-secondary px-1 rounded">cpd_</code>.
              </p>
              <pre className="font-mono text-[11px] bg-secondary p-2 rounded text-foreground">
                Authorization: Bearer cpd_9f8e7d6c...
              </pre>
            </div>

            <div className="p-3.5 bg-muted/40 border border-border rounded-xl space-y-2">
              <span className="font-bold text-foreground block">2. Standard Rate Limiting</span>
              <p className="text-muted-foreground text-[11px]">
                Tokens are allocated a default rate of 120 Requests Per Minute (RPM) with rolling window tracking.
              </p>
              <pre className="font-mono text-[11px] bg-secondary p-2 rounded text-foreground">
                X-RateLimit-Limit: 120
X-RateLimit-Remaining: 118
X-RateLimit-Reset: 58
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scopes Reference */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Authorization Scopes
          </CardTitle>
          <CardDescription className="text-xs">
            Tokens operate with strict least-privilege scoping. Requests to unscoped capabilities return <code className="font-mono">403 FORBIDDEN</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {DEVELOPER_PLATFORM_KNOWLEDGE.scopes.map((s) => (
              <div key={s.name} className="p-3 rounded-xl border border-border bg-card flex items-start justify-between gap-3">
                <div>
                  <Badge variant="outline" className="font-mono text-[10px] font-bold text-primary border-primary/20 bg-primary/5">
                    {s.name}
                  </Badge>
                  <p className="text-muted-foreground text-[11px] mt-1.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Endpoints Reference */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-lg text-foreground">REST Endpoints Reference (/api/v1)</h3>
        </div>

        <div className="space-y-3">
          {DEVELOPER_PLATFORM_KNOWLEDGE.endpoints.map((ep) => (
            <div key={`${ep.method}-${ep.path}`} className="border border-border rounded-xl bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Badge
                    variant="outline"
                    className={`font-mono text-[10px] font-bold ${
                      ep.method === 'POST'
                        ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                        : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    }`}
                  >
                    {ep.method}
                  </Badge>
                  <code className="font-mono text-sm font-semibold text-foreground">{ep.path}</code>
                </div>

                <Badge variant="secondary" className="font-mono text-[10px]">
                  Scope: {ep.scope}
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground">{ep.description}</p>

              {ep.example && (
                <div className="p-3 bg-secondary/40 border border-border rounded-lg relative">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">cURL Example</span>
                    <button
                      onClick={() => copySnippet(ep.example, ep.path)}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      {copiedPath === ep.path ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="font-mono text-[11px] overflow-x-auto text-foreground whitespace-pre-wrap">{ep.example}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
