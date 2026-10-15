import React from 'react';
import { useTheme } from '@/lib/ThemeContext';
import { ICON_PATH, ICON_SUBPATHS, WORDMARK_PATHS } from './weftroLogoPaths';

/**
 * Official Weftro Brand Logo Component
 * - Adapts dynamically to light and dark theme
 * - Supports iconOnly mode with the official rounded badge icon and two-tone W
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
  // The official Weftro logo provided by the user is green #0C5C3C with yellow #D9A400 't'.
  // Letters W, e, f, r, o = #0C5C3C (official green)
  // Letter t = #D9A400 (official gold/yellow)
  const primaryBrandColor = color || '#0C5C3C';
  const letterAccentColor = accentColor || '#D9A400';

  // Badge background color for iconOnly mode:
  // Official rich forest green container #0C5C3C with two-tone 'W' (left white, right yellow)
  const badgeBg = color || '#0C5C3C';
  const iconLeftColor = '#ffffff';
  const iconRightColor = accentColor || '#D9A400';

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
            {ICON_SUBPATHS ? (
              <>
                <path fill={iconLeftColor} d={ICON_SUBPATHS.left} />
                <path fill={iconRightColor} d={ICON_SUBPATHS.right} />
              </>
            ) : (
              <path fill={iconLeftColor} d={ICON_PATH} />
            )}
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
      {/* Crisp container pill matching the exact SVG provided by user */}
      <rect width="900" height="400" rx="64" fill="#FFFFFF" />
      <g transform="translate(100.0, 100.0)">
        <g transform="scale(0.137931, -0.137931) translate(9.00018310546875, -1430)">
          {/* W (Green) */}
          <path fill={primaryBrandColor} transform="translate(0, 0)" d={WORDMARK_PATHS.w} />
          {/* e (Green) */}
          <path fill={primaryBrandColor} transform="translate(1325.0, 0)" d={WORDMARK_PATHS.e} />
          {/* f (Green) */}
          <path fill={primaryBrandColor} transform="translate(2180.0, 0)" d={WORDMARK_PATHS.f} />
          {/* t (Official gold accent #D9A400) */}
          <path fill={letterAccentColor} transform="translate(2716.0, 0)" d={WORDMARK_PATHS.t} />
          {/* r (Green) */}
          <path fill={primaryBrandColor} transform="translate(3301.0, 0)" d={WORDMARK_PATHS.r} />
          {/* o (Green) */}
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
