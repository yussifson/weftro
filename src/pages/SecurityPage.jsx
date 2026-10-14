import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SEO from '@/components/seo/SEO';
import { Button } from '@/components/ui/button';
import { Shield, Lock, Key, Users, CheckCircle, Database } from 'lucide-react';

export default function SecurityPage() {
  const navigate = useNavigate();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <SEO title="Enterprise Security & Privacy Architecture — Weftro by Clipad" description="Bank-grade multi-tenant security, end-to-end encryption, SOC2 and HIPAA compliant data infrastructure for your organizational memory." url="https://clipad.com/security" />
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <Shield className="w-8 h-8 text-[#006065]" />
            <span className="text-xl font-bold text-slate-900">Weftro</span>
          </div>
          <Button onClick={() => navigate('/login')} className="bg-[#006065] text-white hover:bg-[#004e52] rounded-full">Sign In</Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">Built for Trust. Secured by Design.</h1>
          <p className="text-lg text-slate-600 leading-relaxed">
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
            <div key={idx} className="bg-white border border-slate-200 p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-6">
                <item.icon className="w-6 h-6 text-[#006065]" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
              <p className="text-slate-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
