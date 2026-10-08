import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SEO from '@/components/seo/SEO';
import { generateShortId } from '@/utils/idGenerator';
import { Button } from '@/components/ui/button';
import { Menu, X, ArrowRight, ShieldCheck, CheckCircle, Video, Calendar, Search, Users, Shield, Zap, Globe, FileText, BarChart2 } from 'lucide-react';
import { CliPadLogo } from '@/components/ui/CliPadLogo';
import { useAuth } from '@/lib/AuthContext';
import ContactSalesModal from '@/components/clipad/ContactSalesModal';
import PaymentReceiptModal from '@/components/clipad/PaymentReceiptModal';
import SupportAIChat from '@/components/clipad/SupportAIChat';
import ClipadMobileNav from '@/components/clipad/ClipadMobileNav';

export default function MeetLandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [supportPanel, setSupportPanel] = useState(null); 
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [receiptDetails, setDetails] = useState(null);

  // Force light mode on landing page (defense in depth)
  useEffect(() => {
    const root = window.document.documentElement;
    const originalClass = root.className;
    root.classList.remove('dark');
    root.classList.add('light');
    root.style.colorScheme = 'light';
    return () => {
      root.className = originalClass;
      root.style.colorScheme = '';
    };
  }, []);

  const startMeeting = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/signup');
    }
  };

  const navLinks = [
    { label: 'Platform', href: '#features' },
    { label: 'Solutions', href: '#solutions' },
    { label: 'Security', href: '#security' },
    { label: 'Pricing', href: '#pricing' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-[#006065] selection:text-white">
      <SEO 
        title="KERINT - Enterprise Organizational Memory Platform" 
        description="The secure, unified workspace for corporate productivity, communication, and knowledge retention." 
        type="website"
      />

      {/* Corporate Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
            <div className="text-[#006065]">
              <CliPadLogo size={28} />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">KERINT</span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a key={link.label} href={link.href} className="text-sm font-semibold text-slate-600 hover:text-[#006065] transition-colors">
                {link.label}
              </a>
            ))}
          </nav>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <Button onClick={() => navigate('/dashboard')} className="bg-[#006065] hover:bg-[#004e52] text-white rounded-full px-6 font-semibold shadow-sm">
                Go to Workspace <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate('/login')} className="text-slate-600 font-semibold hover:text-[#006065]">
                  Sign In
                </Button>
                <Button onClick={() => navigate('/signup')} className="bg-[#006065] hover:bg-[#004e52] text-white rounded-full px-6 font-semibold shadow-sm">
                  Start Free Trial
                </Button>
              </>
            )}
          </div>

          {/* Mobile Toggle */}
          <button className="md:hidden p-2 text-slate-600" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <ClipadMobileNav 
          isOpen={isMobileMenuOpen} 
          onClose={() => setIsMobileMenuOpen(false)}
          onSupportClick={() => setSupportPanel('help')}
        />
      )}

      <main>
        {/* Enterprise Hero Section */}
        <section className="relative pt-24 pb-32 overflow-hidden bg-white">
          <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-40"></div>
          <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 mb-8">
              <span className="flex h-2 w-2 rounded-full bg-[#006065]"></span>
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Enterprise Platform V3 is Live</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-tight max-w-4xl mx-auto mb-6">
              The System of Record for <br className="hidden md:block"/> 
              <span className="text-[#006065]">Organizational Memory</span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
              Capture meetings, automate compliance, and unify corporate knowledge in one highly secure, deeply integrated workspace.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button onClick={startMeeting} className="w-full sm:w-auto bg-[#006065] hover:bg-[#004e52] text-white h-14 px-8 rounded-full text-base font-bold shadow-md hover:shadow-lg transition-all">
                {user ? 'Open Dashboard' : 'Deploy for your Organization'}
              </Button>
              <Button onClick={() => setIsContactModalOpen(true)} variant="outline" className="w-full sm:w-auto h-14 px-8 rounded-full text-base font-bold border-slate-300 text-slate-700 hover:bg-slate-50">
                Contact Sales
              </Button>
            </div>

            {/* Dashboard Preview Mockup */}
            <div className="mt-20 mx-auto max-w-5xl rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
              <div className="h-10 bg-slate-100 border-b border-slate-200 flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                <div className="w-3 h-3 rounded-full bg-slate-300"></div>
              </div>
              <div className="aspect-[16/9] bg-slate-50 relative flex items-center justify-center">
                <CliPadLogo size={80} className="opacity-10 grayscale" />
              </div>
            </div>
          </div>
        </section>

        {/* Corporate Trust Banner */}
        <section className="border-y border-slate-200 bg-slate-50 py-10">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-6">Trusted by Enterprise Leaders</p>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale">
              <div className="text-xl font-bold font-serif">ACME Corp</div>
              <div className="text-xl font-bold tracking-widest">GLOBALTECH</div>
              <div className="text-xl font-bold font-mono">FINANCE_IQ</div>
              <div className="text-xl font-bold italic">HealthSystems</div>
            </div>
          </div>
        </section>

        {/* Clean Grid Features Section */}
        <section id="features" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Unified Productivity Architecture</h2>
              <p className="text-lg text-slate-600">Everything your team needs to collaborate, documented and archived securely in real-time.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { icon: Video, title: 'HD Secure Meetings', desc: 'End-to-end encrypted video conferencing with automatic transcriptions and enterprise access controls.' },
                { icon: Zap, title: 'Automated Processing', desc: 'Instant extraction of action items, decisions, and knowledge blocks from every corporate interaction.' },
                { icon: Search, title: 'Global Knowledge Index', desc: 'Cross-functional search across all spaces, docs, and historical meetings with granular permissions.' },
                { icon: Shield, title: 'Compliance Ready', desc: 'Built-in governance, audit logs, and customizable data retention policies for highly regulated industries.' },
                { icon: FileText, title: 'Rich Documentation', desc: 'Integrated asynchronous collaborative documentation tied directly to organizational decisions.' },
                { icon: BarChart2, title: 'Organizational Insights', desc: 'Executive dashboards tracking strategic alignment, meeting ROI, and corporate health metrics.' },
              ].map((feature, idx) => (
                <div key={idx} className="p-8 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center mb-6">
                    <feature.icon className="w-6 h-6 text-[#006065]" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Security / Corporate Section */}
        <section id="security" className="py-24 bg-slate-900 text-white">
          <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 mb-6">
                <ShieldCheck className="w-4 h-4 text-[#fad503]" />
                <span className="text-[11px] font-bold text-white uppercase tracking-widest">Enterprise Grade Security</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-6">Protect your most valuable asset: Your knowledge.</h2>
              <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                KERINT is designed from the ground up for strict data sovereignty. Deploy with confidence knowing your organizational memory is protected by military-grade encryption and comprehensive audit controls.
              </p>
              <ul className="space-y-4">
                {[
                  'SOC 2 Type II Compliant Architecture',
                  'Granular Role-Based Access Control (RBAC)',
                  'Custom Data Retention Policies',
                  'SAML Single Sign-On (SSO) Ready'
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-[#fad503]" />
                    <span className="text-slate-200 font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-[#006065] blur-[100px] opacity-30 rounded-full"></div>
              <div className="relative bg-slate-800 border border-slate-700 p-8 rounded-2xl shadow-2xl">
                <div className="space-y-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between border-b border-slate-700 pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                          <Users className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                          <div className="h-4 w-32 bg-slate-700 rounded mb-2"></div>
                          <div className="h-3 w-20 bg-slate-700/50 rounded"></div>
                        </div>
                      </div>
                      <div className="h-6 w-16 bg-[#006065]/30 rounded border border-[#006065]/50"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-white text-center">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-4xl font-bold text-slate-900 mb-6">Ready to upgrade your organizational memory?</h2>
            <p className="text-lg text-slate-600 mb-10">Join forward-thinking enterprises that have transformed how they collaborate and retain knowledge.</p>
            <Button onClick={() => setIsContactModalOpen(true)} className="bg-[#006065] hover:bg-[#004e52] text-white h-14 px-10 rounded-full text-lg font-bold shadow-lg">
              Request a Corporate Demo
            </Button>
          </div>
        </section>
      </main>

      {/* Corporate Footer */}
      <footer className="bg-slate-50 border-t border-slate-200 py-16">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          <div className="col-span-2 lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <CliPadLogo size={24} className="text-[#006065]" />
              <span className="text-lg font-bold text-slate-900">KERINT</span>
            </div>
            <p className="text-sm text-slate-500 max-w-xs mb-6">
              The enterprise standard for secure organizational memory and collaborative intelligence.
            </p>
            <div className="text-xs text-slate-400">© 2026 KERINT Inc. All rights reserved.</div>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 mb-4">Platform</h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li><a href="#" className="hover:text-[#006065]">Video Meetings</a></li>
              <li><a href="#" className="hover:text-[#006065]">Knowledge Graph</a></li>
              <li><a href="#" className="hover:text-[#006065]">Security</a></li>
              <li><a href="#" className="hover:text-[#006065]">Integrations</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li><a href="#" className="hover:text-[#006065]">About Us</a></li>
              <li><a href="#" className="hover:text-[#006065]">Careers</a></li>
              <li><a href="#" className="hover:text-[#006065]">Contact Sales</a></li>
              <li><a href="#" className="hover:text-[#006065]">Partners</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li><a href="#" className="hover:text-[#006065]">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-[#006065]">Terms of Service</a></li>
              <li><a href="#" className="hover:text-[#006065]">Cookie Policy</a></li>
              <li><a href="#" className="hover:text-[#006065]">Compliance</a></li>
            </ul>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <ContactSalesModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
      <PaymentReceiptModal details={receiptDetails} onClose={() => setDetails(null)} />
      {supportPanel === 'help' && <SupportAIChat onClose={() => setSupportPanel(null)} />}
    </div>
  );
}
