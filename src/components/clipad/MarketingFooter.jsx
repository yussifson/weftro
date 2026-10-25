import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CliPadLogo } from '@/components/ui/CliPadLogo';
import { Globe } from 'lucide-react';

export default function MarketingFooter({ onOpenSupport }) {
  const navigate = useNavigate();

  const handleScrollTo = (sectionId) => {
    if (window.location.pathname === '/' || window.location.pathname === '/home' || window.location.pathname === '/meet') {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    navigate(`/#${sectionId}`);
  };

  return (
    <footer className="border-t border-border py-12 px-6 md:px-12 bg-slate-50 dark:bg-background/50 select-none">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Tier: Brand & Main Navigation */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-border/60">
          <div className="flex items-center gap-3">
            <CliPadLogo height={28} />
            <span className="text-xs text-muted-foreground font-medium">
              &copy; {new Date().getFullYear()} Optavel Technologies. All rights reserved.
            </span>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
            <button 
              type="button" 
              onClick={() => {
                if (window.location.pathname === '/' || window.location.pathname === '/home') {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                  navigate('/');
                }
              }} 
              className="hover:text-foreground transition-colors font-medium cursor-pointer"
            >
              Home
            </button>
            <button 
              type="button" 
              onClick={() => handleScrollTo('features')} 
              className="hover:text-foreground transition-colors font-medium cursor-pointer"
            >
              Features
            </button>
            <button 
              type="button" 
              onClick={() => handleScrollTo('intelligence')} 
              className="hover:text-foreground transition-colors font-medium cursor-pointer"
            >
              Intelligence
            </button>
            <button 
              type="button" 
              onClick={() => handleScrollTo('pricing')} 
              className="hover:text-foreground transition-colors font-medium cursor-pointer"
            >
              Pricing
            </button>
            {onOpenSupport && (
              <button 
                type="button" 
                onClick={() => onOpenSupport('chat')} 
                className="hover:text-foreground transition-colors font-medium cursor-pointer"
              >
                Support
              </button>
            )}
          </div>
        </div>

        {/* Bottom Tier: Standalone Page Quick Links & Corporate Link */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-foreground uppercase tracking-wider text-[10px]">Quick Links:</span>
            <div className="flex flex-wrap items-center gap-4">
              <button 
                type="button" 
                onClick={() => navigate('/pricing')} 
                className="hover:text-foreground hover:underline transition-colors cursor-pointer"
              >
                Pricing Plans
              </button>
              <button 
                type="button" 
                onClick={() => navigate('/security')} 
                className="hover:text-foreground hover:underline transition-colors cursor-pointer"
              >
                Security & Compliance
              </button>
              <button 
                type="button" 
                onClick={() => navigate('/custom-pricing')} 
                className="hover:text-foreground hover:underline transition-colors cursor-pointer"
              >
                Enterprise Solutions
              </button>
              <button 
                type="button" 
                onClick={() => navigate('/about')} 
                className="hover:text-foreground hover:underline transition-colors cursor-pointer"
              >
                About Weftro
              </button>
              <button 
                type="button" 
                onClick={() => navigate('/developers')} 
                className="hover:text-foreground hover:underline transition-colors cursor-pointer"
              >
                Developer Platform
              </button>
            </div>
          </div>

          <a 
            href="https://optavel.com" 
            target="_blank" 
            rel="noreferrer" 
            className="hover:text-foreground transition-colors flex items-center gap-1.5 font-medium"
          >
            <Globe className="w-3.5 h-3.5 text-primary" /> optavel.com
          </a>
        </div>

      </div>
    </footer>
  );
}
