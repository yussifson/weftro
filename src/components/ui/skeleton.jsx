import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}) {
  return (
    (<div
      className={cn("animate-pulse rounded-lg bg-slate-100 dark:bg-secondary", className)}
      {...props} />)
  );
}

export { Skeleton }
