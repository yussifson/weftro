import * as React from "react"
import { cva} from "class-variance-authority";

import { cn} from "@/lib/utils"

const badgeVariants = cva(
 "inline-flex items-center rounded-lg border-0 px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
 {
 variants: {
 variant: {
 default:
 "bg-primary/12 text-primary hover:bg-primary/18",
 secondary:
 "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
 destructive:
 "bg-destructive/12 text-destructive hover:bg-destructive/18",
 outline: "text-foreground"}},
 defaultVariants: {
 variant: "default"}}
)

function Badge({
 className,
 variant,
 ...props
}) {
 return (<div className={cn(badgeVariants({ variant}), className)} {...props} />);
}

export { Badge, badgeVariants}
