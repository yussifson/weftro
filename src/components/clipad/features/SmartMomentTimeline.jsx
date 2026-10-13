import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getSmartMoments, confirmSmartMoment, dismissSmartMoment, updateSmartMoment, convertMomentToMemory, MOMENT_TYPES, MOMENT_STATUS } from '@/lib/clipadSmartMomentService';
import { extractSmartMomentsFromTranscript } from '@/lib/clipadTranscriptIntelligence';
import { Zap, CheckCircle2, XCircle, Edit3, Clock, Sparkles, AlertCircle, ArrowUpRight, Play, RefreshCw, Check, Shield, Brain, Plus } from 'lucide-react';

export default function SmartMomentTimeline({ companyId, meetingId, videoId, transcript = [], title = '', onJumpToTimestamp }) {
  const [moments, setMoments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [convertingId, setConvertingId] = useState(null);
  const [editingMoment, setEditingMoment] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualDesc, setManualDesc] = useState('');
  const [manualType, setManualType] = useState(MOMENT_TYPES.DECISION);

  // Lock body scroll when modal is active
  useEffect(() => {
    if (showManualAdd || editingMoment) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [showManualAdd, editingMoment]);

  const fetchMoments = async () => {
    setLoading(true);
    try {
      const data = await getSmartMoments({ companyId, meetingId, videoId });
      setMoments(data);
    } catch (err) {
      console.error('Failed to load Smart Moments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (meetingId || videoId || companyId) {
      fetchMoments();
    }
  }, [companyId, meetingId, videoId]);

  const handleAnalyze = async () => {
    if (!transcript.length) return;
    setAnalyzing(true);
    try {
      await extractSmartMomentsFromTranscript({
        companyId,
        meetingId,
        videoId,
        transcriptItems: transcript,
        title,
      });
      await fetchMoments();
    } catch (err) {
      console.error('Failed to extract moments:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConfirm = async (momentId) => {
    await confirmSmartMoment(momentId);
    fetchMoments();
  };

  const handleConvertToMemoryAction = async (moment) => {
    setConvertingId(moment.id);
    try {
      await convertMomentToMemory(moment);
      fetchMoments();
    } catch (err) {
      console.error('Failed to convert moment to memory:', err);
    } finally {
      setConvertingId(null);
    }
  };

  const handleDismiss = async (momentId) => {
    await dismissSmartMoment(momentId);
    fetchMoments();
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingMoment || !editTitle.trim()) return;

    await updateSmartMoment(editingMoment.id, {
      title: editTitle,
      description: editDesc,
      status: MOMENT_STATUS.EDITED,
    });

    setEditingMoment(null);
    fetchMoments();
  };

  const handleCreateManualMoment = async (e) => {
    e.preventDefault();
    if (!manualTitle.trim()) return;

    try {
      const { createSmartMoment } = await import('@/lib/clipadSmartMomentService');
      await createSmartMoment({
        company_id: companyId,
        meeting_id: meetingId,
        video_id: videoId,
        moment_type: manualType,
        title: manualTitle.trim(),
        description: manualDesc.trim(),
        confidence: 1.0,
        status: MOMENT_STATUS.DETECTED,
      });
      setManualTitle('');
      setManualDesc('');
      setShowManualAdd(false);
      fetchMoments();
    } catch (err) {
      console.error('Failed to create manual smart moment:', err);
    }
  };

  const getMomentBadgeColor = (type) => {
    switch (type) {
      case MOMENT_TYPES.DECISION:
        return 'bg-[#006065]/10 text-[#006065] dark:text-[#00beac] border-[#006065]/20';
      case MOMENT_TYPES.ACTION:
      case MOMENT_TYPES.COMMITMENT:
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case MOMENT_TYPES.RISK:
      case MOMENT_TYPES.BLOCKER:
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      case MOMENT_TYPES.QUESTION:
        return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20';
      default:
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
    }
  };

  return (
    <div className="space-y-4">
      {/* Timeline Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-border/40">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#006065]/10 dark:bg-[#006065]/20 text-[#006065] dark:text-[#00beac]">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-foreground flex items-center gap-2">
              Smart Moments Timeline
              <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-[#fad503]/20 text-[#006065] dark:text-[#fad503] border border-[#fad503]/30 rounded-full">
                V3 Intelligence
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-muted-foreground">Decisions, commitments, risks, and institutional insights extracted automatically.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowManualAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white dark:bg-card hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-border rounded-xl transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-[#006065] dark:text-[#fad503]" />
            <span>Add Moment</span>
          </button>

          {transcript.length > 0 && (
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-[#006065] hover:bg-[#004e52] text-white rounded-xl transition-all shadow-sm disabled:opacity-50"
            >
              {analyzing ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#fad503]" /> : <Sparkles className="w-3.5 h-3.5 text-[#fad503]" />}
              {analyzing ? 'Extracting...' : 'Detect Moments'}
            </button>
          )}
        </div>
      </div>

      {/* Timeline Items List */}
      {loading ? (
        <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-[#006065]" /> Loading Smart Moments...
        </div>
      ) : moments.length === 0 ? (
        <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-border/60 rounded-2xl bg-slate-50/50 dark:bg-card/40">
          <div className="w-12 h-12 rounded-2xl bg-[#006065]/10 dark:bg-[#006065]/20 text-[#006065] dark:text-[#fad503] flex items-center justify-center mx-auto mb-3">
            <Zap className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">No Smart Moments Logged Yet</h4>
          <p className="text-xs text-slate-500 dark:text-muted-foreground max-w-sm mx-auto mb-4">
            Smart Moments automatically detect decisions, milestones, and blockers from transcripts. You can also manually add a key moment anytime.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setShowManualAdd(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-[#006065] hover:bg-[#004e52] text-white rounded-xl transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 text-[#fad503]" /> Add Smart Moment
            </button>
            {transcript.length > 0 && (
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-[#fad503] hover:bg-[#fad503]/90 text-[#006065] rounded-xl transition-all shadow-sm disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" /> Detect from Transcript
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="relative pl-6 border-l-2 border-slate-200 dark:border-border/60 space-y-4">
          {moments.map(moment => {
            const isDismissed = moment.status === MOMENT_STATUS.DISMISSED;
            const isConverted = moment.status === MOMENT_STATUS.CONVERTED;
            const isConfirmed = moment.status === MOMENT_STATUS.CONFIRMED || isConverted;

            if (isDismissed) return null;

            return (
              <div key={moment.id} className="relative group">
                {/* Timeline Node Point */}
                <div className="absolute -left-[31px] top-2 w-3.5 h-3.5 rounded-full bg-white dark:bg-card border-2 border-[#006065] dark:border-[#fad503] flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#006065] dark:bg-[#fad503]" />
                </div>

                <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-border/60 bg-white dark:bg-card hover:border-[#006065]/40 dark:hover:border-[#fad503]/40 transition-all shadow-sm">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {moment.timestamp_start && (
                        <button
                          onClick={() => onJumpToTimestamp?.(moment.timestamp_start)}
                          className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-muted-foreground hover:bg-[#006065] hover:text-white transition-colors"
                        >
                          <Play className="w-2.5 h-2.5 fill-current" />
                          {moment.timestamp_start}
                        </button>
                      )}

                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border ${getMomentBadgeColor(moment.moment_type)}`}>
                        {moment.moment_type}
                      </span>

                      {moment.speaker_name && (
                        <span className="text-xs text-slate-500 dark:text-muted-foreground font-medium">by {moment.speaker_name}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
                      <Sparkles className="w-3 h-3 text-[#006065] dark:text-[#fad503]" />
                      {Math.round((moment.confidence || 0.9) * 100)}% match
                    </div>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 dark:text-foreground mb-1">{moment.title}</h4>
                  {moment.description && (
                    <p className="text-xs text-slate-600 dark:text-muted-foreground leading-relaxed mb-3">{moment.description}</p>
                  )}

                  {/* Actions & Status */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100 dark:border-border/40 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      {isConverted ? (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#006065]/10 text-[#006065] dark:text-[#00beac] font-bold text-[11px] border border-[#006065]/20">
                          <Brain className="w-3.5 h-3.5 text-[#fad503]" /> Saved to Memory Vault
                        </span>
                      ) : isConfirmed ? (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleConfirm(moment.id)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#006065] text-white hover:bg-[#004e52] text-[11px] font-bold transition-colors shadow-xs"
                          >
                            <Check className="w-3 h-3 text-[#fad503]" /> Confirm
                          </button>
                          <button
                            onClick={() => handleDismiss(moment.id)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-500 text-[11px] transition-colors"
                          >
                            <XCircle className="w-3 h-3" /> Dismiss
                          </button>
                        </div>
                      )}

                      {/* Explicit Save to Memory Button */}
                      {!isConverted && (
                        <button
                          onClick={() => handleConvertToMemoryAction(moment)}
                          disabled={convertingId === moment.id}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#fad503]/20 hover:bg-[#fad503]/30 text-[#006065] dark:text-[#fad503] border border-[#fad503]/40 text-[11px] font-bold transition-all disabled:opacity-50"
                          title="Commit insight to permanent organizational memory"
                        >
                          <Brain className="w-3 h-3" />
                          {convertingId === moment.id ? 'Saving...' : 'Add to Memory'}
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setEditingMoment(moment);
                        setEditTitle(moment.title);
                        setEditDesc(moment.description || '');
                      }}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs flex items-center gap-1 transition-colors"
                    >
                      <Edit3 className="w-3 h-3" /> Edit
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manual Add Moment Modal */}
      {showManualAdd && createPortal(
        <div 
          className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setShowManualAdd(false); }}
        >
          <div className="relative w-full max-w-lg my-auto">
            <form onSubmit={handleCreateManualMoment} className="bg-white dark:bg-card rounded-3xl w-full p-6 sm:p-8 border border-slate-200 dark:border-border shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-border">
                <h4 className="text-base font-bold text-slate-900 dark:text-foreground flex items-center gap-2">
                  <Plus className="w-5 h-5 text-[#006065] dark:text-[#fad503]" /> Add Smart Moment
                </h4>
                <button type="button" onClick={() => setShowManualAdd(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm p-1">✕</button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-muted-foreground mb-1">Moment Type</label>
                <select
                  value={manualType}
                  onChange={e => setManualType(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-background text-slate-900 dark:text-foreground focus:outline-none focus:ring-2 focus:ring-[#006065]"
                >
                  <option value={MOMENT_TYPES.DECISION}>Decision</option>
                  <option value={MOMENT_TYPES.ACTION}>Action Item</option>
                  <option value={MOMENT_TYPES.COMMITMENT}>Commitment</option>
                  <option value={MOMENT_TYPES.RISK}>Risk / Blocker</option>
                  <option value={MOMENT_TYPES.QUESTION}>Key Question</option>
                  <option value={MOMENT_TYPES.TOPIC}>Key Topic</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-muted-foreground mb-1">Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Migrating to Supabase Auth"
                  value={manualTitle}
                  onChange={e => setManualTitle(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-background text-slate-900 dark:text-foreground focus:outline-none focus:ring-2 focus:ring-[#006065]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-muted-foreground mb-1">Context / Details</label>
                <textarea
                  placeholder="Details of the discussion, rationale, or owners..."
                  value={manualDesc}
                  onChange={e => setManualDesc(e.target.value)}
                  rows={4}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-background text-slate-900 dark:text-foreground focus:outline-none focus:ring-2 focus:ring-[#006065] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-border">
                <button
                  type="button"
                  onClick={() => setShowManualAdd(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#006065] text-white rounded-xl text-xs font-bold hover:bg-[#004e52] shadow-sm transition-all"
                >
                  Save Moment
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Moment Modal */}
      {editingMoment && createPortal(
        <div 
          className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setEditingMoment(null); }}
        >
          <div className="relative w-full max-w-lg my-auto">
            <form onSubmit={handleSaveEdit} className="bg-white dark:bg-card rounded-3xl w-full p-6 sm:p-8 border border-slate-200 dark:border-border shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-border">
                <h4 className="text-base font-bold text-slate-900 dark:text-foreground flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-[#006065] dark:text-[#fad503]" /> Edit Smart Moment
                </h4>
                <button type="button" onClick={() => setEditingMoment(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm p-1">✕</button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-muted-foreground mb-1">Title *</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-background text-slate-900 dark:text-foreground focus:outline-none focus:ring-2 focus:ring-[#006065]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-muted-foreground mb-1">Description / Context</label>
                <textarea
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  rows={4}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-background text-slate-900 dark:text-foreground focus:outline-none focus:ring-2 focus:ring-[#006065] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-border">
                <button
                  type="button"
                  onClick={() => setEditingMoment(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#006065] text-white rounded-xl text-xs font-bold hover:bg-[#004e52] shadow-sm transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

