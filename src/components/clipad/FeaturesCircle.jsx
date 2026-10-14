import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Video, Camera, Brain, Target, Zap, ChevronRight } from 'lucide-react';

const pillars = [
  {
    icon: Video,
    tag: 'Live Communication',
    accent: '#0C5C3C',
    color: 'from-emerald-500 to-teal-400',
    title: 'HD Live Meetings',
    desc: 'Enterprise video conferences with no arbitrary caps. Up to 500 participants, AI noise suppression, speaker spotlight, live multi-language transcripts, and persistent team whiteboards.'
  },
  {
    icon: Camera,
    tag: 'Async Collaboration',
    accent: '#10B981',
    color: 'from-teal-500 to-emerald-400',
    title: 'Async Video Messages',
    desc: 'Record camera, screen, or Picture-in-Picture in pristine 1080p. Instantly shareable with zero upload wait time, timecoded chapter markers, viewer reaction threads, and drop-off analytics.'
  },
  {
    icon: Brain,
    tag: 'Context Engine',
    accent: '#D9A400',
    color: 'from-amber-400 to-[#D9A400]',
    title: 'AI Intelligence & Extraction',
    desc: 'Every conversation produces executive summaries, decision records, structured action items assigned to real owners, sentiment trends, and unanswered follow-up items.'
  },
  {
    icon: Layers,
    tag: 'Workspaces',
    accent: '#0C5C3C',
    color: 'from-emerald-600 to-teal-500',
    title: 'Persistent Team Spaces',
    desc: 'Dedicated hubs for squads, projects, and clients. Houses live meeting rooms, async video libraries, shared documentation, dynamic action boards, and cross-space semantic search.'
  },
  {
    icon: Target,
    tag: 'Client Intelligence',
    accent: '#F59E0B',
    color: 'from-amber-500 to-amber-300',
    title: 'Sales & Executive Briefings',
    desc: 'Deliver high-impact asynchronous proposals and client walkthroughs. Track exact audience engagement, second-by-second viewer retention heatmaps, and forwarded link access.'
  },
  {
    icon: Zap,
    tag: 'Execution Loop',
    accent: '#10B981',
    color: 'from-emerald-400 to-teal-300',
    title: 'Smart Automated Follow-ups',
    desc: 'Eliminate manual note distribution. Each attendee automatically receives tailored action items with exact conversational context and deadlines directly in their inbox.'
  },
];

export default function FeaturesCircle() {
  const [rotation, setRotation] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setRotation(prev => prev - 60);
      setActiveIndex(prev => (prev + 1) % 6);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const active = pillars[activeIndex];
  const ActiveIcon = active.icon;

  return (
    <div className="relative w-full max-w-6xl mx-auto py-8 md:py-16 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16">
      
      {/* Interactive Orbit System */}
      <div className="relative w-[320px] h-[320px] sm:w-[420px] sm:h-[420px] shrink-0 flex items-center justify-center">
        {/* Subtle background ambient mesh glow */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/10 via-emerald-500/5 to-transparent blur-2xl pointer-events-none" />

        {/* Outer orbital track */}
        <div className="absolute inset-0 rounded-full border border-border/80 shadow-[inset_0_0_40px_rgba(12,92,60,0.08)] bg-card/40 backdrop-blur-sm" />
        
        {/* Mid dashed orbit */}
        <div className="absolute inset-10 rounded-full border border-dashed border-primary/25" />
        
        {/* Inner Hub Core */}
        <div className="absolute inset-24 rounded-full bg-gradient-to-br from-card via-[#101D22] to-background border border-primary/30 shadow-[0_0_50px_rgba(12,92,60,0.25)] flex flex-col items-center justify-center p-6 text-center backdrop-blur-xl">
          <motion.div 
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/25 to-primary/5 flex items-center justify-center relative shadow-[0_0_30px_rgba(12,92,60,0.3)] border border-primary/40 mb-2"
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="absolute inset-0 rounded-2xl bg-primary/20 animate-ping opacity-25" style={{ animationDuration: '4s' }} />
            <Layers className="w-8 h-8 text-primary relative z-10 drop-shadow" />
          </motion.div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Unified Hub</span>
          <span className="text-xs font-semibold text-foreground/90">6 Core Systems</span>
        </div>

        {/* Orbiting Pillar Nodes */}
        <motion.div 
          className="absolute inset-0 origin-center"
          animate={{ rotate: rotation }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          {pillars.map((p, i) => {
            const angle = (i * 60) * (Math.PI / 180);
            const left = `calc(50% + ${Math.sin(angle) * 50}% - 26px)`;
            const top = `calc(50% - ${Math.cos(angle) * 50}% - 26px)`;
            
            const isActive = i === activeIndex;
            const Icon = p.icon;
            
            return (
              <motion.div
                key={i}
                className="absolute w-13 h-13"
                style={{ left, top }}
                animate={{ rotate: -rotation }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              >
                <button
                  type="button"
                  onClick={() => {
                    const diff = i - activeIndex;
                    setRotation(r => r - (diff * 60));
                    setActiveIndex(i);
                  }}
                  aria-label={p.title}
                  className={`w-13 h-13 p-3 rounded-2xl flex items-center justify-center transition-all duration-300 border ${
                    isActive 
                      ? 'bg-primary text-white border-primary shadow-[0_0_25px_rgba(12,92,60,0.6)] scale-115 ring-2 ring-[#D9A400]/40 z-20' 
                      : 'bg-card/90 text-muted-foreground border-border hover:border-primary/50 hover:text-foreground hover:scale-105 z-10 backdrop-blur-md'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </button>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Feature Details Panel */}
      <div className="flex-1 w-full max-w-lg min-h-[300px] flex flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="relative p-8 md:p-10 rounded-3xl bg-card border border-border shadow-2xl overflow-hidden"
          >
            {/* Subtle top indicator bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-[#D9A400] to-primary/40" />
            
            {/* Ambient corner glow */}
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center shadow-inner">
                    <ActiveIcon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#D9A400] block">
                      {active.tag}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">Pillar 0{activeIndex + 1} of 06</span>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {pillars.map((_, dotIdx) => (
                    <button
                      key={dotIdx}
                      onClick={() => {
                        const diff = dotIdx - activeIndex;
                        setRotation(r => r - (diff * 60));
                        setActiveIndex(dotIdx);
                      }}
                      className={`h-1.5 rounded-full transition-all ${dotIdx === activeIndex ? 'w-6 bg-primary' : 'w-2 bg-border hover:bg-muted-foreground'}`}
                      aria-label={`Go to slide ${dotIdx + 1}`}
                    />
                  ))}
                </div>
              </div>

              <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground mb-4">
                {active.title}
              </h3>
              
              <p className="text-muted-foreground leading-relaxed text-base font-normal mb-6">
                {active.desc}
              </p>

              <div className="pt-5 border-t border-border flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  Live Sync Across Workspace
                </span>
                <span className="font-semibold text-primary flex items-center gap-1">
                  Enterprise Ready <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
}

