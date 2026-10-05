import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SEO from '@/components/seo/SEO';
import { generateShortId } from '@/utils/idGenerator';
import { supabase } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { OrbitLoader, PageLoader } from '@/components/ui/orbit-loader';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Menu, Zap, Target, Star, Brain, Camera, Rocket, MessageSquare, PhoneCall, ArrowRight, ShieldCheck, CheckCircle, Video, TrendingUp, Calendar, X, Keyboard, Sparkles, Copy, Link as LinkIcon, Users, Layers, ChevronRight, ChevronLeft, Monitor, Globe, Plus, Clock, Search } from 'lucide-react';
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


const pillars = [
  {
    icon: Video,
    color: 'from-orange-500 to-orange-400',
    glow: 'shadow-orange-500/20',
    title: 'HD Live Meetings',
    desc: 'No time limits. Up to 500 participants. Speaker spotlight, noise cancellation, live captions, breakout rooms and a persistent whiteboard — all built in.'
  },
  {
    icon: Camera,
    color: 'from-green-500 to-emerald-500',
    glow: 'shadow-green-500/20',
    title: 'Async Video Messages',
    desc: 'Record camera, screen, or both in picture-in-picture. Share an instant link. Viewers leave timestamped comments and emoji reactions at exact moments.'
  },
  {
    icon: Brain,
    color: 'from-yellow-500 to-amber-500',
    glow: 'shadow-yellow-500/20',
    title: 'AI Meeting Intelligence',
    desc: 'Every meeting produces a full summary, key decisions, extracted action items with owners, open questions, and sentiment — within 2 minutes of ending.'
  },
  {
    icon: Layers,
    color: 'from-orange-500 to-orange-400',
    glow: 'shadow-orange-500/20',
    title: 'Team Spaces',
    desc: 'Persistent rooms for every team and project. Live meetings, async videos, shared notes, action boards, and cross-space search in one place.'
  },
  {
    icon: Target,
    color: 'from-green-500 to-emerald-500',
    glow: 'shadow-green-500/20',
    title: 'Sales & Demo Layer',
    desc: 'Record personalised video proposals. Know who watched, how much, where they paused, and whether they shared it — before your follow-up call.'
  },
  {
    icon: Zap,
    color: 'from-yellow-500 to-amber-500',
    glow: 'shadow-yellow-500/20',
    title: 'Smart Follow-up',
    desc: 'After every meeting, each participant receives only their personal action items with full context. Not the whole notes — just what they need to do.'
  },
];

const stats = [
  { value: '500+', label: 'Participants per call' },
  { value: '2 min', label: 'AI summary delivery' },
  { value: '0', label: 'Time limits' },
  { value: '100%', label: 'End-to-end encrypted' },
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
    title: 'Team Spaces & Async Video',
    description: 'Create persistent rooms for every project. Record picture-in-picture async updates and share instantly.',
    render: () => (
      <div className="relative flex flex-col items-center justify-center w-full h-full select-none">
        <div className="absolute w-64 h-64 rounded-full border-2 border-indigo-100 animate-pulse" />
        <div className="absolute w-44 h-44 rounded-full bg-indigo-50" />
        <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-400 flex items-center justify-center shadow-2xl shadow-indigo-500/40">
          <Layers className="w-14 h-14 text-white" strokeWidth={1.5} />
        </div>
        <div className="absolute top-6 right-10 bg-background border border-border rounded-xl px-3 py-1.5 shadow-lg flex items-center gap-1.5">
          <Camera className="w-3 h-3 text-indigo-500" />
          <span className="text-xs font-semibold text-indigo-600">Async Ready</span>
        </div>
        <div className="absolute bottom-10 left-6 bg-background border border-border rounded-xl px-3 py-1.5 shadow-lg">
          <span className="text-xs font-medium text-muted-foreground font-mono">Design Team Space</span>
        </div>
      </div>
    ),
  },
  {
    id: 1,
    title: 'AI Meeting Intelligence',
    description: 'Every meeting produces a full summary, extracted action items, and key decisions within 2 minutes of ending.',
    render: () => (
      <div className="relative flex flex-col items-center justify-center w-full h-full select-none">
        <div className="absolute w-64 h-64 rounded-full border-2 border-pink-100 animate-pulse" />
        <div className="absolute w-44 h-44 rounded-full bg-pink-50" />
        <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-pink-500 to-rose-400 flex items-center justify-center shadow-2xl shadow-pink-500/40">
          <Brain className="w-14 h-14 text-white" strokeWidth={1.5} />
        </div>
        <div className="absolute top-4 right-8 bg-background border border-border rounded-xl px-3 py-1.5 shadow-lg flex items-center gap-2">
          <Brain className="w-3 h-3 text-pink-500" />
          <span className="text-xs font-semibold text-pink-600">Summary Gen</span>
        </div>
        <div className="absolute bottom-8 left-4 bg-background border border-border rounded-xl px-3 py-2 shadow-lg text-center">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">Action Items</span>
          <span className="text-xs font-bold text-foreground">3 assigned to you</span>
        </div>
      </div>
    ),
  },
  {
    id: 2,
    title: 'Smart Follow-up',
    description: 'Participants receive only their personal action items with full context. No more reading through entire transcripts.',
    render: () => (
      <div className="relative flex flex-col items-center justify-center w-full h-full select-none">
        <div className="absolute w-64 h-64 rounded-full border-2 border-emerald-100 animate-pulse" />
        <div className="absolute w-44 h-44 rounded-full bg-emerald-50" />
        <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center shadow-2xl shadow-emerald-500/40">
          <Zap className="w-14 h-14 text-white" strokeWidth={1.5} />
        </div>
        <div className="absolute bottom-6 flex -space-x-3">
          {['bg-blue-400', 'bg-rose-400', 'bg-amber-400', 'bg-emerald-400'].map((c, i) => (
            <div key={i} className={`w-9 h-9 rounded-full ${c} border-2 border-background flex items-center justify-center`}>
              <Users className="w-4 h-4 text-white" />
            </div>
          ))}
        </div>
        <div className="absolute top-4 right-6 bg-background border border-border rounded-xl px-3 py-1.5 shadow-lg flex items-center gap-1.5">
          <CheckCircle className="w-3 h-3 text-emerald-500" />
          <span className="text-xs font-semibold text-emerald-600">Context aware</span>
        </div>
      </div>
    ),
  },
];

function useLiveClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']");
    if (link) {
      link.href = '/clipad-logo.svg';
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
  
  const { user, isLoadingAuth } = useAuth();
  const companyId = useCompanyId();
  const [exchangeRate, setExchangeRate] = useState(218 / 19);
  const [isProcessingPay, setIsProcessingPay] = useState(false);

  const navigate = useNavigate();
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
                company_id: companyId,
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

      try {
        await supabase.from('video_rooms').upsert({
          id: crypto.randomUUID(),
          company_id: companyId || null,
          daily_room_name: targetRoomName,
          daily_room_url: roomData?.url || `https://optavel.daily.co/${targetRoomName}`,
          privacy_type: 'public',
          host_id: user?.id || null,
          status: 'active',
          meeting_type: 'instant'
        });
      } catch (_) {}

      if (type === 'instant') {
        navigate(`/join/${targetRoomName}`);
      } else {
        const { protocol, hostname, port } = window.location;
        setLaterLink(`${protocol}//${hostname}${port ? ':' + port : ''}/join/${targetRoomName}`);
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

  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  if (isLoadingAuth) {
    return <PageLoader label="" />;
  }


  return (
    <div className={`light min-h-screen bg-white text-slate-900 flex flex-col font-sans relative transition-all duration-500 ease-in-out overflow-x-hidden ${supportPanel ? 'lg:pr-[400px]' : ''}`}>
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-orange-500/5 blur-[120px]" />
      </div>
      <SEO 
        title="CliPad - #1 Enterprise AI-Powered Organizational Memory Layer" 
        description="CliPad is a free, secure, enterprise-grade collaborative productivity workspace. Connect your team with chat, spaces, and HD video meetings instantly. Trusted by teams worldwide." 
        type="website"
      />
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 border-b border-slate-200/50 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 flex items-center justify-center text-primary">
            <CliPadLogo size={36} />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">CliPad</span>
        </div>
        
        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1 text-sm text-muted-foreground">
          <a href="#features" className="px-4 py-2 rounded-lg hover:text-foreground hover:bg-secondary transition-colors">Features</a>
          <a href="#pricing" className="px-4 py-2 rounded-lg hover:text-foreground hover:bg-secondary transition-colors">Pricing</a>
          <a href="#contact" className="px-4 py-2 rounded-lg hover:text-foreground hover:bg-secondary transition-colors">Support</a>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-sm font-semibold tabular-nums bg-slate-100/80 px-3 py-1.5 rounded-xl border border-slate-200/60 shadow-inner text-slate-700">
            <Clock className="w-4 h-4 text-primary" />
            <span>{timeStr}</span>
            <span className="text-slate-300 mx-0.5">|</span>
            <span>{dateStr}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <LanguageSwitcher className="h-9 w-[130px] rounded-xl border border-slate-200 dark:border-border bg-background hover:bg-slate-50 dark:hover:bg-secondary text-slate-700 dark:text-foreground text-xs" />
            {user ? (
              <Button onClick={() => navigate('/dashboard')} className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                <Layers className="w-4 h-4 mr-2" /> Dashboard
              </Button>
            ) : (
              <Button onClick={() => navigate('/login')} variant="outline" className="rounded-xl border-border bg-background hover:bg-secondary text-foreground">
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>



      <main className="relative z-10 flex-1 flex flex-col md:flex-row items-center justify-center p-6 md:p-12 gap-12 md:gap-16 max-w-7xl mx-auto w-full">
        <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left space-y-8 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50/90 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 shadow-md transition-all duration-300 hover:scale-105 select-none">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span>CliPad 2.0 Live</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-normal text-slate-800 leading-tight tracking-tight">
            #1 Enterprise AI-powered organizational memory and intelligence layer.<br />Now free for everyone.
          </h1>
          <p className="text-lg text-slate-500 leading-relaxed">
            CliPad captures, connects, and preserves your company's knowledge—through meetings, async video, collaboration, and intelligent context.
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
              <DropdownMenuContent align="start" className="w-64 p-2 shadow-xl border-slate-100 rounded-xl">
                <DropdownMenuItem
                  onClick={() => handleCreateMeeting('later')}
                  className="flex items-center gap-3 p-3 cursor-pointer rounded-lg hover:bg-slate-50"
                >
                  <LinkIcon className="w-5 h-5 text-slate-500" />
                  <span className="font-medium text-slate-700">Create a meeting for later</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleCreateMeeting('instant')}
                  className="flex items-center gap-3 p-3 cursor-pointer rounded-lg hover:bg-slate-50"
                >
                  <Plus className="w-5 h-5 text-slate-500" />
                  <span className="font-medium text-slate-700">Start an instant meeting</span>
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
                className="block w-full pl-11 pr-14 py-3 border border-slate-200 rounded-xl leading-5 bg-transparent placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition-colors"
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
            className="absolute left-0 z-10 w-10 h-10 rounded-full bg-white hover:bg-slate-50 shadow-md border border-slate-100 flex items-center justify-center transition-all"
          >
            <ChevronLeft className="w-5 h-5 text-slate-500" />
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
              <h2 className="text-2xl font-semibold text-slate-900 mb-2 tracking-tight">
                {slides[currentSlide].title}
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">
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
                      ? 'bg-primary w-6'
                      : 'bg-slate-200 w-2 hover:bg-slate-300'
                  }`}
                />
              ))}
            </div>
          </div>
          <button
            onClick={nextSlide}
            className="absolute right-0 z-10 w-10 h-10 rounded-full bg-white hover:bg-slate-50 shadow-md border border-slate-100 flex items-center justify-center transition-all"
          >
            <ChevronRight className="w-5 h-5 text-slate-500" />
          </button>
        </div>
      </main>

      <section id="features" className="py-24 px-6 md:px-12 max-w-7xl mx-auto overflow-hidden">
        <div className="text-center mb-4">

          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-5">Everything your team needs.</h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">Not five tools. One.</p>
        </div>

        <FeaturesCircle />
      </section>

        <AdvancedFeaturesBento />
        <WithoutCliPadSection />
        <WithCliPadSection />

        <section id="pricing" className="py-24 px-6 md:px-12 max-w-7xl mx-auto w-full overflow-hidden md:overflow-visible">
          <div className="text-center mb-16">

            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-5">Choose the perfect plan for your team.</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">Scale your operations seamlessly with Clipad.</p>
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
                          tier.highlight ? 'text-primary' : tier.name === 'Custom' ? 'text-orange-500' : 'text-emerald-500'
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
                    tier.highlight 
                      ? 'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20' 
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

            <div className="w-full overflow-x-auto border border-border rounded-3xl bg-card shadow-sm">
              <table className="w-full min-w-[860px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-slate-50 dark:bg-white/5">
                    <th className="p-5 font-bold text-foreground w-[32%] rounded-tl-3xl text-sm">Features & Limits</th>
                    <th className="p-5 font-bold text-foreground text-center text-sm w-[17%]">
                      <div>Free</div>
                      <div className="text-xs font-normal text-muted-foreground mt-0.5">$0 forever</div>
                    </th>
                    <th className="p-5 font-bold text-primary text-center bg-primary/5 text-sm w-[17%]">
                      <div>Pro</div>
                      <div className="text-xs font-normal text-primary/80 mt-0.5">$15/mo</div>
                    </th>
                    <th className="p-5 font-bold text-foreground text-center text-sm w-[17%]">
                      <div>Enterprise</div>
                      <div className="text-xs font-normal text-muted-foreground mt-0.5">$39/mo</div>
                    </th>
                    <th className="p-5 font-bold text-foreground text-center rounded-tr-3xl text-sm w-[17%]">
                      <div>Custom</div>
                      <div className="text-xs font-normal text-muted-foreground mt-0.5">Tailored</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="text-xs text-slate-600 dark:text-slate-300">
                  {/* Category 1: Live Video Meetings */}
                  <tr className="bg-slate-100/60 dark:bg-white/5 font-bold text-foreground border-y border-border">
                    <td colSpan={5} className="py-2.5 px-5 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Live Video Meetings
                    </td>
                  </tr>
                  <tr className="border-b border-border/60 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-4 font-semibold text-foreground">Participants per Call</td>
                    <td className="p-4 text-center">10</td>
                    <td className="p-4 text-center font-bold text-primary bg-primary/5">300</td>
                    <td className="p-4 text-center font-bold text-foreground">Unlimited</td>
                    <td className="p-4 text-center font-bold text-foreground">Unlimited (Custom)</td>
                  </tr>
                  <tr className="border-b border-border/60 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-4 font-semibold text-foreground">Video & Audio Quality</td>
                    <td className="p-4 text-center">720p HD</td>
                    <td className="p-4 text-center font-bold text-primary bg-primary/5">1080p Full HD</td>
                    <td className="p-4 text-center font-bold text-foreground">4K Ultra HD</td>
                    <td className="p-4 text-center font-bold text-foreground">4K + Media Relays</td>
                  </tr>
                  <tr className="border-b border-border/60 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-4 font-semibold text-foreground">Screen Sharing & Whiteboard</td>
                    <td className="p-4 text-center text-emerald-500 font-bold">&check;</td>
                    <td className="p-4 text-center text-emerald-500 font-bold bg-primary/5">&check;</td>
                    <td className="p-4 text-center text-emerald-500 font-bold">&check;</td>
                    <td className="p-4 text-center text-emerald-500 font-bold">&check;</td>
                  </tr>
                  <tr className="border-b border-border/60 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-4 font-semibold text-foreground">Live Chat & Reactions</td>
                    <td className="p-4 text-center text-emerald-500 font-bold">&check;</td>
                    <td className="p-4 text-center text-emerald-500 font-bold bg-primary/5">&check;</td>
                    <td className="p-4 text-center text-emerald-500 font-bold">&check;</td>
                    <td className="p-4 text-center text-emerald-500 font-bold">&check;</td>
                  </tr>

                  {/* Category 2: Async Video & Recording */}
                  <tr className="bg-slate-100/60 dark:bg-white/5 font-bold text-foreground border-y border-border">
                    <td colSpan={5} className="py-2.5 px-5 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Async Video & Screen Recording
                    </td>
                  </tr>
                  <tr className="border-b border-border/60 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-4 font-semibold text-foreground">Async Video Limit</td>
                    <td className="p-4 text-center">10 videos/mo (15m)</td>
                    <td className="p-4 text-center font-bold text-primary bg-primary/5">Unlimited (1 hr)</td>
                    <td className="p-4 text-center font-bold text-foreground">Unlimited</td>
                    <td className="p-4 text-center font-bold text-foreground">Unlimited</td>
                  </tr>
                  <tr className="border-b border-border/60 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-4 font-semibold text-foreground">PiP Webcam + Screen Canvas</td>
                    <td className="p-4 text-center">Standard</td>
                    <td className="p-4 text-center font-bold text-primary bg-primary/5">HD Studio</td>
                    <td className="p-4 text-center font-bold text-foreground">4K Studio</td>
                    <td className="p-4 text-center font-bold text-foreground">Custom Studio</td>
                  </tr>
                  <tr className="border-b border-border/60 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-4 font-semibold text-foreground">Viewer Analytics & Drop-off Heatmaps</td>
                    <td className="p-4 text-center text-muted-foreground">&mdash;</td>
                    <td className="p-4 text-center font-bold text-primary bg-primary/5">Views & Retention</td>
                    <td className="p-4 text-center font-bold text-foreground">Drop-off Heatmaps</td>
                    <td className="p-4 text-center font-bold text-foreground">Custom BI & Telemetry</td>
                  </tr>
                  <tr className="border-b border-border/60 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-4 font-semibold text-foreground">Password Protection & Expiring Links</td>
                    <td className="p-4 text-center text-muted-foreground">&mdash;</td>
                    <td className="p-4 text-center text-emerald-500 font-bold bg-primary/5">&check;</td>
                    <td className="p-4 text-center text-emerald-500 font-bold">&check;</td>
                    <td className="p-4 text-center font-bold text-foreground">Domain Gating & Custom DRM</td>
                  </tr>

                  {/* Category 3: Team Spaces */}
                  <tr className="bg-slate-100/60 dark:bg-white/5 font-bold text-foreground border-y border-border">
                    <td colSpan={5} className="py-2.5 px-5 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Team Spaces & Collaboration
                    </td>
                  </tr>
                  <tr className="border-b border-border/60 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-4 font-semibold text-foreground">Persistent Team Spaces</td>
                    <td className="p-4 text-center">Up to 5</td>
                    <td className="p-4 text-center font-bold text-primary bg-primary/5">Unlimited</td>
                    <td className="p-4 text-center font-bold text-foreground">Unlimited</td>
                    <td className="p-4 text-center font-bold text-foreground">Multi-Tenant Spaces</td>
                  </tr>
                  <tr className="border-b border-border/60 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-4 font-semibold text-foreground">Shared Space Notes & Action Boards</td>
                    <td className="p-4 text-center">Basic</td>
                    <td className="p-4 text-center font-bold text-primary bg-primary/5">Collaborative</td>
                    <td className="p-4 text-center font-bold text-foreground">Collaborative</td>
                    <td className="p-4 text-center font-bold text-foreground">Two-way Jira/CRM Sync</td>
                  </tr>
                  <tr className="border-b border-border/60 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-4 font-semibold text-foreground">Cross-Space Search & Discovery</td>
                    <td className="p-4 text-center text-muted-foreground">&mdash;</td>
                    <td className="p-4 text-center text-emerald-500 font-bold bg-primary/5">&check;</td>
                    <td className="p-4 text-center text-emerald-500 font-bold">&check;</td>
                    <td className="p-4 text-center font-bold text-foreground">Semantic Vector Index</td>
                  </tr>

                  {/* Category 4: Meeting Intelligence */}
                  <tr className="bg-slate-100/60 dark:bg-white/5 font-bold text-foreground border-y border-border">
                    <td colSpan={5} className="py-2.5 px-5 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Meeting Intelligence & Automation
                    </td>
                  </tr>
                  <tr className="border-b border-border/60 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-4 font-semibold text-foreground">Automated Multilingual Transcripts</td>
                    <td className="p-4 text-center text-muted-foreground">&mdash;</td>
                    <td className="p-4 text-center font-bold text-primary bg-primary/5">30+ Languages</td>
                    <td className="p-4 text-center font-bold text-foreground">50+ Languages</td>
                    <td className="p-4 text-center font-bold text-foreground">100+ & Custom Vocab</td>
                  </tr>
                  <tr className="border-b border-border/60 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-4 font-semibold text-foreground">Executive Summaries & Action Items</td>
                    <td className="p-4 text-center">Basic</td>
                    <td className="p-4 text-center font-bold text-primary bg-primary/5">Full Extraction</td>
                    <td className="p-4 text-center font-bold text-foreground">Full Extraction</td>
                    <td className="p-4 text-center font-bold text-foreground">Custom Prompts & Tone</td>
                  </tr>
                  <tr className="border-b border-border/60 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-4 font-semibold text-foreground">Smart Follow-up Action Emails</td>
                    <td className="p-4 text-center text-muted-foreground">&mdash;</td>
                    <td className="p-4 text-center text-emerald-500 font-bold bg-primary/5">&check;</td>
                    <td className="p-4 text-center text-emerald-500 font-bold">&check;</td>
                    <td className="p-4 text-center font-bold text-foreground">Custom SMTP & Templates</td>
                  </tr>
                  <tr className="border-b border-border/60 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-4 font-semibold text-foreground">Speaker Talk-Time & Sentiment</td>
                    <td className="p-4 text-center text-muted-foreground">&mdash;</td>
                    <td className="p-4 text-center font-bold text-primary bg-primary/5">Talk-time Ratio</td>
                    <td className="p-4 text-center font-bold text-foreground">Full Sentiment</td>
                    <td className="p-4 text-center font-bold text-foreground">Executive Metrics</td>
                  </tr>

                  {/* Category 5: Storage & Governance */}
                  <tr className="bg-slate-100/60 dark:bg-white/5 font-bold text-foreground border-y border-border">
                    <td colSpan={5} className="py-2.5 px-5 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Storage, Governance & Support
                    </td>
                  </tr>
                  <tr className="border-b border-border/60 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-4 font-semibold text-foreground">Cloud Storage Limit</td>
                    <td className="p-4 text-center font-bold">2 GB</td>
                    <td className="p-4 text-center font-bold text-primary bg-primary/5">15 GB</td>
                    <td className="p-4 text-center font-bold text-foreground">50 GB</td>
                    <td className="p-4 text-center font-bold text-foreground">Terabyte Scale / BYO-S3</td>
                  </tr>
                  <tr className="border-b border-border/60 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-4 font-semibold text-foreground">Custom Branding & Branded Rooms</td>
                    <td className="p-4 text-center text-muted-foreground">&mdash;</td>
                    <td className="p-4 text-center text-muted-foreground bg-primary/5">&mdash;</td>
                    <td className="p-4 text-center font-bold text-foreground">Logos & Colors</td>
                    <td className="p-4 text-center font-bold text-foreground">Full White-Label & Subdomains</td>
                  </tr>
                  <tr className="border-b border-border/60 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-4 font-semibold text-foreground">Single Sign-On (SSO)</td>
                    <td className="p-4 text-center text-muted-foreground">&mdash;</td>
                    <td className="p-4 text-center text-muted-foreground bg-primary/5">&mdash;</td>
                    <td className="p-4 text-center font-bold text-foreground">Google & SAML 2.0</td>
                    <td className="p-4 text-center font-bold text-foreground">Okta, Azure AD, SAML, SCIM</td>
                  </tr>
                  <tr className="border-b border-border/60 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-4 font-semibold text-foreground">Enterprise Audit Trail</td>
                    <td className="p-4 text-center text-muted-foreground">&mdash;</td>
                    <td className="p-4 text-center text-muted-foreground bg-primary/5">&mdash;</td>
                    <td className="p-4 text-center text-emerald-500 font-bold">&check;</td>
                    <td className="p-4 text-center font-bold text-foreground">Immutable SIEM Stream</td>
                  </tr>
                  <tr className="border-b border-border/60 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-4 font-semibold text-foreground">SLA & Dedicated Support</td>
                    <td className="p-4 text-center">Community</td>
                    <td className="p-4 text-center font-bold text-primary bg-primary/5">Standard Email</td>
                    <td className="p-4 text-center font-bold text-foreground">99.9% SLA + AM</td>
                    <td className="p-4 text-center font-bold text-foreground">99.99% SLA + 24/7 CSM</td>
                  </tr>

                  {/* Bottom Action Row */}
                  <tr className="bg-slate-50 dark:bg-white/5">
                    <td className="p-5 font-bold text-foreground">Choose Plan</td>
                    <td className="p-5 text-center">
                      <button
                        onClick={() => handlePricingAction('Free')}
                        className="w-full py-2.5 px-3 rounded-xl font-bold text-xs bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-all"
                      >
                        {user ? 'Current Plan' : 'Get Started'}
                      </button>
                    </td>
                    <td className="p-5 text-center bg-primary/5">
                      <button
                        onClick={() => handlePricingAction('Pro')}
                        disabled={isProcessingPay}
                        className="w-full py-2.5 px-3 rounded-xl font-bold text-xs bg-primary hover:bg-primary/90 text-white shadow-sm transition-all"
                      >
                        Choose Pro
                      </button>
                    </td>
                    <td className="p-5 text-center">
                      <button
                        onClick={() => handlePricingAction('Enterprise')}
                        disabled={isProcessingPay}
                        className="w-full py-2.5 px-3 rounded-xl font-bold text-xs bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20 transition-all"
                      >
                        Choose Enterprise
                      </button>
                    </td>
                    <td className="p-5 text-center">
                      <button
                        onClick={() => navigate('/custom-pricing')}
                        className="w-full py-2.5 px-3 rounded-xl font-bold text-xs bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20 transition-all"
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

        <section className="py-24 px-6 md:px-12 max-w-4xl mx-auto text-center">
          <div className="p-12 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-5">
              Start your first meeting.
              <span className="block text-primary">Free. Right now.</span>
            </h2>
            <p className="text-muted-foreground mb-10 max-w-xl mx-auto">No account needed to join or start a meeting. Sign up to unlock AI intelligence, async video, and team spaces.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => handleCreateMeeting('instant')}
                disabled={isCreating}
                className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-primary to-primary hover:from-primary/90 hover:to-primary/90 text-white font-bold shadow-2xl shadow-primary/30 transition-all hover:scale-[1.02]"
              >
                <Video className="w-5 h-5" /> Start Free Meeting
              </button>
              <button
                onClick={() => navigate('/login')}
                className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold border border-border transition-all"
              >
                Sign In <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        <section id="contact" className="py-24 px-6 md:px-12 max-w-7xl mx-auto border-t border-border">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">We're here to help</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Need assistance with your account, or want to schedule a demo? Reach out to our Optavel Support team below.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-card border border-border p-8 rounded-3xl shadow-sm hover:shadow-md transition-all text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <MessageSquare className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Live Support Chat</h3>
              <p className="text-muted-foreground text-sm mb-6 flex-1">Chat directly with an Optavel support agent in real-time to get your questions answered instantly.</p>
              <button 
                onClick={() => setSupportPanel('chat')}
                className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold transition-colors"
              >
                Start Chat
              </button>
            </div>

            <div className="bg-card border border-border p-8 rounded-3xl shadow-sm hover:shadow-md transition-all text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6">
                <PhoneCall className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="text-xl font-bold mb-3">Request a Call</h3>
              <p className="text-muted-foreground text-sm mb-6 flex-1">Submit your details and a dedicated support representative will call you back shortly.</p>
              <button 
                onClick={() => setSupportPanel('call')}
                className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-colors"
              >
                Request Call
              </button>
            </div>
          </div>
        </section>

        {/* ΓöÇΓöÇ FOOTER ΓöÇΓöÇ */}
        <footer className="border-t border-border py-6 px-6 md:px-12 bg-slate-50/50">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
              <div className="text-primary mr-1">
                <CliPadLogo size={24} />
              </div>
              <span>&copy; {new Date().getFullYear()} CliPad by Optavel Technologies</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span className="hover:text-muted-foreground cursor-pointer transition-colors">Privacy</span>
              <span className="hover:text-muted-foreground cursor-pointer transition-colors">Terms</span>
              <span className="hover:text-muted-foreground cursor-pointer transition-colors">Security</span>
              <a href="https://optavel.com" className="hover:text-muted-foreground transition-colors flex items-center gap-1"><Globe className="w-3 h-3" /> optavel.com</a>
            </div>
          </div>
        </footer>
      

      {/* Share Link Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg p-0 border border-white/10 dark:border-white/10 shadow-2xl rounded-3xl overflow-hidden bg-white dark:bg-[#1a1f2e]">
          <DialogTitle className="sr-only">Meeting Link Created</DialogTitle>
          <DialogDescription className="sr-only">Your meeting link is ready to be copied.</DialogDescription>
          
          <div className="p-8 md:p-10 text-center flex flex-col items-center">
            {/* Icon */}
            <div className="w-16 h-16 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-6">
              <Video className="w-8 h-8 text-emerald-500" />
            </div>

            {/* Text */}
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Your meeting is ready</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm text-sm leading-relaxed">
              Share this link with anyone you'd like to invite. They can join from any browser.
            </p>

            {/* Link Box */}
            <div className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 text-left">Meeting Link</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0 bg-white dark:bg-white/5 px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
                  <span className="text-sm text-slate-700 dark:text-slate-200 font-mono truncate block w-full select-all">{laterLink}</span>
                </div>
                <Button
                  type="button"
                  className="rounded-xl shrink-0 gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-lg shadow-emerald-500/20 transition-all px-5 py-3 h-auto"
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
              className="mt-6 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white text-sm font-medium"
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
              className="fixed right-0 top-0 bottom-0 w-[400px] max-w-full bg-white shadow-[-10px_0_30px_rgba(0,0,0,0.05)] flex flex-col z-[110] border-l-4 border-primary"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <h3 className="text-xl font-bold">{supportPanel === 'chat' ? 'Live Chat Support' : 'Request a Call'}</h3>
                <button 
                  onClick={() => { setSupportPanel(null); setShowHumanForm(false); }} 
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-all"
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
                      <label className="text-sm font-medium text-slate-700">Name</label>
                      <input 
                        type="text" 
                        required 
                        value={supportForm.name}
                        onChange={(e) => setSupportForm(prev => ({...prev, name: e.target.value}))}
                        className="w-full mt-1 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50" 
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Phone Number</label>
                      <input 
                        type="tel" 
                        required 
                        value={supportForm.phone}
                        onChange={(e) => setSupportForm(prev => ({...prev, phone: e.target.value}))}
                        className="w-full mt-1 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50" 
                      />
                    </div>
                    <Button type="submit" disabled={submittingSupport} className="w-full rounded-xl mt-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold">
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
