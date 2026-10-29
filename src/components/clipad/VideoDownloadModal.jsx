import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import { hasFeature } from '@/lib/clipadPricing';
import { Download, AlertCircle, Loader2, Lock, Monitor, Smartphone, Video, Film, Music, Check } from 'lucide-react';
import { fixWebmDuration } from '@/lib/webmDurationFixer';

export default function VideoDownloadModal({ open, onOpenChange, videoUrl, videoTitle }) {
  const { user } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState(null);
  
  // Format options
  const [selectedFormat, setSelectedFormat] = useState('mp4'); // 'mp4' | 'webm' | 'wav'
  const [selectedQuality, setSelectedQuality] = useState('1080p'); // '1080p' | '720p' | '480p'
  
  const canDownload = hasFeature(user, 'hasVideoDownload');

  const QUALITIES = [
    { id: '1080p', label: '1080p Full HD', desc: 'Highest clarity & crisp resolution', scale: '1920:1080', icon: Monitor },
    { id: '720p', label: '720p HD', desc: 'Fast download, balanced file size', scale: '1280:720', icon: Video },
    { id: '480p', label: '480p SD', desc: 'Lightweight & instant playback', scale: '854:480', icon: Smartphone }
  ];

  const FORMATS = [
    { 
      id: 'mp4', 
      label: 'MP4 Video', 
      desc: 'Universal compatibility across Windows, Mac, iOS, Android & media players', 
      badge: 'Recommended',
      icon: Film 
    },
    { 
      id: 'webm', 
      label: 'WebM Video', 
      desc: 'Fastest download with fixed duration & seamless scrubbing indices', 
      badge: 'Original Web',
      icon: Video 
    },
    { 
      id: 'wav', 
      label: 'WAV Audio Only', 
      desc: 'Lossless uncompressed studio master audio extraction', 
      badge: 'Audio Only',
      icon: Music 
    }
  ];

  const triggerDownload = (url, filename) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Convert an AudioBuffer to a valid 16-bit PCM WAV Blob
  const audioBufferToWav = (buffer) => {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    
    let interleaved;
    if (numChannels === 2) {
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);
      interleaved = new Float32Array(left.length + right.length);
      for (let src = 0, dst = 0; src < left.length; src++) {
        interleaved[dst++] = left[src];
        interleaved[dst++] = right[src];
      }
    } else {
      interleaved = buffer.getChannelData(0);
    }
    
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = interleaved.length * bytesPerSample;
    const bufferSize = 44 + dataSize;
    
    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);
    
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);
    
    // Write PCM 16-bit samples
    let offset = 44;
    for (let i = 0; i < interleaved.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, interleaved[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    
    return new Blob([view], { type: 'audio/wav' });
  };

  // Convert raw WebM to audio WAV with zero loss
  const extractWavAudio = async (rawBlob, filename) => {
    setStatusText('Decoding high-fidelity audio tracks...');
    setProgress(50);
    
    const arrayBuffer = await rawBlob.arrayBuffer();
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    let audioBuffer;
    try {
      audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    } finally {
      if (audioCtx.state !== 'closed') audioCtx.close().catch(() => {});
    }
    
    setStatusText('Encoding lossless 16-bit PCM WAV master...');
    setProgress(85);
    const wavBlob = audioBufferToWav(audioBuffer);
    
    const url = URL.createObjectURL(wavBlob);
    triggerDownload(url, `${filename}.wav`);
    URL.revokeObjectURL(url);
    setProgress(100);
    setStatusText('Download complete!');
  };

  const handleDownload = async () => {
    if (!canDownload) return;
    
    setDownloading(true);
    setError(null);
    setProgress(0);
    
    try {
      if (!videoUrl) throw new Error('Video URL is missing.');

      setStatusText('Fetching video stream...');
      
      const response = await fetch(videoUrl);
      if (!response.ok) throw new Error('Failed to fetch video stream from cloud');
      
      const contentLength = response.headers.get('content-length');
      const total = parseInt(contentLength, 10);
      
      const reader = response.body.getReader();
      const chunks = [];
      let received = 0;
      
      while(true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        if (total) {
          // Keep fetch progress between 0 and 40%
          setProgress(Math.round((received / total) * 40));
        }
      }
      
      const rawBlob = new Blob(chunks, { type: 'video/webm' });
      const safeTitle = (videoTitle || 'Clipad_Video').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      
      if (selectedFormat === 'wav') {
        await extractWavAudio(rawBlob, safeTitle);
      } else if (selectedFormat === 'mp4') {
        setStatusText('Loading FFmpeg transcoding engine...');
        setProgress(45);
        
        try {
          const { FFmpeg } = await import('@ffmpeg/ffmpeg');
          const { toBlobURL, fetchFile } = await import('@ffmpeg/util');
          
          const ffmpeg = new FFmpeg();
          
          ffmpeg.on('progress', ({ progress: p }) => {
            const mappedProgress = Math.min(98, Math.round(50 + p * 45));
            setProgress(mappedProgress);
            setStatusText(`Encoding universal MP4 (${selectedQuality})... ${mappedProgress}%`);
          });
          
          const coreBase = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
          await ffmpeg.load({
            coreURL: await toBlobURL(`${coreBase}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${coreBase}/ffmpeg-core.wasm`, 'application/wasm'),
          });
          
          setStatusText(`Preparing video transcode for ${selectedQuality} MP4...`);
          setProgress(50);
          
          await ffmpeg.writeFile('input.webm', await fetchFile(rawBlob));
          
          // Determine scale filter
          const targetQ = QUALITIES.find(q => q.id === selectedQuality) || QUALITIES[0];
          const args = [
            '-i', 'input.webm',
            '-vf', `scale=${targetQ.scale}:force_original_aspect_ratio=decrease,pad=${targetQ.scale}:(ow-iw)/2:(oh-ih)/2`,
            '-c:v', 'libx264',
            '-preset', 'veryfast',
            '-pix_fmt', 'yuv420p',
            '-c:a', 'aac',
            '-b:a', '192k',
            '-movflags', '+faststart',
            'output.mp4'
          ];
          
          await ffmpeg.exec(args);
          
          const data = await ffmpeg.readFile('output.mp4');
          const mp4Blob = new Blob([data.buffer], { type: 'video/mp4' });
          const url = URL.createObjectURL(mp4Blob);
          triggerDownload(url, `${safeTitle}_${selectedQuality}.mp4`);
          URL.revokeObjectURL(url);
          
          setProgress(100);
          setStatusText('MP4 download complete!');
        } catch (ffmpegErr) {
          console.warn('FFmpeg client-side transcode failed or restricted by headers, falling back to seekable WebM:', ffmpegErr);
          setStatusText('Finalizing seekable video stream with full duration...');
          setProgress(90);
          
          let fixedBlob = rawBlob;
          try {
            // Determine video duration via hidden video element
            const durationSec = await new Promise((res) => {
              const tempVideo = document.createElement('video');
              tempVideo.preload = 'metadata';
              tempVideo.src = URL.createObjectURL(rawBlob);
              tempVideo.onloadedmetadata = () => {
                const dur = tempVideo.duration;
                URL.revokeObjectURL(tempVideo.src);
                res(isFinite(dur) && dur > 0 ? dur : 10);
              };
              tempVideo.onerror = () => res(10);
            });
            fixedBlob = await fixWebmDuration(rawBlob, durationSec * 1000);
          } catch(e) {
            console.warn('Duration patch warning:', e);
          }
          
          const url = URL.createObjectURL(fixedBlob);
          triggerDownload(url, `${safeTitle}_${selectedQuality}.webm`);
          URL.revokeObjectURL(url);
          setProgress(100);
          setStatusText('Seekable WebM downloaded successfully!');
        }
      } else {
        // WebM format selected: calculate exact duration and inject Cues + Duration metadata for smooth scrubbing & audio
        setStatusText('Injecting seekable indices & duration metadata...');
        setProgress(70);
        
        const durationSec = await new Promise((res) => {
          const tempVideo = document.createElement('video');
          tempVideo.preload = 'metadata';
          tempVideo.src = URL.createObjectURL(rawBlob);
          tempVideo.onloadedmetadata = () => {
            const dur = tempVideo.duration;
            URL.revokeObjectURL(tempVideo.src);
            res(isFinite(dur) && dur > 0 ? dur : 10);
          };
          tempVideo.onerror = () => res(10);
        });
        
        let fixedBlob = rawBlob;
        try {
          fixedBlob = await fixWebmDuration(rawBlob, durationSec * 1000);
        } catch(e) {
          console.warn('Duration patch warning:', e);
        }
        
        setProgress(95);
        const url = URL.createObjectURL(fixedBlob);
        triggerDownload(url, `${safeTitle}_${selectedQuality}.webm`);
        URL.revokeObjectURL(url);
        setProgress(100);
        setStatusText('WebM downloaded successfully!');
      }
      
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
      
    } catch (err) {
      console.error('Download failed:', err);
      setError(err.message || 'Download failed. Please try again.');
    } finally {
      if (!error) {
        setDownloading(false);
      }
    }
  };

  const handleClose = (openState) => {
    if (!downloading) {
      onOpenChange(openState);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-y-auto max-h-[90vh] bg-white dark:bg-card border-slate-200 dark:border-border rounded-2xl shadow-2xl">
        <div className="p-6">
          <DialogHeader className="mb-5">
            <DialogTitle className="flex flex-col items-center gap-2 text-center">
              <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Download className="w-5 h-5" />
              </div>
              <span className="text-lg font-bold text-slate-900 dark:text-foreground">Download Recording</span>
              <p className="text-xs text-slate-500 dark:text-muted-foreground">
                Select your preferred format & resolution
              </p>
            </DialogTitle>
          </DialogHeader>

          {!canDownload ? (
            <div className="text-center space-y-5">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/40 dark:to-amber-900/10 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-amber-200/50 dark:border-amber-700/30">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-foreground text-base">Pro Feature</h3>
                <p className="text-xs text-slate-500 dark:text-muted-foreground mt-1 leading-relaxed px-2">
                  Video downloads are enabled for your workspace account.
                </p>
              </div>
              <Button className="w-full rounded-xl py-5 font-semibold text-sm" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl text-xs font-medium flex items-start gap-2 border border-red-100 dark:border-red-900/30">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {!downloading ? (
                <div className="space-y-4">
                  {/* Format Selector */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2">
                      Export Format
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {FORMATS.map(f => {
                        const Icon = f.icon;
                        const isSelected = selectedFormat === f.id;
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setSelectedFormat(f.id)}
                            className={`w-full flex items-center p-3 rounded-xl border-2 text-left transition-all group ${
                              isSelected 
                                ? 'border-primary bg-primary/5 shadow-xs' 
                                : 'border-slate-100 dark:border-border hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-900/30'
                            }`}
                          >
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mr-3 shrink-0 transition-colors ${
                              isSelected ? 'bg-primary/10 text-primary' : 'bg-slate-100 dark:bg-secondary text-slate-500 dark:text-muted-foreground group-hover:text-slate-700'
                            }`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0 pr-2">
                              <div className="flex items-center gap-2">
                                <span className={`font-bold text-xs ${isSelected ? 'text-primary' : 'text-slate-800 dark:text-foreground'}`}>
                                  {f.label}
                                </span>
                                {f.badge && (
                                  <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-primary/10 text-primary border border-primary/20">
                                    {f.badge}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-muted-foreground truncate mt-0.5">
                                {f.desc}
                              </p>
                            </div>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                              isSelected ? 'bg-primary border-primary text-white' : 'border-slate-300 dark:border-slate-600'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Resolution Selector (only if not audio only) */}
                  {selectedFormat !== 'wav' && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2">
                        Resolution & Quality
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {QUALITIES.map(q => {
                          const isSelected = selectedQuality === q.id;
                          return (
                            <button
                              key={q.id}
                              type="button"
                              onClick={() => setSelectedQuality(q.id)}
                              className={`flex flex-col items-center justify-center p-2.5 rounded-xl border-2 text-center transition-all ${
                                isSelected 
                                  ? 'border-primary bg-primary/5 shadow-xs' 
                                  : 'border-slate-100 dark:border-border hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50/50'
                              }`}
                            >
                              <span className={`font-bold text-xs ${isSelected ? 'text-primary' : 'text-slate-800 dark:text-foreground'}`}>
                                {q.id}
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-muted-foreground mt-0.5 truncate w-full">
                                {q.id === '1080p' ? 'Full HD' : q.id === '720p' ? 'HD' : 'SD'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2.5 pt-3">
                    <Button variant="outline" className="flex-1 rounded-xl text-xs font-semibold py-2.5" onClick={() => onOpenChange(false)}>
                      Cancel
                    </Button>
                    <Button className="flex-1 rounded-xl text-xs font-bold py-2.5 shadow-sm" onClick={handleDownload}>
                      Download Now
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center space-y-4">
                  <div className="relative w-14 h-14 mx-auto">
                    <Loader2 className="w-14 h-14 animate-spin text-primary/20" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Download className="w-5 h-5 text-primary animate-pulse" />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-foreground">{statusText}</div>
                    {progress > 0 && (
                      <div className="text-2xl font-black text-primary mt-1">{progress}%</div>
                    )}
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                    Standard audio & video processing pipeline
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
