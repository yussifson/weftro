const fs = require('fs');

const oldInbox = fs.readFileSync('CaptureInbox_old.jsx', 'utf8');

const newInboxContent = `import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { 
  Loader2, Sparkles, BrainCircuit, Mic, Type, FileText, Link2 as LinkIcon, Monitor, 
  PlaySquare as Video, Users, MessageSquare as File, Plus, CheckCircle2, AlertCircle, 
  Clock, ArrowRight, Play, Pause, Archive, Settings2, FolderOpen
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { contextualizeCapture } from '@/lib/clipadContextualizationService';
import { isV3FeatureEnabled, V3_FLAGS } from '@/lib/clipadV3Flags';
import BrowserCaptureSettings from './BrowserCaptureSettings';
import { updateCapture } from '@/lib/clipadCaptureService';
import { getUserContextSessions, createContextSession, updateContextSession, completeContextSession, archiveContextSession } from '@/lib/clipadContextSessionService';

export default function CaptureInbox() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('captures');
  const [captures, setCaptures] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  
  // Forms
  const [newSessionTitle, setNewSessionTitle] = useState('');

  const companyId = user?.user_metadata?.company_id || user?.company_id;
  const contextSessionsEnabled = isV3FeatureEnabled(V3_FLAGS.CONTEXT_SESSIONS_ENABLED, user);
  const browserCaptureEnabled = isV3FeatureEnabled(V3_FLAGS.BROWSER_CAPTURE_ENABLED, user);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: capturesData } = await supabase
        .from('clipad_v3_captures')
        .select('*')
        .eq('company_id', companyId)
        .order('captured_at', { ascending: false })
        .limit(50);
      
      setCaptures(capturesData || []);

      if (contextSessionsEnabled) {
        const sessData = await getUserContextSessions(user.id, companyId);
        setSessions(sessData || []);
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to load inbox data.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (capture) => {
    setProcessingId(capture.id);
    try {
      await contextualizeCapture(capture.id);
      toast({ title: "Success", description: "Capture processed into organizational memory." });
      await loadData();
    } catch (e) {
      console.error(e);
      toast({ title: "Processing Failed", description: e.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!newSessionTitle.trim()) return;
    try {
      await createContextSession(user.id, companyId, newSessionTitle);
      setNewSessionTitle('');
      await loadData();
      toast({ title: "Session Started", description: "Captures can now be routed to this session." });
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleSessionAction = async (sessionId, action) => {
    try {
      if (action === 'pause') await updateContextSession(sessionId, { status: 'PAUSED' });
      else if (action === 'resume') await updateContextSession(sessionId, { status: 'ACTIVE' });
      else if (action === 'complete') await completeContextSession(sessionId);
      else if (action === 'archive') await archiveContextSession(sessionId);
      await loadData();
    } catch (e) {
      toast({ title: "Action Failed", description: e.message, variant: "destructive" });
    }
  };

  const handleAssociateSession = async (captureId, sessionId) => {
    try {
      await updateCapture(captureId, { context_session_id: sessionId || null });
      await loadData();
    } catch (e) {
      toast({ title: "Failed to link session", description: e.message, variant: "destructive" });
    }
  };

  const getSourceIcon = (type) => {
    switch(type) {
      case 'VOICE': return <Mic className="w-4 h-4 text-rose-500" />;
      case 'NOTE': return <Type className="w-4 h-4 text-amber-500" />;
      case 'DOCUMENT': return <FileText className="w-4 h-4 text-blue-500" />;
      case 'LINK': return <LinkIcon className="w-4 h-4 text-emerald-500" />;
      case 'SCREEN': return <Monitor className="w-4 h-4 text-indigo-500" />;
      case 'VIDEO': return <Video className="w-4 h-4 text-purple-500" />;
      case 'MEETING_CONTEXT': return <Users className="w-4 h-4 text-sky-500" />;
      default: return <Sparkles className="w-4 h-4 text-slate-500" />;
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'CREATED': return <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">Ready</Badge>;
      case 'PROCESSING': return <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processing</Badge>;
      case 'PROCESSED': return <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">Processed</Badge>;
      case 'FAILED': return <Badge variant="destructive" className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20">Failed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-muted-foreground animate-in fade-in">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
        <p className="text-sm font-medium animate-pulse">Loading capture inbox...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Capture & Context Inbox</h2>
        <p className="text-muted-foreground">Process incoming captures, manage live context sessions, and configure browser extensions.</p>
      </div>

      <Tabs defaultValue="captures" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md bg-secondary/50">
          <TabsTrigger value="captures" className="font-semibold">Processing Inbox</TabsTrigger>
          {contextSessionsEnabled && <TabsTrigger value="sessions" className="font-semibold">Live Sessions</TabsTrigger>}
          {browserCaptureEnabled && <TabsTrigger value="extension" className="font-semibold"><Settings2 className="w-4 h-4 mr-2"/> Settings</TabsTrigger>}
        </TabsList>

        <TabsContent value="captures" className="mt-6 space-y-4">
          {captures.length === 0 ? (
            <Card className="border-dashed bg-secondary/20 shadow-none">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 bg-background rounded-full flex items-center justify-center mb-4 shadow-sm border border-border">
                  <FolderOpen className="w-5 h-5 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Inbox is empty</h3>
                <p className="text-sm text-muted-foreground max-w-sm">You have no pending captures. Use the Clipad extension, API, or integration tools to capture context.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {captures.map(capture => (
                <Card key={capture.id} className="group overflow-hidden transition-all hover:shadow-md hover:border-primary/20">
                  <CardContent className="p-0">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center p-4 gap-4">
                      <div className="flex-1 flex items-start gap-4 w-full">
                        <div className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center shrink-0">
                          {getSourceIcon(capture.capture_type)}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground truncate">{capture.title || 'Untitled Capture'}</h3>
                            {getStatusBadge(capture.status)}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center"><Clock className="w-3 h-3 mr-1"/> {new Date(capture.captured_at).toLocaleDateString()}</span>
                            <span>•</span>
                            <span className="font-medium tracking-wide">{capture.source_type}</span>
                            {capture.visibility !== 'PERSONAL' && (
                              <>
                                <span>•</span>
                                <Badge variant="outline" className="text-[10px] h-4 px-1.5 uppercase tracking-wider">{capture.visibility}</Badge>
                              </>
                            )}
                          </div>
                          {capture.metadata?.extracted_topics && capture.metadata.extracted_topics.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {capture.metadata.extracted_topics.map(t => (
                                <Badge key={t} variant="secondary" className="text-[10px] font-medium bg-secondary/50 text-secondary-foreground">{t}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto shrink-0 border-t sm:border-t-0 sm:border-l border-border pt-4 sm:pt-0 sm:pl-4 mt-2 sm:mt-0">
                        {contextSessionsEnabled && (
                          <Select 
                            value={capture.context_session_id || 'none'}
                            onValueChange={(val) => handleAssociateSession(capture.id, val === 'none' ? null : val)}
                          >
                            <SelectTrigger className="w-full sm:w-[140px] h-8 text-xs bg-secondary/50 border-border">
                              <SelectValue placeholder="No Session" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No Session</SelectItem>
                              {sessions.filter(s => s.status === 'ACTIVE' || s.id === capture.context_session_id).map(s => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.title} {s.status !== 'ACTIVE' ? '(Inactive)' : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        {['CREATED', 'FAILED'].includes(capture.status) && (
                          <Button
                            onClick={() => handleProcess(capture)}
                            disabled={processingId === capture.id}
                            size="sm"
                            className="w-full sm:w-auto h-8 text-xs font-semibold"
                          >
                            {processingId === capture.id ? (
                              <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                            ) : (
                              <BrainCircuit className="w-3.5 h-3.5 mr-2" />
                            )}
                            Process Context
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {contextSessionsEnabled && (
          <TabsContent value="sessions" className="mt-6 space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Start New Session</CardTitle>
                <CardDescription>Group incoming captures under a specific context like a meeting or deep work sprint.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateSession} className="flex gap-3">
                  <Input 
                    type="text" 
                    placeholder="New session title... (e.g. Q3 Roadmap Planning)"
                    value={newSessionTitle}
                    onChange={(e) => setNewSessionTitle(e.target.value)}
                    className="flex-1 bg-secondary/30"
                  />
                  <Button type="submit" disabled={!newSessionTitle.trim()} className="shrink-0 font-semibold shadow-sm">
                    <Plus className="w-4 h-4 mr-2" /> Start Session
                  </Button>
                </form>
              </CardContent>
            </Card>

            {sessions.length === 0 ? (
              <Card className="border-dashed bg-secondary/20 shadow-none">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <Clock className="w-8 h-8 mb-3 opacity-50" />
                  <p className="text-sm">No context sessions are currently active.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sessions.map(session => (
                  <Card key={session.id} className={\`transition-all \${session.status === 'ACTIVE' ? 'border-primary/40 shadow-sm' : 'opacity-80'}\`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base line-clamp-1" title={session.title}>{session.title}</CardTitle>
                        <Badge variant="outline" className={\`text-[10px] font-bold uppercase tracking-wider shrink-0 \${
                          session.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                          session.status === 'PAUSED' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                          'bg-secondary text-muted-foreground'
                        }\`}>
                          {session.status}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs flex items-center">
                        <Clock className="w-3 h-3 mr-1.5" /> Started {new Date(session.started_at).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardFooter className="pt-0 border-t bg-secondary/10 px-4 py-3 mt-4 flex items-center justify-end gap-2">
                      {session.status === 'ACTIVE' && (
                        <Button variant="ghost" size="icon" onClick={() => handleSessionAction(session.id, 'pause')} className="h-8 w-8 text-amber-600 hover:bg-amber-500/10" title="Pause Session">
                          <Pause className="w-4 h-4" />
                        </Button>
                      )}
                      {session.status === 'PAUSED' && (
                        <Button variant="ghost" size="icon" onClick={() => handleSessionAction(session.id, 'resume')} className="h-8 w-8 text-emerald-600 hover:bg-emerald-500/10" title="Resume Session">
                          <Play className="w-4 h-4" />
                        </Button>
                      )}
                      {['ACTIVE', 'PAUSED'].includes(session.status) && (
                        <Button variant="ghost" size="icon" onClick={() => handleSessionAction(session.id, 'complete')} className="h-8 w-8 text-blue-600 hover:bg-blue-500/10" title="Complete Session">
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                      )}
                      {session.status !== 'ARCHIVED' && (
                        <Button variant="ghost" size="icon" onClick={() => handleSessionAction(session.id, 'archive')} className="h-8 w-8 text-red-600 hover:bg-red-500/10" title="Archive Session">
                          <Archive className="w-4 h-4" />
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}
      
        {browserCaptureEnabled && (
          <TabsContent value="extension" className="mt-6">
            <BrowserCaptureSettings />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
`;
fs.writeFileSync('src/components/clipad/features/CaptureInbox.jsx', newInboxContent);
console.log('CaptureInbox.jsx rewritten');
