import { supabase } from '@/api/supabaseClient';
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useAuth } from "@/lib/AuthContext";
import { Search, Globe, Lock, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { OrbitLoader } from "@/components/ui/orbit-loader";
import { powerSync } from "@/api/PowerSyncConnector";
import { cn } from "@/lib/utils";

export default function DiscoverGroupsDialog({ open, onOpenChange, onGroupJoined }) {
  const { user } = useAuth();
  const companyId = useCompanyId();
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [search, setSearch] = useState("");
  const [processingId, setProcessingId] = useState(null);
  const [requestsStatus, setRequestsStatus] = useState({});

  useEffect(() => {
    if (open && companyId) {
      loadGroups();
      setSearch("");
    }
  }, [open, companyId]);

  const loadGroups = async () => {
    setLoading(true);
    try {
      // Find all groups in the company
      const { data: allGroups, error } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('company_id', companyId)
        .in('room_type', ['group_public', 'group_private']);
        
      if (error) throw error;

      // Find groups the user is already in
      const { data: myParticipants, error: pError } = await supabase
        .from('chat_participants')
        .select('room_id')
        .eq('user_id', user.id);
        
      if (pError) throw pError;
      
      const myGroupIds = new Set(myParticipants.map(p => p.room_id));
      const availableGroups = (allGroups || []).filter(g => !myGroupIds.has(g.id));

      // Check pending requests in notifications table
      const { data: myRequests, error: reqError } = await supabase
        .from('notifications')
        .select('*')
        .eq('type', 'group_join_request')
        .eq('created_by', user.id);
        
      if (reqError) throw reqError;

      const reqStatus = {};
      myRequests?.forEach(req => {
        reqStatus[req.related_id] = req.status || 'pending'; // related_id = room_id
      });
      setRequestsStatus(reqStatus);

      setGroups(availableGroups);
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Could not load groups.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (group) => {
    setProcessingId(group.id);
    try {
      if (group.room_type === 'group_public') {
        // Direct join
        const newParticipant = {
          id: crypto.randomUUID(),
          room_id: group.id,
          user_id: user.id,
          role: 'member'
        };
        await powerSync.execute(
          `INSERT INTO chat_participants (id, room_id, user_id, role) VALUES (?, ?, ?, ?)`,
          [newParticipant.id, newParticipant.room_id, newParticipant.user_id, newParticipant.role]
        );
        toast({ title: "Success", description: `Joined ${group.name}` });
        if (onGroupJoined) onGroupJoined(group.id);
        onOpenChange(false);
      } else {
        // Request to join private group
        // Find admin of the group to send notification
        const { data: admins } = await supabase
          .from('chat_participants')
          .select('user_id')
          .eq('room_id', group.id)
          .eq('role', 'admin');
          
        if (admins && admins.length > 0) {
          const adminId = admins[0].user_id;
          
          // Get admin profile to get email for notification recipient
          const { data: adminProfile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', adminId)
            .single();

          if (adminProfile) {
            const notif = {
              id: crypto.randomUUID(),
              created_at: new Date().toISOString(),
              created_by: user.id,
              company_id: companyId,
              recipient_email: adminProfile.email,
              recipient_name: adminProfile.full_name,
              type: 'group_join_request',
              title: 'Group Join Request',
              message: `${user.email} requested to join ${group.name}`,
              related_id: group.id,
              is_read: 'false'
            };
            
            const _keys = Object.keys(notif);
            const _vals = Object.values(notif);
            await powerSync.execute(
              `INSERT INTO notifications (${_keys.join(', ')}) VALUES (${_keys.map(()=>'?').join(', ')})`,
              _vals
            );
            
            toast({ title: "Request Sent", description: `Requested to join ${group.name}` });
            setRequestsStatus(prev => ({ ...prev, [group.id]: 'pending' }));
          }
        } else {
          throw new Error("No admin found for this group.");
        }
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const filteredGroups = groups.filter(g => (g.name || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Discover Groups</DialogTitle>
          <DialogDescription>Find and join groups within your company.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#71717a] dark:text-gray-400" />
            <input 
              type="text" 
              placeholder="Search groups..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border-[0.5px] border-black/9 dark:border-white/8 rounded-lg focus:ring-2 focus:ring-primary/20"
            />
          </div>
          
          <div className="h-[300px] overflow-y-auto mt-4 border-[0.5px] border-black/9 dark:border-white/8 rounded-lg p-2">
            {loading ? (
              <div className="flex items-center justify-center h-full"><OrbitLoader size="md" /></div>
            ) : (
              <div className="space-y-2">
                {filteredGroups.map(group => {
                  const isPrivate = group.room_type === 'group_private';
                  const reqStatus = requestsStatus[group.id];
                  
                  return (
                    <div key={group.id} className="flex items-center space-x-3 p-3 bg-slate-50 dark:bg-secondary/50 rounded-xl border border-slate-100 dark:border-border">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", isPrivate ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600")}>
                         {isPrivate ? <Lock className="w-5 h-5"/> : <Globe className="w-5 h-5"/>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold leading-tight truncate">{group.name}</p>
                        <p className="text-xs text-[#71717a] dark:text-gray-400 mt-0.5 capitalize">{isPrivate ? 'Private Group' : 'Public Group'}</p>
                      </div>
                      
                      <Button 
                        size="sm" 
                        variant={isPrivate ? "outline" : "default"}
                        disabled={processingId === group.id || reqStatus === 'pending'}
                        onClick={() => handleJoin(group)}
                        className="rounded-lg h-8 shrink-0 min-w-[70px]"
                      >
                        {processingId === group.id ? <OrbitLoader size="sm" /> : 
                         reqStatus === 'pending' ? <Clock className="w-4 h-4 mr-1"/> : 
                         isPrivate ? "Request" : "Join"}
                        {reqStatus === 'pending' ? 'Pending' : ''}
                      </Button>
                    </div>
                  );
                })}
                {filteredGroups.length === 0 && (
                  <div className="text-center text-sm text-[#71717a] dark:text-gray-400 py-8">No groups found.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
