import React from 'react';

/**
 * SidebarCollapseIcon
 * Renders the custom 3-line rounded tiered menu icon with accent dot.
 * - Supports stroke/fill inheritance or custom className.
 * - When `collapsed` is true, can flip or rotate to indicate expansion direction.
 */
export function SidebarCollapseIcon({
  className = "w-5 h-5",
  collapsed = false,
  barColor = "currentColor",
  dotColor = "#2563eb", // vibrant enterprise blue dot matching reference
  ...props
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} transition-transform duration-300 ${collapsed ? 'scale-x-[-1]' : ''}`}
      {...props}
    >
      {/* Top Bar */}
      <rect
        x="10"
        y="20"
        width="64"
        height="14"
        rx="7"
        fill={barColor}
      />
      {/* Top Right Accent Dot */}
      <circle
        cx="86"
        cy="27"
        r="7"
        fill={dotColor}
      />
      {/* Middle Bar */}
      <rect
        x="10"
        y="46"
        width="64"
        height="14"
        rx="7"
        fill={barColor}
      />
      {/* Bottom Bar (Shorter) */}
      <rect
        x="10"
        y="72"
        width="40"
        height="14"
        rx="7"
        fill={barColor}
      />
    </svg>
  );
}

export default SidebarCollapseIcon;
