import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
  Camera, Monitor, Mic, MicOff, CheckCircle,
  Play, Pause, AlertCircle, RefreshCw, XCircle, ArrowLeft,
  Wand2, AlignLeft, Clock, Upload, RotateCcw, Sparkles, Lock, Unlock, ChevronDown, Download
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/api/supabaseClient';
import { createCapture } from '@/lib/clipadCaptureService';
import { contextualizeCapture } from '@/lib/clipadContextualizationService';
import { generateText } from '@/lib/cloudflareAI';
import { detectDecisions, detectCommitments, writeOrgEvent } from '@/lib/clipadIntelligence';
import { useAuth } from '@/lib/AuthContext';
import { getPlanLimits, getUserPlan, getLimit } from '@/lib/clipadPricing';
import PaywallModal from '@/components/clipad/PaywallModal';
import { useNavigate, useParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import * as tus from 'tus-js-client';
import { playAlertSound } from '@/lib/audioAlerts';


const MODES = [
  { id: 'screen_camera', icon: Monitor, label: 'Screen + Camera', desc: 'Picture-in-picture: screen with your face overlay' },
  { id: 'camera_only', icon: Camera, label: 'Camera Only', desc: 'Just your webcam, no screen recording' },
  { id: 'screen_only', icon: Monitor, label: 'Screen Only', desc: 'Screen and system audio, no camera' },
];

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}


const DB_NAME = 'ClipadRecordingsDB';
const DB_VERSION = 1;
const STORE_NAME = 'recordings';

const openDB = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = (e) => {
    e.target.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

let lastIDBSaveMap = new Map();

// Fix #7 — expose a toast callback so the IDB saver can warn the user
let _idbQuotaToastFn = null;
export function _setIdbQuotaToast(fn) { _idbQuotaToastFn = fn; }

const saveRecordingState = async (id, chunks, force = false) => {
  const now = Date.now();
  const lastSave = lastIDBSaveMap.get(id) || 0;
  if (!force && (now - lastSave < 10000)) return; // Throttle to once per 10s during recording
  lastIDBSaveMap.set(id, now);

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ id, chunks, timestamp: now });
    return new Promise(resolve => tx.oncomplete = resolve);
  } catch (err) {
    if (err?.name === 'QuotaExceededError') {
      // Fix #7 — inform the user that crash-recovery is disabled
      _idbQuotaToastFn?.({
        title: '⚠️ï¸ Local backup disabled',
        description: 'Storage quota reached — recording continues, but do NOT close this tab.',
      });
    } else if (err?.name !== 'UnknownError') {
      console.warn('IDB Save Warning:', err?.message || err);
    }
  }
};

const getRecordingState = async (id) => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(id);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (err) { console.error('IDB Get Error:', err); return null; }
};

const deleteRecordingState = async (id) => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    return new Promise(resolve => tx.oncomplete = resolve);
  } catch (err) { console.error('IDB Delete Error:', err); }
};

export default function RecordVideo() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fix #7 — wire the module-level IDB error notifier to this component's toast
  useEffect(() => { _setIdbQuotaToast(toast); return () => _setIdbQuotaToast(null); }, [toast]);

  const { id } = useParams();

  useEffect(() => {
    if (!id) {
      navigate(`/record/${uuidv4()}`, { replace: true });
    }
  }, [id, navigate]);

  // Fix #2 — Pre-warm the Render server the moment the page loads so it's
  // awake by the time the user clicks Record (avoids cold-start during upload).
  useEffect(() => {
    fetch('https://slate-gcph.onrender.com/health', { mode: 'no-cors' }).catch(() => {});
  }, []);
  
  useEffect(() => {
    const initDraft = async () => {
      if (id && user) {
        // First check cloud for an existing draft with this ID
        const { data: cloudDraft } = await supabase.from('clipad_videos').select('*').eq('id', id).maybeSingle();
        if (cloudDraft) {
          setTitle(cloudDraft.title || '');
          setDescription(cloudDraft.description || '');
          setRecordingUrl(cloudDraft.video_url);
          setActiveVideoId(cloudDraft.id);
          setPhase('review');
          return;
        }

        // If not in cloud, check local IndexedDB
        getRecordingState(id).then(state => {
          if (state && state.chunks && state.chunks.length > 0) {
            if (Date.now() - state.timestamp > 86400000) {
               deleteRecordingState(id);
            } else {
               chunksRef.current = state.chunks;
               const blob = new Blob(state.chunks, { type: 'video/webm' });
               const url = URL.createObjectURL(blob);
               setVideoBlob(blob);
               setRecordingUrl(url);
               setPhase('review');
            }
          }
        });
      }
    };
    initDraft();
  }, [id, user]);

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const [mode, setMode] = useState('screen_camera');
  const [hasDisplayMedia, setHasDisplayMedia] = useState(true);

  useEffect(() => {
    const supported = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) && !isMobile;
    setHasDisplayMedia(supported);
    if (!supported) setMode('camera_only');
  }, []);

  const isRecordingRef = useRef(false);

  const [phase, setPhase] = useState('setup'); // setup | recording | review | uploading | done
  const [micEnabled, setMicEnabled] = useState(true);

  const [activeVideoId, setActiveVideoId] = useState(null);
  const [selectedSpace, setSelectedSpace] = useState('');
  const [spaces, setSpaces] = useState([]);
  const [description, setDescription] = useState('');
  const [title, setTitle] = useState('');
  const [visibility, setVisibility] = useState('internal');
  const [lockType, setLockType] = useState('none');
  const [unlockDate, setUnlockDate] = useState('');
  const [unlockTime, setUnlockTime] = useState('');
  const [transcript, setTranscript] = useState('');
  const [isPreparingStream, setIsPreparingStream] = useState(false);

  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const previewRef = useRef(null); // main preview for screen + camera
  const playbackRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const animFrameRef = useRef(null);
  const timerRef = useRef(null);
  const streamsRef = useRef({ screen: null, camera: null });
  const wsRef = useRef(null);
  const wsReconnectAttemptsRef = useRef(0);
  const wsMaxReconnects = 5;
  const wsBufferedChunksRef = useRef([]); // chunks buffered during WS outage
  const wsIsReconnectingRef = useRef(false);
  const wsEndRequestedRef = useRef(false); // true once user stops recording
  const wsServerConfigErrorRef = useRef(false); // true if server sent misconfiguration error

  const recognitionRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const [pipWindow, setPipWindow] = useState(null);
  const [micVolume, setMicVolume] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const pipContainerRef = useRef(null);
  const recordStreamRef = useRef(null);
  const [teleprompterText, setTeleprompterText] = useState('');
  const [showTeleprompter, setShowTeleprompter] = useState(true);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [scriptPrompt, setScriptPrompt] = useState('');
  const [scrollSpeed, setScrollSpeed] = useState(3);
  const teleprompterRef = useRef(null);

  const [camPos, setCamPos] = useState({ x: 75, y: 70 });
  const camPosRef = useRef({ x: 75, y: 70 });
  const isDraggingPiP = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const initialCamPos = useRef({ x: 0, y: 0 });

  const handlePiPMouseDown = (e) => {
    isDraggingPiP.current = true;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    initialCamPos.current = { ...camPosRef.current };
  };

  const handlePiPMouseMove = (e) => {
    if (!isDraggingPiP.current) return;
    const container = document.getElementById('preview-container');
    if (!container) return;
    
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    
    const dxPercent = (dx / container.clientWidth) * 100;
    const dyPercent = (dy / container.clientHeight) * 100;
    
    let newX = initialCamPos.current.x + dxPercent;
    let newY = initialCamPos.current.y + dyPercent;
    
    newX = Math.max(0, Math.min(newX, 78)); // max 100 - 22 width
    newY = Math.max(0, Math.min(newY, 87)); // 100 - 13 height
    
    setCamPos({ x: newX, y: newY });
    camPosRef.current = { x: newX, y: newY };
  };

  const handlePiPMouseUp = () => {
    isDraggingPiP.current = false;
  };

  useEffect(() => {
    document.addEventListener('mousemove', handlePiPMouseMove);
    document.addEventListener('mouseup', handlePiPMouseUp);
    return () => {
      document.removeEventListener('mousemove', handlePiPMouseMove);
      document.removeEventListener('mouseup', handlePiPMouseUp);
    };
  }, []);
  
  // Clean AI output of markdown symbols so the teleprompter reads as plain spoken text
  const cleanScriptText = (text) => {
    return text
      .replace(/^#{1,6}\s*/gm, '')           // Remove heading markers (# ## ###)
      .replace(/\*{1,3}(.*?)\*{1,3}/g, '$1') // Remove bold/italic *text*
      .replace(/_{1,3}(.*?)_{1,3}/g, '$1')   // Remove _italic_
      .replace(/^[-*+]\s+/gm, '')            // Remove bullet points
      .replace(/^\d+\.\s+/gm, '')           // Remove numbered lists
      .replace(/`{1,3}[^`]*`{1,3}/g, '')    // Remove code blocks
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links
      .replace(/\n{3,}/g, '\n\n')            // Collapse excessive blank lines
      .trim();
  };

  const generateScript = async () => {
    if (!scriptPrompt.trim()) return;
    setIsGeneratingScript(true);
    try {
      const prompt = `Write a professional, engaging teleprompter script for a video recording about: ${scriptPrompt}. Write it as plain spoken text with short paragraphs. Do NOT use any markdown formatting, bullet points, asterisks, or special characters. Just write natural spoken sentences.`;
      const res = await generateText([{ role: 'user', content: prompt }]);
      if (res) setTeleprompterText(cleanScriptText(typeof res === 'string' ? res : res.response || ''));
    } catch (e) {
      console.error('Failed to generate script', e);
    }
    setIsGeneratingScript(false);
  };
  
  const refineScript = async () => {
    if (!teleprompterText.trim()) return;
    setIsGeneratingScript(true);
    try {
      const prompt = `Rewrite this teleprompter script to be much more punchy, engaging, and concise. Make it sound natural to speak. Write it as plain spoken text only. Do NOT use any markdown, bullet points, asterisks, or special characters:\n\n${teleprompterText}`;
      const res = await generateText([{ role: 'user', content: prompt }]);
      if (res) setTeleprompterText(cleanScriptText(typeof res === 'string' ? res : res.response || ''));
    } catch (e) {
      console.error('Failed to refine script', e);
    }
    setIsGeneratingScript(false);
  };
  
  useEffect(() => {
    let scrollInterval;
    if (phase === 'recording' && showTeleprompter && teleprompterText && scrollSpeed > 0) {
      scrollInterval = setInterval(() => {
        if (teleprompterRef.current) {
          teleprompterRef.current.scrollTop += scrollSpeed;
        }
      }, 100);
    }
    return () => clearInterval(scrollInterval);
  }, [phase, showTeleprompter, teleprompterText, scrollSpeed]);
  const [studioSound, setStudioSound] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingSecondsRef = useRef(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoBlob, setVideoBlob] = useState(null);
  const [recordingUrl, setRecordingUrl] = useState(null);
  const [newCompanyId, setNewCompanyId] = useState(null);
  
  const handlersRef = useRef({});
  useEffect(() => {
    handlersRef.current = { toggleMicTrack, toggleWebcam, togglePause, stopRecording };
  });

  useEffect(() => {
    const handleOffline = () => {
      if (mediaRecorderRef.current?.state === 'recording') {
        handlersRef.current.togglePause();
        toast({ title: '⚠️ï¸ Network Disconnected', description: 'Recording paused automatically.', variant: 'destructive' });
      }
    };
    window.addEventListener('offline', handleOffline);
    return () => window.removeEventListener('offline', handleOffline);
  }, [toast]);

  // Two-Way Sync for PiP Window UI
  useEffect(() => {
    if (!pipWindow) return;
    try {
      const doc = pipWindow.document;
      
      const pauseBtn = doc.getElementById('pip-pause-btn');
      if (pauseBtn) {
        const pauseIcon = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
        const playIcon = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
        if (isPaused) {
          pauseBtn.innerHTML = playIcon;
          pauseBtn.style.backgroundColor = 'rgba(16, 185, 129, 0.15)';
          pauseBtn.style.color = '#10b981';
        } else {
          pauseBtn.innerHTML = pauseIcon;
          pauseBtn.style.backgroundColor = '#e2e8f0';
          pauseBtn.style.color = '#0f172a';
        }
      }

      const micBtn = doc.getElementById('pip-mic-btn');
      if (micBtn) {
        if (!micEnabled) {
          micBtn.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
          micBtn.style.color = '#ef4444';
          micBtn.style.boxShadow = 'none';
        } else {
          micBtn.style.backgroundColor = '#e2e8f0';
          micBtn.style.color = '#0f172a';
        }
      }
    } catch (err) {}
  }, [isPaused, micEnabled, pipWindow]);

  useEffect(() => {
    // Load spaces user has access to
    const loadSpaces = async () => {
      if (user?.id) {
        const [mySpacesRes, memberSpacesRes] = await Promise.all([
          supabase.from('clipad_spaces').select('id, name').eq('created_by', user.id).order('created_at', { ascending: false }),
          supabase.from('clipad_space_members').select('space_id').eq('user_id', user.id)
        ]);
        const memberIds = memberSpacesRes.data?.map(m => m.space_id) || [];
        let allSpaces = mySpacesRes.data || [];
        if (memberIds.length > 0) {
          const { data: memberSpaceData } = await supabase.from('clipad_spaces').select('id, name').in('id', memberIds);
          const existingIds = new Set(allSpaces.map(s => s.id));
          allSpaces = [...allSpaces, ...(memberSpaceData || []).filter(s => !existingIds.has(s.id))];
        }
        // Also include public spaces
        const { data: publicSpaceData } = await supabase.from('clipad_spaces').select('id, name').eq('is_private', false);
        const existingIds2 = new Set(allSpaces.map(s => s.id));
        allSpaces = [...allSpaces, ...(publicSpaceData || []).filter(s => !existingIds2.has(s.id))];
        allSpaces.sort((a, b) => a.name?.localeCompare(b.name));
        setSpaces(allSpaces);
      }
    };
    loadSpaces();
    return () => stopEverything();
  }, [user?.id]);

  useEffect(() => {
    if (countdown === null) return;
    const originalOverflow = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = originalOverflow;
      };
    } else if (countdown === 0) {
      document.body.style.overflow = originalOverflow;
      startMediaRecorder();
      setCountdown(null);
    }
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [countdown]);

  const stopEverything = () => {
    clearInterval(timerRef.current);
    cancelAnimationFrame(animFrameRef.current);
    if (recognitionRef.current) recognitionRef.current.stop();
    if (audioContextRef.current) audioContextRef.current.close().catch(()=>{});
    Object.values(streamsRef.current).forEach(s => s?.getTracks().forEach(t => t.stop()));
    if (pipWindow) {
      try { pipWindow.close(); } catch(e) {}
      setPipWindow(null);
    }
  };

  const togglePause = () => {
    if (!mediaRecorderRef.current) return;
    if (mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      clearInterval(timerRef.current);
    } else if (mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      
      // Use ref (not state) to avoid stale closure — ref is always kept in sync by the interval
      const resumedAtSeconds = recordingSecondsRef.current;
      const resumeWallTime = Date.now();
      const planLimits = getPlanLimits(user);
      const maxSeconds = planLimits.maxAsyncVideoDurationSeconds;

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - resumeWallTime) / 1000);
        const seconds = resumedAtSeconds + elapsed;
        setRecordingSeconds(seconds);
        recordingSecondsRef.current = seconds;
        
        if (seconds >= maxSeconds) {
          playAlertSound();
          stopRecording();
          setShowPaywall(true);
        }
      }, 1000);
    }
  };


  const toggleWebcam = () => {
    const track = streamsRef.current.camera?.getVideoTracks()[0];
    if (track) track.enabled = !track.enabled;
  };

  const toggleMicTrack = () => {
    setMicEnabled(!micEnabled);
    const track = streamsRef.current.camera?.getAudioTracks()[0] || streamsRef.current.screen?.getAudioTracks()[0];
    if (track) track.enabled = !micEnabled;
  };

  const startPip = async (pipPromise) => {
    if (!('documentPictureInPicture' in window)) {
      toast({ title: 'PiP Not Supported', description: 'Your browser does not support Document PiP.', variant: 'destructive' });
      return;
    }
    try {
      // Wait for the synchronously-started PiP window to resolve
      const pip = await pipPromise;
      if (!pip) return;
      
      // Copy styles
      [...document.styleSheets].forEach((styleSheet) => {
        try {
          if (styleSheet.href) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = styleSheet.href;
            pip.document.head.appendChild(link);
          } else if (styleSheet.cssRules) {
            const style = document.createElement('style');
            Array.from(styleSheet.cssRules).forEach(rule => style.appendChild(document.createTextNode(rule.cssText)));
            pip.document.head.appendChild(style);
          }
        } catch (e) {
          // Cross-origin stylesheet error, skip
        }
      });

      // Construct native PiP UI inside the PiP Document
      const isDark = document.documentElement.classList.contains('dark');
      if (isDark) pip.document.documentElement.classList.add('dark');
      
      pip.document.body.style.margin = '0';
      // Blend the PiP background with Chrome's dark title bar
      pip.document.body.style.backgroundColor = '#202124'; 
      pip.document.body.style.display = 'flex';
      pip.document.body.style.alignItems = 'center';
      pip.document.body.style.justifyContent = 'center';
      pip.document.body.style.height = '100vh';
      pip.document.body.style.overflow = 'hidden';

      const controlsWrapper = document.createElement('div');
      controlsWrapper.style.display = 'flex';
      controlsWrapper.style.justifyContent = 'center';
      controlsWrapper.style.gap = '12px';
      controlsWrapper.style.padding = '10px 20px';
      controlsWrapper.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
      controlsWrapper.style.backdropFilter = 'blur(10px)';
      controlsWrapper.style.borderRadius = '24px';
      controlsWrapper.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
      controlsWrapper.style.position = 'absolute';
      controlsWrapper.style.bottom = '16px';
      controlsWrapper.style.transform = 'scale(0.9)';
      controlsWrapper.style.transition = 'opacity 0.2s';

      const createBtn = (iconSvg, type) => {
        const btn = document.createElement('button');
        btn.innerHTML = iconSvg;
        btn.style.padding = '14px';
        btn.style.borderRadius = '50%';
        btn.style.border = 'none';
        btn.style.cursor = 'pointer';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'center';
        btn.style.transition = 'all 0.2s ease';
        
        if (type === 'slate') {
          btn.style.backgroundColor = '#e2e8f0';
          btn.style.color = '#0f172a';
        } else if (type === 'red') {
          btn.style.backgroundColor = '#ef4444';
          btn.style.color = '#fff';
          btn.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
        }
        
        btn.onmouseover = () => btn.style.transform = 'scale(1.05)';
        btn.onmouseout = () => btn.style.transform = 'scale(1)';
        
        return btn;
      };

      // Simple SVG icons
      const micIcon = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>`;
      const camIcon = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path><circle cx="12" cy="13" r="3"></circle></svg>`;
      const pauseIcon = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
      const playIcon = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
      const stopIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect></svg>`;

      const micBtn = createBtn(micIcon, 'slate');
      const camBtn = createBtn(camIcon, 'slate');
      const pauseBtn = createBtn(pauseIcon, 'slate');
      const stopBtn = createBtn(stopIcon, 'red');

      let pipMicState = micEnabled;
      let pipCamState = true;
      let pipPauseState = false;

      micBtn.onclick = () => {
        handlersRef.current.toggleMicTrack();
        pipMicState = !pipMicState;
        if (!pipMicState) {
          micBtn.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
          micBtn.style.color = '#ef4444';
          micBtn.style.boxShadow = 'none';
        } else {
          micBtn.style.backgroundColor = '#e2e8f0';
          micBtn.style.color = '#0f172a';
        }
      };

      camBtn.onclick = () => {
        handlersRef.current.toggleWebcam();
        pipCamState = !pipCamState;
        if (!pipCamState) {
          camBtn.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
          camBtn.style.color = '#ef4444';
        } else {
          camBtn.style.backgroundColor = '#e2e8f0';
          camBtn.style.color = '#0f172a';
        }
      };

      pauseBtn.onclick = () => {
        handlersRef.current.togglePause();
        pipPauseState = !pipPauseState;
        if (pipPauseState) {
          pauseBtn.innerHTML = playIcon;
          pauseBtn.style.backgroundColor = 'rgba(16, 185, 129, 0.15)';
          pauseBtn.style.color = '#10b981';
        } else {
          pauseBtn.innerHTML = pauseIcon;
          pauseBtn.style.backgroundColor = '#e2e8f0';
          pauseBtn.style.color = '#0f172a';
        }
      };

      stopBtn.onclick = () => { handlersRef.current.stopRecording(); window.focus(); };
      
      // Mic glowing setup
      let audioCtx, analyser, dataArray, source, glowId;
      try {
        const track = streamsRef.current.camera?.getAudioTracks()[0] || streamsRef.current.screen?.getAudioTracks()[0];
        if (track) {
          const stream = new MediaStream([track]);
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          analyser = audioCtx.createAnalyser();
          source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);
          analyser.fftSize = 256;
          dataArray = new Uint8Array(analyser.frequencyBinCount);
          
          const updateGlow = () => {
            if (!pipMicState) {
               micBtn.style.boxShadow = 'none';
            } else {
               analyser.getByteFrequencyData(dataArray);
               const avg = dataArray.reduce((a,b)=>a+b)/dataArray.length;
               if (avg > 15) {
                 micBtn.style.boxShadow = `0 0 ${Math.min(15, avg/2)}px rgba(16, 185, 129, ${Math.min(0.6, avg/100)})`;
               } else {
                 micBtn.style.boxShadow = 'none';
               }
            }
            glowId = pip.requestAnimationFrame(updateGlow);
          };
          updateGlow();
        }
      } catch(e) { console.error('Audio glow error:', e); }

      pip.addEventListener('pagehide', () => {
        if (glowId) pip.cancelAnimationFrame(glowId);
        if (audioCtx && audioCtx.state !== 'closed') audioCtx.close();
        setPipWindow(null);
      });

      controlsWrapper.appendChild(micBtn);
      controlsWrapper.appendChild(camBtn);
      controlsWrapper.appendChild(pauseBtn);
      controlsWrapper.appendChild(stopBtn);

      // Add Video element for camera preview
      const videoEl = document.createElement('video');
      videoEl.autoplay = true;
      videoEl.muted = true;
      videoEl.playsInline = true;
      videoEl.style.width = '100%';
      videoEl.style.height = '100%';
      videoEl.style.objectFit = 'cover';
      videoEl.style.transform = 'scaleX(-1)';
      videoEl.style.backgroundColor = '#000';
      if (streamsRef.current?.camera) {
        videoEl.srcObject = streamsRef.current.camera;
      }
      
      pip.document.body.appendChild(videoEl);
      pip.document.body.appendChild(controlsWrapper);

      pip.addEventListener('pagehide', () => {
        setPipWindow(null);
      });
      setPipWindow(pip);
    } catch (err) {
      console.error(err);
      toast({ title: 'PiP Failed', description: err.message, variant: 'destructive' });
    }
  };

  const startRecording = async () => {
    if (!title) {
      toast({ title: 'Missing Title', description: 'Please enter a video title before recording.', variant: 'destructive' });
      return;
    }
    
    setIsPreparingStream(true);

    // IMMEDIATELY request PiP window to consume the synchronous user gesture
    let pipPromise = null;
    if (('documentPictureInPicture' in window) && (mode === 'screen_camera' || mode === 'camera_only')) {
      pipPromise = window.documentPictureInPicture.requestWindow({ width: 320, height: 180 }).catch(e => {
        console.warn('PiP auto-start failed:', e);
        return null;
      });
    }

    // Plan Limit Check: Check if user has exceeded storage or monthly recordings
    try {
      const maxStorageGB = getLimit(user, 'maxStorageGB') || 2;
      
      // Check total storage used this month (heuristic: 1 min = 15MB)
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
          setPaywallProps({
            featureName: "Cloud Storage Limit Reached",
            limitDescription: `You have reached the maximum monthly storage limit of ${maxStorageGB}GB for your current plan. Please upgrade to record more videos.`
          });
          setShowPaywall(true);
          setIsPreparingStream(false);
          return;
        }
      }

      const maxRecordings = getLimit(user, 'maxVideoRecordingsPerMonth');
      if (maxRecordings !== Infinity) {
        const firstDayOfMonth = new Date();
        firstDayOfMonth.setDate(1);
        firstDayOfMonth.setHours(0, 0, 0, 0);
        
        const { count, error } = await supabase
          .from('clipad_videos')
          .select('*', { count: 'exact', head: true })
          .eq('creator_id', user.id)
          .gte('created_at', firstDayOfMonth.toISOString());
          
        if (count >= maxRecordings) {
          setPaywallProps({
            featureName: "Record Async Videos",
            limitDescription: `You have reached the maximum limit of ${maxRecordings} recordings this month on your current plan.`
          });
          setShowPaywall(true);
          setIsPreparingStream(false);
          return;
        }
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'Plan Limit Error', description: 'Could not verify plan limits. Please try again.', variant: 'destructive' });
      setIsPreparingStream(false);
      return;
    }

    const success = await prepareStreamsAndPip();
    setIsPreparingStream(false);
    if (success) {
      setPhase('recording');
      if (pipPromise) startPip(pipPromise);
      setCountdown(5);
    }
  };

  const prepareStreamsAndPip = async () => {
    try {
      // Initialize AudioContext immediately during the click event to avoid being suspended
      const audioCtx = new AudioContext();
      audioCtx.resume();
      audioContextRef.current = audioCtx;

      let screenStream = null;
      let cameraStream = null;

      if (mode === 'screen_camera' || mode === 'screen_only') {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
          toast({ title: 'Screen Recording Unavailable', description: 'Screen recording is not supported on this device. Switching to Camera Only.', variant: 'default' });
          // fall through — screenStream stays null, camera branch will handle it
        } else {
          screenStream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 60 } }, audio: { echoCancellation: true, noiseSuppression: true } });
          streamsRef.current.screen = screenStream;
          // If user stops screen share from browser UI
          screenStream.getVideoTracks()[0].onended = () => stopRecording();
        }
      }

      if (mode === 'screen_camera' || mode === 'camera_only') {
        try {
          cameraStream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }, 
            audio: micEnabled ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 48000, channelCount: 2 } : false 
          });
          streamsRef.current.camera = cameraStream;
        } catch (camErr) {
          console.warn("Camera failed to load:", camErr);
          toast({ title: 'Camera Unavailable', description: 'Proceeding without camera stream.', variant: 'default' });
          if (mode === 'camera_only') throw camErr;
        }
      }

      let recordStream;

      if (mode === 'screen_camera' && screenStream && cameraStream) {
        // True PiP via canvas compositing
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = 1920;
        canvas.height = 1080;

        const screenVideo = document.createElement('video');
        screenVideo.playsInline = true;
        screenVideo.srcObject = screenStream;
        screenVideo.muted = true;
        await screenVideo.play();

        const camVideo = document.createElement('video');
        camVideo.playsInline = true;
        camVideo.srcObject = cameraStream;
        camVideo.muted = true;
        await camVideo.play();

        const drawFrame = () => {
          ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
          // PiP: bottom-right corner, 25% of canvas width
          const pipW = canvas.width * 0.22;
          const pipH = pipW * (camVideo.videoHeight / (camVideo.videoWidth || 1)) || pipW * 0.75;
          // Use camPosRef percentages to position on 1920x1080 canvas
          const pipX = (camPosRef.current.x / 100) * canvas.width;
          const pipY = (camPosRef.current.y / 100) * canvas.height;
          // Rounded clip
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(pipX, pipY, pipW, pipH, 20);
          ctx.clip();
          ctx.drawImage(camVideo, pipX, pipY, pipW, pipH);
          ctx.restore();
          // Shadow ring
          ctx.strokeStyle = 'rgba(99,102,241,0.8)';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.roundRect(pipX, pipY, pipW, pipH, 20);
          ctx.stroke();
          animFrameRef.current = requestAnimationFrame(drawFrame);
        };
        drawFrame();

        // Merge audio and setup analyzer using the early initialized audioCtx
        const audioCtx = audioContextRef.current;
        const dest = audioCtx.createMediaStreamDestination();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        if (screenStream && screenStream.getAudioTracks().length > 0) {
          const screenAudio = audioCtx.createMediaStreamSource(new MediaStream(screenStream.getAudioTracks()));
          screenAudio.connect(dest);
        }
        if (cameraStream && cameraStream.getAudioTracks().length > 0 && micEnabled) {
          const micSource = audioCtx.createMediaStreamSource(new MediaStream(cameraStream.getAudioTracks()));
          micSource.connect(dest);
          micSource.connect(analyser); // Analyze mic specifically
        }

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const checkVolume = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          setMicVolume(sum / dataArray.length);
          if (mediaRecorderRef.current?.state === 'recording') {
            requestAnimationFrame(checkVolume);
          }
        };
        checkVolume();

        const canvasStream = canvas.captureStream(30);
        let recordStream = new MediaStream([...canvasStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);
        recordStreamRef.current = recordStream;
        
        // Show composited canvas directly in preview window
        if (previewRef.current) {
          previewRef.current.srcObject = mode === 'screen_camera' ? screenStream : canvasStream;
          previewRef.current.play().catch(()=>{});
        }
      } else if (screenStream) {
        // screen_only: properly merge system audio + mic audio
        const audioCtx = audioContextRef.current;
        const dest = audioCtx.createMediaStreamDestination();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        if (screenStream.getAudioTracks().length > 0) {
          const screenAudio = audioCtx.createMediaStreamSource(new MediaStream(screenStream.getAudioTracks()));
          screenAudio.connect(dest);
        }
        if (cameraStream && cameraStream.getAudioTracks().length > 0 && micEnabled) {
          const micSource = audioCtx.createMediaStreamSource(new MediaStream(cameraStream.getAudioTracks()));
          micSource.connect(dest);
          micSource.connect(analyser);
        } else if (screenStream.getAudioTracks().length === 0 && micEnabled) {
          // No system audio AND no camera — try to get mic directly
          try {
            const micOnly = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 48000, channelCount: 2 }, video: false });
            streamsRef.current.mic = micOnly;
            const micSource = audioCtx.createMediaStreamSource(micOnly);
            micSource.connect(dest);
            micSource.connect(analyser);
          } catch (_) { console.warn('Mic fallback failed'); }
        }

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const checkVolume = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          setMicVolume(sum / dataArray.length);
          if (mediaRecorderRef.current?.state === 'recording') requestAnimationFrame(checkVolume);
        };
        checkVolume();

        // Combine: screen video + merged audio
        let recordStream = new MediaStream([
          ...screenStream.getVideoTracks(),
          ...dest.stream.getAudioTracks()
        ]);
        recordStreamRef.current = recordStream;
        if (previewRef.current) {
          previewRef.current.srcObject = screenStream;
          previewRef.current.play().catch(()=>{});
        }
      } else if (cameraStream) {
        // camera_only: same audio mixing
        const audioCtx = audioContextRef.current;
        const dest = audioCtx.createMediaStreamDestination();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;
        if (cameraStream.getAudioTracks().length > 0 && micEnabled) {
          const micSource = audioCtx.createMediaStreamSource(new MediaStream(cameraStream.getAudioTracks()));
          micSource.connect(dest);
          micSource.connect(analyser);
        }
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const checkVolume = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          setMicVolume(sum / dataArray.length);
          if (mediaRecorderRef.current?.state === 'recording') requestAnimationFrame(checkVolume);
        };
        checkVolume();
        let recordStream = new MediaStream([
          ...cameraStream.getVideoTracks(),
          ...dest.stream.getAudioTracks()
        ]);
        recordStreamRef.current = recordStream;
        if (previewRef.current) {
          previewRef.current.srcObject = cameraStream;
          previewRef.current.play().catch(()=>{});
        }
      } else {
        throw new Error('No stream available');
      }

      return true;
    } catch (err) {
      console.error(err);
      toast({ title: 'Stream Error', description: 'Could not access camera or screen. ' + err.message, variant: 'destructive' });
      stopEverything();
      return false;
    }
  };

  const startMediaRecorder = () => {
    if (!recordStreamRef.current) return;

    try {
      // Pick best mimeType with audio codec (opus) to guarantee audio in output
      const mimeType = 
        MediaRecorder.isTypeSupported('video/webm; codecs=vp9, opus') ? 'video/webm; codecs=vp9, opus' :
        MediaRecorder.isTypeSupported('video/webm; codecs=vp8, opus') ? 'video/webm; codecs=vp8, opus' :
        MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : '';
      const recorderOptions = mimeType ? { mimeType, videoBitsPerSecond: 3000000, audioBitsPerSecond: 128000 } : { videoBitsPerSecond: 3000000, audioBitsPerSecond: 128000 };
      const recorder = new MediaRecorder(recordStreamRef.current, recorderOptions);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      // Reset reconnect state
      wsReconnectAttemptsRef.current = 0;
      wsBufferedChunksRef.current = [];
      wsIsReconnectingRef.current = false;
      wsEndRequestedRef.current = false;
      wsServerConfigErrorRef.current = false;

      // WebSocket live streamer (Render) with HTTP keep-alive wake-up ping
      const wsUrl = 'wss://slate-gcph.onrender.com';
      fetch('https://slate-gcph.onrender.com/health', { mode: 'no-cors' }).catch(() => {});

      // ── Application-level heartbeat to keep Render from sleeping ──
      let wsPingInterval = null;
      const startPingInterval = (socket) => {
        wsPingInterval = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'PING' }));
          }
        }, 20000);
      };
      const stopPingInterval = () => clearInterval(wsPingInterval);

      // ── Backpressure-safe chunk sending ──
      const pendingChunks = [];
      let isFlushing = false;
      const flushChunks = (socket) => {
        if (isFlushing) return;
        isFlushing = true;
        while (pendingChunks.length > 0) {
          if (socket.readyState !== WebSocket.OPEN) {
            isFlushing = false; // Fix #8 — reset flag so next call isn't stuck
            break;
          }
          if (socket.bufferedAmount > 5 * 1024 * 1024) {
            setTimeout(() => flushChunks(socket), 200);
            isFlushing = false;
            return;
          }
          const chunk = pendingChunks.shift();
          socket.send(chunk);
        }
        isFlushing = false;
      };

      const connectWS = async (isReconnect = false) => {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = async () => {
          wsIsReconnectingRef.current = false;
          wsReconnectAttemptsRef.current = 0;
          const { data: { session } } = await supabase.auth.getSession();
          ws.send(JSON.stringify({ type: 'START', userId: user.id, token: session?.access_token }));
          if (!isReconnect) {
            // First connection — recorder already started below
          } else {
            // Reconnected — replay buffered chunks first
            toast({ title: 'ðŸ”„ Reconnected', description: 'Uploading buffered recording data...' });
            for (const bufferedChunk of wsBufferedChunksRef.current) {
              if (ws.readyState === WebSocket.OPEN) ws.send(bufferedChunk);
            }
            wsBufferedChunksRef.current = [];
            // If user already stopped, send END now
            if (wsEndRequestedRef.current) {
              ws.send(JSON.stringify({ type: 'END' }));
            }
          }
          startPingInterval(ws);
        };

        ws.onmessage = async (event) => {
          const msg = JSON.parse(event.data);
          if (msg.type === 'PROGRESS') {
            setUploadProgress(Math.max(msg.percent || 0, uploadProgress));
          } else if (msg.type === 'SUCCESS') {
            stopPingInterval();
            const publicUrl = supabase.storage.from('clipad_videos').getPublicUrl(msg.fileName).data.publicUrl;
            setRecordingUrl(publicUrl);

            const videoTitle = title.trim() || `Recording - ${new Date().toLocaleDateString()}`;
            const { data: videoRecord, error: dbError } = await supabase.from('clipad_videos').insert({
              id: id, // FIX: Map the cloud ID to the route ID
              creator_id: user.id,
              company_id: user?.company_id || null, // Fix #4 — needed for RLS and teammate visibility
              video_url: publicUrl,
              title: videoTitle,
              space_id: selectedSpace || null,
              duration_seconds: recordingSecondsRef.current,
            }).select().single();

            if (!dbError) {
              setActiveVideoId(videoRecord.id);
              toast({ title: 'Recording Saved!', description: 'Your video is securely saved in the cloud. Review details below.', variant: 'default' });
              setUploadProgress(100);
              setPhase('review');
              // REMOVED deleteRecordingState(id) to ensure IDB persists until user explicitly discards or navigates away!
            } else {
              console.error('DB insert error:', dbError);
              toast({ title: 'Save Error', description: dbError.message, variant: 'destructive' });
              setPhase('review');
            }
          } else if (msg.type === 'ERROR') {
            stopPingInterval();
            const errorStr = (msg.error || '').toString();
            const isConfigError = errorStr.includes('SUPABASE_URL') || errorStr.includes('misconfiguration') || errorStr.includes('Server misconfiguration');
            if (isConfigError) {
              console.warn('WebSocket relay server misconfigured, falling back silently to local recording:', errorStr);
              wsServerConfigErrorRef.current = true;
              try { ws.close(); } catch (e) {}
              if (!isRecordingRef.current || wsEndRequestedRef.current) {
                if (chunksRef.current.length > 0 && !videoBlob) {
                  const blob = new Blob(chunksRef.current, { type: 'video/webm' });
                  setVideoBlob(blob);
                  setRecordingUrl(URL.createObjectURL(blob));
                }
                setPhase('review');
              }
            } else {
              toast({ title: 'Upload Error', description: msg.error, variant: 'destructive' });
              setPhase('review');
            }
          }
          // PONG — no-op, keepalive confirmed
        };

        ws.onerror = (err) => {
          // Silently ignore websocket errors as local recording handles it seamlessly
          stopPingInterval();
        };

        ws.onclose = (evt) => {
          stopPingInterval();
          if (wsServerConfigErrorRef.current) return;
          // Normal close (code 1000 / 1001) — do nothing
          if (evt.code === 1000 || evt.code === 1001) return;

          if (!isRecordingRef.current && !wsEndRequestedRef.current) return;

          const attemptsLeft = wsMaxReconnects - wsReconnectAttemptsRef.current;
          if (attemptsLeft > 0 && (isRecordingRef.current || wsEndRequestedRef.current)) {
            wsIsReconnectingRef.current = true;
            wsReconnectAttemptsRef.current++;
            const delay = Math.min(1000 * Math.pow(2, wsReconnectAttemptsRef.current - 1), 15000);
            setTimeout(() => connectWS(true), delay);
          }
        };
      };

      recorder.ondataavailable = e => {
        if (e.data.size > 0) {
          // Always save to IndexedDB for crash recovery
          chunksRef.current.push(e.data);
          saveRecordingState(id, chunksRef.current);

          if (wsRef.current?.readyState === WebSocket.OPEN) {
            pendingChunks.push(e.data);
            flushChunks(wsRef.current);
          } else {
            // WS not ready — buffer the chunk for later replay on reconnect
            wsBufferedChunksRef.current.push(e.data);
          }
        }
      };
      
      recorder.onstop = async () => {
        stopEverything();
        if (chunksRef.current.length > 0) {
          saveRecordingState(id, chunksRef.current, true);
        } else {
          setPhase('setup');
          return;
        }
        
        // Finalize local recording blob and go straight to review for direct client-side upload
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setVideoBlob(blob);
        setRecordingUrl(URL.createObjectURL(blob));
        setPhase('review');
      };


      // Live WS connection completely removed to rely on robust local recording + client-side direct TUS upload
      recorder.start(1000); // 1-second chunks

      setPhase('recording');
      isRecordingRef.current = true;
      setRecordingSeconds(0);
      const startTime = Date.now();
      clearInterval(timerRef.current);
      const planLimits = getPlanLimits(user);
      const maxSeconds = planLimits.maxAsyncVideoDurationSeconds;

      timerRef.current = setInterval(() => {
        const seconds = Math.floor((Date.now() - startTime) / 1000);
        setRecordingSeconds(seconds);
        recordingSecondsRef.current = seconds;
        
        if (seconds >= maxSeconds) {
          playAlertSound();
          stopRecording();
          setShowPaywall(true);
        }
      }, 1000);

      toast({ title: 'â— Recording started', description: 'Click Stop when done.' });

      // Start Speech Recognition
      if (micEnabled && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        try {
          const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.onresult = (event) => {
            let finalStr = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) finalStr += event.results[i][0].transcript + ' ';
            }
            if (finalStr) setTranscript(prev => prev + finalStr);
          };
          recognition.onend = () => {
            if (isRecordingRef.current) {
              try { recognition.start(); } catch (err) {}
            }
          };
          recognition.start();
          recognitionRef.current = recognition;
        } catch (e) { console.warn("Speech recognition failed to start", e); }
      }

    } catch (err) {
      console.error(err);
      const msg = err.name === 'NotAllowedError' ? 'Permission denied. Please allow screen/camera access.' : err.message;
      toast({ title: 'Could not start recording', description: msg, variant: 'destructive' });
    }
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    clearInterval(timerRef.current);
    cancelAnimationFrame(animFrameRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (err) {}
    }
  };

  const uploadRecording = async (blobOverride) => {
    if (!user) return;
    
    const finalBlob = blobOverride instanceof Blob ? blobOverride : videoBlob;
    if (!finalBlob && !activeVideoId) {
       toast({ title: 'Upload Failed', description: 'No recording found to upload.', variant: 'destructive' });
       return;
    }
    
    let finalUnlockAt = null;
    let finalIsLocked = false;

    if (lockType === 'manual') {
      finalIsLocked = true;
    } else if (lockType === 'scheduled') {
      if (!unlockDate || !unlockTime) {
        toast({ title: 'Date/Time required', description: 'Please set the unlock schedule.', variant: 'destructive' });
        return;
      }
      finalIsLocked = true;
      finalUnlockAt = new Date(`${unlockDate}T${unlockTime}`).toISOString();
    }
    
    // If it was auto-saved, just update details and redirect
    if (activeVideoId) {
      setPhase('uploading');
      try {
        await supabase.from('clipad_videos').update({
          title: title.trim() || `Recording - ${new Date().toLocaleDateString()}`,
          description: description.trim() || null,
          space_id: selectedSpace || null,
          visibility: visibility,
          is_locked: finalIsLocked,
          unlock_at: finalUnlockAt,
        }).eq('id', activeVideoId);
        
        if (transcript.trim().length > 10) {
          import('@/lib/cloudflareAI').then(({ generateText }) => {
            generateText([
              { role: 'system', content: 'You are an AI assistant. Summarize the following video transcript. Return ONLY valid JSON with two keys: "summary" (a string summarizing the video concisely) and "action_items" (an array of objects, each with "title", "owner", and "context"). Do not wrap the JSON in markdown blocks.' },
              { role: 'user', content: transcript.trim() }
            ]).then(async (aiResult) => {
              let text = typeof aiResult === 'string' ? aiResult : aiResult?.response;
              if (!text) return;
              
              let jsonStr = text;
              const jsonMatch = text.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                jsonStr = jsonMatch[0];
              } else if (text.startsWith('```')) {
                jsonStr = text.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
              }
              
              let parsed;
              try {
                parsed = JSON.parse(jsonStr);
              } catch (parseErr) {
                console.warn('AI summary was not strict JSON, using raw text as summary:', text);
                parsed = { summary: text.replace(/```[\s\S]*?```/g, '').trim(), action_items: [] };
              }
              
              if (parsed.summary) {
                await supabase.from('clipad_videos').update({ ai_summary: parsed.summary }).eq('id', activeVideoId);
              }
                
            try {
              const capture = await createCapture({
                companyId: user.user_metadata?.company_id || user.company_id,
                userId: user.id,
                sourceType: 'clipad_videos',
                sourceId: videoRecord?.id || activeVideoId,
                captureType: 'VIDEO',
                title: title.trim() || 'Video Recording',
                content: parsed.summary || 'Video Recording',
                visibility: 'PERSONAL'
              });
              
              // Non-blocking contextualization
              contextualizeCapture(capture.id).catch(console.error);
            } catch (captureErr) {
              console.error('Failed to create v3 capture:', captureErr);
            }

              if (parsed.action_items && Array.isArray(parsed.action_items) && parsed.action_items.length > 0) {
                  const inserts = parsed.action_items.map(ai => ({
                    space_id: selectedSpace || null,
                    title: ai.title,
                    assigned_to: ai.owner || null,
                    context: ai.context || null,
                    is_complete: false,
                  }));
                  await supabase.from('clipad_action_items').insert(inserts);
                }
                
                // --- ADDED FOR ORG MEMORY ENGINE: Decisions & Commitments ---
                const [foundDecisions, foundCommitments] = await Promise.all([
                  detectDecisions(transcript.trim(), { team_space_id: selectedSpace || null, related_meeting_id: activeVideoId }),
                  detectCommitments(transcript.trim(), { team_space_id: selectedSpace || null, meeting_id: activeVideoId })
                ]);
                
                for (const d of foundDecisions) {
                  const { error } = await supabase.from('clipad_decisions').insert({ ...d, reasoning_text: d.rationale || null });
                  if (!error) {
                    await writeOrgEvent({
                      space_id: selectedSpace || null,
                      event_type: 'decision_logged',
                      title: d.decision_text.substring(0, 80),
                      actor_id: user?.id,
                      source_id: activeVideoId,
                      source_table: 'clipad_videos',
                      importance: d.importance_score || 5,
                    });
                  }
                }
                
                for (const c of foundCommitments) {
                  const { error } = await supabase.from('clipad_commitments').insert(c);
                  if (!error) {
                    await writeOrgEvent({
                      space_id: selectedSpace || null,
                      event_type: 'commitment_detected',
                      title: c.commitment_text.substring(0, 80),
                      actor_id: user?.id,
                      source_id: activeVideoId,
                      source_table: 'clipad_videos',
                      importance: 4,
                    });
                  }
                }
                // -----------------------------------------------------------

              } catch(e) { console.warn("Failed to parse AI output", e); }
            }).catch(()=>{});
          });
        }
        
        toast({ title: '✓ Details updated!', description: 'Your recording has been finalized.' });
        deleteRecordingState(id);
        setTimeout(() => navigate(`/spaces/${selectedSpace || ''}`), 1000);
      } catch (err) {
        toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
        setPhase('review');
      }
      return;
    }

    // Fallback full upload if auto-save failed
    setPhase('uploading');
    setUploadProgress(0);

    try {
      const videoTitle = title.trim() || `Recording - ${new Date().toLocaleDateString()}`;
      const fileName = `${user.id}/${Date.now()}.webm`;

      const { data: { session } } = await supabase.auth.getSession();
      
      const tryTusUpload = () => new Promise((resolve, reject) => {
        const upload = new tus.Upload(finalBlob, {
          endpoint: `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/upload/resumable`,
          retryDelays: [0, 2000, 5000, 10000],
          headers: {
            authorization: `Bearer ${session?.access_token}`,
            'x-upsert': 'true', 
          },
          uploadDataDuringCreation: false, // CRITICAL FIX: Must be false to prevent 413 POST payload limit
          removeFingerprintOnSuccess: true,
          metadata: {
            bucketName: 'clipad_videos',
            objectName: fileName,
            contentType: 'video/webm',
            cacheControl: '3600',
          },
          chunkSize: 2 * 1024 * 1024, // 2MB per chunk payload for multi-gigabyte upload reliability
          onError: function (error) {
             reject(error);
          },
          onProgress: function (bytesUploaded, bytesTotal) {
             const percentage = ((bytesUploaded / bytesTotal) * 100);
             setUploadProgress(Math.min(percentage, 95));
          },
          onSuccess: function () {
             resolve();
          }
        });
        upload.start();
      });

      try {
        await tryTusUpload();
      } catch (tusErr) {
        console.warn('TUS Resumable upload notice, using direct storage upload fallback:', tusErr);
        setUploadProgress(40);
        
        // Direct upload fallback (handles Blobs up to Enterprise plan limits without TUS overhead)
        const { error: directUploadError } = await supabase.storage
          .from('clipad_videos')
          .upload(fileName, finalBlob, {
            contentType: 'video/webm',
            cacheControl: '3600',
            upsert: true
          });

        if (directUploadError) {
          throw new Error(`Cloud upload failed: ${directUploadError.message}`);
        }
      }

      setUploadProgress(95);
      const publicUrl = supabase.storage.from('clipad_videos').getPublicUrl(fileName).data.publicUrl;

      const { data: videoRecord, error: dbError } = await supabase.from('clipad_videos').insert({
        id: id, // FIX: Map the cloud ID to the route ID
        creator_id: user.id,
        company_id: user?.company_id || null, // Fix #4 — needed for RLS and teammate visibility
        video_url: publicUrl,
        title: videoTitle,
        space_id: selectedSpace || null,
        duration_seconds: recordingSeconds,
        visibility: visibility,
        is_locked: finalIsLocked,
        unlock_at: finalUnlockAt,
      }).select().single();

      if (dbError) throw dbError;

      if (transcript.trim().length > 10) {
        import('@/lib/cloudflareAI').then(({ generateText }) => {
          generateText([
            { role: 'system', content: 'You are an AI assistant. Summarize the following video transcript. Return ONLY valid JSON with two keys: "summary" (a string summarizing the video concisely) and "action_items" (an array of objects, each with "title", "owner", and "context"). Do not wrap the JSON in markdown blocks.' },
            { role: 'user', content: transcript.trim() }
          ]).then(async (aiResult) => {
              let text = typeof aiResult === 'string' ? aiResult : aiResult?.response;
              if (!text) return;
              
              // Robust JSON extractor to handle "Okay, let me...", markdown blocks, etc.
              let jsonStr = text;
              const jsonMatch = text.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                jsonStr = jsonMatch[0];
              } else if (text.startsWith('```')) {
                jsonStr = text.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
              }
              
              let parsed;
              try {
                parsed = JSON.parse(jsonStr);
              } catch (parseErr) {
                console.warn('AI summary was not strict JSON, using raw text as summary:', text);
                parsed = { summary: text.replace(/```[\s\S]*?```/g, '').trim(), action_items: [] };
              }
              
              if (parsed.summary) {
                await supabase.from('clipad_videos').update({ ai_summary: parsed.summary }).eq('id', videoRecord.id);
              }
              
            try {
              const capture = await createCapture({
                companyId: user.user_metadata?.company_id || user.company_id,
                userId: user.id,
                sourceType: 'clipad_videos',
                sourceId: videoRecord.id,
                captureType: 'VIDEO',
                title: videoRecord.title || 'Video Recording',
                content: parsed.summary || 'Video Recording',
                visibility: 'PERSONAL'
              });
              
              // Non-blocking contextualization
              contextualizeCapture(capture.id).catch(console.error);
            } catch (captureErr) {
              console.error('Failed to create v3 capture:', captureErr);
            }

              if (parsed.action_items && Array.isArray(parsed.action_items) && parsed.action_items.length > 0) {
                const inserts = parsed.action_items.map(ai => ({
                  space_id: selectedSpace || null,
                  title: ai.title,
                  assigned_to: ai.owner || null,
                  context: ai.context || null,
                  is_complete: false,
                }));
                await supabase.from('clipad_action_items').insert(inserts);
              }

              // --- ADDED FOR ORG MEMORY ENGINE: Decisions & Commitments ---
              const [foundDecisions, foundCommitments] = await Promise.all([
                detectDecisions(transcript.trim(), { team_space_id: selectedSpace || null, related_meeting_id: videoRecord.id }),
                detectCommitments(transcript.trim(), { team_space_id: selectedSpace || null, meeting_id: videoRecord.id })
              ]);
              
              for (const d of foundDecisions) {
                const { error } = await supabase.from('clipad_decisions').insert({ ...d, reasoning_text: d.rationale || null });
                if (!error) {
                  await writeOrgEvent({
                    space_id: selectedSpace || null,
                    event_type: 'decision_logged',
                    title: d.decision_text.substring(0, 80),
                    actor_id: user?.id,
                    source_id: videoRecord.id,
                    source_table: 'clipad_videos',
                    importance: d.importance_score || 5,
                  });
                }
              }
              
              for (const c of foundCommitments) {
                const { error } = await supabase.from('clipad_commitments').insert(c);
                if (!error) {
                  await writeOrgEvent({
                    space_id: selectedSpace || null,
                    event_type: 'commitment_detected',
                    title: c.commitment_text.substring(0, 80),
                    actor_id: user?.id,
                    source_id: videoRecord.id,
                    source_table: 'clipad_videos',
                    importance: 4,
                  });
                }
              }
              // -----------------------------------------------------------

            } catch(e) { console.warn("Failed to parse AI output", e); }
          }).catch(()=>{});
        });
      }

      setUploadProgress(100);
      setPhase('done');
      toast({ title: '✓ Video saved!', description: 'Your recording is ready to share.' });
      deleteRecordingState(id);

      // Navigate to the watch page after a brief pause
      setTimeout(() => navigate(`/watch/${videoRecord.id}`), 1500);
    } catch (err) {
      console.error(err);
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
      
      // FIX: If the cloud upload fails completely (e.g. no internet) and we have no URL,
      // generate a local preview URL so the user isn't stuck with a blank screen.
      if (!recordingUrl && chunksRef.current.length > 0) {
        const fallbackBlob = new Blob(chunksRef.current, { type: 'video/webm' });
        setVideoBlob(fallbackBlob);
        setRecordingUrl(URL.createObjectURL(fallbackBlob));
      }
      
      setPhase('review');
    }
  };

  const discard = () => {
    if (recordingUrl) URL.revokeObjectURL(recordingUrl);
    setVideoBlob(null);
    setRecordingUrl(null);
    setRecordingSeconds(0);
    setTitle('');
    setDescription('');
    setTranscript('');
    setPhase('setup');
    deleteRecordingState(id);
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className={`min-h-full ${phase === 'setup' ? 'bg-slate-50 dark:bg-background' : 'bg-slate-50 dark:bg-background'} page-enter overflow-x-hidden pb-24 md:pb-8`}>
      {/* Hidden canvas for PiP compositing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Nav */}
      <nav className="sticky top-0 z-40 flex items-center gap-3 px-6 h-16 bg-white/50 dark:bg-background/80 /80 backdrop-blur-3xl border-b border-black/5 dark:border-white/5">
        <button
          onClick={() => {
            if (phase === 'recording') {
              if (!window.confirm('You are currently recording. Are you sure you want to leave? Your recording will be stopped and may be lost.')) return;
              stopRecording();
            }
            navigate(-1);
          }}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white dark:bg-card backdrop-blur-md border border-black/5 dark:border-white/5 shadow-sm hover:shadow-md text-sm font-semibold text-slate-700 dark:text-slate-200 transition-all hover:-translate-y-0.5"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500 dark:text-muted-foreground" /> Back
        </button>
        <span className="text-slate-900 dark:text-foreground font-bold text-sm">Record Async Video</span>
        {phase === 'recording' && (
          <div className="ml-auto flex items-center gap-3">
            <span className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              REC&nbsp;{formatDuration(recordingSeconds)}
            </span>
          </div>
        )}
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">

{/* SETUP PHASE */}
        {phase === 'setup' && (
          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-10 items-start">
            {/* Left Column: Mode Selection */}
            <div className="space-y-8">
              <div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-foreground mb-2 tracking-tight">Record Video</h1>
                <p className="text-slate-500 dark:text-muted-foreground text-[15px]">Capture and share async updates with your team in seconds.</p>
              </div>

              {!hasDisplayMedia && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl text-amber-800 dark:text-amber-400">
                  <Camera className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold">Camera recording only</p>
                    <p className="text-xs mt-0.5 opacity-80">Screen recording is not supported on mobile browsers. You can record using your camera.</p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <label className="block text-sm font-bold text-slate-900 dark:text-muted-foreground">Recording Mode</label>
                <div className="grid grid-cols-3 gap-3">
                  {MODES.filter(m => hasDisplayMedia || m.id === 'camera_only').map(m => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setMode(m.id)}
                        className={`flex flex-col items-center justify-center p-4 md:p-5 rounded-2xl border transition-all duration-300 shadow-sm active:scale-95 ${mode === m.id ? 'border-[#006065] dark:border-[#00beac] bg-[#006065] dark:bg-card text-[#006065] dark:text-[#00beac] ring-1 ring-[#006065]/20' : 'bg-white dark:bg-card border-slate-200 dark:border-border text-slate-600 dark:text-muted-foreground hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-accent/50'}`}
                      >
                        <Icon className={`w-7 h-7 mb-3 ${mode === m.id ? 'text-[#006065] dark:text-[#00beac]' : 'text-slate-400'}`} />
                        <span className="font-bold text-[13px] text-center leading-tight">
                          {m.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-border">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div onClick={() => setMicEnabled(!micEnabled)} className={`w-11 h-6 rounded-full transition-colors relative ${micEnabled ? 'bg-[#006065] dark:bg-[#00beac]' : 'bg-slate-200 dark:bg-slate-700 group-hover:bg-slate-300 dark:group-hover:bg-slate-600'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white dark:bg-card shadow transition-all ${micEnabled ? 'left-6' : 'left-1'}`} />
                  </div>
                  <span className="text-sm font-semibold text-slate-700 dark:text-muted-foreground flex items-center gap-2">
                    {micEnabled ? <Mic className="w-4 h-4 text-[#006065] dark:text-[#00beac]" /> : <MicOff className="w-4 h-4 text-slate-400" />}
                    Microphone
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <div onClick={() => setStudioSound(!studioSound)} className={`w-11 h-6 rounded-full transition-colors relative ${studioSound ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700 group-hover:bg-slate-300 dark:group-hover:bg-slate-600'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white dark:bg-card shadow transition-all ${studioSound ? 'left-6' : 'left-1'}`} />
                  </div>
                  <span className="text-sm font-semibold text-slate-700 dark:text-muted-foreground flex items-center gap-2">
                    <Wand2 className={`w-4 h-4 ${studioSound ? 'text-indigo-500' : 'text-slate-400'}`} />
                    Studio Sound
                  </span>
                </label>
              </div>
            </div>

            {/* Right Column: Settings & Start */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-3xl p-6 shadow-sm space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-muted-foreground mb-2">Video Title <span className="text-red-500">*</span></label>
                  <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Q3 Feature Walkthrough"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-background border border-slate-200 dark:border-border text-slate-900 dark:text-foreground text-sm placeholder-slate-400 dark:placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#006065]/20 focus:border-[#006065] dark:border-border transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-muted-foreground mb-2">Save to Space <span className="text-red-500">*</span></label>
                  <select
                    value={selectedSpace}
                    onChange={e => setSelectedSpace(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-background border border-slate-200 dark:border-border text-slate-900 dark:text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[#006065]/20 focus:border-[#006065] dark:border-border transition-all appearance-none"
                    style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem top 50%', backgroundSize: '0.65rem auto' }}
                  >
                    <option value="">Select a space...</option>
                    {spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                {/* Teleprompter Toggle & Input */}
                <div className="pt-5 border-t border-slate-100 dark:border-border/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-muted-foreground">
                      <AlignLeft className="w-4 h-4 text-slate-400" /> AI Teleprompter
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="E.g. Announce new product features..."
                      className="flex-1 bg-slate-50 dark:bg-background border border-slate-200 dark:border-border rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-foreground placeholder-slate-400 dark:placeholder-muted-foreground"
                      value={scriptPrompt}
                      onChange={e => setScriptPrompt(e.target.value)}
                    />
                    <button 
                      onClick={generateScript}
                      disabled={isGeneratingScript || !scriptPrompt.trim()}
                      className="bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 px-3 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      {isGeneratingScript ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                      Generate
                    </button>
                  </div>
                  {teleprompterText && (
                    <div className="relative">
                      <textarea
                        className="w-full h-24 bg-slate-50 dark:bg-background border border-slate-200 dark:border-border rounded-xl p-3 text-sm text-slate-900 dark:text-foreground placeholder-slate-400 dark:placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                        value={teleprompterText}
                        onChange={e => setTeleprompterText(e.target.value)}
                      />
                      <button 
                        onClick={refineScript}
                        disabled={isGeneratingScript}
                        className="absolute bottom-2 right-2 bg-white dark:bg-card text-slate-700 dark:text-muted-foreground hover:bg-slate-50 dark:hover:bg-accent border border-slate-200 dark:border-border px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                        title="Make it punchy!"
                      >
                        <Sparkles className="w-3 h-3 text-amber-500" /> Refine
                      </button>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    onClick={startRecording}
                    disabled={countdown !== null || isPreparingStream || !title.trim() || !selectedSpace}
                    className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl ${countdown !== null || isPreparingStream || !title.trim() || !selectedSpace ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed' : 'bg-[#006065] dark:bg-[#053639] hover:bg-[#004a4e] text-white shadow-md hover:shadow-lg hover:-translate-y-0.5'} font-bold text-sm transition-all duration-200`}
                  >
                    {isPreparingStream ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <span className={`w-2 h-2 rounded-full ${countdown !== null || isPreparingStream || !title.trim() || !selectedSpace ? 'bg-slate-400' : 'bg-rose-500 animate-pulse'}`} />
                    )}
                    {isPreparingStream ? 'Accessing Camera...' : countdown !== null ? `Starting in ${countdown}...` : 'Start Recording'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── EXECUTIVE CORPORATE COUNTDOWN OVERLAY ── */}
        {countdown !== null && countdown > 0 && createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/85 backdrop-blur-xl">
            <motion.div 
              key={countdown}
              initial={{ scale: 0.85, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 1.1, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center gap-6 p-10 rounded-3xl bg-slate-900/95 border border-slate-700/80 shadow-[0_25px_70px_rgba(0,0,0,0.8)] text-center min-w-[280px]"
            >
              {/* Executive Counter Visual */}
              <div className="relative flex items-center justify-center w-36 h-36">
                <div className="absolute inset-0 rounded-full border-2 border-[#006065] dark:border-[#00beac] opacity-40 animate-ping" style={{ animationDuration: '1.2s' }} />
                <div className="absolute inset-0 rounded-full border border-white/10 bg-white/5 backdrop-blur-md shadow-inner" />
                <span className="text-8xl font-black text-[#fad503] tabular-nums tracking-tighter drop-shadow-[0_4px_30px_rgba(250,213,3,0.45)]">
                  {countdown}
                </span>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 shadow-sm">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-rose-500" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                </span>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-white">Starting Recording</span>
              </div>
            </motion.div>
          </div>,
          document.body
        )}

        {/* RECORDING PHASE */}
        {phase === 'recording' && (
          <div className="flex flex-col items-center gap-6 relative pb-24">
            
            {teleprompterText && showTeleprompter && (
              <div className="relative w-full max-w-4xl mx-auto mb-6 bg-white dark:bg-card backdrop-blur-3xl border border-black/5 dark:border-white/5 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] overflow-hidden z-40 transition-all flex flex-col">
                <div className="bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/5 px-5 py-3 flex items-center justify-between cursor-move">
                  <div className="flex items-center gap-2">
                    <AlignLeft className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                    <h3 className="text-xs font-black text-slate-900 dark:text-foreground uppercase tracking-widest">AI Teleprompter</h3>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-muted-foreground bg-slate-100 dark:bg-black/20 px-4 py-1.5 rounded-full border border-black/5 dark:border-white/5">
                      <span>Speed</span>
                      <input type="range" min="0" max="10" value={scrollSpeed} onChange={e => setScrollSpeed(Number(e.target.value))} className="w-24 h-2 bg-slate-300 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                    </div>
                    <button 
                      onClick={() => setShowTeleprompter(false)}
                      className="text-white/60 hover:text-white/90 dark:text-foreground/70 dark:hover:text-white transition-colors p-1"
                    >
                      <XCircle className="w-6 h-6" />
                    </button>
                  </div>
                </div>
                <div 
                  ref={teleprompterRef}
                  className="p-8 md:p-12 max-h-96 overflow-y-auto text-2xl md:text-3xl lg:text-[32px] font-medium text-slate-900 dark:text-foreground leading-[1.6] text-center scroll-smooth drop-shadow-sm"
                >
                  {teleprompterText.split('\n').map((line, i) => <p key={i} className="mb-6 last:mb-0 opacity-90 hover:opacity-100 transition-opacity">{line}</p>)}
                </div>
              </div>
            )}

            <div id="preview-container" className="relative w-full max-w-2xl rounded-3xl overflow-hidden bg-white dark:bg-black aspect-video shadow-xl border border-slate-200 dark:border-border select-none ring-4 ring-white dark:ring-transparent">
              <audio ref={audioRef} autoPlay style={{ display: 'none' }} />
              {mode === 'screen_camera' && (
                <>
                  <video ref={previewRef} autoPlay muted playsInline className="w-full h-full object-contain" />
                  {streamsRef.current?.camera && (
                    <div 
                      className="absolute z-50 cursor-grab active:cursor-grabbing rounded-xl overflow-hidden shadow-xl ring-2 ring-indigo-500/80 bg-black"
                      style={{ 
                        width: '22%', 
                        left: `${camPos.x}%`, 
                        top: `${camPos.y}%`, 
                        aspectRatio: '16/9' 
                      }}
                      onMouseDown={handlePiPMouseDown}
                    >
                      <video 
                        autoPlay 
                        muted 
                        playsInline 
                        className="w-full h-full object-cover scale-x-[-1]" 
                        ref={v => { if (v && v.srcObject !== streamsRef.current?.camera) v.srcObject = streamsRef.current?.camera; }} 
                      />
                    </div>
                  )}
                </>
              )}
              {mode === 'camera_only' && (
                <video ref={previewRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
              )}
              {mode === 'screen_only' && (
                <div className="w-full h-full flex items-center justify-center bg-slate-50 dark:bg-background">
                  <div className="text-center text-slate-500 dark:text-muted-foreground">
                    <Monitor className="w-16 h-16 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Recording your screen…</p>
                  </div>
                </div>
              )}

              {/* Recording indicator */}
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-white text-sm font-mono font-bold">{formatDuration(recordingSeconds)}</span>
              </div>
            </div>

            {/* FLOATING PILL CONTROLS */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 p-1.5 bg-white dark:bg-card border border-slate-200 dark:border-border rounded-[24px] shadow-xl">
              <button
                onClick={togglePause}
                className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${isPaused ? 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30' : 'bg-white dark:bg-card text-slate-700 dark:text-muted-foreground hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10'}`}
                title={isPaused ? 'Resume' : 'Pause'}
              >
                {isPaused ? <Play className="w-5 h-5 fill-current" /> : <Pause className="w-5 h-5 fill-current" />}
              </button>
              
              {!pipWindow && ('documentPictureInPicture' in window) && (
                <button
                  onClick={() => startPip(window.documentPictureInPicture.requestWindow({ width: 320, height: 180 }).catch(console.error))}
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-card text-indigo-500 dark:text-indigo-400 hover:bg-black/5 dark:hover:bg-white/10 transition-all"
                  title="Open PiP Controls"
                >
                  <Monitor className="w-5 h-5" />
                </button>
              )}

              {teleprompterText && !showTeleprompter && (
                <button
                  onClick={() => setShowTeleprompter(true)}
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-card text-white/80 dark:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-all"
                  title="Show Teleprompter"
                >
                  <AlignLeft className="w-5 h-5" />
                </button>
              )}

              <div className="w-px h-8 bg-white/15 dark:bg-slate-700 mx-1"></div>

              <button
                onClick={stopRecording}
                className="flex items-center gap-2 pl-4 pr-5 py-3 rounded-full bg-red-500 hover:bg-red-400 text-white font-bold transition-all shadow-lg shadow-red-500/20"
              >
                <div className="w-4 h-4 bg-white dark:bg-card border border-slate-300 dark:border-border rounded-sm"></div>
                Stop
              </button>
            </div>
          </div>
        )}

        {/* REVIEW PHASE */}
        {phase === 'review' && recordingUrl && (
          <div className="space-y-6">
            {!activeVideoId && (
              <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex items-start gap-3 mb-4">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-amber-500">Unsaved Draft</h4>
                  <p className="text-xs text-amber-500/80 mt-1">This recording is stored locally and will be permanently deleted in 24 hours. Please click Save to upload it.</p>
                </div>
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-foreground mb-1">Review your recording</h2>
              <p className="text-slate-500 dark:text-muted-foreground text-sm">{formatDuration(recordingSeconds)} Â· {0} MB</p>
            </div>

            <div className="rounded-2xl overflow-hidden bg-black aspect-video">
              <video ref={playbackRef} src={recordingUrl} controls className="w-full h-full object-contain" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-muted-foreground mb-2 uppercase tracking-wider">Title *</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Give your video a title"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-background border border-slate-200 dark:border-border text-slate-900 dark:text-foreground text-sm placeholder-slate-400 dark:placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#006065]/20 focus:border-[#006065] dark:border-border transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-muted-foreground mb-2 uppercase tracking-wider">Space *</label>
                <select
                  value={selectedSpace}
                  onChange={e => setSelectedSpace(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-background border border-slate-200 dark:border-border text-slate-900 dark:text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[#006065]/20 focus:border-[#006065] dark:border-border transition-all"
                >
                  <option value="">No space</option>
                  {spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            {activeVideoId && (
              <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-indigo-900 dark:text-indigo-300">Share Link</h4>
                  <p className="text-xs text-indigo-700/70 dark:text-indigo-300/70">{window.location.origin}/watch/{activeVideoId}</p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/watch/${activeVideoId}`);
                    toast({ title: 'Copied!', description: 'Share link copied to clipboard.' });
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg transition-colors"
                >
                  Copy
                </button>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-muted-foreground mb-2 uppercase tracking-wider">Description (optional)</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What is this video about?"
                rows={2}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-background border border-slate-200 dark:border-border text-slate-900 dark:text-foreground text-sm placeholder-slate-400 dark:placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#006065]/20 focus:border-[#006065] dark:border-border transition-all resize-none"
              />
            </div>

{/* Action Row: Visibility, Lock Settings & Save Buttons */}
            <div className="mt-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="flex-1 max-w-[220px]">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-muted-foreground mb-2 uppercase tracking-wider">Visibility</label>
                  <select
                    value={visibility}
                    onChange={e => setVisibility(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-background border border-slate-200 dark:border-border text-slate-900 dark:text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[#006065]/20 focus:border-[#006065] dark:border-border transition-all appearance-none"
                    style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem top 50%', backgroundSize: '0.65rem auto' }}
                  >
                    <option value="internal">Internal (Company Only)</option>
                    <option value="external">External (Anyone with link)</option>
                  </select>
                </div>

                <div className="flex-1 max-w-[220px]">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-muted-foreground mb-2 uppercase tracking-wider">Access Control</label>
                  <select
                    value={lockType}
                    onChange={e => setLockType(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-background border border-slate-200 dark:border-border text-slate-900 dark:text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[#006065]/20 focus:border-[#006065] dark:border-border transition-all appearance-none"
                    style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem top 50%', backgroundSize: '0.65rem auto' }}
                  >
                    <option value="none">Public (Space Members)</option>
                    <option value="manual">Locked (Only Me)</option>
                    <option value="scheduled">Scheduled Release</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-4 md:mt-0">
                {!activeVideoId && recordingUrl && (
                  <button onClick={() => {
                    const a = document.createElement('a');
                    a.href = recordingUrl;
                    a.download = `recording-${Date.now()}.webm`;
                    a.click();
                  }} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white dark:bg-card border border-slate-200 dark:border-border text-slate-700 dark:text-muted-foreground hover:bg-slate-50 dark:hover:bg-accent font-bold text-sm transition-all shadow-sm">
                    <Download className="w-4 h-4" /> Download
                  </button>
                )}
                <button onClick={discard} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 border border-red-200 dark:border-rose-500/30 text-red-600 dark:text-rose-400 font-bold text-sm transition-all shadow-sm">
                  <RotateCcw className="w-4 h-4" /> Discard
                </button>
                <button onClick={uploadRecording} disabled={!title.trim() || !selectedSpace} className="flex items-center gap-2 px-8 py-3 rounded-xl bg-[#006065] dark:bg-[#053639] hover:bg-[#004a4e] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold shadow-lg shadow-[#006065]/25 transition-all text-sm">
                  <Upload className="w-4 h-4" /> {activeVideoId ? 'Save Details' : 'Save to CliPad'}
                </button>
              </div>
            </div>

            {lockType === 'scheduled' && (
              <div className="mt-4 p-5 bg-amber-50/50 dark:bg-amber-500/10 rounded-xl border border-amber-100/50 dark:border-amber-500/20 backdrop-blur-md flex gap-4 animate-in fade-in slide-in-from-top-2">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-amber-800 dark:text-amber-500 mb-1.5">Unlock Date</label>
                  <input type="date" value={unlockDate} onChange={e => setUnlockDate(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white dark:bg-card border border-black/5 dark:border-white/5 text-slate-900 dark:text-foreground text-sm" min={new Date().toISOString().split('T')[0]} />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-amber-800 dark:text-amber-500 mb-1.5">Unlock Time</label>
                  <input type="time" value={unlockTime} onChange={e => setUnlockTime(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white dark:bg-card border border-black/5 dark:border-white/5 text-slate-900 dark:text-foreground text-sm" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* UPLOADING PHASE */}
        {phase === 'uploading' && (
          <div className="flex flex-col items-center justify-center py-24 gap-6">
            <div className="w-20 h-20 rounded-full bg-[#006065] dark:bg-[#053639]/10 border-2 border-indigo-500/20 flex items-center justify-center mb-2">
              <Upload className="w-8 h-8 text-[#006065] dark:text-[#00beac] animate-bounce" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Uploading your video…</h2>
            <p className="text-sm text-slate-500 dark:text-muted-foreground">This may take a moment depending on your connection speed.</p>
            <div className="w-80">
              <div className="flex justify-between text-xs text-slate-500 dark:text-muted-foreground mb-2">
                <span>Uploading</span><span>{uploadProgress}%</span>
              </div>
              <div className="h-2 rounded-full bg-secondary/80 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
            <button
              onClick={() => {
                if (window.confirm('Cancel upload? Your recording will be available for local review but not saved to KERINT.')) {
                  if (wsRef.current) {
                    try { wsRef.current.close(1000); } catch (_) {}
                  }
                  const blob = new Blob(chunksRef.current, { type: 'video/webm' });
                  if (blob.size > 0) {
                    const url = URL.createObjectURL(blob);
                    setVideoBlob(blob);
                    setRecordingUrl(url);
                  }
                  setPhase(chunksRef.current.length > 0 ? 'review' : 'setup');
                }
              }}
              className="text-xs text-slate-500 dark:text-muted-foreground hover:text-rose-500 underline transition-colors mt-2"
            >
              Taking too long? Cancel upload
            </button>
          </div>
        )}


        {/* DONE PHASE */}
        {phase === 'done' && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-20 h-20 rounded-full bg-[#006065] dark:bg-[#053639]/10 border-2 border-[#006065] dark:border-border/30 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-[#006065]" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Video saved!</h2>
            <p className="text-slate-500 dark:text-muted-foreground text-sm">Redirecting to your video…</p>
          </div>
        )}
      </div>
      
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        featureName="Longer Recordings"
        limitDescription={`You have reached the ${getUserPlan(user) === 'pro' ? '1-hour' : '15-minute'} recording limit on the ${getUserPlan(user)} plan.`}
      />
    </div>
  );
}

