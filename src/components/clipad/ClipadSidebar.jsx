import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Folder, Shield, BarChart2, Network, Clock, Scale, CheckSquare, Map as MapIcon, Plug, Search, Settings, HelpCircle, PanelLeftClose, PanelLeft, ChevronUp, ChevronDown, Activity, LogOut, Target, TrendingUp, GitMerge, HeartPulse, Sparkles, Home, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CliPadLogo } from '@/components/ui/CliPadLogo';
import { useAuth } from '@/lib/AuthContext';
import { isAdmin } from '@/lib/constants';
import PaystackAPI from '@/api/PaystackAPI';
import { useToast } from '@/components/ui/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ClipadSidebar({ forceMobile }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openSections, setOpenSections] = useState({ intelligence: true, admin: true });

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const currentPlan = user?.clipad_plan || 'free';
  const planRank = { free: 0, pro: 1, enterprise: 2 };
  const targetPlan = currentPlan === 'free' ? 'pro' : currentPlan === 'pro' ? 'enterprise' : 'pro';
  const displayPlanName = currentPlan === 'enterprise' ? 'Enterprise' : currentPlan === 'pro' ? 'Pro' : 'Free Tier';

  const handleUpgradeClick = async () => {
    if (!user || !user.email) {
      toast({ title: 'Error', description: 'User email is required for payment.', variant: 'destructive' });
      return;
    }
    const isUpgradingToEnterprise = targetPlan === 'enterprise';
    const amount = isUpgradingToEnterprise ? 300 : 100;
    try {
      await PaystackAPI.initializePayment(
        { email: user.email, amount: amount, currency: 'GHS' },
        (response) => {
          console.log('Payment successful:', response);
          toast({ title: 'Payment Successful!', description: `You have successfully upgraded to ${isUpgradingToEnterprise ? 'Enterprise' : 'Pro'}.` });
        },
        () => console.log('Payment window closed.')
      );
    } catch (error) {
      toast({ title: 'Payment Failed', description: 'Could not initialize Paystack payment.', variant: 'destructive' });
    }
  };

  const mainItems = [
    { label: 'Home', path: '/dashboard', icon: Home },
    { label: 'Search', path: '/search', icon: Search },
    { label: 'Spaces', path: '/spaces', icon: Folder },
  ];

  const isSuperAdmin = user?.role === 'super_admin';
  const isUserAdmin = isAdmin(user);
  const intelligenceItems = [
    { label: 'Capture', path: '/capture', icon: Inbox },
    { label: 'Integrations', path: '/integrations', icon: Plug },
    ...(isUserAdmin ? [
      { label: 'Analytics', path: '/integration-analytics', icon: BarChart2 },
    ] : []),
    { label: 'Graph', path: '/graph', icon: Network },
    { label: 'Timeline', path: '/timeline', icon: Clock },
    { label: 'Decisions', path: '/decisions', icon: Scale },
    { label: 'Action Items', path: '/action-items', icon: CheckSquare },
    { label: 'Knowledge', path: '/knowledge', icon: MapIcon },
    ...(isSuperAdmin ? [
      { label: 'Commitment Engine', path: '/commitments', icon: Target },
      { label: 'Risk Intelligence', path: '/risk', icon: TrendingUp },
      { label: 'Org Health Pulse', path: '/pulse', icon: HeartPulse },
      { label: 'Cross-Space Intel', path: '/cross-space', icon: GitMerge },
    ] : []),
  ];

  const adminItems = [];
  if (isAdmin(user)) {
    adminItems.push({ label: 'Knowledge Health', path: '/health', icon: Activity });
  }
  if (user?.role === 'super_admin') {
    adminItems.push({ label: 'Super Admin', path: '/admin', icon: Shield });
  }

  const renderNavItem = (item) => {
    const isLegacyPath = window.location.pathname.startsWith('/clipad');
    const targetPath = isLegacyPath ? `/clipad${item.path}` : item.path;
    const isActive = location.pathname.startsWith(targetPath) || (item.path === '/search' && location.pathname === '/');
    const Icon = item.icon;
    
    return (
      <button
        key={item.path}
        onClick={() => navigate(targetPath)}
        className={cn(
          "w-full flex items-center transition-all duration-200 group relative rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-white/50",
          isCollapsed ? "justify-center px-0 py-2.5 mb-1" : "gap-3 px-3 py-2 mb-1",
          isActive 
            ? "bg-gradient-to-r from-[#fad503]/20 to-transparent text-[#fad503] font-bold shadow-sm" 
            : "text-white/70 hover:bg-white/10 hover:text-white font-medium"
        )}
        title={isCollapsed ? item.label : undefined}
      >
        {isActive && !isCollapsed && (
          <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#fad503] rounded-r-full shadow-[0_0_8px_rgba(250,213,3,0.6)]" />
        )}
        <Icon className={cn(
          "shrink-0 transition-all duration-300", 
          isCollapsed ? "w-5 h-5 group-hover:scale-110" : "w-4 h-4",
          isActive ? "text-[#fad503]" : "text-white/60 group-hover:text-white"
        )} strokeWidth={isActive ? 2.5 : 2} />
        
        {!isCollapsed && <span className="truncate text-[13px] tracking-wide">{item.label}</span>}
      </button>
    );
  };

  const rawWorkspaceName = user?.user_metadata?.company_name || 'Weftro';
  const workspaceName = rawWorkspaceName.split(' ')[0];
  const firstName = user?.full_name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'User';

  return (
    <aside 
      className={cn(
        "hidden md:flex flex-col bg-[#006065] dark:bg-[#091114] text-white border-r border-white/10 dark:border-white/5 transition-all duration-300 ease-in-out z-50 shrink-0 relative shadow-2xl",
        forceMobile && "hidden",
        isCollapsed ? "w-[72px]" : "w-[240px]",
        "h-full overflow-hidden"
      )}
    >
      {/* Header */}
      <div className={cn("h-[72px] flex items-center shrink-0 transition-all border-b border-white/10 dark:border-white/5 bg-[#006065] dark:bg-[#091114]", isCollapsed ? "px-0 justify-center" : "px-5 justify-between")}>
        {isCollapsed ? (
          <button 
            onClick={() => setIsCollapsed(false)} 
            className="w-10 h-10 rounded-xl hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all hover:scale-105"
            title="Expand sidebar"
          >
            <PanelLeft className="w-5 h-5" />
          </button>
        ) : (
          <>
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/dashboard')}>
              <div className="flex items-center transition-transform group-hover:scale-105">
                <CliPadLogo height={32} white={true} />
              </div>
            </div>
            <button onClick={() => setIsCollapsed(true)} className="text-white/50 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10 opacity-0 group-hover:opacity-100 lg:opacity-100">
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      <div className={cn("flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 hover:scrollbar-thumb-white/30 scrollbar-track-transparent py-4 bg-[#006065] dark:bg-[#091114]", isCollapsed ? "px-2" : "px-3")}>
        {/* Menu */}
        <div className="mb-4">
          {!isCollapsed && <div className="px-3 pb-2 text-[11px] font-bold text-white/40 tracking-widest uppercase">General</div>}
          {mainItems.map(renderNavItem)}
        </div>

        {/* Intelligence */}
        <div className="mb-4">
          {!isCollapsed ? (
            <button 
              onClick={() => toggleSection('intelligence')} 
              className="w-full flex items-center justify-between px-3 pb-2 pt-4 text-[11px] font-bold text-white/40 hover:text-white tracking-widest uppercase transition-colors"
            >
              <span>Intelligence</span>
              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform text-white/60", openSections.intelligence && "rotate-180")} />
            </button>
          ) : (
            <div className="mt-6 mb-2 text-[9px] font-black text-white/40 tracking-wider uppercase text-center cursor-pointer" onClick={() => setIsCollapsed(false)}>INT</div>
          )}
          {(openSections.intelligence || isCollapsed) && (
            <div className="space-y-0.5">
              {intelligenceItems.map(renderNavItem)}
            </div>
          )}
        </div>

        {adminItems.length > 0 && (
          <div className="mb-4">
            {!isCollapsed ? (
              <button 
                onClick={() => toggleSection('admin')} 
                className="w-full flex items-center justify-between px-3 pb-2 pt-4 text-[11px] font-bold text-white/40 hover:text-white tracking-widest uppercase transition-colors"
              >
                <span>Admin</span>
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform text-white/60", openSections.admin && "rotate-180")} />
              </button>
            ) : (
              <div className="mt-6 mb-2 text-[9px] font-black text-white/40 tracking-wider uppercase text-center cursor-pointer" onClick={() => setIsCollapsed(false)}>ADM</div>
            )}
            {(openSections.admin || isCollapsed) && (
              <div className="space-y-0.5">
                {adminItems.map(renderNavItem)}
              </div>
            )}
          </div>
        )}

        {/* Bottom Preferences & Help inside scrollable area */}
        <div className="pt-4 mt-4 border-t border-white/10 dark:border-white/5 space-y-0.5">
          <button 
            onClick={() => navigate('/settings')} 
            className={cn("w-full flex items-center rounded-lg text-[13px] text-white/70 hover:bg-white/10 hover:text-white font-medium group transition-colors", isCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2")}
            title={isCollapsed ? "Preferences" : undefined}
          >
            <Settings className="w-4 h-4 shrink-0 text-white/60 group-hover:text-white" />
            {!isCollapsed && <span>Preferences</span>}
          </button>
          
          <button 
            onClick={() => navigate('/support')} 
            className={cn("w-full flex items-center rounded-lg text-[13px] text-white/70 hover:bg-white/10 hover:text-white font-medium group transition-colors", isCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2")}
            title={isCollapsed ? "Help & Support" : undefined}
          >
            <HelpCircle className="w-4 h-4 shrink-0 text-white/60 group-hover:text-white" />
            {!isCollapsed && <span>Help & Support</span>}
          </button>
        </div>
      </div>

      {/* User Profile Footer */}
      <div className={cn("p-4 border-t border-white/10 dark:border-white/5 bg-[#004e52] dark:bg-[#060B0D] text-white", isCollapsed ? "flex justify-center" : "")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-3 cursor-pointer group outline-none">
              <div className="w-10 h-10 shrink-0 rounded-full bg-[#fad503] flex items-center justify-center overflow-hidden border-2 border-white/10 group-hover:border-white/30 transition-all">
                {user?.avatar_url || user?.user_metadata?.avatar_url ? (
                  <img src={user.avatar_url || user.user_metadata.avatar_url} alt={firstName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-black text-[#006065]">{firstName[0]?.toUpperCase()}</span>
                )}
              </div>
              {!isCollapsed && (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-white truncate group-hover:text-[#fad503] transition-colors">{firstName}</p>
                    <p className="text-[11px] font-medium text-white/60 truncate uppercase tracking-wider">{displayPlanName}</p>
                  </div>
                  <ChevronUp className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
                </>
              )}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={isCollapsed ? "center" : "end"} className="w-56 font-sans bg-[#006065] dark:bg-[#091114] border-white/10 text-white shadow-2xl rounded-xl">
            <DropdownMenuLabel className="font-semibold px-4 py-3 flex flex-col gap-0.5">
              <span className="text-white font-bold text-sm">{user?.full_name || 'User'}</span>
              <span className="text-xs text-white/60 font-medium truncate">{user?.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            {user?.role === 'super_admin' && (
              <DropdownMenuItem 
                onClick={() => navigate(window.location.pathname.startsWith('/clipad') ? '/clipad/admin' : '/admin')} 
                className="cursor-pointer py-2.5 px-4 text-white hover:bg-white/10 focus:bg-white/10 transition-colors"
              >
                <Shield className="mr-3 h-4 w-4 text-[#fad503]" />
                <span className="font-medium">Super Admin</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem 
              onClick={async () => { await logout(); navigate('/login'); }} 
              className="cursor-pointer py-2.5 px-4 text-rose-300 hover:bg-rose-500/20 focus:bg-rose-500/20 transition-colors"
            >
              <LogOut className="mr-3 h-4 w-4" />
              <span className="font-medium">Log Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
