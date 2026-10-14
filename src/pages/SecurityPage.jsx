import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SEO from '@/components/seo/SEO';
import { Button } from '@/components/ui/button';
import { Shield, Lock, Key, Users, CheckCircle, Database } from 'lucide-react';
import { CliPadLogo } from '@/components/ui/CliPadLogo';

export default function SecurityPage() {
  const navigate = useNavigate();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <SEO title="Enterprise Security & Privacy Architecture — Weftro by Clipad" description="Bank-grade multi-tenant security, end-to-end encryption, SOC2 and HIPAA compliant data infrastructure for your organizational memory." url="https://clipad.com/security" />
      <header className="sticky top-0 z-50 bg-background/85 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
            <CliPadLogo height={32} />
          </div>
          <Button onClick={() => navigate('/login')} className="bg-[#fad503] text-[#0B1418] hover:bg-yellow-400 font-bold rounded-full">Sign In</Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-border mb-6">
            <span className="text-[11px] font-bold text-[#fad503] uppercase tracking-widest">Enterprise Trust & Security</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-6 tracking-tight">Built for Trust. Secured by Design.</h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Your organizational memory is your most valuable asset. Weftro protects it with military-grade encryption, rigorous compliance standards, and uncompromising privacy controls.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-24">
          {[
            { icon: Lock, title: 'End-to-End Encryption', desc: 'All data is encrypted at rest using AES-256 and in transit via TLS 1.3.' },
            { icon: Key, title: 'SSO & MFA', desc: 'Seamlessly integrate with your existing identity providers (Okta, Azure AD, Google).' },
            { icon: Users, title: 'Granular RBAC', desc: 'Control exactly who has access to which spaces, meetings, and documents.' },
            { icon: CheckCircle, title: 'SOC 2 Type II', desc: 'Audited and certified to meet the highest industry standards for security.' },
            { icon: Database, title: 'Data Sovereignty', desc: 'Choose where your data lives. We offer regional data residency across the globe.' },
            { icon: Shield, title: 'Advanced Audit Logs', desc: 'Track every action, view, and modification within your workspace.' }
          ].map((item, idx) => (
            <div key={idx} className="bg-card border border-border p-8 rounded-3xl shadow-sm hover:border-border/80 transition-all">
              <div className="w-12 h-12 bg-secondary rounded-2xl flex items-center justify-center mb-6">
                <item.icon className="w-6 h-6 text-[#fad503]" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">{item.title}</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-16 bg-background">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CliPadLogo height={20} iconOnly />
            <span>© {new Date().getFullYear()} Weftro by Optavel Technologies</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="cursor-pointer hover:text-foreground" onClick={() => navigate('/')}>Home</span>
            <span className="cursor-pointer hover:text-foreground" onClick={() => navigate('/pricing')}>Pricing</span>
            <span className="cursor-pointer hover:text-foreground" onClick={() => navigate('/login')}>Sign In</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
