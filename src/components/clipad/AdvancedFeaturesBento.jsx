import React from 'react';
import { Video, Brain, HeadphonesIcon, LayoutGrid, Search, TrendingUp, Sparkles, Network, Database, BookOpen, Clock } from 'lucide-react';

const features = [
  {
    title: "Organizational Memory & Knowledge Graph",
    description: "The core intelligence repository. Every meeting, recording, and strategic decision is automatically indexed, contextualized, and cross-linked across team members and milestones.",
    icon: Database,
    span: "md:col-span-2 md:row-span-2",
    accent: "from-primary to-primary/80",
    iconColor: "text-primary",
    visual: (
      <div className="absolute right-0 bottom-0 translate-x-[15%] translate-y-[20%] w-64 md:w-80 h-56 bg-white dark:bg-card rounded-xl border border-slate-200 dark:border-border shadow-2xl overflow-hidden group-hover:scale-105 group-hover:-translate-y-[10%] transition-transform duration-700">
        <div className="h-8 w-full bg-slate-50 dark:bg-background border-b border-slate-200 dark:border-border flex items-center px-3 gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-primary"></div>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div className="w-full h-24 bg-primary/10 rounded-lg flex items-center justify-center relative overflow-hidden border border-primary/20">
             <div className="absolute inset-0 bg-primary/20 animate-pulse"></div>
             <Network className="w-8 h-8 text-primary relative z-10" />
          </div>
          <div className="h-2 w-3/4 bg-slate-200 dark:bg-accent rounded-full"></div>
          <div className="h-2 w-1/2 bg-slate-200 dark:bg-accent rounded-full"></div>
        </div>
      </div>
    )
  },
  {
    title: "Connected Integrations & MCP",
    description: "Plug into Slack, Notion, GitHub, Google Drive, Jira, and custom Model Context Protocol (MCP) agents to query enterprise tools directly.",
    icon: Network,
    span: "md:col-span-1 md:row-span-2",
    accent: "from-emerald-600 to-teal-500",
    iconColor: "text-emerald-500",
    visual: (
      <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-12 group-hover:translate-y-4 transition-transform duration-700">
        <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-xl p-4 space-y-3 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <div className="h-2 w-20 bg-slate-200 dark:bg-accent rounded-full"></div>
          </div>
          <div className="h-2 w-full bg-slate-200 dark:bg-accent rounded-full"></div>
          <div className="h-2 w-4/5 bg-slate-200 dark:bg-accent rounded-full"></div>
        </div>
      </div>
    )
  },
  {
    title: "AI Synthesis & Actions",
    description: "Extract verified action items, owner tags, and automated execution workflows instantly.",
    icon: Sparkles,
    span: "md:col-span-1",
    accent: "from-amber-500 to-[#D9A400]",
    iconColor: "text-[#D9A400]",
  },
  {
    title: "Persistent Team Spaces",
    description: "Centralized hubs for projects, teams, live spaces, and knowledge boards.",
    icon: LayoutGrid,
    span: "md:col-span-1",
    accent: "from-indigo-600 to-blue-600",
    iconColor: "text-indigo-600",
  },
  {
    title: "Decision Ledger",
    description: "An immutable audit trail of every strategic decision and architectural rationale.",
    icon: BookOpen,
    span: "md:col-span-1",
    accent: "from-amber-500 to-orange-500",
    iconColor: "text-amber-600",
  },
  {
    title: "Cross-System Semantic Search",
    description: "Search across transcripts, shared documents, discussions, and external integrations in milliseconds.",
    icon: Search,
    span: "md:col-span-2",
    accent: "from-primary to-cyan-600",
    iconColor: "text-primary",
    visual: (
      <div className="absolute inset-y-0 right-0 w-1/2 flex items-center p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-700 translate-x-8 group-hover:translate-x-0">
        <div className="w-full bg-white dark:bg-card border border-slate-200 dark:border-border rounded-full flex items-center px-4 py-3 shadow-lg">
          <Search className="w-5 h-5 text-primary mr-3" />
          <div className="h-2 w-1/2 bg-slate-200 dark:bg-accent rounded-full"></div>
        </div>
      </div>
    )
  },
  {
    title: "Enterprise Governance",
    description: "Granular access controls, SIEM audit streams, and encryption.",
    icon: TrendingUp,
    span: "md:col-span-1",
    accent: "from-pink-600 to-rose-600",
    iconColor: "text-pink-600",
  },
  {
    title: "Async Capture & Briefs",
    description: "High-definition screen & camera recordings with viewer drop-off analytics.",
    icon: Video,
    span: "md:col-span-1",
    accent: "from-teal-600 to-primary",
    iconColor: "text-teal-600",
  }
];

export default function AdvancedFeaturesBento() {
  return (
    <div className="w-full bg-background py-24 md:py-32 relative overflow-hidden border-t border-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        
        {/* Section Header: Tagline removed as instructed */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
          <h3 className="text-4xl md:text-5xl lg:text-6xl font-black text-foreground tracking-tight mb-6 leading-tight">
            The enterprise toolkit for <br className="hidden md:block"/>
            <span className="text-primary">high-velocity teams.</span>
          </h3>
          <p className="text-muted-foreground text-lg md:text-xl leading-relaxed">
            Everything your organization needs to communicate, capture context, and compound institutional intelligence — engineered into one seamless layer.
          </p>
        </div>

        {/* Bento Grid with corporate styling */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 auto-rows-min">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            const minHeightClass = feature.span.includes('row-span-2') ? 'min-h-[380px]' : 'min-h-[220px]';
            
            return (
              <div
                key={i}
                className={`relative group bg-card rounded-3xl border border-border overflow-hidden hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-primary/5 ${feature.span} ${minHeightClass} flex flex-col justify-between`}
              >
                {/* Subtle top indicator bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-emerald-400 to-[#D9A400] opacity-70 group-hover:opacity-100 transition-opacity" />
                
                {/* Ambient glow effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                
                {feature.visual && (
                   <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-90">
                     {feature.visual}
                   </div>
                )}

                <div className="relative z-10 p-6 md:p-8 flex flex-col h-full pointer-events-none">
                  <div className="w-12 h-12 shrink-0 rounded-2xl bg-secondary/80 border border-border flex items-center justify-center shadow-sm group-hover:border-primary/40 group-hover:scale-105 transition-all duration-300 mb-6">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  
                  <div className="flex-1 relative z-10">
                    <h4 className="text-xl md:text-2xl font-bold text-foreground mb-2.5 tracking-tight">{feature.title}</h4>
                    <p className="text-muted-foreground text-sm md:text-base leading-relaxed md:max-w-[90%]">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
