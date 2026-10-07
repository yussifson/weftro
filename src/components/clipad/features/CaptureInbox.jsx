import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Loader2, Inbox, RefreshCw, FileText, CheckCircle2, AlertCircle, PlayCircle, Video, File, Mic, Monitor, Link as LinkIcon, Users, BrainCircuit } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { contextualizeCapture } from '@/lib/clipadContextualizationService';

const getSourceIcon = (type) => {
  switch (type) {
    case 'VIDEO': return <Video className="w-4 h-4" />;
    case 'MEETING_CONTEXT': return <Users className="w-4 h-4" />;
    case 'DOCUMENT': return <File className="w-4 h-4" />;
    case 'VOICE': return <Mic className="w-4 h-4" />;
    case 'SCREEN': return <Monitor className="w-4 h-4" />;
    case 'LINK': return <LinkIcon className="w-4 h-4" />;
    default: return <FileText className="w-4 h-4" />;
  }
};

const getStatusBadge = (status) => {
  switch (status) {
    case 'CREATED': return <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 text-xs font-semibold">Created</span>;
    case 'PROCESSING': return <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-semibold flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> Processing</span>;
    case 'CONTEXTUALIZED': return <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 text-xs font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Contextualized</span>;
    case 'FAILED': return <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-xs font-semibold flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Failed</span>;
    default: return <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 text-xs font-semibold">{status}</span>;
  }
};

export default function CaptureInbox() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [captures, setCaptures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const loadCaptures = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clipad_v3_captures')
      .select('*')
      .order('captured_at', { ascending: false })
      .limit(50);
    
    if (error) {
      console.error('Error loading captures:', error);
      toast({ title: 'Error', description: 'Could not load capture inbox.', variant: 'destructive' });
    } else {
      setCaptures(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) loadCaptures();
  }, [user]);

  const handleProcess = async (capture) => {
    if (processingId) return;
    setProcessingId(capture.id);
    
    try {
      // Optimistically update
      setCaptures(prev => prev.map(c => c.id === capture.id ? { ...c, status: 'PROCESSING' } : c));
      
      const updated = await contextualizeCapture(capture.id);
      
      setCaptures(prev => prev.map(c => c.id === capture.id ? updated : c));
      toast({ title: 'Success', description: 'Capture contextualized successfully.' });
    } catch (error) {
      console.error(error);
      setCaptures(prev => prev.map(c => c.id === capture.id ? { ...c, status: 'FAILED' } : c));
      toast({ title: 'Error', description: 'Failed to contextualize capture.', variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p>Loading capture inbox...</p>
      </div>
    );
  }

  if (captures.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Inbox className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">No captures yet</h3>
        <p className="text-muted-foreground max-w-md">
          When you record videos, host meetings, or sync data through integrations, the raw data will appear here to be processed into organizational memory.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-foreground">Processing Inbox</h2>
        <button 
          onClick={loadCaptures}
          className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-muted-foreground transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid gap-3">
        {captures.map(capture => (
          <div key={capture.id} className="bg-card border border-border rounded-xl p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between shadow-sm hover:shadow transition-shadow group">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0 text-muted-foreground mt-1 md:mt-0">
                {getSourceIcon(capture.capture_type)}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-foreground text-sm">{capture.title || 'Untitled Capture'}</h3>
                  {getStatusBadge(capture.status)}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{new Date(capture.captured_at).toLocaleString()}</span>
                  <span>•</span>
                  <span>{capture.source_type}</span>
                  {capture.visibility !== 'PERSONAL' && (
                    <>
                      <span>•</span>
                      <span className="uppercase text-[10px] font-bold tracking-wider">{capture.visibility}</span>
                    </>
                  )}
                </div>
                {capture.metadata?.extracted_topics && capture.metadata.extracted_topics.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {capture.metadata.extracted_topics.map(t => (
                      <span key={t} className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 text-[10px] font-medium">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
              {['CREATED', 'FAILED'].includes(capture.status) && (
                <button
                  onClick={() => handleProcess(capture)}
                  disabled={processingId === capture.id}
                  className="w-full md:w-auto px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {processingId === capture.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BrainCircuit className="w-3.5 h-3.5" />}
                  Process Context
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
