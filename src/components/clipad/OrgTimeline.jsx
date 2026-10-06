import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { 
  Activity, Clock, Calendar, CheckCircle, Video, ShieldAlert, 
  MessageSquare, FileText, ChevronRight, Target, BrainCircuit 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const EVENT_ICONS = {
  meeting_saved: Calendar,
  decision_created: ShieldAlert,
  task_completed: CheckCircle,
  video_uploaded: Video,
  blocker_raised: Target,
  default: Activity
};

const EVENT_COLORS = {
  meeting_saved: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400',
  decision_created: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
  task_completed: 'bg-[#006065] dark:bg-[#131A2C]/20 text-[#006065] dark:bg-[#006065] dark:bg-[#131A2C]/20 dark:text-[#00beac]',
  video_uploaded: 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400',
  blocker_raised: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400',
  default: 'bg-slate-100 dark:bg-secondary text-slate-600 dark:bg-slate-50 dark:bg-background0/20 dark:text-muted-foreground'
};

export default function OrgTimeline({ workspaceId, spaceId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  const [aiBriefing, setAiBriefing] = useState(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  useEffect(() => {
    async function fetchTimeline() {
      setLoading(true);
      try {
        let query = supabase
          .from('clipad_org_events')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
          
        if (workspaceId) {
          query = query.eq('workspace_id', workspaceId);
        }
        if (spaceId) {
          query = query.eq('space_id', spaceId);
        }
        if (filter !== 'all') {
          query = query.eq('event_type', filter);
        }

        const { data, error } = await query;
        if (error) throw error;
        setEvents(data || []);
      } catch (err) {
        console.error('Timeline error:', err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchTimeline();

    // Real-time Supabase postgres channel
    const channel = supabase
      .channel('public:clipad_org_events')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'clipad_org_events' }, payload => {
        if (payload.new) {
          setEvents(prev => [payload.new, ...prev]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, spaceId, filter]);

  const handleAiSynthesizeVelocity = async () => {
    if (events.length === 0) return;
    setIsSynthesizing(true);
    try {
      const { generateText } = await import('@/lib/cloudflareAI');
      const eventSummary = events.map(e => `- [${e.event_type}] ${e.title} (${new Date(e.created_at).toLocaleDateString()})`).join('\n');
      const res = await generateText([
        { role: 'system', content: 'You are an executive Chief of Staff AI. Synthesize the organizational timeline events into a 1-paragraph high-impact team velocity briefing highlighting key decisions, commitments, and blockers.' },
        { role: 'user', content: eventSummary }
      ]);
      setAiBriefing(typeof res === 'string' ? res : res?.response || 'Could not synthesize briefing.');
    } catch (e) {
      console.error(e);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleNavigate = (event) => {
    if (!event.source_id) return;
    switch(event.source_table) {
      case 'clipad_meeting_records':
        navigate(`/clipad/meeting/${event.source_id}`);
        break;
      case 'clipad_videos':
        navigate(`/watch/${event.source_id}`);
        break;
      // Add other routings as needed
      default:
        break;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            Organizational Timeline
          </h2>
          <p className="text-sm text-slate-500 dark:text-muted-foreground mt-1">
            Chronological record of all team events and activities.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleAiSynthesizeVelocity}
            disabled={isSynthesizing || events.length === 0}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white shadow-sm text-xs font-bold shadow-md hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <BrainCircuit className="w-4 h-4 text-cyan-400 dark:text-cyan-600" />
            {isSynthesizing ? 'Analyzing...' : 'AI Velocity Briefing'}
          </button>
        </div>
      </div>

      {aiBriefing && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-500/10 via-teal-500/10 to-emerald-500/10 border border-cyan-500/20 text-slate-800 dark:text-slate-200 text-xs leading-relaxed space-y-2 relative">
          <div className="flex items-center justify-between font-bold text-cyan-700 dark:text-cyan-400">
            <span className="flex items-center gap-1.5"><BrainCircuit className="w-4 h-4" /> AI Velocity & Health Synthesis</span>
            <button onClick={() => setAiBriefing(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold">âœ•</button>
          </div>
          <p className="whitespace-pre-wrap">{aiBriefing}</p>
        </div>
      )}
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
          {['all', 'meeting_saved', 'decision_created', 'task_completed'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
                filter === f 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'bg-slate-100 dark:bg-secondary text-slate-600 dark:text-muted-foreground hover:bg-slate-200 dark:hover:bg-accent'
              }`}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-10 md:py-16 px-4 bg-slate-50 dark:bg-secondary/30 rounded-2xl md:rounded-3xl border border-slate-200 dark:border-border/50">
          <Clock className="w-12 h-12 text-slate-300 dark:text-slate-600 dark:text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-foreground mb-2">No Events Found</h3>
          <p className="text-sm text-slate-500 dark:text-muted-foreground max-w-sm mx-auto">
            {filter === 'all' 
              ? "Your organizational timeline is empty. Record meetings, make decisions, or complete tasks to see activity here."
              : `No events of type "${filter.replace('_', ' ')}" found.`}
          </p>
        </div>
      ) : (
        <div className="relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-700 before:to-transparent">
          <div className="space-y-6 md:space-y-8 relative">
            {events.map((event, index) => {
              const Icon = EVENT_ICONS[event.event_type] || EVENT_ICONS.default;
              const colorClass = EVENT_COLORS[event.event_type] || EVENT_COLORS.default;
              
              return (
                <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-slate-950 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 absolute left-0 md:left-1/2 -translate-x-1/2 md:translate-x-0 z-10 bg-white dark:bg-card">
                    <div className={`w-full h-full rounded-full flex items-center justify-center ${colorClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] ml-auto md:ml-0 p-4 md:p-5 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer" onClick={() => handleNavigate(event)}>
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3">
                      <div>
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 ${colorClass}`}>
                          {event.event_type.replace('_', ' ')}
                        </span>
                        <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-foreground leading-snug">
                          {event.title}
                        </h4>
                      </div>
                      <span className="text-xs font-semibold text-slate-400 whitespace-nowrap flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3" />
                        {new Date(event.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {event.description && (
                      <p className="text-sm text-slate-600 dark:text-muted-foreground line-clamp-2 mt-2">
                        {event.description}
                      </p>
                    )}
                    
                    {event.source_id && (
                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-border pt-3">
                        <span className="text-xs font-medium text-slate-500 dark:text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                          View Source <ChevronRight className="w-3 h-3" />
                        </span>
                        {event.importance >= 7 && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400 px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-200 dark:border-amber-500/20">
                            <BrainCircuit className="w-3 h-3" /> Key Event
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

