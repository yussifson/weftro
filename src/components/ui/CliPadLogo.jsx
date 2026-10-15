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
  // If explicitly white, or when in high contrast dark contexts where white is specified
  // Default brand colors:
  // W, e, f, r, o = #0C5C3C (official rich green) or white if white={true}
  // t = #D9A400 (official gold/yellow)
  const defaultLetterColor = white ? '#FFFFFF' : (color || '#0C5C3C');
  const primaryBrandColor = defaultLetterColor;
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

  // Pure SVG wordmark without artificial background bounding boxes:
  // Transparent, seamlessly blends into dark and light backgrounds.
  // Tight viewBox: 0 0 700 200 matches the exact letter bounding box perfectly.
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 700 200"
      style={{ height: typeof height === 'number' ? `${height}px` : height, width: 'auto', ...style }}
      className={className}
      role="img"
      aria-label="Weftro"
    >
      <title>Weftro</title>
      <g transform="scale(0.137931, -0.137931) translate(9.00018310546875, -1430)">
        {/* W (Brand Forest Green or White) */}
        <path fill={primaryBrandColor} transform="translate(0, 0)" d={WORDMARK_PATHS.w} />
        {/* e (Brand Forest Green or White) */}
        <path fill={primaryBrandColor} transform="translate(1325.0, 0)" d={WORDMARK_PATHS.e} />
        {/* f (Brand Forest Green or White) */}
        <path fill={primaryBrandColor} transform="translate(2180.0, 0)" d={WORDMARK_PATHS.f} />
        {/* t (Official gold/yellow accent #D9A400) */}
        <path fill={letterAccentColor} transform="translate(2716.0, 0)" d={WORDMARK_PATHS.t} />
        {/* r (Brand Forest Green or White) */}
        <path fill={primaryBrandColor} transform="translate(3301.0, 0)" d={WORDMARK_PATHS.r} />
        {/* o (Brand Forest Green or White) */}
        <path fill={primaryBrandColor} transform="translate(4079.0, 0)" d={WORDMARK_PATHS.o} />
      </g>
    </svg>
  );
}

// Backward-compat aliases
export const KerintLogo = WeftroLogo;

export function CliPadLogo({ size, color, dotColor, white, height, className = '', style = {}, iconOnly = false }) {
  const h = height || (size ? size * 0.75 : 32);
  return <WeftroLogo color={color} white={white} height={h} className={className} style={style} iconOnly={iconOnly} />;
}

export function Logo({ className = '', style = {}, height = 28, hideText = false }) {
  return <WeftroLogo height={height} className={className} style={style} iconOnly={hideText} />;
}

export default WeftroLogo;
