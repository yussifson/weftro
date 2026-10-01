import * as React from "react";
import { cn } from "@/lib/utils";
import { Inbox } from "lucide-react";

/**
 * PremiumEmptyState — A unified, enterprise-grade empty state component.
 *
 * Usage:
 *   <PremiumEmptyState
 *     icon={Search}
 *     title="No records found"
 *     description="Try adjusting your filters or create a new entry."
 *     action={{ label: "Add Record", onClick: () => {} }}
 *   />
 */
const PremiumEmptyState = React.forwardRef(
  (
    {
      className,
      icon: Icon = Inbox,
      title = "Nothing here yet",
      description,
      action,
      secondaryAction,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center justify-center py-16 px-6 text-center select-none",
          className
        )}
        {...props}
      >
        {/* Icon container with subtle gradient backdrop */}
        <div className="relative mb-5">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/8 to-primary/3 blur-xl scale-150" />
          <div className="relative w-14 h-14 rounded-2xl bg-muted/60 border-[0.5px] border-black/5 dark:border-white/5 flex items-center justify-center">
            <Icon className="w-6 h-6 text-[#71717a] dark:text-gray-400 opacity-60" />
          </div>
        </div>

        {/* Title — precise, intentional typography */}
        <h3 className="text-[15px] font-semibold text-foreground tracking-[-0.01em] mb-1.5">
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className="text-[13px] text-[#71717a] dark:text-gray-400 max-w-xs leading-relaxed tracking-[0.01em]">
            {description}
          </p>
        )}

        {/* Actions */}
        {(action || secondaryAction) && (
          <div className="flex items-center gap-3 mt-5">
            {action && (
              <button
                onClick={action.onClick}
                className="h-8 px-4 text-[13px] font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                {action.label}
              </button>
            )}
            {secondaryAction && (
              <button
                onClick={secondaryAction.onClick}
                className="h-8 px-4 text-[13px] font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors"
              >
                {secondaryAction.label}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }
);
PremiumEmptyState.displayName = "PremiumEmptyState";

export { PremiumEmptyState };
