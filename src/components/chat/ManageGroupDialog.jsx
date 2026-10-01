import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { powerSync } from "@/api/PowerSyncConnector";
import { base44 } from "@/api/base44Client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useAuth } from "@/lib/AuthContext";
import { Search, UserMinus, UserPlus, Shield } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/api/supabaseClient";

const PRESET_AVATARS = Array.from({ length: 15 }, (_, i) => `https://api.dicebear.com/7.x/shapes/svg?seed=Group${i+1}`);

export default function ManageGroupMembersDialog({ open, onOpenChange, activeRoom, participantProfiles }) {
  const { user } = useAuth();
  const companyId = useCompanyId();
  const [loading, setLoading] = useState(false);
  const [staff, setStaff] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const [editAvatarValue, setEditAvatarValue] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Check if current user is admin of this group
  const currentUserParticipant = activeRoom?.chat_participants?.find(p => p.user_id === user.id);
  const isAdmin = currentUserParticipant?.role === 'admin';

  useEffect(() => {
    if (open && companyId && activeRoom) {
      loadUsers();
      setSelectedUsers([]);
      setSearch("");
      setEditNameValue(activeRoom.name || "");
      setEditAvatarValue(activeRoom.avatar_url || "");
      setIsEditingName(false);
    }
  }, [open, companyId, activeRoom]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const staffData = await base44.entities.User.filter({ company_id: companyId });
      setStaff(staffData ? staffData.map(s => ({ ...s, user_id: s.id })) : []);
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Could not load firm members.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `avatars/${user.id}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('chat_attachments').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('chat_attachments').getPublicUrl(filePath);
      setEditAvatarValue(publicUrlData.publicUrl);
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to upload avatar.", variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const getRecordEmail = (record) => (record?.user_email || record?.email || "").trim().toLowerCase();

  const handleToggleUser = (uId) => {
    setSelectedUsers(prev => prev.includes(uId) ? prev.filter(id => id !== uId) : [...prev, uId]);
  };

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) return;
    setIsProcessing(true);
    try {
      const selectedRecords = staff.filter(r => selectedUsers.includes(r.id));
      const directUserIds = [...new Set(selectedRecords.map(r => r.user_id).filter(Boolean))];
      const emails = [...new Set(selectedRecords.filter(r => !r.user_id).map(getRecordEmail).filter(Boolean))];

      let profileList = [];
      if (emails.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, email")
          .eq("company_id", companyId)
          .in("email", emails);

        if (!profilesError) {
          profileList = profiles ?? [];
        } else {
          // Fallback logic
          const { data: staffMatches } = await supabase
            .from("profiles")
            .select("id as user_id, email as user_email")
            .eq("company_id", companyId)
            .in("email", emails);
          const emailSet = new Set(emails);
          profileList = (staffMatches || [])
            .filter((s) => s.user_id && emailSet.has(getRecordEmail(s)))
            .map((s) => ({ id: s.user_id }));
        }
      }

      const participantUserIds = [...new Set([...directUserIds, ...profileList.map(p => p.id)])];
      const participantInserts = participantUserIds.map((userId) => ({
        id: crypto.randomUUID(),
        room_id: activeRoom.id,
        user_id: userId,
        role: "member"
      }));

      if (participantInserts.length === 0) {
        throw new Error("No registered accounts found for the selected members. They must sign in once first.");
      }

      for (const p of participantInserts) {
        const _keys = Object.keys(p);
        const _vals = Object.values(p).map(v => typeof v === 'object' && v !== null ? JSON.stringify(v) : v);
        const _plhdr = _keys.map(() => '?').join(', ');
        await powerSync.execute(`INSERT INTO chat_participants (${_keys.join(', ')}) VALUES (${_plhdr})`, _vals);
      }

      toast({ title: "Success", description: `${participantInserts.length} members added to the group.` });
      setSelectedUsers([]);
      // The real-time subscription will update the UI automatically.
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: err.message || "Failed to add members", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!isAdmin && userId !== user.id) {
      toast({ title: "Permission Denied", description: "Only group admins can remove members.", variant: "destructive" });
      return;
    }
    try {
      await powerSync.execute(`DELETE FROM chat_participants WHERE room_id = ? AND user_id = ?`, [activeRoom.id, userId]);
      toast({ title: "Success", description: "Member removed from group." });
      if (userId === user.id) {
        onOpenChange(false);
      }
    } catch (err) {
      console.error("Failed to remove member", err);
      toast({ title: "Error", description: "Failed to remove member.", variant: "destructive" });
    }
  };

  const handleUpdateGroupName = async () => {
    if (!isAdmin) return;
    const newName = editNameValue.trim() || null;
    const newAvatar = editAvatarValue.trim() || null;
    try {
      await powerSync.execute(`UPDATE chat_rooms SET name = ?, avatar_url = ? WHERE id = ?`, [newName, newAvatar, activeRoom.id]);
      toast({ title: "Success", description: "Group details updated." });
      setIsEditingName(false);
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to update group details.", variant: "destructive" });
    }
  };

  if (!activeRoom) return null;

  // Filter out people already in the group
  const existingUserIds = new Set(activeRoom.chat_participants?.map(p => p.user_id) || []);
  
  // Also filter staff array to match search query
  const availableStaff = staff.filter(s => {
    // Determine the staff user_id or map email if possible. 
    // Wait, AddChatDialog uses staff.id (which is the firm user ID) as the checkbox key.
    // For simplicity, we just filter by email or name, and don't show if their email is already in the group.
    const isAlreadyInGroup = Array.from(existingUserIds).some(eUid => {
      const p = participantProfiles[eUid];
      return p && p.email?.toLowerCase() === getRecordEmail(s);
    });
    if (isAlreadyInGroup) return false;
    
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (s.first_name + " " + s.last_name).toLowerCase().includes(term) || getRecordEmail(s).includes(term);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-background border-primary/20">
        <DialogHeader className="p-6 pb-4 border-b border-primary/10 shrink-0">
          <DialogTitle className="text-xl font-bold tracking-tight">Manage Group</DialogTitle>
          {isEditingName && isAdmin ? (
            <div className="flex flex-col gap-2 mt-2 w-full">
              <input
                type="text"
                value={editNameValue}
                onChange={(e) => setEditNameValue(e.target.value)}
                className="w-full px-3 py-1.5 border border-border rounded-md text-sm bg-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Group Name"
              />
              <input
                type="text"
                value={editAvatarValue}
                onChange={(e) => setEditAvatarValue(e.target.value)}
                className="w-full px-3 py-1.5 border border-border rounded-md text-sm bg-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Group Avatar Image URL (optional)"
              />
              <div className="flex flex-col gap-1.5">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex justify-between items-center">
                  <span>Choose an Avatar</span>
                  <label className="cursor-pointer text-primary hover:underline flex items-center gap-1">
                    {uploadingAvatar ? "Uploading..." : "Upload from PC"}
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                  </label>
                </p>
                <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                  {PRESET_AVATARS.map((url, i) => (
                    <img 
                      key={i} 
                      src={url} 
                      alt={`Avatar ${i+1}`} 
                      className={`w-10 h-10 rounded-full cursor-pointer hover:opacity-80 transition-all border-2 ${editAvatarValue === url ? 'border-primary ring-2 ring-primary/20 scale-110' : 'border-transparent'}`}
                      onClick={() => setEditAvatarValue(url)}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 justify-end mt-2">
                <Button size="sm" variant="ghost" onClick={() => { setIsEditingName(false); setEditNameValue(activeRoom.name || ""); setEditAvatarValue(activeRoom.avatar_url || ""); }}>Cancel</Button>
                <Button size="sm" onClick={handleUpdateGroupName}>Save Details</Button>
              </div>
            </div>
          ) : (
            <div className="mt-1 flex items-center gap-2 group">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{activeRoom.name || 'Group Chat'}</span> · {activeRoom.chat_participants?.length || 0} members
              </p>
              {isAdmin && (
                <button onClick={() => setIsEditingName(true)} className="text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                </button>
              )}
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
          
          {/* Current Members Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Current Members</h3>
            <div className="space-y-2">
              {activeRoom.chat_participants?.map(p => {
                const profile = participantProfiles[p.user_id];
                const isMe = p.user_id === user.id;
                return (
                  <div key={p.user_id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-secondary overflow-hidden shrink-0">
                        {profile?.avatar_url ? (
                          <img src={profile.avatar_url} className="w-full h-full object-cover" alt={profile.full_name} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-primary/20 text-primary font-semibold text-xs">
                            {profile?.full_name?.charAt(0) || '?'}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{profile?.full_name || 'Unknown User'} {isMe && '(You)'}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {p.role === 'admin' && <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-1.5 rounded flex items-center gap-1"><Shield className="w-3 h-3" /> Admin</span>}
                          <p className="text-xs text-muted-foreground">{profile?.email}</p>
                        </div>
                      </div>
                    </div>
                    {(isAdmin || isMe) && (
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveMember(p.user_id)} className="h-8 px-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                        <UserMinus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add New Members Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Add Members</h3>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search firm members to add..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-secondary/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            
            <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {loading ? (
                <div className="p-4 text-center text-muted-foreground text-sm">Loading...</div>
              ) : availableStaff.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">No new members found.</div>
              ) : (
                availableStaff.map(s => {
                  const email = getRecordEmail(s);
                  const isSelected = selectedUsers.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected ? "border-primary bg-primary/5" : "border-transparent hover:bg-secondary/50"
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleUser(s.id)}
                        className={isSelected ? "border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" : "border-slate-300 dark:border-slate-600"}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{s.first_name} {s.last_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{email}</p>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>

        </div>

        <div className="p-6 border-t border-primary/10 bg-secondary/30 shrink-0 flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            <Button onClick={handleAddMembers} disabled={selectedUsers.length === 0 || isProcessing} className="gap-2">
              <UserPlus className="w-4 h-4" /> Add Selected
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
