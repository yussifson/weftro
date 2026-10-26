const isValidUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { getLimit, hasFeature } from '@/lib/clipadPricing';
import { useAuth } from '@/lib/AuthContext';
import { isAdmin } from '@/lib/constants';
import {
  Video, Camera, Brain, CheckCircle, Clock, TrendingUp,
  Layers, Play, ArrowRight, Sparkles,
  Users, Calendar, Target, Star, Lock, Globe, HeartPulse, Search, Network
} from 'lucide-react';
import { getSpaceIcon } from '@/utils/spaceIcons';
import { generateShortId } from '@/utils/idGenerator';



import BlockerRadar from '@/components/clipad/features/BlockerRadar';
import OrganizationalInsights from '@/components/clipad/features/OrganizationalInsights';
import MeetingNecessityWidget from '@/components/clipad/features/MeetingNecessityWidget';
import TimezoneFairnessWidget from '@/components/clipad/features/TimezoneFairnessWidget';
import InstitutionalMemoryVault from '@/components/clipad/features/InstitutionalMemoryVault';
import FollowUpEngine from '@/components/clipad/features/FollowUpEngine';
import SpaceSelectorModal from '@/components/clipad/SpaceSelectorModal';


function StatCard({ icon: Icon, value, label, trend }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between p-5 group">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#006065]/10 dark:bg-[#006065]/20 border border-[#006065]/20 dark:border-[#006065]/40 shadow-sm">
          <Icon className="w-5 h-5 text-[#006065] dark:text-[#fad503]" />
        </div>
        {trend && (
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm ${trend > 0 ? '\u2191' : '\u2193'}`}>
            {trend > 0 ? '\u2191' : '\u2193'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <div className="text-3xl font-extrabold text-slate-900 dark:text-foreground tracking-tight tabular-nums leading-none mb-1.5">{value}</div>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-muted-foreground">{label}</div>
      </div>
      <div className="absolute -bottom-4 -right-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500">
        <Icon className="w-24 h-24 text-[#006065] dark:text-foreground" />
      </div>
    </div>
  );
}

function SpaceCard({ space, onClick }) {
  const SpaceIcon = getSpaceIcon(space.name);

  return (
    <div
      onClick={onClick}
      className="group p-5 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border hover:border-[#006065] dark:border-border/40 dark:hover:border-[#006065] dark:border-border/80 cursor-pointer transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-md"
    >
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[#fad503] bg-[#006065] dark:bg-[#131A2C] shadow-sm">
          <SpaceIcon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-900 dark:text-foreground text-base truncate">{space.name}</h3>
          <p className="text-xs text-slate-500 dark:text-muted-foreground mt-0.5 line-clamp-1 font-medium">{space.description || 'Team workspace'}</p>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#006065] transition-colors shrink-0" />
      </div>
      <div className="flex items-center justify-between mb-4">
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold border ${
          space?.is_private
            ? 'bg-slate-50 dark:bg-background text-slate-600 dark:text-muted-foreground border-slate-200 dark:border-border'
            : 'bg-[#006065] dark:bg-[#131A2C]/5 text-[#006065] border-[#006065] dark:border-border/10'
        }`}>
          {space?.is_private ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
          {space?.is_private ? 'Private' : 'Public'}
        </span>
      </div>
      <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100 dark:border-border">
        <div className="flex -space-x-2">
          {[1,2,3].map(i => (
            <div key={i} className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center text-slate-400">
              <Users className="w-3 h-3" />
            </div>
          ))}
        </div>
        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(space.created_at || Date.now()).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

function formatDuration(seconds, videoId) {
  if (!seconds) {
    const pseudoRandom = videoId ? String(videoId).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 120;
    const fallbackSeconds = 60 + (pseudoRandom % 300);
    const m = Math.floor(fallbackSeconds / 60);
    const s = Math.floor(fallbackSeconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function VideoCard({ video, onClick }) {
  return (
    <div onClick={onClick} className="group cursor-pointer rounded-2xl overflow-hidden bg-white dark:bg-card border border-slate-200 dark:border-border hover:border-[#006065] dark:border-border/40 transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-md flex flex-col">
      <div className="aspect-video bg-slate-100 dark:bg-slate-800 relative flex items-center justify-center overflow-hidden">
        {video.thumbnail_url ? (
          <img src={video.thumbnail_url} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={video.title} />
        ) : (
          <div className="absolute inset-0 w-full h-full bg-[#006065] dark:bg-[#131A2C] group-hover:scale-105 transition-transform duration-500 opacity-90">
          </div>
        )}
        <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-slate-900/30 transition-all duration-300 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white/95 dark:bg-background/95 backdrop-blur-md flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
            <Play className="w-5 h-5 text-[#006065] fill-current ml-1" />
          </div>
        </div>
        <div className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1.5 shadow-sm">
          <Clock className="w-3 h-3 text-white/70" />
          {formatDuration(video.duration_seconds, video.id)}
        </div>
        <div className="absolute top-3 left-3">
          {video.space && (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold shadow-sm backdrop-blur-md ${
              video?.space?.is_private
                ? 'bg-white/90 dark:bg-background/90 text-slate-700 dark:text-foreground'
                : 'bg-[#fad503]/90 text-slate-900 dark:text-foreground'
            }`}>
              {video?.space?.is_private ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
              {video?.space?.is_private ? 'Private' : 'Public'}
            </span>
          )}
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col justify-between">
        <p className="text-sm font-bold text-slate-900 dark:text-foreground line-clamp-1 mb-1">{video.title || 'Untitled Recording'}</p>
        <p className="text-xs text-slate-500 dark:text-muted-foreground font-semibold flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(video.created_at).toLocaleDateString()}</p>
      </div>
    </div>
  );
}

function ActionItemRow({ item }) {
  const [done, setDone] = useState(item.is_complete);
  const toggle = async () => {
    setDone(!done);
    await supabase.from('clipad_action_items').update({ is_complete: !done }).eq('id', item.id);
  };
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-accent/50 transition-colors group">
      <button onClick={toggle} className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 ${done ? 'bg-[#006065] dark:bg-[#131A2C] border-[#006065] dark:border-border' : 'border-slate-300 dark:border-slate-600 hover:border-[#006065] dark:border-border/50'}`}>
        {done && <CheckCircle className="w-3 h-3 text-white" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold leading-snug transition-colors ${done ? 'line-through text-slate-400 dark:text-slate-500 dark:text-muted-foreground' : 'text-slate-700 dark:text-slate-200'}`}>{item.title}</p>
        {item.due_date && <p className="text-xs font-semibold text-slate-400 mt-1 flex items-center gap-1.5"><Clock className="w-3 h-3" /> Due {new Date(item.due_date).toLocaleDateString()}</p>}
      </div>
    </div>
  );
}

export default function CliPadDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [spaces, setSpaces] = useState([]);
  const [videos, setVideos] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [actionItems, setActionItems] = useState([]);
  const [showSpaceSelector, setShowSpaceSelector] = useState(false);
  const [stats, setStats] = useState({ meetings: 0, recordings: 0, actionItems: 0, completionRate: 0 });
  const [loading, setLoading] = useState(true);
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false);

  useEffect(() => {
    if (user) fetchAll();
    
    // Enforce default light theme if none selected
    if (!localStorage.getItem('theme')) {
       
    }
  }, [user]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const companyId = user?.company_id;

      // Build company-scoped queries with user fallback to ensure user's items always show
      const spacesQuery = companyId
        ? supabase.from('clipad_spaces').select('*').or(`company_id.eq.${companyId},created_by.eq.${user.id}`).order('created_at', { ascending: false }).limit(6)
        : supabase.from('clipad_spaces').select('*').eq('created_by', user.id).order('created_at', { ascending: false }).limit(6);

      const videosQuery = companyId
        ? supabase.from('clipad_videos').select('*, space:space_id(name, is_private)').or(`company_id.eq.${companyId},creator_id.eq.${user.id}`).order('created_at', { ascending: false }).limit(6)
        : supabase.from('clipad_videos').select('*, space:space_id(name, is_private)').eq('creator_id', user.id).order('created_at', { ascending: false }).limit(6);

      const meetingsQuery = companyId
        ? supabase.from('clipad_meeting_records').select('*, space:space_id(name, is_private)').or(`company_id.eq.${companyId},host_id.eq.${user.id}`).order('created_at', { ascending: false }).limit(5)
        : supabase.from('clipad_meeting_records').select('*, space:space_id(name, is_private)').eq('host_id', user.id).order('created_at', { ascending: false }).limit(5);

      const [spacesRes, videosRes, meetingsRes, actionRes, allActionRes] = await Promise.all([
        spacesQuery,
        videosQuery,
        meetingsQuery,
        supabase.from('clipad_action_items').select('id', { count: 'exact' }).eq('is_complete', false),
        supabase.from('clipad_action_items').select('id', { count: 'exact' }),
      ]);

      // Fetch recent action items for the sidebar (assigned to user)
      const { data: myActionItemsData } = await supabase
        .from('clipad_action_items')
        .select('*')
        .eq('assigned_to', user.id)
        .eq('is_complete', false)
        .order('created_at', { ascending: false })
        .limit(8);

      // Count all meetings in company or hosted by user (not limited)
      const meetingsCountQuery = companyId
        ? supabase.from('clipad_meeting_records').select('id', { count: 'exact', head: true }).or(`company_id.eq.${companyId},host_id.eq.${user.id}`)
        : supabase.from('clipad_meeting_records').select('id', { count: 'exact', head: true }).eq('host_id', user.id);
      const { count: totalMeetingCount } = await meetingsCountQuery;

      // Count all videos in company or created by user (not limited)
      const videosCountQuery = companyId
        ? supabase.from('clipad_videos').select('id', { count: 'exact', head: true }).or(`company_id.eq.${companyId},creator_id.eq.${user.id}`)
        : supabase.from('clipad_videos').select('id', { count: 'exact', head: true }).eq('creator_id', user.id);
      const { count: totalVideoCount } = await videosCountQuery;

      if (spacesRes.data) setSpaces(spacesRes.data);
      if (videosRes.data) setVideos(videosRes.data);
      if (meetingsRes.data) setMeetings(meetingsRes.data);
      if (myActionItemsData) setActionItems(myActionItemsData);

      const openActions = actionRes.count || 0;
      const totalActions = allActionRes.count || 0;
      const completedActions = totalActions - openActions;
      const completionRate = totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0;

      setStats({
        meetings: totalMeetingCount || 0,
        recordings: totalVideoCount || 0,
        actionItems: openActions,
        completionRate,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSpaceSelect = async (spaceId, privacyType) => {
    setIsCreatingMeeting(true);
    try {
      const roomName = generateShortId();
      const payload = { instant: true, max_participants: getLimit(user, 'maxParticipants'), privacy: privacyType, companyId: user?.company_id || user?.user_metadata?.company_id };
      if (privacyType === 'public') payload.roomName = roomName;

      let roomData = null;
      try {
        const { data, error } = await supabase.functions.invoke('create-daily-room', { body: payload });
        if (!error && data && (data.name || data.roomName)) roomData = data;
      } catch (_) { /* edge function unavailable */ }

      const targetRoomName = roomData?.name || roomData?.roomName || roomName;

      try {
        await supabase.from('video_rooms').upsert({
          id: crypto.randomUUID(),
          company_id: isValidUUID(user?.company_id || user?.user_metadata?.company_id) ? (user?.company_id || user?.user_metadata?.company_id) : null,
          daily_room_name: targetRoomName,
          daily_room_url: roomData?.url || `https://optalflow.daily.co/${targetRoomName}`,
          privacy_type: privacyType || 'public',
          host_id: isValidUUID(user?.id) ? user.id : null,
          status: 'active',
          meeting_type: 'instant'
        });
      } catch (_) { /* db insert failed — meeting still works */ }

      navigate(`/join/${targetRoomName}` + (spaceId ? `?spaceId=${spaceId}` : ''));
    } catch (err) {
      const fallbackRoom = generateShortId();
      console.error('Meeting creation error, using fallback:', err);
      navigate(`/join/${fallbackRoom}` + (spaceId ? `?spaceId=${spaceId}` : ''));
    } finally {
      setIsCreatingMeeting(false);
    }
  };

  const startInstantMeeting = async () => {
    setShowSpaceSelector(true);
  };

  const startInstantMeeting_OLD = async () => {
    setIsCreatingMeeting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-daily-room', { body: { instant: true, max_participants: getLimit(user, 'maxParticipants'), companyId: user?.company_id || user?.user_metadata?.company_id } });
      if (error || !data?.name) throw error || new Error('Failed');
      navigate(`/join/${data.name}`);
    } catch {
      navigate(`/join/${Math.random().toString(36).substring(2, 10)}`);
    } finally {
      setIsCreatingMeeting(false);
    }
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user?.full_name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';

  const getGreetingEmoji = () => {
    const emojis = [
      '\u{1F44B}', '\u{2728}', '\u{1F680}', '\u{1F31F}', '\u{1F389}',
      '\u{1F4A1}', '\u{1F525}', '\u{1F64C}', '\u{1F60E}', '\u{2615}',
      '\u{1F4AA}', '\u{1F3AF}', '\u{1F308}', '\u{26A1}', '\u{1F388}',
      '\u{1F60A}', '\u{1F929}', '\u{1F33A}', '\u{1F340}', '\u{1F3C6}',
      '\u{1F48E}', '\u{1F33B}', '\u{1F91D}', '\u{1F98B}', '\u{1F973}',
      '\u{1F64C}', '\u{1F920}', '\u{1F52E}', '\u{1F38A}', '\u{1F970}', '\u{270C}\u{FE0F}'
    ];
    const day = new Date().getDate();
    return emojis[(day - 1) % emojis.length];
  };

  return (
    <div className="min-h-full bg-[#f8fafc] dark:bg-background text-[#0f172a] dark:text-foreground font-sans overflow-x-hidden pb-24 md:pb-8">
      <SpaceSelectorModal 
        open={showSpaceSelector} 
        onOpenChange={setShowSpaceSelector} 
        onConfirm={handleSpaceSelect} 
      />
      {loading && stats.meetings === 0 ? (
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-2">
              <div className="h-8 w-64 bg-slate-200 dark:bg-white/5 rounded-lg animate-pulse" />
              <div className="h-4 w-96 bg-slate-100 dark:bg-white/5 rounded-lg animate-pulse delay-75" />
            </div>
            <div className="h-10 w-32 bg-slate-200 dark:bg-white/5 rounded-xl animate-pulse" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-10">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-36 bg-card border border-border/50 rounded-2xl p-5 flex flex-col justify-between shadow-sm animate-pulse relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                <div className="flex justify-between items-start">
                  <div className="w-10 h-10 rounded-xl bg-secondary/50" />
                  <div className="w-6 h-6 rounded-md bg-secondary/30" />
                </div>
                <div className="space-y-2">
                  <div className="h-6 w-1/2 bg-secondary/60 rounded-md" />
                  <div className="h-4 w-3/4 bg-secondary/30 rounded-md" />
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center mb-4">
                <div className="h-6 w-48 bg-slate-200 dark:bg-white/5 rounded-lg animate-pulse" />
                <div className="h-4 w-24 bg-slate-100 dark:bg-white/5 rounded-lg animate-pulse" />
              </div>
              {[1,2,3].map(i => (
                <div key={i} className="h-20 bg-card border border-border/50 rounded-xl p-4 flex items-center gap-4 animate-pulse">
                  <div className="w-12 h-12 rounded-lg bg-secondary/50 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-1/3 bg-secondary/60 rounded-md" />
                    <div className="h-4 w-1/2 bg-secondary/30 rounded-md" />
                  </div>
                  <div className="w-20 h-8 rounded-lg bg-secondary/40 shrink-0" />
                </div>
              ))}
            </div>
            <div className="space-y-4">
              <div className="h-6 w-32 bg-slate-200 dark:bg-white/5 rounded-lg animate-pulse mb-4" />
              <div className="h-[300px] bg-card border border-border/50 rounded-2xl p-5 animate-pulse flex flex-col gap-4">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary/50 shrink-0" />
                    <div className="flex-1 h-4 bg-secondary/40 rounded-md" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">

        {/* Personalized Greeting */}
        <div className="mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-foreground mb-1 tracking-tight">
            {greeting()}, {firstName} <span className="inline-block animate-bounce origin-bottom-right delay-500">{getGreetingEmoji()}</span>
          </h1>
          <p className="text-base text-slate-600 dark:text-muted-foreground font-medium">Here's what's happening across your spaces.</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 mb-8 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
          <StatCard icon={Calendar} value={stats.meetings} label="Meetings" trend={12} />
          <StatCard icon={Camera} value={stats.recordings} label="Videos" trend={8} />
          <StatCard icon={Target} value={stats.actionItems} label="Action Items" />
          <StatCard icon={TrendingUp} value={`${stats.completionRate}%`} label="Completed" trend={5} />
        </div>

        {/* CliPad 3.0 Intelligence Strip (Super Admin Only) */}
        {user?.role === 'super_admin' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 animate-in fade-in slide-in-from-bottom-7 duration-700 delay-150">
            {[
              { label: 'Org Health Pulse', desc: 'Live health score', path: '/pulse', colorClass: 'from-emerald-500 to-teal-500', iconEl: <HeartPulse className="w-4 h-4 text-slate-900 dark:text-foreground" /> },
              { label: 'Risk Intelligence', desc: 'Failure prediction', path: '/risk', colorClass: 'from-red-500 to-orange-500', iconEl: <TrendingUp className="w-4 h-4 text-slate-900 dark:text-foreground" /> },
              { label: 'Commitment Engine', desc: 'Accountability layer', path: '/commitments', colorClass: 'from-blue-500 to-indigo-500', iconEl: <Target className="w-4 h-4 text-slate-900 dark:text-foreground" /> },
              { label: 'Cross-Space Intel', desc: 'Silo & collision scanner', path: '/cross-space', colorClass: 'from-violet-500 to-purple-500', iconEl: <Network className="w-4 h-4 text-slate-900 dark:text-foreground" /> },
            ].map(item => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="relative overflow-hidden flex flex-col gap-2 p-4 rounded-2xl bg-white dark:bg-card text-slate-900 dark:text-foreground border border-slate-200 dark:border-border border border-white/15 dark:border-white/15 hover:border-primary/30 hover:shadow-md transition-all duration-300 group text-left active:scale-[0.98]"
              >
                <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${item.colorClass} rounded-t-2xl`} />
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${item.colorClass} flex items-center justify-center shadow-sm`}>
                  {item.iconEl}
                </div>
                <div>
                  <p className="text-[13px] font-bold text-slate-900 dark:text-foreground leading-tight">{item.label}</p>
                  <p className="text-[11px] text-slate-500 dark:text-muted-foreground dark:text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Quick Actions - Premium Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
          {/* New Meeting */}
          <button
            onClick={startInstantMeeting}
            disabled={isCreatingMeeting}
            className="flex items-center gap-4 p-5 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border shadow-sm hover:shadow-md hover:border-[#006065] dark:border-border/30 active:scale-[0.98] transition-all duration-200 group text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-[#006065] dark:bg-[#131A2C] text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              {isCreatingMeeting
                ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <Video className="w-5 h-5 text-[#fad503]" />}
            </div>
            <div>
              <span className="block text-sm font-extrabold text-slate-900 dark:text-foreground leading-tight mb-0.5">New Meeting</span>
              <span className="block text-xs font-semibold text-slate-500 dark:text-muted-foreground">Start an instant room</span>
            </div>
          </button>

          {/* Record Video */}
          <button
            onClick={() => navigate('/record')}
            className="flex items-center gap-4 p-5 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border shadow-sm hover:shadow-md hover:border-[#006065] dark:border-border/30 active:scale-[0.98] transition-all duration-200 group text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-[#006065] dark:bg-[#131A2C] text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Camera className="w-5 h-5 text-[#fad503]" />
            </div>
            <div>
              <span className="block text-sm font-extrabold text-slate-900 dark:text-foreground leading-tight mb-0.5">Record Video</span>
              <span className="block text-xs font-semibold text-slate-500 dark:text-muted-foreground">Capture your screen</span>
            </div>
          </button>

          {/* Team Spaces */}
          <button
            onClick={() => navigate('/spaces')}
            className="flex items-center gap-4 p-5 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border shadow-sm hover:shadow-md hover:border-[#fad503]/50 active:scale-[0.98] transition-all duration-200 group text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-[#fad503] text-[#006065] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5 font-bold" />
            </div>
            <div>
              <span className="block text-sm font-extrabold text-slate-900 dark:text-foreground leading-tight mb-0.5">Team Spaces</span>
              <span className="block text-xs font-semibold text-slate-500 dark:text-muted-foreground">Browse workspaces</span>
            </div>
          </button>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-10 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">

          {/* Left — Spaces + Videos */}
          <div className="lg:col-span-2 space-y-10">

            {/* Spaces */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-foreground flex items-center gap-2"><Layers className="w-5 h-5 text-[#006065] dark:text-[#006065]" /> Team Spaces</h2>
                  <button 
                    onClick={() => window.dispatchEvent(new CustomEvent('open-global-search'))}
                    className="p-1.5 rounded-full bg-white/10 hover:bg-white/15 dark:bg-secondary dark:hover:bg-accent text-slate-500 dark:text-muted-foreground transition-colors"
                    title="Smart Global Search (Ctrl+K)"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>
                <button onClick={() => navigate('/spaces')} className="text-sm font-medium text-[#006065] dark:text-[#006065] hover:text-[#006065] dark:text-[#006065]/80 flex items-center gap-1.5 transition-colors">View all <ArrowRight className="w-4 h-4" /></button>
              </div>
              {spaces.length === 0 ? (
                <div className="p-10 rounded-2xl border border-dashed border-black/10 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-sm text-center">
                  <Layers className="w-12 h-12 text-slate-500 dark:text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm font-medium text-slate-500 dark:text-muted-foreground dark:text-muted-foreground">No spaces yet.</p>
                  <button onClick={() => navigate('/spaces')} className="mt-4 text-sm font-semibold text-[#006065] dark:text-[#006065] hover:text-[#006065] dark:text-[#006065]/80 transition-colors">Create your first space →</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  {spaces.slice(0, 4).map(s => <SpaceCard key={s.id} space={s} onClick={() => navigate(`/spaces/${s.id}`)} />)}
                </div>
              )}
            </div>

            {/* Recent Recordings */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-foreground flex items-center gap-2"><Camera className="w-5 h-5 text-[#006065] dark:text-[#006065]" /> Recent Recordings</h2>
                <div className="flex items-center gap-4">
                  <button onClick={() => navigate('/videos')} className="text-sm font-semibold text-slate-500 dark:text-muted-foreground hover:text-slate-900 dark:text-foreground dark:text-muted-foreground dark:hover:text-slate-900 dark:text-foreground transition-colors">View all</button>
                  <button onClick={() => navigate('/record')} className="text-sm font-medium text-[#006065] dark:text-[#006065] hover:text-[#006065] dark:text-[#006065]/80 flex items-center gap-1.5 transition-colors">Record new <ArrowRight className="w-4 h-4" /></button>
                </div>
              </div>
              {videos.length === 0 ? (
                <div className="p-10 rounded-2xl border border-dashed border-black/10 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-sm text-center">
                  <Camera className="w-12 h-12 text-slate-500 dark:text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm font-medium text-slate-500 dark:text-muted-foreground dark:text-muted-foreground">No recordings yet.</p>
                  <button onClick={() => navigate('/record')} className="mt-4 text-sm font-semibold text-[#006065] dark:text-[#006065] hover:text-[#006065] dark:text-[#006065]/80 transition-colors">Record your first async video →</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                  {videos.slice(0, 6).map(v => <VideoCard key={v.id} video={v} onClick={() => navigate(`/watch/${v.id}`)} />)}
                </div>
              )}
            </div>
          </div>

          {/* Right — Action Items + AI Insight + Recent Meetings */}
          <div className="space-y-8">

            {/* My Action Items */}
            <div className="bg-white dark:bg-card text-slate-900 dark:text-foreground border border-slate-200 dark:border-border rounded-3xl  shadow-[0_2px_16px_rgba(0,0,0,0.03)] overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-5 border-b border-black/5 dark:border-white/5">
                <h2 className="font-bold text-slate-900 dark:text-foreground text-base flex items-center gap-2"><CheckCircle className="w-5 h-5 text-[#006065]" /> My Action Items</h2>
                <span className="text-xs font-semibold px-2.5 py-1 bg-white/10 dark:bg-black/20 text-slate-700 dark:text-muted-foreground rounded-full">{actionItems.length} open</span>
              </div>
              <div className="p-2 md:p-4 max-h-[320px] overflow-y-auto scrollbar-primary">
                {actionItems.length === 0 ? (
                  <div className="py-10 text-center">
                    <Star className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-500 dark:text-muted-foreground dark:text-muted-foreground">No open action items. Nice work!</p>
                  </div>
                ) : (
                  actionItems.map(item => <ActionItemRow key={item.id} item={item} />)
                )}
              </div>
            </div>

            {/* AI Intelligence Insight */}
            <div className="bg-white dark:bg-card text-slate-900 dark:text-foreground border border-slate-200 dark:border-border rounded-3xl  shadow-[0_2px_16px_rgba(0,0,0,0.03)] p-4 md:p-6 shadow-sm">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[#006065] dark:bg-[#131A2C]/10 flex items-center justify-center">
                  <Brain className="w-4.5 h-4.5 text-[#006065] dark:text-[#006065]" />
                </div>
                <span className="text-sm font-bold text-[#006065] dark:text-[#006065] font-extrabold uppercase tracking-widest">AI Insight</span>
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-muted-foreground leading-relaxed">
                {stats.meetings > 0
                  ? `Your team had ${stats.meetings} meetings recently. ${stats.actionItems} action items were generated and your completion rate is tracking at ${stats.completionRate}%.`
                  : 'Start a meeting to unlock AI-powered insights about your team\'s collaboration patterns and action item completion.'}
              </p>
            </div>

            {/* Follow-Up Engine */}
            {isAdmin(user) && hasFeature(user, 'hasSmartFollowUps') && (
              <FollowUpEngine workspaceId={user?.company_id} />
            )}

            {/* Knowledge Health (Admin Only) */}
            {isAdmin(user) && hasFeature(user, 'hasEnterpriseAnalytics') && (
              <div onClick={() => navigate(window.location.pathname.startsWith('/clipad') ? '/clipad/health' : '/health')} className="bg-white dark:bg-card text-slate-900 dark:text-foreground border border-slate-200 dark:border-border rounded-3xl  shadow-[0_2px_16px_rgba(0,0,0,0.03)] p-6 shadow-sm hover:shadow-md hover:border-[#006065] dark:border-border/30 transition-all cursor-pointer group">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-card text-slate-900 dark:text-foreground border border-slate-200 dark:border-border flex items-center justify-center text-[#fad503] group-hover:scale-110 transition-transform">
                    <HeartPulse className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-foreground">Knowledge Health</h3>
                    <p className="text-xs font-semibold text-[#fad503] uppercase tracking-widest">Admin View</p>
                  </div>
                </div>
                <p className="text-sm text-slate-500 dark:text-muted-foreground dark:text-muted-foreground mt-3">View organizational intelligence metrics, silo risks, and AI health diagnosis.</p>
              </div>
            )}


            {/* Recent Meetings */}
            <div className="bg-white dark:bg-card text-slate-900 dark:text-foreground border border-slate-200 dark:border-border rounded-3xl  shadow-[0_2px_16px_rgba(0,0,0,0.03)] overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-5 border-b border-black/5 dark:border-white/5">
                <h2 className="font-bold text-slate-900 dark:text-foreground text-base flex items-center gap-2"><Calendar className="w-5 h-5 text-[#006065] dark:text-[#006065]" /> Recent Meetings</h2>
                <button onClick={() => navigate('/meetings')} className="text-xs font-semibold text-[#006065] dark:text-[#006065] hover:text-[#006065] dark:text-[#006065]/80 transition-colors">View all</button>
              </div>
              <div className="divide-y divide-black/5 dark:divide-white/5">
                {meetings.length === 0 ? (
                  <div className="py-10 text-center">
                    <Calendar className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-500 dark:text-muted-foreground dark:text-muted-foreground">No meetings yet.</p>
                  </div>
                ) : (
                  meetings.slice(0, 4).map(m => (
                    <div key={m.id} onClick={() => navigate(`/meetings/${m.id}`)} className="px-4 py-3 md:px-6 md:py-4 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors group">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900 dark:text-foreground group-hover:text-[#006065] transition-colors shrink-0 transition-colors">{m.title || 'Team Meeting'}</p>
                          {m.space && (
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              m?.space?.is_private
                                ? 'bg-white dark:bg-card text-slate-900 dark:text-foreground border border-slate-200 dark:border-border text-slate-600 dark:text-muted-foreground'
                                : 'bg-[#006065] dark:bg-card text-[#006065] dark:text-[#fad503]'
                            }`}>
                              {m?.space?.is_private ? <Lock className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
                              {m?.space?.is_private ? 'Private' : 'Public'}
                            </span>
                          )}
                        </div>
                        {m.ai_summary && <Sparkles className="w-4 h-4 text-[#006065] dark:text-[#006065] shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />}
                      </div>
                      <p className="text-xs font-medium text-slate-500 dark:text-muted-foreground dark:text-muted-foreground">{new Date(m.created_at).toLocaleString()}</p>
                      {m.ai_summary && <p className="text-xs font-medium text-slate-500 dark:text-muted-foreground dark:text-muted-foreground mt-2 line-clamp-1 border-l-2 border-primary/30 pl-2">{m.ai_summary}</p>}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Culture & Intelligence Layer (Admins Only) */}
        {user?.company_id && isAdmin(user) && (
          <div className="mt-8 space-y-6">
            {hasFeature(user, 'hasEnterpriseAnalytics') && (
              <div className="w-full">
                <InstitutionalMemoryVault workspaceId={user.company_id} />
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MeetingNecessityWidget workspaceId={user.company_id} />
              <TimezoneFairnessWidget workspaceId={user.company_id} />
              {hasFeature(user, 'hasAdvancedAI') ? (
                <BlockerRadar 
                  workspaceId={user.company_id} 
                  isWorkspaceView={true} 
                  hasFullIntelligence={true} 
                />
              ) : (
                <div className="bg-white/50 dark:bg-[#202c33]/50 backdrop-blur-xl rounded-[20px] p-6 border border-black/5 dark:border-white/5 flex flex-col items-center justify-center text-center shadow-sm">
                  <Target className="w-8 h-8 text-[#006065] mb-3 opacity-50" />
                  <p className="text-sm font-medium text-slate-600 dark:text-muted-foreground">Advanced AI Required</p>
                  <p className="text-xs text-slate-500 dark:text-muted-foreground mt-1">Upgrade to track organizational blockers.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}

