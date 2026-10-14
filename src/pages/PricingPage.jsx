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
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <SEO title="Pricing & Plans — Weftro by Clipad" description="Simple, transparent pricing for teams of all sizes. From free collaborative spaces to enterprise knowledge intelligence." url="https://clipad.com/pricing" />
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/85 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
            <CliPadLogo height={32} />
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/login')} className="text-muted-foreground font-semibold hover:text-foreground">
              Sign In
            </Button>
            <Button onClick={() => navigate('/signup')} className="bg-[#fad503] text-[#0B1418] hover:bg-yellow-400 rounded-full font-bold">
              Get Started Free
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-24">
        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-border mb-6">
            <span className="text-[11px] font-bold text-[#fad503] uppercase tracking-widest">Simple, Transparent Pricing</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-6 tracking-tight">
            The right plan for your organization
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            No hidden fees. No surprises. Scale as you grow.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-24">
          {plans.map((plan, idx) => (
            <div
              key={idx}
              className={[
                'rounded-3xl p-8 border relative transition-all duration-300',
                plan.highlight
                  ? 'bg-card border-[#fad503] shadow-2xl shadow-[#fad503]/5 ring-1 ring-[#fad503]/20'
                  : 'bg-card border-border shadow-sm hover:border-border/80',
              ].join(' ')}
            >
              {plan.highlight && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#fad503] text-[#0B1418] px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest whitespace-nowrap shadow-md">
                  Most Popular
                </div>
              )}
              <h3 className="text-xl font-bold text-foreground mb-2">{plan.name}</h3>
              <div className="text-4xl font-extrabold text-foreground mb-2">{plan.price}</div>
              <p className="text-muted-foreground text-sm mb-6 min-h-[40px] leading-relaxed">{plan.desc}</p>
              <Button
                onClick={() => { trackEvent('upgrade_clicked', { plan_selected: plan.name, location: 'public_pricing' }); navigate(plan.name === 'Enterprise' ? '/custom-pricing' : '/signup'); }}
                className={[
                  'w-full rounded-2xl font-bold h-12 mb-8 transition-all',
                  plan.highlight
                    ? 'bg-[#fad503] text-[#0B1418] hover:bg-yellow-400 shadow-md shadow-[#fad503]/10'
                    : 'bg-secondary text-foreground hover:bg-secondary/80 border border-border',
                ].join(' ')}
              >
                {plan.cta}
              </Button>
              <ul className="space-y-3">
                {plan.features.map((feat, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#fad503]/15 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-[#fad503]" />
                    </div>
                    <span className="text-foreground/80 text-sm font-medium">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Enterprise CTA */}
        <div className="bg-card border border-border rounded-3xl p-12 text-center max-w-4xl mx-auto shadow-xl">
          <h2 className="text-3xl font-extrabold mb-4 text-foreground">Need a custom solution?</h2>
          <p className="text-muted-foreground mb-8 text-lg max-w-xl mx-auto">
            We work directly with enterprise teams to design a plan that fits your exact requirements.
          </p>
          <Button
            onClick={() => navigate('/custom-pricing')}
            className="bg-[#fad503] text-[#0B1418] hover:bg-yellow-400 font-bold h-12 px-8 rounded-full text-base shadow-md"
          >
            Talk to Our Team
          </Button>
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
            <span className="cursor-pointer hover:text-foreground" onClick={() => navigate('/security')}>Security</span>
            <span className="cursor-pointer hover:text-foreground" onClick={() => navigate('/login')}>Sign In</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
