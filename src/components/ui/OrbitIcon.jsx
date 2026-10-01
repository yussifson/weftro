import React from 'react';

export const OrbitIcon = ({ className = "w-6 h-6", ...props }) => {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Central Core */}
      <circle cx="12" cy="12" r="3.5" fill="currentColor" opacity="0.85" />
      <circle cx="12" cy="12" r="1.5" fill="white" opacity="0.8" />
      
      {/* Orbital Rings */}
      <ellipse 
        cx="12" cy="12" rx="10" ry="3.5" 
        transform="rotate(30 12 12)" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeOpacity="0.6"
      />
      <ellipse 
        cx="12" cy="12" rx="10" ry="3.5" 
        transform="rotate(-30 12 12)" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeOpacity="0.6"
      />
      
      {/* Orbiting Satellites */}
      <circle cx="20.5" cy="17" r="1.5" fill="currentColor" className="animate-pulse" />
      <circle cx="3.5" cy="7" r="1" fill="currentColor" opacity="0.8" />
      <circle cx="17" cy="4.5" r="0.8" fill="currentColor" opacity="0.6" />
    </svg>
  );
};
