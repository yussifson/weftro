"use client";
import { useTheme} from "next-themes"
import { Toaster as Sonner} from "sonner"

const Toaster = ({
 ...props
}) => {
 const { theme = "system"} = useTheme()

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      richColors
      expand
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-[0.5px] group-[.toaster]:border-black/9 dark:group-[.toaster]:border-white/8 group-[.toaster]:shadow-[0_8px_24px_rgba(0,0,0,0.10)]",
          description: "group-[.toast]:text-[#71717a] dark:text-gray-400",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-[#71717a] dark:text-gray-400"
        }
      }}
      {...props} 
    />
  );
}

export { Toaster}
