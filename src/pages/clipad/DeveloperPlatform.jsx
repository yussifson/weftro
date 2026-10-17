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
import DeveloperWebhooks from '@/components/clipad/features/DeveloperWebhooks';

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
  PanelLeftClose,
  PanelLeft
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const SIDEBAR_TABS = [
  {
    id: 'credentials',
    path: '/developers',
    matchPaths: ['/developers', '/developers/apps', '/developers/tokens'],
    icon: KeyRound,
    label: 'Apps & Credentials',
    description: 'API keys, client secrets, and scopes'
  },
  {
    id: 'webhooks',
    path: '/developers/webhooks',
    matchPaths: ['/developers/webhooks'],
    icon: Webhook,
    label: 'Webhooks',
    description: 'Real-time event subscriptions'
  },
  {
    id: 'mcp',
    path: '/developers/mcp',
    matchPaths: ['/developers/mcp'],
    icon: Cpu,
    label: 'MCP Server',
    description: 'Cursor, Claude & agent tools'
  },
  {
    id: 'assistant',
    path: '/developers/assistant',
    matchPaths: ['/developers/assistant'],
    icon: Bot,
    label: 'Developer AI Assistant',
    description: 'Interactive technical guidance'
  },
  {
    id: 'explorer',
    path: '/developers/explorer',
    matchPaths: ['/developers/explorer'],
    icon: TerminalSquare,
    label: 'API Explorer',
    description: 'Interactive endpoint runner'
  },
  {
    id: 'docs',
    path: '/developers/docs',
    matchPaths: ['/developers/docs'],
    icon: BookOpen,
    label: 'API Documentation',
    description: 'REST OpenAPI specification'
  },
  {
    id: 'logs',
    path: '/developers/logs',
    matchPaths: ['/developers/logs'],
    icon: Activity,
    label: 'Audit Logs',
    description: 'Gateway telemetry & requests'
  }
];

export default function DeveloperPlatform() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Determine active tab from URL pathname
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/developers/webhooks')) return 'webhooks';
    if (path.includes('/developers/mcp')) return 'mcp';
    if (path.includes('/developers/assistant')) return 'assistant';
    if (path.includes('/developers/explorer')) return 'explorer';
    if (path.includes('/developers/docs')) return 'docs';
    if (path.includes('/developers/logs')) return 'logs';
    return 'credentials';
  };

  const activeTab = getActiveTab();
  const currentTabObj = SIDEBAR_TABS.find(t => t.id === activeTab) || SIDEBAR_TABS[0];

  return (
    <div className="flex h-[calc(100vh-60px)] w-full overflow-hidden bg-background text-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* SIDEBAR NAVIGATION (Matching SpaceDashboard pattern) */}
      <aside
        className={`bg-card border-r border-border flex-col hidden md:flex shrink-0 transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center px-4 border-b border-border gap-3 shrink-0 justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            {sidebarOpen ? (
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground bg-secondary hover:bg-accent rounded-md transition-all shadow-sm shrink-0"
                title="Go back"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Code2 className="w-4 h-4" />
              </div>
            )}
            <div className={`overflow-hidden transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-foreground truncate">Developer</span>
                <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/20 font-mono px-1 py-0">
                  v1
                </Badge>
              </div>
            </div>
          </div>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors shrink-0"
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="w-4 h-4 transition-transform duration-300" />
            ) : (
              <PanelLeft className="w-4 h-4 transition-transform duration-300" />
            )}
          </button>
        </div>

        {/* Sidebar Nav Links */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5 scrollbar-thin">
          {sidebarOpen && (
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 px-3">
              Developer Platform
            </div>
          )}

          {SIDEBAR_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                title={!sidebarOpen ? tab.label : ''}
                className={`flex items-center rounded-xl transition-all ${
                  sidebarOpen
                    ? 'w-full gap-3 px-3.5 py-2.5 text-left'
                    : 'justify-center w-12 h-12 mx-auto'
                } ${
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold border border-primary/20 shadow-sm'
                    : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                }`}
              >
                <Icon
                  className={`shrink-0 ${sidebarOpen ? 'w-4 h-4' : 'w-5 h-5'} ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                />
                {sidebarOpen && (
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs truncate">{tab.label}</span>
                    <span className="text-[10px] text-muted-foreground font-normal truncate">
                      {tab.description}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        {sidebarOpen && (
          <div className="p-4 border-t border-border shrink-0 bg-secondary/20">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-[11px]">Gateway Operational</span>
            </div>
          </div>
        )}
      </aside>

      {/* MOBILE HORIZONTAL NAVIGATION (Visible on small screens) */}
      <div className="md:hidden fixed top-14 left-0 right-0 bg-card border-b border-border z-30 flex overflow-x-auto px-2 py-2 hide-scrollbar">
        {SIDEBAR_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`flex items-center gap-1.5 px-3 py-1.5 mx-1 text-xs whitespace-nowrap rounded-full transition-all shrink-0 ${
                isActive
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-muted-foreground hover:bg-secondary'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full overflow-hidden pt-12 md:pt-0 relative">
        {/* Top Header of the Content Column (Only shown when not full-bleed assistant) */}
        {activeTab !== 'assistant' && (
          <header className="h-16 border-b border-border bg-card/60 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <currentTabObj.icon className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-base font-bold text-foreground">
                  {currentTabObj.label}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {currentTabObj.description}
                </p>
              </div>
            </div>
          </header>
        )}

        {/* Scrollable / Full-Size Tab Body */}
        <div className={`flex-1 overflow-y-auto ${activeTab === 'assistant' ? 'p-0' : 'p-4 md:p-6'} scrollbar-thin`}>
          {activeTab === 'webhooks' ? (
            <div className="max-w-6xl mx-auto">
              <DeveloperWebhooks />
            </div>
          ) : activeTab === 'mcp' ? (
            <div className="max-w-6xl mx-auto">
              <DeveloperMcp />
            </div>
          ) : activeTab === 'assistant' ? (
            <div className="h-full w-full">
              <DeveloperAIAssistant />
            </div>
          ) : activeTab === 'explorer' ? (
            <div className="max-w-6xl mx-auto">
              <DeveloperApiExplorer />
            </div>
          ) : activeTab === 'docs' ? (
            <div className="max-w-6xl mx-auto">
              <DeveloperDocs />
            </div>
          ) : activeTab === 'logs' ? (
            <div className="max-w-6xl mx-auto">
              <DeveloperLogs />
            </div>
          ) : (
            <div className="max-w-6xl mx-auto">
              <ConnectSettings />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
