import React from 'react';

/**
 * Weftro Brand Logo Component
 * Modern SVG mark with interconnected weave icon and clean typographic wordmark
 */
export function WeftroLogo({ className = '', style = {}, color = '#006065', height = 32, white = false, iconOnly = false }) {
  const c = white ? '#ffffff' : color;
  const textColor = white ? '#ffffff' : '#0f172a';
  
  if (iconOnly) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 64 64"
        style={{ height: typeof height === 'number' ? height + 'px' : height, width: 'auto', ...style }}
        className={className}
        role="img"
      >
        <title>Weftro</title>
        <path stroke={c} d="M33 11.5H11.5V52.5H52.5V33" fill="none" strokeWidth="7" strokeLinejoin="miter"/>
        <polygon fill="#fad503" points="44,11 53,20 44,29 35,20"/>
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 190 48"
      style={{ height: typeof height === 'number' ? height + 'px' : height, width: 'auto', ...style }}
      className={className}
      role="img"
    >
      <title>Weftro</title>
      <g transform="translate(4, 2) scale(0.68)">
        <path stroke={c} d="M33 11.5H11.5V52.5H52.5V33" fill="none" strokeWidth="7" strokeLinejoin="miter"/>
        <polygon fill="#fad503" points="44,11 53,20 44,29 35,20"/>
      </g>
      <text
        x="54"
        y="33"
        fill={textColor}
        fontFamily="Outfit, DM Sans, system-ui, -apple-system, sans-serif"
        fontSize="27"
        fontWeight="800"
        letterSpacing="-0.03em"
      >
        Weftro
      </text>
    </svg>
  );
}

// Backward-compat aliases
export const KerintLogo = WeftroLogo;

export function CliPadLogo({ size, color, dotColor, white, height, className = '', style = {}, iconOnly = false }) {
  const h = height || (size ? size * 1.5 : 32);
  return <WeftroLogo color={color} white={white} height={h} className={className} style={style} iconOnly={iconOnly} />;
}

export function Logo({ className = '', style = {}, height = 28, hideText = false }) {
  return <WeftroLogo height={height} className={className} style={style} iconOnly={hideText} />;
}

export default WeftroLogo;
