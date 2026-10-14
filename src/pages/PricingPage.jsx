import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SEO from '@/components/seo/SEO';
import { trackEvent } from '@/lib/posthog';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { CliPadLogo } from '@/components/ui/CliPadLogo';

const plans = [
  {
    name: 'Starter',
    price: 'Free',
    desc: 'Perfect for small teams starting their journey.',
    cta: 'Start Free',
    features: ['Up to 10 Spaces', '100 AI Summaries/mo', 'Basic Search', 'Community Support'],
    highlight: false,
  },
  {
    name: 'Professional',
    price: '$29/mo',
    desc: 'For growing companies that need robust features.',
    cta: 'Upgrade to Pro',
    features: ['Unlimited Spaces', 'Unlimited AI Summaries', 'Advanced Knowledge Graph', 'Priority Support', 'Custom Integrations'],
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    desc: 'Advanced security and controls for large organizations.',
    cta: 'Contact Sales',
    features: ['SSO & Advanced Security', 'Dedicated Success Manager', 'Custom Data Retention', 'SLA Guarantee', 'On-Premise Options'],
    highlight: false,
  },
];

export default function PricingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
    trackEvent('pricing_viewed', { location: 'public_pricing_page' });
    const root = window.document.documentElement;
    root.classList.remove('dark');
    root.classList.add('light');
    root.style.colorScheme = 'light';
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <SEO title="Pricing & Plans — Weftro by Clipad" description="Simple, transparent pricing for teams of all sizes. From free collaborative spaces to enterprise knowledge intelligence." url="https://clipad.com/pricing" />
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
            <CliPadLogo height={32} />
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/login')} className="text-slate-600 font-semibold hover:text-[#006065]">
              Sign In
            </Button>
            <Button onClick={() => navigate('/signup')} className="bg-[#006065] text-white hover:bg-[#004e52] rounded-full font-semibold">
              Get Started Free
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-24">
        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 mb-6">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Simple, Transparent Pricing</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
            The right plan for your organization
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            No hidden fees. No surprises. Scale as you grow.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-24">
          {plans.map((plan, idx) => (
            <div
              key={idx}
              className={[
                'rounded-2xl p-8 border relative',
                plan.highlight
                  ? 'bg-white border-[#006065] shadow-xl ring-2 ring-[#006065]/10'
                  : 'bg-white border-slate-200 shadow-sm',
              ].join(' ')}
            >
              {plan.highlight && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#006065] text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                  Most Popular
                </div>
              )}
              <h3 className="text-xl font-bold text-slate-900 mb-2">{plan.name}</h3>
              <div className="text-4xl font-extrabold text-slate-900 mb-2">{plan.price}</div>
              <p className="text-slate-500 text-sm mb-6 min-h-[40px]">{plan.desc}</p>
              <Button
                onClick={() => { trackEvent('upgrade_clicked', { plan_selected: plan.name, location: 'public_pricing' }); navigate(plan.name === 'Enterprise' ? '/custom-pricing' : '/signup'); }}
                className={[
                  'w-full rounded-full font-bold h-12 mb-8',
                  plan.highlight
                    ? 'bg-[#006065] text-white hover:bg-[#004e52]'
                    : 'bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-200',
                ].join(' ')}
              >
                {plan.cta}
              </Button>
              <ul className="space-y-3">
                {plan.features.map((feat, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#006065]/10 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-[#006065]" />
                    </div>
                    <span className="text-slate-600 text-sm font-medium">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Enterprise CTA */}
        <div className="bg-slate-900 text-white rounded-3xl p-12 text-center max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Need a custom solution?</h2>
          <p className="text-slate-400 mb-8 text-lg">
            We work directly with enterprise teams to design a plan that fits your exact requirements.
          </p>
          <Button
            onClick={() => navigate('/custom-pricing')}
            className="bg-[#fad503] text-slate-900 hover:bg-yellow-300 font-bold h-12 px-8 rounded-full text-base"
          >
            Talk to Our Team
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <CliPadLogo height={20} iconOnly />
            <span>© {new Date().getFullYear()} Weftro by Optavel Technologies</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="cursor-pointer hover:text-slate-700" onClick={() => navigate('/')}>Home</span>
            <span className="cursor-pointer hover:text-slate-700" onClick={() => navigate('/security')}>Security</span>
            <span className="cursor-pointer hover:text-slate-700" onClick={() => navigate('/login')}>Sign In</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
