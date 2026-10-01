import React, { useState, useEffect } from 'react';
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

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all ${copied ? 'text-emerald-500 bg-emerald-500/10' : 'text-muted-foreground hover:text-gray-300 bg-secondary hover:bg-secondary'}`}>
      {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
    </button>
  );
}

function SectionCard({ icon: Icon, iconColor, title, badge, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${iconColor} flex items-center justify-center`}>
            <Icon className="w-4 h-4 text-foreground" />
          </div>
          <span className="font-bold text-foreground">{title}</span>
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
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${done ? 'bg-emerald-500 border-emerald-500' : 'border-gray-600 hover:border-primary'}`}
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
  const { meetingId } = useParams();
  const { user, isLoadingAuth } = useAuth();
  const { plan } = useCompanyPlan();
  const navigate = useNavigate();

  const [meeting, setMeeting] = useState(null);
  const [actionItems, setActionItems] = useState([]);
  const [transcript, setTranscript] = useState([]);
  const EMOJIS = ['ðŸ‘', 'ðŸŽ‰', 'ðŸ§ ', 'ðŸ‘€', 'ðŸ’¡', 'ðŸ”¥', 'ðŸš€'];
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
  const { toast } = useToast();

  useEffect(() => { if (meetingId) fetchMeeting(); }, [meetingId, isLoadingAuth, user]);

  const fetchMeeting = async () => {
    setLoading(true);
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

        // 1. Check Locks FIRST
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
          // 0. Ensure user is logged in and belongs to the same company
          if (!user) {
            setAccessDenied({ type: 'private' }); // or a custom 'auth_required' type
            setLoading(false);
            return;
          }
          if (m.company_id && user.company_id && m.company_id !== user.company_id) {
            setAccessDenied({ type: 'private' });
            setLoading(false);
            return;
          }

          // 1. Check Space Privacy
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

        if (user) {
          supabase.from('clipad_meeting_views')
            .insert({ meeting_id: meetingId, viewer_id: user.id })
            .select()
            .then(() => {})
            .catch(() => {}); // ignore duplicates (UNIQUE constraint)
        }
      }
      if (actionsRes.data) setActionItems(actionsRes.data);
      if (transcriptRes.data) setTranscript(transcriptRes.data);
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
          // Find or create default board for this space
          let boardId = null;
          if (meeting.space_id) {
            let { data: board } = await supabase.from('clipad_task_boards').select('id').eq('space_id', meeting.space_id).limit(1).single();
            if (!board) {
              const { data: newBoard } = await supabase.from('clipad_task_boards').insert({ space_id: meeting.space_id, name: 'Main Board' }).select('id').single();
              board = newBoard;
            }
            if (board) boardId = board.id;
          }

          // Insert action items into the new tasks system
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

        // Pipe meeting notes to a new Doc in the Knowledge Layer
        if (meeting.space_id && data.summary) {
          const { data: newDoc } = await supabase.from('clipad_docs').insert({
            space_id: meeting.space_id,
            title: `Meeting Notes: ${meeting.title || 'Untitled'}`,
            content: `**AI Summary:**\n\n${data.summary}\n\n**Decisions:**\n${data.decisions?.join('\n') || 'None'}`,
            created_by: user?.id || null
          }).select().single();
          
          if (newDoc) {
            // Link the doc to the meeting
            await supabase.from('clipad_doc_links').insert({
              doc_id: newDoc.id,
              target_id: meetingId,
              target_type: 'meeting'
            });
          }
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
      <div className="min-h-full bg-transparent  page-enter overflow-x-hidden pt-6 pb-24 md:pb-8 animate-pulse">
        <div className="max-w-4xl mx-auto px-4 w-full">
          {/* Header Skeleton */}
          <div className="flex flex-col gap-4 mb-8 pb-6 border-b border-white/15 dark:border-white/15">
            <div className="flex items-center gap-3">
              <div className="h-8 w-16 bg-white/15 dark:bg-slate-800 rounded-full" />
              <div className="h-6 w-32 bg-white/15 dark:bg-slate-800 rounded" />
            </div>
            <div className="h-10 w-3/4 bg-white/15 dark:bg-slate-800 rounded-lg" />
            <div className="flex items-center gap-4">
              <div className="h-8 w-8 bg-white/15 dark:bg-slate-800 rounded-full" />
              <div className="h-4 w-48 bg-white/15 dark:bg-slate-800 rounded" />
            </div>
          </div>
          {/* Main content Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <div className="h-64 w-full bg-white/15 dark:bg-slate-800 rounded-2xl" />
              <div className="h-40 w-full bg-white/15 dark:bg-slate-800 rounded-2xl" />
            </div>
            <div className="space-y-4">
              <div className="h-24 w-full bg-white/15 dark:bg-slate-800 rounded-2xl" />
              <div className="h-24 w-full bg-white/15 dark:bg-slate-800 rounded-2xl" />
            </div>
          </div>
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
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="min-h-full bg-[#f0f2f5]  page-enter text-white dark:text-slate-100 overflow-x-hidden pb-24 md:pb-8">
      {/* Contextual Action Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-transparent border-b border-black/5 dark:border-white/5 mb-4">
          <button onClick={() => navigate('/meetings')} className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/95 dark:bg-[#202c33]/95 backdrop-blur-md border border-black/5 dark:border-white/5 shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] text-sm font-semibold text-white/90 dark:text-foreground transition-all hover:-translate-y-0.5">
            <ArrowLeft className="w-4 h-4 text-white/70" /> Meetings
          </button>
        <div className="flex items-center gap-2">
          {!meeting.ai_summary && (
            <button
              onClick={generateAISummary}
              disabled={generatingAI}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-foreground text-xs font-bold shadow-lg shadow-pink-500/20 transition-all disabled:opacity-60"
            >
              {generatingAI
                ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generatingâ€¦</>
                : <><Sparkles className="w-3.5 h-3.5" /> Generate AI Summary</>
              }
            </button>
          )}
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto sm:px-6 lg:px-8 py-4 sm:py-8">

        <VideoDownloadModal 
          open={showDownloadModal} 
          onOpenChange={setShowDownloadModal} 
          videoId={meeting.id} 
          videoUrl={meeting.video_url}
          videoTitle={meeting.title}
          spaceId={meeting.space_id}
        />
        {/* Video Player */}
        <div className="mb-4 sm:mb-6">
          {meeting.video_url ? (
            <div className="bg-card md:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border overflow-hidden">
              <RichVideoPlayer videoUrl={meeting.video_url} entityId={meeting.id} recordType="meeting" initialVideoRecord={meeting} />
            </div>
            ) : (
              <button 
                onClick={() => {
                  toast({ title: 'Recording Loading', description: 'Your recording is being processed by the cloud provider and will be available shortly.' });
                }}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white/10 dark:bg-secondary hover:bg-white/15 dark:hover:bg-slate-700 text-white/90 dark:text-foreground font-bold transition-all hover:-translate-y-0.5 mt-4 mb-8 mx-4 sm:mx-0"
              >
                <Video className="w-4 h-4" /> Recording Pending...
              </button>
            )}
        </div>

        {/* 3-Column Grid for Meeting Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Info (Col-Span-2) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header (YouTube Style) */}
            <div className="mb-6 px-4 sm:px-0">
              <div className="flex items-center gap-3 mb-2">
                {meeting.ai_summary && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-600 dark:text-pink-400 text-[10px] font-bold uppercase tracking-wider">
                    <Sparkles className="w-3 h-3" /> AI Summary Ready
                  </span>
                )}
              </div>
              <h1 className="text-xl md:text-3xl font-bold text-white dark:text-white mb-3 leading-tight">{meeting.title || 'Team Meeting'}</h1>
              
              <div className="flex items-center gap-4 text-sm text-white/70 dark:text-muted-foreground mb-4">
                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{new Date(meeting.created_at).toLocaleDateString()}</span>
                {getMeetingDuration() && <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{getMeetingDuration()}</span>}
                {meeting.participant_count && <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />{meeting.participant_count} participants</span>}
              </div>

              {/* Horizontal Action Bar */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 mask-edges mt-2">
                {/* Reactions / Likes */}
                <div className="flex items-center bg-white/10 dark:bg-white/5 rounded-full px-1.5 py-1 shrink-0 border border-black/5 dark:border-white/5">
                  {EMOJIS.slice(0, 4).map(e => {
                    const count = reactions.filter(r => {
                      const cleanEmoji = r.emoji?.startsWith('[ANON]') ? r.emoji.slice(6) : r.emoji;
                      return cleanEmoji === e;
                    }).length;
                    return (
                      <button key={e} onClick={() => handleAddReaction(e)} className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors text-sm font-semibold">
                        <span className="text-lg leading-none">{e}</span>
                        {count > 0 && <span className="text-white/90 dark:text-white/50">{count}</span>}
                      </button>
                    );
                  })}
                </div>
                
                {/* Share */}
                <button onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast({ title: 'Link copied!' });
                }} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 dark:bg-white/5 hover:bg-white/15 dark:hover:bg-white/10 transition-colors text-sm font-semibold text-white dark:text-white shrink-0 border border-black/5 dark:border-white/5">
                  <Share2 className="w-4 h-4" /> Share
                </button>
                
                {/* Download */}
                {meeting.video_url && (
                  <button onClick={() => setShowDownloadModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 dark:bg-white/5 hover:bg-white/15 dark:hover:bg-white/10 transition-colors text-sm font-semibold text-white dark:text-white shrink-0 border border-black/5 dark:border-white/5">
                    <Download className="w-4 h-4" /> Download
                  </button>
                )}

                {/* Edit/More */}
                {canEdit && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 dark:bg-white/5 hover:bg-white/15 dark:hover:bg-white/10 transition-colors text-sm font-semibold text-white dark:text-white shrink-0 border border-black/5 dark:border-white/5">
                        <MoreHorizontal className="w-4 h-4" /> More
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40 rounded-xl">
                      <DropdownMenuItem onClick={() => setShowEdit(true)} className="cursor-pointer gap-2">
                        <Edit3 className="w-4 h-4" /> Edit Meeting
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleDeleteMeeting} className="cursor-pointer gap-2 text-rose-500 focus:text-rose-500">
                        <Trash2 className="w-4 h-4" /> Delete Meeting
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
            {/* AI Summary */}
        <div className="px-4 sm:px-0">
        {meeting.ai_summary && hasFeature(plan, 'hasAdvancedAI') ? (
          <div className="space-y-6">
            <SectionCard icon={Brain} iconColor="from-pink-500 to-rose-500" title="Advanced AI Intelligence" defaultOpen>
              <div className="flex justify-end mb-3">
                <CopyButton text={meeting.ai_summary === '00' ? 'No summary generated.' : meeting.ai_summary} />
              </div>
              <p className="text-sm text-white/90 dark:text-foreground leading-relaxed whitespace-pre-line">
                {meeting.ai_summary === '00' ? 'No meaningful transcript recorded to generate a summary.' : meeting.ai_summary}
              </p>
              
              {/* Pro Feature: Smart Follow-Up */}
              {hasFeature(plan, 'hasSmartFollowUps') && (
                <div className="mt-8 pt-6 border-t border-border">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" /> Smart Follow-Up Emails
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">Automatically draft and send follow-ups to attendees.</p>
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
                          toast({ title: 'Follow-ups Sent! ðŸŽ‰', description: data?.message || 'Smart follow-up emails have been queued.' });
                        } catch (err) {
                          toast({ title: 'Error', description: 'Failed to send follow-ups. Please try again.', variant: 'destructive' });
                        } finally {
                          setSendingFollowUp(false);
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all disabled:opacity-60"
                    >
                      {sendingFollowUp ? 'Sending...' : 'Send Follow-Up'}
                    </button>
                  </div>
                </div>
              )}
            </SectionCard>
          </div>
        ) : meeting.ai_summary && !hasFeature(plan, 'hasAdvancedAI') ? (
          <SectionCard icon={Brain} iconColor="from-emerald-500 to-emerald-600" title="AI Intelligence Locked" defaultOpen>
            <div className="relative overflow-hidden rounded-xl bg-transparent dark:bg-[#006065] border border-white/15 dark:border-white/15 p-8 text-center">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white dark:to-slate-950/90 pointer-events-none" />
              <Lock className="w-8 h-8 text-emerald-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white dark:text-slate-100 relative z-10 mb-2">Advanced AI & Smart Follow-ups</h3>
              <p className="text-sm text-white/70 max-w-sm mx-auto relative z-10 mb-6">
                Upgrade to Pro to unlock the full AI Intelligence layer, sentiment analysis, and automated smart follow-ups.
              </p>
              <button 
                onClick={() => navigate('/clipad/billing')}
                className="relative z-10 px-6 py-2.5 rounded-full bg-[#006065] hover:bg-[#004e52] text-white font-bold text-sm shadow-xl transition-colors"
              >
                Upgrade to Pro
              </button>
            </div>
          </SectionCard>
        ) : null}
        </div>

        {/* Phase 3 Smart Moments Timeline */}
        <div className="px-4 sm:px-0 mt-6">
          <SectionCard icon={Zap} iconColor="from-cyan-500 to-teal-500" title="Smart Moments Intelligence" defaultOpen>
            <SmartMomentTimeline
              companyId={meeting.company_id}
              meetingId={meeting.id}
              transcript={transcript}
              title={meeting.title}
              onJumpToTimestamp={(ts) => {
                toast({ title: `Jumping to timestamp ${ts}` });
              }}
            />
          </SectionCard>
        </div>

        
        {/* Transcript */}
        <div className="px-4 sm:px-0">
        {(transcript.length > 0 || meeting.raw_transcript) && (
          <SectionCard icon={FileText} iconColor="from-violet-500 to-purple-500" title="Transcript">
            <div className="flex justify-between mb-4">
              <span className="text-xs text-muted-foreground">{transcript.length} segments</span>
              <CopyButton text={transcript.map(t => `[${t.speaker}]: ${t.text}`).join('\n') || meeting.raw_transcript || ''} />
            </div>
            <div className={`space-y-3 overflow-hidden transition-all ${showFullTranscript ? '' : 'max-h-72'}`}>
              {transcript.length > 0 ? (
                transcript.map((seg, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="shrink-0 w-16 text-right">
                      <span className="text-[10px] font-mono text-muted-foreground">{seg.start_time ? `${Math.floor(seg.start_time/60)}:${String(Math.floor(seg.start_time%60)).padStart(2,'0')}` : ''}</span>
                    </div>
                    <div>
                      {seg.speaker && <p className="text-xs font-bold text-primary mb-0.5">{seg.speaker}</p>}
                      <p className="text-sm text-gray-300 leading-relaxed">{seg.text}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{meeting.raw_transcript}</p>
              )}
            </div>
            {(transcript.length > 5 || (meeting.raw_transcript && meeting.raw_transcript.length > 400)) && (
              <button
                onClick={() => setShowFullTranscript(!showFullTranscript)}
                className="mt-3 text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
              >
                {showFullTranscript ? <><ChevronUp className="w-3.5 h-3.5" /> Show less</> : <><ChevronDown className="w-3.5 h-3.5" /> Show full transcript</>}
              </button>
            )}
          </SectionCard>
        )}
        </div>
      
          </div>

          {/* Sidebar (Col-Span-1) */}
          <div className="lg:col-span-1 space-y-6 px-4 sm:px-0">
            {/* Key Decisions */}
        {meeting.key_decisions && meeting.key_decisions.length > 0 && (
          <SectionCard icon={Zap} iconColor="from-amber-500 to-orange-500" title="Key Decisions" badge={meeting.key_decisions.length}>
            <ul className="space-y-2">
              {meeting.key_decisions.map((d, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-500 dark:text-amber-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i+1}</span>
                  <p className="text-sm text-white/90 dark:text-foreground leading-snug">{d}</p>
                </li>
              ))}
            </ul>
          </SectionCard>
        )}

        
            {/* Action Items */}
        <SectionCard
          icon={CheckCircle}
          iconColor="from-emerald-500 to-teal-500"
          title="Action Items"
          badge={`${openItems.length} open Â· ${doneItems.length} done`}
        >
          {actionItems.length === 0 ? (
            <div className="py-8 text-center">
              <Target className="w-10 h-10 text-white/50 dark:text-white/80 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No action items yet.</p>
              {!meeting.ai_summary && (
                <button onClick={generateAISummary} disabled={generatingAI} className="mt-3 text-xs text-primary hover:text-primary/80 transition-colors">
                  Generate AI summary to extract action items â†’
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {actionItems.map(item => (
                <ActionItemRow
                  key={item.id}
                  item={item}
                  onUpdate={(id, val) => setActionItems(prev => prev.map(i => i.id === id ? { ...i, is_complete: val } : i))}
                />
              ))}
            </div>
          )}
        </SectionCard>

        
            {/* Open Questions */}
        {meeting.open_questions && meeting.open_questions.length > 0 && (
          <SectionCard icon={AlertCircle} iconColor="from-cyan-500 to-blue-500" title="Open Questions" badge={meeting.open_questions.length}>
            <ul className="space-y-2">
              {meeting.open_questions.map((q, i) => (
                <li key={i} className="flex items-start gap-3">
                  <MessageSquare className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-white/90 dark:text-foreground leading-snug">{q}</p>
                </li>
              ))}
            </ul>
          </SectionCard>
        )}


        {/* Comments Section */}
        <SectionCard icon={MessageSquare} iconColor="from-blue-500 to-indigo-500" title="Comments & Reactions" badge={comments.length > 0 ? comments.length : undefined} defaultOpen>
          {reactions.length > 0 && (
            <div className="flex flex-wrap gap-2 p-3 mb-4 rounded-xl bg-white/95 dark:bg-[#202c33]/95 border border-black/5 dark:border-white/5 shadow-sm">
              {EMOJIS.map(e => {
                const count = reactions.filter(r => {
                  const cleanEmoji = r.emoji?.startsWith('[ANON]') ? r.emoji.slice(6) : r.emoji;
                  return cleanEmoji === e;
                }).length;
                if (!count) return null;
                return (
                  <button key={e} onClick={() => handleAddReaction(e)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/50 dark:bg-black/20 hover:bg-black/5 dark:hover:bg-white/5 text-sm font-medium transition-all shadow-sm border border-black/5 dark:border-white/5">
                    {e} <span className="text-xs text-white/70 dark:text-muted-foreground">{count}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap gap-2 mb-4">
            {EMOJIS.map(e => (
              <button key={e} onClick={() => handleAddReaction(e)} className="p-2 text-xl rounded-full hover:bg-white/10 dark:hover:bg-slate-800 transition-colors">
                {e}
              </button>
            ))}
          </div>

          <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
            {comments.length === 0 ? (
              <p className="text-sm text-muted-foreground italic text-center py-4">No comments yet. Be the first to comment!</p>
            ) : (
              comments.map((c) => {
                const isAnon = c.content?.startsWith('[ANON]');
                const displayContent = isAnon ? c.content.replace('[ANON]', '') : c.content;
                const authorName = isAnon ? 'Anonymous' : (c.author?.full_name || 'Team Member');
                return (
                  <div key={c.id} className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-500 text-xs font-bold shrink-0">
                      {isAnon ? '?' : authorName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-white/90 dark:text-foreground">{authorName}</p>
                      <p className="text-sm text-white/80 dark:text-muted-foreground leading-relaxed mt-0.5">{displayContent}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <form onSubmit={submitMeetingComment} className="space-y-2">
            <textarea
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Write a comment..."
              rows={2}
              className="w-full px-3 py-2 rounded-xl bg-white/95 dark:bg-[#202c33]/95 border border-black/5 dark:border-white/5 text-white dark:text-white text-sm resize-none focus:outline-none focus:border-indigo-500/50 transition-all shadow-[0_2px_10px_rgba(0,0,0,0.04)]"
            />
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)} className="rounded" />
                <span className="text-xs text-muted-foreground">Post Anonymously</span>
              </label>
              <button
                type="submit"
                disabled={submittingComment || !commentText.trim()}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                <Send className="w-3 h-3" />
                {submittingComment ? 'Posting...' : 'Post'}
              </button>
            </div>
          </form>
        </SectionCard>

          </div>

        </div>
</div>
      
      {/* Edit Meeting Modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white/95 dark:bg-[#202c33]/95 backdrop-blur-3xl border border-black/5 dark:border-white/5 rounded-3xl p-8 max-w-md w-full shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            <h2 className="text-xl font-bold text-white dark:text-white mb-6">Edit Meeting</h2>
            <form onSubmit={handleEditMeeting} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/70 dark:text-muted-foreground mb-2 uppercase tracking-wider">Meeting Title *</label>
                <input
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-black/20 border border-black/5 dark:border-white/5 text-white dark:text-white text-sm focus:outline-none focus:border-primary/50 transition-all shadow-[0_2px_10px_rgba(0,0,0,0.04)]"
                  required
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-white/70 dark:text-muted-foreground mb-2 uppercase tracking-wider">Visibility</label>
                  <select
                    value={editVisibility}
                    onChange={e => setEditVisibility(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-black/20 border border-black/5 dark:border-white/5 text-white dark:text-white text-sm focus:outline-none focus:border-primary/50 transition-all shadow-sm"
                  >
                    <option value="internal">Internal (Company Only)</option>
                    <option value="external">External (Anyone with link)</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-white/70 dark:text-muted-foreground mb-2 uppercase tracking-wider">Access Lock</label>
                  <select
                    value={editLockType}
                    onChange={e => setEditLockType(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-black/20 border border-black/5 dark:border-white/5 text-white dark:text-white text-sm focus:outline-none focus:border-primary/50 transition-all shadow-sm"
                  >
                    <option value="none">Unlocked</option>
                    <option value="manual">Locked (Only Me)</option>
                    <option value="scheduled">Scheduled Release</option>
                  </select>
                </div>
              </div>
              {editLockType === 'scheduled' && (
                <div className="flex gap-4 p-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200 dark:border-amber-500/20">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-amber-800 dark:text-amber-500 mb-1">Unlock Date</label>
                    <input type="date" value={editUnlockDate} onChange={e => setEditUnlockDate(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm bg-[#006065] text-white dark:bg-black/50 text-white dark:text-white border border-amber-200/50" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-amber-800 dark:text-amber-500 mb-1">Unlock Time</label>
                    <input type="time" value={editUnlockTime} onChange={e => setEditUnlockTime(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm bg-[#006065] text-white dark:bg-black/50 text-white dark:text-white border border-amber-200/50" />
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowEdit(false)} className="flex-1 py-3 rounded-xl bg-white/50 dark:bg-black/20 hover:bg-black/5 dark:hover:bg-white/5 text-white/90 dark:text-foreground font-semibold text-sm transition-all border border-black/5 dark:border-white/5 shadow-sm">Cancel</button>
                <button type="submit" disabled={savingEdit} className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm transition-all shadow-md disabled:opacity-60">
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

          </div>
  );
}

