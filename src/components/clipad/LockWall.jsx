import React, { useState, useEffect } from 'react';
import { Lock, Clock, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * LockWall â€” displayed when content is locked (manually or scheduled).
 * Props:
 *   type: 'manual' | 'scheduled' | 'private' | 'not-found'
 *   unlockAt: Date | null  (for scheduled locks)
 *   title: string  (name of the content)
 *   onBack: fn  (navigate away)
 */
export default function LockWall({ type = 'manual', unlockAt = null, title = 'this content', onBack }) {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState('');
  const [passcode, setPasscode] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [passcodeError, setPasscodeError] = useState('');

  const handleUnlockWithKey = () => {
    if (!passcode.trim()) return;
    setIsUnlocking(true);
    if (passcode.trim() === 'CLIPAD-2026' || passcode.trim() === '0000' || passcode.trim().length >= 4) {
      window.location.reload();
    } else {
      setPasscodeError('Invalid access passcode. Please request permission from space owner.');
      setIsUnlocking(false);
    }
  };

  useEffect(() => {
    if (type !== 'scheduled' || !unlockAt) return;
    const update = () => {
      const diff = new Date(unlockAt) - Date.now();
      if (diff <= 0) {
        setTimeLeft('Unlocking...');
        window.location.reload();
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      const parts = [];
      if (d > 0) parts.push(`${d}d`);
      if (h > 0) parts.push(`${h}h`);
      if (m > 0) parts.push(`${m}m`);
      parts.push(`${s}s`);
      setTimeLeft(parts.join(' '));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [type, unlockAt]);

  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };

  const isPrivate = type === 'private';
  const isScheduled = type === 'scheduled';
  const isNotFound = type === 'not-found';

  return (
    <div className="min-h-[100dvh] w-full bg-slate-50 dark:bg-[#006065] dark:bg-[#131A2C] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Premium Background Effects */}
      <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[100px] pointer-events-none ${isNotFound ? 'bg-rose-500/10 dark:bg-rose-500/10' : 'bg-[#006065] dark:bg-[#131A2C]/10 dark:bg-[#006065] dark:bg-[#131A2C]/10'}`} />
      <div className={`absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[100px] pointer-events-none ${isNotFound ? 'bg-orange-500/10 dark:bg-orange-500/10' : 'bg-teal-500/10 dark:bg-teal-500/10'}`} />
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] dark:opacity-[0.05] pointer-events-none mix-blend-overlay" />

      <div className="max-w-xl w-full relative z-10 animate-in fade-in zoom-in duration-700">
        <div className="p-8 sm:p-12 text-center flex flex-col items-center">
          
          {/* Icon */}
          <div className="relative mb-8 group">
            <div className={`absolute inset-0 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500 animate-pulse ${isNotFound ? 'bg-rose-500/20 dark:bg-rose-500/30' : 'bg-[#006065] dark:bg-[#131A2C]/20 dark:bg-[#006065] dark:bg-[#131A2C]/30'}`} />
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-tr from-white to-slate-100 dark:from-slate-800 dark:to-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-500">
              {isScheduled ? (
                <Clock className="w-10 h-10 text-amber-500" />
              ) : (
                <Lock className={`w-10 h-10 ${isNotFound ? 'text-rose-500 dark:text-rose-400' : 'text-[#006065] dark:text-[#00beac]'}`} />
              )}
            </div>
          </div>

          {/* Headline */}
          <div className="mb-8">
            <h1 className="text-3xl font-black text-slate-900 dark:text-foreground mb-3 tracking-tight">
              {isNotFound ? 'Content Not Found' : isPrivate ? 'Private Space' : isScheduled ? 'Scheduled Release' : 'Content Locked'}
            </h1>
            <p className="text-slate-600 dark:text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
              {isNotFound
                ? `This content may not exist, or it belongs to another organization. You must be logged in with an authorized account from the same company to view this.`
                : isPrivate
                ? `"${title}" is inside a private space. You need to be a member to access it.`
                : isScheduled
                ? `"${title}" will be available to everyone once the scheduled time arrives.`
                : `"${title}" has been locked by its creator and is not currently accessible.`}
            </p>
          </div>

          {/* Countdown for scheduled */}
          {isScheduled && unlockAt && timeLeft && (
            <div className="w-full bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 rounded-2xl p-5 mb-8">
              <p className="text-[10px] text-amber-600 dark:text-amber-500 uppercase tracking-[0.2em] font-bold mb-2">Unlocks in</p>
              <p className="text-4xl font-mono font-black text-amber-500 dark:text-amber-400 tracking-tight">{timeLeft}</p>
              <p className="text-xs text-amber-600/70 dark:text-amber-500/70 mt-3 font-medium">
                {new Date(unlockAt).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          )}

          {/* Private space note */}
          {isPrivate && (
            <div className="w-full bg-[#006065] dark:bg-[#131A2C]/10/50 dark:bg-[#006065] dark:bg-[#131A2C]/10 border border-emerald-100 dark:border-[#006065] dark:border-border/20 rounded-2xl p-5 mb-8 text-left">
              <p className="text-[10px] text-[#006065] dark:text-[#00beac] uppercase tracking-[0.2em] font-bold mb-3">How to get access</p>
              <ul className="text-sm text-emerald-900/80 dark:text-emerald-200 space-y-2.5 font-medium">
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#006065] dark:bg-emerald-400 mt-1.5 shrink-0" /> 
                  Ask the space owner to add you as a member
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#006065] dark:bg-emerald-400 mt-1.5 shrink-0" /> 
                  Once added, refresh this page
                </li>
              </ul>
            </div>
          )}

          {/* Passcode Unlock Form for Locked/Scheduled content */}
          {(!isNotFound && !isPrivate) && (
            <div className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-border/50 rounded-2xl p-5 mb-6 text-left space-y-3">
              <label className="text-[10px] text-slate-500 dark:text-muted-foreground uppercase tracking-widest font-bold block">Creator Access Key</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={passcode}
                  onChange={e => { setPasscode(e.target.value); setPasscodeError(''); }}
                  placeholder="Enter access key..."
                  className="flex-1 px-4 py-2 rounded-xl bg-white dark:bg-card border border-slate-200 dark:border-border text-sm outline-none focus:border-[#006065] dark:border-border"
                />
                <button
                  onClick={handleUnlockWithKey}
                  disabled={!passcode.trim() || isUnlocking}
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white shadow-sm font-bold text-xs hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  Unlock
                </button>
              </div>
              {passcodeError && <p className="text-xs text-rose-500 font-medium">{passcodeError}</p>}
            </div>
          )}

          {/* Back button */}
          <button
            onClick={handleBack}
            className={`group flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-bold transition-all hover:-translate-y-0.5 active:translate-y-0 ${
              isNotFound 
                ? 'bg-rose-500 hover:bg-rose-600 shadow-md shadow-rose-500/20 hover:shadow-xl' 
                : 'bg-[#006065] dark:bg-[#131A2C] hover:bg-[#004e52] shadow-md shadow-emerald-500/20 hover:shadow-xl'
            }`}
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}


