import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import SEO from '@/components/seo/SEO';
import { Button } from '@/components/ui/button';
import { CliPadLogo } from '@/components/ui/CliPadLogo';
import {
  Brain,
  Building2,
  Database,
  Lock,
  Network,
  Search,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Code2,
  Workflow,
  Cpu
} from 'lucide-react';

export default function AboutPage() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "AboutPage",
        "@id": "https://weftro.com/about#webpage",
        "url": "https://weftro.com/about",
        "name": "About Weftro V3 — Optavel Technologies",
        "description": "Weftro is an AI-powered enterprise intelligence platform developed by Optavel Technologies that helps companies connect, retrieve, and use knowledge across their business systems and compatible AI tools.",
        "isPartOf": {
          "@type": "WebSite",
          "@id": "https://weftro.com/#website",
          "name": "Weftro V3 — #1 Enterprise Intelligence Platform",
          "url": "https://weftro.com"
        },
        "about": {
          "@type": "SoftwareApplication",
          "@id": "https://weftro.com/#software",
          "name": "Weftro V3",
          "applicationCategory": "BusinessApplication",
          "operatingSystem": "All",
          "creator": {
            "@type": "Organization",
            "@id": "https://optavel.com/#organization",
            "name": "Optavel Technologies",
            "url": "https://optavel.com"
          }
        }
      }
    ]
  };

  return (
    <div className="dark min-h-screen bg-[#0B1418] text-white font-sans selection:bg-[#0C5C3C] selection:text-white flex flex-col">
      <SEO 
        title="About Weftro V3 — Optavel Technologies | #1 Enterprise Intelligence Platform"
        description="Weftro is an AI-powered enterprise intelligence platform developed by Optavel Technologies that helps companies connect, retrieve, and use knowledge across their business systems and compatible AI tools."
        url="https://weftro.com/about"
        structuredData={structuredData}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/85 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <CliPadLogo height={32} />
          </div>
          <div className="flex items-center gap-3">
            <Link to="/pricing" className="text-xs font-semibold text-muted-foreground hover:text-foreground px-3 py-1.5 transition-colors">
              Pricing
            </Link>
            <Link to="/security" className="text-xs font-semibold text-muted-foreground hover:text-foreground px-3 py-1.5 transition-colors">
              Security
            </Link>
            <Button onClick={() => navigate('/login')} className="bg-[#0C5C3C] hover:bg-[#0E6C47] text-white text-xs font-semibold rounded-full px-4 h-9">
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto px-6 py-20 space-y-20">
        <div className="space-y-6 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-secondary border border-border">
            <Building2 className="w-3.5 h-3.5 text-[#0C5C3C]" />
            <span className="text-[11px] font-bold text-foreground tracking-wide">
              Optavel Technologies Product Identity
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.12]">
            What is Weftro?
          </h1>

          <p className="text-lg sm:text-xl text-slate-300 dark:text-muted-foreground leading-relaxed">
            <strong>Weftro</strong> is an AI-powered enterprise intelligence platform developed by <strong>Optavel Technologies</strong> that helps companies connect, retrieve, and use knowledge across their business systems and compatible AI tools.
          </p>
        </div>

        {/* Core Pillars Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 rounded-3xl bg-card border border-border space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#0C5C3C]/10 border border-[#0C5C3C]/20 flex items-center justify-center text-[#0C5C3C]">
              <Search className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">1. AI-Powered Enterprise Search</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Weftro delivers unified cross-system search across connected company tools—including Slack, Google Drive, Notion, GitHub, and Jira. Employees discover verified internal context and evidence-grounded answers without manually sifting through disparate silos.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-card border border-border space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#0C5C3C]/10 border border-[#0C5C3C]/20 flex items-center justify-center text-[#0C5C3C]">
              <Database className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">2. Institutional Memory & Context Graph</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Discussions, meeting recordings, document revisions, and operational decisions are continuously structured into an interconnected organizational context graph. Historical insights compound over time instead of evaporating when employees leave.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-card border border-border space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#0C5C3C]/10 border border-[#0C5C3C]/20 flex items-center justify-center text-[#0C5C3C]">
              <Cpu className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">3. Model Context Protocol (MCP) & APIs</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Weftro provides native Model Context Protocol (MCP) servers and REST APIs. Compatible AI assistants (such as Claude, Cursor, and custom enterprise agents) can securely query authorized company context with granular permission enforcement.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-card border border-border space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#0C5C3C]/10 border border-[#0C5C3C]/20 flex items-center justify-center text-[#0C5C3C]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">4. Strict Multi-Tenant Security</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Every query, document chunk, and memory item is bound by Row-Level Security (RLS) tenant isolation. Data is encrypted at rest (AES-256) and in transit (TLS 1.3), ensuring that sensitive enterprise context is never mixed or exposed.
            </p>
          </div>
        </section>

        {/* Company Identity & Origins */}
        <section className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-[#101D22] to-[#091114] border border-border space-y-6">
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6 text-[#0C5C3C]" />
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              Developed by Optavel Technologies
            </h2>
          </div>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            <strong>Optavel Technologies</strong> develops intelligent software platforms for modern organizations. Weftro represents Optavel's flagship enterprise intelligence and organizational memory solution (formerly known during early development as Clipad).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border/50 text-xs text-muted-foreground">
            <div>
              <span className="font-bold text-foreground block">Official Product Name</span>
              Weftro V3
            </div>
            <div>
              <span className="font-bold text-foreground block">Parent Company</span>
              Optavel Technologies
            </div>
            <div>
              <span className="font-bold text-foreground block">Official Website</span>
              <a href="https://weftro.com" className="text-[#0C5C3C] hover:underline">weftro.com</a>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="text-center py-10 space-y-6 border-t border-border">
          <h2 className="text-3xl font-bold text-foreground">
            Ready to unify your company knowledge?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Experience AI-assisted enterprise search and institutional memory across your organization.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button onClick={() => navigate('/signup')} className="bg-[#0C5C3C] hover:bg-[#0E6C47] text-white font-semibold rounded-xl px-6 h-12 gap-2 shadow-lg shadow-[#0C5C3C]/20">
              Get Started with Weftro <ArrowRight className="w-4 h-4" />
            </Button>
            <Button onClick={() => navigate('/custom-pricing')} variant="outline" className="border-border text-foreground hover:bg-secondary rounded-xl px-6 h-12">
              Talk to Enterprise Solutions
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 bg-[#091114] text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CliPadLogo height={20} />
            <span>&copy; {new Date().getFullYear()} Optavel Technologies. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
            <Link to="/security" className="hover:text-foreground">Security</Link>
            <Link to="/custom-pricing" className="hover:text-foreground">Enterprise</Link>
            <a href="https://weftro.com/sitemap.xml" className="hover:text-foreground">Sitemap</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
