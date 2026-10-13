import React, { useEffect, useState, useRef, useCallback } from 'react';
import DailyIframe from '@daily-co/daily-js';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation} from "react-i18next";
import { 
 DailyProvider, 
 useLocalSessionId, 
 useParticipantIds, 
 useVideoTrack, 
 useAudioTrack,
 useDaily,
 useDailyEvent,
 useScreenShare,
 useParticipant,
 useActiveSpeakerId,
 useWaitingParticipants
} from '@daily-co/daily-react';
import { Home, ArrowLeft, Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, MonitorUp, Sparkles, ExternalLink, MessageSquare, Send, UserPlus, Mail, Settings, Smile, PanelRightClose, PenTool, MoreHorizontal, Wifi, WifiOff, Users, Shield, Lock, Copy, Check, Sun, Moon } from 'lucide-react';
import { Button} from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { detectDecisions, detectCommitments, writeOrgEvent } from '@/lib/clipadIntelligence';
import { useToast} from "@/components/ui/use-toast";
import { OrbitLoader } from "@/components/ui/orbit-loader";
import ClipadLoader from "@/components/ui/ClipadLoader";
import { useTheme } from "@/lib/ThemeContext";
import CanvasWhiteboard from '@/components/clipad/CanvasWhiteboard';
import { CliPadLogo } from '@/components/ui/CliPadLogo';
import { supabase } from '@/api/supabaseClient';
import { logAuditEvent } from '@/lib/auditLogger';
import { useAuth } from '@/lib/AuthContext';
import { hasFeature, getLimit } from '@/lib/clipadPricing';
import { useCompanyPlan } from '@/hooks/useCompanyPlan';

// Export VIRTUAL_BACKGROUNDS so PreJoinScreen can use them
export const VIRTUAL_BACKGROUNDS = [
  { id: 'none', label: 'None', type: 'none' },
  { id: 'blur', label: 'Blur', type: 'background-blur' },
  { id: 'bg1', label: 'Modern Office', type: 'background-image', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=600&auto=format&fit=crop' },
  { id: 'bg2', label: 'Minimalist Room', type: 'background-image', url: 'https://images.unsplash.com/photo-1600607688969-a5bfcd64bd2b?q=80&w=600&auto=format&fit=crop' },
  { id: 'bg3', label: 'Cyberpunk City', type: 'background-image', url: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?q=80&w=600&auto=format&fit=crop' },
  { id: 'bg4', label: 'Orbit Space Station', type: 'background-image', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=600&auto=format&fit=crop' },
  { id: 'bg5', label: 'Luxury Library', type: 'background-image', url: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=600&auto=format&fit=crop' },
  { id: 'bg6', label: 'Mountain Retreat', type: 'background-image', url: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?q=80&w=600&auto=format&fit=crop' },
  { id: 'bg7', label: 'Neon Glow', type: 'background-image', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=600&auto=format&fit=crop' },
  { id: 'bg8', label: 'Abstract Fluid', type: 'background-image', url: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?q=80&w=600&auto=format&fit=crop' },
  { id: 'bg9', label: 'Geometric Design', type: 'background-image', url: 'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?q=80&w=600&auto=format&fit=crop' },
  { id: 'bg10', label: 'Cozy Cafe', type: 'background-image', url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=600&auto=format&fit=crop' },
  { id: 'bg11', label: 'Tech Server Room', type: 'background-image', url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=600&auto=format&fit=crop' },
  { id: 'bg12', label: 'Sunset Beach', type: 'background-image', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop' },
  { id: 'bg13', label: 'Zen Garden', type: 'background-image', url: 'https://images.unsplash.com/photo-1596700140228-568eb90956b9?q=80&w=600&auto=format&fit=crop' },
  { id: 'bg14', label: 'Skyscraper View', type: 'background-image', url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=600&auto=format&fit=crop' },
  { id: 'bg15', label: 'Deep Ocean', type: 'background-image', url: 'https://images.unsplash.com/photo-1551244072-5d12893278ab?q=80&w=600&auto=format&fit=crop' }
];

// Fix #17: EMOJIS constant outside component — avoids recreation on every render
const EMOJIS = ['👍', '❤️', '👏', '😂', '🎉', '🔥'];

function VideoRoomInner({ roomUrl, onLeave, isPipMode, togglePipMode, initialBackground, spaceId, initialAudio = true, initialVideo = true }) {
  const navigate = useNavigate();
  const { t} = useTranslation();
  const { user } = useAuth();
  
  // Force Vite to retain supabase and use a safe reference
  const db = typeof supabase !== 'undefined' ? supabase : window.supabase;
 
 const daily = useDaily();
 const localSessionId = useLocalSessionId();
 const { plan } = useCompanyPlan();
 const isBranded = hasFeature(plan, 'hasBrandedRooms');
 const participantIds = useParticipantIds();
 const { screens, isSharingScreen, startScreenShare, stopScreenShare} = useScreenShare();
 const localAudioTrack = useAudioTrack(localSessionId);
 const localVideoTrack = useVideoTrack(localSessionId);
 const activeSpeakerId = useActiveSpeakerId();
 
 // Fix #4: Use both state AND direct Daily meetingState() check to eliminate race conditions.
 // The ref ensures ensureJoined() always sees the latest value without stale closures.
 const [joined, setJoined] = useState(daily ? daily.meetingState() === 'joined-meeting' : false);
 const joinedRef = useRef(joined);
 useEffect(() => { joinedRef.current = joined; }, [joined]);

 const isMuted = localAudioTrack?.state !== 'playable';
 const isVideoOff = localVideoTrack?.state !== 'playable';
 const { toast} = useToast();
 const [isAiLoading, setIsAiLoading] = useState(false);
 const [aiResponse, setAiResponse] = useState(null);
 const [transcriptData, setTranscriptData] = useState([]);
 const transcriptDataRef = useRef([]);
 const [showSettings, setShowSettings] = useState(false);
 const [showInvite, setShowInvite] = useState(false);
 const [inviteEmail, setInviteEmail] = useState("");
 const [isInviteLoading, setIsInviteLoading] = useState(false);
 const [copiedLink, setCopiedLink] = useState(false);
 const { theme, changeTheme } = useTheme();

  // Default meeting interface to dark theme on enter
  useEffect(() => {
    if (theme !== 'dark') {
      changeTheme('dark');
    }
  }, []);
 const [showEmojis, setShowEmojis] = useState(false);
 const [floatingEmojis, setFloatingEmojis] = useState([]);
  // Fix #3: Network reconnection state
  const [isReconnecting, setIsReconnecting] = useState(false);
  // Add: Connection quality indicator ('good' | 'low' | 'very-low')
  const [networkQuality, setNetworkQuality] = useState('good');
  // Fix #18: Single AudioContext ref — reuse across join/leave sounds
  const audioCtxRef = useRef(null);
  const [activeBg, setActiveBg] = useState(initialBackground?.id || 'none');
  const [isApplyingBg, setIsApplyingBg] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingIntervalRef = useRef(null);
  const [meetingVideoUrl, setMeetingVideoUrl] = useState(null);
  const meetingVideoUrlRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isStudioAudioOn, setIsStudioAudioOn] = useState(false);

  useEffect(() => {
    if (daily) {
      try {
        const isCurrentlyEnabled = daily.getInputSettings()?.audio?.processor?.type === 'noise-cancellation';
        setIsStudioAudioOn(isCurrentlyEnabled);
      } catch (e) {}
    }
  }, [daily]);

  useEffect(() => {
    if (isRecording) {
      recordingIntervalRef.current = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);
    } else {
      clearInterval(recordingIntervalRef.current);
      setRecordingSeconds(0);
    }
    return () => clearInterval(recordingIntervalRef.current);
  }, [isRecording]);

  const applyVirtualBackground = async (bg) => {
    if (!daily) return;
    setIsApplyingBg(true);
    setActiveBg(bg.id);
    try {
      if (bg.type === 'none') {
        await daily.updateInputSettings({
          video: { processor: { type: 'none' } }
        });
      } else if (bg.type === 'background-blur') {
        await daily.updateInputSettings({
          video: { processor: { type: 'background-blur', config: { strength: 0.5 } } }
        });
      } else {
        await daily.updateInputSettings({
          video: { processor: { type: 'background-image', config: { source: bg.url } } }
        });
      }
      toast({ title: 'Background Applied', description: `Virtual background changed to ${bg.label}.` });
    } catch (err) {
      console.error(err);
      toast({ title: 'Background Error', description: 'Failed to apply virtual background.', variant: 'destructive' });
      setActiveBg('none');
    } finally {
      setIsApplyingBg(false);
    }
  };

  const addEmojiBurst = useCallback((emoji) => {
    const count = Math.floor(Math.random() * 4) + 4; // 4 to 7 emojis
    const newEmojis = [];
    const now = Date.now();
    for (let i = 0; i < count; i++) {
      newEmojis.push({
        id: now + i + Math.random(),
        emoji,
        leftOffset: Math.floor(Math.random() * 160) - 80, // -80px to 80px
        rotation: Math.floor(Math.random() * 80) - 40, // -40deg to 40deg
        delay: Math.random() * 0.4, // 0 to 0.4s delay
        scale: 0.8 + Math.random() * 0.7, // 0.8 to 1.5 scale
      });
    }
    setFloatingEmojis(prev => [...prev, ...newEmojis]);
    setTimeout(() => {
      setFloatingEmojis(prev => prev.filter(e => !newEmojis.find(n => n.id === e.id)));
    }, 4000);
  }, []);

  const sendReaction = (emoji) => {
    if (!daily) return;
    const msg = { type: 'reaction', emoji, name: daily?.participants()?.local?.user_name || 'Someone' };
    daily.sendAppMessage(msg, '*');
    
    addEmojiBurst(emoji);
    setShowEmojis(false);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.origin + '/join/' + roomUrl.split('/').pop().split('?')[0]);
    setCopiedLink(true);
    toast({ title: "Link Copied", description: "Meeting link copied to clipboard." });
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleInvite = async (e) => {
    if (e) e.preventDefault();
    if (!inviteEmail.trim()) return;
    setIsInviteLoading(true);
    
    const properLink = window.location.origin + '/join/' + roomUrl.split('/').pop().split('?')[0];
    
    try {
      // Direct call to send-email edge function
      const { data, error } = await db.functions.invoke('send-email', {
        body: {
          to: [inviteEmail.trim()],
          subject: "You're invited to a video meeting on KERINT",
          html: `<p>Please join my video meeting using this secure link:</p><p><a href="${properLink}">${properLink}</a></p><p>Powered by KERINT Intelligence.</p>`
        }
      });
      
      // If error (or function doesn't exist), throw to trigger fallback
      if (error) throw error;

      toast({ title: "Invite Sent", description: `Meeting invite securely sent to ${inviteEmail}.` });
      setInviteEmail("");
      setShowInvite(false);
    } catch (error) {
      console.warn("API invite failed, using mailto fallback:", error);
      const subject = encodeURIComponent("You're invited to a video meeting on KERINT");
      const body = encodeURIComponent(`Please join my video meeting using this secure link:\n\n${properLink}\n\nPowered by KERINT Intelligence.`);
      // Prevent page unload by using window.open instead of window.location.href
      window.open(`mailto:${inviteEmail.trim()}?subject=${subject}&body=${body}`, '_blank');
      toast({ title: "Opening Email Client", description: "Could not send via server. Opening your email app to send the invite." });
      setShowInvite(false);
    } finally {
      setIsInviteLoading(false);
    }
  };

  useDailyEvent('joined-meeting', useCallback(() => {
   setJoined(true);
   setIsReconnecting(false);
   if (!daily) return;
   // Enforce the pre-join mic/camera choices — Daily sometimes ignores startAudioOff/startVideoOff
   // so we explicitly set them after joining to guarantee the intended state.
   Promise.all([
     daily.setLocalAudio(initialAudio).catch(() => {}),
     daily.setLocalVideo(initialVideo).catch(() => {}),
   ]);
   // Fix #8/#9: Apply adaptive send settings AFTER joining (not before)
   daily.updateSendSettings({
     video: {
       encodings: {
         high:   { maxBitrate: 1_200_000, maxFramerate: 30, scaleResolutionDownBy: 1 },
         medium: { maxBitrate:   600_000, maxFramerate: 24, scaleResolutionDownBy: 2 },
         low:    { maxBitrate:   200_000, maxFramerate: 15, scaleResolutionDownBy: 4 },
       }
     }
   }).catch(e => console.warn('updateSendSettings failed:', e));
   // Only attempt cloud transcription — silent failure is fine if not enabled
   daily.startTranscription().catch(() => {});
  }, [daily, initialAudio, initialVideo]));

  // Fix #18: Reuse a single AudioContext instead of creating one per sound
  const playSound = (type) => {
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const audioCtx = audioCtxRef.current;
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      if (type === 'join') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.5);
      } else if (type === 'leave') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.5);
      }
    } catch (e) {
      console.warn('Audio playback failed:', e);
    }
  };

  useDailyEvent('participant-joined', useCallback((ev) => {
    if (!ev.participant.local) {
      playSound('join');
      toast({
        title: "Participant Joined",
        description: `${ev.participant.user_name || 'Someone'} joined the meeting.`,
      });
    }
  }, [toast]));

  // Knocking hooks
  const { waitingParticipants } = useWaitingParticipants();
  const waitingIds = Object.keys(waitingParticipants || {});
  
  const admitParticipant = (id) => {
    if (daily) daily.updateWaitingParticipant(id, { grantRequestedAccess: true });
  };
  
  const denyParticipant = (id) => {
    if (daily) daily.updateWaitingParticipant(id, { grantRequestedAccess: false });
  };
  
  const admitAll = () => {
    waitingIds.forEach(id => admitParticipant(id));
  };

  useDailyEvent('waiting-participant-added', useCallback(() => {
    playSound('join');
    toast({ title: 'Someone is knocking', description: 'A guest is waiting to join the meeting.' });
  }, [toast]));

 useDailyEvent('left-meeting', useCallback(() => {
  setJoined(false);
  onLeave(null);
}, [onLeave]));

 useDailyEvent('participant-left', useCallback((ev) => {
    playSound('leave');
    toast({
      title: "Participant Left",
      description: `${ev.participant.user_name || 'A participant'} left the meeting.`,
      variant: 'destructive'
    });
  }, [toast]));

 useDailyEvent('error', useCallback((ev) => {
  console.error('Daily error:', ev);
  toast({
    title: 'Video connection error',
    description: ev?.errorMsg || 'Could not connect to the meeting room.',
    variant: 'destructive'
  });
 }, [toast]));

 // Fix #3: Listen for network interruptions and show a reconnecting overlay
 useDailyEvent('network-connection', useCallback((ev) => {
   if (ev.event === 'interrupted') {
     setIsReconnecting(true);
     toast({ title: '⚠️ï¸ Connection Lost', description: 'Attempting to reconnect…', variant: 'destructive' });
   } else if (ev.event === 'connected') {
     setIsReconnecting(false);
     toast({ title: 'âœ… Reconnected', description: 'Your connection has been restored.' });
   }
 }, [toast]));

 // Add: Track network quality for the connection indicator
 useDailyEvent('network-quality-change', useCallback((ev) => {
   const threshold = ev?.threshold;
   if (threshold === 'very-low') setNetworkQuality('very-low');
   else if (threshold === 'low') setNetworkQuality('low');
   else setNetworkQuality('good');
 }, []));

 // Fix #4: Use both the joinedRef (no stale closure) AND Daily's live meetingState()
 // Also check local participant presence as a 3rd check for the race window
 // between join() resolving and joined-meeting event firing.
 const ensureJoined = () => {
   if (joinedRef.current) return true;
   if (daily && daily.meetingState() === 'joined-meeting') {
     // Sync state if Daily says we're joined but state hasn't updated yet
     if (!joinedRef.current) { setJoined(true); joinedRef.current = true; }
     return true;
   }
   // Also accept if local participant already exists (post-join, pre-event)
   try {
     const local = daily && daily.participants()?.local;
     if (local) {
       if (!joinedRef.current) { setJoined(true); joinedRef.current = true; }
       return true;
     }
   } catch (_) {}
   toast({
     title: 'Connecting…',
     description: 'Your camera and mic will be available once the call connects.'
   });
   return false;
 };

  const toggleAudio = async () => {
    if (!ensureJoined()) return;
    try {
      const p = daily.participants().local;
      await daily.setLocalAudio(!p.audio);
    } catch (err) {
      console.error(err);
      const isDeviceNotFound = err?.name === 'NotFoundError' || err?.message?.includes('not found') || err?.message?.includes('device');
      const isPermission = err?.name === 'NotAllowedError' || err?.message?.includes('Permission') || err?.message?.includes('allowed');
      if (isDeviceNotFound) {
        toast({ title: 'ðŸŽ™ï¸ No Microphone Found', description: 'Please connect a microphone and try again. Make sure it\'s plugged in and not in use by another app.', variant: 'destructive' });
      } else if (isPermission) {
        toast({ title: 'ðŸ”’ Microphone Blocked', description: 'Browser blocked microphone access. Click the ðŸ”’ icon in your browser address bar to allow it.', variant: 'destructive' });
      } else {
        toast({ title: 'Microphone Error', description: err?.message || 'Could not access your microphone.', variant: 'destructive' });
      }
    }
  };

  const toggleVideo = async () => {
    if (!ensureJoined()) return;
    try {
      const p = daily.participants().local;
      await daily.setLocalVideo(!p.video);
    } catch (err) {
      console.error(err);
      const isDeviceNotFound = err?.name === 'NotFoundError' || err?.message?.includes('not found') || err?.message?.includes('device');
      const isPermission = err?.name === 'NotAllowedError' || err?.message?.includes('Permission') || err?.message?.includes('allowed');
      if (isDeviceNotFound) {
        toast({ title: 'ðŸ“· No Camera Found', description: 'No webcam detected. Please connect a camera and try again. Others will still be able to see your name and hear you.', variant: 'destructive' });
      } else if (isPermission) {
        toast({ title: 'ðŸ”’ Camera Blocked', description: 'Browser blocked camera access. Click the ðŸ”’ icon in your browser address bar to allow it.', variant: 'destructive' });
      } else {
        toast({ title: 'Camera Error', description: err?.message || 'Could not access your camera.', variant: 'destructive' });
      }
    }
  };

 const toggleScreenShare = async () => {
 if (!ensureJoined()) return;
 try {
 if (isSharingScreen) {
 await stopScreenShare();
} else {
 await startScreenShare();
}
} catch (err) {
 console.error(err);
 toast({ title: 'Screen share failed', description: err?.message || 'Could not share screen.', variant: 'destructive'});
}
};

  const joinTimeRef = useRef(Date.now());

  useEffect(() => {
    if (joined) joinTimeRef.current = Date.now();
  }, [joined]);

  const leaveCall = async () => {
    if (!daily) return;

    // Safety fallback: guaranteed exit after 2.5s even if network or DB stalls
    const safetyTimer = setTimeout(() => {
      try { daily.leave(); } catch (_) {}
      if (onLeave) onLeave(null);
      else navigate(spaceId ? `/spaces/${spaceId}` : '/meetings');
    }, 2500);

    const safeExit = (targetPath) => {
      clearTimeout(safetyTimer);
      try { daily.leave(); } catch (_) {}
      if (targetPath) navigate(targetPath);
      else if (onLeave) onLeave(null);
      else navigate(spaceId ? `/spaces/${spaceId}` : '/meetings');
    };

    if (joined) {
      // If currently recording, stop it and wait for the upload to finish before saving
      if (isRecording && mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        toast({ title: "Finishing Recording", description: "Saving your video before leaving..." });
        await new Promise(resolve => {
           // Intercept the original onstop to add our resolve
           const originalOnStop = mediaRecorderRef.current.onstop;
           mediaRecorderRef.current.onstop = async (e) => {
             if (originalOnStop) await originalOnStop(e);
             resolve();
           };
           mediaRecorderRef.current.stop();
           setIsRecording(false);
        });
      }

      try {
        const durationSeconds = Math.round((Date.now() - joinTimeRef.current) / 1000);
        const meetingTitle = `Meeting - ${new Date().toLocaleDateString()}`;
        const rawTranscript = transcriptData.length > 0 
          ? transcriptData.map(t => `${t.name}: ${t.text}`).join('\n')
          : '';
          
        if (db) {
          const companyId = user?.company_id || user?.user_metadata?.company_id || null;
          const meetingData = {
            title: meetingTitle,
            daily_room_name: roomUrl.split('/').pop().split('?')[0] || 'room',
            host_id: user?.id || null,
            company_id: companyId,
            ai_summary: rawTranscript ? 'Generating summary...' : 'No transcript recorded.',
            started_at: new Date(joinTimeRef.current).toISOString(),
            ended_at: new Date().toISOString(),
            space_id: spaceId || null
          };
          
          if (meetingVideoUrl || meetingVideoUrlRef.current) {
            meetingData.video_url = meetingVideoUrl || meetingVideoUrlRef.current;
          } else if (recordingSeconds > 0 && isUploading) {
             toast({ title: "Warning", description: "Video upload was not finished yet, video may be missing." });
          }

          const { data: insertedMeeting, error } = await db.from('clipad_meeting_records').insert(meetingData).select().single();
          
          if (!error && insertedMeeting && rawTranscript.trim().length > 10) {
            // Run AI summary in background — always update the record, even on failure
            (async () => {
              try {
                const { generateText } = await import('@/lib/cloudflareAI');
                const aiResult = await generateText([
                  { role: 'system', content: 'You are an AI assistant. Summarize the following meeting transcript. Return ONLY valid JSON with two keys: "summary" (a string summarizing the meeting concisely) and "action_items" (an array of objects, each with "title", "owner", and "context"). Do not wrap the JSON in markdown blocks.' },
                  { role: 'user', content: rawTranscript.trim().substring(0, 4000) }
                ]);

                let text = typeof aiResult === 'string' ? aiResult : aiResult?.response || '';
                text = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
                
                let parsed = null;
                try { parsed = JSON.parse(text); } catch { /* will use text as summary */ }

                const summary = parsed?.summary || text.substring(0, 500) || 'Summary generation failed.';
                await db.from('clipad_meeting_records').update({ ai_summary: summary }).eq('id', insertedMeeting.id);

                if (parsed?.action_items && Array.isArray(parsed.action_items) && parsed.action_items.length > 0) {
                  const inserts = parsed.action_items.map(ai => ({
                    space_id: spaceId || null,
                    title: ai.title,
                    assigned_to: ai.owner || null,
                    context: ai.context || null,
                    is_complete: false,
                  }));
                  await db.from('clipad_action_items').insert(inserts);
                }

                // --- ORG MEMORY ENGINE: Decisions & Commitments ---
                const [foundDecisions, foundCommitments] = await Promise.all([
                  detectDecisions(rawTranscript.trim(), { team_space_id: spaceId || null, related_meeting_id: insertedMeeting.id }),
                  detectCommitments(rawTranscript.trim(), { team_space_id: spaceId || null, meeting_id: insertedMeeting.id })
                ]);
                
                for (const d of foundDecisions) {
                  const { error: de } = await db.from('clipad_decisions').insert({ ...d, reasoning_text: d.rationale || null });
                  if (!de) {
                    await writeOrgEvent({
                      space_id: spaceId || null,
                      event_type: 'decision_logged',
                      title: d.decision_text.substring(0, 80),
                      actor_id: user?.id,
                      source_id: insertedMeeting.id,
                      source_table: 'clipad_meeting_records',
                      importance: d.importance_score || 5,
                    });
                  }
                }
                
                for (const c of foundCommitments) {
                  const { error: ce } = await db.from('clipad_commitments').insert(c);
                  if (!ce) {
                    await writeOrgEvent({
                      space_id: spaceId || null,
                      event_type: 'commitment_detected',
                      title: c.commitment_text.substring(0, 80),
                      actor_id: user?.id,
                      source_id: insertedMeeting.id,
                      source_table: 'clipad_meeting_records',
                      importance: 4,
                    });
                  }
                }
                // ------------------------------------------------
              } catch(e) {
                console.warn('AI summary generation failed:', e);
                // Always resolve the stuck 'Generating summary...' state
                await db.from('clipad_meeting_records')
                  .update({ ai_summary: 'AI summary unavailable. Transcript saved.' })
                  .eq('id', insertedMeeting.id);
              }
            })();
          }

          
          const basePath = window.location.pathname.startsWith('/clipad') ? '/clipad' : '';
          if (insertedMeeting) {
            safeExit(`${basePath}/save-meeting/${insertedMeeting.id}${spaceId ? `?spaceId=${spaceId}` : ''}`);
          } else {
            safeExit(spaceId ? `/spaces/${spaceId}` : '/meetings');
          }
          return;
        }
      } catch (e) {
        console.error('Failed to save meeting record:', e);
        safeExit(spaceId ? `/spaces/${spaceId}` : '/meetings');
        return;
      }
    }
    
    safeExit(spaceId ? `/spaces/${spaceId}` : '/meetings');
  };

 // Fix #7: Real-time transcription — cross-browser (Chrome + Firefox fallback)
 // Uses both Daily's built-in transcription-message event AND Web Speech API
 useDailyEvent('transcription-message', useCallback((ev) => {
   if (ev?.text) {
     const entry = { name: ev.userName || 'Participant', text: ev.text };
     transcriptDataRef.current = [...transcriptDataRef.current, entry];
     setTranscriptData(prev => [...prev, entry]);
   }
 }, []));

 useEffect(() => {
   const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
   if (!joined || isMuted || !SpeechRecognition) return;
   let recognition;
   try {
     recognition = new SpeechRecognition();
     recognition.continuous = true;
     recognition.interimResults = false;
     recognition.onresult = (event) => {
       const lastResult = event.results[event.results.length - 1];
       if (lastResult.isFinal) {
         const text = lastResult[0].transcript;
         const entry = { name: 'Me', text };
         transcriptDataRef.current = [...transcriptDataRef.current, entry];
         setTranscriptData(prev => [...prev, entry]);
         if (daily && daily.meetingState() === 'joined-meeting') {
           daily.sendAppMessage({ type: 'transcription', text, name: 'Me' }, '*');
         }
       }
     };
     recognition.onend = () => {
       if (joinedRef.current && !isMuted) {
         try { recognition.start(); } catch (_) {}
       }
     };
     recognition.start();
   } catch (e) {
     console.warn('Speech recognition error:', e);
   }
   return () => {
     try { recognition?.stop(); } catch (_) {}
   };
 }, [joined, isMuted, daily]);

  const handleAiAssist = async () => {
    if (transcriptDataRef.current.length === 0) {
      setAiResponse("No meaningful conversation detected yet. Please make sure your microphone is unmuted and speak clearly to generate a meeting transcript.");
      return;
    }

    setIsAiLoading(true);
    setAiResponse(null);
    toast({ title: "KERINT AI", description: "Generating meeting summary and action items..."});
    try {
      // Fix #7: Use the ref (always up to date) and pass the real room name
      const meetingContext = transcriptDataRef.current.map(t => `${t.name}: ${t.text}`).join('\n');
      const realRoomId = roomUrl.split('/').pop().split('?')[0];

      const { data, error } = await supabase.functions.invoke('clipad-ai-processor', {
        body: { type: 'meeting', transcript: meetingContext, roomId: realRoomId, spaceId: spaceId || null }
      });

      if (error) throw error;
      
      const formattedResponse = `
        <div class="space-y-4">
          <p><strong>Summary:</strong> ${data.data.summary}</p>
          <div><strong>Decisions:</strong> <ul class="list-disc pl-4">${data.data.decisions.map(d => `<li>${d}</li>`).join('')}</ul></div>
          <div><strong>Action Items:</strong> <ul class="list-disc pl-4">${data.data.actionItems.map(a => `<li>${a.assignee}: ${a.task}</li>`).join('')}</ul></div>
          <p><strong>Sentiment:</strong> ${data.data.sentiment}</p>
        </div>
      `;
      setAiResponse(formattedResponse);
    } catch (err) {
      console.error(err);
      toast({ title: "AI Error", description: "Failed to connect to AI backend.", variant: "destructive"});
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAiFollowUp = async () => {
    if (transcriptDataRef.current.length === 0) {
      setAiResponse("Not enough transcript data to draft a follow-up email.");
      return;
    }

    setIsAiLoading(true);
    setAiResponse(null);
    toast({ title: "KERINT AI", description: "Drafting follow-up email..."});
    try {
      const { data, error } = await supabase.functions.invoke('clipad-smart-followup', {
        body: { type: 'meeting_followup', targetId: 'dummy-room' }
      });

      if (error) throw error;
      setAiResponse(`<strong>Follow-Up Triggered:</strong><br/><br/>${data.message}`);
    } catch (err) {
      console.error(err);
      toast({ title: "AI Error", description: "Failed to connect to AI backend.", variant: "destructive"});
    } finally {
      setIsAiLoading(false);
    }
  };

 const [chatMessages, setChatMessages] = useState([]);
 const [chatInput, setChatInput] = useState("");
 const [showChat, setShowChat] = useState(false);
 const [showAiSidebar, setShowAiSidebar] = useState(false);

 // Handle incoming Daily messages
 useDailyEvent('app-message', useCallback((ev) => {
  if (ev.data && ev.data.type === 'chat') {
    setChatMessages(prev => [...prev, { from: ev.fromId, name: ev.data.name, text: ev.data.text, time: new Date()}]);
  }
  if (ev.data && ev.data.type === 'reaction') {
    addEmojiBurst(ev.data.emoji);
  }
  if (ev.data && ev.data.type === 'transcription') {
    setTranscriptData(prev => [...prev, { name: 'Participant', text: ev.data.text}]);
  }
 }, []));

 const sendChatMessage = () => {
 if (!chatInput.trim() || !daily) return;
 const msg = { type: 'chat', text: chatInput.trim(), name: daily?.participants()?.local?.user_name || 'Me'};
 daily.sendAppMessage(msg, '*');
 setChatMessages(prev => [...prev, { from: 'local', name: 'Me', text: chatInput.trim(), time: new Date()}]);
 setChatInput("");
};

 return (
  <div className="flex flex-col h-screen w-screen overflow-hidden relative bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200/90 dark:bg-gradient-to-br dark:from-[#060b0e] dark:via-[#091217] dark:to-[#04080a] text-slate-900 dark:text-white font-sans select-none transition-colors duration-300">
    {/* Refined ambient specular glow */}
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      <div className="absolute -top-[20%] left-[10%] w-[55vw] h-[55vw] rounded-full bg-teal-500/10 dark:bg-cyan-500/15 blur-[150px]" />
      <div className="absolute -bottom-[20%] right-[10%] w-[55vw] h-[55vw] rounded-full bg-blue-500/10 dark:bg-blue-600/15 blur-[150px]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-gradient-to-b from-white/30 dark:from-cyan-400/10 to-transparent blur-3xl pointer-events-none" />
    </div>

   {/* Main Layout Area - full height since top header bar is removed */}
 {/* Main Layout Area - Corporate Left Sidebar + Full-Height Video Stage */}
 <div className="relative z-10 flex-1 flex flex-row min-w-0 overflow-hidden">

   {/* Corporate Left Mission Control Sidebar */}
    <aside className="w-16 sm:w-18 bg-white/80 dark:bg-[#0b141b]/85 backdrop-blur-3xl border-r border-slate-200/80 dark:border-white/10 flex flex-col items-center justify-between py-3 px-1.5 z-40 shrink-0 select-none shadow-[4px_0_30px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_30px_rgba(0,0,0,0.4)] transition-all relative">
      {/* Specular edge highlight line */}
      <div className="absolute top-0 right-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-white/50 dark:via-white/20 to-transparent pointer-events-none" />
      
      {/* Top Section: Safe Back / Home Navigation */}
      <div className="flex flex-col items-center w-full pb-2.5 shrink-0 border-b border-slate-200/70 dark:border-white/10">
        <button
          onClick={() => {
            if (window.confirm("Are you sure you want to leave this meeting and return to Dashboard?")) {
              leaveCall();
              navigate('/dashboard');
            }
          }}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center bg-gradient-to-b from-white to-slate-100/90 dark:bg-gradient-to-b dark:from-white/[0.12] dark:to-white/[0.04] text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white border border-slate-200/90 dark:border-white/[0.12] shadow-[0_1px_3px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[0_2px_6px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.18)] hover:scale-105 active:scale-95 transition-all group"
          title="Exit to Dashboard"
        >
          <Home className="w-4.5 h-4.5 text-slate-600 dark:text-slate-300 group-hover:text-[#006065] dark:group-hover:text-[#fad503] transition-colors" />
        </button>
      </div>

      {/* Center Section: Core Mission Controls with Specular Bevels */}
      <div className="flex-1 w-full flex flex-col items-center justify-center gap-1.5 sm:gap-2 my-1 overflow-y-auto no-scrollbar py-1">
        {/* Audio Toggle */}
        <button
          onClick={toggleAudio}
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
            isMuted
              ? 'bg-gradient-to-b from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white shadow-[0_4px_14px_rgba(239,68,68,0.4),inset_0_1px_0_rgba(255,255,255,0.35)] border border-red-400/50'
              : 'bg-gradient-to-b from-white to-slate-100/90 dark:bg-gradient-to-b dark:from-white/[0.12] dark:to-white/[0.04] border border-slate-200/90 dark:border-white/[0.12] text-emerald-600 dark:text-emerald-400 shadow-[0_1px_3px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[0_2px_6px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.18)] hover:border-emerald-500/40'
          }`}
          title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
        >
          {isMuted ? <MicOff className="w-4.5 h-4.5" /> : <Mic className="w-4.5 h-4.5" />}
        </button>

        {/* Video Toggle */}
        <button
          onClick={toggleVideo}
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
            isVideoOff
              ? 'bg-gradient-to-b from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white shadow-[0_4px_14px_rgba(239,68,68,0.4),inset_0_1px_0_rgba(255,255,255,0.35)] border border-red-400/50'
              : 'bg-gradient-to-b from-white to-slate-100/90 dark:bg-gradient-to-b dark:from-white/[0.12] dark:to-white/[0.04] border border-slate-200/90 dark:border-white/[0.12] text-emerald-600 dark:text-emerald-400 shadow-[0_1px_3px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[0_2px_6px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.18)] hover:border-emerald-500/40'
          }`}
          title={isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
        >
          {isVideoOff ? <VideoOff className="w-4.5 h-4.5" /> : <VideoIcon className="w-4.5 h-4.5" />}
        </button>

        {/* Subtle Separator */}
        <div className="w-5 h-px bg-slate-200/80 dark:bg-white/10 my-0.5" />

        {/* Share Screen */}
        <button
          onClick={toggleScreenShare}
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
            isSharingScreen
              ? 'bg-gradient-to-b from-[#00828a] to-[#005a5f] text-white shadow-[0_4px_16px_rgba(0,130,138,0.45),inset_0_1px_0_rgba(255,255,255,0.35)] border border-teal-300/40'
              : 'bg-gradient-to-b from-white to-slate-100/90 dark:bg-gradient-to-b dark:from-white/[0.12] dark:to-white/[0.04] border border-slate-200/90 dark:border-white/[0.12] text-slate-700 dark:text-slate-300 shadow-[0_1px_3px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[0_2px_6px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.18)] hover:from-white hover:to-white dark:hover:from-white/[0.18]'
          }`}
          title="Share Screen"
        >
          <MonitorUp className="w-4.5 h-4.5" />
        </button>

        {/* Whiteboard */}
        <button
          onClick={() => setShowWhiteboard(!showWhiteboard)}
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
            showWhiteboard
              ? 'bg-gradient-to-b from-[#00828a] to-[#005a5f] text-white shadow-[0_4px_16px_rgba(0,130,138,0.45),inset_0_1px_0_rgba(255,255,255,0.35)] border border-teal-300/40'
              : 'bg-gradient-to-b from-white to-slate-100/90 dark:bg-gradient-to-b dark:from-white/[0.12] dark:to-white/[0.04] border border-slate-200/90 dark:border-white/[0.12] text-slate-700 dark:text-slate-300 shadow-[0_1px_3px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[0_2px_6px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.18)] hover:from-white hover:to-white dark:hover:from-white/[0.18]'
          }`}
          title="Interactive Whiteboard"
        >
          <PenTool className="w-4.5 h-4.5" />
        </button>

        {/* Record Meeting */}
        <button
          onClick={async () => {
            if (isRecording) {
              if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
              }
              setIsRecording(false);
            } else {
              try {
                const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
                const mr = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
                recordedChunksRef.current = [];
                mr.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
                mr.onstop = () => {
                  const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `meeting-${new Date().toISOString().slice(0, 10)}.webm`;
                  a.click();
                  stream.getTracks().forEach(t => t.stop());
                };
                mr.start(1000);
                mediaRecorderRef.current = mr;
                setIsRecording(true);
              } catch (err) {
                console.error('Failed to start recording:', err);
              }
            }
          }}
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
            isRecording
              ? 'bg-gradient-to-b from-red-500 to-red-600 text-white animate-pulse shadow-[0_4px_14px_rgba(239,68,68,0.5),inset_0_1px_0_rgba(255,255,255,0.35)] border border-red-400/50'
              : 'bg-gradient-to-b from-white to-slate-100/90 dark:bg-gradient-to-b dark:from-white/[0.12] dark:to-white/[0.04] border border-slate-200/90 dark:border-white/[0.12] text-red-500 shadow-[0_1px_3px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[0_2px_6px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.18)] hover:bg-red-50 dark:hover:bg-red-950/30'
          }`}
          title={isRecording ? "Stop Recording" : "Record Meeting"}
        >
          <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-white' : 'bg-red-500'}`} />
        </button>

        {/* Subtle Separator */}
        <div className="w-5 h-px bg-slate-200/80 dark:bg-white/10 my-0.5" />

        {/* Chat Button */}
        <button
          onClick={() => setShowChat(!showChat)}
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl relative flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
            showChat
              ? 'bg-gradient-to-b from-[#00828a] to-[#005a5f] text-white shadow-[0_4px_16px_rgba(0,130,138,0.45),inset_0_1px_0_rgba(255,255,255,0.35)] border border-teal-300/40'
              : 'bg-gradient-to-b from-white to-slate-100/90 dark:bg-gradient-to-b dark:from-white/[0.12] dark:to-white/[0.04] border border-slate-200/90 dark:border-white/[0.12] text-slate-700 dark:text-slate-300 shadow-[0_1px_3px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[0_2px_6px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.18)] hover:from-white hover:to-white dark:hover:from-white/[0.18]'
          }`}
          title="Chat"
        >
          <MessageSquare className="w-4.5 h-4.5" />
          {chatMessages.length > 0 && !showChat && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-black" />
          )}
        </button>

        {/* Invite Participants */}
        <button
          onClick={() => setShowInvite(true)}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center bg-gradient-to-b from-white to-slate-100/90 dark:bg-gradient-to-b dark:from-white/[0.12] dark:to-white/[0.04] border border-slate-200/90 dark:border-white/[0.12] text-slate-700 dark:text-slate-300 shadow-[0_1px_3px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[0_2px_6px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.18)] hover:scale-105 active:scale-95 transition-all"
          title="Invite Participants"
        >
          <UserPlus className="w-4.5 h-4.5" />
        </button>

        {/* AI Notes */}
        <button
          onClick={handleAiAssist}
          disabled={isAiLoading}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center bg-gradient-to-b from-white to-slate-100/90 dark:bg-gradient-to-b dark:from-white/[0.12] dark:to-white/[0.04] border border-slate-200/90 dark:border-white/[0.12] text-slate-700 dark:text-slate-300 shadow-[0_1px_3px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[0_2px_6px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.18)] hover:scale-105 active:scale-95 transition-all"
          title="Generate AI Notes & Summary"
        >
          <Sparkles className="w-4.5 h-4.5 text-[#fad503]" />
        </button>
      </div>

      {/* Pinned Bottom Section: Settings & Red Leave Call with Specular Highlight */}
      <div className="flex flex-col items-center w-full gap-2 pt-2.5 shrink-0 border-t border-slate-200/70 dark:border-white/10">
        {/* Settings Button */}
        <button
          onClick={() => setShowSettings(true)}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center bg-gradient-to-b from-white to-slate-100/90 dark:bg-gradient-to-b dark:from-white/[0.12] dark:to-white/[0.04] border border-slate-200/90 dark:border-white/[0.12] text-slate-700 dark:text-slate-300 shadow-[0_1px_3px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[0_2px_6px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.18)] hover:scale-105 active:scale-95 transition-all"
          title="Meeting Settings"
        >
          <Settings className="w-4.5 h-4.5" />
        </button>

        {/* Leave Meeting */}
        <button
          onClick={leaveCall}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-[0_4px_16px_rgba(220,38,38,0.45),inset_0_1px_0_rgba(255,255,255,0.35)] border border-red-500/60 hover:scale-105 active:scale-95 transition-all"
          title="Leave Meeting"
        >
          <PhoneOff className="w-4.5 h-4.5" />
        </button>
      </div>
    </aside>

   {/* Video Content Area - Takes Full Remaining Width and 100% Height */}
   <div className="flex-1 flex flex-col relative min-w-0 h-full">



  {/* Corporate Meeting Header Bar with Glass Luster */}
    <header className="h-12 px-4 sm:px-6 flex items-center justify-between border-b border-slate-200/80 dark:border-white/[0.08] bg-white/75 dark:bg-[#0b141b]/80 backdrop-blur-2xl z-30 shrink-0 transition-colors shadow-[0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_1px_0_rgba(255,255,255,0.05)]">
      {/* Left: Recording Status */}
      <div className="flex items-center gap-2.5">
        {isRecording && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 px-3 py-1 rounded-full text-xs font-semibold shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <span className="font-mono tabular-nums text-xs font-bold">
              {Math.floor(recordingSeconds / 60).toString().padStart(2, '0')}:{(recordingSeconds % 60).toString().padStart(2, '0')}
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-wider">REC</span>
          </div>
        )}
      </div>

      {/* Right: Shiny Corporate Copy Link Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleCopyLink}
          className={`h-8.5 px-4 text-xs font-semibold rounded-xl border shadow-sm flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] ${
            copiedLink
              ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white border-emerald-400/50 shadow-[0_4px_12px_rgba(16,185,129,0.35),inset_0_1px_0_rgba(255,255,255,0.3)]'
              : 'bg-gradient-to-b from-white to-slate-100/90 dark:bg-gradient-to-b dark:from-white/[0.14] dark:to-white/[0.04] text-slate-700 dark:text-slate-100 border-slate-200/90 dark:border-white/[0.16] shadow-[0_1px_3px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.95)] dark:shadow-[0_2px_6px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.2)] hover:from-white hover:to-white dark:hover:from-white/[0.2] dark:hover:to-white/[0.08]'
          }`}
          title="Copy Meeting Link to Clipboard"
        >
          {copiedLink ? (
            <>
              <Check className="w-3.5 h-3.5 text-white" />
              <span>Link Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />
              <span>Copy Link</span>
            </>
          )}
        </button>
      </div>
    </header>

  {/* Waiting Room UI */}
  {waitingIds.length > 0 && (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-card px-5 py-4 rounded-2xl shadow-2xl border border-primary/30 animate-in slide-in-from-top flex flex-col gap-3 min-w-[320px]">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-sm text-slate-900 dark:text-foreground">{waitingIds.length} guest(s) waiting to join</h4>
        {waitingIds.length > 1 && (
          <Button size="sm" onClick={admitAll} className="h-7 text-xs bg-primary hover:bg-primary/90">Admit All</Button>
        )}
      </div>
      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
        {waitingIds.map(id => (
          <div key={id} className="flex items-center justify-between bg-slate-100 dark:bg-secondary p-2.5 rounded-xl">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                {(waitingParticipants[id].name || 'G').charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-semibold truncate text-slate-700 dark:text-slate-200">{waitingParticipants[id].name || 'Guest'}</span>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" onClick={() => denyParticipant(id)}>✕</Button>
              <Button size="sm" className="h-8 px-4 text-xs font-semibold" onClick={() => admitParticipant(id)}>Admit</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )}

   {/* Video Grid */}
  {(() => {
    const allParticipants = [localSessionId, ...participantIds.filter(id => id !== localSessionId)].filter(Boolean);
    const totalCount = allParticipants.length;
    // Fix #6: mainSpeaker is the active speaker or first remote; always keep local in sidebar
    const mainSpeakerId = activeSpeakerId || (totalCount > 1 ? allParticipants.find(id => id !== localSessionId) : localSessionId);
    // Always include everyone except the main stage speaker in the sidebar strip
    // For 2-person calls: local always appears in sidebar even though remote is main stage
    const sidebarParticipants = allParticipants.filter(id => id !== mainSpeakerId);

    return (
      <div className="flex-1 flex flex-col lg:flex-row p-3 sm:p-5 gap-4 overflow-hidden bg-slate-200/30 dark:bg-[#070d12]/50 backdrop-blur-xl">
        {/* Main Stage Area with Specular Bevel & Cinematic Depth */}
        <div className="flex-[3] relative rounded-3xl flex items-center justify-center overflow-hidden border border-slate-300/80 dark:border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.15),inset_0_1px_1px_rgba(255,255,255,0.9)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.22)] bg-gradient-to-b from-slate-900 via-[#0d161d] to-[#080e13] ring-1 ring-black/10 dark:ring-white/10 group">
          {/* Top specular reflection line across stage */}
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 dark:via-white/30 to-transparent pointer-events-none z-30" />
          {showWhiteboard && (
            <CanvasWhiteboard onClose={() => setShowWhiteboard(false)} />
          )}
          {/* Logo removed for clean presentation */}
          {/* Reconnecting overlay */}
          {isReconnecting && (
            <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
              <OrbitLoader size="lg" />
              <p className="text-white font-semibold text-lg">Reconnecting…</p>
              <p className="text-white/60 text-sm">Your connection was interrupted. Hang tight.</p>
            </div>
          )}
          {screens.length > 0 ? (
            screens.map(screen => (
              <ScreenShareTile key={screen.screenId} screen={screen} className="w-full h-full absolute inset-0" />
            ))
          ) : mainSpeakerId ? (
            <ParticipantTile id={mainSpeakerId} isLocal={mainSpeakerId === localSessionId} className="w-full h-full absolute inset-0 !m-0 !border-0 !rounded-none" />
          ) : null}
        </div>
        {/* Participant Sidebar — always visible, even in 2-person calls */}
        <div className="flex-1 lg:max-w-[320px] flex lg:flex-col gap-4 overflow-x-auto lg:overflow-y-auto min-h-[140px] lg:min-h-0 items-center lg:items-stretch content-start">
          {sidebarParticipants.map(id => (
            <ParticipantTile key={id} id={id} isLocal={id === localSessionId} className="w-64 min-w-[16rem] lg:w-full lg:min-w-0 shrink-0 m-0" />
          ))}
          {/* Always show local self-view when we're the only person on screen */}
          {totalCount === 1 && mainSpeakerId === localSessionId && (
            <div className="flex flex-col items-center justify-center gap-2 p-4 text-slate-400 text-sm">
              <Users className="w-8 h-8 opacity-40" />
              <p className="text-center opacity-60">Waiting for others to join…</p>
            </div>
          )}
          {allParticipants.length === 0 && (
            <div key="loader" className="flex items-center justify-center w-full h-full text-slate-400">
              <OrbitLoader size="md" />
            </div>
          )}
        </div>

        {/* Live Captions Overlay */}
        {transcriptData.length > 0 && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-full max-w-xl z-30 pointer-events-none flex flex-col items-center gap-2 px-4">
            {transcriptData.slice(-2).map((cap, idx) => (
              <div key={idx} className="bg-black/40 backdrop-blur-sm text-white px-4 py-2 rounded-xl shadow-lg text-center animate-in slide-in-from-bottom-2 fade-in max-w-full">
                <span className="font-semibold text-primary mr-2 text-sm drop-shadow-md">{cap.name}:</span>
                <span className="text-base font-medium tracking-wide drop-shadow-md">{cap.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  })()}
  </div> {/* End of Video Content Area */}

 {/* Chat Sidebar */}
 {showChat && (
 <div className="w-80 border-l border-slate-200 dark:border-white/10 bg-white dark:bg-[#0d151c] flex flex-col shrink-0 animate-in slide-in-from-right shadow-2xl z-40 transition-colors">
 <div className="h-14 border-b border-primary/40 flex items-center justify-between px-4">
 <h3 className="font-semibold flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Meeting Chat</h3>
 <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 dark:text-muted-foreground hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-accent rounded-full" onClick={() => setShowChat(false)}>
 <PanelRightClose className="w-4 h-4" />
 </Button>
 </div>
 <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
 {chatMessages.map((msg, idx) => (
 <div key={idx} className={`flex flex-col ${msg.from === 'local' ? 'items-end' : 'items-start'}`}>
 <span className="text-[11px] text-[#71717a] dark:text-gray-400 mb-1">{msg.name}</span>
 <div className={`px-3 py-2 rounded-xl max-w-[85%] text-sm ${msg.from === 'local' ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-muted rounded-tl-none'}`}>
 {msg.text}
 </div>
 </div>
 ))}
 {chatMessages.length === 0 && (
 <div className="flex-1 flex items-center justify-center text-[#71717a] dark:text-gray-400 text-sm flex-col gap-2 opacity-50">
 <MessageSquare className="w-8 h-8" />
 <p>No messages yet.</p>
 </div>
 )}
 </div>
 <div className="p-3 border-t border-primary/40 flex gap-2">
 <input 
 type="text" 
 placeholder="Send a message..." 
 className="flex-1 bg-muted/50 rounded-full px-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
 value={chatInput}
 onChange={(e) => setChatInput(e.target.value)}
 onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
 />
 <Button size="icon" className="rounded-full shrink-0" onClick={sendChatMessage} disabled={!chatInput.trim()}>
 <Send className="w-4 h-4" />
 </Button>
 </div>
 </div>
 )}
  {/* AI Sidebar */}
  {(aiResponse || isAiLoading) && !isPipMode && (
    <div className="w-80 border-l border-primary/40 bg-card flex flex-col shrink-0 animate-in slide-in-from-right hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200 z-40">
      <div className="h-14 border-b border-primary/40 flex items-center justify-between px-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" /> Orbit AI
        </h3>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 dark:text-muted-foreground hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-accent rounded-full" onClick={() => { setAiResponse(null); setIsAiLoading(false); }}>
          <PanelRightClose className="w-4 h-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        {isAiLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-70">
            <OrbitLoader size="md" />
            <p className="mt-4 text-sm font-medium">AI is analyzing the conversation...</p>
          </div>
        ) : (
          <div className="text-sm leading-relaxed prose dark:prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: aiResponse }} />
        )}
      </div>
    </div>
  )}
  </div> {/* End of Main Layout Area */}

  {/* Invite Dialog */}
  <Dialog open={showInvite} onOpenChange={setShowInvite}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Invite People</DialogTitle>
        <DialogDescription>
          Share this meeting link or invite participants directly via email.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-6 py-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Copy Link</label>
          <div className="flex gap-2">
            {/* Fix #14: Strip ?t= token from the invite link so it's shareable */}
            <Input readOnly value={window.location.origin + '/join/' + roomUrl.split('/').pop().split('?')[0]} className="bg-muted" />
            <Button variant="secondary" onClick={() => navigator.clipboard.writeText(window.location.origin + '/join/' + roomUrl.split('/').pop().split('?')[0])} className="w-24">
              Copy
            </Button>
          </div>
        </div>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or send email</span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Invite via Email</label>
          <div className="flex gap-2">
            <Input 
              type="email" 
              placeholder="participant@company.com" 
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleInvite(e); }}
            />
            <Button onClick={handleInvite} disabled={isInviteLoading || !inviteEmail.trim()}>
              {isInviteLoading ? "Sending..." : "Send Invite"}
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>

  {/* Settings Dialog */}
  <Dialog open={showSettings} onOpenChange={setShowSettings}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Meeting Settings</DialogTitle>
        <DialogDescription>
          Customize your meeting experience.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-6 py-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Theme Preference</label>
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant={theme === 'light' ? 'default' : 'outline'} 
              onClick={() => changeTheme('light')}
              className="flex items-center justify-center gap-2"
            >
              <Sun className="w-4 h-4" />
              <span>Light Mode</span>
            </Button>
            <Button 
              variant={theme === 'dark' ? 'default' : 'outline'} 
              onClick={() => changeTheme('dark')}
              className="flex items-center justify-center gap-2"
            >
              <Moon className="w-4 h-4" />
              <span>Dark Mode</span>
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Vector Avatar</label>
          <div className="flex flex-wrap gap-2">
            {vectorAvatars.map(url => (
              <button 
                key={url} 
                className={`w-10 h-10 rounded-full overflow-hidden border-2 ${daily?.participants()?.local?.userData && JSON.parse(daily.participants().local.userData || '{}').avatarUrl === url ? 'border-primary' : 'border-transparent'}`}
                onClick={() => daily?.setUserData(JSON.stringify({ avatarUrl: url, avatarColor: null }))}
                title="Choose Avatar"
              >
                <img src={url} alt="Avatar" className="w-full h-full object-cover bg-slate-100 dark:bg-secondary" />
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Color Initial Avatar</label>
          <div className="flex flex-wrap gap-2">
            {avatarColors.map(color => (
              <button 
                key={color} 
                className={`w-10 h-10 rounded-full overflow-hidden border-2 flex items-center justify-center ${color} ${daily?.participants()?.local?.userData && JSON.parse(daily.participants().local.userData || '{}').avatarColor === color ? 'border-primary ring-2 ring-primary ring-offset-2 dark:ring-offset-slate-900' : 'border-transparent'}`}
                onClick={() => daily?.setUserData(JSON.stringify({ avatarUrl: null, avatarColor: color }))}
                title="Choose Color"
              >
                <span className="text-white text-xs font-bold">Aa</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>

 {/* Floating Emojis */}
 {floatingEmojis.map((e) => (
   <div 
     key={e.id} 
     className="absolute bottom-24 text-4xl pointer-events-none z-50 origin-bottom"
     style={{
       left: `calc(50% + ${e.leftOffset}px)`,
       '--rot': `${e.rotation}deg`,
       '--scl': e.scale,
       animation: `floatUpEmoji 3s ease-out forwards`,
       animationDelay: `${e.delay}s`,
       opacity: 0, // start invisible until delay
     }}
   >
     {e.emoji}
   </div>
 ))}
 <style>{`
   @keyframes floatUpEmoji {
     0% { opacity: 0; transform: translate(-50%, 0px) rotate(var(--rot)) scale(var(--scl)); }
     5% { opacity: 1; transform: translate(-50%, -10px) rotate(calc(var(--rot) * 1.2)) scale(calc(var(--scl) * 1.2)); }
     100% { opacity: 0; transform: translate(-50%, -300px) rotate(calc(var(--rot) * 0.5)) scale(var(--scl)); }
   }
 `}</style>

  </div>
  );
}

function ScreenShareTile({ screen, className }) {
 const videoRef = useRef(null);
 const audioRef = useRef(null);

 useEffect(() => {
 if (screen.screenVideo?.track && videoRef.current) {
  videoRef.current.srcObject = new MediaStream([screen.screenVideo.track]);
  videoRef.current.play().catch(() => {});
 }
 }, [screen.screenVideo?.track]);

 useEffect(() => {
 if (!screen.local && screen.screenAudio?.track && audioRef.current) {
  audioRef.current.srcObject = new MediaStream([screen.screenAudio.track]);
  audioRef.current.play().catch(() => {});
 }
 }, [screen.screenAudio?.track, screen.local]);

 return (
 <div className={`relative bg-slate-800 rounded-xl overflow-hidden group flex items-center justify-center ${className || ''}`}>
 {screen.screenVideo?.state === 'playable' ? (
 <video 
 ref={videoRef}
 autoPlay 
 muted={screen.local} 
 playsInline 
 className="w-full h-full object-contain"
 />
 ) : (
 <div className="w-20 h-20 bg-slate-700 rounded-full flex items-center justify-center">
 <MonitorUp className="w-8 h-8 text-slate-400" />
 </div>
 )}
 
 {!screen.local && <audio ref={audioRef} autoPlay />}
 
 <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-lg">
 <span className="text-white text-xs font-semibold tracking-wide">{screen.local ? "Your Screen" : "Shared Screen"}</span>
 </div>
 </div>
 );
}

const avatarColors = [
  'bg-emerald-500', 'bg-blue-500', 'bg-indigo-500', 
  'bg-violet-500', 'bg-fuchsia-500', 'bg-rose-500', 
  'bg-amber-500', 'bg-teal-500', 'bg-cyan-500'
];
const vectorAvatars = Array.from({ length: 10 }, (_, i) => `https://api.dicebear.com/7.x/micah/svg?seed=OptavelUser${i + 1}&backgroundColor=transparent`);
function ParticipantTile({ id, isLocal, className }) {
 const videoState = useVideoTrack(id);
 const audioState = useAudioTrack(id);
 const participant = useParticipant(id);
 const videoRef = useRef(null);
 const audioRef = useRef(null);
 
 const rawName = participant?.user_name || (isLocal ? "You" : "Participant");
 const displayName = rawName
   .replace(/^optavel\//i, '')
   .replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, isLocal ? 'You' : 'Participant')
   .replace(/^[a-z0-9]{10,}$/i, isLocal ? 'You' : 'Participant');
 const initials = (displayName || 'P').substring(0, 2).toUpperCase();
 
 const avatarColor = React.useMemo(() => {
  let hash = 0;
  for (let i = 0; i < displayName.length; i++) {
   hash = displayName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
 }, [displayName]);

  const customAvatarColor = React.useMemo(() => {
   if (participant?.userData) {
     try {
       const data = typeof participant.userData === 'string' ? JSON.parse(participant.userData) : participant.userData;
       if (data?.avatarColor) return data.avatarColor;
     } catch (e) {}
   }
   return null;
  }, [participant?.userData]);

  const customAvatarUrl = React.useMemo(() => {
   if (participant?.userData) {
     try {
       const data = typeof participant.userData === 'string' ? JSON.parse(participant.userData) : participant.userData;
       if (data?.avatarUrl) return data.avatarUrl;
     } catch (e) {}
   }
   return null;
  }, [participant?.userData]);

  const finalAvatarColor = customAvatarColor || avatarColor;

 useEffect(() => {
 if (videoState?.track && videoRef.current) {
  videoRef.current.srcObject = new MediaStream([videoState.track]);
  videoRef.current.play().catch(() => {});
 }
 }, [videoState?.track]);

 useEffect(() => {
 if (!isLocal && audioState?.track && audioRef.current) {
  audioRef.current.srcObject = new MediaStream([audioState.track]);
  audioRef.current.play().catch(() => {});
 }
 }, [audioState?.track, isLocal]);

 const togglePip = async () => {
  if (videoRef.current && document.pictureInPictureEnabled) {
    if (document.pictureInPictureElement === videoRef.current) {
      await document.exitPictureInPicture();
    } else {
      await videoRef.current.requestPictureInPicture();
    }
  }
 };

 const activeSpeakerId = useActiveSpeakerId();
 const isSpeaking = activeSpeakerId === id;
 return (
 <div className={`relative bg-gradient-to-b from-white to-slate-100/90 dark:bg-gradient-to-b dark:from-slate-800/80 dark:to-slate-900/90 rounded-2xl overflow-hidden group flex items-center justify-center aspect-video shadow-[0_4px_16px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.15)] border transition-all duration-300 ${isSpeaking ? 'border-cyan-500 dark:border-cyan-400 ring-2 ring-cyan-500/40 shadow-[0_0_24px_rgba(6,182,212,0.4),inset_0_1px_0_rgba(255,255,255,0.25)]' : 'border-slate-200/90 dark:border-white/10'} ${className || 'w-full max-w-3xl min-w-[320px] m-2'}`}>
 {videoState?.state === 'playable' ? (
 <video 
 ref={videoRef}
 autoPlay 
 muted={isLocal} 
 playsInline 
 className="w-full h-full object-cover"
 />
 ) : customAvatarUrl ? (
 <div className="w-24 h-24 rounded-full flex items-center justify-center shadow-md overflow-hidden">
  <img src={customAvatarUrl} alt={displayName} className="w-full h-full object-cover" />
 </div>
 ) : (
 <div className={`w-24 h-24 ${finalAvatarColor} rounded-full flex items-center justify-center shadow-md`}>
 <span className="text-3xl text-white font-bold tracking-tight">{initials}</span>
 </div>
 )}
 
 {!isLocal && <audio ref={audioRef} autoPlay />}
 
  <div className={`absolute bottom-4 left-4 ${finalAvatarColor} px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm border border-black/10 dark:border-white/10 transition-all z-10`}>
  <span className="text-white text-xs font-bold tracking-wide">{displayName}</span>
  {audioState?.state !== 'playable' && <MicOff className="w-3.5 h-3.5 text-white/90" />}
  </div>

  {videoState?.state === 'playable' && (
    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-20">
      <Button variant="secondary" size="icon" className="w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white border-0" onClick={togglePip} title="Picture in Picture">
        <ExternalLink className="w-4 h-4" />
      </Button>
    </div>
  )}
 </div>
 );
}

// Wrapper to initialize Daily provider
export default function VideoRoom({ roomUrl, userName, token, initialAudio = true, initialVideo = true, initialBackground, onLeave, isPipMode, togglePipMode, spaceId }) {
 const { id: routeId } = useParams();
 const cleanRoomId = routeId ? routeId.replace(/^optavel\//i, '') : '';
 const finalRoomUrl = roomUrl || (cleanRoomId ? `https://optavel.daily.co/${cleanRoomId}` : null);
 const { user } = useAuth();
 const [daily, setDaily] = useState(null);
 // Keep a ref so the cleanup closure always has access to the latest callObject
 // without triggering re-renders on creation
 const callRef = useRef(null);

 useEffect(() => {
  if (!finalRoomUrl) return;

  let cancelled = false;

  const initDaily = async () => {
   if (cancelled) return;

   // Destroy any pre-existing instance to prevent 'Duplicate DailyIframe instances' errors
   try {
    const existing = DailyIframe.getCallInstance();
    if (existing) {
     try { await existing.leave(); } catch (_) {}
     try { existing.destroy(); } catch (_) {}
    }
   } catch (_) {}

   // Also destroy our own tracked ref if it's still around
   if (callRef.current) {
    try { await callRef.current.leave(); } catch (_) {}
    try { callRef.current.destroy(); } catch (_) {}
    callRef.current = null;
   }

   if (cancelled) return;

   const callObject = DailyIframe.createCallObject();
   callRef.current = callObject;

   // Always respect the choices made on the pre-join screen
   const startMic = initialAudio;
   const startCam = initialVideo;
   
   let parsedUrl;
   let finalToken = token;
   let cleanUrl = finalRoomUrl || '';
   try {
     if (finalRoomUrl) { parsedUrl = new URL(finalRoomUrl); } else { parsedUrl = null; }
     const urlToken = parsedUrl.searchParams.get('t');
     if (urlToken) {
       finalToken = finalToken || urlToken;
       // Daily usually wants the clean URL without the token in the 'url' option
       parsedUrl.searchParams.delete('t');
       cleanUrl = parsedUrl.toString();
     }
   } catch (e) {
     console.warn("Invalid room URL", e);
   }

   const joinOpts = { url: cleanUrl, startAudioOff: !startMic, startVideoOff: !startCam };
   if (typeof finalToken === 'string' && finalToken.length > 0) {
    joinOpts.token = finalToken;
   }
   if (typeof userName === 'string' && userName.trim().length > 0) {
    joinOpts.userName = userName.trim();
   }

   try {
    // Fix #2: Do NOT call startCamera() before join() in call-object mode.
    // Daily.co will request camera/mic automatically during join().
    // Calling startCamera() first causes NotAllowedError on many browsers
    // which aborts the whole join flow.

    // Apply noise cancellation as an input setting — this is supported pre-join
    try {
      await callObject.updateInputSettings({
        audio: {
          processor: { type: 'noise-cancellation' },
          settings: {
            echoCancellation: true,
            noiseSuppression: false,
            autoGainControl: false,
          }
        }
      });
    } catch (e) { console.warn("Noise cancellation not supported:", e); }
    
    // Apply background before joining (supported pre-join)
    if (initialBackground && initialBackground.type !== 'none') {
        try {
           if (initialBackground.type === 'background-blur') {
             await callObject.updateInputSettings({ video: { processor: { type: 'background-blur', config: { strength: 0.5 } } } });
           } else {
             await callObject.updateInputSettings({ video: { processor: { type: 'background-image', config: { source: initialBackground.url } } } });
           }
        } catch(e) { console.error("Initial bg fail", e); }
    }

    if (cancelled) return;

    // Join the room — camera/mic are activated here
    await callObject.join(joinOpts);

    // Fix #8: updateSendSettings is now applied in the joined-meeting event
    // inside VideoRoomInner (after join succeeds) — see the useDailyEvent listener

   } catch (joinErr) {
    console.warn('Joining error — attempting fallback join without media settings.', joinErr);
    if (cancelled) return;
    try {
      const joinPayload = { url: cleanUrl, userName: joinOpts.userName, startAudioOff: !startMic, startVideoOff: !startCam };
      if (joinOpts.token) joinPayload.token = joinOpts.token;
      await callObject.join(joinPayload);
    } catch (e) { console.error('Fallback join also failed:', e); }
   }


   if (cancelled) return;
   setDaily(callObject);
    // Log meeting join
    logAuditEvent({ action: 'meeting_created', user, details: `Joined Meeting Room: ${cleanUrl ? cleanUrl.split('/').pop() : 'Unknown'}` });
  };

  initDaily().catch(console.error);

  return () => {
   cancelled = true;
   // Async cleanup: leave + destroy without blocking React
   const cleanup = async () => {
    const obj = callRef.current;
    if (obj) {
     callRef.current = null;
     try { await obj.leave(); } catch (_) {}
     try { obj.destroy(); } catch (_) {}
    }
   };
   cleanup();
   setDaily(null);
  };
 }, [roomUrl, token]);

  if (!daily || !finalRoomUrl) {
   return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-background rounded-xl items-center justify-center gap-4">
      <ClipadLoader size="lg" text="Connecting to secure video server..." />
    </div>
   );
  }

 return (
  <DailyProvider callObject={daily}>
   <VideoRoomInner roomUrl={finalRoomUrl} onLeave={onLeave} isPipMode={isPipMode} togglePipMode={togglePipMode} initialBackground={initialBackground} spaceId={spaceId} initialAudio={initialAudio} initialVideo={initialVideo} />
  </DailyProvider>
 );
}

