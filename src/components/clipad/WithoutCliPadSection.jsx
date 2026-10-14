import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Database, Clock, Layers, ShieldAlert, ArrowDownRight, Unlink } from 'lucide-react';

export default function WithoutCliPadSection() {
  return (
    <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Copy Side */}
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/25 mb-6">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-xs font-bold text-rose-500 uppercase tracking-widest">The Legacy Stack</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-foreground tracking-tight mb-6 leading-tight">
            The chaos of <br className="hidden md:block"/>
            <span className="text-rose-500">disconnected tools.</span>
          </h2>
          <p className="text-muted-foreground text-lg md:text-xl leading-relaxed mb-8">
            When organizational knowledge is fragmented across chats, lost meeting recordings, and buried document folders, operational intelligence decays and teams duplicate effort.
          </p>
          
          <div className="space-y-6">
            {[
              { 
                icon: Layers, 
                title: 'Context Fragmentation', 
                desc: 'Employees switch between 6+ disparate apps daily, scattering decision history across isolated silos.' 
              },
              { 
                icon: Database, 
                title: 'Institutional Knowledge Drain', 
                desc: 'When team members depart, crucial project context, unrecorded decisions, and rationale vanish forever.' 
              },
              { 
                icon: Clock, 
                title: 'Compounding Search Latency', 
                desc: 'Senior leaders and engineers waste up to 4.2 hours every week searching for meeting transcripts and links.' 
              }
            ].map((item, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-card border border-border flex items-center justify-center shrink-0 shadow-sm">
                  <item.icon className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-foreground mb-1">{item.title}</h4>
                  <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Visual Side: Executive Telemetry of Tool Fragmentation */}
        <div className="relative p-6 sm:p-8 bg-card rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col justify-between">
          {/* Subtle warning glow */}
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Telemetry Header */}
          <div className="flex items-center justify-between pb-6 border-b border-border/80 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Operational Knowledge Audit</h4>
                <p className="text-xs text-muted-foreground font-mono">Status: High Fragmentation Risk</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
              Unlinked Systems
            </span>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-2 gap-4 my-6 relative z-10">
            <div className="p-4 rounded-2xl bg-background/60 border border-border">
              <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
                <span>Context Loss Rate</span>
                <ArrowDownRight className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-rose-500 tracking-tight">68.4%</div>
              <p className="text-[11px] text-muted-foreground mt-1">Decisions lost within 14 days</p>
            </div>

            <div className="p-4 rounded-2xl bg-background/60 border border-border">
              <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
                <span>Wasted Search Time</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">4.2 hrs</div>
              <p className="text-[11px] text-muted-foreground mt-1">Per team member / week</p>
            </div>
          </div>

          {/* Disconnected Silos Pipeline Simulation */}
          <div className="space-y-3 relative z-10">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Isolated Storage Silos
            </div>

            {[
              { name: 'Ad-hoc Video Meetings', status: 'Unindexed recordings (Drive)', error: 'No searchable transcripts' },
              { name: 'Transient Chat Channels', status: 'Buried in thread history', error: 'Action items lost' },
              { name: 'Decoupled Document Links', status: 'Permission mismatch', error: 'Broken link access' },
            ].map((silo, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.15 }}
                className="p-3.5 rounded-2xl bg-background/50 border border-border/80 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Unlink className="w-4 h-4 text-rose-400 shrink-0" />
                  <div className="truncate">
                    <p className="font-semibold text-foreground truncate">{silo.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{silo.status}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-medium text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg shrink-0 border border-rose-500/20">
                  <AlertTriangle className="w-3 h-3" />
                  <span>{silo.error}</span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Bottom Diagnostic Bar */}
          <div className="mt-6 pt-4 border-t border-border/80 flex items-center justify-between text-[11px] text-muted-foreground relative z-10 font-mono">
            <span>AUDIT: 4 APPS SCATTERED</span>
            <span className="text-rose-400 font-bold">REPLACE WITH UNIFIED HUB</span>
          </div>
        </div>
      </div>
    </section>
  );
}

