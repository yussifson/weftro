import React from 'react';

export function KerintLogo({ className = '', style = {}, color = '#006065', height = 32, white = false, iconOnly = false }) {
  const c = white ? '#ffffff' : color;
  
  if (iconOnly) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 64 64"
        style={{ height: typeof height === 'number' ? height + 'px' : height, width: 'auto', ...style }}
        className={className}
        role="img"
      >
        <title>KERINT</title>
        <path stroke={c} d="M33 11.5H11.5V52.5H52.5V33" fill="none" strokeWidth="7" strokeLinejoin="miter"/>
        <polygon fill="#fad503" points="44,11 53,20 44,29 35,20"/>
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="-14 -14 205 76"
      style={{ height: typeof height === 'number' ? height + 'px' : height, width: 'auto', ...style }}
      className={className}
      role="img"
    >
      <title>KERINT</title>
      <g transform="translate(-8 -8)">
        <path stroke={c} d="M33 11.5H11.5V52.5H52.5V33" fill="none" strokeWidth="7" strokeLinejoin="miter"/>
        <polygon fill="#fad503" points="44,11 53,20 44,29 35,20"/>
      </g>
      <g transform="translate(68 11.6) scale(.62)">
        <g fill={c}>
          <rect x="0" y="0" width="6" height="40"/>
          <polygon points="20,0 28,0 17,20 28,40 20,40 9,20"/>
          <path transform="translate(34 0)" d="M0 0H24V6H6V17H20V23H6V34H24V40H0Z"/>
          <path transform="translate(65 0)" fillRule="evenodd" d="M0 0H15A11 11 0 0 1 15 22H6V40H0ZM6 6H15A5 5 0 0 1 15 16H6Z"/>
          <polygon transform="translate(65 0)" points="11,21 18.5,21 26,40 18,40"/>
          <rect x="97" y="0" width="6" height="40"/>
          <path transform="translate(112 0)" d="M0 0H7L22 28V0H28V40H21L6 12V40H0Z"/>
          <path transform="translate(147 0)" d="M0 0H28V6H17V40H11V6H0Z"/>
        </g>
      </g>
    </svg>
  );
}

// Backward-compat aliases
export function CliPadLogo({ size, color, dotColor, white, height, className = '', style = {}, iconOnly = false }) {
  const h = height || (size ? size * 1.5 : 32);
  return <KerintLogo color={color} white={white} height={h} className={className} style={style} iconOnly={iconOnly} />;
}

export function Logo({ className = '', style = {}, height = 28, hideText = false }) {
  // If hideText is true (used previously for SSO), we map it to iconOnly
  return <KerintLogo height={height} className={className} style={style} iconOnly={hideText} />;
}

export default KerintLogo;
