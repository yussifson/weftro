import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CliPadLogo } from '@/components/ui/CliPadLogo';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useAuth } from '@/lib/AuthContext';
import { Layers, Menu, X } from 'lucide-react';

export default function MarketingHeader({ onOpenSupport }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isHome = location.pathname === '/' || location.pathname === '/home' || location.pathname === '/marketing' || location.pathname === '/meet';

  const scrollToSection = (sectionId) => {
    setMobileOpen(false);
    if (isHome) {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    // If on another page, navigate to home with the hash
    navigate(`/#${sectionId}`);
  };

  const navItems = [
    { label: 'Features', action: () => scrollToSection('features') },
    { label: 'Pricing', action: () => scrollToSection('pricing') },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/90 backdrop-blur-md shadow-sm transition-colors">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div 
          className="flex items-center gap-3 cursor-pointer shrink-0" 
          onClick={() => {
            if (isHome) {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              navigate('/');
            }
          }}
        >
          <CliPadLogo height={32} />
        </div>
        
        {/* Desktop Nav - In-page jump links for marketing */}
        <nav className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/60 border border-border/80 shadow-inner">
          {navItems.map((item, idx) => (
            <React.Fragment key={item.label}>
              {idx > 0 && <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />}
              <button
                type="button"
                onClick={item.action}
                className="px-4 py-1.5 text-xs font-semibold tracking-wide text-foreground/80 hover:text-foreground hover:bg-background/80 rounded-full transition-all duration-150 cursor-pointer"
              >
                {item.label}
              </button>
            </React.Fragment>
          ))}
          
          {onOpenSupport && (
            <>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
              <button 
                type="button"
                onClick={() => { setMobileOpen(false); onOpenSupport('chat'); }}
                className="px-4 py-1.5 text-xs font-semibold tracking-wide text-foreground/80 hover:text-foreground hover:bg-background/80 rounded-full transition-all duration-150 cursor-pointer"
              >
                Support
              </button>
            </>
          )}
        </nav>
        
        {/* Right Action Items */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:block">
            <LanguageSwitcher className="h-9 w-[130px] rounded-xl border border-border bg-background hover:bg-secondary text-foreground text-xs font-medium" />
          </div>

          {user ? (
            <Button onClick={() => navigate('/dashboard')} className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4 h-9 shadow-sm">
              <Layers className="w-4 h-4 mr-1.5" /> Dashboard
            </Button>
          ) : (
            <>
              <Button onClick={() => navigate('/login')} variant="outline" className="hidden sm:inline-flex rounded-xl border-border bg-background hover:bg-secondary text-foreground text-xs font-semibold px-4 h-9">
                Sign In
              </Button>
              <Button onClick={() => navigate('/signup')} className="rounded-xl bg-[#0C5C3C] hover:bg-[#0E6C47] text-white text-xs font-bold px-4 h-9 shadow-sm">
                Get Started
              </Button>
            </>
          )}

          {/* Mobile hamburger toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-b border-border bg-background/95 backdrop-blur-xl px-6 py-4 space-y-3 shadow-xl animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 gap-2">
            {navItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.action}
                className="text-left px-3 py-2 text-xs font-semibold text-foreground/80 hover:text-foreground hover:bg-secondary rounded-xl transition-colors"
              >
                {item.label}
              </button>
            ))}
            {onOpenSupport && (
              <button
                type="button"
                onClick={() => { setMobileOpen(false); onOpenSupport('chat'); }}
                className="text-left px-3 py-2 text-xs font-semibold text-foreground/80 hover:text-foreground hover:bg-secondary rounded-xl transition-colors"
              >
                Support
              </button>
            )}
          </div>
          <div className="pt-2 border-t border-border flex items-center justify-between gap-3">
            <LanguageSwitcher className="h-8 w-full rounded-lg border border-border bg-background text-foreground text-xs font-medium" />
            {!user && (
              <Button onClick={() => { setMobileOpen(false); navigate('/login'); }} variant="outline" className="h-8 w-full text-xs font-semibold rounded-lg">
                Sign In
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
