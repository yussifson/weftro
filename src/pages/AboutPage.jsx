import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import SEO from '@/components/seo/SEO';
import { Button } from '@/components/ui/button';
import { CliPadLogo } from '@/components/ui/CliPadLogo';
import MarketingHeader from '@/components/clipad/MarketingHeader';
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
  Cpu,
  Layers,
  Plug,
  Terminal,
  Zap,
  Share2,
  FileText,
  Webhook,
  Key,
  FolderGit2
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

  const integrations = [
    { name: 'Slack', category: 'Chat & Threads', desc: 'Sync channels, threads, and decision notes in real-time.' },
    { name: 'Google Workspace', category: 'Docs & Drive', desc: 'Live index Google Docs, Sheets, Slides, and Drive folders.' },
    { name: 'Notion', category: 'Knowledge Base', desc: 'Full-page sync with database properties, blocks, and comments.' },
    { name: 'Microsoft Teams', category: 'Enterprise Comms', desc: 'Enterprise channels, chats, meeting notes, and files.' },
    { name: 'GitHub & GitLab', category: 'Engineering', desc: 'Code commits, PR descriptions, issues, and release logs.' },
    { name: 'Jira & Linear', category: 'Project Tracking', desc: 'Epics, sprint tickets, user stories, and resolution comments.' },
    { name: 'Confluence', category: 'Documentation', desc: 'Cross-space enterprise wikis, specs, and architectural diagrams.' },
    { name: 'Salesforce & HubSpot', category: 'CRM & Pipeline', desc: 'Customer accounts, opportunities, deals, and call recordings.' }
  ];

  const devFeatures = [
    {
      title: 'Model Context Protocol (MCP) Server',
      desc: 'Connect Claude Desktop, Cursor, and custom AI agents directly into your secure Weftro institutional memory graph.',
      icon: Cpu,
      tag: 'Protocol Standard'
    },
    {
      title: 'Developer REST APIs',
      desc: 'Query verified organizational knowledge, ingest live records, and retrieve hybrid semantic vectors with sub-100ms latency.',
      icon: Code2,
      tag: 'REST / JSON'
    },
    {
      title: 'Real-time Webhook Engine',
      desc: 'Subscribe to organizational memory mutations, transcript completions, and new decision records with cryptographic HMAC signatures.',
      icon: Webhook,
      tag: 'Event-Driven'
    },
    {
      title: 'Granular Token Management',
      desc: 'Generate scoped API tokens with row-level tenant enforcement, expiration policies, and automated audit logging.',
      icon: Key,
      tag: 'Zero-Trust'
    }
  ];

  return (
    <div className="dark min-h-screen bg-[#0B1418] text-white font-sans selection:bg-[#0C5C3C] selection:text-white flex flex-col">
      <SEO 
        title="About Weftro V3 — Optavel Technologies | #1 Enterprise Intelligence Platform"
        description="Weftro is an AI-powered enterprise intelligence platform developed by Optavel Technologies that helps companies connect, retrieve, and use knowledge across their business systems and compatible AI tools."
        url="https://weftro.com/about"
        structuredData={structuredData}
      />

      {/* Unified Fixed Executive Header */}
      <MarketingHeader />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl mx-auto px-6 pt-32 pb-24 space-y-24">
        
        {/* Hero Section */}
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
            <strong>Weftro</strong> is an AI-powered enterprise intelligence platform developed by <strong>Optavel Technologies</strong> that connects, indexes, and surfaces organizational knowledge across 50+ enterprise tools and compatible AI agents.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#0C5C3C]/10 text-emerald-400 border border-[#0C5C3C]/20">
              50+ Native Integrations
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
              Model Context Protocol (MCP)
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              Multi-Tenant RLS Security
            </span>
          </div>
        </div>

        {/* 4 Core Pillars Grid */}
        <section className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              Built for Enterprise-Scale Intelligence
            </h2>
            <p className="text-sm text-muted-foreground">
              Four fundamental architectural pillars make Weftro the single source of truth for your entire company.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 rounded-3xl bg-card border border-border space-y-4 hover:border-primary/40 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-[#0C5C3C]/10 border border-[#0C5C3C]/20 flex items-center justify-center text-[#0C5C3C]">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">1. AI-Powered Enterprise Search</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Weftro delivers unified cross-system search across connected company tools—including Slack, Google Drive, Notion, GitHub, and Jira. Employees discover verified internal context and evidence-grounded answers without manually sifting through disparate silos.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-card border border-border space-y-4 hover:border-orange-500/40 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">2. Institutional Memory & Context Graph</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Discussions, meeting recordings, document revisions, and operational decisions are continuously structured into an interconnected organizational context graph. Historical insights compound over time instead of evaporating when employees leave.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-card border border-border space-y-4 hover:border-emerald-500/40 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-[#0C5C3C]/10 border border-[#0C5C3C]/20 flex items-center justify-center text-[#0C5C3C]">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">3. Model Context Protocol (MCP) & APIs</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Weftro provides native Model Context Protocol (MCP) servers and REST APIs. Compatible AI assistants (such as Claude, Cursor, and custom enterprise agents) can securely query authorized company context with granular permission enforcement.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-card border border-border space-y-4 hover:border-primary/40 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-[#0C5C3C]/10 border border-[#0C5C3C]/20 flex items-center justify-center text-[#0C5C3C]">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">4. Strict Multi-Tenant Security</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Every query, document chunk, and memory item is bound by Row-Level Security (RLS) tenant isolation. Data is encrypted at rest (AES-256) and in transit (TLS 1.3), ensuring that sensitive enterprise context is never mixed or exposed.
              </p>
            </div>
          </div>
        </section>

        {/* 50+ Connected Integrations Section */}
        <section className="space-y-8 p-8 sm:p-12 rounded-3xl bg-card/60 border border-border relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xs font-semibold">
                <Plug className="w-3.5 h-3.5" /> 50+ Universal Connectors
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
                Connects With Your Entire Software Stack
              </h2>
              <p className="text-sm text-muted-foreground max-w-xl">
                Weftro bridges information gaps across engineering, sales, customer support, and executive leadership by keeping all knowledge in synchronized harmony.
              </p>
            </div>

            <Button onClick={() => navigate('/login')} variant="outline" className="shrink-0 border-border hover:bg-secondary text-xs font-semibold">
              Explore All 50+ Integrations <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {integrations.map((item) => (
              <div key={item.name} className="p-4 rounded-2xl bg-secondary/50 border border-border/80 space-y-2 hover:border-orange-500/30 transition-all">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-foreground">{item.name}</span>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground px-2 py-0.5 rounded bg-background border border-border">
                    {item.category}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Developer Platform & APIs Section */}
        <section className="space-y-8 p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-[#101D22] to-[#0A1418] border border-border relative overflow-hidden">
          <div className="absolute top-0 left-0 w-96 h-96 bg-[#0C5C3C]/10 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 relative z-10">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0C5C3C]/20 text-emerald-400 border border-[#0C5C3C]/30 text-xs font-semibold">
                <Terminal className="w-3.5 h-3.5" /> Open Developer Ecosystem
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
                Developer Platform, APIs & MCP
              </h2>
              <p className="text-sm text-slate-300 max-w-xl">
                Integrate company memory directly into your internal tooling, CI/CD pipelines, and autonomous AI developers with turnkey protocols.
              </p>
            </div>

            <Button onClick={() => navigate('/developers')} className="shrink-0 bg-[#0C5C3C] hover:bg-[#0E6C47] text-white text-xs font-semibold px-4 h-9">
              Developer Cockpit <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            {devFeatures.map((feat) => {
              const Icon = feat.icon;
              return (
                <div key={feat.title} className="p-6 rounded-2xl bg-card/80 border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-muted-foreground px-2.5 py-1 rounded-full bg-secondary border border-border">
                      {feat.tag}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-foreground">{feat.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{feat.desc}</p>
                </div>
              );
            })}
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
