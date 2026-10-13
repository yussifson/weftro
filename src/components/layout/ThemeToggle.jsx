import React from "react";
import { Sun, Moon, Laptop, ChevronDown} from "lucide-react";
import { useTheme} from "@/lib/ThemeContext";
import { cn} from "@/lib/utils";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

const themeOptions = [
  { value: "light", label: "LIGHT", icon: Sun, color: "text-amber-500" },
  { value: "dark", label: "DARK", icon: Moon, color: "text-indigo-400" },
  { value: "system", label: "SYSTEM", icon: Laptop, color: "text-[#71717a] dark:text-gray-400" },
];

export default function ThemeToggle({ iconOnly = false }) {
  const { theme, changeTheme } = useTheme();
  const activeOption = themeOptions.find(o => o.value === theme) || themeOptions[0];
  const ActiveIcon = activeOption.icon;

  if (iconOnly) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="w-8 h-8 rounded-full bg-[#006065] dark:bg-[#131A2C] text-white flex items-center justify-center focus:outline-none hover:bg-white/10 transition-transform cursor-pointer border border-white/10 outline-none">
            <ActiveIcon className={cn("w-4 h-4", activeOption.color)} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="z-[100] w-36 rounded-xl border border-white/10 bg-[#006065] dark:bg-[#131A2C] text-white p-1.5 animate-in fade-in zoom-in-95 duration-150 shadow-xl">
          <div className="space-y-1">
            {themeOptions.map((option) => {
              const isSelected = option.value === theme;
              const OptIcon = option.icon;
              return (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => changeTheme(option.value)}
                  className={cn(
                    "flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-left text-xs font-medium transition-all duration-150 cursor-pointer select-none",
                    isSelected
                      ? "bg-[#00beac] text-[#00beac] font-bold focus:bg-[#00beac] focus:text-[#00beac]"
                      : "text-white/80 hover:text-white hover:bg-white/10 focus:bg-white/10 focus:text-white"
                  )}
                >
                  <OptIcon className={cn("w-3.5 h-3.5 shrink-0", isSelected ? "text-[#00beac]" : option.color)} />
                  <span className="flex-1">{option.label}</span>
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#006065] dark:bg-[#131A2C] animate-pulse" />}
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
        <button className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl border border-white/10 bg-[#006065] dark:bg-[#131A2C] hover:bg-white/10 text-white transition-all duration-200 focus:outline-none cursor-pointer outline-none">
          <ActiveIcon className={cn("w-4 h-4", activeOption.color)} />
          <span className="hidden sm:inline text-xs font-medium text-white select-none uppercase tracking-wider tracking-[0.04em]">
            {activeOption.label}
          </span>
          <ChevronDown className="w-3 h-3 text-white/70" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="z-[100] w-36 rounded-xl border border-white/10 bg-[#006065] dark:bg-[#131A2C] text-white p-1.5 animate-in fade-in zoom-in-95 duration-150 shadow-xl transition-shadow duration-200">
        <div className="space-y-1">
          {themeOptions.map((option) => {
            const isSelected = option.value === theme;
            const OptIcon = option.icon;

            return (
              <DropdownMenuItem
                key={option.value}
                onClick={() => changeTheme(option.value)}
                className={cn(
                  "flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-left text-xs font-medium transition-all duration-150 cursor-pointer select-none",
                  isSelected
                    ? "bg-[#00beac] text-[#00beac] font-bold focus:bg-[#00beac] focus:text-[#00beac]"
                    : "text-white/80 hover:text-white hover:bg-white/10 focus:bg-white/10 focus:text-white"
                )}
              >
                <OptIcon className={cn("w-3.5 h-3.5 shrink-0", isSelected ? "text-[#00beac]" : option.color)} />
                <span className="flex-1">{option.label}</span>
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#006065] dark:bg-[#131A2C] animate-pulse" />
                )}
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
