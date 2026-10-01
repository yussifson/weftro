import * as React from "react"

import { cn} from "@/lib/utils"

const Card = React.forwardRef(({ className, onClick, ...props }, ref) => (
  <div
    ref={ref}
    onClick={onClick}
    className={cn(
      "rounded-xl border-[0.5px] border-black/9 dark:border-white/8 bg-card text-card-foreground shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
      onClick && "cursor-pointer transition-all duration-200 hover:-translate-y-[2px] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] active:translate-y-0 active:shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
      className
    )}
    {...props} />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef(({ className, ...props}, ref) => (
 <div
 ref={ref}
 className={cn("flex flex-col space-y-1.5 p-6", className)}
 {...props} />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef(({ className, ...props}, ref) => (
 <div
 ref={ref}
 className={cn("font-medium leading-none tracking-[-0.01em]", className)}
 {...props} />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef(({ className, ...props}, ref) => (
 <div
 ref={ref}
 className={cn("text-sm text-[#71717a] dark:text-gray-400", className)}
 {...props} />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef(({ className, ...props}, ref) => (
 <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef(({ className, ...props}, ref) => (
 <div
 ref={ref}
 className={cn("flex items-center p-6 pt-0", className)}
 {...props} />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent}
