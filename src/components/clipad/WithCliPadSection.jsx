import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Video, LayoutGrid, CheckCircle2, Database, Network, MessageSquare, Sparkles, Layers, ShieldCheck } from 'lucide-react';
import { CliPadLogo } from '@/components/ui/CliPadLogo';

export default function WithCliPadSection() {
  return (
    <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto overflow-hidden relative">
      {/* Ambient background glows for corporate unity */}
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/2" />
      <div className="absolute top-1/2 right-0 w-96 h-96 bg-[#f97316]/5 rounded-full blur-[120px] pointer-events-none -translate-y-1/2" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        
        {/* Visual Side: Unified Enterprise Neural Hub */}
        <div className="relative h-[500px] w-full bg-card rounded-3xl border border-border shadow-2xl overflow-hidden flex items-center justify-center order-2 lg:order-1">
          
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(#1A2F38 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
          
          {/* Central Weftro Hub */}
          <motion.div 
            animate={{ boxShadow: ['0px 0px 20px rgba(12, 92, 60, 0.2)', '0px 0px 50px rgba(12, 92, 60, 0.5)', '0px 0px 20px rgba(12, 92, 60, 0.2)'] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute z-20 w-36 h-36 bg-card rounded-full border-2 border-primary/50 flex flex-col items-center justify-center shadow-2xl backdrop-blur-xl p-4"
          >
            <div className="absolute inset-0 rounded-full bg-primary/15 animate-ping opacity-30" style={{ animationDuration: '3.5s' }} />
            <CliPadLogo height={44} iconOnly={true} className="relative z-10 drop-shadow" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-foreground mt-2">Weftro</span>
          </motion.div>

          {/* Neural Connection SVG Tracks */}
          <svg className="absolute inset-0 w-full h-full z-0 opacity-40">
            <motion.path 
              d="M 120 130 C 160 130, 200 250, 250 250" 
              stroke="#0C5C3C" strokeWidth="2.5" fill="transparent" strokeDasharray="4,4"
              animate={{ strokeDashoffset: [0, -20] }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            />
            <motion.path 
              d="M 120 370 C 160 370, 200 250, 250 250" 
              stroke="#10B981" strokeWidth="2.5" fill="transparent" strokeDasharray="4,4"
              animate={{ strokeDashoffset: [0, -20] }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            />
            <motion.path 
              d="M 440 250 C 360 250, 310 250, 250 250" 
              stroke="#f97316" strokeWidth="2.5" fill="transparent" strokeDasharray="4,4"
              animate={{ strokeDashoffset: [0, 20] }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            />
            <motion.path 
              d="M 400 120 C 350 170, 300 220, 250 250" 
              stroke="#0C5C3C" strokeWidth="2.5" fill="transparent" strokeDasharray="4,4"
              animate={{ strokeDashoffset: [0, 20] }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            />
            <motion.path 
              d="M 400 380 C 350 330, 300 280, 250 250" 
              stroke="#10B981" strokeWidth="2.5" fill="transparent" strokeDasharray="4,4"
              animate={{ strokeDashoffset: [0, 20] }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            />
          </svg>

          {/* Connected Enterprise Satellites */}
          {/* Top Left: Live Calls */}
          <motion.div 
            animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-20 left-12 w-14 h-14 bg-card rounded-2xl border border-primary/30 flex items-center justify-center shadow-lg shadow-primary/10 z-10"
          >
            <Video className="w-5 h-5 text-primary" />
          </motion.div>

          {/* Bottom Left: Team Spaces */}
          <motion.div 
            animate={{ y: [0, 6, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            className="absolute bottom-20 left-12 w-14 h-14 bg-card rounded-2xl border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10 z-10"
          >
            <Layers className="w-5 h-5 text-emerald-400" />
          </motion.div>

          {/* Top Right: Messaging & Channels */}
          <motion.div 
            animate={{ y: [0, -5, 0] }} transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
            className="absolute top-16 right-20 w-14 h-14 bg-card rounded-2xl border border-primary/30 flex items-center justify-center shadow-lg shadow-primary/10 z-10"
          >
            <MessageSquare className="w-5 h-5 text-primary" />
          </motion.div>

          {/* Bottom Right: Decision Ledger */}
          <motion.div 
            animate={{ y: [0, 5, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
            className="absolute bottom-16 right-20 w-14 h-14 bg-card rounded-2xl border border-[#f97316]/30 flex items-center justify-center shadow-lg shadow-[#f97316]/10 z-10"
          >
            <Database className="w-5 h-5 text-[#f97316]" />
          </motion.div>

          {/* Right Floating Badge: Unified Knowledge Record */}
          <motion.div 
            animate={{ x: [0, 4, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute top-1/2 right-4 md:right-8 w-44 bg-card/95 backdrop-blur-md rounded-2xl border border-border p-3.5 shadow-xl z-10 -translate-y-1/2"
          >
             <div className="flex items-center gap-2 mb-2">
               <ShieldCheck className="w-4 h-4 text-primary" />
               <span className="text-xs font-bold text-foreground">Decision Ledger</span>
             </div>
             <div className="h-1.5 w-full bg-secondary rounded-full mb-1.5" />
             <div className="h-1.5 w-3/4 bg-primary/40 rounded-full" />
          </motion.div>

          {/* Floating Top Status Badge */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="absolute top-6 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-md px-4 py-2 rounded-full border border-primary/30 flex items-center gap-2.5 z-30 shadow-lg"
          >
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">Context Automatically Linked</span>
          </motion.div>

        </div>

        {/* Copy Side */}
        <div className="order-1 lg:order-2">
          <h2 className="text-4xl md:text-5xl font-black text-foreground tracking-tight mb-6 leading-tight">
            The harmony of <br className="hidden md:block"/>
            <span className="text-primary">total organizational memory.</span>
          </h2>
          <p className="text-muted-foreground text-lg md:text-xl leading-relaxed mb-8">
            When every meeting, video, and strategic decision feeds automatically into one connected neural intelligence layer, teams execute with absolute clarity.
          </p>
          
          <div className="space-y-6">
            {[
              { 
                icon: Network, 
                title: 'Natively Interconnected Hub', 
                desc: 'Live conferences, asynchronous recordings, chat threads, and structured boards live together inside persistent spaces.' 
              },
              { 
                icon: Brain, 
                title: 'Real-Time Context Synthesis', 
                desc: 'No manual note typing. AI automatically surfaces key decisions, owner-attributed action items, and open dependencies in seconds.' 
              },
              { 
                icon: Database, 
                title: 'Compounding Institutional Intelligence', 
                desc: 'Onboard new team members instantly and retrieve past strategic rationale through an always-accessible enterprise memory layer.' 
              }
            ].map((item, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-card border border-border flex items-center justify-center shrink-0 shadow-sm">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-foreground mb-1">{item.title}</h4>
                  <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
