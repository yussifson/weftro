import { supabase} from '@/api/supabaseClient';
import React, { useState, useEffect, useRef} from "react";
import { useTranslation} from "react-i18next";
import {Search, Plus, MessageSquare, MoreVertical, Send, Sparkles, Users, UserCircle, CheckCheck, Check, Smile, Paperclip, ImageIcon, FileText, File, X, PanelLeftClose, PanelLeftOpen, ChevronsRight, ChevronsLeft, Settings} from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button} from "@/components/ui/button";
import { useAuth} from "@/lib/AuthContext";
import { isAdmin } from "@/lib/constants";
import { cn} from "@/lib/utils";
import { generateText} from "@/lib/cloudflareAI";
import { powerSync} from "@/api/PowerSyncConnector";
import AddClipadChatDialog from "@/components/chat/AddClipadChatDialog";
import ManageGroupDialog from "@/components/chat/ManageGroupDialog";
import GroupInfoDialog from "@/components/chat/GroupInfoDialog";
import { useToast} from "@/components/ui/use-toast";
import { format} from "date-fns";
import { OrbitLoader } from "@/components/ui/orbit-loader";
import { useUIPreference } from "@/hooks/useUIPreference";
import { useNavigate, useLocation } from "react-router-dom";
import { CliPadLogo } from '@/components/ui/CliPadLogo';
import ThemeToggle from '@/components/layout/ThemeToggle';
import NotificationCenter from '@/components/clipad/notifications/NotificationCenter';
import DiscoverGroupsDialog from "@/components/chat/DiscoverGroupsDialog";
import { useChatDock } from "@/hooks/useChatDock";
import SmartDocumentViewer from "@/components/SmartDocumentViewer";

export default function ClipadChat({ isDockedMode = false }) {
 const { t} = useTranslation();
 const navigate = useNavigate();
 const location = useLocation();
 const { user, isPortalUser } = useAuth();
 const { toast} = useToast();
 
 const [activeRoomId, setActiveRoomId] = useState(null);
 const [rooms, setRooms] = useState([]);
 const [messages, setMessages] = useState([]);
 const [participantProfiles, setParticipantProfiles] = useState({});
 const [replyTo, setReplyTo] = useState(null);
 const [editingMsg, setEditingMsg] = useState(null);
 const [inputValue, setInputValue] = useState("");
 const [isAddChatOpen, setIsAddChatOpen] = useState(false);
 const [isManageMembersOpen, setIsManageMembersOpen] = useState(false);
 const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
 const [isDiscoverGroupsOpen, setIsDiscoverGroupsOpen] = useState(false);
 const [loadingRooms, setLoadingRooms] = useState(false);
 const [loadingMessages, setLoadingMessages] = useState(false);
 const [isUploading, setIsUploading] = useState(false);
 const [showEmojiPicker, setShowEmojiPicker] = useState(false);
 const [showAttachMenu, setShowAttachMenu] = useState(false);
 const [isSummarizing, setIsSummarizing] = useState(false);
 const [chatSummary, setChatSummary] = useState(null);
 const [searchQuery, setSearchQuery] = useState("");
 const [isSidebarCollapsed, setIsSidebarCollapsed] = useUIPreference(user, 'chatSidebarCollapsed', false);
 const { isChatDocked, toggleChatDock } = useChatDock();
 const [viewingDoc, setViewingDoc] = useState(null);
 const [viewingImage, setViewingImage] = useState(null);

 const messagesEndRef = useRef(null);
 const fileInputRef = useRef(null);

 useEffect(() => {
 if (messagesEndRef.current) {
 messagesEndRef.current.scrollIntoView({ behavior: "smooth"});
}
}, [messages]);

 // Load Rooms
 useEffect(() => {
 if (!user?.id) return;
 loadRooms();
 
  const channelName = `clipad-chat-rooms-${Date.now()}`;
  const roomSub = supabase.channel(channelName)
 .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_participants', filter: `user_id=eq.${user.id}`}, () => {
 loadRooms();
})
 .subscribe();
 
 return () => {
 supabase.removeChannel(roomSub);
};
}, [user?.id]);

 const loadRooms = async () => {
 setLoadingRooms(true);
 try {
 const { data: participants} = await supabase
 .from('chat_participants')
 .select('room_id')
 .eq('user_id', user.id);
 
 if (participants && participants.length > 0) {
 const roomIds = participants.map(p => p.room_id);
 const { data: roomsData} = await supabase
 .from('chat_rooms')
 .select(`*, chat_participants ( user_id, role )`)
 .in('id', roomIds)
 .order('updated_at', { ascending: false});
 
 if (roomsData) {
   const allUserIds = [...new Set(roomsData.flatMap(r => r.chat_participants?.map(p => p.user_id) || []))];
   if (allUserIds.length > 0) {
     const __res = await powerSync.execute(`SELECT id, full_name, avatar_url, email FROM profiles WHERE id IN (${allUserIds.map(()=>'?').join(',')})`, allUserIds);
     const profiles = __res.rows ? (__res.rows._array || Array.from(__res.rows)) : [];
     if (profiles) {
       setParticipantProfiles(prev => {
         const pMap = { ...prev };
         profiles.forEach(p => pMap[p.id] = p);
         return pMap;
       });
     }
   }
 }
 
 setRooms(roomsData || []);
} else {
 setRooms([]);
}
} catch (err) {
 console.error(err);
} finally {
 setLoadingRooms(false);
}
};

 // Load Messages for Active Room
 useEffect(() => {
 if (!activeRoomId) return;
 loadMessages(activeRoomId);
 
 const messageSub = supabase.channel(`chat-page-messages-${activeRoomId}`)
 .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${activeRoomId}`}, (payload) => {
 setMessages(prev => prev.find(m => m.id === payload.new.id) ? prev : [...prev, payload.new]);
 setRooms(prev => prev.map(r => r.id === activeRoomId ? { ...r, updated_at: new Date().toISOString()} : r));
})
 .subscribe();
 
 return () => {
 supabase.removeChannel(messageSub);
};
}, [activeRoomId]);

 const loadMessages = async (roomId) => {
 setLoadingMessages(true);
 try {
 const { data} = await supabase
 .from('chat_messages')
 .select('*')
 .eq('room_id', roomId)
 .order('created_at', { ascending: true});
 setMessages(data || []);

 if (data && data.length > 0) {
 const senderIds = [...new Set(data.map(m => m.sender_id).filter(Boolean))];
 if (senderIds.length > 0) {
 const __res = await powerSync.execute(`SELECT id, full_name, avatar_url FROM profiles WHERE id IN (${senderIds.map(()=>'?').join(',')})`, senderIds);
 const profiles = __res.rows ? (__res.rows._array || Array.from(__res.rows)) : [];
 if (profiles) {
 const pMap = {};
 profiles.forEach(p => pMap[p.id] = p);
 setParticipantProfiles(pMap);
}
}
}
} catch (err) {
 console.error(err);
} finally {
 setLoadingMessages(false);
}
};

  const handleSummarizeChat = async () => {
    if (messages.length === 0) return;
    setIsSummarizing(true);
    try {
      const textBlock = messages.slice(-50).map(m => {
        let content = m.content;
        if (content.startsWith('[Attachment|')) {
          const parts = content.split('|');
          content = `[Shared an attachment: ${parts[1] || 'file'}]`;
        }
        return `${participantProfiles[m.sender_id]?.full_name || 'User'}: ${content}`;
      }).join('\n');
      const prompt = `Summarize the following chat conversation into a brief, easy-to-read recap (3-4 bullet points max) of decisions made and outstanding items:\n\n${textBlock}`;
      const summary = await generateText([{ role: 'user', content: prompt }]);
      if (typeof summary !== 'string') throw new Error('AI format error');
      setChatSummary(summary);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to generate summary.', variant: 'destructive' });
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm("Are you sure you want to delete this group? This cannot be undone.")) return;
    try {
      await powerSync.execute(`DELETE FROM chat_messages WHERE room_id = ?`, [activeRoomId]);
      await powerSync.execute(`DELETE FROM chat_participants WHERE room_id = ?`, [activeRoomId]);
      await powerSync.execute(`DELETE FROM chat_rooms WHERE id = ?`, [activeRoomId]);
      setActiveRoomId(null);
      setMessages([]);
      loadRooms();
      toast({ title: "Group Deleted" });
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Could not delete group.", variant: "destructive" });
    }
  };

 const handleSend = async () => {
 if (!inputValue.trim() || !activeRoomId) return;
 const text = inputValue.trim();
 setInputValue("");
 try {
 if (editingMsg) {
 (async () => {
 const _payload = {
 content: text,
 is_edited: true
};
 const _keys = Object.keys(_payload);
 const _vals = Object.values(_payload).map(v => typeof v === 'object' && v !== null ? JSON.stringify(v) : v);
 await powerSync.execute(`UPDATE chat_messages SET ${_keys.map(k => k+' = ?').join(', ')} WHERE id = ?`, [..._vals, editingMsg.id]);
})();
 const error = null;
 if (error) throw error;
 setMessages(prev => prev.map(m => m.id === editingMsg.id ? { ...m, content: text, is_edited: true} : m));
 setEditingMsg(null);
} else {
 (async () => {
 const _payload = {
 id: crypto.randomUUID(),
 room_id: activeRoomId,
 sender_id: user.id,
 content: text,
 reply_to_id: replyTo?.id || null
};
 const _keys = Object.keys(_payload);
 const _vals = Object.values(_payload).map(v => typeof v === 'object' && v !== null ? JSON.stringify(v) : v);
 const _plhdr = _keys.map(()=>'?').join(', ');
 await powerSync.execute(`INSERT INTO chat_messages (${_keys.join(', ')}) VALUES (${_plhdr})`, _vals);
})();
 const error = null;
 if (error) throw error;
 setReplyTo(null);
}
 await (async () => {
 const _payload = { updated_at: new Date().toISOString()};
 const _keys = Object.keys(_payload);
 const _vals = Object.values(_payload).map(v => typeof v === 'object' && v !== null ? JSON.stringify(v) : v);
 await powerSync.execute(`UPDATE chat_rooms SET ${_keys.map(k => k+' = ?').join(', ')} WHERE id = ?`, [..._vals, activeRoomId]);
})();
} catch (err) {
 toast({ title: "Error", description: "Failed to send message", variant: "destructive"});
}
};

 const handleFileUpload = async (e, type = 'file') => {
 const file = e.target.files?.[0];
 if (!file || !activeRoomId) return;
 if (file.size > 50 * 1024 * 1024) {
 toast({ title: "Error", description: "File exceeds 50MB limit", variant: "destructive"});
 return;
}
 setIsUploading(true);
 try {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = `${user.id}/${fileName}`;
  const { data, error: uploadError } = await supabase.storage.from('chat_attachments').upload(filePath, file);
  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage.from('chat_attachments').getPublicUrl(filePath);
  const publicUrl = publicUrlData.publicUrl;

  let fileTypeCategory = 'file';
  if (file.type.startsWith('image/')) fileTypeCategory = 'data:image';
  if (file.type.startsWith('video/')) fileTypeCategory = 'data:video';
  if (file.type.startsWith('audio/')) fileTypeCategory = 'data:audio';

  const messageContent = `[Attachment|${file.name}|${publicUrl}|${fileTypeCategory}]`;
 
 (async () => {
 const _payload = { id: crypto.randomUUID(), room_id: activeRoomId, sender_id: user.id, content: messageContent};
 const _keys = Object.keys(_payload);
 const _vals = Object.values(_payload).map(v => typeof v === 'object' && v !== null ? JSON.stringify(v) : v);
 const _plhdr = _keys.map(()=>'?').join(', ');
 await powerSync.execute(`INSERT INTO chat_messages (${_keys.join(', ')}) VALUES (${_plhdr})`, _vals);
})();
 const error = null;
 if (error) throw error;
} catch (err) {
 toast({ title: "Error", description: "Failed to upload file", variant: "destructive"});
} finally {
 setIsUploading(false);
}
};

 const handleAiAssist = async () => {
 if (!inputValue.trim()) return;
 
 // Simple UI state change to indicate loading
 const originalInput = inputValue;
 setInputValue("AI is thinking...");
 
 try {
 const messages = [
 { role: 'system', content: 'You are an AI assistant helping a user write a better, more professional chat message. Rewrite the user\'s message to be clearer and more professional. Return ONLY the rewritten text, nothing else.'},
 { role: 'user', content: originalInput}
 ];
 
 const response = await generateText(messages);
 if (typeof response !== 'string') throw new Error('AI format error');
 setInputValue(response || originalInput);
} catch (error) {
 console.error("AI Assist failed:", error);
 toast({ title: "AI Error", description: "Could not connect to Cloudflare AI.", variant: "destructive"});
 setInputValue(originalInput);
}
};

 const activeRoom = rooms.find(r => r.id === activeRoomId);
 const filteredRooms = rooms.filter(r => {
   const otherParticipant = r.chat_participants?.find(p => p.user_id !== user.id);
   const otherProfile = otherParticipant ? participantProfiles[otherParticipant.user_id] : null;
   const roomName = r.name || otherProfile?.full_name || 'Direct Chat';
   return roomName.toLowerCase().includes(searchQuery.toLowerCase());
 });

 const firstName = user?.full_name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';

 return (
   <div style={{ fontFamily: "'Inter', sans-serif" }} className="flex flex-col h-[100dvh] bg-slate-50 dark:bg-slate-950 overflow-hidden page-enter">


     {/* Main layout below nav */}
     <div className="flex-1 flex overflow-hidden relative">
       <AddClipadChatDialog 
         open={!!isAddChatOpen} 
         mode={typeof isAddChatOpen === 'string' ? isAddChatOpen : 'chat'}
         onOpenChange={(val) => setIsAddChatOpen(val ? 'chat' : false)}
         onChatCreated={(room) => {
           setActiveRoomId(room.id);
           setIsAddChatOpen(false);
           loadRooms();
         }}
       />
       <ManageGroupDialog 
    open={isManageMembersOpen} 
    onOpenChange={setIsManageMembersOpen} 
    activeRoom={activeRoom}
    participantProfiles={participantProfiles}
  />
  <GroupInfoDialog
    open={isGroupInfoOpen}
    onOpenChange={setIsGroupInfoOpen}
    activeRoom={activeRoom}
    participantProfiles={participantProfiles}
  />
       <DiscoverGroupsDialog
         open={isDiscoverGroupsOpen}
         onOpenChange={setIsDiscoverGroupsOpen}
         onGroupJoined={(roomId) => {
           setActiveRoomId(roomId);
           setIsDiscoverGroupsOpen(false);
           loadRooms();
         }}
       />
       
       {/* Sidebar - Chat List */}
      {!isDockedMode ? (
      <div className={cn(
        "flex flex-col bg-[#006065] text-white border-r border-white/10 transition-all duration-300 z-20 shrink-0",
        isSidebarCollapsed ? "w-20" : "w-full md:w-80",
        activeRoomId ? "hidden md:flex" : "flex"
      )}>
 <div className={cn(
   "border-b border-white/10 flex items-center justify-between shrink-0",
   isSidebarCollapsed ? "p-2 flex-col gap-2" : "p-4"
 )}>
 {!isSidebarCollapsed ? (
   <div className="flex items-center justify-between w-full">
     <div className="flex items-center gap-3">
       <div className="w-10 h-10 rounded-full bg-[#00beac]/20 flex items-center justify-center overflow-hidden shrink-0 border border-[#00beac]/30">
         {user?.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover"/> : <MessageSquare className="w-5 h-5 text-[#fad503]" />}
       </div>
       <h2 className="font-bold text-lg text-white">Chats</h2>
     </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => {
          toggleChatDock();
          if (!isChatDocked && location.pathname === '/chat') navigate('/dashboard');
        }} className="hidden md:inline-flex w-9 h-9 rounded-full hover:bg-white/10 text-white" title="Dock to Right Sidebar">
          <ChevronsRight className="w-5 h-5 text-white/70 hover:text-white" />
        </Button>
       <Button variant="ghost" size="icon" onClick={() => setIsSidebarCollapsed(true)} className="w-9 h-9 rounded-full hover:bg-white/10 text-white" title="Collapse Sidebar">
         <PanelLeftClose className="w-5 h-5 text-white/80" />
       </Button>
       {!isPortalUser && (
       <DropdownMenu>
         <DropdownMenuTrigger asChild>
           <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full hover:bg-white/10 text-white">
             <MoreVertical className="w-5 h-5 text-white/80" />
           </Button>
         </DropdownMenuTrigger>
         <DropdownMenuContent align="end" className="w-48 bg-[#005055] text-white border-white/10 shadow-xl">
           <DropdownMenuItem onClick={() => setIsAddChatOpen('chat')}>New Chat</DropdownMenuItem>
           <DropdownMenuItem onClick={() => setIsAddChatOpen('group')}>New Group</DropdownMenuItem>
           <DropdownMenuSeparator />
           <DropdownMenuItem onClick={() => setIsDiscoverGroupsOpen(true)}>Discover Groups</DropdownMenuItem>
         </DropdownMenuContent>
       </DropdownMenu>
       )}
     </div>
   </div>
 ) : (
   <>
     <Button variant="ghost" size="icon" onClick={() => setIsSidebarCollapsed(false)} className="w-10 h-10 rounded-full hover:bg-white/10 text-white mx-auto" title="Expand Sidebar">
       <PanelLeftOpen className="w-5 h-5" />
     </Button>
     {!isPortalUser && (
       <DropdownMenu>
         <DropdownMenuTrigger asChild>
           <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full hover:bg-white/10 text-white mx-auto" title="New Chat">
             <Plus className="w-5 h-5" />
           </Button>
         </DropdownMenuTrigger>
         <DropdownMenuContent align="end" className="w-48 bg-[#005055] text-white border-white/10 shadow-xl">
           <DropdownMenuItem onClick={() => setIsAddChatOpen('chat')}>New Chat</DropdownMenuItem>
           <DropdownMenuItem onClick={() => setIsAddChatOpen('group')}>New Group</DropdownMenuItem>
           <DropdownMenuSeparator />
           <DropdownMenuItem onClick={() => setIsDiscoverGroupsOpen(true)}>Discover Groups</DropdownMenuItem>
         </DropdownMenuContent>
       </DropdownMenu>
     )}
   </>
 )}
 </div>
 
  {!isSidebarCollapsed && (
  <div className="p-3 bg-transparent border-b border-white/10">
 <div className="relative">
 <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
 <input 
 type="text" 
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder={t("search_chats", "Search or start new chat")} 
 className="w-full bg-[#005055] text-white border border-white/15 rounded-xl px-4 py-2 pl-9 text-sm focus:ring-1 focus:ring-[#00beac] focus:outline-none placeholder:text-white/50 transition-all"
 />
 </div>
 </div>
 )}

  <div className="flex-1 overflow-y-auto bg-transparent">
 {loadingRooms ? (
 <div className="p-3 space-y-3">
   {[1,2,3,4,5].map(i => (
     <div key={i} className="flex items-center gap-3 animate-pulse">
       <div className="w-12 h-12 rounded-full bg-white/10" />
       <div className="flex-1 space-y-2">
         <div className="h-4 w-24 bg-white/10 rounded" />
         <div className="h-3 w-32 bg-white/10 rounded" />
       </div>
     </div>
   ))}
 </div>
 ) : filteredRooms.map(room => {
   const otherParticipant = room.chat_participants?.find(p => p.user_id !== user.id);
   const otherProfile = otherParticipant ? participantProfiles[otherParticipant.user_id] : null;
   const roomName = room.name || otherProfile?.full_name || 'Direct Chat';
   const avatarUrl = otherProfile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${roomName}`;
   const isActive = activeRoomId === room.id;

   return (
 <div 
  key={room.id}
  className={cn(
  "flex items-center gap-3 px-3 py-3 transition-all duration-200 group relative",
  isActive ? "bg-[#00beac] text-[#00beac] rounded-xl font-bold shadow-md mx-2 my-1" : "hover:bg-white/10 text-white rounded-xl mx-2 my-1",
  isSidebarCollapsed && "justify-center px-1 mx-0"
  )}
 >
 <div className="flex-1 flex items-center gap-3 min-w-0 cursor-pointer" onClick={() => setActiveRoomId(room.id)}>
 <div className="relative flex-shrink-0" title={isSidebarCollapsed ? roomName : undefined}>
 {room.room_type === "group" ? (
 <div className={cn("w-12 h-12 rounded-full flex items-center justify-center overflow-hidden", isActive ? "bg-[#006065] text-[#fad503]" : "bg-white/10 text-[#fad503]")}>
 <Users className="w-6 h-6" />
 </div>
 ) : (
 <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-sm border border-white/20">
  <img src={avatarUrl} alt={roomName} className="w-full h-full object-cover"/>
</div>
 )}
 </div>
 {!isSidebarCollapsed && (
 <div className="flex-1 min-w-0 pb-1">
  <div className="flex justify-between items-baseline mb-0.5">
  <p className={cn("text-[15px] font-semibold truncate", isActive ? "text-[#00beac]" : "text-white")}>{roomName}</p>
 <p className={cn("text-xs tracking-[0.04em]", isActive ? "text-[#00beac]/80" : "text-white/60")}>{format(new Date(room.updated_at), 'h:mm a')}</p>
 </div>
 <p className={cn("text-xs truncate", isActive ? "text-[#00beac]/80" : "text-white/60")}>Click to view messages...</p>
 </div>
 )}
 </div>
 {room.room_type === "group" && !isSidebarCollapsed && (
   <DropdownMenu>
     <DropdownMenuTrigger asChild>
       <button className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity absolute right-4 top-1/2 -translate-y-1/2 bg-[#005055] text-white">
         <MoreVertical className="w-4 h-4" />
       </button>
     </DropdownMenuTrigger>
     <DropdownMenuContent align="end" className="bg-[#005055] text-white border-white/10">
       <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setActiveRoomId(room.id); setIsGroupInfoOpen(true); }}>Group Info</DropdownMenuItem>
       {room.chat_participants?.find(p => p.user_id === user.id)?.role === 'admin' && (
         <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setActiveRoomId(room.id); setIsManageMembersOpen(true); }}>Manage Group</DropdownMenuItem>
       )}
     </DropdownMenuContent>
   </DropdownMenu>
 )}
 </div>
 );
 })}
 {!loadingRooms && rooms.length === 0 && !isSidebarCollapsed && (
 <div className="flex flex-col items-center justify-center p-8 h-full text-center text-white/60">
 <p>No chats found.</p>
 { !isPortalUser && (
 <Button variant="link" className="text-[#fad503]" onClick={() => setIsAddChatOpen(true)}>Start a new chat</Button>
 )}
 </div>
 )}
 </div>
 </div>
 ) : (
    /* When docked, show compact sidebar */
    <div className={cn(
      "flex flex-col bg-[#006065] text-white border-r border-white/10 transition-all duration-300 z-20 shrink-0",
      activeRoomId ? "hidden" : "w-full"
    )}>
      <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0">
        <h2 className="font-bold text-lg text-white">Chats</h2>
        <button onClick={() => {
          toggleChatDock();
          if (!isChatDocked && location.pathname === '/chat') navigate('/dashboard');
        }} className="hidden md:block hover:text-[#fad503] transition-colors text-white/70 p-1" title="Undock Chat">
          <ChevronsLeft className="w-5 h-5" />
        </button>
      </div>
      
      <div className="p-3 border-b border-white/10 shrink-0">
        <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-[#005055] text-white border border-white/15 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#00beac] placeholder:text-white/50" />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-1 space-y-0.5">
          {filteredRooms.map((room) => {
            const otherParticipant = room.chat_participants?.find(p => p.user_id !== user.id);
            const otherProfile = otherParticipant ? participantProfiles[otherParticipant.user_id] : null;
            const roomName = room.name || otherProfile?.full_name || 'Direct Chat';
            const avatarUrl = otherProfile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${roomName}`;
            const isActive = activeRoomId === room.id;

            return (
              <div key={room.id} className={cn("flex items-center gap-2 p-2 rounded-xl transition-colors group relative", isActive ? "bg-[#00beac] text-[#00beac] font-bold" : "hover:bg-white/10 text-white")}>
                <div className="flex-1 flex items-center gap-2 min-w-0 cursor-pointer" onClick={() => setActiveRoomId(room.id)}>
                <div className="relative flex-shrink-0">
                  {room.room_type === "group" ? (
                    <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                      {room.avatar_url ? (
                        <img src={room.avatar_url} alt={roomName} className="w-full h-full object-cover" />
                      ) : (
                        <Users className="w-5 h-5 text-[#fad503]" />
                      )}
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-sm border border-white/20">
                      <img src={avatarUrl} alt={roomName} className="w-full h-full object-cover"/>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">{roomName}</h4>
                </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
 )}

 {/* Main Chat Area */}
 <div className={cn(
   "flex-1 flex flex-col bg-[#f8fafc] relative w-full h-full",
   !activeRoomId ? "hidden md:flex" : "flex"
 )}>

 {activeRoom ? (
 <>
  {/* Chat Header */}
  <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#006065] text-white sticky top-0 z-10 shadow-md">
    <div className="flex items-center gap-3">
      <button onClick={() => setActiveRoomId(null)} className="md:hidden mr-1 p-2 rounded-full hover:bg-secondary text-slate-500 hover:text-slate-900 dark:hover:text-white">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 4l1.4 1.4L7.8 11H20v2H7.8l5.6 5.6L12 20l-8-8 8-8z"></path></svg>
      </button>
      {isDockedMode && (
        <button onClick={() => setActiveRoomId(null)} className="p-1 rounded hover:bg-secondary/50 text-slate-500 hover:text-slate-900 dark:hover:text-white">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 4l1.4 1.4L7.8 11H20v2H7.8l5.6 5.6L12 20l-8-8 8-8z"></path></svg>
        </button>
      )}
      
      {(() => {
        const otherParticipant = activeRoom?.chat_participants?.find(p => p.user_id !== user.id);
        const otherProfile = otherParticipant ? participantProfiles[otherParticipant.user_id] : null;
        const roomName = activeRoom?.name || otherProfile?.full_name || 'Direct Chat';
        const avatarUrl = otherProfile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${roomName}`;
        
        return (
          <>
            {activeRoom?.room_type === "group" ? (
              <div className="w-10 h-10 rounded-full bg-white/10 dark:bg-primary/30 flex items-center justify-center overflow-hidden shrink-0">
                {activeRoom?.avatar_url ? (
                  <img src={activeRoom.avatar_url} alt={roomName} className="w-full h-full object-cover" />
                ) : (
                  <Users className="w-5 h-5 text-primary dark:text-primary/70" />
                )}
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-white/15 dark:bg-secondary flex items-center justify-center font-bold text-primary overflow-hidden shrink-0">
                {otherProfile?.avatar_url ? (
                  <img src={otherProfile.avatar_url} className="w-full h-full object-cover" alt={roomName} />
                ) : (
                  roomName.charAt(0).toUpperCase()
                )}
              </div>
            )}
            <div>
              <h3 className="font-semibold text-foreground leading-tight cursor-pointer hover:underline" onClick={() => {
                if (activeRoom?.room_type === 'group') {
                  setIsGroupInfoOpen(true);
                } else {
                  const otherParticipant = activeRoom?.chat_participants?.find(p => p.user_id !== user.id);
                  const otherProfile = otherParticipant ? participantProfiles[otherParticipant.user_id] : null;
                  const roomNameForInfo = activeRoom?.name || otherProfile?.full_name || 'Direct Chat';
                  toast({ title: 'Contact Info', description: otherProfile ? `${otherProfile.full_name} (${otherProfile.email || 'No email'})` : `Contact Info: ${roomNameForInfo}` });
                }
              }}>{roomName}</h3>
              <p className="text-[12px] text-slate-500 dark:text-slate-400">{activeRoom?.room_type === 'group' ? 'View group info' : 'View contact info'}</p>
            </div>
          </>
        );
      })()}
    </div>
    
    <div className="flex items-center gap-4 text-slate-500 hover:text-slate-900 dark:hover:text-white">
      <button onClick={() => {
        toggleChatDock();
        if (!isChatDocked && location.pathname === '/chat') navigate('/dashboard');
      }} className={cn("hover:text-primary transition-colors", isDockedMode ? "" : "hidden md:block")} title={isDockedMode ? "Undock Chat" : "Dock to Right Sidebar"}>
        {isDockedMode ? <ChevronsLeft className="w-5 h-5" /> : <ChevronsRight className="w-5 h-5" />}
      </button>
      {messages.length > 0 && (
        <Button onClick={handleSummarizeChat} disabled={isSummarizing} variant="ghost" size="sm" className="h-8 gap-2 hover:bg-primary/10 hover:text-primary">
          <Sparkles className={cn("w-4 h-4", isSummarizing && "animate-pulse")} />
          <span className={isDockedMode ? "hidden" : "hidden sm:inline"}>{isSummarizing ? "Summarizing..." : "Summarize"}</span>
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="hover:text-foreground transition-colors"><MoreVertical className="w-5 h-5" /></button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {activeRoom?.room_type === "group" ? (
            <>
              {activeRoom?.chat_participants?.find(p => p.user_id === user.id)?.role === 'admin' && (
                <>
                  <DropdownMenuItem onClick={() => setIsManageMembersOpen(true)}>Manage Group</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600 focus:bg-red-50 focus:text-red-700 dark:focus:bg-red-950/30" onClick={handleDeleteGroup}>
                    Delete Group
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={() => setIsGroupInfoOpen(true)}>Group Info</DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem onClick={() => {
                 const otherParticipant = activeRoom?.chat_participants?.find(p => p.user_id !== user.id);
                 const otherProfile = otherParticipant ? participantProfiles[otherParticipant.user_id] : null;
                 const roomNameForInfo = activeRoom?.name || otherProfile?.full_name || 'Direct Chat';
                 toast({ title: roomNameForInfo, description: otherProfile?.email ? `Email: ${otherProfile.email}` : 'No additional contact info available' });
              }}>Contact Info</DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </div>

 {/* AI Summary Banner */}
 {chatSummary && (
   <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-b border-indigo-200 dark:border-indigo-500/30 p-4 relative z-10 flex gap-3 items-start">
     <Sparkles className="w-5 h-5 text-indigo-500 mt-0.5 shrink-0" />
     <div className="flex-1 min-w-0">
       <h4 className="text-sm font-semibold text-indigo-900 dark:text-indigo-200 mb-1">Chat Summary</h4>
       <div className="text-sm text-foreground/90 whitespace-pre-wrap">{chatSummary}</div>
     </div>
     <Button variant="ghost" size="icon" onClick={() => setChatSummary(null)} className="shrink-0 h-6 w-6"><X className="w-4 h-4"/></Button>
   </div>
 )}

 {/* Chat Messages */}
 <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-2 z-10">
 <div className="text-center my-2 flex justify-center">
 <span className="text-xs text-white/70 bg-[#006065] text-white border border-white/15 px-3 py-1.5 rounded-xl  tracking-[0.04em]">
 Messages and calls are end-to-end encrypted. No one outside of this chat, not even Slate, can read or listen to them.
 </span>
 </div>

 {loadingMessages ? (
 <div className="flex flex-col gap-4 p-4">
   {[1,2,3].map(i => (
     <div key={i} className={`flex items-end gap-2 max-w-[85%] animate-pulse ${i%2===0 ? "ml-auto flex-row-reverse" : "mr-auto"}`}>
       <div className="w-7 h-7 rounded-full bg-white/15 dark:bg-slate-800 shrink-0" />
       <div className="h-10 w-48 bg-white/15 dark:bg-slate-800 rounded-2xl" />
     </div>
   ))}
 </div>
 ) : messages.map((msg, idx) => {
 const isMe = msg.sender_id === user.id;
 const showTail = idx === 0 || messages[idx-1].sender_id !== msg.sender_id;
 const profile = participantProfiles[msg.sender_id];
 const senderName = profile?.full_name || 'User';
 const avatarUrl = profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${senderName}`;
 
 return (
 <div key={msg.id} id={`msg-${msg.id}`} className={cn("flex items-end gap-2 max-w-[85%] group", isMe ? "ml-auto flex-row-reverse" : "mr-auto")}>
 {!isMe && showTail ? (
 <img src={avatarUrl} alt={senderName} className="w-7 h-7 rounded-full shrink-0 " />
 ) : (
 !isMe && <div className="w-7 shrink-0" />
 )}

 <div className={cn(
 "relative px-4 py-2.5 text-[14.5px] leading-relaxed rounded-2xl shadow-sm",
 isMe 
 ? "bg-[#006065] text-[#fad503] font-medium rounded-br-sm shadow-[0_2px_10px_rgba(0,96,101,0.2)]" 
 : "bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-bl-sm"
 )}>
 {msg.reply_to_id && (
 <div className="bg-black/10 dark:bg-white/10 border-l-4 border-current rounded-md p-2 mb-1.5 text-xs opacity-90 cursor-pointer tracking-[0.02em] hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200" onClick={() => {
 const el = document.getElementById(`msg-${msg.reply_to_id}`);
 if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center'});
}}>
 <span className="font-bold text-current opacity-90 block">{participantProfiles[messages.find(m => m.id === msg.reply_to_id)?.sender_id]?.full_name || 'User'}</span>
 <span className="truncate block max-w-[200px]">{messages.find(m => m.id === msg.reply_to_id)?.content || 'Message'}</span>
 </div>
 )}
 
 {!isMe && showTail && activeRoom?.name !== null && (
 <div className="text-[11px] font-bold text-[#fad503] mb-0.5">{senderName}</div>
 )}

 
 
  {msg.content.startsWith('[Attachment|') ? (
  <div className="pr-12 pt-1 pb-1 w-full">
  <div className="flex items-center gap-2 bg-primary/10 dark:bg-black/20 p-2 rounded-xl hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200 w-full">
  {(() => {
    const parts = msg.content.split('|');
    const fileName = parts[1];
    const fileUrl = parts[2];
    const fileType = parts[3];

    if (fileType === 'data:image') {
      return <img src={fileUrl} alt={fileName} className="max-w-[200px] rounded-md object-cover cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setViewingImage(fileUrl)} />;
    }
    if (fileType === 'data:video') {
      return <video src={fileUrl} controls className="max-w-[250px] rounded-md" />;
    }
    if (fileType === 'data:audio') {
      return <audio src={fileUrl} controls className="w-full max-w-[250px] h-10" />;
    }
    return (
      <div onClick={() => setViewingDoc({ name: fileName, file_url: fileUrl, file_type: fileName.split('.').pop() || 'pdf' })} className="flex items-center gap-2 rounded-lg p-1 transition-colors cursor-pointer w-full">
        <FileText className="w-8 h-8 text-primary shrink-0" />
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold truncate max-w-[150px] text-primary hover:underline">{fileName}</span>
          <span className="text-xs text-white/70 uppercase tracking-[0.04em]">{fileName.split('.').pop() || 'DOCUMENT'}</span>
        </div>
      </div>
    );
  })()}
  </div>
  </div>
  ) : (
 <div className="whitespace-pre-wrap pr-12">{msg.content}</div>
 )}
 
 <div className="float-right -mb-1 ml-2 text-[10px] text-white/70 flex items-center gap-2 mt-1">
 {msg.is_edited && <span className="mr-1 italic">edited</span>}
 {format(new Date(msg.created_at), 'h:mm a')}
 {isMe && (() => {
 const otherParticipants = activeRoom?.chat_participants?.filter(p => p.user_id !== user.id) || [];
 const isReadByAny = otherParticipants.some(p => p.last_read_at && new Date(p.last_read_at) >= new Date(msg.created_at));
 if (isReadByAny) return <CheckCheck className="w-3.5 h-3.5 text-primary" />;
 return <CheckCheck className="w-3.5 h-3.5 text-[#71717a] dark:text-gray-400" />;
})()}
 </div>

 {/* Message Actions Dropdown */}
 <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-0.5 bg-white/70 hover:bg-[#006065] text-white dark:bg-black/40 dark:hover:bg-black/80 rounded-full text-white/70 dark:text-foreground backdrop-blur-sm shadow-sm transition-all" title="Message Options">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36 rounded-xl">
        <DropdownMenuItem onClick={() => setReplyTo(msg)} className="gap-2 cursor-pointer"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg> Reply</DropdownMenuItem>
        <DropdownMenuItem onClick={async () => {
          const currentLikes = msg.reactions?.likes || 0;
          const _payload = { reactions: { ...msg.reactions, likes: currentLikes + 1}};
          const _keys = Object.keys(_payload);
          const _vals = Object.values(_payload).map(v => typeof v === 'object' && v !== null ? JSON.stringify(v) : v);
          await powerSync.execute(`UPDATE chat_messages SET ${_keys.map(k=>k+' = ?').join(', ')} WHERE id = ?`, [..._vals, msg.id]);
          setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, reactions: { ...m.reactions, likes: currentLikes + 1}} : m));
        }} className="gap-2 cursor-pointer"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> Like {msg.reactions?.likes > 0 && `(${msg.reactions.likes})`}</DropdownMenuItem>
        {isMe && (
          <>
            <DropdownMenuItem onClick={() => { setEditingMsg(msg); setInputValue(msg.content);}} className="gap-2 cursor-pointer"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg> Edit</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600 focus:bg-red-50 focus:text-red-700 dark:focus:bg-red-950/30 gap-2 cursor-pointer" onClick={() => {
              powerSync.execute(`DELETE FROM chat_messages WHERE id = ?`, [msg.id]).then(() => setMessages(prev => prev.filter(m => m.id !== msg.id)));
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg> Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
  </div>
  </div>
  );
})}
 <div ref={messagesEndRef} className="h-2" />
 </div>

 {(replyTo || editingMsg) && (
 <div className="px-4 py-2 bg-[#006065] text-white border-t border-white/10 backdrop-blur-md border-t border-black/5 dark:border-white/5 flex items-center justify-between z-10 text-sm">
 <div className="flex-1 min-w-0 border-l-4 border-primary pl-3">
 <p className="font-semibold text-primary">{editingMsg ? "Editing Message" : `Replying to ${participantProfiles[replyTo?.sender_id]?.full_name || 'User'}`}</p>
 <p className="text-[#71717a] dark:text-gray-400 truncate">{editingMsg ? editingMsg.content : replyTo?.content}</p>
 </div>
 <button onClick={() => { setReplyTo(null); setEditingMsg(null); setInputValue('');}} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors">
 <X className="w-4 h-4 text-[#71717a] dark:text-gray-400" />
 </button>
 </div>
 )}

 {/* Input Area */}
 <div className="px-4 pt-3 pb-[80px] md:pb-4 bg-[#006065] text-white border-t border-white/10 shadow-xl backdrop-blur-xl z-10 flex items-center gap-2 border-t border-black/5 dark:border-white/5 shadow-[0_-4px_24px_rgba(0,0,0,0.02)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.2)]">
 <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => handleFileUpload(e, 'file')} />
 <input type="file" accept="image/*" id="chat-image-upload" className="hidden" onChange={(e) => handleFileUpload(e, 'image')} />
 <input type="file" accept=".pdf,.doc,.docx,.txt" id="chat-doc-upload" className="hidden" onChange={(e) => handleFileUpload(e, 'doc')} />
 
 <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
 <PopoverTrigger asChild>
 <Button variant="ghost" size="icon" className="w-11 h-11 rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 shrink-0 transition-colors">
 <Smile className="w-6 h-6" />
 </Button>
 </PopoverTrigger>
 <PopoverContent side="top" align="start" className="w-auto p-0 border-none bg-transparent mb-2">
 <EmojiPicker onEmojiClick={(e) => setInputValue(prev => prev + e.emoji)} />
 </PopoverContent>
 </Popover>

 <Popover open={showAttachMenu} onOpenChange={setShowAttachMenu}>
 <PopoverTrigger asChild>
 <Button variant="ghost" size="icon" className="w-11 h-11 rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 shrink-0 transition-colors">
 {isUploading ? <OrbitLoader size="md" /> : <Paperclip className="w-6 h-6" />}
 </Button>
 </PopoverTrigger>
 <PopoverContent side="top" align="start" className="w-48 p-2 mb-2 rounded-2xl flex flex-col gap-2 ">
 <Button variant="ghost" className="justify-start gap-3 w-full rounded-xl hover:bg-transparent dark:bg-secondary/50 hover:text-primary" onClick={() => document.getElementById('chat-doc-upload')?.click()}>
 <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-primary"><FileText className="w-4 h-4"/></div>
 Document
 </Button>
 <Button variant="ghost" className="justify-start gap-3 w-full rounded-xl hover:bg-rose-50 hover:text-rose-600" onClick={() => document.getElementById('chat-image-upload')?.click()}>
 <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600"><ImageIcon className="w-4 h-4"/></div>
 Photos & Videos
 </Button>
 <Button variant="ghost" className="justify-start gap-3 w-full rounded-xl hover:bg-transparent dark:bg-secondary/50 hover:text-primary" onClick={() => fileInputRef.current?.click()}>
 <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-primary"><File className="w-4 h-4"/></div>
 File
 </Button>
 </PopoverContent>
 </Popover>
 
 <div className="flex-1 bg-[#005055] text-white rounded-[20px] border border-white/20 relative flex items-center border border-black/5 dark:border-white/5 hover:border-primary/30 hover:shadow-md transition-all duration-300 min-h-[44px]">
 <input
 type="text"
 value={inputValue}
 onChange={e => setInputValue(e.target.value)}
 onKeyDown={e => e.key === 'Enter' && handleSend()}
 placeholder="Type a message"
 className="w-full bg-transparent border-none px-4 py-3 text-sm focus:ring-0 focus:outline-none placeholder:text-white/50 text-white"
 />
 <button onClick={handleAiAssist} className="absolute right-2 p-1.5 text-primary hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors" title="AI Magic Rewrite">
 <Sparkles className="w-4 h-4" />
 </button>
 </div>
 
 <Button 
 onClick={handleSend}
 disabled={!inputValue.trim()}
 size="icon" 
 className="w-11 h-11 rounded-full bg-[#00beac] text-[#00beac] hover:bg-[#00beac]/90 shrink-0 shadow-lg transition-all hover:scale-105 active:scale-95"
 >
 <Send className="w-4 h-4 ml-0.5" />
 </Button>
 </div>
 </>
 ) : (
 <div className="flex-1 flex flex-col items-center justify-center text-center p-8 z-10">
 <div className="w-32 h-32 bg-background/50 rounded-full flex items-center justify-center mb-8 ">
 <MessageSquare className="w-12 h-12 text-[#71717a] dark:text-gray-400/30" />
 </div>
 <h2 className="text-3xl font-light text-white font-bold mb-4 tracking-[-0.02em]">Slate Web</h2>
 <p className="text-sm text-white/80 max-w-md leading-relaxed mb-8">
 Collaborate seamlessly with your team across any device.<br/>
 Your organizational memory is securely synchronized and always accessible.
 </p>
 <div className="flex items-center gap-2 text-[13px] text-white/80">
 <span className="w-3 h-3 bg-[#d9fdd3] rounded-md flex items-center justify-center"><Check className="w-2 h-2 text-[#005c4b]" /></span>
 End-to-end encrypted
 </div>
 </div>
 )}
 </div>
  {/* Mobile Nav */}
    </div>

    {viewingDoc && <SmartDocumentViewer doc={viewingDoc} onClose={() => setViewingDoc(null)} />}
    {viewingImage && (
      <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setViewingImage(null)}>
        <button onClick={() => setViewingImage(null)} className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors p-2 bg-black/20 rounded-full">
          <X className="w-6 h-6" />
        </button>
        <img src={viewingImage} alt="Attachment Full" className="max-w-full max-h-[90vh] object-contain select-none cursor-default" onClick={(e) => e.stopPropagation()} />
      </div>
    )}
  </div>
  );
}
