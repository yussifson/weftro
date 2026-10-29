const isValidUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SEO from '@/components/seo/SEO';
import { generateShortId } from '@/utils/idGenerator';
import { formatMeetingUrl } from '@/utils/meetingUrl';
import { supabase } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { OrbitLoader, PageLoader } from '@/components/ui/orbit-loader';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Menu, Zap, Target, Star, Brain, Camera, Rocket, MessageSquare, PhoneCall, ArrowRight, ShieldCheck, CheckCircle, Check, Video, TrendingUp, Calendar, X, Keyboard, Sparkles, Copy, Link as LinkIcon, Users, Layers, ChevronRight, ChevronLeft, Monitor, Globe, Plus, Clock, Search, Network, Cpu, Database } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { AnimatePresence, motion } from 'framer-motion';
import { CliPadLogo } from '@/components/ui/CliPadLogo';
import FeaturesCircle from '@/components/clipad/FeaturesCircle';
import AdvancedFeaturesBento from '@/components/clipad/AdvancedFeaturesBento';
import WithoutCliPadSection from '@/components/clipad/WithoutCliPadSection';
import WithCliPadSection from '@/components/clipad/WithCliPadSection';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useAuth } from '@/lib/AuthContext';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useCompanyId } from '@/hooks/useCompanyId';
import ContactSalesModal from '@/components/clipad/ContactSalesModal';
import PaymentReceiptModal from '@/components/clipad/PaymentReceiptModal';
import SupportAIChat from '@/components/clipad/SupportAIChat';
import ClipadMobileNav from '@/components/clipad/ClipadMobileNav';
import MarketingHeader from '@/components/clipad/MarketingHeader';
import MarketingFooter from '@/components/clipad/MarketingFooter';


const pillars = [
  {
    icon: Database,
    color: 'from-emerald-600 to-teal-500',
    glow: 'shadow-emerald-500/20',
    title: 'Organizational Memory & Context',
    desc: 'Connect conversations, documents, team decisions, and projects into a unified knowledge graph. Never lose institutional context again.'
  },
  {
    icon: Network,
    color: 'from-teal-500 to-emerald-400',
    glow: 'shadow-teal-500/20',
    title: 'Connected Integrations & MCP',
    desc: 'Seamlessly connects with Slack, Google Drive, Notion, GitHub, third-party APIs, and Model Context Protocol (MCP) servers.'
  },
  {
    icon: Brain,
    color: 'from-amber-500 to-[#D9A400]',
    glow: 'shadow-amber-500/20',
    title: 'AI Reasoning & Decision Support',
    desc: 'Autonomous meeting extraction, cross-tool semantic search, decision ledgers, and intelligent workflow automation.'
  },
  {
    icon: Layers,
    color: 'from-emerald-600 to-teal-600',
    glow: 'shadow-emerald-600/20',
    title: 'Persistent Team Spaces',
    desc: 'Dedicated enterprise hubs unifying live HD collaboration, async video updates, dynamic action boards, and team documentation.'
  },
  {
    icon: Video,
    color: 'from-orange-500 to-amber-500',
    glow: 'shadow-orange-500/20',
    title: 'HD Meetings & Async Capture',
    desc: 'Instant video conferences and picture-in-picture recordings with live AI transcription, timestamps, and viewer telemetry.'
  },
  {
    icon: Zap,
    color: 'from-orange-500 to-amber-500',
    glow: 'shadow-orange-500/20',
    title: 'Autonomous Action Execution',
    desc: 'Transforms spoken consensus into structured tasks, follow-up briefs, and automated team workflows without manual note-taking.'
  },
];

const stats = [
  { value: '100+', label: 'Connected Integrations & MCP' },
  { value: '100%', label: 'Organizational Memory Retention' },
  { value: '< 2 min', label: 'AI Synthesis Delivery' },
  { value: 'Enterprise', label: 'End-to-End Encryption & Audit' },
];

const tiers = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    highlight: false,
    features: ['Unlimited HD meetings', 'Up to 10 participants', 'Screen sharing & whiteboard', '10 async video recordings/mo (15 min limit)', 'Basic AI meeting summary', 'Up to 5 Team Spaces', '2GB Max Cloud Storage'],
  },
  {
    name: 'Pro',
    price: '$15',
    period: 'per workspace/mo',
    highlight: true,
    badge: 'Most Popular',
    features: ['Everything in Free', 'Up to 300 participants', 'Unlimited async recordings (1 hr limit)', 'Full AI intelligence layer', 'Smart follow-up emails', 'Video engagement analytics', 'Unlimited Team Spaces', '15GB Max Cloud Storage'],
  },
  {
    name: 'Enterprise',
    price: '$39',
    period: 'per workspace/mo',
    highlight: false,
    features: ['Everything in Pro', 'Unlimited participants', 'Branded meeting rooms', 'SSO & compliance recording', 'Unlimited async recordings', 'SLA & dedicated support', 'Custom integrations', '50GB Max Cloud Storage'],
  },
  {
    name: 'Custom',
    price: 'Contact Us',
    period: 'tailored plan',
    highlight: false,
    badge: 'Tailored Scale',
    features: ['Everything in Enterprise', 'Dedicated VPC & on-premise deployment', 'Custom AI models & domain fine-tuning', 'Tailored storage quota & unlimited seats', 'Bespoke enterprise integrations & APIs', 'Custom SLA, DPA & compliance terms', 'Dedicated Customer Success Manager'],
  },
];

const slides = [
  {
    id: 0,
    title: 'Organizational Memory & Knowledge Graph',
    description: 'Automatically links conversations, documents, projects, and strategic decisions into compounding institutional intelligence.',
    render: () => (
      <div className="relative flex flex-col items-center justify-center w-full h-full select-none">
        <div className="absolute w-64 h-64 rounded-full border-2 border-[#0C5C3C]/30 animate-pulse" />
        <div className="absolute w-44 h-44 rounded-full bg-[#0C5C3C]/10" />
        <div className="relative w-32 h-32 rounded-full bg-[#0C5C3C] flex items-center justify-center shadow-2xl shadow-[#0C5C3C]/40 border-2 border-[#0C5C3C]">
          <Database className="w-14 h-14 text-white" strokeWidth={1.5} />
        </div>
        <div className="absolute top-6 right-10 bg-card border border-border rounded-xl px-3 py-1.5 shadow-lg flex items-center gap-1.5">
          <Brain className="w-3.5 h-3.5 text-[#0C5C3C]" />
          <span className="text-xs font-semibold text-[#0C5C3C]">Knowledge Graph</span>
        </div>
        <div className="absolute bottom-10 left-6 bg-card border border-border rounded-xl px-3 py-1.5 shadow-lg">
          <span className="text-xs font-medium text-muted-foreground font-mono">Institutional Memory</span>
        </div>
      </div>
    ),
  },
  {
    id: 1,
    title: 'Universal Integrations & MCP Protocol',
    description: 'Integrates natively across Slack, Notion, GitHub, Google Workspace, external LLMs, and Model Context Protocol servers.',
    render: () => (
      <div className="relative flex flex-col items-center justify-center w-full h-full select-none">
        <div className="absolute w-64 h-64 rounded-full border-2 border-orange-500/30 animate-pulse" />
        <div className="absolute w-44 h-44 rounded-full bg-orange-500/10" />
        <div className="relative w-32 h-32 rounded-full bg-orange-500 flex items-center justify-center shadow-2xl shadow-orange-500/40 border-2 border-orange-500">
          <Network className="w-14 h-14 text-white" strokeWidth={1.5} />
        </div>
        <div className="absolute top-4 right-8 bg-card border border-border rounded-xl px-3 py-1.5 shadow-lg flex items-center gap-2">
          <Cpu className="w-3.5 h-3.5 text-orange-500" />
          <span className="text-xs font-semibold text-orange-500">MCP Protocol</span>
        </div>
        <div className="absolute bottom-8 left-4 bg-card border border-border rounded-xl px-3 py-2 shadow-lg text-center">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">Unified Context</span>
          <span className="text-xs font-bold text-foreground">Multi-Model Reasoning</span>
        </div>
      </div>
    ),
  },
  {
    id: 2,
    title: 'Controlled AI Actions & Reasoning',
    description: 'Transforms discussions into automated workflows, verified decision logs, and contextual tasks dispatched to the right owners.',
    render: () => (
      <div className="relative flex flex-col items-center justify-center w-full h-full select-none">
        <div className="absolute w-64 h-64 rounded-full border-2 border-[#D9A400]/30 animate-pulse" />
        <div className="absolute w-44 h-44 rounded-full bg-[#D9A400]/10" />
        <div className="relative w-32 h-32 rounded-full bg-[#D9A400] flex items-center justify-center shadow-2xl shadow-[#D9A400]/40 border-2 border-[#D9A400]">
          <Zap className="w-14 h-14 text-slate-950" strokeWidth={1.8} />
        </div>
        <div className="absolute bottom-6 flex -space-x-3">
          {['bg-[#0C5C3C]', 'bg-[#0C5C3C]', 'bg-[#0C5C3C]', 'bg-[#D9A400]'].map((c, i) => (
            <div key={i} className={`w-9 h-9 rounded-full ${c} border-2 border-background flex items-center justify-center shadow-sm`}>
              <Users className={`w-4 h-4 ${c === 'bg-[#D9A400]' ? 'text-slate-950' : 'text-white'}`} />
            </div>
          ))}
        </div>
        <div className="absolute top-4 right-6 bg-card border border-border rounded-xl px-3 py-1.5 shadow-lg flex items-center gap-1.5">
          <CheckCircle className="w-3.5 h-3.5 text-[#D9A400]" />
          <span className="text-xs font-semibold text-[#D9A400]">Action Automation</span>
        </div>
      </div>
    ),
  },
];

function useLiveClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    // Ensure all icon links point to the official Weftro logo
    const links = document.querySelectorAll("link[rel*='icon']");
    if (links.length > 0) {
      links.forEach((l, idx) => {
        if (idx === 0) {
          l.type = 'image/svg+xml';
          l.href = '/clipad-logo.svg';
        } else {
          l.remove();
        }
      });
    } else {
      const link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/svg+xml';
      link.href = '/clipad-logo.svg';
      document.head.appendChild(link);
    }

    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function MeetLandingPage() {
  const [meetingCode, setMeetingCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [laterLink, setLaterLink] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [supportPanel, setSupportPanel] = useState(null); 
  const [supportForm, setSupportForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [submittingSupport, setSubmittingSupport] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [receiptDetails, setDetails] = useState(null);
  const [showHumanForm, setShowHumanForm] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);
  
  const { user, isLoadingAuth } = useAuth();
  const companyId = useCompanyId();
  const [exchangeRate, setExchangeRate] = useState(218 / 19);
  const [isProcessingPay, setIsProcessingPay] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // Single-page navigation hash scroller
  useEffect(() => {
    if (location.hash) {
      const el = document.querySelector(location.hash);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [location.hash]);
  const { toast } = useToast();
  const now = useLiveClock();


  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    document.body.appendChild(script);

    fetch('https://open.er-api.com/v6/latest/USD')
      .then(res => res.json())
      .then(data => { if (data?.rates?.GHS) setExchangeRate(data.rates.GHS); })
      .catch(() => setExchangeRate(218 / 19));

    return () => { if (document.body.contains(script)) document.body.removeChild(script); };
  }, []);

    useEffect(() => {
    // Detect and apply browser language on initial load if no translation cookie is set
    const hasGoogtrans = document.cookie.split(';').some(item => item.trim().startsWith('googtrans='));
    if (!hasGoogtrans) {
      const browserLang = navigator.language || navigator.userLanguage;
      if (browserLang) {
        const langCode = browserLang.split('-')[0].toLowerCase();
        if (langCode !== 'en') {
          document.cookie = `googtrans=/en/${langCode}; path=/; domain=${window.location.hostname}`;
          document.cookie = `googtrans=/en/${langCode}; path=/`;
          
          const googleSelect = document.querySelector('.goog-te-combo');
          if (googleSelect) {
            googleSelect.value = langCode;
            googleSelect.dispatchEvent(new Event('change'));
          } else {
            window.location.reload();
          }
        }
      }
    }
  }, []);

  useEffect(() => {
    const isMobilePhone = window.innerWidth < 768;
    if (isMobilePhone && !isLoadingAuth && user) {
      navigate('/dashboard');
    }
  }, [user, isLoadingAuth, navigate]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);



  const handlePricingAction = async (tierName) => {
    if (tierName === 'Custom' || tierName === 'Contact Us') {
      navigate('/custom-pricing');
      return;
    }

    if (!user) {
      navigate('/login');
      return;
    }

    if (tierName === 'Free') {
      navigate('/dashboard');
      return;
    }

    if (tierName === 'Pro' || tierName === 'Enterprise') {
      setIsProcessingPay(true);
      try {
        const isPro = tierName === 'Pro';
        const amountInGhs = isPro ? 105 : 450;
        const amountInPesewas = amountInGhs * 100;
        const planCode = isPro 
            ? (import.meta.env.VITE_PAYSTACK_PLAN_CODE_PRO || 'PLN_rz16cups3jarao2')
            : (import.meta.env.VITE_PAYSTACK_PLAN_CODE_ENTERPRISE || 'PLN_0g01fqqgeymnsj7');

        const handler = window.PaystackPop.setup({
          key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_mock',
          email: user?.email || 'user@example.com',
          amount: amountInPesewas, 
          currency: 'GHS',
          plan: planCode,
          ref: '' + Math.floor((Math.random() * 1000000000) + 1),
          callback: function (response) {
            toast({ title: 'Payment Successful', description: `Welcome to Pro!` });
            
            setReceiptDetails({
              reference: response.reference,
              amount: amountInPesewas,
              currency: 'GHS',
              plan: 'Pro',
              date: new Date().toISOString(),
              email: user?.email || 'user@example.com'
            });

            if (companyId) {
              supabase.from('company_subscriptions').upsert({
                company_id: isValidUUID(companyId) ? companyId : null,
                plan_id: 'pro',
                status: 'active',
                paystack_customer_code: response.reference,
                updated_at: new Date().toISOString()
              }).then(() => navigate('/dashboard'));
            } else {
              navigate('/dashboard');
            }
          },
          onClose: function () {
            toast({ title: 'Payment Cancelled' });
          },
        });
        handler.openIframe();
      } catch (err) {
        toast({ title: 'Error', description: 'Could not initialize Paystack', variant: 'destructive' });
      } finally {
        setIsProcessingPay(false);
      }
    }
  };

  const handleCreateMeeting = async (type) => {
    setIsCreating(true);
    try {
      const shortId = generateShortId();

      let roomData = null;
      try {
        const { data, error } = await supabase.functions.invoke('create-daily-room', {
          body: { dbId: crypto.randomUUID(), roomName: shortId, privacy: 'public', companyId },
        });
        if (!error && data && (data.name || data.roomName)) roomData = data;
      } catch (_) { /* edge function unavailable */ }

      const targetRoomName = roomData?.name || roomData?.roomName || shortId;

      // Note: create-daily-room edge function authoritatively provisions video_rooms via service role
      if (isValidUUID(user?.id)) {
        try {
          await supabase.from('video_rooms').upsert({
            id: crypto.randomUUID(),
            company_id: isValidUUID(companyId) ? companyId : null,
            daily_room_name: targetRoomName,
            daily_room_url: roomData?.url || `https://optalflow.daily.co/${targetRoomName}`,
            privacy_type: 'public',
            host_id: user.id,
            status: 'active',
            meeting_type: 'instant'
          });
        } catch (_) {}
      }

      if (type === 'instant') {
        navigate(`/join/${targetRoomName}`);
      } else {
        setLaterLink(formatMeetingUrl(targetRoomName));
        setIsDialogOpen(true);
      }
    } catch (err) {
      console.error('Failed to create meeting:', err);
      const fallback = generateShortId();
      if (type === 'instant') {
        navigate(`/join/${fallback}`);
      } else {
        toast({ title: 'Error', description: 'Could not create a new meeting. Try again.', variant: 'destructive' });
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!meetingCode.trim()) return;
    let roomId = meetingCode.trim();
    if (roomId.includes('/join/')) roomId = roomId.split('/join/')[1];
    navigate(`/join/${roomId}`);
  };

  if (isLoadingAuth) {
    return <PageLoader label="" />;
  }


  return (
    <div className={`dark min-h-screen bg-[#0B1418] text-white flex flex-col font-sans relative transition-all duration-500 ease-in-out overflow-x-hidden ${supportPanel ? 'lg:pr-[400px]' : ''}`}>
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-[#fad503]/5 blur-[120px]" />
      </div>
      <SEO 
        title="Weftro V3 — #1 Enterprise Intelligence Platform"
        url="https://weftro.com/" 
        description="Weftro V3 helps companies search connected knowledge sources, discover relevant information, retrieve evidence-grounded answers, and connect company knowledge with compatible applications and AI systems." 
        type="website"
      />
      <MarketingHeader onOpenSupport={(type) => setSupportPanel(type || 'chat')} />

      <main id="hero" className="relative z-10 flex-1 flex flex-col md:flex-row items-center justify-center pt-24 pb-6 px-6 md:pt-28 md:pb-12 md:px-12 gap-12 md:gap-16 max-w-7xl mx-auto w-full">
        <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left space-y-6 max-w-xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-normal text-foreground leading-[1.12] tracking-tight">
            #1 Enterprise Intelligence Platform
          </h1>
          <p className="text-lg text-slate-300 dark:text-muted-foreground leading-relaxed">
            <strong>Weftro V3</strong> is an AI-powered enterprise intelligence platform developed by <strong>Optavel Technologies</strong> that helps companies connect, retrieve, and use knowledge across their business systems and compatible AI tools.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full pt-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="lg"
                  disabled={isCreating}
                  className="w-full sm:w-auto h-12 px-6 gap-2 text-base rounded-xl shadow-md shadow-primary/20"
                >
                  {isCreating ? <OrbitLoader /> : <Video className="w-5 h-5" />}
                  New meeting
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 p-2 shadow-xl border-border bg-popover text-popover-foreground rounded-xl shadow-xl">
                <DropdownMenuItem
                  onClick={() => handleCreateMeeting('later')}
                  className="flex items-center gap-3 p-3 cursor-pointer rounded-lg hover:bg-secondary"
                >
                  <LinkIcon className="w-5 h-5 text-slate-500 dark:text-muted-foreground" />
                  <span className="font-medium text-foreground">Create a meeting for later</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleCreateMeeting('instant')}
                  className="flex items-center gap-3 p-3 cursor-pointer rounded-lg hover:bg-secondary"
                >
                  <Plus className="w-5 h-5 text-slate-500 dark:text-muted-foreground" />
                  <span className="font-medium text-foreground">Start an instant meeting</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <form onSubmit={handleJoin} className="relative w-full sm:w-72">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Keyboard className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                value={meetingCode}
                onChange={(e) => setMeetingCode(e.target.value)}
                placeholder="Enter a code or link"
                className="block w-full pl-11 pr-14 py-3 border border-border rounded-xl leading-5 bg-card/60 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#fad503] focus:border-[#fad503] sm:text-sm transition-colors"
              />
              {meetingCode && (
                <button
                  type="submit"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-primary font-semibold hover:text-primary/80 transition-colors text-sm"
                >
                  Join
                </button>
              )}
            </form>
          </div>
        </div>

        <div className="flex-1 hidden md:flex items-center justify-center relative min-h-[520px]">
          <button
            onClick={prevSlide}
            className="absolute left-0 z-10 w-10 h-10 rounded-full bg-card hover:bg-secondary shadow-md border border-white/10 flex items-center justify-center transition-all"
          >
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="flex flex-col items-center text-center w-full max-w-md px-12">
            <div className="w-full h-[340px] relative mb-8">
              {slides.map((slide) => (
                <div
                  key={slide.id}
                  className={`absolute inset-0 transition-all duration-700 ${
                    slide.id === currentSlide ? 'opacity-100 scale-100 z-10' : 'opacity-0 scale-95 z-0'
                  }`}
                >
                  {slide.render()}
                </div>
              ))}
            </div>
            <div className="h-28">
              <h2 className="text-2xl font-semibold text-foreground mb-2 tracking-tight">
                {slides[currentSlide].title}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                {slides[currentSlide].description}
              </p>
            </div>
            <div className="flex gap-2 mt-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === currentSlide
                      ? 'bg-[#fad503] w-6'
                      : 'bg-muted w-2 hover:bg-muted-foreground/40'
                  }`}
                />
              ))}
            </div>
          </div>
          <button
            onClick={nextSlide}
            className="absolute right-0 z-10 w-10 h-10 rounded-full bg-card hover:bg-secondary shadow-md border border-white/10 flex items-center justify-center transition-all"
          >
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </main>

      <section id="features" className="py-24 px-6 md:px-12 max-w-7xl mx-auto overflow-hidden">
        <div className="text-center mb-10">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-foreground">Everything your organization needs.</h2>
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">Not five disconnected tools. One continuous organizational intelligence layer.</p>
        </div>

        <FeaturesCircle />
      </section>

        <div id="intelligence">
        <AdvancedFeaturesBento />
      </div>
        <WithoutCliPadSection />
        <WithCliPadSection />

        <section id="pricing" className="py-24 px-6 md:px-12 max-w-7xl mx-auto w-full overflow-hidden md:overflow-visible">
          <div className="text-center mb-16">

            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-5">Choose the perfect plan for your team.</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">Scale your operations seamlessly with Weftro.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {tiers.map((tier) => (
              <div 
                key={tier.name} 
                className={`relative p-6 md:p-8 rounded-3xl border flex flex-col justify-between transition-all ${
                  tier.highlight 
                    ? 'bg-gradient-to-b from-primary/10 to-primary/5 border-primary/40 shadow-xl shadow-primary/10' 
                    : tier.name === 'Custom'
                    ? 'bg-card border-orange-500/30 dark:border-orange-500/20 shadow-sm'
                    : 'bg-secondary/40 border-border hover:border-border'
                }`}
              >
                {tier.badge && (
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full text-xs font-bold shadow-md whitespace-nowrap ${
                    tier.name === 'Custom' 
                      ? 'bg-orange-500 text-white' 
                      : 'bg-primary text-white'
                  }`}>
                    {tier.badge}
                  </div>
                )}
                <div>
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-foreground mb-2">{tier.name}</h3>
                    <div className="flex items-end gap-1">
                      <span className="text-3xl lg:text-4xl font-black text-foreground">{tier.price}</span>
                      <span className="text-xs text-muted-foreground mb-1">/ {tier.period}</span>
                    </div>
                  </div>
                  <div className="space-y-3 mb-8">
                    {tier.features.map((f) => (
                      <div key={f} className="flex items-start gap-2.5">
                        <CheckCircle className={`w-4 h-4 shrink-0 mt-0.5 ${
                          tier.highlight ? 'text-primary' : tier.name === 'Custom' ? 'text-[#fad503]' : 'text-primary'
                        }`} />
                        <span className="text-xs text-foreground/85 leading-relaxed">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (tier.name === 'Custom') {
                      navigate('/custom-pricing');
                    } else {
                      handlePricingAction(tier.name);
                    }
                  }}
                  disabled={isProcessingPay}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                    tier.name === 'Pro' 
                      ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20' 
                      : tier.name === 'Enterprise'
                      ? 'bg-[#0C5C3C] hover:bg-[#0C5C3C]/90 text-white shadow-md shadow-[#0C5C3C]/20'
                      : tier.name === 'Custom'
                      ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20'
                      : 'bg-secondary hover:bg-secondary/80 text-foreground border border-border'
                  }`}
                >
                  {tier.name === 'Custom' ? 'Contact Sales' : user ? (tier.name === 'Free' ? 'Current Plan' : 'Upgrade') : 'Get Started'}
                </button>
              </div>
            ))}
          </div>

          {/* Compare Plans Table */}
          <div className="mt-24 w-full overflow-hidden">
            <div className="text-center mb-12">
              <h3 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
                Compare Plans & Features
              </h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto">
                A clear breakdown of limits, collaboration tools, intelligence layers, and governance across all tiers.
              </p>
            </div>

            <div className="w-full overflow-x-auto border border-border rounded-3xl bg-card shadow-xl">
              <table className="w-full min-w-[900px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-secondary/40">
                    <th className="py-6 px-6 font-bold text-foreground w-[32%] rounded-tl-3xl text-sm tracking-tight">Features & Capabilities</th>
                    <th className="py-6 px-5 font-bold text-foreground text-center text-sm w-[17%]">
                      <div className="text-base font-extrabold text-foreground">Free</div>
                      <div className="text-xs font-medium text-muted-foreground mt-0.5">$0 forever</div>
                    </th>
                    <th className="py-6 px-5 font-bold text-primary text-center bg-primary/10 text-sm w-[17%] border-x border-primary/20">
                      <div className="inline-flex items-center gap-1.5 text-base font-extrabold text-primary">
                        <span>Pro</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary text-white font-bold uppercase tracking-wider">Popular</span>
                      </div>
                      <div className="text-xs font-semibold text-primary/80 mt-0.5">$15 / seat / mo</div>
                    </th>
                    <th className="py-6 px-5 font-bold text-foreground text-center text-sm w-[17%]">
                      <div className="text-base font-extrabold text-foreground">Enterprise</div>
                      <div className="text-xs font-medium text-muted-foreground mt-0.5">$39 / seat / mo</div>
                    </th>
                    <th className="py-6 px-5 font-bold text-foreground text-center rounded-tr-3xl text-sm w-[17%]">
                      <div className="text-base font-extrabold text-foreground">Custom</div>
                      <div className="text-xs font-medium text-muted-foreground mt-0.5">Tailored deployment</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="text-xs text-muted-foreground">
                  {/* Category 1: Live Video Meetings */}
                  <tr className="bg-secondary/70 font-bold text-foreground border-y border-border">
                    <td colSpan={5} className="py-3 px-6 text-[11px] font-bold uppercase tracking-wider text-primary">
                      Live Video Meetings
                    </td>
                  </tr>
                  <tr className="border-b border-border/60 hover:bg-secondary/30 transition-colors">
                    <td className="py-4 px-6 font-semibold text-foreground text-sm">Participants per Call</td>
                    <td className="py-4 px-5 text-center">10 participants</td>
                    <td className="py-4 px-5 text-center font-bold text-primary bg-primary/5 border-x border-primary/20">300 participants</td>
                    <td className="py-4 px-5 text-center font-bold text-foreground">Unlimited</td>
                    <td className="py-4 px-5 text-center font-bold text-foreground">Unlimited (Dedicated Cluster)</td>
                  </tr>
                  <tr className="border-b border-border/60 hover:bg-secondary/30 transition-colors">
                    <td className="py-4 px-6 font-semibold text-foreground text-sm">Video & Audio Quality</td>
                    <td className="py-4 px-5 text-center">720p HD</td>
                    <td className="py-4 px-5 text-center font-bold text-primary bg-primary/5 border-x border-primary/20">1080p Full HD</td>
                    <td className="py-4 px-5 text-center font-bold text-foreground">4K Ultra HD</td>
                    <td className="py-4 px-5 text-center font-bold text-foreground">4K + Media Relays</td>
                  </tr>
                  <tr className="border-b border-border/60 hover:bg-secondary/30 transition-colors">
                    <td className="py-4 px-6 font-semibold text-foreground text-sm">Screen Sharing & Whiteboard</td>
                    <td className="py-4 px-5 text-center"><Check className="w-4 h-4 mx-auto text-primary" /></td>
                    <td className="py-4 px-5 text-center bg-primary/5 border-x border-primary/20"><Check className="w-4 h-4 mx-auto text-primary" /></td>
                    <td className="py-4 px-5 text-center"><Check className="w-4 h-4 mx-auto text-primary" /></td>
                    <td className="py-4 px-5 text-center"><Check className="w-4 h-4 mx-auto text-primary" /></td>
                  </tr>
                  <tr className="border-b border-border/60 hover:bg-secondary/30 transition-colors">
                    <td className="py-4 px-6 font-semibold text-foreground text-sm">Live Chat & Reactions</td>
                    <td className="py-4 px-5 text-center"><Check className="w-4 h-4 mx-auto text-primary" /></td>
                    <td className="py-4 px-5 text-center bg-primary/5 border-x border-primary/20"><Check className="w-4 h-4 mx-auto text-primary" /></td>
                    <td className="py-4 px-5 text-center"><Check className="w-4 h-4 mx-auto text-primary" /></td>
                    <td className="py-4 px-5 text-center"><Check className="w-4 h-4 mx-auto text-primary" /></td>
                  </tr>

                  {/* Category 2: Async Video & Recording */}
                  <tr className="bg-secondary/70 font-bold text-foreground border-y border-border">
                    <td colSpan={5} className="py-3 px-6 text-[11px] font-bold uppercase tracking-wider text-primary">
                      Async Video & Screen Recording
                    </td>
                  </tr>
                  <tr className="border-b border-border/60 hover:bg-secondary/30 transition-colors">
                    <td className="py-4 px-6 font-semibold text-foreground text-sm">Async Video Limit</td>
                    <td className="py-4 px-5 text-center">10 videos/mo (15 min cap)</td>
                    <td className="py-4 px-5 text-center font-bold text-primary bg-primary/5 border-x border-primary/20">Unlimited (1 hr cap)</td>
                    <td className="py-4 px-5 text-center font-bold text-foreground">Unlimited (No caps)</td>
                    <td className="py-4 px-5 text-center font-bold text-foreground">Unlimited (Custom retention)</td>
                  </tr>
                  <tr className="border-b border-border/60 hover:bg-secondary/30 transition-colors">
                    <td className="py-4 px-6 font-semibold text-foreground text-sm">PiP Webcam + Screen Canvas</td>
                    <td className="py-4 px-5 text-center">Standard</td>
                    <td className="py-4 px-5 text-center font-bold text-primary bg-primary/5 border-x border-primary/20">HD Studio Engine</td>
                    <td className="py-4 px-5 text-center font-bold text-foreground">4K Studio Engine</td>
                    <td className="py-4 px-5 text-center font-bold text-foreground">Custom Studio + Teleprompter</td>
                  </tr>
                  <tr className="border-b border-border/60 hover:bg-secondary/30 transition-colors">
                    <td className="py-4 px-6 font-semibold text-foreground text-sm">Viewer Analytics & Heatmaps</td>
                    <td className="py-4 px-5 text-center text-muted-foreground">—</td>
                    <td className="py-4 px-5 text-center font-bold text-primary bg-primary/5 border-x border-primary/20">Views & Retention Curve</td>
                    <td className="py-4 px-5 text-center font-bold text-foreground">Second-by-second Drop-off</td>
                    <td className="py-4 px-5 text-center font-bold text-foreground">Custom BI & Telemetry Sync</td>
                  </tr>
                  <tr className="border-b border-border/60 hover:bg-secondary/30 transition-colors">
                    <td className="py-4 px-6 font-semibold text-foreground text-sm">Password Protection & Expiring Links</td>
                    <td className="py-4 px-5 text-center text-muted-foreground">—</td>
                    <td className="py-4 px-5 text-center bg-primary/5 border-x border-primary/20"><Check className="w-4 h-4 mx-auto text-primary" /></td>
                    <td className="py-4 px-5 text-center"><Check className="w-4 h-4 mx-auto text-primary" /></td>
                    <td className="py-4 px-5 text-center font-bold text-foreground">Domain Gating & Custom DRM</td>
                  </tr>

                  {/* Category 3: Team Spaces */}
                  <tr className="bg-secondary/70 font-bold text-foreground border-y border-border">
                    <td colSpan={5} className="py-3 px-6 text-[11px] font-bold uppercase tracking-wider text-primary">
                      Team Spaces & Collaboration
                    </td>
                  </tr>
                  <tr className="border-b border-border/60 hover:bg-secondary/30 transition-colors">
                    <td className="py-4 px-6 font-semibold text-foreground text-sm">Persistent Team Spaces</td>
                    <td className="py-4 px-5 text-center">Up to 5 Spaces</td>
                    <td className="py-4 px-5 text-center font-bold text-primary bg-primary/5 border-x border-primary/20">Unlimited Spaces</td>
                    <td className="py-4 px-5 text-center font-bold text-foreground">Unlimited Spaces</td>
                    <td className="py-4 px-5 text-center font-bold text-foreground">Multi-Tenant Spaces</td>
                  </tr>
                  <tr className="border-b border-border/60 hover:bg-secondary/30 transition-colors">
                    <td className="py-4 px-6 font-semibold text-foreground text-sm">Shared Space Notes & Action Boards</td>
                    <td className="py-4 px-5 text-center">Basic</td>
                    <td className="py-4 px-5 text-center font-bold text-primary bg-primary/5 border-x border-primary/20">Collaborative Live Sync</td>
                    <td className="py-4 px-5 text-center font-bold text-foreground">Collaborative Live Sync</td>
                    <td className="py-4 px-5 text-center font-bold text-foreground">Two-way Jira / Linear Sync</td>
                  </tr>
                  <tr className="border-b border-border/60 hover:bg-secondary/30 transition-colors">
                    <td className="py-4 px-6 font-semibold text-foreground text-sm">Cross-Space Search & Discovery</td>
                    <td className="py-4 px-5 text-center text-muted-foreground">—</td>
                    <td className="py-4 px-5 text-center bg-primary/5 border-x border-primary/20"><Check className="w-4 h-4 mx-auto text-primary" /></td>
                    <td className="py-4 px-5 text-center"><Check className="w-4 h-4 mx-auto text-primary" /></td>
                    <td className="py-4 px-5 text-center font-bold text-foreground">Semantic Vector Index</td>
                  </tr>

                  {/* Category 4: Meeting Intelligence */}
                  <tr className="bg-secondary/70 font-bold text-foreground border-y border-border">
                    <td colSpan={5} className="py-3 px-6 text-[11px] font-bold uppercase tracking-wider text-primary">
                      Meeting Intelligence & Automation
                    </td>
                  </tr>
                  <tr className="border-b border-border/60 hover:bg-secondary/30 transition-colors">
                    <td className="py-4 px-6 font-semibold text-foreground text-sm">Automated Multilingual Transcripts</td>
                    <td className="py-4 px-5 text-center text-muted-foreground">—</td>
                    <td className="py-4 px-5 text-center font-bold text-primary bg-primary/5 border-x border-primary/20">30+ Languages</td>
                    <td className="py-4 px-5 text-center font-bold text-foreground">50+ Languages</td>
                    <td className="py-4 px-5 text-center font-bold text-foreground">100+ & Custom Vocabulary</td>
                  </tr>
                  <tr className="border-b border-border/60 hover:bg-secondary/30 transition-colors">
                    <td className="py-4 px-6 font-semibold text-foreground text-sm">Executive Summaries & Action Items</td>
                    <td className="py-4 px-5 text-center">Basic Summary</td>
                    <td className="py-4 px-5 text-center font-bold text-primary bg-primary/5 border-x border-primary/20">Full Extraction + Owners</td>
                    <td className="py-4 px-5 text-center font-bold text-foreground">Full Extraction + Owners</td>
                    <td className="py-4 px-5 text-center font-bold text-foreground">Custom Prompts & Tone</td>
                  </tr>
                  <tr className="border-b border-border/60 hover:bg-secondary/30 transition-colors">
                    <td className="py-4 px-6 font-semibold text-foreground text-sm">Smart Follow-up Action Emails</td>
                    <td className="py-4 px-5 text-center text-muted-foreground">—</td>
                    <td className="py-4 px-5 text-center bg-primary/5 border-x border-primary/20"><Check className="w-4 h-4 mx-auto text-primary" /></td>
                    <td className="py-4 px-5 text-center"><Check className="w-4 h-4 mx-auto text-primary" /></td>
                    <td className="py-4 px-5 text-center font-bold text-foreground">Custom SMTP & Templates</td>
                  </tr>
                  <tr className="border-b border-border/60 hover:bg-secondary/30 transition-colors">
                    <td className="py-4 px-6 font-semibold text-foreground text-sm">Speaker Talk-Time & Sentiment</td>
                    <td className="py-4 px-5 text-center text-muted-foreground">—</td>
                    <td className="py-4 px-5 text-center font-bold text-primary bg-primary/5 border-x border-primary/20">Talk-time Ratio</td>
                    <td className="py-4 px-5 text-center font-bold text-foreground">Full Sentiment Analytics</td>
                    <td className="py-4 px-5 text-center font-bold text-foreground">Executive Team Telemetry</td>
                  </tr>

                  {/* Category 5: Storage & Governance */}
                  <tr className="bg-secondary/70 font-bold text-foreground border-y border-border">
                    <td colSpan={5} className="py-3 px-6 text-[11px] font-bold uppercase tracking-wider text-primary">
                      Storage, Governance & Support
                    </td>
                  </tr>
                  <tr className="border-b border-border/60 hover:bg-secondary/30 transition-colors">
                    <td className="py-4 px-6 font-semibold text-foreground text-sm">Cloud Storage Limit</td>
                    <td className="py-4 px-5 text-center font-bold">2 GB</td>
                    <td className="py-4 px-5 text-center font-bold text-primary bg-primary/5 border-x border-primary/20">15 GB</td>
                    <td className="py-4 px-5 text-center font-bold text-foreground">50 GB</td>
                    <td className="py-4 px-5 text-center font-bold text-foreground">TB Scale / BYO-S3</td>
                  </tr>
                  <tr className="border-b border-border/60 hover:bg-secondary/30 transition-colors">
                    <td className="py-4 px-6 font-semibold text-foreground text-sm">Custom Branding & Branded Rooms</td>
                    <td className="py-4 px-5 text-center text-muted-foreground">—</td>
                    <td className="py-4 px-5 text-center text-muted-foreground bg-primary/5 border-x border-primary/20">—</td>
                    <td className="py-4 px-5 text-center font-bold text-foreground">Logos & Colors</td>
                    <td className="py-4 px-5 text-center font-bold text-foreground">Full White-Label & Subdomains</td>
                  </tr>
                  <tr className="border-b border-border/60 hover:bg-secondary/30 transition-colors">
                    <td className="py-4 px-6 font-semibold text-foreground text-sm">Single Sign-On (SSO)</td>
                    <td className="py-4 px-5 text-center text-muted-foreground">—</td>
                    <td className="py-4 px-5 text-center text-muted-foreground bg-primary/5 border-x border-primary/20">—</td>
                    <td className="py-4 px-5 text-center font-bold text-foreground">Google & SAML 2.0</td>
                    <td className="py-4 px-5 text-center font-bold text-foreground">Okta, Azure AD, SAML, SCIM</td>
                  </tr>
                  <tr className="border-b border-border/60 hover:bg-secondary/30 transition-colors">
                    <td className="py-4 px-6 font-semibold text-foreground text-sm">Enterprise Audit Trail</td>
                    <td className="py-4 px-5 text-center text-muted-foreground">—</td>
                    <td className="py-4 px-5 text-center text-muted-foreground bg-primary/5 border-x border-primary/20">—</td>
                    <td className="py-4 px-5 text-center"><Check className="w-4 h-4 mx-auto text-primary" /></td>
                    <td className="py-4 px-5 text-center font-bold text-foreground">Immutable SIEM Stream</td>
                  </tr>
                  <tr className="border-b border-border/60 hover:bg-secondary/30 transition-colors">
                    <td className="py-4 px-6 font-semibold text-foreground text-sm">SLA & Dedicated Support</td>
                    <td className="py-4 px-5 text-center">Community Support</td>
                    <td className="py-4 px-5 text-center font-bold text-primary bg-primary/5 border-x border-primary/20">Standard Email Support</td>
                    <td className="py-4 px-5 text-center font-bold text-foreground">99.9% SLA + AM</td>
                    <td className="py-4 px-5 text-center font-bold text-foreground">99.99% SLA + 24/7 CSM</td>
                  </tr>

                  {/* Bottom Action Row */}
                  <tr className="bg-secondary/40">
                    <td className="py-6 px-6 font-bold text-foreground text-sm">Choose Your Plan</td>
                    <td className="py-6 px-5 text-center">
                      <button
                        onClick={() => handlePricingAction('Free')}
                        className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-card hover:bg-secondary text-foreground border border-border shadow-sm transition-all"
                      >
                        {user ? 'Current Plan' : 'Get Started Free'}
                      </button>
                    </td>
                    <td className="py-6 px-5 text-center bg-orange-500/5 border-x border-orange-500/20">
                      <button
                        onClick={() => handlePricingAction('Pro')}
                        disabled={isProcessingPay}
                        className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/25 transition-all"
                      >
                        Choose Pro
                      </button>
                    </td>
                    <td className="py-6 px-5 text-center">
                      <button
                        onClick={() => handlePricingAction('Enterprise')}
                        disabled={isProcessingPay}
                        className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-[#0C5C3C] hover:bg-[#0C5C3C]/90 text-white shadow-md transition-all font-bold"
                      >
                        Choose Enterprise
                      </button>
                    </td>
                    <td className="py-6 px-5 text-center">
                      <button
                        onClick={() => navigate('/custom-pricing')}
                        className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-orange-500 hover:bg-orange-600 text-white shadow-md transition-all"
                      >
                        Contact Sales
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Start Free Meeting / Trial CTA Banner - Sleek Horizontal Layout */}
        <section className="py-12 md:py-16 px-6 md:px-12 max-w-6xl mx-auto">
          <div className="relative p-8 md:p-10 lg:p-12 rounded-3xl bg-gradient-to-r from-[#101D22] via-card to-[#101D22] border border-primary/30 shadow-2xl overflow-hidden">
            {/* Ambient mesh glow */}
            <div className="absolute -top-24 -left-24 w-72 h-72 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-[#D9A400]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 text-center lg:text-left">
              {/* Left Column: Heading and Context */}
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 border border-primary/30 mb-3.5">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">Instant Access · No Credit Card Required</span>
                </div>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-foreground mb-3 leading-tight">
                  Start your first meeting.
                  <span className="block text-primary">Instant. Free. Right now.</span>
                </h2>
                <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                  Join or host meetings immediately with zero friction. Unify organizational memory, async video recordings, integrations, and persistent team spaces in one place.
                </p>
              </div>

              {/* Right Column: CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3.5 shrink-0 w-full sm:w-auto">
                <button
                  onClick={() => handleCreateMeeting('instant')}
                  disabled={isCreating}
                  className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-xl shadow-orange-500/30 transition-all hover:scale-[1.02] active:scale-95 text-sm"
                >
                  <Video className="w-4 h-4" /> Start Free Meeting
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold border border-border transition-all text-sm"
                >
                  Sign In <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Corporate Floating Action Button (FAB) for Support */}
        <div className="fixed bottom-8 md:bottom-10 right-6 z-50 flex flex-col items-end gap-3">
          <AnimatePresence>
            {isFabOpen && (
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="w-64 p-3 rounded-2xl bg-card border border-border shadow-2xl space-y-2 backdrop-blur-xl"
              >
                <div className="px-3 py-2 border-b border-border/80">
                  <p className="text-xs font-bold text-foreground">Optavel Enterprise Support</p>
                  <p className="text-[11px] text-muted-foreground">Select how you'd like to reach us:</p>
                </div>

                <button
                  onClick={() => {
                    setSupportPanel('chat');
                    setIsFabOpen(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/60 hover:bg-secondary text-left transition-colors border border-border/60"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Live Support Chat</p>
                    <p className="text-[10px] text-muted-foreground">Real-time AI & agent help</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setSupportPanel('call');
                    setIsFabOpen(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/60 hover:bg-secondary text-left transition-colors border border-border/60"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0">
                    <PhoneCall className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Request a Call</p>
                    <p className="text-[10px] text-muted-foreground">Submit for a direct callback</p>
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="button"
            onClick={() => setIsFabOpen(prev => !prev)}
            aria-label="Toggle Support Options"
            className="flex items-center gap-2.5 px-4 py-3 rounded-full bg-[#0C5C3C] hover:bg-[#0C5C3C]/90 text-white font-bold shadow-2xl shadow-[#0C5C3C]/40 border border-[#0C5C3C]/60 transition-all hover:scale-105 active:scale-95"
          >
            {isFabOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <>
                <MessageSquare className="w-5 h-5" />
                <span className="text-xs tracking-wide">Need Help?</span>
              </>
            )}
          </button>
        </div>

        {/* ΓöÇΓöÇ FOOTER ΓöÇΓöÇ */}
        <MarketingFooter onOpenSupport={(t) => setSupportPanel(t || "chat")} />
      

      {/* Share Link Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg p-0 border border-white/10 dark:border-white/10 shadow-2xl rounded-3xl overflow-hidden bg-card border-border">
          <DialogTitle className="sr-only">Meeting Link Created</DialogTitle>
          <DialogDescription className="sr-only">Your meeting link is ready to be copied.</DialogDescription>
          
          <div className="p-8 md:p-10 text-center flex flex-col items-center">
            {/* Icon */}
            <div className="w-16 h-16 bg-primary/10 dark:bg-primary/20 rounded-2xl flex items-center justify-center mb-6">
              <Video className="w-8 h-8 text-primary" />
            </div>

            {/* Text */}
            <h2 className="text-xl font-bold text-slate-900 dark:text-foreground mb-2 tracking-tight">Your meeting is ready</h2>
            <p className="text-slate-500 dark:text-muted-foreground mb-8 max-w-sm text-sm leading-relaxed">
              Share this link with anyone you'd like to invite. They can join from any browser.
            </p>

            {/* Link Box */}
            <div className="w-full bg-background border border-border rounded-2xl p-4">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 dark:text-muted-foreground uppercase tracking-widest mb-2 text-left">Meeting Link</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0 bg-card px-4 py-3 rounded-xl border border-border overflow-hidden">
                  <span className="text-sm text-foreground font-mono truncate block w-full select-all">{laterLink}</span>
                </div>
                <Button
                  type="button"
                  className="rounded-xl shrink-0 gap-2 bg-primary hover:bg-primary/90 text-white font-semibold shadow-lg shadow-primary/20 transition-all px-5 py-3 h-auto"
                  onClick={() => {
                    navigator.clipboard.writeText(laterLink);
                    toast({ title: 'Copied!', description: 'Meeting link copied to clipboard.' });
                  }}
                >
                  <Copy className="h-4 w-4" />
                  Copy Link
                </Button>
              </div>
            </div>

            {/* Done Button */}
            <Button
              onClick={() => setIsDialogOpen(false)}
              variant="ghost"
              className="mt-6 text-slate-500 dark:text-muted-foreground hover:text-slate-700 dark:hover:text-white text-sm font-medium"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Support Panel */}
      <AnimatePresence>
        {supportPanel && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-slate-900/20 backdrop-blur-sm lg:hidden"
              onClick={() => setSupportPanel(null)}
            />
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-[400px] max-w-full bg-card shadow-[-10px_0_30px_rgba(0,0,0,0.5)] border-l border-border flex flex-col z-[110] border-l-4 border-primary"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h3 className="text-xl font-bold">{supportPanel === 'chat' ? 'Live Chat Support' : 'Request a Call'}</h3>
                <button 
                  onClick={() => { setSupportPanel(null); setShowHumanForm(false); }} 
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-secondary text-slate-500 dark:text-muted-foreground hover:bg-slate-200 dark:bg-accent hover:text-slate-800 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
                {supportPanel === 'chat' ? (
                  <SupportAIChat />
                ) : (
                  <div className="p-6">
                    <form className="space-y-4" onSubmit={async (e) => { 
                      e.preventDefault(); 
                      setSubmittingSupport(true); 
                      try {
                        await supabase.from('clipad_marketing_requests').insert({
                          type: 'call',
                          name: supportForm.name,
                          phone: supportForm.phone
                        });
                        toast({title: 'Request Sent', description: 'We will call you shortly.'});
                        setSupportPanel(null); 
                        setSupportForm({ name: '', email: '', phone: '', message: '' });
                      } catch (err) {
                        toast({title: 'Error', description: 'Failed to request call.', variant: 'destructive'});
                      } finally {
                        setSubmittingSupport(false);
                      }
                    }}>
                    <div>
                      <label className="text-sm font-medium text-foreground">Name</label>
                      <input 
                        type="text" 
                        required 
                        value={supportForm.name}
                        onChange={(e) => setSupportForm(prev => ({...prev, name: e.target.value}))}
                        className="w-full mt-1 px-4 py-2 bg-background border border-border text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-[#fad503]/50" 
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Phone Number</label>
                      <input 
                        type="tel" 
                        required 
                        value={supportForm.phone}
                        onChange={(e) => setSupportForm(prev => ({...prev, phone: e.target.value}))}
                        className="w-full mt-1 px-4 py-2 bg-background border border-border text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-[#fad503]/50" 
                      />
                    </div>
                    <Button type="submit" disabled={submittingSupport} className="w-full rounded-xl mt-4 bg-primary hover:bg-primary/90 text-white font-semibold">
                      {submittingSupport ? 'Submitting...' : 'Request Call'}
                    </Button>
                    </form>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ContactSalesModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
      <PaymentReceiptModal isOpen={!!receiptDetails} onClose={() => setDetails(null)} transactionDetails={receiptDetails} />
      
      {/* Mobile Bottom Navigation */}
      <ClipadMobileNav isMarketing={true} />
    </div>
  );
}

// Fix icon reference
function MonitorIcon(props) { return <Monitor {...props} />; }
