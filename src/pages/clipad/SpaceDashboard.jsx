import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { getLimit, hasFeature } from '@/lib/clipadPricing';
import { useAuth } from '@/lib/AuthContext';
import { isAdmin, isSpacemanInSpace } from '@/lib/constants';
import {
  Users, Video, Calendar, Play, Activity,
  Brain, FileText, CheckCircle, Search, Settings, ArrowLeft, PanelLeftClose, PanelLeft, Menu,
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
      <button onClick={handle} className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${done ? 'bg-[#006065] dark:bg-[#053639] border-[#006065] dark:border-border' : 'border-gray-600 hover:border-primary'}`}>
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
    'from-[#006065] to-[#004e52]', 
    'from-cyan-500 to-cyan-700'
  ];
  if (!id) return colors[0];
  const charCodeSum = String(id).split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return colors[charCodeSum % colors.length];
};

function VideoCard({ video, onClick }) {
  return (
    <div onClick={onClick} className="group cursor-pointer rounded-2xl overflow-hidden bg-[#006065] dark:bg-[#053639] text-white dark:bg-card border border-white/15 dark:border-white/15 hover:border-indigo-400/50 transition-all hover:-translate-y-0.5 shadow-sm hover:shadow-md">
      <div className="aspect-video bg-white/10 dark:bg-secondary relative flex items-center justify-center overflow-hidden">
        {video.thumbnail_url ? (
          <img src={video.thumbnail_url} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={video.title} />
        ) : (
          <div className={`absolute inset-0 w-full h-full bg-gradient-to-br ${getVideoColor(video.id)} group-hover:scale-105 transition-transform duration-500 opacity-90`}>
          </div>
        )}
        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white/90 dark:bg-background/90 backdrop-blur-md flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
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
      <div className="p-4 bg-[#006065] dark:bg-[#053639] text-white dark:bg-card">
        <p className="text-sm font-semibold text-white dark:text-foreground line-clamp-1">{video.title || 'Untitled'}</p>
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
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
      } catch (_) { /* db insert failed — meeting still works */ }

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
      'Ã°Å¸Å’Â¿', 'Ã°Å¸Å’Â¸', 'Ã°Å¸Â”Ã¯Â¸Â', 'Ã°Å¸ÂÂ', 'Ã°Å¸ÂÆ’', 'Ã°Å¸Å’Â²', 'Ã°Å¸Å’Â´', 'Ã°Å¸Å’Â¾', 'Ã°Å¸Å’Âµ', 'Ã°Å¸Å’Â»',
      'Ã°Å¸Å’Â¼', 'Ã°Å¸Âž', 'Ã°Å¸Å’Â³', 'Ã°Å¸Âš', 'Ã¢…', 'Ã°Å¸Å’Ë†', 'Ã°Å¸ÂªÂ´', 'Ã°Å¸Å’Å ', 'Ã¢ÂžÃ¯Â¸Â', 'Ã°Å¸ÂªÂµ',
      'Ã°Å¸Å’Âº', 'Ã°Å¸Â€', 'Ã°Å¸Å’Â·', 'Ã°Å¸Å’Â±', 'Ã°Å¸ÂÂµÃ¯Â¸Â', 'Ã°Å¸’Â', 'Ã°Å¸Å½', 'Ã°Å¸ÂªÂ´', 'Ã°Å¸Å’…', 'Ã°Å¸Å’Å’', 'Ã°Å¸Å’Â '
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
          <button onClick={() => navigate('/spaces')} className="mt-4 text-primary hover:text-primary/80 text-sm transition-colors">Ã¢Â Back to Spaces</button>
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
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="flex h-screen bg-slate-50 dark:bg-background overflow-hidden text-slate-900 dark:text-slate-100">
      {/* Privacy Modal */}
      <Dialog open={showPrivacyModal} onOpenChange={setShowPrivacyModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start Meeting</DialogTitle>
            <DialogDescription>
              Choose the privacy setting for this meeting.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between p-4 mt-2 bg-slate-50 dark:bg-card rounded-lg border border-slate-200 dark:border-border">
            <div>
              <p className="text-sm font-semibold">Meeting Privacy</p>
              <p className="text-xs text-slate-500 dark:text-muted-foreground">{privacyType === 'private' ? 'Only org members can join.' : 'External guests can knock to join.'}</p>
            </div>
            <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-md">
              <button
                onClick={() => setPrivacyType('private')}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-all ${privacyType === 'private' ? 'bg-white dark:bg-slate-700 shadow' : 'text-slate-500 dark:text-muted-foreground hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                Private
              </button>
              <button
                onClick={() => setPrivacyType('public')}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-all ${privacyType === 'public' ? 'bg-white dark:bg-slate-700 shadow' : 'text-slate-500 dark:text-muted-foreground hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                Public
              </button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPrivacyModal(false)}>Cancel</Button>
            <Button className="bg-yellow-400 hover:bg-yellow-500 text-slate-900 dark:text-foreground font-bold border-0 shadow-sm" onClick={confirmJoinMeeting}>Start Meeting</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Space Modal */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Space Settings</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSpace} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-1 block">Name</label>
              <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-white dark:bg-card border border-slate-200 dark:border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-1 block">Description</label>
              <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} className="w-full bg-white dark:bg-card border border-slate-200 dark:border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none h-20" />
            </div>
            <div className="flex items-center gap-2 mt-4">
              <input type="checkbox" id="private-space" checked={editIsPrivate} onChange={e => setEditIsPrivate(e.target.checked)} className="rounded border-slate-300 dark:border-border text-slate-900 dark:text-foreground focus:ring-slate-900" />
              <label htmlFor="private-space" className="text-sm font-medium">Private Space</label>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-border mt-4">
              <Button type="button" variant="destructive" size="sm" onClick={handleDeleteSpace} className="gap-2">
                <Trash2 className="w-4 h-4" /> Delete
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowEdit(false)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={savingEdit} className="bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm">{savingEdit ? 'Saving...' : 'Save'}</Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* SIDEBAR */}
      <aside className={`bg-white dark:bg-card border-r border-slate-200 dark:border-border flex-col hidden md:flex shrink-0 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="h-16 flex items-center px-4 border-b border-slate-200 dark:border-border gap-3 shrink-0 justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
             {sidebarOpen && (
                <button onClick={() => navigate('/spaces')} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-muted-foreground hover:text-slate-900 dark:text-muted-foreground dark:hover:text-white bg-slate-100 dark:bg-secondary hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-accent rounded-md transition-all shadow-sm">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
             )}
             <span className={`font-bold text-sm truncate transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>{space.name}</span>
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 text-slate-400 hover:text-slate-600 dark:text-muted-foreground hover:bg-slate-100 dark:hover:bg-accent rounded-md transition-colors shrink-0" title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}>
              {sidebarOpen ? <PanelLeftClose className="w-5 h-5 transition-transform duration-300" /> : <PanelLeft className="w-5 h-5 transition-transform duration-300" />}
            </button>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-hide">
          {sidebarOpen && <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3 transition-opacity">Menu</div>}
          {TABS.filter(t => {
            if (t.id === 'automations') return user?.role === 'super_admin';
            if (['memory', 'decisions'].includes(t.id)) return isAdmin(user) || isSpacemanHere;
            return true;
          }).map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                title={!sidebarOpen ? tab.label : ''}
                className={`flex items-center py-2 rounded-md transition-all ${sidebarOpen ? 'w-full gap-3 px-3 text-sm' : 'justify-center w-12 h-12 mx-auto'} ${isActive ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-foreground font-medium' : 'text-slate-600 dark:text-muted-foreground hover:bg-slate-50 dark:hover:bg-accent/50 hover:text-slate-900 dark:hover:text-slate-200'}`}
              >
                <Icon className={`shrink-0 ${sidebarOpen ? 'w-4 h-4' : 'w-5 h-5'} ${isActive ? 'text-slate-900 dark:text-foreground' : 'text-slate-400'}`} />
                {sidebarOpen && <span className="truncate">{tab.label}</span>}
              </button>
            );
          })}
        </div>
        
        {/* Sidebar Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-border space-y-2 shrink-0">
          <button onClick={() => navigate('/chat')} title={!sidebarOpen ? "Global Chat" : ""} className={`flex items-center justify-center font-medium border border-slate-200 dark:border-border rounded-md hover:bg-slate-50 dark:hover:bg-accent transition-colors ${sidebarOpen ? 'w-full gap-2 px-3 py-2 text-sm' : 'w-12 h-12 mx-auto'}`}>
            <MessageSquare className="w-4 h-4 shrink-0" /> {sidebarOpen && <span>Global Chat</span>}
          </button>
        </div>
      </aside>

      {/* MOBILE HEADER (only visible on small screens) */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white dark:bg-card border-b border-slate-200 dark:border-border flex items-center px-4 z-40 justify-between shadow-sm">
         <div className="flex items-center gap-2">
           <button onClick={() => navigate('/spaces')} className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-slate-600 dark:text-muted-foreground bg-slate-100 dark:bg-secondary rounded-md">
             <ArrowLeft className="w-3.5 h-3.5" /> Back
           </button>
           <span className="font-bold text-sm truncate ml-2">{space.name}</span>
         </div>
         <button onClick={() => setShowMembers(true)} className="p-2 text-slate-500 dark:text-muted-foreground">
           <Users className="w-5 h-5" />
         </button>
      </div>

      {/* MOBILE TABS (horizontal scroll) */}
      <div className="md:hidden fixed top-14 left-0 right-0 bg-white dark:bg-card border-b border-slate-200 dark:border-border z-30 flex overflow-x-auto px-2 py-2 hide-scrollbar">
          {TABS.filter(t => {
            if (t.id === 'automations') return user?.role === 'super_admin';
            if (['memory', 'decisions'].includes(t.id)) return isAdmin(user) || isSpacemanHere;
            return true;
          }).map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 mx-1 text-xs whitespace-nowrap rounded-full transition-all ${isActive ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-foreground font-medium' : 'text-slate-500 dark:text-muted-foreground hover:bg-slate-50 dark:hover:bg-accent'}`}
              >
                <Icon className="w-3.5 h-3.5" /> {tab.label}
              </button>
            );
          })}
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden pt-24 md:pt-0 relative">
        {/* Top Action Header */}
        <header className="hidden md:flex h-16 bg-white/80 dark:bg-card/80 backdrop-blur-md border-b border-slate-200 dark:border-border items-center justify-between px-8 shrink-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-foreground flex items-center gap-2">
              {TABS.find(t => t.id === activeTab)?.label}
              {space.is_private && <Lock className="w-4 h-4 text-slate-400 ml-2" />}
            </h1>
          </div>
          <div className="flex items-center gap-3">
             {canEdit && (
               <button onClick={() => setShowEdit(true)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-accent rounded-md transition-colors shadow-sm bg-white dark:bg-card border border-slate-200 dark:border-border" title="Settings">
                 <Settings className="w-4 h-4" />
               </button>
             )}
             <button onClick={() => setShowMembers(true)} className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 dark:border-border text-sm font-medium rounded-md hover:bg-slate-50 dark:hover:bg-accent transition-colors shadow-sm bg-white dark:bg-card">
                <Users className="w-4 h-4 text-slate-400" /> <span className="text-slate-600 dark:text-muted-foreground">{spaceMembers.length}</span>
             </button>
             <button
              onClick={handleJoinMeeting}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md font-semibold text-sm transition-all ${isLive ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse shadow-md' : 'bg-yellow-400 hover:bg-yellow-500 text-slate-900 dark:text-foreground shadow-sm border border-yellow-500/20'}`}
             >
              {isLive ? <Activity className="w-4 h-4" /> : <Video className="w-4 h-4" />}
              {isLive ? 'Join Live' : 'Start Meeting'}
             </button>
          </div>
        </header>

        {/* Dynamic Tab Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
          
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Blocker Radar */}
                  <div className="col-span-1 h-full">
                    <BlockerRadar workspaceId={space.company_id} spaceId={spaceId} isWorkspaceView={true} hasFullIntelligence={user?.clipad_plan === 'pro' || user?.clipad_plan === 'enterprise'} />
                  </div>
                  
                  {/* Commitment Tracker */}
                  <div className="col-span-1 h-full">
                     <CommitmentTracker spaceId={spaceId} />
                  </div>

                  {/* Redundant Work / Extra Widget */}
                  <div className="col-span-1 h-full">
                     <RedundantWorkAlert workspaceId={space.company_id} spaceId={spaceId} />
                  </div>
                  
                  {/* Decision Ledger */}
                  <div className="col-span-1 md:col-span-2 lg:col-span-3 h-full">
                    <DecisionLedger workspaceId={space.company_id} spaceId={spaceId} hasFullIntelligence={user?.clipad_plan === 'pro' || user?.clipad_plan === 'enterprise'} teamColor={color} />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
                  {/* Recent Videos */}
                  <div className="bg-white dark:bg-card rounded-xl border border-slate-200 dark:border-border shadow-sm p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-base font-bold text-slate-900 dark:text-foreground flex items-center gap-2">
                        <Camera className="w-4 h-4 text-indigo-500" /> Recent Videos
                      </h3>
                      <button onClick={() => setActiveTab('videos')} className="text-xs font-semibold text-slate-500 dark:text-muted-foreground hover:text-slate-700 dark:text-foreground bg-slate-100 dark:bg-secondary hover:bg-slate-200 dark:bg-accent px-3 py-1.5 rounded-md transition-colors">View all</button>
                    </div>
                    {videos.length === 0 ? (
                      <div className="py-10 text-center border border-dashed border-slate-200 dark:border-border rounded-lg bg-slate-50 dark:bg-card/50">
                        <p className="text-sm text-slate-500 dark:text-muted-foreground font-medium">No videos yet.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">{videos.slice(0,4).map(v => <VideoCard key={v.id} video={v} onClick={() => navigate(`/watch/${v.id}`)} />)}</div>
                    )}
                  </div>

                  {/* Recent Meetings */}
                  <div className="bg-white dark:bg-card rounded-xl border border-slate-200 dark:border-border shadow-sm p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-base font-bold text-slate-900 dark:text-foreground flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#006065]" /> Recent Meetings
                      </h3>
                      <button onClick={() => setActiveTab('meetings')} className="text-xs font-semibold text-slate-500 dark:text-muted-foreground hover:text-slate-700 dark:text-foreground bg-slate-100 dark:bg-secondary hover:bg-slate-200 dark:bg-accent px-3 py-1.5 rounded-md transition-colors">View all</button>
                    </div>
                    {meetings.length === 0 ? (
                      <div className="py-10 text-center border border-dashed border-slate-200 dark:border-border rounded-lg bg-slate-50 dark:bg-card/50">
                        <p className="text-sm text-slate-500 dark:text-muted-foreground font-medium">No meetings yet.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-border rounded-lg overflow-hidden">
                        {meetings.slice(0,5).map(m => (
                          <div key={m.id} onClick={() => navigate(`/meetings/${m.id}`)} className="px-5 py-4 hover:bg-slate-50 dark:hover:bg-accent cursor-pointer transition-colors">
                            <p className="text-sm font-semibold text-slate-900 dark:text-foreground">{m.title || 'Team Meeting'}</p>
                            <p className="text-xs text-slate-500 dark:text-muted-foreground mt-1">{new Date(m.created_at).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* OTHER TABS */}
            {activeTab === 'videos' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {videos.length === 0 ? <p className="text-slate-500 dark:text-muted-foreground text-sm">No videos found.</p> : videos.map(v => <VideoCard key={v.id} video={v} onClick={() => navigate(`/watch/${v.id}`)} />)}
              </div>
            )}
            
            {activeTab === 'meetings' && (
              <div className="space-y-4">
                {meetings.length === 0 ? <p className="text-slate-500 dark:text-muted-foreground text-sm">No meetings found.</p> : meetings.map(m => (
                   <div key={m.id} onClick={() => navigate(`/meetings/${m.id}`)} className="bg-white dark:bg-card border border-slate-200 dark:border-border p-5 rounded-xl hover:shadow-sm cursor-pointer flex justify-between items-center transition-all hover:border-slate-300 dark:border-border">
                     <div>
                       <h3 className="font-semibold text-slate-900 dark:text-foreground">{m.title || 'Team Meeting'}</h3>
                       <p className="text-xs text-slate-500 dark:text-muted-foreground mt-1">{new Date(m.created_at).toLocaleString()}</p>
                       {m.ai_summary && <p className="text-sm text-slate-600 dark:text-muted-foreground mt-2 line-clamp-1">{m.ai_summary}</p>}
                     </div>
                     <ArrowRight className="w-5 h-5 text-slate-300" />
                   </div>
                ))}
              </div>
            )}

            {activeTab === 'tasks' && (
              <TaskBoard spaceId={spaceId} user={user} spaceMembers={spaceMembers} />
            )}

            {activeTab === 'decisions' && (
              <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-xl p-6 shadow-sm">
                <DecisionLedger workspaceId={space.company_id} spaceId={spaceId} hasFullIntelligence={user?.clipad_plan === 'pro' || user?.clipad_plan === 'enterprise'} teamColor={color} />
              </div>
            )}

            {activeTab === 'docs' && (
              <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-xl shadow-sm overflow-hidden h-[75vh]">
                <SpaceDocs spaceId={spaceId} user={user} />
              </div>
            )}

            

            {activeTab === 'standup' && (
              <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-xl shadow-sm overflow-hidden">
                <StandupPanel spaceId={spaceId} workspaceId={space.company_id} />
              </div>
            )}

            {activeTab === 'automations' && (
              <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-xl shadow-sm p-6">
                <SpaceAutomations spaceId={spaceId} />
              </div>
            )}

            {activeTab === 'calendar' && (
              <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-xl shadow-sm p-6 overflow-hidden min-h-[75vh]">
                <SpaceCalendar spaceId={spaceId} />
              </div>
            )}

            {activeTab === 'canvas' && (
              <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-xl shadow-sm overflow-hidden h-[75vh]">
                <CanvasWhiteboard spaceId={spaceId} />
              </div>
            )}

            {activeTab === 'memory' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-xl p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-foreground mb-4">Organizational Memory</h2>
                  <MemoryTimeline spaceId={spaceId} workspaceId={space.company_id} />
                </div>
                <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-xl shadow-sm overflow-hidden min-h-[500px]">
                  <ContextCapsule spaceId={spaceId} />
                </div>
              </div>
            )}

            {activeTab === 'timeline' && (
               <OrgTimeline spaceId={spaceId} workspaceId={space.company_id} />
            )}

          </div>
        </main>
      </div>

      {/* Members Modal (Right Drawer) */}
      {showMembers && createPortal(
        <div className="fixed inset-0 z-[100] flex justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/30 dark:bg-background/60 backdrop-blur-sm transition-opacity" onClick={() => setShowMembers(false)} />
          
          {/* Drawer Panel */}
          <div className="relative w-full max-w-[400px] h-full bg-white dark:bg-card border-l border-slate-200 dark:border-border shadow-2xl flex flex-col transform transition-transform animate-in slide-in-from-right duration-300">
            
            {/* Header */}
            <div className="px-6 py-5 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-background/50 dark:bg-card/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-foreground leading-none mb-1">
                    {isAdmin(user) ? 'Manage Access' : 'Space Members'}
                  </h2>
                  <p className="text-xs font-semibold text-slate-500 dark:text-muted-foreground uppercase tracking-wider">{spaceMembers.length} Members</p>
                </div>
              </div>
              <button onClick={() => setShowMembers(false)} className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-accent rounded-full transition-colors">
                <X className="w-4 h-4 text-slate-600 dark:text-muted-foreground" />
              </button>
            </div>
            
            {/* Search Bar */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-border shrink-0 bg-white dark:bg-card">
              <div className="relative group">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Search directory..."
                  value={searchMember}
                  onChange={e => setSearchMember(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-border text-slate-900 dark:text-foreground rounded-lg pl-10 pr-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
              <div className="pb-16 pt-2">
              {profiles
                .filter(p => {
                  const isOwner = p.id === space?.created_by;
                  const isMem = spaceMembers.some(m => m.user_id === p.id);
                  const matchesSearch = !searchMember || 
                    (p.full_name || '').toLowerCase().includes(searchMember.toLowerCase()) || 
                    (p.email || '').toLowerCase().includes(searchMember.toLowerCase());
                  
                  if (!matchesSearch) return false;

                  // For non-admins, ONLY show users who are owner or members of THIS space
                  if (!isAdmin(user) && !isMem && !isOwner) {
                    return false;
                  }

                  return true;
                })
                .map(p => {
                  const memberRow = spaceMembers.find(m => m.user_id === p.id);
                  const isMem = !!memberRow;
                  const isOwner = p.id === space?.created_by;
                  const isSpacemanMember = p.role === 'spaceman';

                  return (
                    <div key={p.id} className="group flex items-center justify-between p-3 mx-2 mb-1 rounded-xl hover:bg-slate-50 dark:hover:bg-accent/50 transition-colors">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <img src={p.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${p.full_name}`} alt={p.full_name} className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 object-cover ring-2 ring-white dark:ring-slate-900 shadow-sm shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-foreground truncate flex items-center gap-2">
                            {p.full_name}
                            {isSpacemanMember && <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-[#006065] dark:bg-[#053639]" title="Spaceman" />}
                          </p>
                          <p className="text-xs font-medium text-slate-500 dark:text-muted-foreground truncate">{p.email}</p>
                        </div>
                      </div>
                      <div className="shrink-0 ml-3">
                      {isOwner ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-full">Owner</span>
                      ) : (isAdmin(user) && canEdit) ? (
                        <button
                          onClick={() => toggleMember(p.id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${isMem ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-border text-slate-600 dark:text-muted-foreground hover:text-rose-600 hover:border-rose-200 dark:hover:border-rose-900/50 dark:hover:text-rose-400' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm border border-transparent'}`}
                        >
                          {isMem ? 'Remove' : 'Add'}
                        </button>
                      ) : (
                        isMem && <span className="text-[10px] font-bold uppercase tracking-wider text-[#006065] dark:text-[#00beac] bg-[#006065] dark:bg-card px-2.5 py-1 rounded-full">Member</span>
                      )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}



