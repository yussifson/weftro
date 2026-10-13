import React, { useEffect, useState, useRef, useCallback } from 'react';
import DailyIframe from '@daily-co/daily-js';
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
 useActiveSpeakerId
} from '@daily-co/daily-react';
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, MonitorUp, Sparkles, LayoutGrid, Maximize2, Minimize2, ExternalLink, MessageSquare, Send, X, UserPlus, Mail, Settings, Check, Copy, Smile, PanelRightClose} from 'lucide-react';
import { Button} from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { generateText} from "@/lib/cloudflareAI";
import { useToast} from "@/components/ui/use-toast";
import { OrbitLoader } from "@/components/ui/orbit-loader";
import { useTheme } from "@/lib/ThemeContext";

// Inner component that actually uses the Daily hooks
function VideoRoomInner({ roomUrl, onLeave, isPipMode, togglePipMode}) {
 const { t} = useTranslation();
 const daily = useDaily();
 const localSessionId = useLocalSessionId();
 const participantIds = useParticipantIds();
 const { screens, isSharingScreen, startScreenShare, stopScreenShare} = useScreenShare();
 const localAudioTrack = useAudioTrack(localSessionId);
 const localVideoTrack = useVideoTrack(localSessionId);
 const activeSpeakerId = useActiveSpeakerId();
 
 const [joined, setJoined] = useState(daily ? daily.meetingState() === 'joined-meeting' : false);
 const isMuted = localAudioTrack?.state !== 'playable';
 const isVideoOff = localVideoTrack?.state !== 'playable';
 const { toast} = useToast();
 const [isAiLoading, setIsAiLoading] = useState(false);
 const [aiResponse, setAiResponse] = useState(null);
 const [transcriptData, setTranscriptData] = useState([]);
 const [showSettings, setShowSettings] = useState(false);
 const [showInvite, setShowInvite] = useState(false);
 const [inviteEmail, setInviteEmail] = useState("");
 const [isInviteLoading, setIsInviteLoading] = useState(false);
 const [copiedLink, setCopiedLink] = useState(false);
 const { theme, changeTheme } = useTheme();
 const [showEmojis, setShowEmojis] = useState(false);
 const [floatingEmojis, setFloatingEmojis] = useState([]);
  const EMOJIS = ['👍', '❤️', '👏', '😂', '🎉', '🔥'];
  const [activeBg, setActiveBg] = useState('none');
  const [isApplyingBg, setIsApplyingBg] = useState(false);

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
   navigator.clipboard.writeText(roomUrl);
   setCopiedLink(true);
   toast({ title: "Link Copied", description: "Meeting link copied to clipboard." });
   setTimeout(() => setCopiedLink(false), 2000);
 };

  const handleInvite = async (e) => {
    if (e) e.preventDefault();
    if (!inviteEmail.trim()) return;
    setIsInviteLoading(true);
    try {
      const { NotificationService } = await import('@/api/NotificationService');
      await NotificationService.notifyMeetingInvite(roomUrl, inviteEmail.trim());
      toast({ title: "Invite Sent", description: `Meeting invite securely sent to ${inviteEmail}.` });
      setInviteEmail("");
      setShowInvite(false);
    } catch (error) {
      console.warn("API invite failed, using mailto fallback:", error);
      const subject = encodeURIComponent("You're invited to a video meeting on Orbit");
      const body = encodeURIComponent(`Please join my video meeting using this secure link:\n\n${roomUrl}\n\nPowered by Orbit Intelligence.`);
      window.location.href = `mailto:${inviteEmail.trim()}?subject=${subject}&body=${body}`;
      toast({ title: "Opening Email Client", description: "Could not send via server. Opening your email app to send the invite." });
      setShowInvite(false);
    } finally {
      setIsInviteLoading(false);
    }
  };

  useDailyEvent('joined-meeting', useCallback(() => {
   setJoined(true);
   if (daily) {
     daily.startTranscription().catch(e => console.warn("Transcription couldn't start", e));
   }
  }, [daily]));

  const playSound = (type) => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
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
      console.warn("Audio Playback failed", e);
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

 useDailyEvent('left-meeting', useCallback(() => {
  setJoined(false);
  onLeave();
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
 variant: 'destructive'});
}, [toast]));

 const ensureJoined = () => {
 if (daily && daily.meetingState() === 'joined-meeting') return true;
 toast({
 title: 'Connecting…',
 description: 'Wait until the call has connected before using camera or mic.'});
 return false;
};

  const toggleAudio = async () => {
    if (!ensureJoined()) return;
    try {
      await daily.setLocalAudio(!daily.localAudio());
    } catch (err) {
      console.error(err);
      toast({ title: 'Microphone error', description: err?.message || 'Could not access microphone.', variant: 'destructive'});
    }
  };

  const toggleVideo = async () => {
    if (!ensureJoined()) return;
    try {
      await daily.setLocalVideo(!daily.localVideo());
    } catch (err) {
      console.error(err);
      toast({ title: 'Camera error', description: err?.message || 'Could not access camera.', variant: 'destructive'});
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

 const leaveCall = () => {
 if (!daily) return;
 daily.leave();
};

 // --- REAL-TIME AI TRANSCRIPTION ---
 useEffect(() => {
 if (!joined || isMuted || !window.webkitSpeechRecognition) return;
 
 let recognition;
 try {
 const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
 recognition = new SpeechRecognition();
 recognition.continuous = true;
 recognition.interimResults = false;
 
 recognition.onresult = (event) => {
 const lastResult = event.results[event.results.length - 1];
 if (lastResult.isFinal) {
 const text = lastResult[0].transcript;
 const msg = { type: 'transcription', text, name: 'Me'};
 if (daily) daily.sendAppMessage(msg, '*');
 setTranscriptData(prev => [...prev, { name: 'Me', text}]);
}
};
 
 recognition.start();
} catch (e) {
 console.warn("Speech recognition error:", e);
}
 
 return () => {
 if (recognition) {
 try { recognition.stop();} catch (e) {}
}
};
}, [joined, isMuted, daily]);

 const handleAiAssist = async () => {
   if (transcriptData.length === 0) {
     setAiResponse("No meaningful conversation detected yet. Please make sure your microphone is unmuted and speak clearly to generate a meeting transcript.");
     return;
   }

   setIsAiLoading(true);
   setAiResponse(null);
   toast({ title: "Orbit Meeting AI", description: "Generating meeting summary and action items..."});
   try {
     const meetingContext = transcriptData.map(t => `${t.name}: ${t.text}`).join('\n');

     const messages = [
       { role: 'system', content: 'You are an AI meeting assistant. Summarize the following meeting transcript into concise bullet points, specifically extracting any "Action Items" or decisions made. Format elegantly using basic HTML (like <ul>, <li>, <strong>) but do not use markdown blocks.'},
       { role: 'user', content: meetingContext}
     ];
     let response = await generateText(messages);
     if (typeof response !== 'string') response = response.response || response.text || JSON.stringify(response);
     setAiResponse(response || "Meeting concluded without action items.");
   } catch (err) {
     console.error(err);
     toast({ title: "AI Error", description: "Failed to connect to AI backend.", variant: "destructive"});
   } finally {
     setIsAiLoading(false);
   }
 };

 const handleAiFollowUp = async () => {
   if (transcriptData.length === 0) {
     setAiResponse("Not enough transcript data to draft a follow-up email.");
     return;
   }

   setIsAiLoading(true);
   setAiResponse(null);
   toast({ title: "Orbit Meeting AI", description: "Drafting follow-up email..."});
   try {
     const meetingContext = transcriptData.map(t => `${t.name}: ${t.text}`).join('\n');

     const messages = [
       { role: 'system', content: 'You are an AI assistant. Draft a professional follow-up email to the participants based on the transcript. Include a summary and next steps. Use basic HTML formatting (like <p>, <strong>, <br>) without markdown blocks.'},
       { role: 'user', content: meetingContext}
     ];
     let response = await generateText(messages);
     if (typeof response !== 'string') response = response.response || response.text || JSON.stringify(response);
     setAiResponse(`<strong>Drafted Follow-Up Email:</strong><br/><br/>${response}`);
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
 <div className="flex flex-col h-full bg-slate-50 dark:bg-[#022628] rounded-xl overflow-hidden relative border-[0.5px] border-black/9 dark:border-white/8 border-primary/40 group">
  {/* Realistic Background Layers */}
  <div className="absolute inset-0 pointer-events-none z-0">
    <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-primary/5 dark:bg-primary/10 blur-[120px]" />
    <div className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-blue-500/5 dark:bg-blue-500/10 blur-[120px]" />
  </div>

 {/* Main Layout Area */}
 <div className="relative z-10 flex-1 flex flex-row relative min-w-0 overflow-hidden">
 
 {/* Video Content Area */}
 <div className="flex-1 flex flex-col relative min-w-0">

 {/* PiP Toggle Button */}
 <Button 
 variant="secondary" 
 size="icon" 
 onClick={togglePipMode}
 className="absolute top-2 right-2 z-50 rounded-full w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
 >
 {isPipMode ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
 </Button>

  {/* Video Grid */}
  {(() => {
    const allParticipants = [localSessionId, ...participantIds.filter(id => id !== localSessionId)].filter(Boolean);
    const mainSpeakerId = activeSpeakerId || (allParticipants.length > 1 ? allParticipants.find(id => id !== localSessionId) : localSessionId);
    const sidebarParticipants = allParticipants.filter(id => id !== mainSpeakerId);

    return (
      <div className="flex-1 flex flex-col lg:flex-row p-4 gap-4 overflow-hidden bg-white/30 dark:bg-black/20 backdrop-blur-sm">
        {/* Main Stage Area */}
        <div className="flex-[3] relative rounded-2xl flex items-center justify-center overflow-hidden border border-slate-200 dark:border-white/10 shadow-inner bg-slate-900">
          {screens.length > 0 ? (
            screens.map(screen => (
              <ScreenShareTile key={screen.screenId} screen={screen} className="w-full h-full absolute inset-0" />
            ))
          ) : mainSpeakerId ? (
            <ParticipantTile id={mainSpeakerId} isLocal={mainSpeakerId === localSessionId} className="w-full h-full absolute inset-0 !m-0 !border-0 !rounded-none" />
          ) : null}
        </div>
        {/* Participant Sidebar */}
        <div className="flex-1 lg:max-w-[320px] flex lg:flex-col gap-4 overflow-x-auto lg:overflow-y-auto min-h-[140px] lg:min-h-0 items-center lg:items-stretch content-start">
          {sidebarParticipants.map(id => (
            <ParticipantTile key={id} id={id} isLocal={id === localSessionId} className="w-64 min-w-[16rem] lg:w-full lg:min-w-0 shrink-0 m-0" />
          ))}
          {allParticipants.length === 0 && (
            <div key="loader" className="flex items-center justify-center w-full h-full text-slate-400">
              <OrbitLoader size="md" />
            </div>
          )}
        </div>
      </div>
    );
  })()}
  </div> {/* End of Video Content Area */}

 {/* Chat Sidebar */}
 {showChat && (
 <div className="w-80 border-l border-primary/40 bg-white/80 dark:bg-black/60 backdrop-blur-md flex flex-col shrink-0 animate-in slide-in-from-right hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200 z-40">
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
    <div className="w-80 border-l border-primary/40 bg-white/80 dark:bg-black/60 backdrop-blur-md flex flex-col shrink-0 animate-in slide-in-from-right hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200 z-40">
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
            <Input readOnly value={roomUrl} className="bg-muted" />
            <Button variant="secondary" onClick={() => navigator.clipboard.writeText(roomUrl)} className="w-24">
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
 <div className={`relative z-10 bg-white/80 dark:bg-black/60 backdrop-blur-md border-t border-primary/40 flex items-center justify-center transition-all ${isPipMode ? 'h-12 px-2 gap-2' : 'h-20 px-6 gap-4'}`}>
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
     className={`${isPipMode ? 'w-8 h-8' : 'w-12 h-12'} rounded-full`}
   >
     <Smile className={isPipMode ? "w-3 h-3" : "w-5 h-5"} />
   </Button>
 </div>
 <Button 
 onClick={toggleAudio}
 variant={isMuted ? "destructive" : "secondary"}
 size="icon"
 className={`${isPipMode ? 'w-8 h-8' : 'w-12 h-12'} rounded-full`}
 >
 {isMuted ? <MicOff className={isPipMode ? "w-3 h-3" : "w-5 h-5"} /> : <Mic className={isPipMode ? "w-3 h-3" : "w-5 h-5"} />}
 </Button>
 <Button 
 onClick={toggleVideo}
 variant={isVideoOff ? "destructive" : "secondary"}
 size="icon"
 className={`${isPipMode ? 'w-8 h-8' : 'w-12 h-12'} rounded-full`}
 >
 {isVideoOff ? <VideoOff className={isPipMode ? "w-3 h-3" : "w-5 h-5"} /> : <VideoIcon className={isPipMode ? "w-3 h-3" : "w-5 h-5"} />}
 </Button>
 {!isPipMode && (
 <>
 <Button 
 onClick={toggleScreenShare}
 variant={isSharingScreen ? "default" : "secondary"}
 size="icon"
 className="w-12 h-12 rounded-full hidden sm:flex"
 >
 <MonitorUp className="w-5 h-5" />
 </Button>
 <Button 
 onClick={() => setShowChat(!showChat)}
 variant={showChat ? "default" : "secondary"}
 size="icon"
 className="w-12 h-12 rounded-full hidden sm:flex relative"
 title="Chat"
 >
 <MessageSquare className="w-5 h-5" />
 </Button>
  <Button 
  onClick={() => setShowInvite(true)}
  variant="secondary"
  size="icon"
  className="w-12 h-12 rounded-full hidden sm:flex relative"
  title="Invite People"
  >
  <UserPlus className="w-5 h-5" />
  </Button>
  <Button 
  onClick={() => setShowSettings(true)}
  variant="secondary"
  size="icon"
  className="w-12 h-12 rounded-full hidden sm:flex relative"
  title="Settings"
  >
  <Settings className="w-5 h-5" />
  </Button>
 <Button 
  variant="secondary"
  onClick={handleAiAssist}
  disabled={isAiLoading}
  className="h-12 px-5 rounded-full font-semibold gap-2 hover:bg-primary hover:text-primary-foreground transition-colors"
 >
  <Sparkles className="w-4 h-4" /> {isAiLoading ? "Processing..." : "AI Notes"}
 </Button>
 <Button 
  variant="secondary"
  onClick={handleAiFollowUp}
  disabled={isAiLoading}
  className="h-12 px-5 rounded-full font-semibold gap-2 hover:bg-primary hover:text-primary-foreground transition-colors hidden lg:flex"
 >
  <Mail className="w-4 h-4" /> AI Follow-Up
 </Button>
 </>
 )}
 <Button 
 onClick={leaveCall}
 variant="destructive"
 className={`${isPipMode ? 'h-8 w-8 p-0' : 'h-12 px-8 ml-4'} rounded-full font-semibold flex items-center justify-center`}
 >
 {isPipMode ? <PhoneOff className="w-3 h-3" /> : <><PhoneOff className="w-5 h-5 mr-2" /> Leave</>}
 </Button>
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
}
}, [screen.screenVideo?.track]);

 useEffect(() => {
 if (!screen.local && screen.screenAudio?.track && audioRef.current) {
 audioRef.current.srcObject = new MediaStream([screen.screenAudio.track]);
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
 
 {!screen.local && <audio ref={audioRef} autoPlay playsInline />}
 
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

const VIRTUAL_BACKGROUNDS = [
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
}
}, [videoState?.track]);

 useEffect(() => {
 if (!isLocal && audioState?.track && audioRef.current) {
 audioRef.current.srcObject = new MediaStream([audioState.track]);
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

 return (
 <div className={`relative bg-white dark:bg-card rounded-2xl overflow-hidden group flex items-center justify-center aspect-video shadow-md border border-slate-200 dark:border-white/10 ${className || 'w-full max-w-3xl min-w-[320px] m-2'}`}>
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
 
 {!isLocal && <audio ref={audioRef} autoPlay playsInline />}
 
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
export default function VideoRoom({ roomUrl, token, onLeave, isPipMode, togglePipMode, userName, initialAudio = true, initialVideo = true }) {
 const [daily, setDaily] = useState(null);
 // Keep a ref so the cleanup closure always has access to the latest callObject
 // without triggering re-renders on creation
 const callRef = useRef(null);

 useEffect(() => {
  if (!roomUrl) return;

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

   const callObject = DailyIframe.createCallObject({
    dailyConfig: {
      experimentalGetUserMediaConstraintsModifier: (constraints) => {
        if (constraints.audio) {
          constraints.audio.noiseSuppression = true;
          constraints.audio.echoCancellation = true;
          constraints.audio.autoGainControl = true;
        }
        if (constraints.video) {
          constraints.video.width = { ideal: 1280 };
          constraints.video.height = { ideal: 720 };
        }
        return constraints;
      }
    }
   });
   callRef.current = callObject;

   const joinOpts = { url: roomUrl, audioSource: initialAudio, videoSource: initialVideo };
   if (typeof token === 'string' && token.length > 0) {
    joinOpts.token = token;
   }
   if (typeof userName === 'string' && userName.trim().length > 0) {
    joinOpts.userName = userName.trim();
   }

   try {
    await callObject.startCamera();
    if (cancelled) return;
    await callObject.join(joinOpts);
   } catch (camErr) {
    console.warn('Camera/Mic permission denied or joining error.', camErr);
    if (cancelled) return;
    try { await callObject.join({ url: roomUrl, userName: joinOpts.userName, token: joinOpts.token }); } catch (e) { console.error(e); }
   }

   if (cancelled) return;
   setDaily(callObject);
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

  if (!daily || !roomUrl) {
   return (
    <div className="flex flex-col h-full bg-white dark:bg-background rounded-xl items-center justify-center gap-4">
     <div className="w-16 h-16 relative flex items-center justify-center">
      <div className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-white/5" />
      <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      <VideoIcon className="w-6 h-6 text-primary" />
     </div>
     <p className="text-slate-500 dark:text-muted-foreground font-medium tracking-wide animate-pulse">Connecting to secure video server...</p>
    </div>
   );
  }

 return (
  <DailyProvider callObject={daily}>
   <VideoRoomInner roomUrl={roomUrl} onLeave={onLeave} isPipMode={isPipMode} togglePipMode={togglePipMode} />
  </DailyProvider>
 );
}


