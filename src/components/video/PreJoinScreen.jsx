import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video as VideoIcon, VideoOff, AlertCircle, Copy, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { VIRTUAL_BACKGROUNDS } from './VideoRoom';

export default function PreJoinScreen({ roomName, onJoin, defaultName = 'Guest' }) {
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [error, setError] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [selectedBg, setSelectedBg] = useState(VIRTUAL_BACKGROUNDS[0]);

  // Device selection
  const [cameras, setCameras] = useState([]);
  const [microphones, setMicrophones] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [selectedMic, setSelectedMic] = useState('');
  const [showDevices, setShowDevices] = useState(false);

  // Fix #15: bar heights stored in a ref, updated by RAF — no Math.random() in render
  const barHeightsRef = useRef([20, 20, 20, 20, 20]);
  const [barHeights, setBarHeights] = useState([20, 20, 20, 20, 20]);

  const navigate = useNavigate();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const { toast } = useToast();

  // Enumerate available devices once permission is granted
  const enumerateDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cams = devices.filter(d => d.kind === 'videoinput');
      const mics = devices.filter(d => d.kind === 'audioinput');
      setCameras(cams);
      setMicrophones(mics);
      if (cams.length > 0 && !selectedCamera) setSelectedCamera(cams[0].deviceId);
      if (mics.length > 0 && !selectedMic) setSelectedMic(mics[0].deviceId);
    } catch (_) {}
  };

  const startMedia = async (cameraId, micId) => {
    // Stop existing stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    try {
      const videoConstraints = cameraId
        ? { deviceId: { exact: cameraId }, width: { ideal: 1280 }, height: { ideal: 720 } }
        : { width: { ideal: 1280 }, height: { ideal: 720 } };
      const audioConstraints = micId
        ? { deviceId: { exact: micId }, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        : { echoCancellation: true, noiseSuppression: true, autoGainControl: true };

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: audioConstraints
      });

      streamRef.current = stream;
      setLocalStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Apply current toggle states
      stream.getAudioTracks().forEach(t => { t.enabled = isMicOn; });
      stream.getVideoTracks().forEach(t => { t.enabled = isVideoOn; });

      setError(null);
      // Now enumerate devices (labels only available after permission granted)
      await enumerateDevices();
    } catch (err) {
      if (err.name !== 'NotFoundError') {
        console.warn("Could not access camera/mic for pre-join preview", err);
      }
      setError("Camera or microphone access denied. You can still join without them.");
      setIsMicOn(false);
      setIsVideoOn(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      if (!mounted) return;
      await startMedia(selectedCamera, selectedMic);
    };
    init();
    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount

  // Re-start media when device selection changes
  const handleDeviceChange = async (type, deviceId) => {
    if (type === 'camera') {
      setSelectedCamera(deviceId);
      await startMedia(deviceId, selectedMic);
    } else {
      setSelectedMic(deviceId);
      await startMedia(selectedCamera, deviceId);
    }
  };

  // Fix #15: Audio Visualizer — deterministic heights, no Math.random() in render loop
  useEffect(() => {
    if (!localStream || !isMicOn) {
      setBarHeights([20, 20, 20, 20, 20]);
      return;
    }

    let audioContext;
    let analyser;
    let microphone;
    let animationFrame;

    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      analyser.smoothingTimeConstant = 0.8;
      analyser.fftSize = 256;
      microphone = audioContext.createMediaStreamSource(localStream);
      microphone.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      // Use fixed frequency bands for each bar — no randomness
      const bandIndices = [4, 8, 12, 16, 22];

      const checkVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        const heights = bandIndices.map(idx => {
          const val = dataArray[idx] || 0;
          return Math.max(20, Math.round((val / 255) * 100));
        });
        barHeightsRef.current = heights;
        setBarHeights([...heights]);
        animationFrame = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (err) {
      console.warn("AudioContext error for visualizer", err);
    }

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(console.error);
      }
    };
  }, [localStream, isMicOn]);

  const toggleMic = async () => {
    const newState = !isMicOn;
    setIsMicOn(newState);
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(t => { t.enabled = newState; });
    } else if (newState) {
      await startMedia(selectedCamera, selectedMic);
    }
  };

  const toggleVideo = async () => {
    const newState = !isVideoOn;
    setIsVideoOn(newState);
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach(t => { t.enabled = newState; });
    } else if (newState) {
      await startMedia(selectedCamera, selectedMic);
    }
  };

  const handleJoinClick = () => {
    // Stop local preview tracks before passing control to Daily
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    onJoin({
      name: defaultName || 'Guest',
      micOn: isMicOn,
      videoOn: isVideoOn,
      backgroundConfig: selectedBg,
      cameraDeviceId: selectedCamera || undefined,
      micDeviceId: selectedMic || undefined,
    });
  };

  return (
    <div className="w-full h-full min-h-full bg-slate-50 dark:bg-[#050810] flex flex-col md:flex-row items-center justify-center p-4 md:p-12 gap-4 md:gap-16 overflow-x-hidden overflow-y-auto relative">
      {/* Realistic Background Layers */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-primary/5 dark:bg-primary/10 blur-[120px]" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-blue-500/5 dark:bg-blue-500/10 blur-[120px]" />
      </div>
      
      {/* Left Side: Camera Preview */}
      <div className="relative z-10 w-full md:flex-1 flex flex-col items-center md:items-end justify-center max-w-3xl mt-12 md:mt-0">
        <div className="relative w-full max-w-sm md:max-w-none aspect-[4/3] md:aspect-video bg-gradient-to-br from-slate-900 to-black rounded-[2rem] overflow-hidden flex items-center justify-center transition-colors shadow-2xl border border-white/10">
          
          {/* Video element is always rendered to preserve srcObject, but hidden when isVideoOn is false */}
          <video 
            ref={videoRef}
            autoPlay 
            muted 
            playsInline 
            className={`w-full h-full object-cover transform -scale-x-100 ${!isVideoOn ? 'hidden' : ''}`} 
          />
          
          {!isVideoOn && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-primary z-10">
              <div className="w-24 h-24 bg-black/10 rounded-full flex items-center justify-center mb-6 shadow-sm border border-black/5">
                <VideoOff className="w-10 h-10 text-white/90" />
              </div>
              <p className="font-medium text-lg text-white/90 tracking-wide">Camera is off</p>
            </div>
          )}

          {error && (
            <div className="absolute top-4 left-4 right-4 bg-red-50 dark:bg-red-950/95 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-5 py-4 rounded-2xl flex items-start gap-3 shadow-md">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm font-medium leading-relaxed">{error}</p>
            </div>
          )}

          {/* Overlay Controls */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-20">
            {/* Fix #15: Audio Visualizer with deterministic bar heights */}
            <div className={`flex items-center gap-1.5 h-6 transition-opacity duration-300 ${isMicOn ? 'opacity-100' : 'opacity-0'}`}>
              {barHeights.map((h, i) => (
                <div 
                  key={i}
                  className="w-1.5 bg-green-500 rounded-full transition-all duration-75"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>

            <div className="flex items-center gap-4 bg-black/50 backdrop-blur-xl px-5 py-3 rounded-full shadow-2xl border border-white/10">
              <Button 
                onClick={toggleMic}
                variant={isMicOn ? "outline" : "destructive"}
                size="icon"
                className={`w-12 h-12 rounded-full shadow-sm transition-all duration-300 ${isMicOn ? 'bg-transparent hover:bg-white/10 border-white/20 text-white' : 'border-0'}`}
              >
                {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5 text-white" />}
              </Button>
              <Button 
                onClick={toggleVideo}
                variant={isVideoOn ? "outline" : "destructive"}
                size="icon"
                className={`w-12 h-12 rounded-full shadow-sm transition-all duration-300 ${isVideoOn ? 'bg-transparent hover:bg-white/10 border-white/20 text-white' : 'border-0'}`}
              >
                {isVideoOn ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5 text-white" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Device Selector (shown when multiple devices available) */}
        {(cameras.length > 1 || microphones.length > 1) && (
          <div className="mt-3 w-full max-w-sm md:max-w-none">
            <button
              onClick={() => setShowDevices(!showDevices)}
              className="flex items-center gap-2 text-xs text-slate-500 dark:text-muted-foreground hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDevices ? 'rotate-180' : ''}`} />
              Change camera / microphone
            </button>
            {showDevices && (
              <div className="mt-2 space-y-2 bg-white/80 dark:bg-card/80 backdrop-blur-xl border border-slate-200 dark:border-border rounded-2xl p-4">
                {cameras.length > 1 && (
                  <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-muted-foreground mb-1 block">Camera</label>
                    <select
                      value={selectedCamera}
                      onChange={e => handleDeviceChange('camera', e.target.value)}
                      className="w-full text-sm bg-slate-50 dark:bg-secondary border border-slate-200 dark:border-border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {cameras.map(cam => (
                        <option key={cam.deviceId} value={cam.deviceId}>
                          {cam.label || `Camera ${cameras.indexOf(cam) + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {microphones.length > 1 && (
                  <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-muted-foreground mb-1 block">Microphone</label>
                    <select
                      value={selectedMic}
                      onChange={e => handleDeviceChange('mic', e.target.value)}
                      className="w-full text-sm bg-slate-50 dark:bg-secondary border border-slate-200 dark:border-border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {microphones.map(mic => (
                        <option key={mic.deviceId} value={mic.deviceId}>
                          {mic.label || `Microphone ${microphones.indexOf(mic) + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Side: Join Form */}
      <div className="relative z-10 flex-1 flex flex-col items-center md:items-start text-center md:text-left justify-center w-full max-w-md bg-transparent p-6 md:p-10 space-y-8">
        <div>
          <h1 className="text-[2rem] font-medium text-slate-900 dark:text-foreground tracking-tight leading-tight">Ready to join?</h1>
          <p className="text-slate-500 dark:text-muted-foreground mt-1 text-base">{roomName || 'Secure Meeting'}</p>
        </div>

        <div className="space-y-5">
          <div className="bg-white/50 dark:bg-[#111827]/50 backdrop-blur-sm border border-slate-200 dark:border-border rounded-2xl px-5 py-4 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Joining as</span>
            <span className="font-semibold text-slate-900 dark:text-foreground">{defaultName || 'Guest'}</span>
          </div>

          <Button
            className="w-full py-6 text-lg rounded-full font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all"
            onClick={handleJoinClick}
          >
            Ask to join
          </Button>

          <Button
            variant="ghost"
            className="w-full text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 py-6 rounded-2xl font-medium"
            onClick={() => {
              navigator.clipboard.writeText(window.location.origin + '/join/' + (roomName || window.location.pathname.split('/').pop()));
              toast({ title: 'Copied!', description: 'Meeting link copied to clipboard.' });
            }}
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy meeting link
          </Button>
        </div>
      </div>
    </div>
  );
}
