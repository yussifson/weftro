import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Layers, Plus, Search, Archive, Clock, PlayCircle, PauseCircle, CheckCircle2, Inbox } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/components/ui/use-toast';
import { CONTEXT_SESSION_STATUS, createContextSession, updateContextSession } from '@/lib/clipadContextSessionService';

export default function ContextSessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    if (user?.id) fetchSessions();
  }, [user]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clipad_v3_context_sessions')
        .select('*, clipad_v3_captures(id, title, capture_type, status, created_at)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);

      if (selectedSession) {
        const updated = data?.find(s => s.id === selectedSession.id);
        if (updated) setSelectedSession(updated);
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Could not load sessions.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createContextSession({
        companyId: user.company_id,
        userId: user.id,
        name: newName,
        description: newDesc,
      });
      toast({ title: 'Success', description: 'Session created.' });
      setShowNew(false);
      setNewName('');
      setNewDesc('');
      fetchSessions();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to create session.', variant: 'destructive' });
    }
  };

  const handleUpdateStatus = async (id, status, e) => {
    e?.stopPropagation();
    try {
      await updateContextSession(id, { status });
      toast({ title: 'Status Updated', description: `Session is now ${status}.` });
      fetchSessions();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update status.', variant: 'destructive' });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case CONTEXT_SESSION_STATUS.ACTIVE: return 'bg-[#006065]/20 text-[#004e52] ring-[#006065]/20';
      case CONTEXT_SESSION_STATUS.PAUSED: return 'bg-amber-100 text-amber-700 ring-amber-500/20';
      case CONTEXT_SESSION_STATUS.COMPLETED: return 'bg-blue-100 text-blue-700 ring-blue-500/20';
      case CONTEXT_SESSION_STATUS.ARCHIVED: return 'bg-slate-100 text-slate-600 ring-slate-500/20';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const filtered = sessions.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 font-sans">
      <div className="px-8 py-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#00beac]/10 rounded-2xl flex items-center justify-center">
              <Layers className="w-6 h-6 text-[#006065] dark:text-[#00beac]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Context Sessions</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Group related captures and tasks to build organizational intelligence.</p>
            </div>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#006065] hover:bg-[#004e52] text-white rounded-xl font-bold shadow-md transition-all"
          >
            <Plus className="w-4 h-4" /> New Session
          </button>
        </div>

        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search sessions..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-transparent focus:border-[#006065] focus:bg-white dark:focus:bg-slate-900 rounded-xl text-sm transition-all outline-none"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* List */}
        <div className={`flex-1 overflow-y-auto p-8 ${selectedSession ? 'hidden lg:block lg:max-w-[400px] border-r border-slate-200 dark:border-slate-800' : ''}`}>
          {showNew && (
            <div className="mb-4 p-5 bg-white dark:bg-slate-900 rounded-2xl border border-[#006065]/30 shadow-sm">
              <h3 className="font-bold text-slate-900 dark:text-white mb-3">Create New Session</h3>
              <input
                type="text"
                placeholder="Session Name (e.g., Q4 Planning)"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                autoFocus
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg mb-2 text-sm focus:border-[#006065] outline-none"
              />
              <textarea
                placeholder="Description (optional)"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg mb-3 text-sm focus:border-[#006065] outline-none resize-none h-20"
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowNew(false)} className="px-3 py-1.5 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
                <button onClick={handleCreate} disabled={!newName.trim()} className="px-4 py-1.5 text-sm font-bold bg-[#006065] text-white rounded-lg disabled:opacity-50">Create</button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center p-8">
              <Layers className="w-6 h-6 text-slate-300 animate-pulse" />
            </div>
          ) : filtered.length === 0 && !showNew ? (
            <div className="text-center p-8 text-slate-400">
              <Layers className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="font-bold">No Sessions</p>
              <p className="text-sm">Create a session to group your captures.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(session => (
                <div
                  key={session.id}
                  onClick={() => setSelectedSession(session)}
                  className={`group p-4 bg-white dark:bg-slate-900 rounded-2xl border transition-all cursor-pointer ${selectedSession?.id === session.id ? 'border-[#006065] shadow-md ring-1 ring-[#006065]/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-slate-900 dark:text-white truncate pr-2">{session.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 shrink-0 ${getStatusColor(session.status)}`}>
                      {session.status}
                    </span>
                  </div>
                  {session.description && (
                    <p className="text-xs text-slate-500 line-clamp-1 mb-3">{session.description}</p>
                  )}
                  <div className="flex items-center justify-between text-xs font-medium text-slate-400 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <span className="flex items-center gap-1.5"><Inbox className="w-3.5 h-3.5" /> {session.clipad_v3_captures?.length || 0} Captures</span>
                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {format(new Date(session.updated_at), 'MMM d')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedSession && (
          <div className="flex-1 bg-white dark:bg-slate-950 overflow-y-auto">
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ring-1 ${getStatusColor(selectedSession.status)}`}>
                      {selectedSession.status}
                    </span>
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">{selectedSession.name}</h2>
                  <p className="text-slate-500 font-medium">{selectedSession.description || 'No description provided.'}</p>
                </div>

                <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl">
                  {selectedSession.status !== CONTEXT_SESSION_STATUS.ACTIVE && (
                    <button
                      onClick={(e) => handleUpdateStatus(selectedSession.id, CONTEXT_SESSION_STATUS.ACTIVE, e)}
                      className="p-2 text-[#006065] hover:bg-white dark:hover:bg-slate-700 rounded-lg"
                      title="Mark Active"
                    >
                      <PlayCircle className="w-5 h-5" />
                    </button>
                  )}
                  {selectedSession.status === CONTEXT_SESSION_STATUS.ACTIVE && (
                    <button
                      onClick={(e) => handleUpdateStatus(selectedSession.id, CONTEXT_SESSION_STATUS.PAUSED, e)}
                      className="p-2 text-amber-600 hover:bg-white dark:hover:bg-slate-700 rounded-lg"
                      title="Pause Session"
                    >
                      <PauseCircle className="w-5 h-5" />
                    </button>
                  )}
                  {selectedSession.status !== CONTEXT_SESSION_STATUS.COMPLETED && (
                    <button
                      onClick={(e) => handleUpdateStatus(selectedSession.id, CONTEXT_SESSION_STATUS.COMPLETED, e)}
                      className="p-2 text-blue-600 hover:bg-white dark:hover:bg-slate-700 rounded-lg"
                      title="Complete Session"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                  )}
                  {selectedSession.status !== CONTEXT_SESSION_STATUS.ARCHIVED && (
                    <button
                      onClick={(e) => handleUpdateStatus(selectedSession.id, CONTEXT_SESSION_STATUS.ARCHIVED, e)}
                      className="p-2 text-slate-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg"
                      title="Archive"
                    >
                      <Archive className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="h-px bg-slate-200 dark:bg-slate-800 w-full mb-8" />

              <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Inbox className="w-5 h-5 text-[#006065]" /> Captures in this Session
              </h3>

              {selectedSession.clipad_v3_captures?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedSession.clipad_v3_captures.map(capture => (
                    <div key={capture.id} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-[#006065]/50 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{capture.capture_type}</span>
                        <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">{capture.status}</span>
                      </div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1 line-clamp-1">{capture.title || 'Untitled'}</h4>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {format(new Date(capture.created_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
                  <p className="font-medium text-slate-500 mb-2">No captures added yet.</p>
                  <p className="text-sm text-slate-400">Use the Clipad Extension to capture context and save it directly to this session.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
