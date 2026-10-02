import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Folder, Shield, BarChart2, Network, Clock, Scale, CheckSquare, Map, Plug, Search, Settings, HelpCircle, PanelLeftClose, PanelLeft, ChevronUp, ChevronDown, Activity, LogOut, Target, TrendingUp, GitMerge, HeartPulse, Sparkles, Home } from 'lucide-react';
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
  const actionWord = (planRank[currentPlan] || 0) > (planRank[targetPlan] || 0) ? 'Downgrade' : 'Upgrade';
  const displayPlanName = currentPlan === 'enterprise' ? 'Enterprise' : currentPlan === 'pro' ? 'Pro' : 'Free Tier';
  const targetPlanDisplay = targetPlan.charAt(0).toUpperCase() + targetPlan.slice(1);

  const handleUpgradeClick = async () => {
    if (!user || !user.email) {
      toast({ title: 'Error', description: 'User email is required for payment.', variant: 'destructive' });
      return;
    }

    const isUpgradingToEnterprise = targetPlan === 'enterprise';
    const amount = isUpgradingToEnterprise ? 300 : 100; // 300 GHS or 100 GHS

    try {
      await PaystackAPI.initializePayment(
        {
          email: user.email,
          amount: amount, 
          currency: 'GHS',
        },
        (response) => {
          console.log('Payment successful:', response);
          toast({ 
            title: 'Payment Successful!', 
            description: `You have successfully upgraded to ${isUpgradingToEnterprise ? 'Enterprise' : 'Pro'}.` 
          });
        },
        () => {
          console.log('Payment window closed.');
        }
      );
    } catch (error) {
      console.error(error);
      toast({ title: 'Payment Failed', description: 'Could not initialize Paystack payment.', variant: 'destructive' });
    }
  };

  const mainItems = [
    { label: 'Home', path: '/dashboard', icon: Home },
    { label: 'Search', path: '/search', icon: Search },
    { label: 'Spaces', path: '/spaces', icon: Folder },
  ];

  const isSuperAdmin = user?.role === 'super_admin';
  const intelligenceItems = [
    { label: 'Capture', path: '/capture', icon: Plug },
    { label: 'Analytics', path: '/analytics', icon: BarChart2 },
    { label: 'Graph', path: '/graph', icon: Network },
    { label: 'Timeline', path: '/timeline', icon: Clock },
    { label: 'Decisions', path: '/decisions', icon: Scale },
    { label: 'Action Items', path: '/action-items', icon: CheckSquare },
    { label: 'Knowledge', path: '/knowledge', icon: Map },
    ...(isSuperAdmin ? [
      { label: 'Commitment Engine', path: '/commitments', icon: Target },
      { label: 'Risk Intelligence', path: '/risk', icon: TrendingUp },
      { label: 'Org Health Pulse', path: '/pulse', icon: HeartPulse },
      { label: 'Cross-Space Intel', path: '/cross-space', icon: GitMerge },
    ] : []),
  ];

  const adminItems = [];

  if (isAdmin(user)) {
    adminItems.push({
      label: 'Knowledge Health',
      path: '/health',
      icon: Activity
    });
    adminItems.push({
      label: 'Custom Requests',
      path: '/admin/custom-requests',
      icon: Sparkles
    });
  }
  
  if (user?.role === 'super_admin') {
    adminItems.push({ 
      label: 'Super Admin', 
      path: '/admin', 
      icon: Shield 
    });
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
          "w-full flex items-center px-3 py-2.5 transition-all duration-200 group relative mb-1 rounded-xl",
          isCollapsed ? "justify-center" : "gap-3",
          isActive 
            ? "bg-[#fad503] text-[#006065] shadow-md font-extrabold" 
            : "text-white/75 hover:bg-white/10 hover:text-white font-medium"
        )}
        title={isCollapsed ? item.label : undefined}
      >
        <Icon className={cn("shrink-0 transition-transform duration-200 group-hover:scale-110", 
          isCollapsed ? "w-5 h-5" : "w-4 h-4",
          isActive ? "text-[#006065]" : "text-white/60 group-hover:text-white"
        )} strokeWidth={isActive ? 2.5 : 2} />
        
        {!isCollapsed && <span className="truncate text-sm">{item.label}</span>}
      </button>
    );
  };

  const rawWorkspaceName = user?.user_metadata?.company_name || 'Clipad';
  const workspaceName = rawWorkspaceName.split(' ')[0];
  const firstName = user?.full_name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'User';

  return (
    <aside 
      className={cn(
        "hidden md:flex flex-col bg-[#006065] text-white border-r border-white/10 transition-all duration-300 z-50 shrink-0 relative shadow-xl",
        forceMobile && "hidden",
        isCollapsed ? "w-[72px]" : "w-[260px]",
        "h-full overflow-hidden"
      )}
    >
      {/* Header */}
      <div className={cn("h-[64px] flex items-center shrink-0 transition-all border-b border-white/10 bg-[#006065]", isCollapsed ? "px-0 justify-center" : "px-4 justify-between")}>
        {isCollapsed ? (
          <button 
            onClick={() => setIsCollapsed(false)} 
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all hover:scale-105"
            title="Expand sidebar"
          >
            <PanelLeft className="w-5 h-5" />
          </button>
        ) : (
          <>
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/dashboard')}>
              <div className="w-9 h-9 rounded-xl bg-[#00beac] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <CliPadLogo size={20} color="#ffffff" />
              </div>
              <div>
                <span className="font-black text-[16px] text-white truncate block leading-tight">{workspaceName}</span>
                <span className="text-[10px] font-bold text-[#00beac] uppercase tracking-wider">Pro Account</span>
              </div>
            </div>
            <button onClick={() => setIsCollapsed(true)} className="text-white/60 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10">
              <PanelLeftClose className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      <div className={cn("flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-white/5 [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/30 pb-4 bg-[#006065]", isCollapsed ? "px-2" : "px-3")}>
        {/* Menu */}
        <div className="py-2">
          {!isCollapsed && <div className="px-3 py-1.5 text-[11px] font-bold text-white/40 tracking-wider uppercase">General</div>}
          {mainItems.map(renderNavItem)}
        </div>
        
        <div className="h-px bg-white/10 my-2 mx-2" />

        {/* Intelligence */}
        <div className="py-1">
          {!isCollapsed ? (
            <button 
              onClick={() => toggleSection('intelligence')}
              className="w-full flex items-center justify-between px-3 py-2 text-[12px] font-bold text-white/40 hover:text-white tracking-wide uppercase transition-colors"
            >
              <span>Intelligence</span>
              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform text-white/60", openSections.intelligence && "rotate-180")} />
            </button>
          ) : (
            <div className="px-3 py-2 text-[10px] font-bold text-white/40 tracking-wider uppercase text-center cursor-pointer" onClick={() => setIsCollapsed(false)}>INT</div>
          )}
          {(openSections.intelligence || isCollapsed) && (
            <div className="mt-1 space-y-0.5">
              {intelligenceItems.map(renderNavItem)}
            </div>
          )}
        </div>

        {adminItems.length > 0 && (
          <>
            <div className="h-px bg-white/10 my-2 mx-2" />
            <div className="py-1">
              {!isCollapsed ? (
                <button 
                  onClick={() => toggleSection('admin')}
                  className="w-full flex items-center justify-between px-3 py-2 text-[12px] font-bold text-white/40 hover:text-white tracking-wide uppercase transition-colors"
                >
                  <span>Admin</span>
                  <ChevronDown className={cn("w-3.5 h-3.5 transition-transform text-white/60", openSections.admin && "rotate-180")} />
                </button>
              ) : (
                <div className="px-3 py-2 text-[10px] font-bold text-white/40 tracking-wider uppercase text-center cursor-pointer" onClick={() => setIsCollapsed(false)}>ADM</div>
              )}
              {(openSections.admin || isCollapsed) && (
                <div className="mt-1 space-y-0.5">
                  {adminItems.map(renderNavItem)}
                </div>
              )}
            </div>
          </>
        )}

        <div className="h-px bg-white/10 my-4 mx-2" />

        {/* Bottom Nav */}
        <div className="space-y-0.5 mb-2">
          <button 
            onClick={() => navigate('/settings')} 
            className={cn("w-full flex items-center rounded-xl text-[14px] text-white/75 hover:bg-white/10 hover:text-white font-medium group transition-colors", isCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5")}
            title={isCollapsed ? "Preferences" : undefined}
          >
            <Settings className="w-4 h-4 text-white/60 group-hover:text-white" />
            {!isCollapsed && <span>Preferences</span>}
          </button>
          
          <button 
            onClick={() => navigate('/support')} 
            className={cn("w-full flex items-center rounded-xl text-[14px] text-white/75 hover:bg-white/10 hover:text-white font-medium group transition-colors", isCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5")}
            title={isCollapsed ? "Help & Support" : undefined}
          >
            <HelpCircle className="w-4 h-4 text-white/60 group-hover:text-white" />
            {!isCollapsed && <span>Help & Support</span>}
          </button>
        </div>
      </div>

      {/* User Profile Footer */}
      <div className={cn("p-4 border-t border-white/10 bg-[#006065] text-white", isCollapsed ? "flex justify-center" : "")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="w-9 h-9 shrink-0 rounded-full bg-[#00beac] flex items-center justify-center overflow-hidden border border-white/20">
                {user?.avatar_url || user?.user_metadata?.avatar_url ? (
                  <img src={user.avatar_url || user.user_metadata.avatar_url} alt={firstName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-black text-white">{firstName[0]?.toUpperCase()}</span>
                )}
              </div>
              {!isCollapsed && (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-white truncate group-hover:text-[#00beac] transition-colors">{firstName}</p>
                    <p className="text-[11px] text-white/60 truncate">{displayPlanName}</p>
                  </div>
                  <ChevronUp className="w-4 h-4 text-white/60 group-hover:text-white transition-colors" />
                </>
              )}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={isCollapsed ? "center" : "end"} className="w-56 font-sans bg-[#006065] border-white/15 text-white shadow-2xl">
            <DropdownMenuLabel className="font-semibold px-3 py-2 flex flex-col">
              <span className="text-white font-bold">{user?.full_name || 'User'}</span>
              <span className="text-xs text-white/60 font-normal">{user?.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            {user?.role === 'super_admin' && (
              <DropdownMenuItem 
                onClick={() => navigate(window.location.pathname.startsWith('/clipad') ? '/clipad/admin' : '/admin')} 
                className="cursor-pointer py-2 text-white hover:bg-white/10 focus:bg-white/10"
              >
                <Shield className="mr-3 h-4 w-4 text-[#fad503]" />
                <span>Super Admin</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem 
              onClick={async () => { await logout(); navigate('/login'); }} 
              className="cursor-pointer py-2 text-rose-300 hover:bg-rose-500/20 focus:bg-rose-500/20"
            >
              <LogOut className="mr-3 h-4 w-4" />
              <span>Log Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
