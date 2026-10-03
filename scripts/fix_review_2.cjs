const fs = require('fs');
let c = fs.readFileSync('src/pages/clipad/RecordVideo.jsx', 'utf8');

// Fix remaining textarea bug in Review Phase
c = c.replace(/className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-black\/5 dark:border-white\/5 shadow-\[0_2px_10px_rgba\(0,0,0,0\.04\)\] text-white dark:text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500\/60 transition-all resize-none"/g, 
'className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#006065]/20 focus:border-[#006065] transition-all resize-none"');

// Fix any other `text-white dark:text-white`
c = c.replace(/text-white dark:text-white/g, 'text-slate-900 dark:text-white');

// Fix visibility/lock settings select elements which were cut off in my trace, they probably have the same broken styles
c = c.replace(/bg-white dark:bg-slate-900 border border-black\/5 dark:border-white\/5 shadow-\[0_2px_10px_rgba\(0,0,0,0\.04\)\] text-slate-900 dark:text-white/g, 'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white');

// Enhance the countdown overlay
const oldCountdown = `{/* ── PREMIUM COUNTDOWN OVERLAY ── */}
        {countdown !== null && countdown > 0 && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div 
              key={countdown}
              initial={{ scale: 0.6, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 1.2, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              className="flex flex-col items-center gap-3"
            >
              {/* Big number */}
              <div className="relative flex items-center justify-center w-28 h-28">
                {/* Outer ring pulse */}
                <div className="absolute inset-0 rounded-full border-2 border-[#006065] dark:border-[#00beac]/30 animate-ping" style={{ animationDuration: '1s' }} />
                <div className="absolute inset-0 rounded-full border border-[#006065] dark:border-[#00beac]/20" />
                {/* Number */}
                <span className="text-7xl font-black text-white tabular-nums tracking-tight" style={{ textShadow: '0 0 40px hsl(var(--primary) / 0.6)' }}>
                  {countdown}
                </span>
              </div>
              {/* Label */}
              <div className="flex items-center gap-2 px-5 py-2 rounded-full bg-black/40 backdrop-blur border border-white/10">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: 'hsl(var(--primary))' }} />
                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: 'hsl(var(--primary))' }} />
                </span>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">Get Ready</span>
              </div>
            </motion.div>
          </div>
        )}`;

const newCountdown = `{/* ── PREMIUM COUNTDOWN OVERLAY ── */}
        {countdown !== null && countdown > 0 && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-md">
            <motion.div 
              key={countdown}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.1, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex flex-col items-center gap-6"
            >
              <div className="relative flex items-center justify-center w-32 h-32 bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-white/20">
                <div className="absolute inset-0 rounded-[2rem] border-4 border-[#006065] animate-pulse opacity-50" style={{ animationDuration: '1s' }} />
                <span className="text-7xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">
                  {countdown}
                </span>
              </div>
              <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
                </span>
                <span className="text-sm font-bold tracking-widest text-slate-700 dark:text-slate-300 uppercase">Recording Soon</span>
              </div>
            </motion.div>
          </div>
        )}`;

c = c.replace(oldCountdown, newCountdown);

fs.writeFileSync('src/pages/clipad/RecordVideo.jsx', c);
