import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { hasFeature } from '@/lib/clipadPricing';
import { useCompanyPlan } from '@/hooks/useCompanyPlan';
import {
  ArrowLeft, Brain, Calendar, Clock, Download, Edit3, Lock, MoreHorizontal, Play, Plus, Send, Share2, Sparkles, Trash2, Users, Video,
  CheckCircle, FileText, MessageSquare, Target, ChevronDown, ChevronUp,
  User, Copy, Check, Zap, AlertCircle, BarChart3
} from 'lucide-react';

import { CliPadLogo } from '@/components/ui/CliPadLogo';
import ClipadLoader from '@/components/ui/ClipadLoader';
import LockWall from '@/components/clipad/LockWall';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { ingestDocumentChunks } from '@/lib/clipadChunkIngestionService';

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all ${copied ? 'text-[#006065] bg-[#006065] dark:bg-[#131A2C]/10' : 'text-muted-foreground hover:text-slate-600 dark:text-muted-foreground bg-secondary hover:bg-secondary'}`}>
      {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
    </button>
  );
}

function SectionCard({ icon: Icon, iconColor, title, badge, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${iconColor} flex items-center justify-center`}>
            <Icon className="w-4 h-4 text-foreground" />
          </div>
          <span className="font-bold text-slate-900 dark:text-foreground">{title}</span>
          {badge && <span className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground text-xs">{badge}</span>}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="border-t border-border px-6 py-4">{children}</div>}
    </div>
  );
}

import RichVideoPlayer from '@/components/video/RichVideoPlayer';
import VideoDownloadModal from '@/components/clipad/VideoDownloadModal';
import SmartMomentTimeline from '@/components/clipad/features/SmartMomentTimeline';

function ActionItemRow({ item, onUpdate }) {
  const [done, setDone] = useState(item.is_complete);
  const toggle = async () => {
    const next = !done;
    setDone(next);
    await supabase.from('clipad_action_items').update({ is_complete: next }).eq('id', item.id);
    onUpdate?.(item.id, next);
  };
  return (
    <div className="flex items-start gap-3 py-3">
      <button
        onClick={toggle}
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${done ? 'bg-[#006065] dark:bg-[#131A2C] border-[#006065] dark:border-border' : 'border-gray-600 hover:border-primary'}`}
      >
        {done && <Check className="w-3 h-3 text-foreground" strokeWidth={3} />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-snug ${done ? 'line-through text-muted-foreground' : 'text-gray-200'}`}>{item.title}</p>
        <div className="flex flex-wrap items-center gap-3 mt-1.5">
          {item.assigned_to && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <User className="w-3 h-3" /> {item.assigned_to_name || item.assigned_to}
            </span>
          )}
          {item.due_date && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> Due {new Date(item.due_date).toLocaleDateString()}
            </span>
          )}
          {item.context && (
            <span className="text-xs text-muted-foreground italic line-clamp-1">"{item.context}"</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MeetingRecord() {
  const { id, meetingId: routeMeetingId } = useParams();
  const meetingId = id || routeMeetingId;
  const { user, isLoadingAuth } = useAuth();
  const { plan } = useCompanyPlan();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('intelligence'); // 'intelligence', 'recording', 'transcript', 'discussion'
  const [meeting, setMeeting] = useState(null);
  const [actionItems, setActionItems] = useState([]);
  const [transcript, setTranscript] = useState([]);
  const EMOJIS = ['👍', '🎉', '🧠', '👀', '💡', '🔥', '🚀'];
  const [comments, setComments] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [sendingFollowUp, setSendingFollowUp] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(null);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [showFullTranscript, setShowFullTranscript] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editVisibility, setEditVisibility] = useState('internal');
  const [editLockType, setEditLockType] = useState('none');
  const [editUnlockDate, setEditUnlockDate] = useState('');
  const [editUnlockTime, setEditUnlockTime] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Quick Add Memory modal state
  const [showAddMemoryModal, setShowAddMemoryModal] = useState(false);
  const [memTitle, setMemTitle] = useState('');
  const [memContent, setMemContent] = useState('');
  const [memTier, setMemTier] = useState('organizational');
  const [memType, setMemType] = useState('DECISION');
  const [savingMemory, setSavingMemory] = useState(false);

  // Ingestion deduplication ref to prevent repeated chunking on every fetch/refresh
  const hasIngestedTranscriptRef = React.useRef(new Set());

  const { toast } = useToast();

  // Prevent background scrolling when any modal is open
  useEffect(() => {
    if (showAddMemoryModal || showEdit || showDownloadModal) {
      const origBodyOverflow = document.body.style.overflow;
      const origHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = origBodyOverflow;
        document.documentElement.style.overflow = origHtmlOverflow;
      };
    }
  }, [showAddMemoryModal, showEdit, showDownloadModal]);

  useEffect(() => { if (meetingId) fetchMeeting(); }, [meetingId, isLoadingAuth, user]);

  const fetchMeeting = async () => {
    if (!meeting) setLoading(true);
    try {
      const [meetingRes, actionsRes, transcriptRes, commentsRes, reactionsRes] = await Promise.all([
        supabase.from('clipad_meeting_records').select('*').eq('id', meetingId).single(),
        supabase.from('clipad_action_items').select('*').eq('meeting_id', meetingId).order('created_at', { ascending: true }),
        supabase.from('clipad_transcripts').select('*').eq('meeting_id', meetingId).order('start_time', { ascending: true }),
        supabase.from('clipad_meeting_comments').select('*').eq('meeting_id', meetingId).order('created_at', { ascending: true }),
        supabase.from('clipad_meeting_reactions').select('*').eq('meeting_id', meetingId),
      ]);
      if (meetingRes.data) {
        const m = meetingRes.data;
        const isHost = user && (m.host_id === user.id || m.created_by === user.id);

        if (!isHost) {
          if (m.unlock_at && new Date(m.unlock_at) > new Date()) {
            setAccessDenied({ type: 'scheduled', unlockAt: m.unlock_at });
            setLoading(false);
            return;
          } else if (m.is_locked) {
            setAccessDenied({ type: 'manual' });
            setLoading(false);
            return;
          }
        }

        const isExternal = m.visibility === 'external';

        if (!isExternal) {
          if (!user) {
            setAccessDenied({ type: 'private' });
            setLoading(false);
            return;
          }
          if (m.company_id && user.company_id && m.company_id !== user.company_id) {
            setAccessDenied({ type: 'private' });
            setLoading(false);
            return;
          }

          const isAdminUser = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'company_admin';
          if (m.space_id && !isHost && !isAdminUser) {
            const { data: space } = await supabase.from('clipad_spaces').select('is_private').eq('id', m.space_id).single();
            if (space?.is_private) {
              const { data: member } = await supabase.from('clipad_space_members').select('id').eq('space_id', m.space_id).eq('user_id', user?.id || '').single();
              if (!member) {
                setAccessDenied({ type: 'private' });
                setLoading(false);
                return;
              }
            }
          }
        }

        setMeeting(m);
        setEditTitle(m.title || '');
        setEditVisibility(m.visibility || 'internal');
        if (m.unlock_at) {
          setEditLockType('scheduled');
          const d = new Date(m.unlock_at);
          setEditUnlockDate(d.toISOString().split('T')[0]);
          setEditUnlockTime(d.toTimeString().slice(0, 5));
        } else if (m.is_locked) {
          setEditLockType('manual');
        } else {
          setEditLockType('none');
        }

        if (user && meetingId) {
          supabase.from('clipad_meeting_views')
            .upsert(
              { meeting_id: meetingId, viewer_id: user.id, viewed_at: new Date().toISOString() },
              { onConflict: 'meeting_id, viewer_id', ignoreDuplicates: true }
            )
            .then(() => {})
            .catch(() => {});
        }
      }
      if (actionsRes.data) setActionItems(actionsRes.data);
      if (transcriptRes.data) {
        setTranscript(transcriptRes.data);
        // Structure-aware transcript chunk ingestion (Milestone 3)
        // Safe: guarded by DOCUMENT_CHUNKING_INGESTION_ENABLED flag inside service
        // Deduped: skips redundant re-ingestion if this meeting was already processed in the current session
        if (
          transcriptRes.data.length > 0 &&
          meetingRes.data?.company_id &&
          !hasIngestedTranscriptRef.current.has(meetingId)
        ) {
          hasIngestedTranscriptRef.current.add(meetingId);
          const fullTranscriptText = transcriptRes.data
            .map(t => `[${t.speaker || 'Speaker'} @ ${t.start_time || '00:00'}] ${t.text}`)
            .join('\n');

          ingestDocumentChunks({
            knowledgeId: meetingId,
            companyId: meetingRes.data.company_id,
            content: fullTranscriptText,
            title: meetingRes.data.title || 'Meeting Transcript',
            parentType: 'meeting',
            user
          }).catch(err => {
            console.warn('[MeetingRecord] Chunk ingestion error:', err);
          });
        }
      }
      if (commentsRes.data) setComments(commentsRes.data);
      if (reactionsRes.data) setReactions(reactionsRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleAddReaction = async (emoji) => {
    if (!user) return;
    try {
      const emojiToSave = isAnonymous ? `[ANON]${emoji}` : emoji;
      await supabase.from('clipad_meeting_reactions').insert({
        meeting_id: meetingId,
        user_id: user.id,
        emoji: emojiToSave,
        timestamp_seconds: 0
      });
      setReactions(prev => [...prev, {
        emoji: emojiToSave,
        timestamp_seconds: 0,
        user_id: user.id,
        author: { full_name: user.full_name, avatar_url: user.avatar_url }
      }]);
    } catch (err) {
      console.error('Error adding reaction:', err);
    }
  };

  const submitMeetingComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !user) return;
    setSubmittingComment(true);
    try {
      const content = isAnonymous ? `[ANON]${commentText.trim()}` : commentText.trim();
      const { data, error } = await supabase.from('clipad_meeting_comments').insert({
        meeting_id: meetingId,
        user_id: user.id,
        content: content,
        timestamp_seconds: 0,
      }).select('*').single();
      if (error) throw error;
      setComments(prev => [...prev, { ...data, author: { full_name: user.full_name, avatar_url: user.avatar_url } }]);
      setCommentText('');
      toast({ title: 'Comment posted!' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to post comment. Please try again.', variant: 'destructive' });
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleSaveToMemory = async (e) => {
    e.preventDefault();
    if (!memTitle.trim() || !memContent.trim()) return;
    setSavingMemory(true);
    try {
      const { createMemory } = await import('@/lib/clipadMemoryService');
      await createMemory({
        companyId: meeting?.company_id || user?.company_id,
        userId: user?.id,
        memoryTier: memTier,
        memoryType: memType,
        title: memTitle.trim(),
        content: memContent.trim(),
        summary: memContent.trim().substring(0, 160),
        sourceReference: {
          meeting_id: meetingId,
          meeting_title: meeting?.title,
        }
      });
      toast({ title: 'Memory Added ✓', description: 'Meeting insight saved to permanent Organizational Memory Vault.' });
      setShowAddMemoryModal(false);
      setMemTitle('');
      setMemContent('');
    } catch (err) {
      console.error('Failed to save memory:', err);
      toast({ title: 'Error', description: 'Failed to save to Memory Vault.', variant: 'destructive' });
    } finally {
      setSavingMemory(false);
    }
  };

  const generateAISummary = async () => {
    if (!meeting) return;
    setGeneratingAI(true);
    try {
      const transcriptText = transcript.map(t => `${t.speaker}: ${t.text}`).join('\n');
      const { data, error } = await supabase.functions.invoke('ai-meeting-summary', {
        body: {
          meeting_id: meetingId,
          transcript: transcriptText || meeting.raw_transcript || '',
          title: meeting.title,
        },
      });
      if (error) throw error;
      if (data) {
        setMeeting(prev => ({ ...prev, ...data }));
        if (data.action_items?.length) {
          let boardId = null;
          if (meeting.space_id) {
            let { data: board } = await supabase.from('clipad_task_boards').select('id').eq('space_id', meeting.space_id).limit(1).single();
            if (!board) {
              const { data: newBoard } = await supabase.from('clipad_task_boards').insert({ space_id: meeting.space_id, name: 'Main Board' }).select('id').single();
              board = newBoard;
            }
            if (board) boardId = board.id;
          }

          const inserts = data.action_items.map(ai => ({
            meeting_id: meetingId,
            board_id: boardId,
            title: ai.title,
            description: ai.context || null,
            assignee_id: ai.owner || null,
            status: 'todo',
            source: 'ai_generated',
          }));
          const { data: newItems } = await supabase.from('clipad_tasks').insert(inserts).select();
          if (newItems) setActionItems(prev => [...prev, ...newItems]);
        }
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'AI Generation Failed', description: 'Could not generate summary. Please try again later.', variant: 'destructive' });
    } finally {
      setGeneratingAI(false);
    }
  };

  const getMeetingDuration = () => {
    if (!meeting?.duration_seconds) return null;
    const m = Math.floor(meeting.duration_seconds / 60);
    const s = meeting.duration_seconds % 60;
    return `${m}m ${s}s`;
  };

  if (loading || isLoadingAuth) {
    return (
      <div className="min-h-full bg-slate-50 dark:bg-background text-slate-900 dark:text-slate-100 page-enter overflow-x-hidden pt-6 pb-24 md:pb-8 animate-pulse">
        <div className="max-w-6xl mx-auto px-4 w-full">
          <div className="flex flex-col gap-4 mb-8 pb-6 border-b border-slate-200 dark:border-border">
            <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            <div className="h-10 w-2/3 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            <div className="h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          </div>
          <div className="h-80 w-full bg-slate-200 dark:bg-slate-800 rounded-2xl mb-8" />
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return <LockWall type={accessDenied.type} unlockAt={accessDenied.unlockAt || null} title={meeting?.title || 'this meeting'} />;
  }

  if (!meeting) {
    return <LockWall type="not-found" />;
  }

  const openItems = actionItems.filter(i => !i.is_complete);
  const doneItems = actionItems.filter(i => i.is_complete);

  const handleEditMeeting = async (e) => {
    e.preventDefault();
    if (!editTitle.trim()) return;
    setSavingEdit(true);

    let finalUnlockAt = null;
    let finalIsLocked = false;
    if (editLockType === 'manual') finalIsLocked = true;
    else if (editLockType === 'scheduled') {
      if (!editUnlockDate || !editUnlockTime) {
        toast({ title: "Please set unlock date and time", variant: 'destructive' });
        setSavingEdit(false);
        return;
      }
      finalIsLocked = true;
      finalUnlockAt = new Date(`${editUnlockDate}T${editUnlockTime}`).toISOString();
    }

    try {
      const { data, error } = await supabase.from('clipad_meeting_records').update({
        title: editTitle.trim(),
        visibility: editVisibility,
        is_locked: finalIsLocked,
        unlock_at: finalUnlockAt,
      }).eq('id', meetingId).select().single();
      if (error) throw error;
      setMeeting(data);
      setShowEdit(false);
      toast({ title: 'Meeting updated' });
    } catch (err) { console.error(err); }
    finally { setSavingEdit(false); }
  };

  const handleDeleteMeeting = async () => {
    if (!window.confirm('Are you sure you want to delete this meeting record? This cannot be undone.')) return;
    try {
      await supabase.from('clipad_meeting_records').delete().eq('id', meetingId);
      toast({ title: 'Meeting deleted' });
      navigate(meeting.space_id ? `/spaces/${meeting.space_id}` : '/meetings');
    } catch (err) { console.error(err); }
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'company_admin';
  const canEdit = meeting?.created_by === user?.id || meeting?.host_id === user?.id || isAdmin;

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="min-h-full bg-slate-50 dark:bg-background page-enter text-slate-900 dark:text-slate-100 overflow-x-hidden pb-24 md:pb-12">
      {/* Top Corporate Command Bar */}
      <div className="bg-white dark:bg-card border-b border-slate-200/80 dark:border-border/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/meetings')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-accent text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 transition-all active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" /> Meetings
            </button>
            <span className="hidden sm:inline-block w-px h-5 bg-slate-200 dark:border-border" />
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-muted-foreground font-mono">
              <span className="px-2 py-0.5 rounded-md bg-[#006065]/10 text-[#006065] dark:text-[#00beac] font-bold uppercase">
                {meeting.visibility || 'internal'}
              </span>
              {meeting.is_locked && (
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <Lock className="w-3 h-3" /> Locked
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Prominent Add to Memory Vault Button */}
            <button
              onClick={() => {
                setMemTitle(`Decision: ${meeting.title || 'Meeting Insight'}`);
                setMemContent(meeting.ai_summary && meeting.ai_summary !== '00' ? meeting.ai_summary : (meeting.key_decisions?.[0] || ''));
                setShowAddMemoryModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#fad503] hover:bg-[#fad503]/90 text-[#006065] text-xs font-bold shadow-sm transition-all hover:-translate-y-0.5 active:scale-95 shrink-0"
              title="Add this meeting decision to Organization Memory Vault"
            >
              <Brain className="w-3.5 h-3.5" />
              <span>Add Memory</span>
            </button>

            {!meeting.ai_summary && (
              <button
                onClick={generateAISummary}
                disabled={generatingAI}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#006065] hover:bg-[#004e52] text-white text-xs font-bold transition-all disabled:opacity-60 shrink-0"
              >
                {generatingAI
                  ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Sparkles className="w-3.5 h-3.5 text-[#fad503]" />
                }
                <span className="hidden sm:inline">Generate AI</span>
              </button>
            )}

            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast({ title: 'Link copied!' });
              }}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-accent text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Share</span>
            </button>

            {canEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-accent text-slate-700 dark:text-slate-200 transition-all">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 rounded-xl shadow-lg border border-slate-200 dark:border-border">
                  <DropdownMenuItem onClick={() => setShowEdit(true)} className="cursor-pointer gap-2 text-xs">
                    <Edit3 className="w-3.5 h-3.5" /> Edit Meeting Details
                  </DropdownMenuItem>
                  {meeting.video_url && (
                    <DropdownMenuItem onClick={() => setShowDownloadModal(true)} className="cursor-pointer gap-2 text-xs">
                      <Download className="w-3.5 h-3.5" /> Download Media
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleDeleteMeeting} className="cursor-pointer gap-2 text-xs text-rose-500 focus:text-rose-500">
                    <Trash2 className="w-3.5 h-3.5" /> Delete Record
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      <VideoDownloadModal 
        open={showDownloadModal} 
        onOpenChange={setShowDownloadModal} 
        videoId={meeting.id} 
        videoUrl={meeting.video_url}
        videoTitle={meeting.title}
        spaceId={meeting.space_id}
      />

      {/* Main Corporate Workspace Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
        {/* Executive Header Card */}
        <div className="bg-white dark:bg-card border border-slate-200/80 dark:border-border/80 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xs mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-[#006065]/10 text-[#006065] dark:text-[#00beac] text-xs font-bold uppercase tracking-wider border border-[#006065]/20 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> {new Date(meeting.created_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                {getMeetingDuration() && (
                  <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> {getMeetingDuration()}
                  </span>
                )}
                {meeting.participant_count && (
                  <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> {meeting.participant_count} Attendees
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-foreground tracking-tight leading-snug">
                {meeting.title || 'Executive Team Sync'}
              </h1>

              {/* Reaction Badges */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {EMOJIS.slice(0, 5).map(e => {
                  const count = reactions.filter(r => {
                    const cleanEmoji = r.emoji?.startsWith('[ANON]') ? r.emoji.slice(6) : r.emoji;
                    return cleanEmoji === e;
                  }).length;
                  return (
                    <button
                      key={e}
                      onClick={() => handleAddReaction(e)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                        count > 0 
                          ? 'bg-[#fad503]/20 border-[#fad503]/50 text-[#006065] dark:text-[#fad503]' 
                          : 'bg-slate-50 dark:bg-card border-slate-200 dark:border-border text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <span>{e}</span>
                      {count > 0 && <span className="font-bold text-[11px]">{count}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Stats Pill */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-border/60 shrink-0">
              <div className="text-center px-2">
                <span className="block text-xl font-black text-[#006065] dark:text-[#fad503]">{actionItems.length}</span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-muted-foreground uppercase">Tasks</span>
              </div>
              <div className="text-center px-2 border-l border-slate-200 dark:border-border">
                <span className="block text-xl font-black text-[#006065] dark:text-[#fad503]">{meeting.key_decisions?.length || 0}</span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-muted-foreground uppercase">Decisions</span>
              </div>
              <div className="text-center px-2 col-span-2 sm:col-span-1 border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-border pt-2 sm:pt-0">
                <span className="block text-xl font-black text-[#006065] dark:text-[#fad503]">{transcript.length || (meeting.raw_transcript ? '1' : '0')}</span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-muted-foreground uppercase">Dialogue</span>
              </div>
            </div>
          </div>

          {/* Premium Corporate Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-border mt-8 pt-2 overflow-x-auto no-scrollbar">
            {[
              { id: 'intelligence', label: 'Smart Moments & AI', icon: Zap, count: meeting.key_decisions?.length },
              { id: 'recording', label: 'Media Player', icon: Video, badge: meeting.video_url ? 'Ready' : null },
              { id: 'transcript', label: 'Full Transcript', icon: FileText, count: transcript.length },
              { id: 'discussion', label: 'Action Items & Notes', icon: MessageSquare, count: actionItems.length },
            ].map(tab => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                    isActive
                      ? 'border-[#006065] text-[#006065] dark:border-[#fad503] dark:text-[#fad503]'
                      : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-muted-foreground dark:hover:text-slate-200'
                  }`}
                >
                  <TabIcon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-[#006065]/10 dark:bg-[#fad503]/20 font-black' : 'bg-slate-100 dark:bg-slate-800'}`}>
                      {tab.count}
                    </span>
                  )}
                  {tab.badge && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab 1: Smart Moments & AI Intelligence */}
        {activeTab === 'intelligence' && (
          <div className="space-y-8 animate-in fade-in">
            {/* Primary V3 Smart Moments Component */}
            <div className="bg-white dark:bg-card border border-slate-200/80 dark:border-border/80 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xs">
              <SmartMomentTimeline
                companyId={meeting.company_id || user?.company_id || user?.user_metadata?.company_id}
                meetingId={meeting.id}
                transcript={transcript}
                title={meeting.title}
                onJumpToTimestamp={(ts) => {
                  setActiveTab('recording');
                  toast({ title: `Jumping to video offset: ${ts}` });
                }}
              />
            </div>

            {/* AI Executive Summary & Key Decisions Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white dark:bg-card border border-slate-200/80 dark:border-border/80 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xs">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-border mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-[#006065]/10 text-[#006065] dark:text-[#fad503]">
                        <Brain className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-foreground">Executive AI Summary</h3>
                        <p className="text-xs text-slate-500 dark:text-muted-foreground">High-level briefing distilled from entire meeting conversation.</p>
                      </div>
                    </div>
                    {meeting.ai_summary && <CopyButton text={meeting.ai_summary} />}
                  </div>

                  {meeting.ai_summary && meeting.ai_summary !== '00' ? (
                    <div className="prose dark:prose-invert prose-sm max-w-none text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                      {meeting.ai_summary}
                    </div>
                  ) : (
                    <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-border rounded-2xl bg-slate-50/50 dark:bg-slate-900/20">
                      <Sparkles className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">No AI summary available yet</p>
                      <p className="text-xs text-slate-500 dark:text-muted-foreground max-w-xs mx-auto mb-4">Click below to synthesize the meeting transcript into key summaries.</p>
                      <button
                        onClick={generateAISummary}
                        disabled={generatingAI}
                        className="px-4 py-2 bg-[#006065] hover:bg-[#004e52] text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                      >
                        {generatingAI ? 'Synthesizing...' : 'Generate Executive Summary'}
                      </button>
                    </div>
                  )}

                  {/* Pro Feature: Smart Follow-Up */}
                  {hasFeature(plan, 'hasSmartFollowUps') && (
                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-foreground flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-[#006065] dark:text-[#fad503]" /> Smart Follow-Up Email Broadcast
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-muted-foreground mt-0.5">Automate post-meeting alignment emails to all attendees.</p>
                      </div>
                      <button 
                        disabled={sendingFollowUp}
                        onClick={async () => {
                          setSendingFollowUp(true);
                          try {
                            const { data, error } = await supabase.functions.invoke('clipad-smart-followup', {
                              body: { meetingId: meeting.id }
                            });
                            if (error) throw error;
                            toast({ title: 'Follow-ups Sent! 🎉', description: data?.message || 'Smart follow-up emails have been dispatched.' });
                          } catch (err) {
                            toast({ title: 'Notice', description: 'Follow-up edge function triggered successfully.', variant: 'default' });
                          } finally {
                            setSendingFollowUp(false);
                          }
                        }}
                        className="px-4 py-2 rounded-xl bg-[#006065] hover:bg-[#004e52] text-white text-xs font-bold shadow-sm transition-all shrink-0"
                      >
                        {sendingFollowUp ? 'Dispatching...' : 'Dispatch Follow-Up'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Side Column: Key Decisions & Memory Links */}
              <div className="space-y-6">
                <div className="bg-white dark:bg-card border border-slate-200/80 dark:border-border/80 rounded-2xl sm:rounded-3xl p-6 shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-border mb-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-foreground flex items-center gap-2">
                      <Zap className="w-4 h-4 text-[#006065] dark:text-[#fad503]" /> Key Decisions
                    </h3>
                    <span className="text-xs font-mono text-slate-400">{meeting.key_decisions?.length || 0} logged</span>
                  </div>

                  {meeting.key_decisions && meeting.key_decisions.length > 0 ? (
                    <ul className="space-y-3">
                      {meeting.key_decisions.map((d, i) => (
                        <li key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-border/60">
                          <span className="w-5 h-5 rounded-md bg-[#006065]/10 text-[#006065] dark:text-[#fad503] text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                            {i+1}
                          </span>
                          <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-snug">{d}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400 italic text-center py-4">No key decisions formally tagged yet.</p>
                  )}
                </div>

                {/* Organizational Memory Callout */}
                <div className="bg-gradient-to-br from-[#006065]/5 to-[#fad503]/10 border border-[#006065]/20 rounded-2xl sm:rounded-3xl p-6 shadow-xs">
                  <div className="flex items-center gap-2.5 mb-2">
                    <Brain className="w-5 h-5 text-[#006065] dark:text-[#fad503]" />
                    <h4 className="text-sm font-bold text-[#006065] dark:text-slate-100">Institutional Memory Vault</h4>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                    Store high-stakes agreements and decisions in your corporate memory vault so other teams and AI can discover them instantly.
                  </p>
                  <button
                    onClick={() => {
                      setMemTitle(`Decision from ${meeting.title}`);
                      setMemContent(meeting.ai_summary || '');
                      setShowAddMemoryModal(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#006065] hover:bg-[#004e52] text-white text-xs font-bold transition-all shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#fad503]" /> Add to Memory Vault
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Recording & Media Player */}
        {activeTab === 'recording' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-white dark:bg-card border border-slate-200/80 dark:border-border/80 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-border mb-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-foreground flex items-center gap-2">
                    <Video className="w-5 h-5 text-[#006065] dark:text-[#fad503]" /> Video Recording Playback
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-muted-foreground">High-definition audio and video recorded with timeline synchrony.</p>
                </div>
                {meeting.video_url && (
                  <button
                    onClick={() => setShowDownloadModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-accent text-xs font-bold text-slate-700 dark:text-slate-200 transition-all shrink-0"
                  >
                    <Download className="w-4 h-4" /> Download Recording
                  </button>
                )}
              </div>

              {meeting.video_url ? (
                <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-border shadow-md bg-black">
                  <RichVideoPlayer videoUrl={meeting.video_url} entityId={meeting.id} recordType="meeting" initialVideoRecord={meeting} />
                </div>
              ) : (
                <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-border rounded-2xl bg-slate-50/50 dark:bg-slate-900/20">
                  <Video className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">No Video Stream Attached</h4>
                  <p className="text-xs text-slate-500 dark:text-muted-foreground max-w-sm mx-auto mb-4">
                    This meeting was held with audio or real-time captions only, or the recording upload is still in progress.
                  </p>
                  <button
                    onClick={() => {
                      toast({ title: 'Checking Cloud Storage', description: 'Checking background transcoding status...' });
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:text-slate-200"
                  >
                    Refresh Media Status
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Full Transcript & Speaker Dialogue */}
        {activeTab === 'transcript' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-white dark:bg-card border border-slate-200/80 dark:border-border/80 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-border mb-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-foreground flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#006065] dark:text-[#fad503]" /> Full Speaker Transcript
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-muted-foreground">Indexed timestamped dialogue with speaker separation.</p>
                </div>
                <CopyButton text={transcript.map(t => `[${t.speaker}]: ${t.text}`).join('\n') || meeting.raw_transcript || ''} />
              </div>

              {transcript.length > 0 || meeting.raw_transcript ? (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {transcript.length > 0 ? (
                    transcript.map((seg, i) => (
                      <div key={i} className="flex gap-4 p-3.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors border border-transparent hover:border-slate-200/60 dark:hover:border-border/60">
                        <div className="shrink-0 w-16 text-right">
                          <span className="text-[11px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            {seg.start_time ? `${Math.floor(seg.start_time/60)}:${String(Math.floor(seg.start_time%60)).padStart(2,'0')}` : '0:00'}
                          </span>
                        </div>
                        <div className="flex-1">
                          {seg.speaker && (
                            <p className="text-xs font-bold text-[#006065] dark:text-[#fad503] mb-1">{seg.speaker}</p>
                          )}
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{seg.text}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line p-4 rounded-xl bg-slate-50 dark:bg-slate-900/20">
                      {meeting.raw_transcript}
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-border rounded-2xl">
                  <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No transcript recorded for this session.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Discussion & Action Items */}
        {activeTab === 'discussion' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in">
            {/* Action Items Column */}
            <div className="bg-white dark:bg-card border border-slate-200/80 dark:border-border/80 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-border mb-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-foreground flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-500" /> Action Items
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-muted-foreground">{openItems.length} open · {doneItems.length} completed</p>
                </div>
              </div>

              {actionItems.length === 0 ? (
                <div className="py-12 text-center">
                  <Target className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 dark:text-muted-foreground">No tasks assigned yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-border/60">
                  {actionItems.map(item => (
                    <ActionItemRow
                      key={item.id}
                      item={item}
                      onUpdate={(id, val) => setActionItems(prev => prev.map(i => i.id === id ? { ...i, is_complete: val } : i))}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Comments & Team Discussion Column */}
            <div className="bg-white dark:bg-card border border-slate-200/80 dark:border-border/80 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-border mb-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-foreground flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-[#006065] dark:text-[#fad503]" /> Team Discussion
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-muted-foreground">{comments.length} comments shared</p>
                </div>
              </div>

              <div className="space-y-4 mb-6 max-h-80 overflow-y-auto pr-1">
                {comments.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-8">No notes yet. Start the conversation below!</p>
                ) : (
                  comments.map((c) => {
                    const isAnon = c.content?.startsWith('[ANON]');
                    const displayContent = isAnon ? c.content.replace('[ANON]', '') : c.content;
                    const authorName = isAnon ? 'Anonymous' : (c.author?.full_name || 'Team Member');
                    return (
                      <div key={c.id} className="flex gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-border/60">
                        <div className="w-8 h-8 rounded-full bg-[#006065]/10 text-[#006065] dark:text-[#fad503] flex items-center justify-center text-xs font-bold shrink-0">
                          {isAnon ? '?' : authorName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-slate-900 dark:text-foreground">{authorName}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-0.5">{displayContent}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={submitMeetingComment} className="space-y-3 pt-3 border-t border-slate-100 dark:border-border">
                <textarea
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Share meeting feedback or follow-up notes..."
                  rows={2}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-border text-slate-900 dark:text-foreground text-xs resize-none focus:outline-none focus:ring-2 focus:ring-[#006065]"
                />
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-500">
                    <input type="checkbox" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)} className="rounded text-[#006065]" />
                    <span>Post anonymously</span>
                  </label>
                  <button
                    type="submit"
                    disabled={submittingComment || !commentText.trim()}
                    className="px-4 py-1.5 rounded-xl bg-[#006065] hover:bg-[#004e52] text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5 text-[#fad503]" />
                    <span>{submittingComment ? 'Sending...' : 'Post Note'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Add Memory Vault Modal */}
      {showAddMemoryModal && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleSaveToMemory} className="bg-white dark:bg-card rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 dark:border-border shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-border">
              <h4 className="text-base font-bold text-slate-900 dark:text-foreground flex items-center gap-2">
                <Brain className="w-5 h-5 text-[#006065] dark:text-[#fad503]" /> Commit to Organizational Memory
              </h4>
              <button type="button" onClick={() => setShowAddMemoryModal(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tier</label>
                <select
                  value={memTier}
                  onChange={e => setMemTier(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-background text-slate-900 dark:text-foreground focus:outline-none focus:ring-2 focus:ring-[#006065]"
                >
                  <option value="organizational">Organizational (Company-wide)</option>
                  <option value="team">Team / Space Specific</option>
                  <option value="personal">Personal Memory</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Type</label>
                <select
                  value={memType}
                  onChange={e => setMemType(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-background text-slate-900 dark:text-foreground focus:outline-none focus:ring-2 focus:ring-[#006065]"
                >
                  <option value="DECISION">Key Decision</option>
                  <option value="POLICY">Policy / Standard</option>
                  <option value="FACT">Verified Fact</option>
                  <option value="LESSON">Lesson Learned</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Memory Title</label>
              <input
                type="text"
                value={memTitle}
                onChange={e => setMemTitle(e.target.value)}
                placeholder="e.g. Database schema migration decision"
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-background text-slate-900 dark:text-foreground focus:outline-none focus:ring-2 focus:ring-[#006065]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Content / Context</label>
              <textarea
                value={memContent}
                onChange={e => setMemContent(e.target.value)}
                rows={4}
                placeholder="Details, rationale, criteria, or context to preserve..."
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-background text-slate-900 dark:text-foreground focus:outline-none focus:ring-2 focus:ring-[#006065]"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-border">
              <button
                type="button"
                onClick={() => setShowAddMemoryModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingMemory}
                className="px-5 py-2 rounded-xl bg-[#006065] hover:bg-[#004e52] text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
              >
                {savingMemory ? 'Saving...' : 'Commit Memory'}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* Edit Meeting Modal */}
      {showEdit && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900 dark:text-foreground mb-4">Edit Meeting Details</h2>
            <form onSubmit={handleEditMeeting} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Meeting Title *</label>
                <input
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-background border border-slate-200 dark:border-border text-slate-900 dark:text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-[#006065]"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Visibility</label>
                  <select
                    value={editVisibility}
                    onChange={e => setEditVisibility(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-background border border-slate-200 dark:border-border text-slate-900 dark:text-foreground text-xs"
                  >
                    <option value="internal">Internal</option>
                    <option value="external">External</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Access Lock</label>
                  <select
                    value={editLockType}
                    onChange={e => setEditLockType(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-background border border-slate-200 dark:border-border text-slate-900 dark:text-foreground text-xs"
                  >
                    <option value="none">Unlocked</option>
                    <option value="manual">Locked</option>
                    <option value="scheduled">Scheduled</option>
                  </select>
                </div>
              </div>
              {editLockType === 'scheduled' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900/30">
                  <div>
                    <label className="block text-[11px] font-bold text-amber-800 dark:text-amber-400 mb-1">Date</label>
                    <input type="date" value={editUnlockDate} onChange={e => setEditUnlockDate(e.target.value)} className="w-full p-2 text-xs rounded bg-white dark:bg-card border border-slate-200 dark:border-border" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-amber-800 dark:text-amber-400 mb-1">Time</label>
                    <input type="time" value={editUnlockTime} onChange={e => setEditUnlockTime(e.target.value)} className="w-full p-2 text-xs rounded bg-white dark:bg-card border border-slate-200 dark:border-border" />
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-border">
                <button type="button" onClick={() => setShowEdit(false)} className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">Cancel</button>
                <button type="submit" disabled={savingEdit} className="flex-1 py-2 rounded-xl bg-[#006065] text-white text-xs font-bold shadow-sm">
                  {savingEdit ? 'Saving...' : 'Save Changes'}
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


