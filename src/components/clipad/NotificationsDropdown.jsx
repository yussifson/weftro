import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Bell, Trash2, Check, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { powerSync } from "@/api/PowerSyncConnector";
import { toast } from "@/components/ui/use-toast";
import { Button } from '@/components/ui/button';

export default function NotificationsDropdown() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.email) return;
    
    fetchNotifications();

    const sub = supabase.channel('notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `recipient_email=eq.${user.email}` }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_email', user.email)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      const formattedData = data?.map(n => ({
        ...n,
        is_read: n.is_read === true || n.is_read === 'true'
      })) || [];
      
      setNotifications(formattedData);
      setUnreadCount(formattedData.filter(n => !n.is_read).length);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      await supabase
        .from('notifications')
        .update({ is_read: 'true' })
        .eq('recipient_email', user.email)
        .eq('is_read', 'false');
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: 'true' })
        .eq('id', id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const deleteNotification = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await supabase.from('notifications').delete().eq('id', id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleGroupRequest = async (notification, action, e) => {
    e.stopPropagation();
    try {
      if (action === 'accept') {
        const newParticipant = {
          id: crypto.randomUUID(),
          room_id: notification.related_id,
          user_id: notification.created_by,
          role: 'member'
        };
        await powerSync.execute(
          `INSERT INTO chat_participants (id, room_id, user_id, role) VALUES (?, ?, ?, ?)`,
          [newParticipant.id, newParticipant.room_id, newParticipant.user_id, newParticipant.role]
        );
        toast({ title: "Success", description: "User added to the group." });
        
        // Notify the user they were accepted
        const { data: requesterProfile } = await supabase.from('profiles').select('email, full_name').eq('id', notification.created_by).single();
        if (requesterProfile) {
          const accNotif = {
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
            created_by: user.id,
            company_id: notification.company_id,
            recipient_email: requesterProfile.email,
            recipient_name: requesterProfile.full_name,
            type: 'system',
            title: 'Group Join Request Accepted',
            message: `Your request to join the group has been approved.`,
            related_id: notification.related_id,
            is_read: 'false'
          };
          const _keys = Object.keys(accNotif);
          const _vals = Object.values(accNotif);
          await powerSync.execute(`INSERT INTO notifications (${_keys.join(', ')}) VALUES (${_keys.map(()=>'?').join(', ')})`, _vals);
        }
      } else {
        toast({ title: "Request Rejected", description: "User was not added to the group." });
      }

      // Delete original request
      await deleteNotification(notification.id);
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Popover onOpenChange={(open) => { if (open) markAllAsRead(); }}>
      <PopoverTrigger asChild>
        <button className="relative w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 dark:text-muted-foreground hover:text-slate-900 dark:text-muted-foreground dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-accent transition-colors">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse border-2 border-white dark:border-slate-900 shadow-sm" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 shadow-2xl rounded-2xl border-slate-200 dark:border-border z-[100]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-border/50">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <span className="text-xs text-primary font-medium">{unreadCount} unread</span>
          )}
        </div>
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center px-4">
              <Bell className="w-8 h-8 text-slate-300 dark:text-slate-700 dark:text-foreground mb-2" />
              <p className="text-sm font-medium text-slate-500 dark:text-muted-foreground">All caught up!</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 dark:text-muted-foreground mt-1">No new notifications.</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800/50">
              {notifications.map(notification => (
                <div 
                  key={notification.id} 
                  onClick={() => markAsRead(notification.id)}
                  className={`relative p-4 flex gap-3 hover:bg-slate-50 dark:hover:bg-accent/50 transition-colors cursor-pointer group ${!notification.is_read ? 'bg-primary/5' : ''}`}
                >
                  <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${!notification.is_read ? 'bg-primary' : 'bg-transparent'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight mb-1">{notification.title}</p>
                    <p className="text-xs text-slate-500 dark:text-muted-foreground line-clamp-2">{notification.message}</p>
                    
                    {notification.type === 'group_join_request' && (
                      <div className="flex items-center gap-2 mt-3">
                        <Button 
                          size="sm" 
                          onClick={(e) => handleGroupRequest(notification, 'accept', e)} 
                          className="h-7 text-[10px] px-2.5 rounded bg-[#006065] dark:bg-[#053639] hover:bg-[#004e52] text-white"
                        >
                          <Check className="w-3 h-3 mr-1"/> Accept
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={(e) => handleGroupRequest(notification, 'reject', e)} 
                          className="h-7 text-[10px] px-2.5 rounded text-slate-500 dark:text-muted-foreground"
                        >
                          <X className="w-3 h-3 mr-1"/> Reject
                        </Button>
                      </div>
                    )}

                    <p className="text-[10px] text-slate-400 dark:text-slate-500 dark:text-muted-foreground mt-2 font-medium uppercase tracking-wider">
                      {notification.created_at ? formatDistanceToNow(new Date(notification.created_at), { addSuffix: true }) : 'Just now'}
                    </p>
                  </div>
                  {notification.type !== 'group_join_request' && (
                    <button 
                      onClick={(e) => deleteNotification(notification.id, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-accent text-slate-400 hover:text-rose-500 shrink-0 self-start"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

