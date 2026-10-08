import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Loader2, Inbox, RefreshCw, FileText, CheckCircle2, AlertCircle, Video, File, Mic, Monitor, Link as LinkIcon, Users, BrainCircuit, Play, Pause, Archive } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { contextualizeCapture } from '@/lib/clipadContextualizationService';
import { isV3FeatureEnabled, V3_FLAGS } from '@/lib/clipadV3Flags';
import BrowserCaptureSettings from './BrowserCaptureSettings';
import { updateCapture } from '@/lib/clipadCaptureService';
import { getUserContextSessions, createContextSession, updateContextSession, completeContextSession, archiveContextSession } from '@/lib/clipadContextSessionService';

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
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [activeTab, setActiveTab] = useState('captures'); // 'captures' | 'sessions'
  const [newSessionTitle, setNewSessionTitle] = useState('');

  const companyId = user?.user_metadata?.company_id || user?.company_id;
  const contextSessionsEnabled = isV3FeatureEnabled(V3_FLAGS.CONTEXT_SESSIONS_ENABLED, user);
  const browserCaptureEnabled = isV3FeatureEnabled(V3_FLAGS.BROWSER_CAPTURE_ENABLED, user);

  const loadData = async () => {
    setLoading(true);
    
    // Load Captures
    const { data: capData, error: capErr } = await supabase
      .from('clipad_v3_captures')
      .select('*')
      .order('captured_at', { ascending: false })
      .limit(50);
    
    if (capErr) {
      toast({ title: 'Error', description: 'Could not load capture inbox.', variant: 'destructive' });
    } else {
      setCaptures(capData || []);
    }

    // Load Sessions if enabled
    if (contextSessionsEnabled && companyId) {
      const sessData = await getUserContextSessions(user.id, companyId);
      setSessions(sessData || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (user) loadData();
  }, [user, contextSessionsEnabled, companyId]);

  const handleProcess = async (capture) => {
    if (processingId) return;
    setProcessingId(capture.id);
    
    try {
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

  
  const handleAssociateSession = async (captureId, sessionId) => {
    try {
      const updated = await updateCapture(captureId, { context_session_id: sessionId || null });
      setCaptures(prev => prev.map(c => c.id === captureId ? updated : c));
      toast({ title: 'Success', description: 'Session association updated.' });
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to associate session.', variant: 'destructive' });
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!newSessionTitle.trim()) return;
    try {
      const session = await createContextSession({
        companyId,
        userId: user.id,
        title: newSessionTitle.trim(),
        description: 'Created from Capture Inbox'
      });
      setSessions([session, ...sessions]);
      setNewSessionTitle('');
      toast({ title: 'Session created' });
    } catch (error) {
      toast({ title: 'Error', description: 'Could not create session.', variant: 'destructive' });
    }
  };

  const handleSessionAction = async (id, action) => {
    try {
      let updated;
      if (action === 'pause') updated = await updateContextSession(id, { status: 'PAUSED' });
      else if (action === 'resume') updated = await updateContextSession(id, { status: 'ACTIVE' });
      else if (action === 'complete') updated = await completeContextSession(id);
      else if (action === 'archive') updated = await archiveContextSession(id);
      
      setSessions(prev => prev.map(s => s.id === id ? updated : s));
      toast({ title: `Session ${action}d` });
    } catch (e) {
      toast({ title: 'Error', description: `Failed to ${action} session.`, variant: 'destructive' });
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-foreground">
            {activeTab === 'captures' ? 'Processing Inbox' : 'Context Sessions'}
          </h2>
          {contextSessionsEnabled && (
            <div className="flex bg-secondary rounded-lg p-1">
              <button 
                onClick={() => setActiveTab('captures')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${activeTab === 'captures' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Captures
              </button>
              <button 
                onClick={() => setActiveTab('sessions')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${activeTab === 'sessions' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Sessions
              </button>

              {browserCaptureEnabled && (
                <button 
                  onClick={() => setActiveTab('extension')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${activeTab === 'extension' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Extension
                </button>
              )}
            </div>

          )}
        </div>
        <button 
          onClick={loadData}
          className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-muted-foreground transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {activeTab === 'captures' && (
        captures.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Inbox className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">No captures yet</h3>
            <p className="text-muted-foreground max-w-md">
              When you record videos, host meetings, or sync data through integrations, the raw data will appear here to be processed into organizational memory.
            </p>
          </div>
        ) : (
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
                  
                  {contextSessionsEnabled && (
                    <select 
                      className="text-xs bg-secondary border border-border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                      value={capture.context_session_id || ''}
                      onChange={(e) => handleAssociateSession(capture.id, e.target.value)}
                    >
                      <option value="">No Session</option>
                      {sessions.filter(s => s.status === 'ACTIVE' || s.id === capture.context_session_id).map(s => (
                        <option key={s.id} value={s.id}>
                          {s.title} {s.status !== 'ACTIVE' ? '(Inactive)' : ''}
                        </option>
                      ))}
                    </select>
                  )}

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
        )
      )}

      {activeTab === 'sessions' && contextSessionsEnabled && (
        <div className="space-y-6">
          <form onSubmit={handleCreateSession} className="flex gap-2">
            <input 
              type="text" 
              placeholder="New session title... (e.g. Q3 Roadmap Planning)"
              className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              value={newSessionTitle}
              onChange={(e) => setNewSessionTitle(e.target.value)}
            />
            <button 
              type="submit"
              disabled={!newSessionTitle.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              Start Session
            </button>
          </form>

          {sessions.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No context sessions active.
            </div>
          ) : (
            <div className="grid gap-3">
              {sessions.map(session => (
                <div key={session.id} className="bg-card border border-border rounded-xl p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between shadow-sm hover:shadow transition-shadow">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-foreground text-sm">{session.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        session.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        session.status === 'PAUSED' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {session.status}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Started: {new Date(session.started_at).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {session.status === 'ACTIVE' && (
                      <button onClick={() => handleSessionAction(session.id, 'pause')} className="p-1.5 hover:bg-amber-500/10 text-amber-600 rounded-lg transition-colors" title="Pause Session">
                        <Pause className="w-4 h-4" />
                      </button>
                    )}
                    {session.status === 'PAUSED' && (
                      <button onClick={() => handleSessionAction(session.id, 'resume')} className="p-1.5 hover:bg-green-500/10 text-green-600 rounded-lg transition-colors" title="Resume Session">
                        <Play className="w-4 h-4" />
                      </button>
                    )}
                    {['ACTIVE', 'PAUSED'].includes(session.status) && (
                      <button onClick={() => handleSessionAction(session.id, 'complete')} className="p-1.5 hover:bg-blue-500/10 text-blue-600 rounded-lg transition-colors" title="Complete Session">
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                    {session.status !== 'ARCHIVED' && (
                      <button onClick={() => handleSessionAction(session.id, 'archive')} className="p-1.5 hover:bg-red-500/10 text-red-600 rounded-lg transition-colors" title="Archive Session">
                        <Archive className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    
      {activeTab === 'extension' && browserCaptureEnabled && (
        <BrowserCaptureSettings />
      )}

    </div>
  );
}