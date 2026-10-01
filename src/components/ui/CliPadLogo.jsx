import React, { useId } from 'react';

export function CliPadLogo({ className = "", size = 24, color = "#00beac", dotColor = "#fad503" }) {
  const gradientId = useId().replace(/:/g, '');
  const gradRef = `url(#clipad-grad-${gradientId})`;

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`clipad-grad-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.7" />
        </linearGradient>
      </defs>
      
      {/* Outer abstract 'C' curve representing CliPad and Communication */}
      <path 
        d="M26 12 C26 5, 20 2, 16 2 C8 2, 2 8, 2 16 C2 24, 8 30, 16 30 C22 30, 26 26, 26 26" 
        stroke={gradRef} 
        strokeWidth="4" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      
      {/* Inner video/play element */}
      <path 
        d="M12 10 L22 16 L12 22 Z" 
        fill={gradRef} 
      />
      
      {/* Dot for recording/live aspect */}
      <circle cx="26" cy="6" r="3" fill={dotColor} />
    </svg>
  );
}

export default CliPadLogo;


