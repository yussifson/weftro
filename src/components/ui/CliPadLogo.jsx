import React from 'react';
import { useTheme } from '@/lib/ThemeContext';
import { ICON_PATH, WORDMARK_PATHS } from './weftroLogoPaths';

/**
 * Official Weftro Brand Logo Component
 * - Adapts dynamically to light and dark theme
 * - Supports iconOnly mode with the official rounded badge icon
 * - Supports custom height, className, style, white override, and custom colors
 */
export function WeftroLogo({
  className = '',
  style = {},
  height = 32,
  white = false,
  iconOnly = false,
  color,
  accentColor,
}) {
  // Gracefully read theme if within ThemeProvider
  let currentTheme = 'dark';
  try {
    const themeCtx = useTheme();
    if (themeCtx?.theme) {
      currentTheme = themeCtx.theme;
    }
  } catch (e) {
    // If rendered outside ThemeProvider, detect from documentElement class
    if (typeof document !== 'undefined') {
      currentTheme = document.documentElement.classList.contains('light') ? 'light' : 'dark';
    }
  }

  const isLight = currentTheme === 'light' && !white;

  // Primary brand colors:
  // In light theme: Official rich forest green #0C5C3C
  // In dark theme or white mode: Crisp white #FFFFFF (or pristine light slate)
  const primaryBrandColor = white
    ? '#ffffff'
    : color || (isLight ? '#0C5C3C' : '#ffffff');

  // Accent color for letter 't': Official gold #D9A400
  const letterAccentColor = accentColor || (white ? '#ffffff' : '#D9A400');

  // Badge background color for iconOnly mode:
  // In light mode: official forest green container #0C5C3C with white 'W'
  // In dark mode: dark teal container #0C5C3C or #102820 with white 'W'
  const badgeBg = color || '#0C5C3C';
  const iconLetterColor = white ? '#ffffff' : '#ffffff';

  if (iconOnly) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 64 64"
        style={{ height: typeof height === 'number' ? `${height}px` : height, width: 'auto', ...style }}
        className={className}
        role="img"
        aria-label="Weftro"
      >
        <title>Weftro</title>
        <rect width="64" height="64" rx="14.08" fill={badgeBg} />
        <g transform="translate(9.404, 19.200)">
          <g transform="scale(0.027093, -0.027093) translate(-0.7883326001465321, -941.7395057976246)">
            <path fill={iconLetterColor} d={ICON_PATH} />
          </g>
        </g>
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 900 400"
      style={{ height: typeof height === 'number' ? `${height}px` : height, width: 'auto', ...style }}
      className={className}
      role="img"
      aria-label="Weftro"
    >
      <title>Weftro</title>
      <g transform="translate(100.0, 100.0)">
        <g transform="scale(0.137931, -0.137931) translate(9.00018310546875, -1430)">
          {/* W */}
          <path fill={primaryBrandColor} transform="translate(0, 0)" d={WORDMARK_PATHS.w} />
          {/* e */}
          <path fill={primaryBrandColor} transform="translate(1325.0, 0)" d={WORDMARK_PATHS.e} />
          {/* f */}
          <path fill={primaryBrandColor} transform="translate(2180.0, 0)" d={WORDMARK_PATHS.f} />
          {/* t (Official distinctive gold accent) */}
          <path fill={letterAccentColor} transform="translate(2716.0, 0)" d={WORDMARK_PATHS.t} />
          {/* r */}
          <path fill={primaryBrandColor} transform="translate(3301.0, 0)" d={WORDMARK_PATHS.r} />
          {/* o */}
          <path fill={primaryBrandColor} transform="translate(4079.0, 0)" d={WORDMARK_PATHS.o} />
        </g>
      </g>
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
