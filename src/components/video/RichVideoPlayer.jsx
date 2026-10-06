import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, Maximize2, PictureInPicture as PipIcon, Send, MessageSquare, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { supabase as db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { hasFeature } from '@/lib/clipadPricing';
import DictationButton from '@/components/ui/DictationButton';
import { Download } from 'lucide-react';
import VideoDownloadModal from '@/components/clipad/VideoDownloadModal';

const EMOJIS = ['ðŸ‘', 'ðŸ‘Ž', 'â¤ï¸', 'ðŸ˜‚', 'ðŸ”¥', 'ðŸŽ‰', 'ðŸ’¡', 'ðŸ¤”'];

function formatTime(seconds) {
  if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const FloatingReaction = ({ emoji, x, y, onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 2000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div
      className="absolute text-3xl z-50 pointer-events-none drop-shadow-xl select-none"
      style={{ left: `${x}%`, top: `${y}%`, animation: 'floatUp 2s cubic-bezier(0.1, 1, 0.2, 1) forwards' }}
    >
      {emoji}
    </div>
  );
};

export default function RichVideoPlayer({ videoUrl, recordType = 'video', entityId, initialVideoRecord }) {
  const { user } = useAuth();
  const [videoRecord, setVideoRecord] = useState(initialVideoRecord || null);
  const [comments, setComments] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [floatingReactions, setFloatingReactions] = useState([]);
  
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);

  const getVideoColor = (id) => {
    const colors = [
      'linear-gradient(to bottom right, #3b82f6, #1d4ed8)',
      'linear-gradient(to bottom right, #6366f1, #4338ca)',
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

  const [playbackRate, setPlaybackRate] = useState(1);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [activeTab, setActiveTab] = useState(recordType === 'meeting' ? 'transcript' : 'comments');
  const [transcripts, setTranscripts] = useState([]);
  const [blobUrl, setBlobUrl] = useState(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [chapters, setChapters] = useState([]);
  const [isGeneratingChapters, setIsGeneratingChapters] = useState(false);
  // â”€â”€ Missing refs and state declarations (critical fix) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const videoRef = useRef(null);
  const playerRef = useRef(null);

  const handleGenerateAiChapters = async () => {
    setIsGeneratingChapters(true);
    try {
      const { generateText } = await import('@/lib/cloudflareAI');
      const textContext = transcripts.length > 0
        ? transcripts.map(t => `[${formatTime(t.start_time)}] ${t.text}`).join('\n')
        : (videoRecord?.ai_summary || videoRecord?.title || 'Video meeting content');

      const response = await generateText([
        {
          role: 'system',
          content: `You are an AI video editor. Create 3-5 timestamped chapter markers for this video based on the text.
Return ONLY raw valid JSON array of objects with keys:
- "seconds": number (seconds from start, e.g. 0, 45, 120)
- "title": string chapter title (e.g. "Architecture Overview", "Blocker Discussion")
Do not wrap in markdown or backticks.`
        },
        { role: 'user', content: textContext }
      ]);

      let raw = typeof response === 'string' ? response : response?.response || '';
      raw = raw.replace(/```json/gi, '').replace(/```/gi, '').trim();
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setChapters(parsed);
      }
    } catch (e) {
      console.warn("Chapters generation error:", e);
    } finally {
      setIsGeneratingChapters(false);
    }
  };

  // 1. Fetch video record by URL
  useEffect(() => {
    if (!videoUrl) return;
    async function loadVideo() {
      // If we already passed it in, don't refetch from clipad_videos (which breaks for meetings)
      if (initialVideoRecord) {
        setVideoRecord(initialVideoRecord);
        loadBlobUrl(initialVideoRecord.video_url);
        return;
      }
      
      const { data, error } = await db.from('clipad_videos').select('*').eq('video_url', videoUrl).maybeSingle();
      if (!error && data) {
        setVideoRecord(data);
        loadBlobUrl(data.video_url);
      }
    }
    
    async function loadBlobUrl(url) {
        // Secure playback: Fetch directly and convert to blob to hide public URL from DOM
        if (url) {
          try {
            const res = await fetch(url);
            if (res.ok) {
              const blob = await res.blob();
              setBlobUrl(URL.createObjectURL(blob));
            }
          } catch (err) {
            console.error("Failed to load secure video blob", err);
          }
        }
    }
    loadVideo();
  }, [videoUrl, initialVideoRecord]);

  // 2. Fetch comments and reactions for this video
  useEffect(() => {
    if (!videoRecord?.id && !entityId) return;

    async function loadData() {
      const cTable = recordType === 'meeting' ? 'clipad_meeting_comments' : 'clipad_video_comments';
      const rTable = recordType === 'meeting' ? 'clipad_meeting_reactions' : 'clipad_video_reactions';
      const fk = recordType === 'meeting' ? 'meeting_id' : 'video_id';
      const id = entityId || videoRecord.id;

      const queries = [
        db.from(cTable).select('*, author:profiles(full_name, avatar_url)').eq(fk, id).order('timestamp_seconds', { ascending: true }),
        db.from(rTable).select('*').eq(fk, id)
      ];
      
      if (recordType === 'meeting') {
        queries.push(db.from('clipad_transcripts').select('*').eq('meeting_id', id).order('start_time', { ascending: true }));
      }

      const results = await Promise.all(queries);
      if (results[0].data) setComments(results[0].data);
      if (results[1].data) setReactions(results[1].data);
      if (recordType === 'meeting' && results[2]?.data) setTranscripts(results[2].data);
    }
    loadData();

    // Setup realtime subscription
    const id = entityId || videoRecord?.id;
    if (!id) return;
    const commentTable = recordType === 'meeting' ? 'clipad_meeting_comments' : 'clipad_video_comments';
    const reactTable = recordType === 'meeting' ? 'clipad_meeting_reactions' : 'clipad_video_reactions';
    const fk = recordType === 'meeting' ? 'meeting_id' : 'video_id';

    const sub = db.channel(`video_${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: commentTable, filter: `${fk}=eq.${id}` }, (payload) => {
        loadData(); // Re-fetch to get author info
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: reactTable, filter: `${fk}=eq.${id}` }, (payload) => {
        setReactions(prev => [...prev, payload.new]);
        const x = 10 + Math.random() * 80;
        setFloatingReactions(prev => [...prev, { id: Date.now() + Math.random(), emoji: payload.new.emoji, x, y: 100 }]);
      })
      .subscribe();

    return () => { 
      db.removeChannel(sub); 
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [videoRecord?.id, entityId]);

  const handleTimeUpdate = () => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (playing) videoRef.current.pause();
      else videoRef.current.play();
      setPlaying(!playing);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !muted;
      setMuted(!muted);
    }
  };

  const skip = (amount) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.currentTime + amount, duration));
    }
  };

  const seekTo = (time) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      if (!playing) togglePlay();
    }
  };

  const changeSpeed = (rate) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      playerRef.current.requestFullscreen().catch(err => console.error(err));
    } else {
      document.exitFullscreen();
    }
  };

  const togglePiP = async () => {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else if (document.pictureInPictureEnabled && videoRef.current) {
      await videoRef.current.requestPictureInPicture();
    }
  };

  const handleExportTranscript = () => {
    let txt = 'Meeting Transcript\n\n';
    transcripts.forEach(t => {
      txt += `[${formatTime(t.start_time)}] ${t.speaker || 'Speaker'}: ${t.text}\n`;
    });
    const blob = new Blob([txt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transcript.txt';
    a.click();
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !user || (!videoRecord && !entityId)) return;
    setSubmitting(true);
    
    // Pause video when commenting
    if (playing) togglePlay();

    const id = entityId || videoRecord?.id;
    const commentTable = recordType === 'meeting' ? 'clipad_meeting_comments' : 'clipad_video_comments';
    const fk = recordType === 'meeting' ? 'meeting_id' : 'video_id';

    try {
      await db.from(commentTable).insert({
        [fk]: id,
        user_id: user.id,
        timestamp_seconds: currentTime,
        content: commentText.trim()
      });
      setCommentText('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const addReaction = async (emoji) => {
    if (!user || (!videoRecord && !entityId)) return;
    const x = 10 + Math.random() * 80;
    const y = 50 + Math.random() * 30;
    setFloatingReactions(prev => [...prev, { id: Date.now(), emoji, x, y }]);
    
    const id = entityId || videoRecord?.id;
    const rTable = recordType === 'meeting' ? 'clipad_meeting_reactions' : 'clipad_video_reactions';
    const fk = recordType === 'meeting' ? 'meeting_id' : 'video_id';

    try {
      await db.from(rTable).insert({
        [fk]: id,
        user_id: user.id,
        timestamp_seconds: currentTime,
        emoji
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <VideoDownloadModal 
        open={showDownloadModal} 
        onOpenChange={setShowDownloadModal} 
        videoId={videoRecord?.id} 
        videoUrl={videoRecord?.video_url || videoUrl}
        videoTitle={videoRecord?.title}
        spaceId={videoRecord?.space_id}
      />
      <div className={`grid grid-cols-1 ${sidebarOpen ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-6 mb-8 mt-4 transition-all duration-300`}>
      <style>{`
        @keyframes floatUp {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-80px) scale(1.4); }
        }
      `}</style>
      {/* Player (Left/Full) */}
      <div className={`${sidebarOpen ? "lg:col-span-2" : "w-full"} -mx-4 sm:mx-0`}>
        <div ref={playerRef} className="relative sm:rounded-2xl overflow-hidden bg-black aspect-video group shadow-xl border sm:border-white/10 border-transparent sm:border-solid">
          <video
            ref={videoRef}
            src={blobUrl || videoUrl}
            className="w-full h-full object-contain"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => { setPlaying(true); setHasStartedPlaying(true); }}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            controlsList="nodownload"
            onContextMenu={(e) => e.preventDefault()}
            disablePictureInPicture={false}
          />

          {/* Custom Thumbnail Overlay */}
          {!hasStartedPlaying && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black cursor-pointer" onClick={togglePlay}>
              {videoRecord?.thumbnail_url ? (
                <img src={videoRecord.thumbnail_url} className="absolute inset-0 w-full h-full object-cover opacity-80" alt="Video Thumbnail" />
              ) : (
                <div className="absolute inset-0 w-full h-full opacity-90" style={{ background: getVideoColor(videoRecord?.id || entityId) }} />
              )}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shadow-2xl z-20 hover:scale-110 transition-transform">
                <Play className="w-8 h-8 sm:w-10 sm:h-10 text-white fill-white ml-1.5" />
              </div>
              <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-md text-white text-xs font-mono font-medium px-2 py-1 rounded-md z-20 shadow-md">
                {videoRecord?.duration_seconds ? formatTime(videoRecord.duration_seconds) : formatTime(duration)}
              </div>
            </div>
          )}

          {/* Floating reactions */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
            {floatingReactions.map(r => (
              <FloatingReaction key={r.id} emoji={r.emoji} x={r.x} y={r.y} onDone={() => setFloatingReactions(p => p.filter(x => x.id !== r.id))} />
            ))}
          </div>

          <div className="absolute inset-0 cursor-pointer z-10" onClick={togglePlay} />

          {/* Controls */}
          <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30 pointer-events-none">
            <div className="px-4 mb-2 pointer-events-auto">
              <div className="relative h-1 mb-1">
                {comments.map(c => (
                  <button
                    key={c.id}
                    onClick={() => seekTo(c.timestamp_seconds)}
                    title={c.content}
                    className="absolute top-0 w-2 h-2 -mt-0.5 rounded-full bg-indigo-400 hover:scale-150 transition-transform shadow-sm"
                    style={{ left: `${(c.timestamp_seconds / (duration || 1)) * 100}%` }}
                  />
                ))}
              </div>
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={e => seekTo(Number(e.target.value))}
                onClick={e => e.stopPropagation()}
                className="w-full h-1.5 rounded-full accent-emerald-500 cursor-pointer bg-white/20 hover:h-2 transition-all"
              />
            </div>

            <div className="flex items-center gap-4 px-4 pb-4 pointer-events-auto">
              <button onClick={togglePlay} className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/30 hover:scale-105 transition-all shadow-lg border border-white/10">
                {playing ? <Pause className="w-4 h-4 text-white" fill="currentColor" /> : <Play className="w-4 h-4 text-white ml-0.5" fill="currentColor" />}
              </button>
              <button onClick={(e) => { e.stopPropagation(); skip(-10); }} className="text-white/80 hover:text-white transition-colors">
                <RotateCcw className="w-5 h-5" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); skip(10); }} className="text-white/80 hover:text-white transition-colors">
                <RotateCw className="w-5 h-5" />
              </button>
              <button onClick={toggleMute} className="text-white/80 hover:text-white transition-colors ml-2">
                {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <span className="text-white/90 text-sm font-mono font-medium ml-2">
                {formatTime(currentTime)} / {duration ? formatTime(duration) : '--:--'}
              </span>
              <div className="flex-1" />
              
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                {EMOJIS.map(e => (
                  <button key={e} onClick={(evt) => { evt.stopPropagation(); addReaction(e); }} className="text-lg hover:scale-125 transition-transform active:scale-150">{e}</button>
                ))}
              </div>
              
              <div className="w-px h-5 bg-white/20 mx-2" />
              
              <select 
                value={playbackRate} 
                onChange={e => changeSpeed(Number(e.target.value))}
                className="bg-transparent text-white text-sm font-bold border-none outline-none cursor-pointer"
              >
                <option value={0.5} className="text-black">0.5x</option>
                <option value={1} className="text-black">1x</option>
                <option value={1.25} className="text-black">1.25x</option>
                <option value={1.5} className="text-black">1.5x</option>
                <option value={2} className="text-black">2x</option>
              </select>

              <button onClick={(e) => { e.stopPropagation(); togglePiP(); }} className="text-white/80 hover:text-white transition-colors ml-2">
                <PipIcon className="w-5 h-5" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); toggleFullScreen(); }} className="text-white/80 hover:text-white transition-colors">
                <Maximize2 className="w-5 h-5" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setSidebarOpen(!sidebarOpen); }} className="text-white/80 hover:text-white transition-colors ml-2" title="Toggle Sidebar">
                {sidebarOpen ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar (Right) */}
      {sidebarOpen && (
      <div className="flex flex-col h-[500px] bg-slate-100 dark:bg-secondary/50 dark:bg-card/50 rounded-2xl border border-slate-200 dark:border-border p-4 animate-in slide-in-from-right-8 duration-300">
        
        {/* Tabs */}
        <div className="flex items-center gap-2 mb-4 bg-slate-200 dark:bg-accent/50 dark:bg-secondary/50 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('comments')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'comments' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-foreground' : 'text-slate-500 dark:text-muted-foreground hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Comments
          </button>
          {recordType === 'meeting' && hasFeature(user, 'hasAdvancedAI') && (
            <button 
              onClick={() => setActiveTab('transcript')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'transcript' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-foreground' : 'text-slate-500 dark:text-muted-foreground hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Transcript
            </button>
          )}
          <button 
            onClick={() => setActiveTab('chapters')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'chapters' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-foreground' : 'text-slate-500 dark:text-muted-foreground hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Chapters
          </button>
        </div>

        {activeTab === 'chapters' && (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <h5 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-muted-foreground">AI Chapters</h5>
              <button
                onClick={handleGenerateAiChapters}
                disabled={isGeneratingChapters}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold rounded-lg shadow-sm disabled:opacity-50"
              >
                {isGeneratingChapters ? 'Generating...' : 'AI Generate'}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {chapters.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-12">No chapters generated yet. Click AI Generate to analyze video markers.</p>
              ) : (
                chapters.map((ch, idx) => (
                  <button
                    key={idx}
                    onClick={() => seekTo(ch.seconds)}
                    className="w-full text-left p-3 rounded-xl bg-white dark:bg-secondary border border-slate-200 dark:border-border hover:border-purple-500 transition-all flex items-center justify-between group shadow-sm"
                  >
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-purple-600 transition-colors">{ch.title}</span>
                    <span className="text-[10px] font-mono font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-md">@{formatTime(ch.seconds)}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'comments' && (
          <>
            <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
              {comments.length === 0 ? (
                <div className="py-8 text-center">
                  <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-700 dark:text-foreground mx-auto mb-2" />
                  <p className="text-xs text-slate-500 dark:text-muted-foreground">No comments yet.</p>
                </div>
              ) : (
                comments.map(c => (
                  <div key={c.id} className="bg-white dark:bg-secondary p-3 rounded-xl shadow-sm border border-slate-200 dark:border-border">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-foreground">
                        {c.author?.full_name || 'User'}
                      </span>
                      <button
                        onClick={() => seekTo(c.timestamp_seconds)}
                        className="text-[10px] font-bold font-mono text-primary hover:text-primary/80 transition-colors bg-primary/10 px-2 py-0.5 rounded-md"
                      >
                        @{formatTime(c.timestamp_seconds)}
                      </button>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-foreground leading-snug">{c.content}</p>
                  </div>
                ))
              )}
            </div>

            {(videoRecord || entityId) ? (
              <form onSubmit={submitComment}>
                <div className="relative">
                  <input
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    placeholder={`Comment at ${formatTime(currentTime)}...`}
                    className="w-full pl-4 pr-24 py-3 rounded-xl bg-white dark:bg-background border border-slate-200 dark:border-border text-sm focus:outline-none focus:border-primary/50 shadow-sm transition-all"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <DictationButton onResult={txt => setCommentText(prev => (prev + ' ' + txt).trim())} isRecording={isRecording} setIsRecording={setIsRecording} />
                    <button type="submit" disabled={submitting || !commentText.trim()} className="p-2 bg-[#006065] dark:bg-[#131A2C] hover:bg-[#004e52] text-white rounded-lg disabled:opacity-50 transition-colors shadow-sm">
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <p className="text-xs text-slate-500 dark:text-muted-foreground text-center italic">Comments disabled.</p>
            )}
          </>
        )}

        {activeTab === 'transcript' && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
              {transcripts.length === 0 ? (
                <div className="py-8 text-center text-slate-500 dark:text-muted-foreground text-sm">Transcript not available.</div>
              ) : (
                transcripts.map((t, idx) => (
                  <div key={t.id || idx} className="group">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <span className="text-xs font-bold text-slate-700 dark:text-foreground">{t.speaker || 'Speaker'}</span>
                      <button onClick={() => seekTo(t.start_time)} className="text-[10px] text-slate-400 group-hover:text-primary transition-colors font-mono">
                        {formatTime(t.start_time)}
                      </button>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-muted-foreground leading-relaxed">{t.text}</p>
                  </div>
                ))
              )}
            </div>
            {transcripts.length > 0 && (
              <button 
                onClick={handleExportTranscript}
                className="w-full flex justify-center items-center gap-2 py-2.5 rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-secondary hover:bg-slate-50 dark:hover:bg-accent text-sm font-bold text-slate-700 dark:text-foreground transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" /> Export Transcript
              </button>
            )}
          </div>
        )}
      </div>
      )}
      </div>
    </>
  );
}

