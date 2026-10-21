import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/api/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Mail, ArrowLeft, ArrowRight, CheckCircle2, KeyRound } from 'lucide-react';
import { CliPadLogo } from '@/components/ui/CliPadLogo';

export default function CliPadForgotPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleResetRequest = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) return;

    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo
      });

      if (error) throw error;

      setSubmitted(true);
      toast({
        title: 'Reset link dispatched',
        description: `Check your inbox at ${cleanEmail} for the password recovery link.`,
        variant: 'default',
      });
    } catch (err) {
      console.error('[CliPadForgotPassword] Reset error:', err);
      toast({
        title: 'Unable to send reset link',
        description: err.message || 'Please verify your email address and try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Reset Password — Weftro Collaborative Workspace</title>
        <meta name="description" content="Reset your Weftro password and regain access to your workspace." />
        <link rel="icon" type="image/svg+xml" href="/clipad-logo.svg" />
      </Helmet>
      <div className="min-h-screen w-full bg-background flex flex-col lg:flex-row font-sans text-foreground overflow-hidden select-none">
        
        {/* Left Panel: Form */}
        <div className="w-full lg:w-1/2 bg-background flex flex-col justify-between p-6 sm:p-10 lg:p-16 min-h-screen overflow-y-auto">
          <div className="max-w-md w-full mx-auto my-auto py-4">
            
            {/* Back Button */}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-foreground transition-colors mb-6 group cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
              Back to login
            </button>

            {/* Icon & Title */}
            <div className="mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[#fad503]/10 border border-[#fad503]/20 flex items-center justify-center text-[#fad503] mb-4 shadow-xs">
                <KeyRound className="w-6 h-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-foreground tracking-tight mb-1.5">
                Forgot your password?
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-muted-foreground font-medium">
                No worries, enter your email and we'll send you instructions to reset your password.
              </p>
            </div>

            {/* Content */}
            {!submitted ? (
              <form onSubmit={handleResetRequest} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-foreground mb-1.5">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full pl-10 pr-4 h-11 text-sm bg-card border border-border text-foreground rounded-xl focus:border-[#fad503] focus:ring-2 focus:ring-[#fad503]/20 transition-all outline-none shadow-sm placeholder:text-slate-400"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full h-11 bg-[#fad503] hover:bg-yellow-400 text-[#0B1418] font-bold rounded-xl text-sm shadow-md shadow-[#fad503]/10 transition-all active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                    <>
                      Send Reset Instructions
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="bg-slate-50 dark:bg-card border border-slate-200 dark:border-border rounded-2xl p-6 text-center space-y-4 animate-in fade-in-50 duration-200">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-foreground mb-1">
                    Check your email
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-muted-foreground leading-relaxed">
                    We sent a password reset link to <span className="font-semibold text-slate-900 dark:text-foreground">{email}</span>. Click the link in the email to set a new password.
                  </p>
                </div>
                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setSubmitted(false)}
                    className="text-xs font-semibold text-[#fad503] hover:underline cursor-pointer"
                  >
                    Didn't receive the email? Try again
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="w-full h-10 bg-card hover:bg-secondary text-foreground border border-border rounded-xl text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer"
                  >
                    Return to Log In
                  </button>
                </div>
              </div>
            )}

            {/* Footer Navigation */}
            <div className="text-center pt-8">
              <p className="text-xs text-slate-600 dark:text-muted-foreground font-medium">
                Remembered your password?{' '}
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
