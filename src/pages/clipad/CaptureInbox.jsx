import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Inbox, Link as LinkIcon, FileText, Image as ImageIcon, Video, Search, Archive, Clock, BrainCircuit, Shield, Activity, RefreshCw, Settings2 } from 'lucide-react';
import { format } from 'date-fns';
import ExtensionSettingsModal from '@/components/clipad/features/ExtensionSettingsModal';
import { toast } from '@/components/ui/use-toast';
import { CAPTURE_STATUS, CAPTURE_VISIBILITY } from '@/lib/clipadCaptureService';

export default function CaptureInbox() {
  const { user } = useAuth();
  const [captures, setCaptures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCapture, setSelectedCapture] = useState(null);
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [relatedMemories, setRelatedMemories] = useState([]);

  useEffect(() => {
    if (selectedCapture) {
      loadRelatedMemories(selectedCapture.id);
    } else {
      setRelatedMemories([]);
    }
  }, [selectedCapture]);

  const loadRelatedMemories = async (captureId) => {
    try {
      const { data } = await supabase
        .from('clipad_v3_memories')
        .select('id, title, memory_type')
        .eq('source_id', captureId)
        .limit(5);
      setRelatedMemories(data || []);
    } catch (e) {}
  };

  useEffect(() => {
    if (user?.id) fetchCaptures();
  }, [user]);

  const fetchCaptures = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clipad_v3_captures')
        .select('*, clipad_v3_context_sessions(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCaptures(data || []);
    } catch (err) {
      console.error('Error fetching captures:', err);
      toast({ title: 'Error', description: 'Could not load captures.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (id, e) => {
    e?.stopPropagation();
    try {
      const { error } = await supabase.from('clipad_v3_captures').update({ status: CAPTURE_STATUS.ARCHIVED }).eq('id', id);
      if (error) throw error;
      toast({ title: 'Archived', description: 'Capture archived successfully.' });
      setCaptures(captures.filter(c => c.id !== id));
      if (selectedCapture?.id === id) setSelectedCapture(null);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to archive capture.', variant: 'destructive' });
    }
  };

  const getIcon = (type) => {
    if (type === 'webpage') return <LinkIcon className="w-5 h-5 text-blue-500" />;
    if (type === 'document') return <FileText className="w-5 h-5 text-indigo-500" />;
    if (type === 'image') return <ImageIcon className="w-5 h-5 text-emerald-500" />;
    if (type === 'video') return <Video className="w-5 h-5 text-rose-500" />;
    return <FileText className="w-5 h-5 text-slate-500" />;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case CAPTURE_STATUS.CREATED: return 'bg-slate-100 text-slate-600';
      case CAPTURE_STATUS.PROCESSING: return 'bg-amber-100 text-amber-700 animate-pulse';
      case CAPTURE_STATUS.PROCESSED: return 'bg-blue-100 text-blue-700';
      case CAPTURE_STATUS.INGESTED: return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const filteredCaptures = captures.filter(c =>
    c.title?.toLowerCase().includes(search.toLowerCase()) ||
    c.content?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 font-sans">
      <div className="px-8 py-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center">
              <Inbox className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Capture Inbox</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Process, review, and contextualize your captured information.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowExtensionModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-xl font-semibold text-sm transition-colors shadow-sm"
            >
              <Settings2 className="w-4 h-4" /> Extension Settings
            </button>
            <button onClick={fetchCaptures} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl transition-colors">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search captures..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 rounded-xl text-sm transition-all"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* List */}
        <div className={`flex-1 overflow-y-auto p-8 ${selectedCapture ? 'hidden lg:block lg:max-w-md border-r border-slate-200 dark:border-slate-800' : ''}`}>
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
            </div>
          ) : filteredCaptures.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-slate-400 h-64 text-center">
              <Inbox className="w-12 h-12 mb-4 opacity-20" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">Inbox Zero</p>
              <p className="text-sm">No captures found. Use the extension to clip context.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCaptures.map(capture => (
                <div
                  key={capture.id}
                  onClick={() => setSelectedCapture(capture)}
                  className={`group p-4 bg-white dark:bg-slate-900 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${selectedCapture?.id === capture.id ? 'border-indigo-500 shadow-sm ring-1 ring-indigo-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getIcon(capture.capture_type)}
                      <span className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-1">{capture.title || 'Untitled Capture'}</span>
                    </div>
                    <button onClick={(e) => handleArchive(capture.id, e)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded-md transition-all">
                      <Archive className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{capture.content || 'No content preview available.'}</p>
                  <div className="flex items-center justify-between text-[11px] font-medium">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full ${getStatusColor(capture.status)}`}>{capture.status}</span>
                      {capture.visibility === CAPTURE_VISIBILITY.PERSONAL && (
                        <span className="flex items-center gap-1 text-slate-500"><Shield className="w-3 h-3" /> Private</span>
                      )}
                    </div>
                    <span className="text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {format(new Date(capture.created_at), 'MMM d, h:mm a')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedCapture && (
          <div className="flex-1 bg-white dark:bg-slate-950 overflow-y-auto">
            <div className="p-8">
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getStatusColor(selectedCapture.status)}`}>
                    {selectedCapture.status}
                  </span>
                  <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full text-xs font-bold flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" /> {selectedCapture.visibility}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{selectedCapture.title || 'Untitled Capture'}</h2>
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> Captured {format(new Date(selectedCapture.created_at), 'PPP at p')}</span>
                  {selectedCapture.source_id && (
                    <a href={selectedCapture.source_id} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-indigo-500 hover:underline">
                      <LinkIcon className="w-4 h-4" /> Source
                    </a>
                  )}
                </div>
              </div>

              {selectedCapture.clipad_v3_context_sessions && (
                <div className="mb-8 p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center">
                    <BrainCircuit className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Context Session</p>
                    <p className="font-semibold text-indigo-900 dark:text-indigo-200">{selectedCapture.clipad_v3_context_sessions.name}</p>
                  </div>
                </div>
              )}

              <div className="prose prose-sm dark:prose-invert max-w-none mb-8">
                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 whitespace-pre-wrap font-medium text-slate-700 dark:text-slate-300">
                  {selectedCapture.content || <span className="italic opacity-50">No textual content extracted.</span>}
                </div>
              </div>

              {relatedMemories.length > 0 && (
                <div className="mb-8">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <BrainCircuit className="w-5 h-5 text-purple-500" /> Generated Intelligence
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {relatedMemories.map(mem => (
                      <div key={mem.id} className="p-3 bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30 rounded-xl">
                        <span className="text-[10px] font-bold text-purple-500 uppercase tracking-wider mb-1 block">{mem.memory_type}</span>
                        <p className="font-semibold text-purple-900 dark:text-purple-200 text-sm line-clamp-2">{mem.title}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedCapture.metadata && Object.keys(selectedCapture.metadata).length > 0 && (
                <div className="mb-8">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-slate-400" /> Metadata
                  </h3>
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
                    <pre className="text-xs text-slate-600 dark:text-slate-400 overflow-x-auto">
                      {JSON.stringify(selectedCapture.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {selectedCapture.provenance && Object.keys(selectedCapture.provenance).length > 0 && (
                <div className="mt-8">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-slate-400" /> Provenance &amp; Lineage
                  </h3>
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
                    <pre className="text-xs text-slate-600 dark:text-slate-400 overflow-x-auto">
                      {JSON.stringify(selectedCapture.provenance, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showExtensionModal && <ExtensionSettingsModal onClose={() => setShowExtensionModal(false)} />}
    </div>
  );
}
