import { supabase } from '@/api/supabaseClient';
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { powerSync } from "@/api/PowerSyncConnector";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useAuth } from "@/lib/AuthContext";
import { Search, Briefcase, Lock, Globe } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { OrbitLoader } from "@/components/ui/orbit-loader";
import { cn } from "@/lib/utils";

export default function AddClipadChatDialog({ open, mode = 'chat', onOpenChange, onChatCreated }) {
  const { user } = useAuth();
  const companyId = useCompanyId();
  const [loading, setLoading] = useState(false);
  const [staff, setStaff] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupPrivacy, setGroupPrivacy] = useState("public"); // 'public' | 'private'
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (open && companyId) {
      loadUsers();
      setSelectedUsers([]);
      setGroupName("");
      setSearch("");
      setGroupPrivacy("public");
    }
  }, [open, companyId]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // For Clipad, load only team members in the same company
      const { data: allProfiles, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .eq('company_id', companyId)
        .neq('id', user.id); // Exclude self
        
      if (error) throw error;
      setStaff(allProfiles || []);
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Could not load team members.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUser = (uId) => {
    if (mode === 'chat') {
      // In chat mode, single selection
      setSelectedUsers([uId]);
    } else {
      // In group mode, multi selection
      setSelectedUsers(prev => prev.includes(uId) ? prev.filter(id => id !== uId) : [...prev, uId]);
    }
  };

  const handleCreateChat = async () => {
    if (mode === 'chat' && selectedUsers.length !== 1) {
      toast({ title: "Error", description: "Select a participant to chat with", variant: "destructive" });
      return;
    }
    if (mode === 'group') {
      if (selectedUsers.length === 0) {
        toast({ title: "Error", description: "Select at least one participant for the group", variant: "destructive" });
        return;
      }
      if (!groupName.trim()) {
        toast({ title: "Error", description: "Enter a group name", variant: "destructive" });
        return;
      }
    }

    setIsCreating(true);
    try {
      const newRoomId = crypto.randomUUID();
      const roomType = mode === 'group' ? (groupPrivacy === 'private' ? 'group_private' : 'group_public') : 'direct';
      
      const room = { 
        id: newRoomId, 
        room_type: roomType, 
        name: mode === 'group' ? groupName : null, 
        created_by: user.id, 
        company_id: companyId, 
        created_at: new Date().toISOString(), 
        updated_at: new Date().toISOString() 
      };

      // Insert Room
      const _keys = Object.keys(room);
      const _vals = Object.values(room).map(v => typeof v === 'object' && v !== null ? JSON.stringify(v) : v);
      await powerSync.execute(`INSERT INTO chat_rooms (${_keys.join(', ')}) VALUES (${_keys.map(()=>'?').join(', ')})`, _vals);

      // Add self as Admin
      const selfParticipant = {
        id: crypto.randomUUID(),
        room_id: room.id,
        user_id: user.id,
        role: 'admin'
      };
      await powerSync.execute(
        `INSERT INTO chat_participants (id, room_id, user_id, role) VALUES (?, ?, ?, ?)`, 
        [selfParticipant.id, selfParticipant.room_id, selfParticipant.user_id, selfParticipant.role]
      );

      // Add selected users as Members
      const participantInserts = selectedUsers.map(userId => ({
        id: crypto.randomUUID(),
        room_id: room.id,
        user_id: userId,
        role: "member"
      }));

      for (const p of participantInserts) {
        await powerSync.execute(
          `INSERT INTO chat_participants (id, room_id, user_id, role) VALUES (?, ?, ?, ?)`,
          [p.id, p.room_id, p.user_id, p.role]
        );
      }

      toast({ title: "Success", description: mode === 'group' ? "Group created successfully" : "Chat started" });
      onOpenChange(false);
      if (onChatCreated) onChatCreated(room);

    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const getFilteredList = () => {
    return staff.filter(item => (item.full_name || item.email || '').toLowerCase().includes(search.toLowerCase()));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'group' ? "New Group Chat" : "New Chat"}</DialogTitle>
          <DialogDescription>
            {mode === 'group' ? "Create a new group with team members." : "Start a direct message with a team member."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#71717a] dark:text-gray-400" />
            <input 
              type="text" 
              placeholder="Search team members..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border-[0.5px] border-black/9 dark:border-white/8 rounded-lg focus:ring-2 focus:ring-primary/20"
            />
          </div>
          
          <div className="h-[220px] overflow-y-auto mt-4 border-[0.5px] border-black/9 dark:border-white/8 rounded-lg p-2">
            {loading ? (
              <div className="flex items-center justify-center h-full"><OrbitLoader size="md" /></div>
            ) : (
              <div className="space-y-1">
                {getFilteredList().map(item => (
                  <div key={item.id} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-xl cursor-pointer" onClick={() => handleToggleUser(item.id)}>
                    <Checkbox checked={selectedUsers.includes(item.id)} onCheckedChange={() => handleToggleUser(item.id)} />
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                       {item.avatar_url ? (
                         <img src={item.avatar_url} alt={item.full_name} className="w-full h-full object-cover" />
                       ) : (
                         <span className="text-xs font-semibold text-primary tracking-[0.04em]">{(item.full_name || item.email || 'U')[0].toUpperCase()}</span>
                       )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-none truncate">{item.full_name}</p>
                      <p className="text-xs text-[#71717a] dark:text-gray-400 mt-1 truncate tracking-[0.04em]">{item.email}</p>
                    </div>
                  </div>
                ))}
                {getFilteredList().length === 0 && (
                  <div className="text-center text-sm text-[#71717a] dark:text-gray-400 py-8">No team members found.</div>
                )}
              </div>
            )}
          </div>

          {mode === 'group' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-2">
                <label className="text-sm font-medium">Group Name</label>
                <input 
                  type="text" 
                  placeholder="E.g., Project Alpha Team" 
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border-[0.5px] border-black/9 dark:border-white/8 rounded-lg focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Privacy Settings</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setGroupPrivacy('public')}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-sm gap-1",
                      groupPrivacy === 'public' 
                        ? "border-primary bg-primary/5 text-primary shadow-sm" 
                        : "border-border hover:bg-slate-50 dark:hover:bg-accent text-slate-500"
                    )}
                  >
                    <Globe className="w-5 h-5 mb-1" />
                    <span className="font-medium">Public</span>
                    <span className="text-[10px] text-center opacity-70 leading-tight">Anyone in company can join</span>
                  </button>
                  <button
                    onClick={() => setGroupPrivacy('private')}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-sm gap-1",
                      groupPrivacy === 'private' 
                        ? "border-primary bg-primary/5 text-primary shadow-sm" 
                        : "border-border hover:bg-slate-50 dark:hover:bg-accent text-slate-500"
                    )}
                  >
                    <Lock className="w-5 h-5 mb-1" />
                    <span className="font-medium">Private</span>
                    <span className="text-[10px] text-center opacity-70 leading-tight">Requires admin approval</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <Button 
            className="w-full" 
            disabled={selectedUsers.length === 0 || isCreating || (mode === 'group' && !groupName.trim())}
            onClick={handleCreateChat}
          >
            {isCreating ? <OrbitLoader size="sm" /> : null}
            {mode === 'group' ? "Create Group Chat" : "Start Chat"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
