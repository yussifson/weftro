import * as React from "react"
import { Slot} from "@radix-ui/react-slot"
import { cva} from "class-variance-authority";

import { cn} from "@/lib/utils"

const buttonVariants = cva(
 "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
 {
 variants: {
 variant: {
 default:
 "bg-gradient-to-b from-primary/90 to-primary text-primary-foreground -primary/20 hover:from-primary hover:to-primary -primary/30",
 destructive:
 "bg-gradient-to-b from-destructive/90 to-destructive text-destructive-foreground hover:from-destructive hover:to-destructive ",
 outline:
 "border-2 border-input bg-transparent hover:bg-accent hover:text-accent-foreground hover:border-accent-foreground/20",
 secondary:
 "bg-secondary text-secondary-foreground hover:bg-secondary/80",
 ghost: "hover:bg-accent/50 hover:text-accent-foreground",
 link: "text-primary underline-offset-4 hover:underline"},
 size: {
 default: "h-9 px-4 py-2",
 sm: "h-8 rounded-lg px-3 text-xs",
 lg: "h-10 rounded-lg px-8",
 icon: "h-9 w-9"}},
 defaultVariants: {
 variant: "default",
 size: "default"}}
)

import { getPlatform } from "@/lib/platform"

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props}, ref) => {
 const Comp = asChild ? Slot : "button"
 const platform = getPlatform();
 
 let platformClasses = "";
 if (platform === 'ios') {
   platformClasses = "rounded-full shadow-none active:opacity-50 active:scale-100 font-normal tracking-normal";
 } else if (platform === 'android') {
   platformClasses = "rounded-full shadow-md uppercase tracking-wide font-medium relative overflow-hidden active:bg-black/10 dark:active:bg-white/10";
 }

 return (
 (<Comp
 className={cn(buttonVariants({ variant, size }), platformClasses, className)}
 ref={ref}
 {...props} />)
 );
})
Button.displayName = "Button"

export { Button, buttonVariants}
