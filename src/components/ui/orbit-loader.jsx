import React from 'react'
import { getSubdomainAndBase } from '@/lib/domainUtils'

const SIZE_MAP = {
  sm: { dim: 16, stroke: 1.5, r: 6 },
  md: { dim: 24, stroke: 2,   r: 9 },
  lg: { dim: 40, stroke: 2.5, r: 16 }
}

export function OrbitLoader({ size = 'md', className = '', label = 'Loading', color }) {
  const { dim } = SIZE_MAP[size] || SIZE_MAP['md']
  
  let isRootAccount = false;
  let isClipad = false;
  try {
    const host = window.location.hostname.toLowerCase();
    if (host.includes('clipad')) {
      isClipad = true;
    } else if (host.includes('account') || host === 'optavel.com' || host === 'www.optavel.com') {
      isRootAccount = true;
    }
  } catch (e) {}
  
  const logoSrc = isClipad ? "/clipad-logo-green.svg" : (isRootAccount ? "/optavel-favicon.svg" : "/slate-favicon.svg");

  return (
    <span
      role="status"
      aria-label={label}
      className={`orbit-loader orbit-loader--${size} ${className}`}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: dim, height: dim }}
    >
      <img src={logoSrc} alt={label} style={{ width: '100%', height: '100%', objectFit: 'contain', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
    </span>
  )
}

export function LoadingOverlay({ visible, size = 'md', label = 'Loading', blur = false }) {
  if (!visible) return null
  return (
    <div
      role="status"
      aria-label={label}
      aria-live="polite"
      className="loading-overlay"
      style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: blur ? 'rgba(var(--background-rgb, 255,255,255), 0.7)' : 'rgba(var(--background-rgb, 255,255,255), 0.5)',
        backdropFilter: blur ? 'blur(2px)' : 'none',
        borderRadius: 'inherit',
        zIndex: 10,
        animation: 'overlay-fade-in 150ms ease',
      }}
    >
      <OrbitLoader size={size} label={label} />
    </div>
  )
}

export function PageLoader({ label = 'Loading...' }) {
  let isRootAccount = false;
  let isClipad = false;
  try {
    const host = window.location.hostname.toLowerCase();
    if (host.includes('clipad')) {
      isClipad = true;
    } else if (host.includes('account') || host === 'optavel.com' || host === 'www.optavel.com') {
      isRootAccount = true;
    }
  } catch (e) {}
  
  const logoSrc = isClipad ? "/clipad-logo-green.svg" : (isRootAccount ? "/optavel-favicon.svg" : "/slate-favicon.svg");
  const logoAlt = isClipad ? "CliPad Logo" : (isRootAccount ? "Optavel Logo" : "Slate Logo");

  return (
    <div
      role="status"
      aria-label={label}
      className="bg-background text-foreground"
      style={{
        position: 'fixed', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        zIndex: 9999,
        overflow: 'hidden',
        animation: 'overlay-fade-in 200ms ease',
      }}
    >
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        animation: 'fade-up 500ms ease 100ms both',
      }}>
        {/* Exact Logo */}
        <div style={{
          width: '64px', height: '64px',
          marginBottom: '24px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <img 
            src={logoSrc} 
            alt={logoAlt} 
            style={{ 
              width: '100%', height: '100%', objectFit: 'contain',
              animation: 'logo-breathe 2.5s ease-in-out infinite' 
            }} 
          />
        </div>

        {/* Loader image is the only thing shown */}

        {/* Loading text removed as per request to keep it clean */}
      </div>

      {/* Inline keyframes */}
      <style>{`
        @keyframes logo-breathe {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.05); opacity: 1; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes overlay-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
