import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/api/supabaseClient';
import { logAuditEvent } from '@/lib/auditLogger';
import { useToast } from '@/components/ui/use-toast';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { CliPadLogo } from '@/components/ui/CliPadLogo';

export default function CliPadLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/dashboard';
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [showWorkspaceSelect, setShowWorkspaceSelect] = useState(false);
 
  const handleSSOLogin = () => {
    const continueUrl = encodeURIComponent(`${window.location.origin}/auth/callback?continue=${encodeURIComponent(redirectUrl)}`);
    window.location.href = `https://account.optavel.com/sso?redirect_uri=${continueUrl}`;
  };
 
  const handleGoogleOAuth = async () => {
    try {
      setLoading(true);
      const { initiateGoogleOAuth } = await import('@/lib/googleOAuth');
      const googleAuthUrl = await initiateGoogleOAuth(redirectUrl);
      window.location.href = googleAuthUrl;
    } catch (err) {
      toast({ title: 'Google Sign-In failed', description: err.message, variant: 'destructive' });
      setLoading(false);
    }
  };

  const logLoginEvent = async (user) => {
    await logAuditEvent({ action: 'login', user });
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      // Check for multiple workspaces safely (RPC optional)
      let userWorkspaces = null;
      let rpcError = null;
      try {
        const res = await supabase.rpc('get_user_workspaces_by_email', { lookup_email: email });
        userWorkspaces = res.data;
        rpcError = res.error;
      } catch (err) {
        rpcError = err;
      }
      
      if (!rpcError && userWorkspaces && userWorkspaces.length > 1) {
        setWorkspaces(userWorkspaces);
        setShowWorkspaceSelect(true);
        setLoading(false);
        return; // Pause login to let user select
      }
      
      // If exactly 1 workspace found via salt, use it. Otherwise fallback to raw email
      const loginEmail = (userWorkspaces && userWorkspaces.length === 1) ? userWorkspaces[0].salted_email : email;
      
      const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
      if (error) throw error;
      
      await logLoginEvent(data.user);
      
      navigate(redirectUrl);
    } catch (err) {
      toast({ title: 'Sign in failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleWorkspaceSelect = async (saltedEmail) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: saltedEmail, password });
      if (error) throw error;
      
      await logLoginEvent(data.user);
      
      navigate(redirectUrl);
    } catch (err) {
      toast({ title: 'Sign in failed', description: err.message, variant: 'destructive' });
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Log In — Weftro V3 — #1 Enterprise Intelligence Platform</title>
        <meta name="description" content="Sign in to your Weftro V3 enterprise workspace to search connected company knowledge and intelligence." />
        <link rel="canonical" href="https://weftro.com/login" />
        <link rel="icon" type="image/svg+xml" href="/clipad-logo.svg" />
      </Helmet>
      <div className="min-h-screen w-full bg-background flex flex-col lg:flex-row font-sans text-foreground overflow-hidden select-none">
        
        {/* Left Panel: Form */}
        <div className="w-full lg:w-1/2 bg-background flex flex-col justify-between p-6 sm:p-10 lg:p-16 min-h-screen overflow-y-auto">
          <div className="max-w-md w-full mx-auto my-auto py-4">
            
            {/* Title & Subtitle */}
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-foreground tracking-tight mb-1.5">
                Log in to your account
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-muted-foreground font-medium">
                Please enter your details to access your workspace
              </p>
            </div>

            {/* Form Content */}
            {!showWorkspaceSelect ? (
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-foreground mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full pl-10 pr-4 h-11 text-sm bg-card border border-border text-foreground rounded-xl focus:border-[#fad503] focus:ring-2 focus:ring-[#fad503]/20 transition-all outline-none shadow-sm placeholder:text-slate-400"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-foreground mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 h-11 text-sm bg-card border border-border text-foreground rounded-xl focus:border-[#fad503] focus:ring-2 focus:ring-[#fad503]/20 transition-all outline-none shadow-sm placeholder:text-slate-400"
                      required
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-muted-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Options Row: Remember for 30 days & Forgot Password */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-slate-300 dark:border-border text-[#fad503] focus:ring-[#fad503] accent-[#fad503]" 
                    />
                    <span className="text-xs text-slate-600 dark:text-muted-foreground font-medium">Remember for 30 days</span>
                  </label>
                  <button 
                    type="button" 
                    onClick={() => navigate('/forgot-password')} 
                    className="text-xs font-bold text-[#fad503] hover:underline"
                  >
                    Forgot password
                  </button>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-[#fad503] hover:bg-yellow-400 text-[#0B1418] font-bold rounded-xl text-sm shadow-md shadow-[#fad503]/10 transition-all active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Log in'}
                </button>
              </form>
            ) : (
              <div className="space-y-3">
                <h3 className="text-base font-bold text-center text-[#fad503] mb-1">Select Workspace</h3>
                <p className="text-xs text-center text-slate-500 dark:text-muted-foreground mb-3">Multiple accounts found for {email}. Choose one to access:</p>
                
                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                  {workspaces.map((ws) => (
                    <button
                      key={ws.company_id}
                      onClick={() => handleWorkspaceSelect(ws.salted_email)}
                      disabled={loading}
                      className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-background hover:bg-white dark:bg-card text-left transition-all group"
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900 dark:text-foreground text-xs">{ws.company_name || 'My Workspace'}</span>
                        <span className="text-[11px] text-slate-500 dark:text-muted-foreground mt-0.5">{ws.salted_email}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#fad503] transition-colors" />
                    </button>
                  ))}
                </div>
                
                <button 
                  onClick={() => {
                    setShowWorkspaceSelect(false);
                    setPassword('');
                  }} 
                  disabled={loading}
                  className="w-full text-center text-xs font-semibold text-slate-500 dark:text-muted-foreground hover:text-[#fad503] pt-2 border-t border-[#1A2F38]"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-card px-3 text-slate-400 font-bold tracking-widest text-[10px]">OR</span>
              </div>
            </div>

            {/* Secondary SSO / Google Login */}
            <div className="space-y-2">
              <button
                onClick={handleSSOLogin}
                type="button"
                className="w-full h-11 px-3 bg-card hover:bg-secondary text-foreground border border-border rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
              >
                <img src="/optavel-favicon.svg" alt="Optavel" className="w-4 h-4" />
                Log in with Optavel SSO
              </button>
              <button 
                onClick={handleGoogleOAuth}
                disabled={loading}
                type="button"
                className="w-full h-11 px-3 bg-card hover:bg-secondary text-foreground border border-border rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Log in with Google
              </button>
            </div>

            {/* Footer Navigation & Terms */}
            <div className="text-center pt-6 space-y-2">
              <p className="text-xs text-slate-600 dark:text-muted-foreground font-medium">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate(`/signup${window.location.search}`)}
                  className="font-bold text-[#fad503] cursor-pointer hover:underline ml-0.5"
                >
                  Sign up
                </button>
              </p>
              <p className="text-[11px] text-slate-400 font-medium">
                By logging in, you agree to our{' '}
                <span className="underline cursor-pointer hover:text-slate-600 dark:text-muted-foreground">Terms of Use</span>
              </p>
            </div>
          </div>
        </div>

        {/* Right Panel: Deep Teal Inset Card with Tilted Device Mockup */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#0B1418] via-[#101D22] to-[#091114] border-l border-border relative overflow-hidden flex-col justify-between p-12 lg:p-16 text-white select-none min-h-screen">
          
          {/* Top Branding & Headline */}
          <div className="relative z-10">
            <div className="mb-8">
              <CliPadLogo height={80} white={true} />
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-white leading-tight tracking-tight max-w-md mt-2">
              AI-Powered Organizational Memory & Intelligence
            </h2>
            <p className="text-sm text-slate-200/80 font-medium mt-2 max-w-md">
              Unified capture, context graphs, smart moments, and decision timeline across your workspace.
            </p>
          </div>

          {/* Bottom Right Tilted Perspective 3D Tablet Mockup */}
          <div className="absolute -bottom-16 -right-16 w-[560px] lg:w-[640px] h-[500px] pointer-events-none select-none transition-transform duration-700 hover:scale-[1.02]">
            <div 
              className="w-full h-full bg-[#091114] p-2.5 rounded-[30px] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.8)] border border-[#1A2F38] flex flex-col"
              style={{
                transform: 'perspective(1200px) rotateX(12deg) rotateY(-18deg) rotate(-10deg)',
                transformStyle: 'preserve-3d'
              }}
            >
              {/* Inner Device Screen */}
              <div className="w-full h-full bg-[#0B1418] rounded-[22px] border border-[#1A2F38] overflow-hidden flex flex-row text-[10px] text-slate-800 font-sans shadow-inner">
                {/* Sidebar */}
                <div className="w-44 bg-[#091114] text-white p-3 border-r border-[#1A2F38] flex flex-col justify-between shrink-0">
                  <div>
                    <div className="flex items-center gap-1.5 mb-4">
                      <CliPadLogo height={18} white={true} />
                    </div>

                    <div className="text-[9px] uppercase font-bold text-white/40 tracking-wider mb-1.5">General</div>
                    <div className="space-y-1 mb-3">
                      <div className="bg-[#fad503] text-[#fad503] font-bold px-2 py-1 rounded-md flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#006065] dark:bg-[#131A2C]"></span> Home
                      </div>
                      <div className="text-white/70 hover:text-white px-2 py-1">Search</div>
                      <div className="text-white/70 hover:text-white px-2 py-1">Spaces</div>
                    </div>

                    <div className="text-[9px] uppercase font-bold text-white/40 tracking-wider mb-1.5">Intelligence</div>
                    <div className="space-y-1">
                      <div className="text-white/70 px-2 py-0.5">Capture</div>
                      <div className="text-white/70 px-2 py-0.5">Analytics</div>
                      <div className="text-white/70 px-2 py-0.5">Graph</div>
                      <div className="text-white/70 px-2 py-0.5">Timeline</div>
                      <div className="text-white/70 px-2 py-0.5">Decisions</div>
                      <div className="text-white/70 px-2 py-0.5">Action Items</div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/10 text-white/50 text-[8px]">
                    Enterprise Intelligence
                  </div>
                </div>

                {/* Main App Content View */}
                <div className="flex-1 bg-[#101D22] p-3.5 flex flex-col justify-between overflow-hidden">
                  <div>
                    {/* Header Bar */}
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-xs font-extrabold text-slate-900 dark:text-foreground">Welcome Back</div>
                        <div className="text-[8px] text-slate-500 dark:text-muted-foreground">Manage your workspace intelligence</div>
                      </div>
                      <div className="bg-slate-100 dark:bg-secondary border border-slate-200 dark:border-border px-2 py-0.5 rounded-full text-slate-400 text-[8px] flex items-center gap-1">
                        🔍 Search memory...
                      </div>
                    </div>

                    {/* Stat Cards */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-[#0B1418] border border-[#1A2F38] p-2 rounded-xl">
                        <div className="text-slate-400 text-[8px] font-semibold">Smart Moments</div>
                        <div className="text-xs font-extrabold text-slate-900 dark:text-foreground mt-0.5">128 extracted</div>
                      </div>
                      <div className="bg-[#0B1418] border border-[#1A2F38] p-2 rounded-xl">
                        <div className="text-slate-400 text-[8px] font-semibold">Memory Core</div>
                        <div className="text-xs font-extrabold text-[#fad503] mt-0.5">Active & Syncing</div>
                      </div>
                    </div>

                    {/* Records Table Mockup */}
                    <div className="border border-[#1A2F38] rounded-xl overflow-hidden">
                      <div className="bg-[#0B1418] px-2.5 py-1 border-b border-[#1A2F38] font-bold text-slate-600 dark:text-muted-foreground text-[8px] flex justify-between">
                        <span>Recent Meeting / Source</span>
                        <span>Status</span>
                      </div>
                      <div className="divide-y divide-[#1A2F38] text-[8px]">
                        <div className="px-2.5 py-1 flex justify-between items-center">
                          <span className="font-semibold text-slate-800">Q4 Product Architecture</span>
                          <span className="bg-[#006065] dark:bg-[#131A2C]/10 text-[#fad503] font-bold px-1.5 py-0.5 rounded text-[7px]">Processed</span>
                        </div>
                        <div className="px-2.5 py-1 flex justify-between items-center">
                          <span className="font-semibold text-slate-800">Sprint Review Recording</span>
                          <span className="bg-blue-50 text-blue-600 font-bold px-1.5 py-0.5 rounded text-[7px]">Smart Moments</span>
                        </div>
                        <div className="px-2.5 py-1 flex justify-between items-center">
                          <span className="font-semibold text-slate-800">Executive Sync</span>
                          <span className="bg-amber-50 text-amber-600 font-bold px-1.5 py-0.5 rounded text-[7px]">Action Items</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[8px] text-slate-400 pt-1.5 border-t border-[#1A2F38]">
                    <span>Weftro V3</span>
                    <span className="text-[#fad503] font-bold">â— System Operational</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </>
  );
}


