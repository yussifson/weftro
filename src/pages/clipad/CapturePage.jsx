import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Inbox, ShieldCheck, Laptop, Sparkles } from 'lucide-react';
import CaptureInbox from '@/components/clipad/features/CaptureInbox';

export default function CapturePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-full bg-background text-foreground pb-12" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/5 via-background to-background px-6 py-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(var(--primary-rgb),0.08),transparent_60%)] pointer-events-none" />
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex items-start gap-4 mb-3">
            <button 
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-secondary transition-colors shrink-0"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Inbox className="w-5 h-5 text-primary" />
            </div>
            <div className="mt-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">Capture Inbox</h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                  V3 Intelligent
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Live context sessions, omni-channel captures, and browser extension ingestion.
              </p>
            </div>
          </div>

          {/* Quick value badges */}
          <div className="flex flex-wrap gap-4 mt-6">
            <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2 text-xs text-muted-foreground">
              <Sparkles className="w-4 h-4 text-[#fad503]" />
              <span>Automatic AI Contextualization</span>
            </div>
            <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2 text-xs text-muted-foreground">
              <Laptop className="w-4 h-4 text-primary" />
              <span>Live Context Sessions & Privacy Guard</span>
            </div>
            <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2 text-xs text-muted-foreground">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Multi-Tenant Enterprise Isolation</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Inbox & Sessions Body */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 mt-8">
        <CaptureInbox />
      </div>
    </div>
  );
}
