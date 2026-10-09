import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SEO from '@/components/seo/SEO';
import { Button } from '@/components/ui/button';
import { Shield, Check } from 'lucide-react';

export default function PricingPage() {
  const navigate = useNavigate();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <SEO title="KERINT Pricing" description="Transparent pricing for teams of all sizes." type="website" />
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <Shield className="w-8 h-8 text-[#006065]" />
            <span className="text-xl font-bold text-slate-900">KERINT</span>
          </div>
          <Button onClick={() => navigate('/login')} className="bg-[#006065] text-white hover:bg-[#004e52] rounded-full">Sign In</Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">Simple, Transparent Pricing</h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            Choose the plan that fits your organizational needs. No hidden fees.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {[
            { name: 'Starter', price: 'Free', desc: 'Perfect for small teams starting their journey.', cta: 'Start Free', outline: true, features: ['Up to 10 Spaces', '100 AI Summaries/mo', 'Basic Search', 'Community Support'] },
            { name: 'Professional', price: '$29/mo', desc: 'For growing companies that need robust features.', cta: 'Upgrade to Pro', highlight: true, features: ['Unlimited Spaces', 'Unlimited AI Summaries', 'Advanced Knowledge Graph', 'Priority Support', 'Custom Integrations'] },
            { name: 'Enterprise', price: 'Custom', desc: 'Advanced security and controls for large organizations.', cta: 'Contact Sales', outline: true, features: ['SSO & Advanced Security', 'Dedicated Success Manager', 'Custom Data Retention', 'SLA Guarantee', 'On-Premise Options'] },
          ].map((plan, idx) => (
            <div key={idx} className={\`bg-white rounded-2xl p-8 border \${plan.highlight ? 'border-[#006065] shadow-xl relative' : 'border-slate-200 shadow-sm'}\`}>
              {plan.highlight && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#006065] text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                  Most Popular
                </div>
              )}
              <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
              <div className="text-4xl font-extrabold text-slate-900 mb-4">{plan.price}</div>
              <p className="text-slate-600 mb-8 min-h-[48px]">{plan.desc}</p>
              <Button 
                onClick={() => navigate(plan.name === 'Enterprise' ? '/custom-pricing' : '/signup')} 
                className={\`w-full rounded-full font-bold h-12 mb-8 \${plan.highlight ? 'bg-[#006065] text-white hover:bg-[#004e52]' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'}\`}
              >
                {plan.cta}
              </Button>
              <ul className="space-y-4">
                {plan.features.map((feat, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-[#006065]" />
                    <span className="text-slate-600 font-medium">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
