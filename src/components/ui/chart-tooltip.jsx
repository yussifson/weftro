import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * PremiumChartTooltip — Vercel/Stripe-grade chart tooltip for Recharts.
 *
 * Usage with Recharts:
 *   <Tooltip content={<PremiumChartTooltip />} />
 *
 * Optional props:
 *   - valueFormatter: (value) => string — format the displayed value
 *   - labelFormatter: (label) => string — format the header label
 */
function PremiumChartTooltip({
  active,
  payload,
  label,
  className,
  valueFormatter,
  labelFormatter,
}) {
  if (!active || !payload?.length) return null;

  const formattedLabel = labelFormatter ? labelFormatter(label) : label;

  return (
    <div
      className={cn(
        "bg-card/95 backdrop-blur-md border-[0.5px] border-black/8 dark:border-white/10 rounded-xl px-3.5 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.12)] min-w-[140px]",
        className
      )}
    >
      {/* Header label */}
      <p className="text-[11px] font-medium text-[#71717a] dark:text-gray-400 uppercase tracking-[0.06em] mb-1.5 pb-1.5 border-b border-border/40">
        {formattedLabel}
      </p>

      {/* Data entries */}
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: entry.color || "hsl(var(--primary))" }}
              />
              <span className="text-[12px] text-[#71717a] dark:text-gray-400 capitalize">
                {entry.name || entry.dataKey}
              </span>
            </div>
            <span className="text-[13px] font-semibold text-foreground tabular-nums tracking-[-0.01em]">
              {valueFormatter ? valueFormatter(entry.value) : entry.value?.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export { PremiumChartTooltip };
