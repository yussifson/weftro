import React from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import GlobalAIAssistant from '@/components/layout/GlobalAIAssistant';
import ClipadMobileNav from '@/components/clipad/ClipadMobileNav';
import ClipadTopNav from '@/components/clipad/ClipadTopNav';
import ClipadSidebar from '@/components/clipad/ClipadSidebar';
import { useChatDock } from '@/hooks/useChatDock';
import { safeLazy } from '@/lib/safeLazy';
const ClipadChat = safeLazy(() => import('@/pages/clipad/ClipadChat'));
import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

import PullToRefresh from '@/components/ui/PullToRefresh';

import DockResizer from './DockResizer';

export default function ClipadLayout() {
  const [isAIOpen, setIsAIOpen] = React.useState(false);
  const [injectedContext, setInjectedContext] = React.useState(null);
  const { isChatDocked, setChatDock, dockWidth } = useChatDock();
  const location = useLocation();

  const containerRef = React.useRef(null);
  const [forceMobile, setForceMobile] = React.useState(false);

  React.useEffect(() => {
    const handleResize = () => setForceMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-undock if we navigate back to the main chat page
  React.useEffect(() => {
    if (location.pathname === '/chat' && isChatDocked) {
      setChatDock(false);
    }
  }, [location.pathname, isChatDocked, setChatDock]);

  // Expose toggle globally for Clipad pages to call it
  React.useEffect(() => {
    const handleToggle = () => setIsAIOpen(prev => !prev);
    const handleOrbitInject = (e) => {
      setIsAIOpen(true);
      if (e.detail) {
        setInjectedContext(e.detail);
      }
    };
    window.addEventListener('toggle-clipad-orbit', handleToggle);
    window.addEventListener('orbit:inject', handleOrbitInject);
    return () => {
      window.removeEventListener('toggle-clipad-orbit', handleToggle);
      window.removeEventListener('orbit:inject', handleOrbitInject);
    };
  }, []);

  // Hide sidebar and topnav when inside live immersive video meeting rooms
  const isImmersive = location.pathname.startsWith('/join');

  return (
    <div data-theme="brand" className="flex flex-row h-[100dvh] w-full overflow-hidden bg-[#f8fafc] dark:bg-background text-[#0f172a] dark:text-foreground pt-[var(--sat)] pb-[var(--sab)] pl-[var(--sal)] pr-[var(--sar)]">
      
      {/* Premium Sidebar Component */}
      {!isImmersive && <ClipadSidebar forceMobile={forceMobile} />}

      {/* Main Content Column */}
      <div ref={containerRef} className="flex flex-col flex-1 w-0 overflow-hidden relative @container bg-[#f8fafc] dark:bg-background transition-all">
        {!isImmersive && <ClipadTopNav forceMobile={forceMobile} />}
        <PullToRefresh className={cn("relative z-30 page-enter h-full overflow-x-hidden scrollbar-thin", isImmersive ? "pb-0 overflow-y-hidden" : "pb-[80px] md:pb-0 overflow-y-auto")}>
          {location.pathname === '/chat' && isChatDocked ? (
            <div className="flex items-center justify-center h-full text-white flex-col gap-3">
              <MessageSquare className="w-8 h-8 opacity-50" />
              <p>Chat is currently docked to the right sidebar.</p>
            </div>
          ) : (
            <React.Suspense fallback={
              <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full animate-pulse space-y-6">
                <div className="h-10 w-64 bg-white/20 rounded-xl" />
                <div className="h-4 w-96 bg-white/15 rounded-lg" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1,2,3,4].map(i => <div key={i} className="h-32 bg-white/15 rounded-2xl" />)}
                </div>
              </div>
            }>
              <Outlet />
            </React.Suspense>
          )}
        </PullToRefresh>
      </div>

      {/* Persistent Docked Chat Window */}
      {isChatDocked && location.pathname !== '/chat' && (
        <div 
          style={{ width: `${dockWidth}px` }} 
          className="hidden md:flex flex-col h-full bg-[#006065] dark:bg-[#0A0F1C] border-l border-white/15 shrink-0 relative z-30 shadow-2xl transition-all"
        >
          <DockResizer />
          <React.Suspense fallback={<div className="p-4 text-white">Loading chat...</div>}>
            <ClipadChat isDocked={true} onCloseDock={() => setChatDock(false)} />
          </React.Suspense>
        </div>
      )}

      {/* Global AI Assistant Floating Overlay */}
      {!isImmersive && (
        <GlobalAIAssistant 
          isOpen={isAIOpen} 
          onClose={() => { setIsAIOpen(false); setInjectedContext(null); }} 
          injectedContext={injectedContext}
        />
      )}

      {/* Native Mobile Bottom Navigation Bar */}
      {!isImmersive && <ClipadMobileNav forceMobile={forceMobile} />}
    </div>
  );
}
