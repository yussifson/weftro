import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { getLimit } from '@/lib/clipadPricing';
import { Calendar, Video, Search, Clock, Users, ArrowRight, Sparkles, Filter, CheckCircle, Flame, ArrowLeft, Target, Settings, UserCircle, Lock, Globe } from 'lucide-react';
import { CliPadLogo } from '@/components/ui/CliPadLogo';
import { useAuth } from '@/lib/AuthContext';
import { isAdmin } from '@/lib/constants';
import ThemeToggle from '@/components/layout/ThemeToggle';
import NotificationCenter from '@/components/clipad/notifications/NotificationCenter';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import SpaceSelectorModal from '@/components/clipad/SpaceSelectorModal';
import { generateShortId } from '@/utils/idGenerator';
import { useToast } from '@/components/ui/use-toast';

export default function MeetingsList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'summary', 'actions'
  const [isCreating, setIsCreating] = useState(false);
  const [showSpaceSelector, setShowSpaceSelector] = useState(false);

  useEffect(() => { fetchMeetings(); }, []);

  const fetchMeetings = async () => {
    setLoading(true);
    if (!user?.id) { setLoading(false); return; }

    try {
      // Fetch meetings scoped to user's company
      let query = supabase
        .from('clipad_meeting_records')
        .select('*, space:space_id(name, is_private)')
        .order('created_at', { ascending: false });

      // If user has a company_id, filter by it (company isolation)
      if (user.company_id) {
        query = query.eq('company_id', user.company_id);
      } else {
        // Fallback: only show meetings hosted by this user
        query = query.eq('host_id', user.id);
      }

      const { data } = await query;

      // Fetch action items count for each meeting
      const { data: actions } = await supabase
        .from('clipad_action_items')
        .select('meeting_id, is_complete');

      if (data) {
        const membershipRes = await supabase
          .from('clipad_space_members')
          .select('space_id')
          .eq('user_id', user.id);
        const memberSpaceIds = new Set(membershipRes.data?.map(m => m.space_id) || []);
        const isUserAdmin = isAdmin(user);

        const filtered = data.filter(m => {
          // Admins see all meetings in their company
          if (isUserAdmin) return true;
          // Members see meetings they hosted
          if (m.host_id === user.id) return true;
          // Members see meetings in public spaces
          if (m.space?.is_private === false) return true;
          // Members see meetings in spaces they're members of
          if (m.space_id && memberSpaceIds.has(m.space_id)) return true;
          return false;
        });

        const enhanced = filtered.map(m => {
          const mActions = actions?.filter(a => a.meeting_id === m.id) || [];
          return {
            ...m,
            actions_total: mActions.length,
            actions_open: mActions.filter(a => !a.is_complete).length
          };
        });
        setMeetings(enhanced);
      }
    } catch (err) {
      console.error('Failed to fetch meetings:', err);
    }
    setLoading(false);
  };


  const handleSpaceSelect = async (spaceId, privacyType) => {
    setIsCreating(true);
    try {
      const roomName = generateShortId();
      const payload = { instant: true, max_participants: getLimit(user, 'maxParticipants'), privacy: privacyType, companyId: user?.company_id || user?.user_metadata?.company_id };
      if (privacyType === 'public') payload.roomName = roomName;

      // Attempt Edge Function â€” but never let it block meeting start
      let roomData = null;
      try {
        const { data, error } = await supabase.functions.invoke('create-daily-room', { body: payload });
        if (!error && data && (data.name || data.roomName)) roomData = data;
      } catch (_) { /* edge function unavailable â€” continue with local room */ }

      const targetRoomName = roomData?.name || roomData?.roomName || roomName;

      // Persist room record (best-effort, never blocks navigation)
      try {
        await supabase.from('video_rooms').upsert({
          id: crypto.randomUUID(),
          company_id: user?.company_id || user?.user_metadata?.company_id || null,
          daily_room_name: targetRoomName,
          daily_room_url: roomData?.url || `https://optavel.daily.co/${targetRoomName}`,
          privacy_type: privacyType || 'public',
          host_id: user?.id || null,
          status: 'active',
          meeting_type: 'instant'
        });
      } catch (_) { /* db insert failed â€” meeting still works */ }

      navigate(`/join/${targetRoomName}` + (spaceId ? `?spaceId=${spaceId}` : ''));
    } catch (err) {
      // Ultimate fallback â€” always navigate to a meeting room
      const fallbackRoom = generateShortId();
      console.error('Meeting creation error, using fallback:', err);
      navigate(`/join/${fallbackRoom}` + (spaceId ? `?spaceId=${spaceId}` : ''));
    } finally {
      setIsCreating(false);
    }
  };

  const startInstantMeeting = async () => {
    setShowSpaceSelector(true);
  };

  const startInstantMeeting_OLD = async () => {
    setIsCreating(true);
    try {
      const { data } = await supabase.functions.invoke('create-daily-room', { body: { instant: true, max_participants: getLimit(user, 'maxParticipants'), companyId: user?.company_id || user?.user_metadata?.company_id } });
      if (data?.name) navigate(`/join/${data.name}`);
      else navigate(`/join/${Math.random().toString(36).substring(2, 10)}`);
    } catch {
      navigate(`/join/${Math.random().toString(36).substring(2, 10)}`);
    } finally {
      setIsCreating(false);
    }
  };

  const filtered = meetings.filter(m => {
    if (search && !m.title?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'summary' && !m.ai_summary) return false;
    if (filter === 'actions' && m.actions_open === 0) return false;
    return true;
  });

  const firstName = user?.full_name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="min-h-full bg-slate-50 dark:bg-background text-slate-900 dark:text-slate-100 page-enter overflow-x-hidden pb-24 md:pb-8">

      <div className="max-w-6xl mx-auto px-4 md:px-10 py-6 md:py-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-2 flex items-center gap-3"><Calendar className="w-7 h-7 text-[#006065] dark:text-[#fad503]" /> Meetings History</h1>
            <p className="text-slate-500 dark:text-muted-foreground">Past meetings, AI summaries, and pending action items.</p>
          </div>
          <button
            onClick={startInstantMeeting}
            disabled={isCreating}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#006065] dark:bg-[#131A2C] hover:bg-[#004e52] text-[#fad503] font-bold text-sm shadow-md shadow-[#006065]/20 transition-all disabled:opacity-60 shrink-0 active:scale-95"
          >
            {isCreating ? <div className="w-4 h-4 border-2 border-white/30 border-t-transparent rounded-full animate-spin" /> : <Video className="w-4 h-4" />}
            Start Instant Meeting
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search meetings..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white dark:bg-card border border-slate-200 dark:border-border text-slate-900 dark:text-foreground text-sm placeholder-slate-400 focus:outline-none focus:border-[#006065] dark:focus:border-[#fad503] shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition-all"
            />
          </div>
          <div className="flex gap-2 p-1 bg-white dark:bg-card rounded-xl border border-slate-200 dark:border-border shadow-[0_2px_10px_rgba(0,0,0,0.04)] shrink-0">
            {[{id: 'all', label: 'All'}, {id: 'summary', label: 'Has AI Summary'}, {id: 'actions', label: 'Open Actions'}].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${filter === f.id ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-foreground' : 'text-slate-500 hover:text-slate-900 dark:text-muted-foreground dark:hover:text-slate-200'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-2xl bg-[#006065] dark:bg-[#131A2C] text-white dark:bg-[#006065] dark:bg-[#131A2C] animate-pulse border border-white/15 dark:border-white/15" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-slate-200 dark:border-border rounded-3xl">
            <Calendar className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-500 dark:text-muted-foreground mb-2">No meetings found</h3>
            <p className="text-slate-400 text-sm">Start a meeting to see it appear here with full AI summaries and action items.</p>
          </div>
        ) : (
          <div className="relative pl-6 border-l-2 border-[#006065] dark:border-border/20 dark:border-[#006065] dark:border-border/40 space-y-6">
            {filtered.map(m => (
              <div key={m.id} className="relative group">
                <div className="absolute -left-[35px] w-6 h-6 rounded-full bg-[#006065] dark:bg-[#131A2C] border-2 border-[#fad503] flex items-center justify-center shadow-sm mt-5">
                  <div className="w-2 h-2 rounded-full bg-[#fad503]" />
                </div>
                <div
                  onClick={() => navigate(`/meetings/${m.id}`)}
                  className="p-5 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border hover:border-[#006065] dark:border-border/50 dark:hover:border-[#fad503]/50 cursor-pointer shadow-sm hover:shadow-lg transition-all hover:-translate-y-0.5 active:scale-[0.98] flex flex-col gap-3"
                >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="text-base font-bold text-slate-900 dark:text-foreground truncate">{m.title || 'Team Meeting'}</h3>
                    {m.space && <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-muted-foreground text-[10px] uppercase font-bold">{m.space.name}</span>}
                    {m.space && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        m.space.is_private
                          ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400'
                          : 'bg-[#006065] dark:bg-[#131A2C]/10 dark:bg-[#006065] dark:bg-[#131A2C]/10 text-[#006065] dark:text-[#00beac]'
                      }`}>
                        {m.space.is_private ? <Lock className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
                        {m.space.is_private ? 'Private' : 'Public'}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-muted-foreground mt-2">
                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{new Date(m.created_at).toLocaleDateString()} at {new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    {m.duration_seconds > 0 && <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{Math.floor(m.duration_seconds/60)}m {m.duration_seconds%60}s</span>}
                    {m.participant_count > 0 && <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{m.participant_count} joined</span>}
                  </div>
                  {m.ai_summary && (
                    <p className="text-sm text-slate-600 dark:text-muted-foreground mt-3 line-clamp-1 border-l-2 border-[#006065] dark:border-border/30 dark:border-[#fad503]/30 pl-3 italic">
                      "{m.ai_summary.split('\n')[0]}"
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 md:w-48 justify-end shrink-0">
                  {m.actions_open > 0 ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#006065] dark:bg-[#131A2C]/10 border border-[#006065] dark:border-border/20 text-[#006065] text-xs font-semibold">
                      <Target className="w-3.5 h-3.5" /> {m.actions_open} open tasks
                    </div>
                  ) : m.actions_total > 0 ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-muted-foreground text-xs font-semibold">
                      <CheckCircle className="w-3.5 h-3.5" /> All tasks done
                    </div>
                  ) : null}
                  {m.ai_summary && <Sparkles className="w-4 h-4 text-[#006065] dark:text-[#fad503] shrink-0" />}
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-[#006065] dark:text-[#fad503] transition-colors ml-2" />
                </div>
              </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <SpaceSelectorModal
        open={showSpaceSelector}
        onOpenChange={setShowSpaceSelector}
        onConfirm={handleSpaceSelect}
        title="Select Space for Meeting"
      />
    </div>
  );
}

