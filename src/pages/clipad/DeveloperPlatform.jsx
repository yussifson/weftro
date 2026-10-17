import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { isV3FeatureEnabled, V3_FLAGS } from '@/lib/clipadV3Flags';
import ConnectSettings from '@/components/clipad/features/ConnectSettings';
import DeveloperAIAssistant from '@/components/clipad/features/DeveloperAIAssistant';
import DeveloperApiExplorer from '@/components/clipad/features/DeveloperApiExplorer';
import DeveloperDocs from '@/components/clipad/features/DeveloperDocs';
import DeveloperLogs from '@/components/clipad/features/DeveloperLogs';

import DeveloperMcp from '@/components/clipad/features/DeveloperMcp';

import {
  Code2,
  TerminalSquare,
  KeyRound,
  BookOpen,
  Bot,
  Activity,
  Cpu,
  Webhook,
  ArrowLeft,
  Key
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function DeveloperPlatform() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active sub-tab from URL pathname
  // Supported subpaths: /developers, /developers/mcp, /developers/assistant, /developers/explorer, /developers/docs, /developers/logs
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/developers/mcp')) return 'mcp';
    if (path.includes('/developers/assistant')) return 'assistant';
    if (path.includes('/developers/explorer')) return 'explorer';
    if (path.includes('/developers/docs')) return 'docs';
    if (path.includes('/developers/logs')) return 'logs';
    if (path.includes('/developers/apps') || path.includes('/developers/tokens')) return 'credentials';
    return 'overview';
  };

  const activeTab = getActiveTab();
  const isConnectEnabled = isV3FeatureEnabled(V3_FLAGS.CONNECT_ENABLED, user);

  return (
    <div className="min-h-full bg-background text-foreground pb-12" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/5 via-background to-background px-6 py-8">
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex items-start gap-4 mb-4">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-secondary transition-colors shrink-0"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">Developer Platform</h1>
                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-mono font-semibold">
                  API Gateway v1
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Build applications, configure MCP integrations, generate scoped tokens, and query organizational intelligence.
              </p>
            </div>
          </div>

          {/* Subnavigation Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pt-4 border-b border-border hide-scrollbar text-xs">
            <button
              onClick={() => navigate('/developers')}
              className={`pb-3 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'overview' || activeTab === 'credentials'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              Apps & Credentials
            </button>

            <button
              onClick={() => navigate('/developers/mcp')}
              className={`pb-3 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'mcp'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-primary" />
              MCP Server
            </button>

            <button
              onClick={() => navigate('/developers/assistant')}
              className={`pb-3 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'assistant'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-primary" />
              Developer AI Assistant
            </button>

            <button
              onClick={() => navigate('/developers/explorer')}
              className={`pb-3 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'explorer'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <TerminalSquare className="w-3.5 h-3.5" />
              API Explorer
            </button>

            <button
              onClick={() => navigate('/developers/docs')}
              className={`pb-3 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'docs'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              API Documentation
            </button>

            <button
              onClick={() => navigate('/developers/logs')}
              className={`pb-3 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'logs'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Audit Logs
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 mt-8">
        {activeTab === 'mcp' ? (
          <DeveloperMcp />
        ) : activeTab === 'assistant' ? (
          <DeveloperAIAssistant />
        ) : activeTab === 'explorer' ? (
          <DeveloperApiExplorer />
        ) : activeTab === 'docs' ? (
          <DeveloperDocs />
        ) : activeTab === 'logs' ? (
          <DeveloperLogs />
        ) : (
          <ConnectSettings />
        )}
      </div>
    </div>
  );
}
