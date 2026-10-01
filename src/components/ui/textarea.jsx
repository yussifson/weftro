import * as React from "react"

import { cn} from "@/lib/utils"

const Textarea = React.forwardRef(({ className, ...props}, ref) => {
 return (
 (<textarea
 className={cn(
 "flex min-h-[60px] w-full rounded-lg border-[0.5px] border-black/9 dark:border-white/8 border-input bg-transparent px-3 py-2 text-base placeholder:text-[#71717a] dark:text-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
 className
 )}
 ref={ref}
 {...props} />)
 );
})
Textarea.displayName = "Textarea"

export { Textarea}
