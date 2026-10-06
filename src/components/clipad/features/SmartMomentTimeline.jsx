import React, { useState, useEffect } from 'react';
import { getSmartMoments, confirmSmartMoment, dismissSmartMoment, updateSmartMoment, convertMomentToMemory, MOMENT_TYPES, MOMENT_STATUS } from '@/lib/clipadSmartMomentService';
import { extractSmartMomentsFromTranscript } from '@/lib/clipadTranscriptIntelligence';
import { Zap, CheckCircle2, XCircle, Edit3, Clock, Sparkles, AlertCircle, ArrowUpRight, Play, RefreshCw, Check, Shield } from 'lucide-react';

export default function SmartMomentTimeline({ companyId, meetingId, videoId, transcript = [], title = '', onJumpToTimestamp }) {
  const [moments, setMoments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [editingMoment, setEditingMoment] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');

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
    if (companyId && (meetingId || videoId)) {
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

  const getMomentBadgeColor = (type) => {
    switch (type) {
      case MOMENT_TYPES.DECISION:
        return 'bg-[#006065] dark:bg-[#131A2C]/10 text-[#006065] dark:text-[#00beac] border-[#006065] dark:border-border/20';
      case MOMENT_TYPES.ACTION:
      case MOMENT_TYPES.COMMITMENT:
        return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20';
      case MOMENT_TYPES.RISK:
      case MOMENT_TYPES.BLOCKER:
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      case MOMENT_TYPES.QUESTION:
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      default:
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
    }
  };

  return (
    <div className="space-y-4">
      {/* Timeline Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-foreground flex items-center gap-2">
              Smart Moments Timeline
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 rounded-full">
                V3 Intelligence
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-muted-foreground">Key decisions, commitments, risks, and topics detected from conversation.</p>
          </div>
        </div>

        {transcript.length > 0 && (
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-all shadow-sm disabled:opacity-50"
          >
            {analyzing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {analyzing ? 'Extracting...' : 'Detect Moments'}
          </button>
        )}
      </div>

      {/* Timeline Items List */}
      {loading ? (
        <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" /> Loading Smart Moments...
        </div>
      ) : moments.length === 0 ? (
        <div className="p-6 text-center border-2 border-dashed border-slate-200 dark:border-border rounded-xl">
          <Zap className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="text-xs text-slate-500 dark:text-muted-foreground">No Smart Moments detected yet. Click "Detect Moments" to analyze transcript.</p>
        </div>
      ) : (
        <div className="relative pl-6 border-l-2 border-slate-200 dark:border-border space-y-4">
          {moments.map(moment => {
            const isDismissed = moment.status === MOMENT_STATUS.DISMISSED;
            const isConfirmed = moment.status === MOMENT_STATUS.CONFIRMED || moment.status === MOMENT_STATUS.CONVERTED;

            if (isDismissed) return null;

            return (
              <div key={moment.id} className="relative group">
                {/* Timeline Node Point */}
                <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-white dark:bg-card border-2 border-cyan-500 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card hover:border-slate-300 dark:border-border transition-all shadow-sm">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      {moment.timestamp_start && (
                        <button
                          onClick={() => onJumpToTimestamp?.(moment.timestamp_start)}
                          className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-muted-foreground hover:bg-cyan-500 hover:text-white transition-colors"
                        >
                          <Play className="w-2.5 h-2.5 fill-current" />
                          {moment.timestamp_start}
                        </button>
                      )}

                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${getMomentBadgeColor(moment.moment_type)}`}>
                        {moment.moment_type}
                      </span>

                      {moment.speaker_name && (
                        <span className="text-xs text-slate-500 dark:text-muted-foreground font-medium">by {moment.speaker_name}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
                      <Sparkles className="w-3 h-3 text-cyan-400" />
                      {Math.round((moment.confidence || 0.9) * 100)}% confidence
                    </div>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 dark:text-foreground mb-1">{moment.title}</h4>
                  {moment.description && (
                    <p className="text-xs text-slate-600 dark:text-muted-foreground leading-relaxed mb-3">{moment.description}</p>
                  )}

                  {/* Actions & Status */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-border text-xs">
                    <div className="flex items-center gap-2">
                      {isConfirmed ? (
                        <span className="flex items-center gap-1 text-[#006065] dark:text-[#00beac] font-semibold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed & Synced to Memory
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleConfirm(moment.id)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#006065] dark:bg-[#131A2C]/10 text-[#006065] hover:bg-[#006065] dark:bg-[#131A2C] hover:text-white text-[11px] font-medium transition-colors"
                          >
                            <Check className="w-3 h-3" /> Confirm
                          </button>
                          <button
                            onClick={() => handleDismiss(moment.id)}
                            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-accent text-slate-400 hover:text-rose-500 text-[11px] transition-colors"
                          >
                            <XCircle className="w-3 h-3" /> Dismiss
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setEditingMoment(moment);
                        setEditTitle(moment.title);
                        setEditDesc(moment.description || '');
                      }}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs flex items-center gap-1"
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

      {/* Edit Moment Modal */}
      {editingMoment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveEdit} className="bg-white dark:bg-card rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-border shadow-2xl space-y-4">
            <h4 className="text-base font-bold text-slate-900 dark:text-foreground flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-cyan-500" /> Edit Smart Moment
            </h4>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-muted-foreground mb-1">Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-background focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-muted-foreground mb-1">Description / Context</label>
              <textarea
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                rows={3}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-background focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingMoment(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 dark:text-muted-foreground hover:bg-slate-100 dark:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-cyan-500 text-white rounded-lg text-xs font-semibold hover:bg-cyan-600 shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

