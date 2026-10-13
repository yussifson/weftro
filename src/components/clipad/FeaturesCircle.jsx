import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Video, Camera, Brain, Target, Zap } from 'lucide-react';

const pillars = [
  {
    icon: Video,
    color: 'from-orange-500 to-orange-400',
    glow: 'shadow-orange-500/20',
    bg: 'bg-orange-50 dark:bg-orange-900/10',
    title: 'HD Live Meetings',
    desc: 'No time limits. Up to 500 participants. Speaker spotlight, noise cancellation, live captions, breakout rooms and a persistent whiteboard.'
  },
  {
    icon: Camera,
    color: 'from-green-500 to-emerald-500',
    glow: 'shadow-green-500/20',
    bg: 'bg-[#006065] dark:bg-[#053639]/10 dark:bg-emerald-900/10',
    title: 'Async Video Messages',
    desc: 'Record camera, screen, or both in picture-in-picture. Share an instant link. Viewers leave timestamped comments and emoji reactions.'
  },
  {
    icon: Brain,
    color: 'from-yellow-500 to-amber-500',
    glow: 'shadow-yellow-500/20',
    bg: 'bg-amber-50 dark:bg-amber-900/10',
    title: 'AI Intelligence',
    desc: 'Every meeting produces a full summary, key decisions, extracted action items with owners, open questions, and sentiment — instantly.'
  },
  {
    icon: Layers,
    color: 'from-blue-500 to-indigo-500',
    glow: 'shadow-blue-500/20',
    bg: 'bg-blue-50 dark:bg-blue-900/10',
    title: 'Team Spaces',
    desc: 'Persistent rooms for every team and project. Live meetings, async videos, shared notes, action boards, and cross-space search.'
  },
  {
    icon: Target,
    color: 'from-purple-500 to-fuchsia-500',
    glow: 'shadow-purple-500/20',
    bg: 'bg-purple-50 dark:bg-purple-900/10',
    title: 'Sales & Demo Layer',
    desc: 'Record personalised video proposals. Know who watched, how much, where they paused, and whether they shared it.'
  },
  {
    icon: Zap,
    color: 'from-rose-500 to-red-500',
    glow: 'shadow-rose-500/20',
    bg: 'bg-rose-50 dark:bg-rose-900/10',
    title: 'Smart Follow-up',
    desc: 'After every meeting, each participant receives only their personal action items with full context. Not the whole notes.'
  },
];

export default function FeaturesCircle() {
  const [rotation, setRotation] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setRotation(prev => prev - 60); // 360 / 6
      setActiveIndex(prev => (prev + 1) % 6);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full max-w-5xl mx-auto py-10 md:py-20 flex flex-col md:flex-row items-center justify-center gap-12 lg:gap-24 overflow-hidden">
      
      {/* Circle Container */}
      <div className="relative w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] shrink-0">
        <div className="absolute inset-0 rounded-full border-2 border-primary/20 dark:border-primary/30 shadow-[inset_0_0_60px_rgba(var(--primary),0.1)] bg-gradient-to-b from-primary/10 to-transparent dark:from-primary/20" />
        <div className="absolute inset-8 rounded-full border border-dashed border-primary/40 dark:border-primary/50" />
        <div className="absolute inset-16 rounded-full bg-gradient-to-tr from-emerald-500/10 to-primary/5 dark:from-emerald-900/40 dark:to-primary/20 shadow-[0_10px_40px_-10px_rgba(var(--primary),0.3)] flex items-center justify-center border border-primary/30 backdrop-blur-md">
          <motion.div 
            className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center relative shadow-[0_0_40px_rgba(var(--primary),0.3)] border border-primary/20 backdrop-blur-xl"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-30" style={{ animationDuration: '3s' }} />
            <Layers className="w-10 h-10 text-primary relative z-10 drop-shadow-md" />
          </motion.div>
        </div>

        <motion.div 
          className="absolute inset-0 origin-center"
          animate={{ rotate: rotation }}
          transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {pillars.map((p, i) => {
            const angle = (i * 60) * (Math.PI / 180);
            const radius = 150; // px
            // For sm screens it's 200, so we use a responsive radius approach in css or calc, but we can just fix it approximately for desktop, it will scale down on mobile because of wrapper.
            // Let's use percentage based positioning for true responsiveness.
            const left = `calc(50% + ${Math.sin(angle) * 50}% - 28px)`;
            const top = `calc(50% - ${Math.cos(angle) * 50}% - 28px)`;
            
            const isActive = i === activeIndex;
            const Icon = p.icon;
            
            return (
              <motion.div
                key={i}
                className="absolute w-14 h-14"
                style={{ left, top }}
                animate={{ rotate: -rotation }} // Counter rotate so icons stay upright
                transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <button
                  onClick={() => {
                    const diff = i - activeIndex;
                    setRotation(r => r - (diff * 60));
                    setActiveIndex(i);
                  }}
                  className={`w-full h-full rounded-2xl flex items-center justify-center transition-all duration-500 shadow-xl border border-white/20 backdrop-blur-sm ${isActive ? `bg-gradient-to-br ${p.color} ${p.glow} scale-125 z-20` : 'bg-white/90 dark:bg-secondary/90 border-slate-200 dark:border-border/50 opacity-70 hover:opacity-100 hover:scale-110 z-10'}`}
                >
                  <Icon className={`w-6 h-6 drop-shadow-sm ${isActive ? 'text-white' : 'text-slate-600 dark:text-foreground'}`} />
                </button>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Feature Details */}
      <div className="flex-1 w-full max-w-md min-h-[220px] relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className={`relative p-6 md:p-8 rounded-2xl md:rounded-3xl ${pillars[activeIndex].bg} border border-white/60 dark:border-border/50 shadow-2xl shadow-slate-200/50 dark:shadow-none backdrop-blur-xl`}
          >
            <div className={`absolute -inset-1 opacity-20 blur-xl z-0 bg-gradient-to-br ${pillars[activeIndex].color} rounded-2xl md:rounded-3xl pointer-events-none transition-colors duration-500`} />
            
            <div className="relative z-10">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${pillars[activeIndex].color} ${pillars[activeIndex].glow} flex items-center justify-center mb-6 shadow-lg shadow-black/10 border border-white/20`}>
                {React.createElement(pillars[activeIndex].icon, { className: "w-7 h-7 text-white drop-shadow-md" })}
              </div>
              <h3 className="text-3xl font-black tracking-tight text-slate-900 dark:text-foreground mb-4 drop-shadow-sm">{pillars[activeIndex].title}</h3>
              <p className="text-slate-600 dark:text-foreground leading-relaxed text-lg font-medium">{pillars[activeIndex].desc}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

