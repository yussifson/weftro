import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import {
  ArrowLeft, Send, Play, Pause, Volume2, VolumeX,
  Maximize2, Share2, Check, Sparkles, MessageSquare, Eye, MoreHorizontal, PictureInPicture, RotateCcw, RotateCw, Edit3, Trash2
} from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import ClipadLoader from '@/components/ui/ClipadLoader';
import VideoDownloadModal from '@/components/clipad/VideoDownloadModal';
import { Download } from 'lucide-react';
import DictationButton from '@/components/ui/DictationButton';
import LockWall from '@/components/clipad/LockWall';

const EMOJIS = ['👍', '❤️', '🔥', '😂', '🎉', '🤯'];

function formatTime(s) {
  if (!s && s !== 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function FloatingReaction({ emoji, x, y, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div
      className="absolute pointer-events-none text-2xl z-50 animate-bounce"
      style={{ left: x, top: y, animation: 'floatUp 2.5s ease-out forwards' }}
    >
      {emoji}
    </div>
  );
}

export default function WatchVideo() {
  const { id: videoId } = useParams();
  const { user, isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const playerRef = useRef(null);

  const [video, setVideo] = useState(null);
  const [comments, setComments] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(null); // { type: 'manual'|'scheduled'|'private', unlockAt? }
  const [commentText, setCommentText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const playPromiseRef = useRef(null);

  const getVideoColor = (id) => {
    const colors = [
      'linear-gradient(to bottom right, #3b82f6, #1d4ed8)',
      'linear-gradient(to bottom right, #00beac, #4338ca)',
      'linear-gradient(to bottom right, #a855f7, #7e22ce)',
      'linear-gradient(to bottom right, #d946ef, #a21caf)',
      'linear-gradient(to bottom right, #f43f5e, #be123c)',
      'linear-gradient(to bottom right, #f97316, #c2410c)',
      'linear-gradient(to bottom right, #10b981, #047857)',
      'linear-gradient(to bottom right, #06b6d4, #0e7490)',
    ];
    if (!id) return colors[0];
    const charCodeSum = String(id).split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return colors[charCodeSum % colors.length];
  };
  const [floatingReactions, setFloatingReactions] = useState([]);
  const [activeCommentFilter, setActiveCommentFilter] = useState('all'); // 'all' | 'comments' | 'reactions'
  const [views, setViews] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showEdit, setShowEdit] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editVisibility, setEditVisibility] = useState('internal');
  const [editLockType, setEditLockType] = useState('none');
  const [editUnlockDate, setEditUnlockDate] = useState('');
  const [editUnlockTime, setEditUnlockTime] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [blobUrl, setBlobUrl] = useState(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  const lastReactionTime = useRef(-1);
  const viewTracked = useRef(false);

  useEffect(() => {
    if (videoId && user && !viewTracked.current) {
      viewTracked.current = true;
      supabase.from('clipad_video_views').insert({ video_id: videoId, viewer_id: user.id }).select().then(() => {
        // Refresh view count after inserting
        supabase.from('clipad_video_views').select('id', { count: 'exact', head: true }).eq('video_id', videoId).then(({ count }) => {
          setViews(count || 0);
        });
      }).catch(err => console.error(err));
    }
  }, [videoId, user]);

  useEffect(() => {
    fetchAll();

    if (isLoadingAuth) return;
    const channel = supabase.channel(`video_${videoId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'clipad_video_comments', filter: `video_id=eq.${videoId}` }, payload => {
        // Refetch to get nested relations like author
        fetchAll();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'clipad_video_reactions', filter: `video_id=eq.${videoId}` }, payload => {
        setReactions(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => { 
      supabase.removeChannel(channel); 
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [videoId]);

  const fetchAll = async () => {
    if (isLoadingAuth) return;
    if (!video) setLoading(true);
    try {
      const [videoRes, commentsRes, reactionsRes] = await Promise.all([
        supabase.from('clipad_videos').select('*, creator:creator_id(full_name, avatar_url)').eq('id', videoId).single(),
        supabase.from('clipad_video_comments').select('*').eq('video_id', videoId).order('timestamp_seconds', { ascending: true }),
        supabase.from('clipad_video_reactions').select('*').eq('video_id', videoId),
      ]);
      if (videoRes.data) {
        setVideo(videoRes.data);
        setEditTitle(videoRes.data.title || '');
        setEditDesc(videoRes.data.description || '');
        setEditVisibility(videoRes.data.visibility || 'internal');
        if (videoRes.data.unlock_at) {
          setEditLockType('scheduled');
          const d = new Date(videoRes.data.unlock_at);
          setEditUnlockDate(d.toISOString().split('T')[0]);
          setEditUnlockTime(d.toTimeString().slice(0, 5));
        } else if (videoRes.data.is_locked) {
          setEditLockType('manual');
        } else {
          setEditLockType('none');
        }
        
        // We stream directly from the storage URL for performance and range requests.

        // --- ACCESS CONTROL LOGIC ---
        const v = videoRes.data;
        const isCreator = user && v.creator_id === user.id;
        
        // 1. Check Locks FIRST
        if (!isCreator) {
          if (v.unlock_at && new Date(v.unlock_at) > new Date()) {
            setAccessDenied({ type: 'scheduled', unlockAt: v.unlock_at });
            setLoading(false);
            return;
          } else if (v.is_locked) {
            setAccessDenied({ type: 'manual' });
            setLoading(false);
            return;
          }
        }

        const isExternal = v.visibility === 'external' || v.visibility === 'public';

        if (!isExternal) {
          // 0. Ensure user is logged in and belongs to the same company
          if (!user) {
            setAccessDenied({ type: 'private' }); // or a custom 'auth_required' type
            setLoading(false);
            return;
          }
          if (v.company_id && user.company_id && v.company_id !== user.company_id) {
            setAccessDenied({ type: 'private' });
            setLoading(false);
            return;
          }

          // 1. Check Space Privacy
          const isAdminUser = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'company_admin';
          if (v.space_id && !isCreator && !isAdminUser) {
            const { data: space } = await supabase.from('clipad_spaces').select('is_private').eq('id', v.space_id).single();
            if (space?.is_private) {
              const { data: member } = await supabase.from('clipad_space_members').select('id').eq('space_id', v.space_id).eq('user_id', user?.id || '').single();
              if (!member) {
                setAccessDenied({ type: 'private' });
                setLoading(false);
                return;
              }
            }
          }
        }
      }
      
      let finalComments = commentsRes.data || [];
      let finalReactions = reactionsRes.data || [];
      
      // Fetch profiles manually to bypass missing schema relation
      const userIds = [...new Set([...finalComments.map(c => c.user_id), ...finalReactions.map(r => r.user_id)])].filter(Boolean);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds);
        const profileMap = (profiles || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
        finalComments = finalComments.map(c => ({ ...c, author: profileMap[c.user_id] }));
        finalReactions = finalReactions.map(r => ({ ...r, author: profileMap[r.user_id] }));
      }
      
      setComments(finalComments);
      setReactions(finalReactions);

      // Get initial view count without logging
      const { count } = await supabase.from('clipad_video_views').select('id', { count: 'exact', head: true }).eq('video_id', videoId);
      if (!viewTracked.current) {
        setViews(count || 0);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };


  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current && !isScrubbing) {
      const ct = videoRef.current.currentTime;
      setCurrentTime(ct);
      
      const dur = videoRef.current.duration;
      if (dur && dur !== Infinity && !isNaN(dur) && dur !== duration) {
        setDuration(dur);
      }
      
      const sec = Math.floor(ct);
      if (sec !== lastReactionTime.current && playing) {
        lastReactionTime.current = sec;
        const currentReactions = reactions.filter(r => r.timestamp_seconds === sec);
        if (currentReactions.length > 0) {
          currentReactions.forEach((r, idx) => {
            setTimeout(() => {
              const x = Math.random() * 60 + 20;
              const y = Math.random() * 40 + 30;
              setFloatingReactions(prev => [...prev, { id: `${Date.now()}-${idx}`, emoji: r.emoji, x: `${x}%`, y: `${y}%` }]);
            }, idx * 150);
          });
        }
      }
    }
  }, [reactions, playing, duration, isScrubbing]);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      if (dur && dur !== Infinity && !isNaN(dur)) {
        setDuration(dur);
      }
    }
  }, []);

  const seekTo = (t, shouldResume = true) => {
    const v = videoRef.current;
    if (!v) return;
    const target = Math.max(0, Number(t) || 0);
    v.currentTime = target;
    setCurrentTime(target);

    if (shouldResume) {
      const p = v.play();
      if (p !== undefined) {
        p.then(() => {
          setPlaying(true);
          setHasStartedPlaying(true);
        }).catch(() => {
          // Playback auto-abort or interrupted
        });
      }
    }
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      const p = v.play();
      if (p !== undefined) {
        p.then(() => {
          setPlaying(true);
          setHasStartedPlaying(true);
        }).catch((err) => {
          console.warn('Playback resume handled:', err);
        });
      }
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const handleEditVideo = async (e) => {
    e.preventDefault();
    if (!editTitle.trim()) return;
    setSavingEdit(true);

    let finalUnlockAt = null;
    let finalIsLocked = false;
    if (editLockType === 'manual') finalIsLocked = true;
    else if (editLockType === 'scheduled') {
      if (!editUnlockDate || !editUnlockTime) {
        alert("Please set unlock date and time");
        setSavingEdit(false);
        return;
      }
      finalIsLocked = true;
      finalUnlockAt = new Date(`${editUnlockDate}T${editUnlockTime}`).toISOString();
    }

    try {
      const { data, error } = await supabase.from('clipad_videos').update({
        title: editTitle.trim(),
        description: editDesc.trim() || null,
        visibility: editVisibility,
        is_locked: finalIsLocked,
        unlock_at: finalUnlockAt,
      }).eq('id', videoId).select('*, creator:creator_id(full_name, avatar_url)').single();
      if (error) throw error;
      setVideo(data);
      setShowEdit(false);
    } catch (err) { console.error(err); }
    finally { setSavingEdit(false); }
  };

  const handleDeleteVideo = async () => {
    if (!window.confirm('Are you sure you want to delete this video? This cannot be undone.')) return;
    try {
      await supabase.from('clipad_videos').delete().eq('id', videoId);
      navigate(video.space_id ? `/spaces/${video.space_id}` : '/dashboard');
    } catch (err) { console.error(err); }
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'company_admin';
  const canEdit = video?.creator_id === user?.id || isAdmin;

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !muted;
    setMuted(!muted);
  };

  const toggleFullScreen = () => {
    if (!playerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(err => console.error(err));
    } else {
      playerRef.current.requestFullscreen().catch(err => console.error(err));
    }
  };

  const changeSpeed = (rate) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const skip = (amount) => {
    if (!videoRef.current) return;
    const dur = videoRef.current.duration && videoRef.current.duration !== Infinity && !isNaN(videoRef.current.duration) 
      ? videoRef.current.duration 
      : 999999;
    const newTime = Math.max(0, Math.min(dur, videoRef.current.currentTime + amount));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const togglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.error('PiP failed', err);
    }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !user) return;
    setSubmitting(true);
    try {
      const ts = videoRef.current ? Math.floor(videoRef.current.currentTime) : 0;
      const contentToSave = isAnonymous ? `[ANON]${commentText.trim()}` : commentText.trim();
      const { data, error } = await supabase.from('clipad_video_comments').insert({
        video_id: videoId,
        user_id: user.id,
        content: contentToSave,
        timestamp_seconds: ts,
      }).select('*').single();
      if (error) throw error;
      
      // Add author manually to state
      const commentWithAuthor = { ...data, author: { full_name: user.full_name, avatar_url: user.avatar_url } };
      setComments(prev => [...prev, commentWithAuthor].sort((a,b) => a.timestamp_seconds - b.timestamp_seconds));
      setCommentText('');
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  };

  const addReaction = async (emoji) => {
    if (!user) return;
    const ts = videoRef.current ? Math.floor(videoRef.current.currentTime) : 0;
    // Show floating reaction
    const x = Math.random() * 60 + 20;
    const y = Math.random() * 40 + 30;
    const id = Date.now();
    setFloatingReactions(prev => [...prev, { id, emoji, x: `${x}%`, y: `${y}%` }]);
    // Save to DB
    try {
      const emojiToSave = isAnonymous ? `[ANON]${emoji}` : emoji;
      await supabase.from('clipad_video_reactions').insert({ video_id: videoId, user_id: user.id, emoji: emojiToSave, timestamp_seconds: ts });
      // Realtime subscription will handle updating the state and showing it for everyone else!
      setReactions(prev => [...prev, { emoji: emojiToSave, timestamp_seconds: ts, user_id: user.id, author: { full_name: user.full_name, avatar_url: user.avatar_url } }]);
    } catch (err) { console.error(err); }
  };

  const removeFloatingReaction = useCallback((id) => {
    setFloatingReactions(prev => prev.filter(r => r.id !== id));
  }, []);

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Get reactions at current timestamp (within 5s window)
  const nearbyReactions = reactions.filter(r => Math.abs(r.timestamp_seconds - currentTime) < 5);

  if (loading || isLoadingAuth) {
    return <ClipadLoader fullScreen text="Loading video..." />;
  }

  if (accessDenied) {
return <LockWall type={accessDenied.type} unlockAt={accessDenied.unlockAt || null} title={video?.title || 'this video'} />;
  }

  if (!video) {
    return <LockWall type="not-found" />;
  }

  return (
    <>
      <style>{`
        @keyframes floatUp {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-80px) scale(1.4); }
        }
      `}</style>

      <div style={{ fontFamily: "'Inter', sans-serif" }} className="min-h-full bg-slate-50 dark:bg-background text-slate-900 dark:text-slate-100 page-enter overflow-x-hidden pb-24 md:pb-8">

        <VideoDownloadModal 
          open={showDownloadModal} 
          onOpenChange={setShowDownloadModal} 
          videoId={video.id} 
          videoUrl={video.video_url}
          videoTitle={video.title}
          spaceId={video.space_id}
        />

        {/* YouTube-style: full-width video on mobile, centered container on desktop */}
        <div className="w-full max-w-[1440px] mx-auto md:px-6 md:py-4">
          {/* Top subtle navigation bar (Back button) */}
          <div className="flex items-center justify-between pb-3 px-4 md:px-0">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-200/70 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-foreground text-xs font-semibold transition-all hover:scale-105 active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-muted-foreground flex items-center gap-1 font-medium">
                <Eye className="w-3.5 h-3.5" /> {views} views
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column (2 cols): Video Stage & Metadata */}
            <div className="lg:col-span-2 space-y-4">
              {/* Video Player — YouTube 16:9 Cinema Container */}
              <div
                ref={playerRef}
                className="relative overflow-hidden bg-black aspect-video group w-full rounded-none md:rounded-2xl shadow-2xl border border-black/10 dark:border-white/5"
              >
                <video
                  ref={videoRef}
                  src={video.video_url}
                  className="w-full h-full object-contain"
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onDurationChange={handleLoadedMetadata}
                  onPlay={() => { setPlaying(true); setHasStartedPlaying(true); }}
                  onPlaying={() => { setPlaying(true); setHasStartedPlaying(true); }}
                  onPause={() => setPlaying(false)}
                  onEnded={() => setPlaying(false)}
                  controlsList="nodownload"
                  onContextMenu={(e) => e.preventDefault()}
                  disablePictureInPicture={false}
                />

                {/* Custom Thumbnail Overlay */}
                {!hasStartedPlaying && (
                  <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black cursor-pointer" onClick={togglePlay}>
                    {video?.thumbnail_url ? (
                      <img src={video.thumbnail_url} className="absolute inset-0 w-full h-full object-cover opacity-80" alt="Video Thumbnail" />
                    ) : (
                      <div className="absolute inset-0 w-full h-full opacity-90" style={{ background: getVideoColor(video?.id) }} />
                    )}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shadow-2xl z-20 hover:scale-110 transition-transform">
                      <Play className="w-8 h-8 sm:w-10 sm:h-10 text-white fill-white ml-1.5" />
                    </div>
                    <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-md text-white text-xs font-mono font-medium px-2 py-1 rounded-md z-20 shadow-md">
                      {video?.duration_seconds ? formatTime(video.duration_seconds) : formatTime(duration)}
                    </div>
                  </div>
                )}

                {/* Floating reactions overlay */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
                  {floatingReactions.map(r => (
                    <FloatingReaction key={r.id} emoji={r.emoji} x={r.x} y={r.y} onDone={() => removeFloatingReaction(r.id)} />
                  ))}
                </div>

                {/* Click to play/pause on video surface */}
                <div className="absolute inset-0 bottom-16 cursor-pointer z-10" onClick={togglePlay} />

                {/* Controls overlay */}
                <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30 pointer-events-none">
                  {/* Progress bar */}
                  <div className="px-4 mb-2 pointer-events-auto">
                    {/* Comment markers on timeline */}
                    <div className="relative h-1 mb-1">
                      {comments.map(c => {
                        const dur = duration && duration !== Infinity && !isNaN(duration) ? duration : (video?.duration_seconds || 1);
                        return (
                          <button
                            key={c.id}
                            onClick={() => seekTo(c.timestamp_seconds, true)}
                            title={c.body}
                            className="absolute top-0 w-2 h-2 -mt-0.5 rounded-full bg-indigo-400 hover:scale-150 transition-transform shadow-sm"
                            style={{ left: `${(c.timestamp_seconds / dur) * 100}%` }}
                          />
                        );
                      })}
                    </div>
                    <input
                      type="range"
                      min={0}
                      step="any"
                      max={duration && duration !== Infinity && !isNaN(duration) ? duration : (video?.duration_seconds || Math.max(100, currentTime))}
                      value={currentTime}
                      onPointerDown={() => setIsScrubbing(true)}
                      onPointerUp={(e) => {
                        setIsScrubbing(false);
                        seekTo(Number(e.currentTarget.value), true);
                      }}
                      onInput={(e) => {
                        const val = Number(e.target.value);
                        setCurrentTime(val);
                        if (videoRef.current) {
                          videoRef.current.currentTime = val;
                        }
                      }}
                      onChange={(e) => {
                        seekTo(Number(e.target.value), true);
                      }}
                      onClick={e => e.stopPropagation()}
                      className="w-full h-1.5 rounded-full accent-emerald-500 cursor-pointer bg-white/20 hover:h-2 transition-all"
                    />
                  </div>

                  <div className="flex items-center gap-4 px-4 pb-4 pointer-events-auto">
                    <button onClick={togglePlay} className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/30 hover:scale-105 transition-all shadow-lg border border-white/10">
                      {playing ? <Pause className="w-4 h-4 text-white" fill="currentColor" /> : <Play className="w-4 h-4 text-white ml-0.5" fill="currentColor" />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); skip(-10); }} className="text-white/80 hover:text-white transition-colors" title="Backward 10s">
                      <RotateCcw className="w-5 h-5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); skip(10); }} className="text-white/80 hover:text-white transition-colors" title="Forward 10s">
                      <RotateCw className="w-5 h-5" />
                    </button>
                    <button onClick={toggleMute} className="text-white/80 hover:text-white transition-colors ml-2">
                      {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                    <span className="text-white/90 text-sm font-mono font-medium ml-2">
                      {formatTime(currentTime)} / {formatTime(duration && duration !== Infinity && !isNaN(duration) ? duration : video?.duration_seconds)}
                    </span>
                    <div className="flex-1" />
                    {/* Emoji reaction bar in controls */}
                    <div className="hidden sm:flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                      {EMOJIS.map(e => (
                        <button key={e} onClick={(evt) => { evt.stopPropagation(); addReaction(e); }} className="text-lg hover:scale-125 transition-transform active:scale-150">{e}</button>
                      ))}
                    </div>
                    <div className="hidden sm:block w-px h-5 bg-white/20 mx-2" />
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="text-white/90 hover:text-white transition-colors text-sm font-bold bg-white/10 hover:bg-white/20 px-2 py-1 rounded-md" title="Playback Speed">
                          {playbackRate}x
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-24 bg-white/10 backdrop-blur-xl border-white/10 text-white" align="end">
                        {[0.5, 1, 1.25, 1.5, 2].map(rate => (
                          <DropdownMenuItem key={rate} onClick={() => changeSpeed(rate)} className="hover:bg-white/20 cursor-pointer text-sm">
                            {rate}x
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <button onClick={(e) => { e.stopPropagation(); togglePiP(); }} className="text-white/80 hover:text-white transition-colors" title="Picture-in-Picture">
                      <PictureInPicture className="w-5 h-5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); toggleFullScreen(); }} className="text-white/80 hover:text-white transition-colors" title="Full Screen">
                      <Maximize2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Video Title & Actions (Exact YouTube Placement) */}
              <div className="px-4 md:px-0 space-y-3">
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-foreground leading-snug">
                  {video.title || 'Untitled Recording'}
                </h1>

                <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-border/60">
                  {/* Creator Info */}
                  <div className="flex items-center gap-3">
                    <img
                      src={video.creator?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${video.creator?.full_name}`}
                      className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 object-cover ring-2 ring-primary/20"
                      alt="Creator"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900 dark:text-foreground">
                        {video.creator?.full_name || 'Anonymous User'}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-muted-foreground">
                        Published {new Date(video.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  {/* YouTube-style Action Pill Buttons */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
                    {/* Reactions / Like Pills */}
                    <div className="flex items-center bg-slate-100 dark:bg-white/10 rounded-full px-1.5 py-1 shrink-0 border border-slate-200/60 dark:border-white/5">
                      {EMOJIS.slice(0, 4).map(e => {
                        const count = reactions.filter(r => {
                          const cleanEmoji = r.emoji?.startsWith('[ANON]') ? r.emoji.slice(6) : r.emoji;
                          return cleanEmoji === e;
                        }).length;
                        return (
                          <button
                            key={e}
                            onClick={() => addReaction(e)}
                            className="flex items-center gap-1 px-2.5 py-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-colors text-xs font-semibold"
                          >
                            <span className="text-base leading-none">{e}</span>
                            {count > 0 && <span className="text-slate-700 dark:text-foreground/80">{count}</span>}
                          </button>
                        );
                      })}
                    </div>

                    {/* Share Button */}
                    <button
                      onClick={copyShareLink}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 transition-all text-xs font-semibold text-slate-900 dark:text-foreground shrink-0 border border-slate-200/60 dark:border-white/5 active:scale-95"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied!' : 'Share'}</span>
                    </button>

                    {/* Download Button */}
                    <button
                      onClick={() => setShowDownloadModal(true)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 transition-all text-xs font-semibold text-slate-900 dark:text-foreground shrink-0 border border-slate-200/60 dark:border-white/5 active:scale-95"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>

                    {/* Edit/More Dropdown */}
                    {canEdit && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 transition-all text-slate-900 dark:text-foreground shrink-0 border border-slate-200/60 dark:border-white/5">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 rounded-xl shadow-xl">
                          <DropdownMenuItem onClick={() => setShowEdit(true)} className="cursor-pointer gap-2 text-xs">
                            <Edit3 className="w-4 h-4" /> Edit Video Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleDeleteVideo} className="cursor-pointer gap-2 text-xs text-rose-500 focus:text-rose-500">
                            <Trash2 className="w-4 h-4" /> Delete Video
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>

                {/* Description Box (YouTube-style Gray Card) */}
                <div className="p-4 rounded-xl bg-slate-100/90 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-sm space-y-2">
                  <div className="flex items-center gap-3 text-xs font-semibold text-slate-600 dark:text-muted-foreground">
                    <span>{views} views</span>
                    <span>•</span>
                    <span>{new Date(video.created_at).toLocaleDateString()}</span>
                    {video.visibility && (
                      <>
                        <span>•</span>
                        <span className="capitalize px-2 py-0.5 rounded-md bg-slate-200 dark:bg-white/10 text-[10px] tracking-wide uppercase font-bold">
                          {video.visibility}
                        </span>
                      </>
                    )}
                  </div>
                  {video.description ? (
                    <p className="text-slate-800 dark:text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">
                      {video.description}
                    </p>
                  ) : (
                    <p className="text-slate-400 dark:text-muted-foreground text-xs italic">
                      No description provided.
                    </p>
                  )}
                </div>

                {/* AI Summary Section */}
                {(() => {
                  if (!video.ai_summary) return null;
                  let summaryData;
                  try { summaryData = JSON.parse(video.ai_summary); }
                  catch { summaryData = { summary: video.ai_summary }; }
                  return (
                    <div className="p-5 rounded-xl bg-indigo-50/70 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 shadow-sm mt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                          <Sparkles className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">AI Executive Brief</span>
                      </div>
                      
                      <div className="space-y-4">
                        {summaryData.summary && (
                          <div>
                            <h4 className="text-xs font-semibold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-1">Overview</h4>
                            <p className="text-sm text-slate-800 dark:text-foreground leading-relaxed">{summaryData.summary}</p>
                          </div>
                        )}
                        
                        {summaryData.decisions?.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-1">Key Decisions</h4>
                            <ul className="list-disc pl-5 space-y-1 text-sm text-slate-800 dark:text-foreground">
                              {summaryData.decisions.map((d, i) => <li key={i}>{d}</li>)}
                            </ul>
                          </div>
                        )}

                        {summaryData.actionItems?.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-1">Action Items</h4>
                            <div className="space-y-1.5">
                              {summaryData.actionItems.map((a, i) => (
                                <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white dark:bg-card border border-slate-200/80 dark:border-border/80">
                                  <div className="w-4 h-4 rounded-full border-2 border-primary/40 shrink-0 mt-0.5" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-slate-900 dark:text-foreground">{a.task}</p>
                                    <p className="text-[11px] text-slate-500 dark:text-muted-foreground">Assignee: {a.assignee} {a.deadline && `• Due: ${a.deadline}`}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Right Column (1 col): YouTube-style Comments & Live Timeline Reactions Sidebar */}
            <div className="lg:col-span-1 flex flex-col gap-4 px-4 md:px-0">
              <div className="p-4 rounded-xl bg-white dark:bg-card border border-slate-200/80 dark:border-border shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-border/60">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-foreground flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    <span>Comments ({comments.length})</span>
                  </h3>
                  <span className="text-xs font-mono text-primary font-semibold">
                    @{formatTime(currentTime)}
                  </span>
                </div>

                {/* Filter tabs */}
                <div className="flex gap-1 p-1 bg-slate-100 dark:bg-white/5 rounded-lg border border-slate-200/60 dark:border-white/5">
                  {[['all','All'],['comments','Comments'],['reactions','Reactions']].map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setActiveCommentFilter(val)}
                      className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${activeCommentFilter === val ? 'bg-white dark:bg-card text-slate-900 dark:text-foreground shadow-xs' : 'text-slate-500 dark:text-muted-foreground hover:text-slate-800 dark:hover:text-foreground'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Comment input form */}
                {user && (
                  <form onSubmit={submitComment} className="space-y-2">
                    <div className="relative">
                      <input
                        value={commentText}
                        onChange={e => setCommentText(e.target.value)}
                        placeholder={`Comment at ${formatTime(currentTime)}…`}
                        className="w-full pl-3.5 pr-14 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-foreground text-xs placeholder-slate-400 dark:placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs transition-all"
                      />
                      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <DictationButton onResult={txt => setCommentText(prev => (prev + ' ' + txt).trim())} isRecording={isRecording} setIsRecording={setIsRecording} />
                        <button type="submit" disabled={submitting || !commentText.trim()} className="p-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg disabled:opacity-50 transition-colors shadow-xs">
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-end px-1">
                      <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-muted-foreground cursor-pointer hover:text-slate-700 dark:hover:text-foreground">
                        <input type="checkbox" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)} className="rounded text-primary focus:ring-primary w-3 h-3" />
                        Post Anonymously
                      </label>
                    </div>
                  </form>
                )}

                {/* Comments Scrollable Stream */}
                <div className="overflow-y-auto space-y-2.5 max-h-[500px] pr-1">
                  {(activeCommentFilter === 'all' || activeCommentFilter === 'reactions') && reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5">
                      {EMOJIS.map(e => {
                        const count = reactions.filter(r => {
                          const cleanEmoji = r.emoji?.startsWith('[ANON]') ? r.emoji.slice(6) : r.emoji;
                          return cleanEmoji === e;
                        }).length;
                        if (!count) return null;
                        return (
                          <button key={e} onClick={() => addReaction(e)} className="flex items-center gap-1 px-2 py-1 rounded-md bg-white dark:bg-card hover:bg-slate-100 text-xs font-medium shadow-xs border border-slate-200/60 dark:border-white/5">
                            {e} <span className="text-[10px] text-slate-500">{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {(activeCommentFilter === 'all' || activeCommentFilter === 'comments') && (
                    comments.length === 0 ? (
                      <div className="py-10 text-center rounded-xl border border-dashed border-slate-200 dark:border-white/10">
                        <MessageSquare className="w-8 h-8 text-slate-300 dark:text-muted-foreground mx-auto mb-2" />
                        <p className="text-xs text-slate-500 dark:text-muted-foreground px-4">
                          No comments yet. Pause anywhere and leave a timestamped note.
                        </p>
                      </div>
                    ) : (
                      comments.map(c => {
                        const isAnon = c.content?.startsWith('[ANON]');
                        const cleanContent = isAnon ? c.content.slice(6) : c.content;
                        return (
                          <div key={c.id} className="flex gap-2.5 p-2.5 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 hover:border-primary/40 transition-all">
                            {isAnon ? (
                              <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                                <span className="text-[10px] font-bold text-slate-600 dark:text-muted-foreground">?</span>
                              </div>
                            ) : (
                              <img
                                src={c.author?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${c.author?.full_name || 'U'}`}
                                className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0 object-cover"
                                alt="Author"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-xs font-bold text-slate-900 dark:text-foreground truncate">
                                  {isAnon ? 'Anonymous' : (c.author?.full_name || 'User')}
                                </span>
                                <button
                                  onClick={() => seekTo(c.timestamp_seconds)}
                                  className="text-[10px] font-mono font-bold text-primary hover:underline bg-primary/10 px-1.5 py-0.2 rounded"
                                >
                                  {formatTime(c.timestamp_seconds)}
                                </button>
                              </div>
                              <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug">{cleanContent}</p>
                            </div>
                          </div>
                        );
                      })
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Edit Video Modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white/95 dark:bg-[#202c33]/95 backdrop-blur-3xl border border-black/5 dark:border-white/5 rounded-3xl p-8 max-w-md w-full shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            <h2 className="text-xl font-bold text-white dark:text-foreground mb-6">Edit Video</h2>
            <form onSubmit={handleEditVideo} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-muted-foreground mb-2 uppercase tracking-wider">Video Title *</label>
                <input
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-black/20 border border-black/5 dark:border-white/5 text-white dark:text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all shadow-[0_2px_10px_rgba(0,0,0,0.04)]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-muted-foreground mb-2 uppercase tracking-wider">Description</label>
                <textarea
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-black/20 border border-black/5 dark:border-white/5 text-white dark:text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all resize-none shadow-[0_2px_10px_rgba(0,0,0,0.04)]"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-muted-foreground mb-2 uppercase tracking-wider">Visibility</label>
                  <select
                    value={editVisibility}
                    onChange={e => setEditVisibility(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-black/20 border border-black/5 dark:border-white/5 text-white dark:text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all shadow-sm"
                  >
                    <option value="internal">Internal (Company Only)</option>
                    <option value="external">External (Anyone with link)</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-muted-foreground mb-2 uppercase tracking-wider">Access Lock</label>
                  <select
                    value={editLockType}
                    onChange={e => setEditLockType(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-black/20 border border-black/5 dark:border-white/5 text-white dark:text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all shadow-sm"
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
                    <input type="date" value={editUnlockDate} onChange={e => setEditUnlockDate(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm bg-white dark:bg-card text-slate-900 dark:text-foreground border border-slate-200 dark:border-border focus:ring-[#006065]" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-amber-800 dark:text-amber-500 mb-1">Unlock Time</label>
                    <input type="time" value={editUnlockTime} onChange={e => setEditUnlockTime(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm bg-white dark:bg-card text-slate-900 dark:text-foreground border border-slate-200 dark:border-border focus:ring-[#006065]" />
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowEdit(false)} className="flex-1 py-3 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-foreground border border-slate-200 dark:border-border font-semibold text-sm shadow-sm hover:bg-slate-50 dark:hover:bg-accent transition-colors">Cancel</button>
                <button type="submit" disabled={savingEdit} className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm transition-all shadow-md disabled:opacity-60">
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

            </div>
    </>
  );
}



