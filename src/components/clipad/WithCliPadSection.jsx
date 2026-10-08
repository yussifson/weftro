import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Video, LayoutGrid, CheckCircle, Database, Network, MessageSquare, FileText } from 'lucide-react';
import { CliPadLogo } from '@/components/ui/CliPadLogo';

export default function WithCliPadSection() {
  return (
    <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto overflow-hidden relative">
      {/* Background Glows for Harmony */}
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none -translate-y-1/2" />
      <div className="absolute top-1/2 right-0 w-96 h-96 bg-violet-500/10 rounded-full blur-[100px] pointer-events-none -translate-y-1/2" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        
        {/* Visual Side: The Harmony */}
        <div className="relative h-[500px] w-full bg-white dark:bg-card rounded-3xl border border-slate-200 dark:border-border shadow-2xl overflow-hidden flex items-center justify-center order-2 lg:order-1">
          
          {/* Grid background */}
          <div className="absolute inset-0 opacity-[0.08] dark:opacity-20" style={{ backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
          
          {/* Central Hub */}
          <motion.div 
            animate={{ boxShadow: ['0px 0px 20px rgba(0, 168, 89, 0.2)', '0px 0px 60px rgba(0, 168, 89, 0.5)', '0px 0px 20px rgba(0, 168, 89, 0.2)'] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute z-20 w-32 h-32 bg-white dark:bg-slate-800 rounded-full border border-primary/30 flex items-center justify-center shadow-lg"
          >
            <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" style={{ animationDuration: '3s' }}></div>
            <CliPadLogo size={56} className="text-primary relative z-10" />
          </motion.div>

          {/* Connection Lines */}
          <svg className="absolute inset-0 w-full h-full z-0 opacity-60 dark:opacity-30">
            {/* 1. Top Left - Video */}
            <motion.path 
              d="M 100 150 C 150 150, 200 250, 250 250" 
              stroke="url(#grad1)" strokeWidth="3" fill="transparent" strokeDasharray="5,5"
              animate={{ strokeDashoffset: [0, -20] }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            {/* 2. Bottom Left - LayoutGrid */}
            <motion.path 
              d="M 100 350 C 150 350, 200 250, 250 250" 
              stroke="url(#grad2)" strokeWidth="3" fill="transparent" strokeDasharray="5,5"
              animate={{ strokeDashoffset: [0, -20] }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            {/* 3. Right - Decision Ledger */}
            <motion.path 
              d="M 450 250 C 350 250, 300 250, 250 250" 
              stroke="url(#grad3)" strokeWidth="3" fill="transparent" strokeDasharray="5,5"
              animate={{ strokeDashoffset: [0, 20] }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            {/* 4. Top Right - Chat */}
            <motion.path 
              d="M 400 100 C 350 150, 300 200, 250 250" 
              stroke="url(#grad4)" strokeWidth="3" fill="transparent" strokeDasharray="5,5"
              animate={{ strokeDashoffset: [0, 20] }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            {/* 5. Bottom Right - Notes */}
            <motion.path 
              d="M 400 400 C 350 350, 300 300, 250 250" 
              stroke="url(#grad5)" strokeWidth="3" fill="transparent" strokeDasharray="5,5"
              animate={{ strokeDashoffset: [0, 20] }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            
            <defs>
              <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#00A859" />
              </linearGradient>
              <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#00A859" />
              </linearGradient>
              <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#00A859" />
              </linearGradient>
              <linearGradient id="grad4" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#00A859" />
              </linearGradient>
              <linearGradient id="grad5" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#00A859" />
              </linearGradient>
            </defs>
          </svg>

          {/* Connected Nodes */}
          {/* 1. Video Node */}
          <motion.div 
            animate={{ y: [0, -5, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-24 left-16 w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl border border-violet-500/30 flex items-center justify-center shadow-lg shadow-violet-500/10 z-10"
          >
            <Video className="w-6 h-6 text-violet-500" />
          </motion.div>

          {/* 2. LayoutGrid Node */}
          <motion.div 
            animate={{ y: [0, 5, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            className="absolute bottom-24 left-16 w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl border border-blue-500/30 flex items-center justify-center shadow-lg shadow-blue-500/10 z-10"
          >
            <LayoutGrid className="w-6 h-6 text-blue-500" />
          </motion.div>

          {/* 4. Chat Node */}
          <motion.div 
            animate={{ y: [0, -4, 0] }} transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
            className="absolute top-16 right-32 w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl border border-pink-500/30 flex items-center justify-center shadow-lg shadow-pink-500/10 z-10"
          >
            <MessageSquare className="w-6 h-6 text-pink-500" />
          </motion.div>

          {/* 5. Notes Node */}
          <motion.div 
            animate={{ y: [0, 4, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
            className="absolute bottom-16 right-32 w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl border border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-500/10 z-10"
          >
            <FileText className="w-6 h-6 text-cyan-500" />
          </motion.div>

          {/* 3. Decision Ledger */}
          <motion.div 
            animate={{ y: [0, -5, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute top-1/2 right-4 md:-right-8 w-48 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-xl border border-amber-500/30 p-3 shadow-xl shadow-amber-500/10 z-10 -translate-y-1/2"
          >
             <div className="flex items-center gap-2 mb-2">
               <Database className="w-4 h-4 text-amber-500" />
               <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Decision Ledger</span>
             </div>
             <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full mb-1"></div>
             <div className="h-1.5 w-3/4 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
          </motion.div>

          {/* Floating Success Notifications */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="absolute top-8 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-4 py-2 rounded-xl border border-primary/30 flex items-center gap-3 z-30 shadow-lg"
          >
            <CheckCircle className="w-5 h-5 text-primary" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Meeting Summarized</span>
          </motion.div>

        </div>

        {/* Copy Side */}
        <div className="order-1 lg:order-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-bold text-primary uppercase tracking-widest">The CliPad Way</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-foreground tracking-tight mb-6 leading-tight">
            The harmony of <br className="hidden md:block"/>
            <span className="text-primary">total organizational memory.</span>
          </h2>
          <p className="text-slate-500 dark:text-muted-foreground text-lg md:text-xl leading-relaxed mb-8">
            When every meeting, video, and decision feeds automatically into one intelligent hub, your team moves faster than ever before.
          </p>
          
          <div className="space-y-6">
            {[
              { icon: Network, title: 'Everything in One Place', desc: 'Spaces, chat, and HD meetings natively unified in a single, beautiful workspace.' },
              { icon: Brain, title: 'Instant AI Summaries', desc: 'No more waiting for someone to type up notes. AI delivers action items seconds after the call ends.' },
              { icon: Database, title: 'Compounding Knowledge', desc: 'New hires get up to speed instantly by searching the collective memory of the entire organization.' }
            ].map((item, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-foreground">{item.title}</h4>
                  <p className="text-slate-500 dark:text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
