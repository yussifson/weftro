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
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { SidebarCollapseIcon } from '@/components/ui/SidebarCollapseIcon';
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
    label: 'Copilot',
    description: 'AI assistant & technical advisor'
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
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="flex h-[calc(100vh-64px)] max-h-[calc(100vh-64px)] bg-slate-50 dark:bg-background overflow-hidden text-slate-900 dark:text-slate-100">
      {/* SIDEBAR NAVIGATION: Professional, spacious developer side panel */}
      <aside className={`bg-white dark:bg-card border-r border-slate-200 dark:border-border flex-col hidden md:flex shrink-0 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-18'}`}>
        {/* Sidebar Header: Back button and expand/collapse button, top name area left empty */}
        <div className="h-14 flex items-center px-4 border-b border-slate-200 dark:border-border gap-2 shrink-0 justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            {sidebarOpen && <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Developer Platform</span>}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-muted-foreground dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-accent rounded-md transition-all shrink-0 flex items-center justify-center group"
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <SidebarCollapseIcon 
              className="w-5 h-5 group-hover:scale-105" 
              collapsed={!sidebarOpen}
            />
          </button>
        </div>

        {/* Sidebar Nav Links */}
        <div className="flex-1 overflow-y-auto py-3.5 px-2.5 space-y-1.5 scrollbar-hide">
          {sidebarOpen && (
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5 px-2.5 transition-opacity">
              Platform & Tools
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
                className={`flex items-center py-2.5 rounded-lg transition-all ${
                  sidebarOpen ? 'w-full gap-3 px-3 text-xs' : 'justify-center w-11 h-11 mx-auto'
                } ${
                  isActive
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-foreground font-semibold shadow-2xs'
                    : 'text-slate-600 dark:text-muted-foreground hover:bg-slate-50 dark:hover:bg-accent/50 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon
                  className={`shrink-0 ${sidebarOpen ? 'w-4.5 h-4.5' : 'w-5 h-5'} ${
                    isActive ? 'text-primary' : 'text-slate-400'
                  }`}
                />
                {sidebarOpen && <span className="truncate text-xs font-medium">{tab.label}</span>}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        {sidebarOpen && (
          <div className="p-4 border-t border-slate-200 dark:border-border shrink-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-[11px]">Gateway Operational</span>
            </div>
          </div>
        )}
      </aside>

      {/* MOBILE HORIZONTAL NAVIGATION (Visible on small screens) */}
      <div className="md:hidden fixed top-14 left-0 right-0 bg-white dark:bg-card border-b border-slate-200 dark:border-border z-30 flex overflow-x-auto px-2 py-2 hide-scrollbar">
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

      {/* MAIN CONTENT AREA - Takes entire space without redundant top header */}
      <div className="flex-1 flex flex-col h-full overflow-hidden pt-12 md:pt-0 relative">
        {/* Scrollable / Full-Size Tab Body */}
        <div className={`flex-1 ${activeTab === 'assistant' ? 'p-0 h-full overflow-hidden' : 'px-2 sm:px-4 py-4 overflow-y-auto scrollbar-thin'}`}>
          {activeTab === 'webhooks' ? (
            <div className="w-full">
              <DeveloperWebhooks />
            </div>
          ) : activeTab === 'mcp' ? (
            <div className="w-full">
              <DeveloperMcp />
            </div>
          ) : activeTab === 'assistant' ? (
            <div className="h-full w-full">
              <DeveloperAIAssistant />
            </div>
          ) : activeTab === 'explorer' ? (
            <div className="w-full">
              <DeveloperApiExplorer />
            </div>
          ) : activeTab === 'docs' ? (
            <div className="w-full">
              <DeveloperDocs />
            </div>
          ) : activeTab === 'logs' ? (
            <div className="w-full">
              <DeveloperLogs />
            </div>
          ) : (
            <div className="w-full">
              <ConnectSettings />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
