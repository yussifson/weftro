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
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, MonitorUp, Sparkles, ExternalLink, MessageSquare, Send, UserPlus, Mail, Settings, Smile, PanelRightClose, PenTool, MoreHorizontal, Wifi, WifiOff, Users } from 'lucide-react';
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

// Fix #17: EMOJIS constant outside component â€” avoids recreation on every render
const EMOJIS = ['ðŸ‘', 'â¤ï¸', 'ðŸ‘', 'ðŸ˜‚', 'ðŸŽ‰', 'ðŸ”¥'];

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
 const [showEmojis, setShowEmojis] = useState(false);
 const [floatingEmojis, setFloatingEmojis] = useState([]);
  // Fix #3: Network reconnection state
  const [isReconnecting, setIsReconnecting] = useState(false);
  // Add: Connection quality indicator ('good' | 'low' | 'very-low')
  const [networkQuality, setNetworkQuality] = useState('good');
  // Fix #18: Single AudioContext ref â€” reuse across join/leave sounds
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
          subject: "You're invited to a video meeting on CliPad",
          html: `<p>Please join my video meeting using this secure link:</p><p><a href="${properLink}">${properLink}</a></p><p>Powered by CliPad Intelligence.</p>`
        }
      });
      
      // If error (or function doesn't exist), throw to trigger fallback
      if (error) throw error;

      toast({ title: "Invite Sent", description: `Meeting invite securely sent to ${inviteEmail}.` });
      setInviteEmail("");
      setShowInvite(false);
    } catch (error) {
      console.warn("API invite failed, using mailto fallback:", error);
      const subject = encodeURIComponent("You're invited to a video meeting on CliPad");
      const body = encodeURIComponent(`Please join my video meeting using this secure link:\n\n${properLink}\n\nPowered by CliPad Intelligence.`);
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
   // Enforce the pre-join mic/camera choices â€” Daily sometimes ignores startAudioOff/startVideoOff
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
   // Only attempt cloud transcription â€” silent failure is fine if not enabled
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
     toast({ title: 'âš ï¸ Connection Lost', description: 'Attempting to reconnectâ€¦', variant: 'destructive' });
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
     title: 'Connectingâ€¦',
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
          const meetingData = {
            title: meetingTitle,
            daily_room_name: roomUrl.split('/').pop().split('?')[0] || 'room',
            host_id: user?.id || null,
            company_id: user?.company_id || null, // Fix #3 â€” needed for RLS and teammate visibility
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
            // Run AI summary in background â€” always update the record, even on failure
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

          
          daily.leave();
          const basePath = window.location.pathname.startsWith('/clipad') ? '/clipad' : '';
          if (insertedMeeting) {
            // Always navigate to save page using the real UUID from the DB record
            navigate(`${basePath}/save-meeting/${insertedMeeting.id}${spaceId ? `?spaceId=${spaceId}` : ''}`);
          } else {
            // Insert failed â€” let the caller (e.g. StandaloneMeeting) decide where to go
            toast({ title: 'Meeting ended', description: 'Could not save record. Please check your connection.', variant: 'destructive' });
            if (onLeave) onLeave(null);
          }
          return;
        }
      } catch (e) {
        console.error('Failed to save meeting record:', e);
        // On unexpected error, still call onLeave so the UI isn't stuck
        daily.leave();
        if (onLeave) onLeave(null);
        return;
      }
    }
    
    daily.leave();
    if (onLeave) onLeave(null);
  };

 // Fix #7: Real-time transcription â€” cross-browser (Chrome + Firefox fallback)
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
    toast({ title: "CliPad AI", description: "Generating meeting summary and action items..."});
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
    toast({ title: "CliPad AI", description: "Drafting follow-up email..."});
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
 <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0B1121] rounded-xl overflow-hidden relative border-[0.5px] border-black/9 dark:border-white/8 border-primary/40 group font-sans">
  {/* Realistic Background Layers */}
  <div className="absolute inset-0 pointer-events-none z-0">
    <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-primary/5 dark:bg-primary/10 blur-[120px]" />
    <div className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-blue-500/5 dark:bg-blue-500/10 blur-[120px]" />
  </div>

 {/* Main Layout Area */}
 <div className="relative z-10 flex-1 flex flex-row relative min-w-0 overflow-hidden">
 
 {/* Video Content Area */}
 <div className="flex-1 flex flex-col relative min-w-0">



  {/* Recording Status Indicator */}
  {isRecording && (
    <div className="absolute top-4 left-4 z-50 flex items-center gap-2">
      {/* Premium minimalist recording indicator */}
      <div className="flex items-center gap-2.5 bg-black/60 backdrop-blur-xl border border-white/10 text-white px-4 py-2 rounded-full shadow-2xl">
        {/* Pulsing dot */}
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
        </span>
        {/* Timer */}
        <span className="font-mono text-sm font-medium tracking-widest tabular-nums">
          {Math.floor(recordingSeconds / 60).toString().padStart(2, '0')}:{(recordingSeconds % 60).toString().padStart(2, '0')}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-red-400 opacity-90">REC</span>
      </div>
    </div>
  )}

  {/* Waiting Room UI */}
  {waitingIds.length > 0 && (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-card px-5 py-4 rounded-2xl shadow-2xl border border-primary/30 animate-in slide-in-from-top flex flex-col gap-3 min-w-[320px]">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{waitingIds.length} guest(s) waiting to join</h4>
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
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" onClick={() => denyParticipant(id)}>âœ•</Button>
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
      <div className="flex-1 flex flex-col lg:flex-row p-4 gap-4 overflow-hidden bg-white/30 dark:bg-black/20 backdrop-blur-sm">
        {/* Main Stage Area */}
        <div className="flex-[3] relative rounded-2xl flex items-center justify-center overflow-hidden border border-slate-200 dark:border-white/10 shadow-inner bg-slate-900">
          {showWhiteboard && (
            <CanvasWhiteboard onClose={() => setShowWhiteboard(false)} />
          )}
          {isBranded && (
            <div className="absolute top-6 left-6 z-40 flex items-center gap-2 opacity-80 select-none pointer-events-none bg-black/30 px-3 py-1.5 rounded-xl backdrop-blur-md border border-white/10">
              <CliPadLogo size={18} className="text-white drop-shadow-md" />
            </div>
          )}
          {/* Reconnecting overlay */}
          {isReconnecting && (
            <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
              <OrbitLoader size="lg" />
              <p className="text-white font-semibold text-lg">Reconnectingâ€¦</p>
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
        {/* Participant Sidebar â€” always visible, even in 2-person calls */}
        <div className="flex-1 lg:max-w-[320px] flex lg:flex-col gap-4 overflow-x-auto lg:overflow-y-auto min-h-[140px] lg:min-h-0 items-center lg:items-stretch content-start">
          {sidebarParticipants.map(id => (
            <ParticipantTile key={id} id={id} isLocal={id === localSessionId} className="w-64 min-w-[16rem] lg:w-full lg:min-w-0 shrink-0 m-0" />
          ))}
          {/* Always show local self-view when we're the only person on screen */}
          {totalCount === 1 && mainSpeakerId === localSessionId && (
            <div className="flex flex-col items-center justify-center gap-2 p-4 text-slate-400 text-sm">
              <Users className="w-8 h-8 opacity-40" />
              <p className="text-center opacity-60">Waiting for others to joinâ€¦</p>
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
 <div className="w-80 border-l border-primary/40 bg-card flex flex-col shrink-0 animate-in slide-in-from-right hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200 z-40">
 <div className="h-14 border-b border-primary/40 flex items-center justify-between px-4">
 <h3 className="font-semibold flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Meeting Chat</h3>
 <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full" onClick={() => setShowChat(false)}>
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
        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full" onClick={() => { setAiResponse(null); setIsAiLoading(false); }}>
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
          <label className="text-sm font-medium">Theme Preference</label>
          <div className="grid grid-cols-2 gap-4">
            <Button variant={theme === 'light' ? 'default' : 'outline'} onClick={() => changeTheme('light')}>Light Mode</Button>
            <Button variant={theme === 'dark' ? 'default' : 'outline'} onClick={() => changeTheme('dark')}>Dark Mode</Button>
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

 {/* Control Bar */}
 <div className={`relative z-10 w-full max-w-full px-2 sm:px-0 sm:max-w-fit mx-auto mb-4 sm:mb-6`}>
   {/* Network quality + participant count bar */}
   {!isPipMode && (
     <div className="flex items-center justify-between px-4 mb-1 text-xs text-slate-500 dark:text-slate-400">
       <div className="flex items-center gap-1.5">
         {networkQuality === 'very-low' ? (
           <WifiOff className="w-3.5 h-3.5 text-red-500" />
         ) : networkQuality === 'low' ? (
           <Wifi className="w-3.5 h-3.5 text-yellow-500" />
         ) : (
           <Wifi className="w-3.5 h-3.5 text-green-500" />
         )}
         <span className={networkQuality === 'very-low' ? 'text-red-500' : networkQuality === 'low' ? 'text-yellow-500' : 'text-green-500'}>
           {networkQuality === 'very-low' ? 'Poor connection' : networkQuality === 'low' ? 'Weak signal' : 'Connected'}
         </span>
       </div>
       <div className="flex items-center gap-1">
         <Users className="w-3.5 h-3.5" />
         <span>{participantIds.length + 1} in call</span>
       </div>
     </div>
   )}
   <div className={`bg-white/80 dark:bg-card/80 backdrop-blur-3xl border border-white/60 dark:border-white/10 flex items-center justify-start sm:justify-center transition-all shadow-2xl rounded-3xl sm:rounded-full overflow-x-auto no-scrollbar ${isPipMode ? 'h-14 px-3 gap-2' : 'h-[72px] sm:h-[80px] px-4 sm:px-6 gap-2 sm:gap-4'}`}>
 <div className="relative">
   {showEmojis && (
     <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 bg-card border border-primary/20 shadow-xl rounded-full px-4 py-3 flex gap-3 animate-in fade-in slide-in-from-bottom-4 z-50">
       {EMOJIS.map(emoji => (
         <button 
           key={emoji} 
           onClick={() => sendReaction(emoji)}
           className="text-2xl hover:scale-125 transition-transform origin-bottom"
         >
           {emoji}
         </button>
       ))}
     </div>
   )}
   <Button 
     onClick={() => setShowEmojis(!showEmojis)}
     variant={showEmojis ? "default" : "secondary"}
     size="icon"
     className={`${isPipMode ? 'w-10 h-10' : 'w-12 h-12 sm:w-14 sm:h-14 shrink-0'} rounded-[1.25rem] shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5`}
   >
     <Smile className={isPipMode ? "w-3 h-3" : "w-5 h-5"} />
   </Button>
 </div>
 <Button 
 onClick={toggleAudio}
 variant={isMuted ? "destructive" : "secondary"}
 size="icon"
 className={`${isPipMode ? 'w-10 h-10' : 'w-12 h-12 sm:w-14 sm:h-14 shrink-0'} rounded-[1.25rem] shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 ${isMuted ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-white dark:bg-secondary border border-slate-200 dark:border-border text-slate-700 dark:text-foreground'}`}
 >
 {isMuted ? <MicOff className={isPipMode ? "w-3 h-3" : "w-5 h-5"} /> : <Mic className={isPipMode ? "w-3 h-3" : "w-5 h-5"} />}
 </Button>
 <Button 
 onClick={toggleVideo}
 variant={isVideoOff ? "destructive" : "secondary"}
 size="icon"
 className={`${isPipMode ? 'w-10 h-10' : 'w-12 h-12 sm:w-14 sm:h-14 shrink-0'} rounded-[1.25rem] shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 ${isVideoOff ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-white dark:bg-secondary border border-slate-200 dark:border-border text-slate-700 dark:text-foreground'}`}
 >
 {isVideoOff ? <VideoOff className={isPipMode ? "w-3 h-3" : "w-5 h-5"} /> : <VideoIcon className={isPipMode ? "w-3 h-3" : "w-5 h-5"} />}
 </Button>
  {!isPipMode && (
  <>
  <Button 
    onClick={() => setShowMobileMenu(!showMobileMenu)}
    variant={showMobileMenu ? "default" : "outline"}
    size="icon"
    className={`sm:hidden w-12 h-12 shrink-0 rounded-[1.25rem] shadow-sm transition-all ${showMobileMenu ? '' : 'bg-white dark:bg-secondary border-slate-200 dark:border-border text-slate-700 dark:text-foreground'}`}
    title="More Options"
  >
    <MoreHorizontal className="w-5 h-5" />
  </Button>
  <div className={`${showMobileMenu ? 'absolute bottom-[calc(100%+1rem)] left-4 right-4 bg-white/95 dark:bg-card/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-2xl rounded-3xl p-4 flex flex-wrap justify-center gap-3 z-50 animate-in fade-in slide-in-from-bottom-4' : 'hidden'} sm:flex sm:static sm:bg-transparent sm:border-0 sm:shadow-none sm:p-0 sm:flex-row sm:flex-nowrap items-center gap-2 sm:gap-4`}>
 <Button 
 onClick={toggleScreenShare}
 variant={isSharingScreen ? "default" : "outline"}
 size="icon"
 className={`w-12 h-12 shrink-0 rounded-full flex shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 ${isSharingScreen ? '' : 'bg-white dark:bg-secondary border-slate-200 dark:border-border'}`}
 title="Share Screen"
 >
 <MonitorUp className="w-5 h-5" />
 </Button>
 <Button 
 onClick={() => setShowWhiteboard(!showWhiteboard)}
 variant={showWhiteboard ? "default" : "outline"}
 size="icon"
 className={`w-12 h-12 shrink-0 rounded-full flex shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 ${showWhiteboard ? '' : 'bg-white dark:bg-secondary border-slate-200 dark:border-border'}`}
 title="Whiteboard"
 >
 <PenTool className="w-5 h-5" />
 </Button>
 <Button 
 onClick={() => setShowChat(!showChat)}
 variant={showChat ? "default" : "outline"}
 size="icon"
 className={`w-12 h-12 shrink-0 rounded-full flex shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 ${showChat ? '' : 'bg-white dark:bg-secondary border-slate-200 dark:border-border'}`}
 title="Chat"
 >
 <MessageSquare className="w-5 h-5" />
 </Button>
  <Button 
  onClick={() => setShowInvite(true)}
  variant="outline"
  size="icon"
  className="w-12 h-12 shrink-0 rounded-full flex shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 bg-white dark:bg-secondary border-slate-200 dark:border-border text-slate-700 dark:text-foreground"
  title="Invite People"
  >
  <UserPlus className="w-5 h-5" />
  </Button>
  <Button 
  onClick={async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        toast({ title: 'Recording Stopped', description: 'Processing and saving your recording to the secure cloud...' });
      }
    } else {
      try {
        // --- STORAGE LIMIT CHECK ---
        const maxStorageGB = getLimit(user, 'maxStorageGB') || 2;
        const firstDayOfMonth = new Date();
        firstDayOfMonth.setDate(1);
        firstDayOfMonth.setHours(0, 0, 0, 0);
        
        const { data: vids } = await supabase
          .from('clipad_videos')
          .select('duration_seconds')
          .eq('creator_id', user.id)
          .gte('created_at', firstDayOfMonth.toISOString());
        if (vids) {
          const totalSeconds = vids.reduce((acc, curr) => acc + (curr.duration_seconds || 0), 0);
          const totalGB = (totalSeconds * 0.25) / 1024;
          if (maxStorageGB !== Infinity && totalGB >= maxStorageGB) {
            toast({ title: 'Storage Limit Reached', description: `You have used your ${maxStorageGB}GB monthly limit. Upgrade to record more.`, variant: 'destructive' });
            return;
          }
        }
        // ---------------------------
        
        let displayStream;
        const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (!isMobileDevice && navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        } else {
          // Mobile fallback: use front camera + mic instead of screen capture
          toast({ title: 'Camera Recording', description: 'Screen recording is not available on mobile. Recording from camera instead.', variant: 'default' });
          displayStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true });
        }
        let micStream;
        if (!isMobileDevice) {
          try {
            micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          } catch (e) {
            console.warn("No microphone access, recording without mic audio.", e);
          }
        }

        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const dest = audioContext.createMediaStreamDestination();

        if (displayStream.getAudioTracks().length > 0) {
          const displaySource = audioContext.createMediaStreamSource(displayStream);
          displaySource.connect(dest);
        }
        if (micStream && micStream.getAudioTracks().length > 0) {
          const micSource = audioContext.createMediaStreamSource(micStream);
          micSource.connect(dest);
        }

        const combinedStream = new MediaStream([
          ...displayStream.getVideoTracks(),
          ...dest.stream.getTracks()
        ]);

        recordedChunksRef.current = [];
        
        let options = { mimeType: 'video/webm' };
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
          options.mimeType = 'video/webm; codecs=vp9,opus';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
          options.mimeType = 'video/webm; codecs=vp8,opus';
        }
        
        const mediaRecorder = new MediaRecorder(combinedStream, options);
        
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            recordedChunksRef.current.push(e.data);
          }
        };
        
        mediaRecorder.onstop = async () => {
          setIsUploading(true);
          try {
            const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
            const fileName = `meetings/${user?.id || 'anon'}_${Date.now()}.webm`;
            const { error } = await db.storage.from('clipad_videos').upload(fileName, blob, { contentType: 'video/webm' });
            if (error) throw error;
            const { data } = db.storage.from('clipad_videos').getPublicUrl(fileName);
            if (data?.publicUrl) {
              const videoUrl = data.publicUrl;
              setMeetingVideoUrl(videoUrl);
              meetingVideoUrlRef.current = videoUrl;

              // Insert into clipad_videos so we can attach comments and reactions to it!
              try {
                await db.from('clipad_videos').insert({
                  user_id: user?.id,
                  space_id: spaceId,
                  title: 'Live Meeting Recording',
                  description: 'Meeting recording uploaded automatically.',
                  video_url: videoUrl,
                  is_public: true
                });
              } catch (err) {
                console.error("Failed to insert into clipad_videos", err);
              }

              toast({ title: 'Recording Saved', description: 'Video has been successfully uploaded.' });
              logAuditEvent({ action: 'video_recorded', user, details: 'Recorded Live Meeting' });
            }
          } catch (e) {
            console.error(e);
            toast({ title: 'Recording Error', description: 'Failed to upload video.', variant: 'destructive' });
          } finally {
            setIsUploading(false);
          }
          displayStream.getTracks().forEach(track => track.stop());
          if (micStream) micStream.getTracks().forEach(track => track.stop());
          audioContext.close();
        };
        
        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start();
        setIsRecording(true);
        toast({ title: 'Recording Started', description: 'Meeting is now being recorded locally.' });
        
        displayStream.getVideoTracks()[0].onended = () => {
          if (mediaRecorderRef.current.state !== 'inactive') {
             mediaRecorderRef.current.stop();
             setIsRecording(false);
          }
        };
      } catch (err) {
        console.error("Failed to start screen recording:", err);
        toast({ title: 'Recording Error', description: 'Could not access screen share for recording.', variant: 'destructive' });
      }
    }
  }}
  variant={isRecording ? "destructive" : "outline"}
  size="icon"
  className={`w-12 h-12 shrink-0 rounded-full flex shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 ${isRecording ? 'animate-pulse' : 'bg-white dark:bg-secondary border-slate-200 dark:border-border text-slate-700 dark:text-foreground'}`}
  title="Record Meeting"
  >
  <VideoIcon className="w-5 h-5" />
  </Button>
  <Button 
  onClick={() => setShowSettings(true)}
  variant="outline"
  size="icon"
  className="w-12 h-12 shrink-0 rounded-full flex shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 bg-white dark:bg-secondary border-slate-200 dark:border-border text-slate-700 dark:text-foreground"
  title="Settings"
  >
  <Settings className="w-5 h-5" />
  </Button>

  {/* Advanced Noise Filtering */}
  <Button 
  onClick={async () => {
    try {
      const isCurrentlyEnabled = daily.getInputSettings()?.audio?.processor?.type === 'noise-cancellation';
      await daily.updateInputSettings({
        audio: {
          processor: { type: isCurrentlyEnabled ? 'none' : 'noise-cancellation' },
          settings: {
            echoCancellation: true,
            noiseSuppression: isCurrentlyEnabled,
            autoGainControl: isCurrentlyEnabled,
          }
        }
      });
      setIsStudioAudioOn(!isCurrentlyEnabled);
      toast({ title: 'Audio Settings Updated', description: `Studio Noise Cancellation is now ${isCurrentlyEnabled ? 'OFF' : 'ON'}` });
    } catch(e) {
      toast({ title: 'Action Failed', description: 'Your browser may not support advanced audio processing.', variant: 'destructive' });
    }
  }}
  variant={isStudioAudioOn ? "default" : "outline"}
  size="icon"
  className={`w-12 h-12 shrink-0 rounded-full flex shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 relative group ${isStudioAudioOn ? 'bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]' : 'bg-white dark:bg-secondary border-slate-200 dark:border-border text-slate-700 dark:text-foreground'}`}
  title="Studio Audio"
  >
  <Sparkles className="w-5 h-5" />
  <span className="absolute -top-2 -right-2 bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">PRO</span>
  </Button>
 <Button 
  variant="default"
  onClick={handleAiAssist}
  disabled={isAiLoading}
  className="h-12 px-3 sm:h-14 sm:px-6 shrink-0 rounded-[1.25rem] font-semibold text-sm sm:text-base flex items-center gap-2 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all hover:-translate-y-0.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white"
 >
  <Sparkles className="w-4 h-4" /> {isAiLoading ? "Processing..." : "AI Notes"}
 </Button>
 <Button 
  variant="secondary"
  onClick={handleAiFollowUp}
  disabled={isAiLoading}
  className="h-12 px-3 sm:px-5 shrink-0 rounded-full font-semibold text-sm sm:text-base flex items-center gap-2 hover:bg-primary hover:text-primary-foreground transition-colors"
 >
  <Mail className="w-4 h-4" /> AI Follow-Up
 </Button>
 </div>
 </>
 )}
 <Button 
 onClick={leaveCall}
 variant="destructive"
 className={`${isPipMode ? 'h-10 w-10 p-0 rounded-xl' : 'h-12 px-4 sm:h-14 sm:px-8 shrink-0 rounded-[1.25rem]'} font-bold text-sm sm:text-base flex items-center justify-center shadow-lg shadow-red-500/20 hover:shadow-red-500/40 transition-all hover:-translate-y-0.5 bg-red-500 hover:bg-red-600 text-white`}
 >
 {isPipMode ? <PhoneOff className="w-3 h-3" /> : <><PhoneOff className="w-5 h-5 mr-2" /> Leave</>}
 </Button>
 </div>
 </div>
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
 
 const displayName = participant?.user_name || (isLocal ? "You" : "Participant");
 const initials = displayName.substring(0, 2).toUpperCase();
 
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
 <div className={`relative bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-3xl overflow-hidden group flex items-center justify-center aspect-video shadow-xl border transition-all duration-300 ${isSpeaking ? 'border-primary ring-4 ring-primary/40 shadow-[0_0_30px_rgba(var(--primary),0.3)]' : 'border-white/50 dark:border-white/5'} ${className || 'w-full max-w-3xl min-w-[320px] m-2'}`}>
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
 const finalRoomUrl = roomUrl || (routeId ? `https://optavel.daily.co/${routeId}` : null);
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

    // Apply noise cancellation as an input setting â€” this is supported pre-join
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

    // Join the room â€” camera/mic are activated here
    await callObject.join(joinOpts);

    // Fix #8: updateSendSettings is now applied in the joined-meeting event
    // inside VideoRoomInner (after join succeeds) â€” see the useDailyEvent listener

   } catch (joinErr) {
    console.warn('Joining error â€” attempting fallback join without media settings.', joinErr);
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

