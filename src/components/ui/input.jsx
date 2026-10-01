import * as React from "react"

import { cn} from "@/lib/utils"

import { getPlatform } from "@/lib/platform"

const Input = React.forwardRef(({ className, type, ...props}, ref) => {
 const platform = getPlatform();
 
 let platformClasses = "";
 if (platform === 'ios') {
   platformClasses = "rounded-2xl shadow-sm bg-white dark:bg-card";
 } else if (platform === 'android') {
   platformClasses = "rounded-xl border-b-2 border-transparent focus-visible:border-b-primary shadow-none bg-muted/30";
 }

 return (
  (<input
  type={type}
  className={cn(
  "flex h-12 md:h-10 w-full rounded-xl border-[0.5px] border-black/9 dark:border-white/8 border-input bg-muted/20 px-4 md:px-3 py-2 text-[16px] md:text-sm transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-[#71717a] dark:text-gray-400/70 hover:bg-muted/40 focus-visible:outline-none focus-visible:bg-transparent focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50",
  platformClasses,
  className
  )}
  ref={ref}
  {...props} />)
 );
})
Input.displayName = "Input"

export { Input}
