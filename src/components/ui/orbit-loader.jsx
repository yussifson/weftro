import React from 'react'

const SIZE_MAP = {
  sm: { dim: 16 },
  md: { dim: 24 },
  lg: { dim: 40 }
}

export function OrbitLoader({ size = 'md', className = '', label = 'Loading', color }) {
  const { dim } = SIZE_MAP[size] || SIZE_MAP['md']
  
  return (
    <span
      role="status"
      aria-label={label}
      className={orbit-loader orbit-loader-- + size +   + className}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: dim, height: dim }}
    >
      <svg className="animate-spin text-primary" style={{ width: '100%', height: '100%' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
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
        <div style={{
          width: '48px', height: '48px',
          marginBottom: '24px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg className="animate-spin text-primary" style={{ width: '100%', height: '100%' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </div>
      <style>{
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes overlay-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      }</style>
    </div>
  )
}
