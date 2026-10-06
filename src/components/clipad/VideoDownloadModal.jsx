import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import { hasFeature } from '@/lib/clipadPricing';
import { Download, AlertCircle, Loader2, Lock, Monitor, Smartphone, Video } from 'lucide-react';
import coreURL from '@ffmpeg/core?url';
import wasmURL from '@ffmpeg/core/wasm?url';
import { supabase } from '@/api/supabaseClient';

export default function VideoDownloadModal({ open, onOpenChange, videoUrl, videoTitle }) {
  const { user } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState(null);
  const [selectedQuality, setSelectedQuality] = useState('1080p');
  
  const ffmpegRef = useRef(null);
  const canDownload = hasFeature(user, 'hasVideoDownload');

  const QUALITIES = [
    { id: '1080p', label: '1080p Original', desc: 'Highest quality, raw file', ext: 'webm', icon: Monitor }
  ];

  const extractPathFromUrl = (url) => {
    if (!url) return null;
    const parts = url.split('/clipad_videos/');
    if (parts.length > 1) {
      // Decode URI component in case of spaces etc.
      return decodeURIComponent(parts[1]);
    }
    return null;
  };



  const downloadDirect = async (signedUrl, filename) => {
    setStatusText('Downloading original video...');
    setProgress(0);
    
    const response = await fetch(signedUrl);
    if (!response.ok) throw new Error('Failed to fetch video');
    
    const contentLength = response.headers.get('content-length');
    const total = parseInt(contentLength, 10);
    
    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;
    
    while(true) {
      const {done, value} = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      if (total) {
        setProgress(Math.round((received / total) * 100));
      }
    }
    
    const blob = new Blob(chunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, `${filename}.webm`);
    URL.revokeObjectURL(url);
  };

  const triggerDownload = (url, filename) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownload = async () => {
    if (!canDownload) return;
    
    setDownloading(true);
    setError(null);
    setProgress(0);
    
    try {
      if (!videoUrl) throw new Error("Video URL is missing.");

      setStatusText('Preparing download...');
      
      const safeTitle = (videoTitle || 'Clipad_Video').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      
      await downloadDirect(videoUrl, safeTitle);
      
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
      <DialogContent className="sm:max-w-sm p-0 overflow-y-auto max-h-[90vh] bg-white dark:bg-background border-slate-200 dark:border-border rounded-2xl shadow-2xl">
        <div className="p-6">
          <DialogHeader className="mb-6">
            <DialogTitle className="flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Download className="w-6 h-6 text-primary" />
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-foreground">Download Video</span>
            </DialogTitle>
          </DialogHeader>

          {!canDownload ? (
            <div className="text-center space-y-5">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/40 dark:to-amber-900/10 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-amber-200/50 dark:border-amber-700/30">
                <Lock className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-foreground text-lg">Pro Feature</h3>
                <p className="text-sm text-slate-500 mt-1.5 leading-relaxed px-2">Video downloads are exclusively available on Pro and Enterprise plans.</p>
              </div>
              <Button className="w-full rounded-xl py-6 font-semibold" onClick={() => onOpenChange(false)}>
                Upgrade to Download
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl text-xs font-medium flex items-start gap-2 border border-red-100 dark:border-red-900/30">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {!downloading ? (
                <div className="space-y-3">
                  {QUALITIES.map(q => {
                    const Icon = q.icon;
                    return (
                      <button
                        key={q.id}
                        onClick={() => setSelectedQuality(q.id)}
                        className={`w-full flex items-center p-3.5 rounded-xl border-2 text-left transition-all group ${
                          selectedQuality === q.id 
                            ? 'border-primary bg-primary/5 shadow-sm' 
                            : 'border-slate-100 dark:border-border hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 transition-colors ${selectedQuality === q.id ? 'bg-primary/10 text-primary' : 'bg-slate-100 dark:bg-secondary text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className={`font-bold text-sm ${selectedQuality === q.id ? 'text-primary' : 'text-slate-700 dark:text-foreground'}`}>
                            {q.label}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">{q.desc}</div>
                        </div>
                        <div className={`text-[10px] font-bold font-mono px-2 py-1 rounded-md uppercase tracking-wider ${selectedQuality === q.id ? 'bg-primary/10 text-primary' : 'bg-slate-100 dark:bg-secondary text-slate-400'}`}>
                          {q.ext}
                        </div>
                      </button>
                    )
                  })}
                  
                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" className="flex-1 rounded-xl" onClick={() => onOpenChange(false)}>
                      Cancel
                    </Button>
                    <Button className="flex-1 rounded-xl shadow-md" onClick={handleDownload}>
                      Download
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center space-y-5">
                  <div className="relative w-16 h-16 mx-auto">
                    <Loader2 className="w-16 h-16 animate-spin text-primary/20" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Download className="w-6 h-6 text-primary animate-pulse" />
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-foreground">{statusText}</div>
                    {progress > 0 && (
                      <div className="text-3xl font-black text-primary mt-2">{progress}%</div>
                    )}
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {selectedQuality !== '1080p' && typeof SharedArrayBuffer !== 'undefined' && (
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Processing securely on your device</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
