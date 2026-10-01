"use client"

import { useTranslation} from "react-i18next";

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X} from "lucide-react"

import { cn} from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef(({ className, ...props}, ref) => {
 return (
 <DialogPrimitive.Overlay
 ref={ref}
 className={cn(
 "fixed inset-0 z-[9999] bg-black/60 dark:bg-black/80 backdrop-blur-sm h-full w-full data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
 className
 )}
 {...props} />
 );
})
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef(({ className, children, ...props}, ref) => {
 const { t} = useTranslation();
 return (
 <DialogPortal>
 <DialogOverlay />
 <DialogPrimitive.Content
 ref={ref}
 className={cn(
 "fixed z-[9999] grid w-full gap-4 bg-white/95 dark:bg-[#111b21]/95 backdrop-blur-3xl p-6 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 overflow-y-auto",
 // Mobile (Bottom Sheet)
 "bottom-0 left-0 rounded-t-[24px] border-t border-black/10 dark:border-white/10 max-h-[90dvh] pb-28 sm:pb-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]",
 "data-[state=closed]:slide-out-to-bottom-full data-[state=open]:slide-in-from-bottom-full",
 // Desktop (Centered Modal)
 "sm:bottom-auto sm:left-[50%] sm:top-[50%] sm:max-w-lg sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-2xl sm:border sm:border-black/10 sm:dark:border-white/10 sm:max-h-[85vh] sm:shadow-2xl sm:shadow-black/20",
 "sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:slide-in-from-bottom-0",
 "sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95",
 "sm:data-[state=closed]:slide-out-to-left-1/2 sm:data-[state=closed]:slide-out-to-top-[48%]",
 "sm:data-[state=open]:slide-in-from-left-1/2 sm:data-[state=open]:slide-in-from-top-[48%]",
 className
 )}
 {...props}>
 {children}
 <DialogPrimitive.Close
 className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-[#71717a] dark:text-gray-400">
 <X className="h-4 w-4" />
 <span className="sr-only">{t("close", "Close")}</span>
 </DialogPrimitive.Close>
 </DialogPrimitive.Content>
 </DialogPortal>
 );
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = (
 {
 className,
 ...props
}
) => {
 const { t} = useTranslation();
 return (
 <div
 className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
 {...props} />
 );
}
DialogHeader.displayName = "DialogHeader"

const DialogFooter = (
 {
 className,
 ...props
}
) => {
 return (
 <div
 className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 border-t border-border/40 pt-4 mt-2", className)}
 {...props} />
 );
}
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef(({ className, ...props}, ref) => {
 return (
 <DialogPrimitive.Title
 ref={ref}
 className={cn("text-lg font-semibold leading-none tracking-[-0.02em]", className)}
 {...props} />
 );
})
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef(({ className, ...props}, ref) => {
 return (
 <DialogPrimitive.Description
 ref={ref}
 className={cn("text-sm text-[#71717a] dark:text-gray-400", className)}
 {...props} />
 );
})
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
 Dialog,
 DialogPortal,
 DialogOverlay,
 DialogTrigger,
 DialogClose,
 DialogContent,
 DialogHeader,
 DialogFooter,
 DialogTitle,
 DialogDescription}
