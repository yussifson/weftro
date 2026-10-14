import React from "react";
import { Sun, Moon, Laptop, ChevronDown, Check } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

const themeOptions = [
  { value: "light", label: "Light", icon: Sun, color: "text-amber-500" },
  { value: "dark", label: "Dark", icon: Moon, color: "text-sky-400" },
  { value: "system", label: "System", icon: Laptop, color: "text-slate-400" },
];

export default function ThemeToggle({ iconOnly = false }) {
  const { theme, changeTheme } = useTheme();
  const activeOption = themeOptions.find(o => o.value === theme) || themeOptions[0];
  const ActiveIcon = activeOption.icon;

  if (iconOnly) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button 
            type="button"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center focus:outline-none transition-all cursor-pointer border border-white/10 active:scale-95 shadow-sm"
            title={`Theme: ${activeOption.label}`}
          >
            <ActiveIcon className={cn("w-4 h-4", activeOption.color)} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="z-[100] w-40 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101D22] text-slate-800 dark:text-slate-100 p-1.5 animate-in fade-in zoom-in-95 duration-150 shadow-2xl">
          <div className="space-y-1">
            {themeOptions.map((option) => {
              const isSelected = option.value === theme;
              const OptIcon = option.icon;
              return (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => changeTheme(option.value)}
                  className={cn(
                    "flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-left text-xs font-semibold transition-all duration-150 cursor-pointer select-none",
                    isSelected
                      ? "bg-[#006065]/10 text-[#006065] dark:bg-[#fad503]/15 dark:text-[#fad503]"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
                  )}
                >
                  <OptIcon className={cn("w-4 h-4 shrink-0", isSelected ? "text-[#006065] dark:text-[#fad503]" : option.color)} />
                  <span className="flex-1">{option.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#006065] dark:text-[#fad503]" />}
                </DropdownMenuItem>
              );
            })}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button 
          type="button"
          className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/15 bg-white/10 hover:bg-white/20 text-white transition-all duration-200 focus:outline-none cursor-pointer active:scale-98 shadow-sm"
        >
          <ActiveIcon className={cn("w-3.5 h-3.5", activeOption.color)} />
          <span className="hidden sm:inline text-xs font-semibold text-white select-none">
            {activeOption.label}
          </span>
          <ChevronDown className="w-3 h-3 text-white/70" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="z-[100] w-40 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101D22] text-slate-800 dark:text-slate-100 p-1.5 animate-in fade-in zoom-in-95 duration-150 shadow-2xl">
        <div className="space-y-1">
          {themeOptions.map((option) => {
            const isSelected = option.value === theme;
            const OptIcon = option.icon;

            return (
              <DropdownMenuItem
                key={option.value}
                onClick={() => changeTheme(option.value)}
                className={cn(
                  "flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-left text-xs font-semibold transition-all duration-150 cursor-pointer select-none",
                  isSelected
                    ? "bg-[#006065]/10 text-[#006065] dark:bg-[#fad503]/15 dark:text-[#fad503]"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
                )}
              >
                <OptIcon className={cn("w-4 h-4 shrink-0", isSelected ? "text-[#006065] dark:text-[#fad503]" : option.color)} />
                <span className="flex-1">{option.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-[#006065] dark:text-[#fad503]" />}
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
