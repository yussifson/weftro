import React from 'react';
import { Video, Brain, HeadphonesIcon, LayoutGrid, Search, TrendingUp, Sparkles, Network, Database, BookOpen, Clock } from 'lucide-react';

const features = [
  {
    title: "Organizational Memory",
    description: "The core of your enterprise. Every video, meeting, and decision is automatically captured, transcribed, and intelligently linked. Never lose context again, even as your team scales.",
    icon: Database,
    span: "md:col-span-2 md:row-span-2",
    accent: "from-primary to-primary/80",
    iconColor: "text-primary",
    visual: (
      <div className="absolute right-0 bottom-0 translate-x-[15%] translate-y-[20%] w-64 md:w-80 h-56 bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden group-hover:scale-105 group-hover:-translate-y-[10%] transition-transform duration-700">
        <div className="h-8 w-full bg-slate-50 border-b border-slate-200 flex items-center px-3 gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-primary"></div>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div className="w-full h-24 bg-primary/10 rounded-lg flex items-center justify-center relative overflow-hidden border border-primary/20">
             <div className="absolute inset-0 bg-primary/20 animate-pulse"></div>
             <Network className="w-8 h-8 text-primary relative z-10" />
          </div>
          <div className="h-2 w-3/4 bg-slate-200 rounded-full"></div>
          <div className="h-2 w-1/2 bg-slate-200 rounded-full"></div>
        </div>
      </div>
    )
  },
  {
    title: "AI Meeting Insights",
    description: "Automatic transcription, key decisions, and action items generated the second your meeting ends.",
    icon: Sparkles,
    span: "md:col-span-1 md:row-span-2",
    accent: "from-violet-600 to-fuchsia-600",
    iconColor: "text-violet-600",
    visual: (
      <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-12 group-hover:translate-y-4 transition-transform duration-700">
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-violet-600 animate-pulse"></div>
            <div className="h-2 w-20 bg-slate-200 rounded-full"></div>
          </div>
          <div className="h-2 w-full bg-slate-200 rounded-full"></div>
          <div className="h-2 w-4/5 bg-slate-200 rounded-full"></div>
        </div>
      </div>
    )
  },
  {
    title: "HD Async Video",
    description: "Record your screen and camera in pristine 1080p. Send updates instantly.",
    icon: Video,
    span: "md:col-span-1",
    accent: "from-blue-600 to-cyan-600",
    iconColor: "text-blue-600",
    visual: (
      <div className="absolute -right-6 -bottom-6 opacity-10 group-hover:opacity-20 group-hover:-rotate-12 transition-all duration-700">
        <Video className="w-40 h-40 text-blue-600" />
      </div>
    )
  },
  {
    title: "Live Escalation",
    description: "Instantly route users to real human agents within the same chat interface.",
    icon: HeadphonesIcon,
    span: "md:col-span-1",
    accent: "from-rose-600 to-orange-600",
    iconColor: "text-rose-600",
  },
  {
    title: "Smart Spaces",
    description: "Organize teams, projects, and topics securely.",
    icon: LayoutGrid,
    span: "md:col-span-1",
    accent: "from-indigo-600 to-blue-600",
    iconColor: "text-indigo-600",
  },
  {
    title: "Decision Ledger",
    description: "A chronological record of every key decision made across the organization.",
    icon: BookOpen,
    span: "md:col-span-1",
    accent: "from-amber-500 to-orange-500",
    iconColor: "text-amber-600",
  },
  {
    title: "Global Search",
    description: "Find exactly what was said in any video, instantly.",
    icon: Search,
    span: "md:col-span-2",
    accent: "from-primary to-cyan-600",
    iconColor: "text-primary",
    visual: (
      <div className="absolute inset-y-0 right-0 w-1/2 flex items-center p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-700 translate-x-8 group-hover:translate-x-0">
        <div className="w-full bg-white border border-slate-200 rounded-full flex items-center px-4 py-3 shadow-lg">
          <Search className="w-5 h-5 text-primary mr-3" />
          <div className="h-2 w-1/2 bg-slate-200 rounded-full"></div>
        </div>
      </div>
    )
  },
  {
    title: "Enterprise Analytics",
    description: "Track ROI, adoption, and organizational health.",
    icon: TrendingUp,
    span: "md:col-span-1",
    accent: "from-pink-600 to-rose-600",
    iconColor: "text-pink-600",
  },
  {
    title: "Async Standups",
    description: "Keep remote teams aligned without disruptive meetings.",
    icon: Clock,
    span: "md:col-span-1",
    accent: "from-teal-600 to-primary",
    iconColor: "text-teal-600",
  }
];

export default function AdvancedFeaturesBento() {
  return (
    <div className="w-full bg-slate-50 py-32 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-primary/20 shadow-sm mb-6">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
            <span className="text-sm font-bold text-primary uppercase tracking-widest">Total Operational Intelligence</span>
          </div>
          <h3 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight mb-6 leading-tight">
            The ultimate toolkit for <br className="hidden md:block"/>
            <span className="text-primary">modern teams.</span>
          </h3>
          <p className="text-slate-500 text-lg md:text-xl leading-relaxed">
            Everything you need to communicate, organize, and compound knowledge. Built seamlessly into one powerful layer.
          </p>
        </div>

        {/* Using CSS Grid without fixed rows to allow content to dictate height, preventing overflow */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-min">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            // For large/tall cards, add a min height so visuals have room. For small cards, let content pad it.
            const minHeightClass = feature.span.includes('row-span-2') ? 'min-h-[400px]' : 'min-h-[220px]';
            
            return (
              <div
                key={i}
                className={`relative group bg-white rounded-3xl border border-slate-200 overflow-hidden hover:border-slate-300 transition-all duration-500 shadow-sm hover:shadow-xl ${feature.span} ${minHeightClass} flex flex-col`}
              >
                {/* Colored top gradient bar */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${feature.accent} opacity-80 group-hover:opacity-100 transition-opacity duration-500`} />
                
                {/* Glow effect on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.accent} opacity-0 group-hover:opacity-[0.05] transition-opacity duration-700`} />
                
                {feature.visual && (
                   <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                     {feature.visual}
                   </div>
                )}

                <div className="relative z-10 p-6 md:p-8 flex flex-col h-full pointer-events-none">
                  <div className={`w-14 h-14 shrink-0 rounded-2xl bg-white border border-slate-100 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-500 mb-6 relative overflow-hidden`}>
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.accent} opacity-10`} />
                    <Icon className={`w-6 h-6 ${feature.iconColor} relative z-10`} />
                  </div>
                  
                  <div className="flex-1 relative z-10">
                    <h4 className="text-xl md:text-2xl font-bold text-slate-900 mb-3">{feature.title}</h4>
                    <p className="text-slate-500 text-sm md:text-base leading-relaxed md:max-w-[85%] relative z-10">
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
