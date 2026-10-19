import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Cpu,
  Copy,
  CheckCircle2,
  Terminal,
  ShieldCheck,
  ExternalLink,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';

export default function DeveloperMcp() {
  const [copiedKey, setCopiedKey] = useState(null);

  const handleCopy = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const cursorClaudeConfig = `{
  "mcpServers": {
    "weftro": {
      "command": "node",
      "args": ["packages/weftro-mcp/index.js"],
      "env": {
        "WEFTRO_API_URL": "https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect",
        "WEFTRO_TOKEN": "<YOUR_SCOPED_CONNECT_TOKEN>"
      }
    }
  }
}`;

  const npxConfig = `{
  "mcpServers": {
    "weftro": {
      "command": "npx",
      "args": ["-y", "@weftro/mcp-server"],
      "env": {
        "WEFTRO_API_URL": "https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect",
        "WEFTRO_TOKEN": "<YOUR_SCOPED_CONNECT_TOKEN>"
      }
    }
  }
}`;

  const supportedTools = [
    {
      name: 'search_organizational_memory',
      scope: 'search:read',
      desc: 'Execute semantic and grounded search across authorized organizational memories, documents, and technical notes with confidence scores and provenance.',
      params: 'query (required), limit (optional), offset (optional)'
    },
    {
      name: 'query_organizational_context',
      scope: 'context:read',
      desc: 'Retrieve structured context session records and chronologically bound captures by session ID or search keywords.',
      params: 'context_session_id (optional), query (optional), limit (optional)'
    },
    {
      name: 'get_memory_by_id',
      scope: 'memory:read',
      desc: 'Retrieve the complete content, importance score, memory tier, and metadata for a specific organizational memory by its UUID.',
      params: 'memory_id (required UUID)'
    },
    {
      name: 'list_organizational_memories',
      scope: 'memory:read',
      desc: 'List paginated organizational memories with optional filtering by status (ACTIVE/ARCHIVED).',
      params: 'limit (optional), offset (optional), status (optional)'
    },
    {
      name: 'get_entity_by_id',
      scope: 'entities:read',
      desc: 'Retrieve a knowledge graph entity node, entity type, attributes, and relationships array by entity UUID.',
      params: 'entity_id (required UUID)'
    },
    {
      name: 'list_captures',
      scope: 'captures:read',
      desc: 'List authorized organizational captures, source types (audio, video, text notes), and processing states.',
      params: 'limit (optional), offset (optional), source_type (optional)'
    },
    {
      name: 'get_capture_by_id',
      scope: 'captures:read',
      desc: 'Retrieve a specific capture record, transcript or note content, and queue processing status by capture UUID.',
      params: 'capture_id (required UUID)'
    },
    {
      name: 'list_smart_moments',
      scope: 'moments:read',
      desc: 'List extracted smart moments, key decisions, action items, and topic highlights with source timecodes.',
      params: 'limit (optional), offset (optional), moment_type (optional)'
    },
    {
      name: 'get_source_provenance',
      scope: 'sources:read',
      desc: 'Retrieve full source provenance, timestamps, original creator metadata, and media references for an organizational item.',
      params: 'source_id (required UUID)'
    }
  ];

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Overview Card */}
      <Card className="bg-card/70 border-border/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  Model Context Protocol (MCP) Server
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs font-mono">
                    Phase 5 Production
                  </Badge>
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground mt-0.5">
                  Connect Cursor, Claude Desktop, Windsurf, or custom AI agents directly to Weftro's organizational memory.
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              Transport: Stdio (JSON-RPC 2.0)
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            The Weftro MCP Server allows compatible AI assistants to dynamically query your organization's verified memories, architecture blueprints, meeting summaries, and entity knowledge graph.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-3.5 rounded-lg border border-border/60 bg-secondary/30">
              <div className="flex items-center gap-2 text-foreground font-semibold mb-1">
                <ShieldCheck className="w-4 h-4 text-primary" />
                Zero Direct DB Access
              </div>
              <p className="text-xs text-muted-foreground">
                All requests route through the Connect API Gateway, strictly honoring tenant isolation and rate limits.
              </p>
            </div>
            <div className="p-3.5 rounded-lg border border-border/60 bg-secondary/30">
              <div className="flex items-center gap-2 text-foreground font-semibold mb-1">
                <Layers className="w-4 h-4 text-primary" />
                Granular Scopes
              </div>
              <p className="text-xs text-muted-foreground">
                Each MCP tool maps to specific read scopes (<code className="text-primary font-mono text-[11px]">search:read</code>, <code className="text-primary font-mono text-[11px]">memory:read</code>).
              </p>
            </div>
            <div className="p-3.5 rounded-lg border border-border/60 bg-secondary/30">
              <div className="flex items-center gap-2 text-foreground font-semibold mb-1">
                <Sparkles className="w-4 h-4 text-primary" />
                Read-Only Safety
              </div>
              <p className="text-xs text-muted-foreground">
                Tools are strictly bounded to retrieval. No external write operations or modifications are permitted.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client Configuration Guide */}
      <Card className="bg-card/70 border-border/80">
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Terminal className="w-5 h-5 text-primary" />
            Client Configuration Guide
          </CardTitle>
          <CardDescription>
            Add the Weftro MCP server configuration block to your preferred AI environment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Cloud Connectors: ChatGPT & Claude */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground text-sm">Cloud Connectors (ChatGPT & Claude Web)</span>
                <span className="text-xs text-muted-foreground">(Streamable HTTP & SSE)</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1"
                onClick={() => handleCopy('cloud_mcp', 'https://www.weftro.com/mcp')}
              >
                {copiedKey === 'cloud_mcp' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Copied URL
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy Server URL
                  </>
                )}
              </Button>
            </div>
            <div className="p-4 rounded-xl bg-muted/60 border border-border/70 space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono text-muted-foreground w-28">Server URL:</span>
                <code className="bg-background px-2 py-0.5 rounded border border-border font-mono text-primary font-semibold">https://www.weftro.com/mcp</code>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-muted-foreground w-28">Authentication:</span>
                <span className="text-foreground">No sign-in (or Scoped Bearer Token)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-muted-foreground w-28">Protocol:</span>
                <span className="text-foreground">Model Context Protocol (2024-11-05)</span>
              </div>
            </div>
          </div>

          {/* Cursor Configuration */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground text-sm">Cursor IDE & Claude Desktop</span>
                <span className="text-xs text-muted-foreground">(Settings &gt; Features &gt; MCP Servers)</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1"
                onClick={() => handleCopy('cursor', cursorClaudeConfig)}
              >
                {copiedKey === 'cursor' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy JSON
                  </>
                )}
              </Button>
            </div>
            <pre className="p-4 rounded-xl bg-muted/60 border border-border/70 font-mono text-xs overflow-x-auto text-foreground">
              {cursorClaudeConfig}
            </pre>
          </div>

          {/* NPX Configuration */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground text-sm">NPX Global Runner</span>
                <span className="text-xs text-muted-foreground">(For Windsurf, Zed, or automated agents)</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1"
                onClick={() => handleCopy('npx', npxConfig)}
              >
                {copiedKey === 'npx' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy JSON
                  </>
                )}
              </Button>
            </div>
            <pre className="p-4 rounded-xl bg-muted/60 border border-border/70 font-mono text-xs overflow-x-auto text-foreground">
              {npxConfig}
            </pre>
          </div>

          <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-foreground">Token Requirement:</span> Replace <code className="text-primary font-mono">&lt;YOUR_SCOPED_CONNECT_TOKEN&gt;</code> with an active access token issued from the <strong>Apps & Credentials</strong> tab. Ensure your token includes the scopes required for your intended tools.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Tools Catalog */}
      <Card className="bg-card/70 border-border/80">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold">Supported MCP Tools Catalog</CardTitle>
              <CardDescription>
                All 9 authorized read-only tools exposed by the Weftro MCP server.
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              9 Verified Tools
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border/60">
            {supportedTools.map((tool) => (
              <div key={tool.name} className="py-4 first:pt-0 last:pb-0 space-y-1.5">
                <div className="flex items-center justify-between gap-4">
                  <div className="font-mono text-sm font-semibold text-primary">
                    {tool.name}
                  </div>
                  <Badge variant="secondary" className="font-mono text-[11px] shrink-0">
                    Scope: {tool.scope}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {tool.desc}
                </p>
                <div className="text-[11px] font-mono text-muted-foreground/80 pt-0.5">
                  <span className="text-foreground/70 font-semibold">Inputs:</span> {tool.params}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
