import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { MessageSquare, Search, Plus, User, ChevronDown, Sparkles, Video, Calendar, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import GlobalSearch from '@/components/clipad/search/GlobalSearch';
import ThemeToggle from '@/components/layout/ThemeToggle';
import NotificationCenter from '@/components/clipad/notifications/NotificationCenter';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { getSavedAccounts } from '@/lib/multiAccountUtils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";

export default function ClipadTopNav({ forceMobile = false }) {
  const { user, logout, switchAccount } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [savedAccounts, setSavedAccounts] = useState([]);

  useEffect(() => {
    setSavedAccounts(getSavedAccounts());
  }, [user]);

  const firstName = user?.full_name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';

  const handleAddAccount = () => {
    navigate('/login?prompt=login');
  };

  return (
    <nav className="sticky top-0 z-40 shrink-0 flex items-center justify-between px-4 md:px-6 h-[64px] bg-[#006065]/95 backdrop-blur-md text-white border-b border-white/10 gap-3 shadow-lg transition-all">
      <div className="flex items-center gap-3 shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex-shrink-0 group relative p-[1px] rounded-full bg-[#fad503] shadow-[0_4px_20px_rgba(250,213,3,0.35)] hover:shadow-[0_6px_24px_rgba(250,213,3,0.5)] transition-all duration-300 active:scale-95 cursor-pointer">
              <div className="flex items-center h-9 bg-[#fad503] text-[#006065] rounded-full px-4 gap-1.5 font-black">
                <Video className="w-4 h-4 text-[#006065] group-hover:scale-110 transition-transform" />
                <span className="text-[13px] font-black text-[#006065] uppercase tracking-wider">Studio</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#006065] ml-0.5 group-hover:translate-y-0.5 transition-transform" />
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52 bg-[#006065] border-white/15 text-white shadow-2xl rounded-2xl p-1.5 backdrop-blur-xl">
            <DropdownMenuItem onClick={() => navigate('/videos')} className="cursor-pointer font-bold py-2.5 rounded-xl text-white hover:bg-white/10 focus:bg-white/10 transition-colors">
              <Video className="w-4 h-4 mr-2.5 text-[#fad503]" /> Record Async Video
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/meetings')} className="cursor-pointer font-bold py-2.5 rounded-xl text-white hover:bg-white/10 focus:bg-white/10 transition-colors">
              <Calendar className="w-4 h-4 mr-2.5 text-[#fad503]" /> Start Live Meeting
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>
      
      {/* Search & AI Bar — tablet and up */}
      <div className={cn("flex-1 flex items-center min-w-0 max-w-[520px] gap-3 justify-center", forceMobile ? "hidden" : "hidden md:flex")}>
        <GlobalSearch />
        
        {/* Top Bar AI Pill Button */}
        <button 
          onClick={() => window.dispatchEvent(new CustomEvent("toggle-clipad-orbit"))}
          className="flex-shrink-0 group relative p-[1px] rounded-full bg-[#fad503] shadow-[0_4px_20px_rgba(250,213,3,0.35)] hover:shadow-[0_6px_24px_rgba(250,213,3,0.5)] transition-all duration-300 active:scale-95 cursor-pointer"
        >
          <div className="flex items-center h-9 bg-[#fad503] text-[#006065] border border-transparent rounded-full px-4 gap-1.5 shadow-inner">
            <Sparkles className="w-[17px] h-[17px] text-[#006065] group-hover:rotate-12 transition-transform duration-300" />
            <span className="text-[13px] font-black text-[#006065] uppercase tracking-wider">AI</span>
          </div>
        </button>
      </div>

      <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
        <div className={forceMobile ? "hidden" : "hidden lg:block"}>
          <LanguageSwitcher />
        </div>
        
        <div className={forceMobile ? "hidden" : "hidden lg:block"}>
          <ThemeToggle />
        </div>
        
        {/* Spotlight - Mobile Only */}
        <button 
          onClick={() => window.dispatchEvent(new CustomEvent('open-global-search'))}
          className={cn("flex items-center justify-center w-[38px] h-[38px] rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-all relative cursor-pointer", forceMobile ? "flex" : "md:hidden")}
          title="Search"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Chat - All Devices */}
        <button 
          onClick={() => navigate('/chat')}
          className="flex items-center justify-center w-[38px] h-[38px] rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-all relative cursor-pointer"
          title="Chat"
        >
          <MessageSquare className="w-5 h-5" />
        </button>

        <NotificationCenter />

        <div className={forceMobile ? "hidden" : "hidden md:block"}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-9 h-9 rounded-xl bg-[#fad503] hover:bg-[#e6c402] flex items-center justify-center font-black text-sm text-[#006065] shadow-md transition-all hover:scale-105 active:scale-95 ml-1 overflow-hidden border border-white/20 cursor-pointer">
                {user?.avatar_url || user?.user_metadata?.avatar_url ? (
                  <img src={user.avatar_url || user.user_metadata.avatar_url} alt={firstName} className="w-full h-full object-cover" />
                ) : (
                  firstName[0]?.toUpperCase()
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 font-sans max-h-[85vh] overflow-y-auto mt-2 p-2 border-white/15 bg-[#006065] text-white backdrop-blur-xl rounded-2xl shadow-2xl">
              <DropdownMenuLabel className="font-semibold px-3 py-2 flex flex-col">
                <span className="text-white font-extrabold text-sm">{user?.full_name || 'User'}</span>
                <span className="text-xs text-white/60 font-normal">{user?.email}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              
              {/* Account Switcher Section */}
              <DropdownMenuSeparator className="bg-white/10 my-1" />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="cursor-pointer py-2.5 rounded-xl text-white hover:bg-white/10 focus:bg-white/10 font-medium">
                  <User className="mr-3 h-4 w-4 text-[#fad503]" />
                  <span>Switch Account</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="w-56 font-sans p-2 border-white/15 bg-[#006065] text-white rounded-2xl shadow-2xl">
                    {savedAccounts.filter(acc => acc.id !== user?.id).length > 0 && (
                      <>
                        <DropdownMenuLabel className="text-xs text-white/50 font-bold px-3 py-1.5 uppercase tracking-wider">
                          Available Accounts
                        </DropdownMenuLabel>
                        {savedAccounts.filter(acc => acc.id !== user?.id).map(acc => (
                          <DropdownMenuItem 
                            key={acc.id} 
                            onClick={() => switchAccount(acc.id)}
                            className="cursor-pointer flex items-center py-2.5 rounded-xl text-white hover:bg-white/10 focus:bg-white/10"
                          >
                            <div className="w-6 h-6 rounded-full bg-[#fad503] flex items-center justify-center mr-3 overflow-hidden shrink-0 border border-white/20">
                              {acc.avatar_url ? (
                                <img src={acc.avatar_url} alt={acc.full_name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[10px] font-black text-[#006065]">
                                  {acc.full_name ? acc.full_name[0].toUpperCase() : <User className="w-3 h-3"/>}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-semibold truncate">{acc.full_name || 'User'}</span>
                              <span className="text-xs text-white/60 truncate">{acc.email}</span>
                            </div>
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator className="bg-white/10 my-1" />
                      </>
                    )}
                    
                    <DropdownMenuItem onClick={handleAddAccount} className="cursor-pointer py-2.5 rounded-xl text-[#fad503] font-bold hover:bg-white/10 focus:bg-white/10">
                      <Plus className="mr-3 h-4 w-4" />
                      <span>Add another account</span>
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>

              <DropdownMenuSeparator className="bg-white/10 my-1" />
              <DropdownMenuItem onClick={async () => { await logout(); navigate('/login'); }} className="cursor-pointer py-2.5 rounded-xl text-rose-300 font-semibold hover:bg-rose-500/20 focus:bg-rose-500/20">
                <Activity className="mr-3 h-4 w-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
