import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { Home, Layers, Video, Camera, User, MessageSquare, Bot, Sparkles, Menu, Settings, Shield, LogOut, X, Tag, Star, Phone, Globe, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import { useTheme } from '@/lib/ThemeContext';
import ThemeToggle from '@/components/layout/ThemeToggle';
import { AnimatePresence, motion } from 'framer-motion';

export default function ClipadMobileNav({ isMarketing = false, forceMobile = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [isOrbitOpen, setIsOrbitOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');
  
  const marketingNavItems = [
    { label: 'Features', action: () => { window.location.href = '#features'; }, icon: Star },
    { label: 'Pricing', action: () => { window.location.href = '#pricing'; }, icon: Tag },
    { label: 'Support', action: () => { window.location.href = '#contact'; }, icon: Phone },
  ];

  const appNavItems = [
    { label: 'Home', path: '/dashboard', icon: Home },
    { label: 'Search', path: '/search', icon: Search },
    { label: 'Spaces', path: '/spaces', icon: Layers },
    { label: 'Menu', action: () => setIsMenuOpen(true), icon: Menu },
  ];

  const navItems = isMarketing ? marketingNavItems : appNavItems;

  return (
    <>
      {/* Native Fixed Bottom Nav Bar */}
      <nav className={cn(
        "fixed bottom-0 left-0 right-0 z-40 bg-[#006065] dark:bg-[#0D1626] border-t border-white/10",
        "pb-[env(safe-area-inset-bottom,0px)]",
        forceMobile ? "flex" : "md:hidden"
      )}>
        <div className="flex items-stretch justify-around w-full h-[60px]">
          {navItems.map((item) => {
            const isActive = item.path ? location.pathname.startsWith(item.path) : isMenuOpen;
            const Icon = item.icon;
            
            const content = (
              <div className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full px-2 transition-all duration-200 relative",
                isActive ? "text-[#fad503]" : "text-white/55 hover:text-white"
              )}>
                {/* Yellow active top indicator bar */}
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-[#fad503] rounded-b-full" />
                )}
                <Icon className={cn(
                  "transition-all duration-200",
                  isActive ? "w-[22px] h-[22px]" : "w-5 h-5"
                )} strokeWidth={isActive ? 2.5 : 2} />
                <span className={cn(
                  "text-[10px] font-semibold leading-none tracking-tight",
                  isActive ? "text-[#fad503]" : "text-white/55"
                )}>
                  {item.label}
                </span>
              </div>
            );

            if (item.action) {
              return (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="flex flex-col items-center justify-center flex-1 h-full min-w-0 active:scale-95 transition-transform duration-100"
                >
                  {content}
                </button>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex flex-col items-center justify-center flex-1 h-full min-w-0 active:scale-95 transition-transform duration-100"
              >
                {content}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Compact Floating Menu Panel — anchored to bottom-right */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop — very light, doesn't cover page */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="lg:hidden fixed inset-0 z-[59]"
              onClick={() => setIsMenuOpen(false)}
            />

            {/* Floating Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10, transformOrigin: "bottom right" }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 400 }}
              className="lg:hidden fixed bottom-[72px] right-4 z-[60] w-[260px] overflow-hidden rounded-[20px] bg-[#006065] dark:bg-[#0D1626] shadow-[0_16px_40px_-8px_rgba(0,0,0,0.4)] border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* User Info */}
              {user && (
                <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10 bg-white/5">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden shadow-md text-[#006065]">
                    {user.avatar_url || user?.user_metadata?.avatar_url ? (
                      <img src={user.avatar_url || user.user_metadata.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (user.full_name || user.email)?.[0]?.toUpperCase() || 'U'
                    )}
                  </div>
                  <div className="overflow-hidden flex-1">
                    <p className="font-semibold text-[14px] text-white truncate leading-tight">{user.full_name || user?.user_metadata?.full_name || 'User'}</p>
                    <p className="text-[11px] text-white/60 truncate mt-0.5">{user.email}</p>
                  </div>
                </div>
              )}

              {/* Action List */}
              <div className="p-2 flex flex-col gap-0.5">
                {/* Theme */}
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-[14px] hover:bg-white/10 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shadow-sm text-white">
                      <ThemeToggle iconOnly />
                    </div>
                    <span className="text-[13px] font-medium text-white">Theme</span>
                  </div>
                  <span className="text-xs font-bold text-[#fad503] uppercase tracking-wider">
                    {theme === 'dark' ? 'Dark' : 'Light'}
                  </span>
                </button>

                {/* Language Switcher */}
                <div className="flex items-center justify-between px-3 py-2.5 rounded-[14px] hover:bg-white/10 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shadow-sm text-white">
                      <Globe className="w-4 h-4" />
                    </div>
                    <span className="text-[13px] font-medium text-white">Language</span>
                  </div>
                  <LanguageSwitcher className="h-8 text-xs bg-white/10 text-white border-white/20" currentLanguage={user?.user_metadata?.language} />
                </div>

                {/* Settings */}
                <button
                  onClick={() => { setIsMenuOpen(false); navigate('/settings'); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[14px] hover:bg-blue-50/80 dark:hover:bg-blue-500/10 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm border border-blue-100/50 dark:border-transparent">
                    <Settings className="w-4 h-4" />
                  </div>
                  <span className="text-[13px] font-medium text-slate-700 dark:text-muted-foreground">Settings</span>
                </button>

                {/* Analytics / Enterprise */}
                {user?.clipad_plan !== 'enterprise' ? (
                  <button
                    onClick={() => { setIsMenuOpen(false); navigate(window.location.pathname.startsWith('/clipad') ? '/clipad/analytics' : '/analytics'); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[14px] hover:bg-purple-50/80 dark:hover:bg-purple-500/10 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm border border-purple-100/50 dark:border-transparent">
                      <Bot className="w-4 h-4" />
                    </div>
                    <span className="text-[13px] font-medium text-slate-700 dark:text-muted-foreground">Analytics</span>
                  </button>
                ) : (
                  <button
                    onClick={() => { setIsMenuOpen(false); navigate(window.location.pathname.startsWith('/clipad') ? '/clipad/enterprise' : '/enterprise'); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[14px] hover:bg-indigo-50/80 dark:hover:bg-indigo-500/10 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm border border-indigo-100/50 dark:border-transparent">
                      <Layers className="w-4 h-4" />
                    </div>
                    <span className="text-[13px] font-medium text-slate-700 dark:text-muted-foreground">Enterprise</span>
                  </button>
                )}

                {/* Optavel Account */}
                <button
                  onClick={() => window.location.href = 'https://account.optavel.com'}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[14px] hover:bg-slate-100/80 dark:hover:bg-white/[0.06] transition-colors group"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-muted-foreground flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm border border-slate-200/50 dark:border-transparent">
                    <User className="w-4 h-4" />
                  </div>
                  <span className="text-[13px] font-medium text-slate-700 dark:text-muted-foreground">Account</span>
                </button>

                {/* Super Admin */}
                {user?.role === 'super_admin' && (
                  <button
                    onClick={() => { setIsMenuOpen(false); navigate(window.location.pathname.startsWith('/clipad') ? '/clipad/admin' : '/admin'); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[14px] hover:bg-rose-50/80 dark:hover:bg-rose-500/10 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm border border-rose-100/50 dark:border-transparent">
                      <Shield className="w-4 h-4" />
                    </div>
                    <span className="text-[13px] font-medium text-rose-600 dark:text-rose-400">Admin</span>
                  </button>
                )}
              </div>

              {/* Sign Out */}
              <div className="border-t border-slate-200/50 dark:border-white/[0.06] mx-3 my-1" />
              <div className="p-2 pt-1">
                <button
                  onClick={async () => { await logout(); navigate('/login'); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[14px] hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm border border-red-100/50 dark:border-transparent">
                    <LogOut className="w-4 h-4 ml-0.5" />
                  </div>
                  <span className="text-[13px] font-semibold text-red-600 dark:text-red-400">Sign Out</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
