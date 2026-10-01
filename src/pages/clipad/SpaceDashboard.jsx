import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { getLimit, hasFeature } from '@/lib/clipadPricing';
import { useAuth } from '@/lib/AuthContext';
import { isAdmin, isSpacemanInSpace } from '@/lib/constants';
import {
  Users, Video, Calendar, Play, Activity,
  Brain, FileText, CheckCircle, Search, Settings, ArrowLeft,
  Clock, MessageSquare, ArrowRight, Edit3, Lock, X, Trash2, User, ShieldAlert, Sparkles, Camera, Layers, ChevronRight, Sun
} from 'lucide-react';
import MeetingInsights from '@/components/clipad/MeetingInsights';
import { getSpaceIcon } from '@/utils/spaceIcons';
import { generateShortId } from '@/utils/idGenerator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import ClipadLoader from '@/components/ui/ClipadLoader';
import LockWall from '@/components/clipad/LockWall';
import { useToast } from '@/components/ui/use-toast';
import TaskBoard from '@/components/clipad/tasks/TaskBoard';
import SpaceChat from '@/components/clipad/chat/SpaceChat';
import SpaceDocs from '@/components/clipad/docs/SpaceDocs';
import SpaceCalendar from '@/components/clipad/calendar/SpaceCalendar';
import CanvasWhiteboard from '@/components/clipad/CanvasWhiteboard';
import SpaceAutomations from '@/components/clipad/SpaceAutomations';
import DecisionLedger from '@/components/clipad/features/DecisionLedger';
import ContextCapsule from '@/components/clipad/features/ContextCapsule';
import BlockerRadar from '@/components/clipad/features/BlockerRadar';
import RedundantWorkAlert from '@/components/clipad/features/RedundantWorkAlert';
import MeetingROIDashboard from '@/components/clipad/features/MeetingROIDashboard';
import CommitmentTracker from '@/components/clipad/features/CommitmentTracker';
import AIInsightsPanel from '@/components/clipad/features/AIInsightsPanel';
import StandupPanel from '@/components/clipad/StandupPanel';
import OrgTimeline from '@/components/clipad/OrgTimeline';
import MemoryTimeline from '@/components/clipad/features/MemoryTimeline';

const TABS = [
  { id: 'overview', icon: Layers, label: 'Overview' },
  { id: 'timeline', icon: Activity, label: 'Timeline' },
  { id: 'memory', icon: Brain, label: 'Memory' },
  { id: 'standup', icon: Sun, label: 'Standup' },
  { id: 'chat', icon: MessageSquare, label: 'Chat' },
  { id: 'calendar', icon: Calendar, label: 'Calendar' },
  { id: 'videos', icon: Camera, label: 'Videos' },
  { id: 'meetings', icon: Calendar, label: 'Meetings' },
  { id: 'tasks', icon: CheckCircle, label: 'Action' },
  { id: 'decisions', icon: ShieldAlert, label: 'Decisions' },
  { id: 'docs', icon: FileText, label: 'Docs' },
  { id: 'canvas', icon: Sparkles, label: 'Canvas' },
  { id: 'automations', icon: Settings, label: 'Automations' },
];

const COLORS = ['from-indigo-500 to-violet-500','from-cyan-500 to-blue-500','from-pink-500 to-rose-500','from-emerald-500 to-teal-500','from-amber-500 to-orange-500'];

function TaskRow({ item, onToggle }) {
  const [done, setDone] = useState(item.is_complete);
  const handle = async () => {
    const next = !done;
    setDone(next);
    await supabase.from('clipad_action_items').update({ is_complete: next }).eq('id', item.id);
    onToggle?.(item.id, next);
  };
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl hover:bg-secondary transition-colors group">
      <button onClick={handle} className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${done ? 'bg-emerald-500 border-emerald-500' : 'border-gray-600 hover:border-primary'}`}>
        {done && <CheckCircle className="w-3.5 h-3.5 text-foreground" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-snug ${done ? 'line-through text-muted-foreground' : 'text-gray-200'}`}>{item.title}</p>
        <div className="flex items-center gap-3 mt-1">
          {item.assignedUser?.full_name && <span className="text-xs text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" /> {item.assignedUser.full_name}</span>}
          {item.due_date && <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(item.due_date).toLocaleDateString()}</span>}
        </div>
      </div>
      {item.context && (
        <span className="hidden group-hover:block text-[10px] text-muted-foreground max-w-[140px] text-right line-clamp-2">{item.context}</span>
      )}
    </div>
  );
}

const getVideoColor = (id) => {
  const colors = [
    'from-blue-500 to-blue-700', 
    'from-indigo-500 to-indigo-700', 
    'from-purple-500 to-purple-700', 
    'from-fuchsia-500 to-fuchsia-700',
    'from-rose-500 to-rose-700', 
    'from-orange-500 to-orange-700', 
    'from-emerald-500 to-emerald-700', 
    'from-cyan-500 to-cyan-700'
  ];
  if (!id) return colors[0];
  const charCodeSum = String(id).split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return colors[charCodeSum % colors.length];
};

function VideoCard({ video, onClick }) {
  return (
    <div onClick={onClick} className="group cursor-pointer rounded-2xl overflow-hidden bg-[#006065] text-white dark:bg-[#006065] border border-white/15 dark:border-white/15 hover:border-indigo-400/50 transition-all hover:-translate-y-0.5 shadow-sm hover:shadow-md">
      <div className="aspect-video bg-white/10 dark:bg-secondary relative flex items-center justify-center overflow-hidden">
        {video.thumbnail_url ? (
          <img src={video.thumbnail_url} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={video.title} />
        ) : (
          <div className={`absolute inset-0 w-full h-full bg-gradient-to-br ${getVideoColor(video.id)} group-hover:scale-105 transition-transform duration-500 opacity-90`}>
          </div>
        )}
        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
            <Play className="w-5 h-5 text-indigo-600 fill-current ml-1" />
          </div>
        </div>
        {video.duration_seconds && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-mono font-medium px-2 py-0.5 rounded">
            {Math.floor(video.duration_seconds/60)}:{String(video.duration_seconds%60).padStart(2,'0')}
          </div>
        )}
        {(video.is_locked || video.unlock_at) && (
          <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-md text-white px-2 py-1 rounded-md">
            <Lock className="w-3.5 h-3.5 text-indigo-400" />
          </div>
        )}
      </div>
      <div className="p-4 bg-[#006065] text-white dark:bg-[#006065]">
        <p className="text-sm font-semibold text-white dark:text-white line-clamp-1">{video.title || 'Untitled'}</p>
        <p className="text-xs text-white/70 dark:text-muted-foreground mt-1">{new Date(video.created_at).toLocaleDateString()}</p>
      </div>
    </div>
  );
}

export default function SpaceDashboard() {
  const { spaceId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  const [space, setSpace] = useState(null);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [isLive, setIsLive] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editIsPrivate, setEditIsPrivate] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [spaceMembers, setSpaceMembers] = useState([]);
  const [searchMember, setSearchMember] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);
  const [memoryTopic, setMemoryTopic] = useState('');
  const [memoryInput, setMemoryInput] = useState('');
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [privacyType, setPrivacyType] = useState('private');
  const { toast } = useToast();

  useEffect(() => { if (spaceId) fetchAll(); }, [spaceId]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams(prev => {
      prev.set('tab', tabId);
      return prev;
    }, { replace: true });
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      // Phase 1: fetch the space first so we get company_id
      const spaceRes = await supabase.from('clipad_spaces').select('*').eq('id', spaceId).single();
      if (spaceRes.data) {
        const s = spaceRes.data;
        const isOwner = user && s.created_by === user.id;

        // Access control: block non-members from private spaces (admins bypass)
        if (s.is_private && !isOwner && !isAdmin(user)) {
          const { data: memberRow } = await supabase
            .from('clipad_space_members')
            .select('id')
            .eq('space_id', spaceId)
            .eq('user_id', user?.id || '')
            .single();
          if (!memberRow) {
            setSpace(s); // still set so LockWall can show the name
            setAccessDenied(true);
            setLoading(false);
            return;
          }
        }

        setSpace(s);
        setEditName(s.name);
        setEditDesc(s.description || '');
        setEditIsPrivate(s.is_private || false);
      }

      const companyId = spaceRes.data?.company_id || user?.company_id || user?.companies?.id;

      // Phase 2: fetch everything else in parallel, using reliable companyId
      const [videosRes, meetingsRes, membersRes, profilesRes, staffRes, activeRoomRes] = await Promise.all([
        supabase.from('clipad_videos').select('*, creator:creator_id(full_name, avatar_url)').eq('space_id', spaceId).order('created_at', { ascending: false }).limit(12),
        supabase.from('clipad_meeting_records').select('*').eq('space_id', spaceId).order('created_at', { ascending: false }).limit(20),
        supabase.from('clipad_space_members').select('*').eq('space_id', spaceId),
        companyId
          ? supabase.from('profiles').select('id, full_name, email, avatar_url, role').eq('company_id', companyId).limit(500)
          : supabase.from('profiles').select('id, full_name, email, avatar_url, role').limit(50),
        companyId
          ? supabase.from('staff_records').select('user_id, user_email, full_name').eq('company_id', companyId)
          : { data: [] },
        spaceRes.data?.meeting_url
          ? supabase.from('video_rooms').select('daily_room_name, status').eq('daily_room_url', spaceRes.data.meeting_url).eq('status', 'active').maybeSingle()
          : { data: null }
      ]);

      // Fetch action items via meeting_id (no space_id on that table)
      let tasksRes = { data: [] };
      const meetingIds = (meetingsRes.data || []).map(m => m.id);
      if (meetingIds.length > 0) {
        tasksRes = await supabase.from('clipad_action_items').select('*, assignedUser:assigned_to(full_name)').in('meeting_id', meetingIds).order('created_at', { ascending: false });
      }

      if (videosRes.data) setVideos(videosRes.data);
      if (meetingsRes.data) {
        setMeetings(meetingsRes.data);
      }
      
      if (activeRoomRes?.data) {
        setIsLive(true);
      } else if (meetingsRes.data?.[0]) {
        // Fallback for immediate UI updates if status sync is delayed
        const recent = meetingsRes.data[0];
        if (Date.now() - new Date(recent.created_at).getTime() < 7200000 && !recent.ended_at) {
          setIsLive(true);
        }
      }
      if (tasksRes.data) setTasks(tasksRes.data);
      if (membersRes.data) setSpaceMembers(membersRes.data);

      if (profilesRes.data) {
        const staffData = staffRes.data || [];
        const profilesData = profilesRes.data || [];

        const mergedMap = new Map();

        staffData.forEach(s => {
          const email = (s.user_email || '').toLowerCase();
          if (email) {
            mergedMap.set(email, {
              id: s.user_id || `pending-${email}`,
              email: s.user_email,
              full_name: s.full_name,
              avatar_url: null,
              isPending: !s.user_id
            });
          }
        });

        profilesData.forEach(p => {
          const email = (p.email || '').toLowerCase();
          if (email && mergedMap.has(email)) {
            const existing = mergedMap.get(email);
            mergedMap.set(email, {
              ...existing,
              id: p.id || existing.id,
              full_name: p.full_name || existing.full_name || 'Unknown User',
              avatar_url: p.avatar_url || null,
              isPending: false
            });
          } else {
            mergedMap.set(email || p.id, {
              id: p.id,
              full_name: p.full_name || 'Unknown User',
              email: p.email || '',
              avatar_url: p.avatar_url || null,
              isPending: false
            });
          }
        });

        setProfiles(Array.from(mergedMap.values()));
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleJoinMeeting = async () => {
    setShowPrivacyModal(true);
  };

  const confirmJoinMeeting = async () => {
    setShowPrivacyModal(false);
    const roomName = generateShortId();
    try {
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
          company_id: user?.company_id || user?.user_metadata?.company_id || null,
          daily_room_name: targetRoomName,
          daily_room_url: roomData?.url || `https://optavel.daily.co/${targetRoomName}`,
          privacy_type: privacyType || 'public',
          host_id: user?.id || null,
          status: 'active',
          meeting_type: 'instant'
        });
      } catch (_) { /* db insert failed â€” meeting still works */ }

      try {
        await supabase.from('clipad_spaces').update({ meeting_url: roomData?.url || `https://optavel.daily.co/${targetRoomName}` }).eq('id', spaceId);
      } catch (_) {}

      navigate(`/join/${targetRoomName}?spaceId=${spaceId}`);
    } catch (_) {
      navigate(`/join/${roomName}?spaceId=${spaceId}`);
    }
  };

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !user) return;
    setCreatingTask(true);
    try {
      const { data, error } = await supabase.from('clipad_action_items').insert({
        space_id: spaceId,
        assigned_to: user.id,
        title: newTaskTitle.trim(),
        is_complete: false,
      }).select().single();
      if (error) throw error;
      setTasks(prev => [data, ...prev]);
      setNewTaskTitle('');
      setShowNewTask(false);
    } catch (err) { console.error(err); }
    finally { setCreatingTask(false); }
  };

  const handleEditSpace = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;
    setSavingEdit(true);
    try {
      const { data, error } = await supabase.from('clipad_spaces').update({
        name: editName.trim(),
        description: editDesc.trim(),
        is_private: editIsPrivate,
      }).eq('id', spaceId).select().single();
      if (error) throw error;
      setSpace(data);
      setShowEdit(false);
      toast({ title: 'Space updated successfully' });
    } catch (err) { console.error(err); }
    finally { setSavingEdit(false); }
  };

  const handleDeleteSpace = async () => {
    if (!window.confirm('Are you sure you want to delete this space? All associated videos and tasks will be removed. This cannot be undone.')) return;
    try {
      await supabase.from('clipad_spaces').delete().eq('id', spaceId);
      toast({ title: 'Space deleted' });
      navigate('/spaces');
    } catch (err) { console.error(err); }
  };

  const toggleMember = async (profileId) => {
    if (profileId.startsWith('pending-')) return;
    const isMember = spaceMembers.some(m => m.user_id === profileId);
    try {
      if (isMember) {
        await supabase.from('clipad_space_members').delete().match({ space_id: spaceId, user_id: profileId });
        setSpaceMembers(prev => prev.filter(m => m.user_id !== profileId));
      } else {
        const { data, error } = await supabase.from('clipad_space_members').insert({ space_id: spaceId, user_id: profileId }).select().single();
        if (error) throw error;
        if (data) {
          setSpaceMembers(prev => [...prev, data]);
          
          // Send notification
          try {
            await supabase.from('clipad_notifications').insert({
              user_id: profileId,
              type: 'space_invite',
              title: 'Added to Workspace',
              message: `You have been added to the workspace "${space?.name || 'Workspace'}"`,
              link: `/space/${spaceId}`,
              source_id: spaceId
            });
          } catch (notifErr) {
            console.error('Failed to send notification', notifErr);
          }
        }
      }
    } catch (err) { console.error(err); }
  };

  const colorIndex = space?.name?.charCodeAt(0) % COLORS.length || 0;
  const color = COLORS[colorIndex];

  const getDailyNatureElement = () => {
    const nature = [
      'ðŸŒ¿', 'ðŸŒ¸', 'ðŸ”ï¸', 'ðŸ', 'ðŸƒ', 'ðŸŒ²', 'ðŸŒ´', 'ðŸŒ¾', 'ðŸŒµ', 'ðŸŒ»',
      'ðŸŒ¼', 'ðŸ„', 'ðŸŒ³', 'ðŸ‚', 'â›…', 'ðŸŒˆ', 'ðŸª´', 'ðŸŒŠ', 'â„ï¸', 'ðŸªµ',
      'ðŸŒº', 'ðŸ€', 'ðŸŒ·', 'ðŸŒ±', 'ðŸµï¸', 'ðŸ’', 'ðŸŽ‹', 'ðŸª´', 'ðŸŒ…', 'ðŸŒŒ', 'ðŸŒ '
    ];
    const day = new Date().getDate(); // 1-31
    return nature[(day - 1) % nature.length];
  };

  if (loading || isLoadingAuth) {
    return <ClipadLoader fullScreen text="Loading space dashboard..." />;
  }

  if (accessDenied) {
    return <LockWall type="private" title={space?.name || 'this space'} onBack={() => navigate('/spaces')} />;
  }

  if (!space) {
    return (
      <div style={{ fontFamily: "'Inter', sans-serif" }} className="min-h-full bg-white/5  page-enter flex items-center justify-center text-foreground">
        <div className="text-center">
          <Layers className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-muted-foreground">Space not found.</p>
          <button onClick={() => navigate('/spaces')} className="mt-4 text-primary hover:text-primary/80 text-sm transition-colors">â† Back to Spaces</button>
        </div>
      </div>
    );
  }

  const openTasks = tasks.filter(t => !t.is_complete);
  const doneTasks = tasks.filter(t => t.is_complete);
  
  // Only company admins / super admins / the platform admin can edit or delete spaces.
  // Regular staff (even space creators) can view but not modify.
  const isSpacemanHere = isSpacemanInSpace(user, spaceMembers);
  const canEdit = isAdmin(user) || isSpacemanHere;
  const isMember = spaceMembers.some(m => m.user_id === user?.id);



  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="min-h-full bg-[#f8fafc] page-enter text-white overflow-x-hidden pb-24 md:pb-8">
      {/* Privacy Modal */}
      <Dialog open={showPrivacyModal} onOpenChange={setShowPrivacyModal}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Start Meeting</DialogTitle>
            <DialogDescription>
              Choose the privacy setting for this meeting.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between p-3 mt-2 bg-white/5 dark:bg-secondary rounded-xl border border-white/15 dark:border-white/15">
            <div>
              <p className="text-sm font-semibold text-white dark:text-white">Meeting Privacy</p>
              <p className="text-xs text-white/70 dark:text-muted-foreground">{privacyType === 'private' ? 'Only org members can join.' : 'External guests can knock to join.'}</p>
            </div>
            <div className="flex bg-white/15 dark:bg-slate-700 p-1 rounded-lg">
              <button
                onClick={() => setPrivacyType('private')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${privacyType === 'private' ? 'bg-[#006065] text-white dark:bg-slate-600 text-white dark:text-white shadow-sm' : 'text-white/70 hover:text-white/90 dark:text-white/60 dark:hover:text-white'}`}
              >
                Private
              </button>
              <button
                onClick={() => setPrivacyType('public')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${privacyType === 'public' ? 'bg-[#006065] text-white dark:bg-slate-600 text-white dark:text-white shadow-sm' : 'text-white/70 hover:text-white/90 dark:text-white/60 dark:hover:text-white'}`}
              >
                Public
              </button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPrivacyModal(false)}>Cancel</Button>
            <Button onClick={confirmJoinMeeting}>Start Meeting</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nav */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-4 md:px-10 h-14 md:h-16 bg-[#006065] text-white border-b border-white/15/80">
        <div className="flex items-center gap-2 md:gap-3">
          <button onClick={() => navigate('/spaces')} className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/10 text-white/90 hover:bg-white/15 transition-all hover:-translate-y-0.5 active:scale-95"><ArrowLeft className="w-5 h-5 md:w-5 md:h-5 text-white" /></button>
          <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-sm`}>
            {React.createElement(getSpaceIcon(space.name), { className: "w-4 h-4 md:w-4 md:h-4" })}
          </div>
          <span className="hidden md:block font-semibold text-base md:text-lg text-white line-clamp-1">{space.name}</span>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <button onClick={() => navigate('/chat')} className="px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all flex items-center gap-2 active:scale-95">
            <MessageSquare className="w-4 h-4" /> Chat
          </button>
          <button onClick={() => navigate('/record')} className="px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all flex items-center gap-2 active:scale-95">
            <Camera className="w-4 h-4" /> Record
          </button>
          <button
            onClick={handleJoinMeeting}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all active:scale-95 ${isLive ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-lg shadow-rose-500/25 animate-pulse' : 'bg-[#00beac] text-[#00beac] font-bold shadow-lg shadow-[#00beac]/25 hover:bg-[#e6c402]'}`}
          >
            {isLive ? <Activity className="w-4 h-4" /> : <Video className="w-4 h-4" />}
            {isLive ? 'Join Live' : 'Start Meeting'}
          </button>
        </div>
      </nav>

      {/* Space header */}
      <div className="relative overflow-hidden bg-[#006065] text-white border-b border-white/15/80">
        <div className={`hidden md:block absolute inset-0 bg-gradient-to-br ${color} opacity-[0.03] dark:opacity-[0.08]`} />
        
        {/* Nature Design */}
        <div className="hidden md:flex absolute top-0 right-0 bottom-0 pointer-events-none select-none items-center justify-end pr-6 md:pr-16 lg:pr-32 z-0">
          <div className="relative">
            <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-10 dark:opacity-20 blur-xl scale-150 rounded-full`} />
            <span className="relative text-6xl md:text-[90px] leading-none opacity-95 dark:opacity-100">
              {getDailyNatureElement()}
            </span>
          </div>
        </div>
        <div className="relative px-4 md:px-10 py-6 md:py-8 z-10">
          <div className="flex items-start gap-3 md:gap-4">
            <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-lg md:shadow-xl shrink-0`}>
              {React.createElement(getSpaceIcon(space.name), { className: "w-6 h-6 md:w-7 md:h-7" })}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2 md:gap-3 leading-tight">
                <span className="truncate">{space.name}</span>
                {space.is_private && <Lock className="w-4 h-4 md:w-5 md:h-5 text-white/50 shrink-0" />}
                {canEdit && (
                  <div className="flex items-center gap-1 md:gap-2 ml-auto md:ml-2 opacity-80 md:opacity-50 hover:opacity-100 transition-opacity">
                    <button onClick={() => setShowEdit(true)} className="p-1.5 md:p-2 bg-white/10 hover:bg-white/20 rounded-lg md:rounded-xl text-white transition-colors active:scale-95" title="Edit Space">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={handleDeleteSpace} className="p-1.5 md:p-2 bg-rose-500/20 hover:bg-rose-500/30 rounded-lg md:rounded-xl text-rose-300 transition-colors active:scale-95" title="Delete Space">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </h1>
              <p className="text-sm md:text-base text-white/70 mt-1 md:mt-1.5 leading-snug line-clamp-2 md:line-clamp-none">{space.description || 'A shared space for meetings, videos, and collaboration.'}</p>
              
              {/* Native Pill Stats */}
              <div className="flex flex-wrap items-center gap-2 mt-3 md:mt-4 text-xs font-medium">
                <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 md:py-1.5 rounded-lg md:rounded-full text-white"><Calendar className="w-3.5 h-3.5 text-[#fad503]" /> {meetings.length} meetings</span>
                <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 md:py-1.5 rounded-lg md:rounded-full text-white"><Camera className="w-3.5 h-3.5 text-emerald-300" /> {videos.length} videos</span>
                <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 md:py-1.5 rounded-lg md:rounded-full text-white"><CheckCircle className="w-3.5 h-3.5 text-amber-300" /> {openTasks.length} tasks</span>
                {(isAdmin(user) || isSpacemanHere) && (
                  <button onClick={() => setShowMembers(true)} className="flex items-center gap-1.5 bg-[#00beac]/10 px-2.5 py-1 md:py-1.5 rounded-lg md:rounded-full text-[#fad503] font-bold hover:bg-[#00beac]/20 transition-colors active:scale-95">
                    <Users className="w-3.5 h-3.5" /> Manage Members
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {/* Mobile Quick Actions Row */}
          <div className="hidden items-center gap-2 mt-5">
            <button onClick={() => navigate('/chat')} className="flex-1 flex flex-col items-center justify-center gap-1.5 py-2.5 bg-white/10 rounded-2xl hover:bg-white/20 transition-colors active:scale-95">
              <MessageSquare className="w-5 h-5 text-white" />
              <span className="text-[11px] font-semibold text-white">Chat</span>
            </button>
            <button onClick={() => navigate('/record')} className="flex-1 flex flex-col items-center justify-center gap-1.5 py-2.5 bg-white/10 rounded-2xl hover:bg-white/20 transition-colors active:scale-95">
              <Camera className="w-5 h-5 text-white" />
              <span className="text-[11px] font-semibold text-white">Record</span>
            </button>
            <button onClick={handleJoinMeeting} className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-2xl transition-colors active:scale-95 ${isLive ? 'bg-rose-500 text-white animate-pulse' : 'bg-[#00beac] text-[#00beac]'}`}>
              {isLive ? <Activity className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              <span className="text-[11px] font-bold">{isLive ? 'Live' : 'Meeting'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab bar (Native Segmented Style) */}
      <div className="border-b border-white/15 bg-[#006065] text-white backdrop-blur-md sticky top-[56px] md:top-16 z-30 shadow-md">
        <div className="overflow-x-auto no-scrollbar scrollbar-hide py-2 px-4 md:px-10">
          <div className="flex gap-1.5 min-w-max">
            {TABS.filter(t => {
              if (t.id === 'automations') return user?.role === 'super_admin';
              if (['memory', 'decisions'].includes(t.id)) return isAdmin(user) || isSpacemanHere;
              return true;
            }).map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 md:py-2 text-sm font-semibold transition-all rounded-full active:scale-95 ${activeTab === tab.id ? 'bg-[#00beac] text-white font-bold shadow-md' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
                >
                  <Icon className="w-3.5 h-3.5" />{tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-7xl mx-auto px-4 md:px-10 py-6 md:py-8">

        {/* OVERVIEW (BENTO GRID REDESIGN) */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {canEdit && hasFeature(user, 'hasAdvancedAI') && (
              <>
                <RedundantWorkAlert workspaceId={space.company_id} currentSpaceId={spaceId} />
                <MeetingInsights spaceId={spaceId} />
                <AIInsightsPanel spaceId={spaceId} workspaceId={space.company_id} />
              </>
            )}
            {canEdit && hasFeature(user, 'hasEnterpriseAnalytics') && (
              <MeetingROIDashboard workspaceId={space.company_id} spaceId={spaceId} />
            )}

            {/* Premium Bento Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              
              {/* Context Capsule */}
              <div className="lg:col-span-1 xl:col-span-2 flex flex-col h-full relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-3xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                <div className="relative h-full flex flex-col rounded-3xl bg-white/95 dark:bg-[#202c33]/95 backdrop-blur-3xl border border-black/5 dark:border-white/5 shadow-sm overflow-hidden z-10 hover:shadow-md transition-shadow">
                  <div className={`h-1.5 w-full bg-gradient-to-r ${color}`}></div>
                  <div className="p-2 flex-1">
                    <ContextCapsule 
                      spaceId={spaceId} 
                      hasFullIntelligence={user?.clipad_plan === 'pro' || user?.clipad_plan === 'enterprise'} 
                    />
                  </div>
                </div>
              </div>

              {/* Blocker Radar */}
              <div className="lg:col-span-1 xl:col-span-1 flex flex-col h-full relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-br from-rose-500/10 to-orange-500/10 rounded-3xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                <div className="relative h-full flex flex-col rounded-3xl bg-white/95 dark:bg-[#202c33]/95 backdrop-blur-3xl border border-black/5 dark:border-white/5 shadow-sm overflow-hidden z-10 hover:shadow-md transition-shadow">
                  <div className="p-2 flex-1">
                    <BlockerRadar 
                      workspaceId={space.company_id} 
                      spaceId={spaceId} 
                      isWorkspaceView={true}
                      hasFullIntelligence={user?.clipad_plan === 'pro' || user?.clipad_plan === 'enterprise'} 
                    />
                  </div>
                </div>
              </div>

              {/* Commitment Tracker */}
              <div className="lg:col-span-1 xl:col-span-1 flex flex-col h-full relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-3xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                <div className="relative h-full flex flex-col rounded-3xl bg-white/95 dark:bg-[#202c33]/95 backdrop-blur-3xl border border-black/5 dark:border-white/5 shadow-sm overflow-hidden z-10 hover:shadow-md transition-shadow">
                  <div className="p-2 flex-1">
                    <CommitmentTracker spaceId={spaceId} />
                  </div>
                </div>
              </div>

              {/* Decision Ledger */}
              <div className="lg:col-span-3 xl:col-span-4 flex flex-col relative group mt-2">
                <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-3xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                <div className="relative flex flex-col rounded-3xl bg-white/95 dark:bg-[#202c33]/95 backdrop-blur-3xl border border-black/5 dark:border-white/5 shadow-sm overflow-hidden z-10 hover:shadow-md transition-shadow">
                  <div className="p-2">
                    <DecisionLedger 
                      workspaceId={space.company_id} 
                      spaceId={spaceId} 
                      hasFullIntelligence={user?.clipad_plan === 'pro' || user?.clipad_plan === 'enterprise'} 
                      teamColor={color}
                    />
                  </div>
                </div>
              </div>

            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 pt-4 md:pt-6">
              {/* Recent Videos */}
              <div className="flex flex-col h-full rounded-3xl bg-white/95 dark:bg-[#202c33]/95 backdrop-blur-3xl border border-black/5 dark:border-white/5 shadow-sm overflow-hidden p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <Camera className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-bold text-white dark:text-white">Recent Videos</h2>
                  </div>
                  <button onClick={() => setActiveTab('videos')} className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1">View all <ArrowRight className="w-4 h-4" /></button>
                </div>
                {videos.length === 0
                  ? <div className="flex-1 flex flex-col items-center justify-center p-8 rounded-2xl border border-dashed border-black/10 dark:border-white/10 text-center bg-white/5/50 dark:bg-[#006065]/50 backdrop-blur-sm min-h-[220px]">
                      <Camera className="w-8 h-8 text-white/50 dark:text-white/80 mb-3" />
                      <p className="text-white/70 dark:text-muted-foreground text-sm font-medium">No videos yet.</p>
                      <button className="mt-4 text-primary font-bold hover:text-primary/80 transition-colors text-sm" onClick={() => navigate('/record')}>Record one â†’</button>
                    </div>
                  : <div className="grid grid-cols-2 gap-3 md:gap-4">{videos.slice(0,4).map(v => <VideoCard key={v.id} video={v} onClick={() => navigate(`/watch/${v.id}`)} />)}</div>
                }
              </div>

              {/* Recent Meetings */}
              <div className="flex flex-col h-full rounded-3xl bg-white/95 dark:bg-[#202c33]/95 backdrop-blur-3xl border border-black/5 dark:border-white/5 shadow-sm overflow-hidden p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-bold text-white dark:text-white">Recent Meetings</h2>
                  </div>
                  <button onClick={() => setActiveTab('meetings')} className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1">View all <ArrowRight className="w-4 h-4" /></button>
                </div>
                <div className="flex-1 bg-white/5 dark:bg-[#006065]/50 border border-black/5 dark:border-white/5 rounded-2xl divide-y divide-black/5 dark:divide-white/5 overflow-hidden">
                  {meetings.length === 0
                    ? <div className="flex-1 flex flex-col items-center justify-center h-full min-h-[220px] text-center p-8">
                        <Calendar className="w-8 h-8 text-white/50 dark:text-white/80 mb-3" />
                        <p className="text-white/70 dark:text-muted-foreground text-sm font-medium">No meetings yet.</p>
                      </div>
                    : meetings.slice(0,5).map(m => (
                        <div key={m.id} onClick={() => navigate(`/meetings/${m.id}`)} className="px-5 py-4 hover:bg-[#006065] text-white dark:hover:bg-[#202c33] cursor-pointer transition-colors group">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-bold text-white dark:text-white group-hover:text-primary transition-colors">{m.title || 'Team Meeting'}</p>
                            {m.ai_summary && <Sparkles className="w-4 h-4 text-primary shrink-0 opacity-70 group-hover:opacity-100" />}
                          </div>
                          <p className="text-xs text-white/70 dark:text-muted-foreground mt-1 font-medium">{new Date(m.created_at).toLocaleString()}</p>
                          {m.ai_summary && <p className="text-xs text-white/80 dark:text-muted-foreground mt-2 line-clamp-2 border-l-2 border-primary/30 pl-3 italic">{m.ai_summary}</p>}
                        </div>
                      ))
                  }
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIDEOS */}
        {activeTab === 'videos' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">{videos.length} Videos</h2>
              <button onClick={() => navigate('/record')} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold shadow-lg transition-all">
                <Camera className="w-4 h-4" /> Record New
              </button>
            </div>
            {videos.length === 0 ? (
              <div className="text-center py-20">
                <Camera className="w-16 h-16 text-gray-800 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No videos in this space yet.</p>
                <button onClick={() => navigate('/record')} className="px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm transition-all">Record Async Video</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                {videos.map(v => <VideoCard key={v.id} video={v} onClick={() => navigate(`/watch/${v.id}`)} />)}
              </div>
            )}
          </div>
        )}

        {/* MEETINGS */}
        {activeTab === 'meetings' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">{meetings.length} Meetings</h2>
              <button onClick={handleJoinMeeting} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold shadow-lg transition-all">
                <Video className="w-4 h-4" /> Start Meeting
              </button>
            </div>
            {meetings.length === 0 ? (
              <div className="text-center py-20">
                <Calendar className="w-16 h-16 text-gray-800 mx-auto mb-4" />
                <p className="text-muted-foreground">No meeting records yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {meetings.map(m => (
                  <div key={m.id} onClick={() => navigate(`/meetings/${m.id}`)} className="p-5 rounded-2xl bg-card border border-border hover:border-white/12 cursor-pointer transition-all group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground">{m.title || 'Team Meeting'}</h3>
                          {m.ai_summary && <span className="px-2 py-0.5 rounded-full bg-pink-500/10 text-primary text-[10px] font-semibold flex items-center gap-1"><Sparkles className="w-2.5 h-2.5" /> AI Summary</span>}
                          {(m.is_locked || m.unlock_at) && (
                            <span className="px-2 py-0.5 rounded-full bg-white/50/10 text-white/60 text-[10px] font-semibold flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" /> Locked
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</p>
                        {m.ai_summary && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{m.ai_summary}</p>}
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-0.5" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DECISIONS */}
        {activeTab === 'decisions' && (
          <DecisionLedger 
            workspaceId={space.company_id} 
            spaceId={spaceId} 
            hasFullIntelligence={user?.clipad_plan === 'pro' || user?.clipad_plan === 'enterprise'} 
            teamColor={color}
          />
        )}

        {/* CHAT */}
        {activeTab === 'chat' && (
          <div className="h-[calc(100vh-140px)] -mt-6 md:-mt-8 -mx-4 md:-mx-10">
             <SpaceChat spaceId={spaceId} />
          </div>
        )}

        {/* ACTION BOARD */}
        {activeTab === 'tasks' && (
          <div className="h-[calc(100vh-140px)]">
             <TaskBoard spaceId={spaceId} />
          </div>
        )}

        {/* CALENDAR */}
        {activeTab === 'calendar' && (
          <div className="h-[calc(100vh-140px)]">
             <SpaceCalendar spaceId={spaceId} />
          </div>
        )}

        {/* DOCS */}
        {activeTab === 'docs' && (
          <div className="h-[calc(100vh-140px)] -mt-6 md:-mt-8 -mx-4 md:-mx-10">
            <SpaceDocs spaceId={spaceId} />
          </div>
        )}

        {/* CANVAS */}
        {activeTab === 'canvas' && (
          <div className="h-[calc(100vh-140px)] -mt-6 md:-mt-8 -mx-4 md:-mx-10 border-y md:border md:rounded-xl border-border overflow-hidden shadow-sm relative bg-[#0D1117]">
            <CanvasWhiteboard onClose={() => setActiveTab('overview')} />
          </div>
        )}

        {/* AUTOMATIONS */}
        {activeTab === 'automations' && (
          <div className="h-[calc(100vh-140px)] overflow-y-auto">
            <SpaceAutomations spaceId={spaceId} />
          </div>
        )}

        {/* STANDUP */}
        {activeTab === 'standup' && (
          <div className="h-[calc(100vh-140px)] overflow-y-auto p-4">
            <StandupPanel spaceId={spaceId} />
          </div>
        )}

        {/* TIMELINE */}
        {activeTab === 'timeline' && (
          <div className="h-[calc(100vh-140px)] overflow-y-auto p-6 max-w-4xl mx-auto">
            <OrgTimeline workspaceId={space.company_id} spaceId={spaceId} />
          </div>
        )}

        {/* MEMORY GRAPH */}
        {activeTab === 'memory' && (
          <div className="h-[calc(100vh-140px)] overflow-y-auto p-6 max-w-4xl mx-auto">
            <div className="mb-6 flex gap-2">
              <input 
                type="text" 
                placeholder="Enter a topic (e.g. 'pricing strategy')..." 
                className="flex-1 bg-[#006065] text-white dark:bg-[#006065] border border-white/15 dark:border-white/15 rounded-xl px-4 py-2 text-sm" 
                value={memoryInput}
                onChange={(e) => setMemoryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setMemoryTopic(memoryInput);
                }}
              />
              <button 
                onClick={() => setMemoryTopic(memoryInput)} 
                className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold"
              >
                Trace Memory
              </button>
            </div>
            {memoryTopic ? (
              <div id="memoryGraphContainer" data-topic={memoryTopic}>
                <MemoryTimeline workspaceId={space.company_id} topic={memoryTopic} />
              </div>
            ) : (
              <div className="p-8 flex flex-col items-center justify-center text-center bg-white/5 dark:bg-[#006065] rounded-3xl border border-white/15 dark:border-white/15">
                <Brain className="w-8 h-8 text-white/50 dark:text-white/80 mb-4" />
                <p className="text-sm font-medium text-white/70">Enter a topic above to trace its history.</p>
              </div>
            )}
          </div>
        )}

      </div>
      {showEdit && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-[#006065] text-white dark:bg-[#006065] border border-white/15 dark:border-white/15 rounded-3xl p-5 md:p-8 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white dark:text-white mb-6">Edit Space</h2>
            <form onSubmit={handleEditSpace} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/70 dark:text-muted-foreground mb-2 uppercase tracking-wider">Space Name *</label>
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5  border border-white/15 dark:border-white/15 text-white dark:text-white text-sm focus:outline-none focus:border-primary/50 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/70 dark:text-muted-foreground mb-2 uppercase tracking-wider">Description</label>
                <textarea
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-white/5  border border-white/15 dark:border-white/15 text-white dark:text-white text-sm focus:outline-none focus:border-primary/50 transition-all resize-none"
                />
              </div>
              <div onClick={() => setEditIsPrivate(!editIsPrivate)} className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-white/15 dark:border-white/15 bg-white/5/50 dark:bg-[#006065]/50 hover:bg-white/5 dark:hover:bg-slate-800 transition-colors">
                <div className={`w-10 h-6 rounded-full transition-colors relative ${editIsPrivate ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-[#006065] text-white border border-white/15 shadow transition-all ${editIsPrivate ? 'left-5' : 'left-1'}`} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white dark:text-white flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" /> Private Space
                  </div>
                  <div className="text-[11px] text-white/70">Only invited members can access.</div>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowEdit(false)} className="flex-1 py-3 rounded-xl bg-[#006065] text-white dark:bg-secondary hover:bg-white/5 dark:hover:bg-slate-700 text-white/90 dark:text-foreground font-semibold text-sm transition-all border border-white/15 dark:border-white/15 shadow-sm">Cancel</button>
                <button type="submit" disabled={savingEdit} className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm transition-all shadow-md disabled:opacity-60">
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Members Modal */}
      {showMembers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-[#006065] text-white dark:bg-[#006065] border border-white/15 dark:border-white/15 rounded-3xl p-6 max-w-lg w-full shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white dark:text-white flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Manage Members</h2>
              <button onClick={() => setShowMembers(false)} className="p-2 rounded-full hover:bg-white/10 dark:hover:bg-slate-800 text-white/70 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="relative mb-4">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
              <input 
                type="text"
                placeholder="Search users by name or email..."
                value={searchMember}
                onChange={e => setSearchMember(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5  border border-white/15 dark:border-white/15 text-sm focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-2">
              {profiles
                .filter(p => p.id !== space.created_by && ((p.full_name || '').toLowerCase().includes((searchMember || '').toLowerCase()) || (p.email || '').toLowerCase().includes((searchMember || '').toLowerCase())))
                .map(p => {
                  const memberRow = spaceMembers.find(m => m.user_id === p.id);
                  const isMem = !!memberRow;
                  const isSpacemanMember = p.role === 'spaceman';
                  return (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border border-white/15 dark:border-white/15/50 hover:bg-white/5 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <img src={p.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${p.full_name}`} alt={p.full_name} className="w-9 h-9 rounded-full bg-white/15 dark:bg-slate-700 object-cover" />
                        <div>
                          <p className="text-sm font-semibold text-white dark:text-white">{p.full_name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <p className="text-xs text-white/70">{p.email}</p>
                            {isSpacemanMember && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400 border border-teal-200 dark:border-teal-500/30">ðŸš€ Spaceman</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {p.isPending ? (
                        <button 
                          disabled
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/10 text-white/60 dark:bg-secondary dark:text-white/70 border border-white/15 dark:border-white/15 cursor-not-allowed"
                          title="User must complete signup before they can be added to spaces."
                        >
                          Pending Signup
                        </button>
                      ) : (
                        <button 
                          onClick={() => toggleMember(p.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isMem ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30' : 'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20'}`}
                        >
                          {isMem ? 'Remove' : 'Add'}
                        </button>
                      )}
                    </div>
                  );
                })}
              {profiles.filter(p => p.id !== space.created_by && ((p.full_name || '').toLowerCase().includes((searchMember || '').toLowerCase()) || (p.email || '').toLowerCase().includes((searchMember || '').toLowerCase()))).length === 0 && (
                <p className="text-center text-white/70 text-sm py-4">No users found.</p>
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/15 dark:border-white/15 flex justify-end">
              <button onClick={() => setShowMembers(false)} className="px-5 py-2.5 rounded-xl bg-[#006065] hover:bg-[#004e52] text-white font-bold text-sm transition-colors shadow-sm">Done</button>
            </div>
          </div>
        </div>
      )}

          </div>
  );
}

