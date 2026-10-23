import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/api/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Lock, Eye, EyeOff, ArrowRight, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';
import { CliPadLogo } from '@/components/ui/CliPadLogo';

export default function CliPadResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function checkRecoverySession() {
      try {
        // 1. Check if user already has an active session from token in hash/cookie
        const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
        
        if (session?.user) {
          if (isMounted) {
            setSessionReady(true);
            setCheckingSession(false);
          }
          return;
        }

        // 2. Check if recovery hash/params are present in URL
        const hash = window.location.hash || '';
        const search = window.location.search || '';
        const hasAccessToken = hash.includes('access_token') || search.includes('access_token');
        const hasCode = search.includes('code=') || hash.includes('code=');
        const hasError = hash.includes('error=') || search.includes('error=');

        if (hasError) {
          const urlParams = new URLSearchParams(search || hash.replace(/^#/, ''));
          const desc = urlParams.get('error_description') || 'This password reset link is invalid or has expired.';
          if (isMounted) {
            setAuthError(desc);
            setCheckingSession(false);
          }
          return;
        }

        if (hasCode) {
          const urlParams = new URLSearchParams(search);
          const code = urlParams.get('code');
          if (code) {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            if (!error && data?.session) {
              if (isMounted) {
                setSessionReady(true);
                setCheckingSession(false);
              }
              return;
            }
          }
        }

        // Give onAuthStateChange a moment to process the recovery token
        const timer = setTimeout(async () => {
          if (!isMounted) return;
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (retrySession?.user) {
            setSessionReady(true);
          } else if (!hasAccessToken && !hasCode) {
            setAuthError('No active password reset session found. Please request a new reset link.');
          }
          setCheckingSession(false);
        }, 800);

        return () => clearTimeout(timer);
      } catch (err) {
        console.warn('[CliPadResetPassword] Session check error:', err);
        if (isMounted) {
          setAuthError('Unable to verify recovery link. Please try requesting a new link.');
          setCheckingSession(false);
        }
      }
    }

    // Also listen to onAuthStateChange for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (event === 'PASSWORD_RECOVERY' || (session && event === 'SIGNED_IN')) {
        setSessionReady(true);
        setCheckingSession(false);
        setAuthError(null);
      }
    });

    checkRecoverySession();

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please ensure both password fields are identical.',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 6 characters long.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setSuccess(true);
      toast({
        title: 'Password updated',
        description: 'Your password has been changed successfully. Redirecting to workspace...',
        variant: 'default',
      });

      // Clear cached user so new session is fresh
      try { localStorage.removeItem('slate_cached_user'); } catch (e) {}

      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      console.error('[CliPadResetPassword] Update error:', err);
      toast({
        title: 'Password update failed',
        description: err.message || 'Unable to update password. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Set New Password — Weftro V3 — #1 Enterprise Intelligence Platform</title>
        <meta name="description" content="Set a secure new password for your Weftro V3 enterprise account." />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="icon" type="image/svg+xml" href="/clipad-logo.svg" />
      </Helmet>
      <div className="min-h-screen w-full bg-background flex flex-col lg:flex-row font-sans text-foreground overflow-hidden select-none">
        
        {/* Left Panel: Form */}
        <div className="w-full lg:w-1/2 bg-background flex flex-col justify-between p-6 sm:p-10 lg:p-16 min-h-screen overflow-y-auto">
          <div className="max-w-md w-full mx-auto my-auto py-4">
            
            {/* Icon & Title */}
            <div className="mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[#fad503]/10 border border-[#fad503]/20 flex items-center justify-center text-[#fad503] mb-4 shadow-xs">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-foreground tracking-tight mb-1.5">
                Set a new password
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-muted-foreground font-medium">
                Create a strong password with at least 6 characters to secure your account.
              </p>
            </div>

            {/* State Handling */}
            {checkingSession ? (
              <div className="bg-slate-50 dark:bg-card border border-slate-200 dark:border-border rounded-2xl p-6 text-center space-y-3">
                <div className="w-6 h-6 border-2 border-[#fad503]/30 border-t-[#fad503] rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-500 dark:text-muted-foreground">
                  Verifying your reset token...
                </p>
              </div>
            ) : authError && !sessionReady ? (
              <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-2xl p-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-rose-900 dark:text-rose-200 mb-1">
                    Link expired or invalid
                  </h3>
                  <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                    {authError}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="w-full h-11 bg-[#fad503] hover:bg-yellow-400 text-[#0B1418] font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all"
                >
                  Request a New Reset Link
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : success ? (
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl p-6 text-center space-y-4 animate-in fade-in-50 duration-200">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-emerald-900 dark:text-emerald-200 mb-1">
                    Password successfully changed
                  </h3>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
                    Your account is now updated. You'll be redirected to your dashboard in a moment...
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all"
                >
                  Go to Dashboard Now
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-foreground mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full pl-10 pr-10 h-11 text-sm bg-card border border-border text-foreground rounded-xl focus:border-[#fad503] focus:ring-2 focus:ring-[#fad503]/20 transition-all outline-none shadow-sm placeholder:text-slate-400"
                      required
                      minLength={6}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-muted-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-foreground mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full pl-10 pr-10 h-11 text-sm bg-card border border-border text-foreground rounded-xl focus:border-[#fad503] focus:ring-2 focus:ring-[#fad503]/20 transition-all outline-none shadow-sm placeholder:text-slate-400"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-muted-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !password || !confirmPassword}
                  className="w-full h-11 bg-[#fad503] hover:bg-yellow-400 text-[#0B1418] font-bold rounded-xl text-sm shadow-md shadow-[#fad503]/10 transition-all active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                    'Update Password'
                  )}
                </button>
              </form>
            )}

            {/* Footer Navigation */}
            <div className="text-center pt-8">
              <p className="text-xs text-slate-600 dark:text-muted-foreground font-medium">
                Remember your old password?{' '}
                <Link
                  to="/login"
                  className="font-bold text-[#fad503] cursor-pointer hover:underline ml-0.5"
                >
                  Log in
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Right Panel: Branded Dark Mockup */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#0B1418] via-[#101D22] to-[#091114] border-l border-border relative overflow-hidden flex-col justify-between p-12 lg:p-16 text-white select-none min-h-screen">
          <div className="relative z-10">
            <div className="mb-8">
              <CliPadLogo height={80} white={true} />
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-white leading-tight tracking-tight max-w-md mt-2">
              Enterprise Identity & Access Security
            </h2>
            <p className="text-sm text-slate-200/80 font-medium mt-2 max-w-md">
              Secure authentication with zero-trust permissions, scoped access tokens, and instant recovery.
            </p>
          </div>

          <div className="absolute -bottom-16 -right-16 w-[560px] lg:w-[640px] h-[500px] pointer-events-none select-none transition-transform duration-700 hover:scale-[1.02]">
            <div 
              className="w-full h-full bg-[#091114] p-2.5 rounded-[30px] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.8)] border border-[#1A2F38] flex flex-col"
              style={{
                transform: 'perspective(1200px) rotateX(12deg) rotateY(-18deg) rotate(-10deg)',
                transformStyle: 'preserve-3d'
              }}
            >
              <div className="w-full h-full bg-[#0B1418] rounded-[22px] border border-[#1A2F38] overflow-hidden flex flex-row text-[10px] text-slate-800 font-sans shadow-inner">
                <div className="w-44 bg-[#091114] text-white p-3 border-r border-[#1A2F38] flex flex-col justify-between shrink-0">
                  <div>
                    <div className="flex items-center gap-1.5 mb-4">
                      <CliPadLogo height={18} white={true} />
                    </div>
                    <div className="text-[9px] uppercase font-bold text-white/40 tracking-wider mb-1.5">Security</div>
                    <div className="space-y-1 mb-3">
                      <div className="bg-[#fad503] text-black font-bold px-2 py-1 rounded-md flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-black"></span> Authentication
                      </div>
                      <div className="text-white/70 hover:text-white px-2 py-1">Access Control</div>
                      <div className="text-white/70 hover:text-white px-2 py-1">Audit Logs</div>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-white/10 text-white/50 text-[8px]">
                    Enterprise Intelligence
                  </div>
                </div>

                <div className="flex-1 bg-[#101D22] p-3.5 flex flex-col justify-between overflow-hidden">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-xs font-extrabold text-white">Password Recovery</div>
                        <div className="text-[8px] text-slate-400">Cryptographic token verification</div>
                      </div>
                      <div className="bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full text-emerald-400 text-[8px] flex items-center gap-1">
                        ● Verified
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-[#0B1418] border border-[#1A2F38] p-2 rounded-xl">
                        <div className="text-slate-400 text-[8px] font-semibold">Auth Protocol</div>
                        <div className="text-xs font-extrabold text-white mt-0.5">PKCE + JWT</div>
                      </div>
                      <div className="bg-[#0B1418] border border-[#1A2F38] p-2 rounded-xl">
                        <div className="text-slate-400 text-[8px] font-semibold">Recovery Channel</div>
                        <div className="text-xs font-extrabold text-[#fad503] mt-0.5">Magic Link</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[8px] text-slate-400 pt-1.5 border-t border-[#1A2F38]">
                    <span>Weftro Security</span>
                    <span className="text-[#fad503] font-bold">● System Operational</span>
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
