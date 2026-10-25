import React from 'react';
import { CliPadLogo } from '@/components/ui/CliPadLogo';

const SIZE_MAP = {
  sm: { dim: 20, stroke: 2.2, dot: 4 },
  md: { dim: 32, stroke: 2.5, dot: 6 },
  lg: { dim: 48, stroke: 3, dot: 8 },
  xl: { dim: 64, stroke: 3.5, dot: 10 },
};

/**
 * Modern Orbit Pulse Loader with dual glowing rings and subtle orbital energy
 */
export function OrbitLoader({ size = 'md', className = '', label = 'Loading', color }) {
  const cfg = SIZE_MAP[size] || SIZE_MAP.md;
  const dim = cfg.dim;

  return (
    <div
      role="status"
      aria-label={label}
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: dim, height: dim }}
    >
      {/* Outer ambient glow */}
      <div 
        className="absolute inset-0 rounded-full bg-primary/20 blur-md animate-pulse pointer-events-none" 
        style={{ animationDuration: '2s' }}
      />

      {/* SVG Smooth Dual-Track Orbit Spinner */}
      <svg
        className="w-full h-full animate-spin"
        style={{ animationDuration: '1.4s', animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Track Ring */}
        <circle
          cx="24"
          cy="24"
          r="20"
          stroke="currentColor"
          strokeWidth="3.5"
          className="text-primary/15 dark:text-primary/20"
        />

        {/* Dynamic Sweep Ring */}
        <circle
          cx="24"
          cy="24"
          r="20"
          stroke="url(#orbit-gradient)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray="125.6"
          strokeDashoffset="75"
        />

        <defs>
          <linearGradient id="orbit-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0C5C3C" />
            <stop offset="70%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>
        </defs>
      </svg>

      {/* Inner Pulsing Core Dot */}
      <div
        className="absolute rounded-full bg-primary shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-ping opacity-60 pointer-events-none"
        style={{ width: cfg.dot, height: cfg.dot, animationDuration: '2s' }}
      />
      <div
        className="absolute rounded-full bg-emerald-400 pointer-events-none"
        style={{ width: cfg.dot, height: cfg.dot }}
      />
    </div>
  );
}

/**
 * Clean Backdrop Loading Overlay for Cards and Dialogs
 */
export function LoadingOverlay({ visible, size = 'md', label = 'Loading', blur = true }) {
  if (!visible) return null;

  return (
    <div
      role="status"
      aria-label={label}
      aria-live="polite"
      className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-[inherit] transition-all animate-in fade-in duration-200"
      style={{
        backgroundColor: 'rgba(var(--background-rgb, 11, 20, 24), 0.75)',
        backdropFilter: blur ? 'blur(6px)' : 'none',
        WebkitBackdropFilter: blur ? 'blur(6px)' : 'none',
      }}
    >
      <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-card/80 border border-border/80 shadow-2xl backdrop-blur-xl space-y-3">
        <OrbitLoader size={size} label={label} />
        {label && (
          <span className="text-xs font-semibold tracking-wide text-foreground/80 animate-pulse">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Unified Full-Page Executive Loader with subtle logo breathing and ambient glow
 */
export function PageLoader({ label = 'Loading Weftro...' }) {
  return (
    <div
      role="status"
      aria-label={label}
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-background text-foreground overflow-hidden select-none"
    >
      {/* Ambient background glows */}
      <div className="absolute w-96 h-96 rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute w-80 h-80 rounded-full bg-emerald-500/5 blur-[100px] pointer-events-none -translate-y-20 translate-x-20" />

      {/* Center Floating Glass Card */}
      <div className="relative z-10 flex flex-col items-center justify-center p-8 sm:p-10 rounded-3xl bg-card/40 border border-border/60 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-300">
        
        {/* Subtle breathing logo */}
        <div className="relative mb-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" style={{ animationDuration: '2.5s' }} />
          <CliPadLogo height={44} className="relative z-10 drop-shadow-md" />
        </div>

        {/* Orbit Spinner */}
        <OrbitLoader size="md" label={label} />

        {/* Polished Status Label */}
        {label && (
          <div className="mt-5 text-center space-y-1">
            <p className="text-xs font-bold tracking-widest uppercase text-foreground/90">
              {label}
            </p>
            <div className="flex items-center justify-center gap-1.5 pt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Subtext */}
      <div className="absolute bottom-8 text-[11px] font-medium text-muted-foreground/60 tracking-wider uppercase">
        Optavel Enterprise Platform
      </div>
    </div>
  );
}
