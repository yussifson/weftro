import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Video, MessageSquare, Calendar, BrainCircuit, Users, ShieldCheck } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { LocalNotifications } from '@capacitor/local-notifications';

export default function NotificationCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      
      // Setup realtime subscription with a unique channel name to prevent StrictMode reuse errors
      const channel = supabase
        .channel(`public:clipad_notifications_${user.id}_${Date.now()}`)
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'clipad_notifications',
            filter: `user_id=eq.${user.id}`
          }, 
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const notif = payload.new;
              if (['plan_upgrade', 'system'].includes(notif.type) && !['company_admin', 'super_admin', 'admin'].includes(user?.role)) {
                return; // Ignore system level notifications for normal members
              }

              setNotifications(prev => [notif, ...prev]);
              setUnreadCount(prev => prev + 1);
              
              // Play native-feeling notification sound and trigger OS notification
              try {
                // Trigger native OS notification
                LocalNotifications.schedule({
                  notifications: [
                    {
                      title: payload.new.title || 'New Notification',
                      body: payload.new.message || '',
                      id: new Date().getTime(),
                      schedule: { at: new Date(Date.now() + 100) },
                      sound: null, // Default OS notification sound
                      actionTypeId: '',
                      extra: null
                    }
                  ]
                });
                
                // Fallback / Web Audio
                const audio = new Audio('https://cdn.freesound.org/previews/415/415065_7811904-lq.mp3');
                audio.volume = 0.5;
                audio.play().catch(e => console.log('Audio playback blocked by browser:', e));
              } catch (e) {
                console.error('Local Notification Error:', e);
              }

              toast({
                title: payload.new.title,
                description: payload.new.message,
              });
            } else if (payload.eventType === 'UPDATE') {
              setNotifications(prev => prev.map(n => n.id === payload.new.id ? payload.new : n));
            }
          }
        )
        .subscribe();
        
      return () => {
        supabase.removeChannel(channel);
      }
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('clipad_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      if (data) {
        let filteredData = data;
        if (!['company_admin', 'super_admin', 'admin'].includes(user?.role)) {
          filteredData = data.filter(n => !['plan_upgrade', 'system'].includes(n.type));
        }
        setNotifications(filteredData);
        setUnreadCount(filteredData.filter(n => !n.is_read).length);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const markAsRead = async (id) => {
    try {
      const { error } = await supabase
        .from('clipad_notifications')
        .update({ is_read: true })
        .eq('id', id);
        
      if (error) throw error;
      
      // Update local state to reflect change immediately
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      const { error } = await supabase
        .from('clipad_notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
        
      if (error) throw error;
      
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger className="flex items-center justify-center w-[38px] h-[38px] rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-all relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20">
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-900">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" sideOffset={8} className="w-[calc(100vw-24px)] sm:w-80 max-w-[340px] p-0 bg-white/95 dark:bg-card/95 backdrop-blur-2xl text-foreground shadow-[0_8px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)] border border-slate-200 dark:border-border/60 dark:border-white/10 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100 dark:border-border">
          <DropdownMenuLabel className="p-0 font-bold text-sm">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <button 
              onClick={(e) => {
                e.preventDefault();
                markAllAsRead();
              }}
              className="text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
            >
              <Check className="w-3 h-3" /> Mark all read
            </button>
          )}
        </div>
        
        <div className="max-h-[55vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <Bell className="w-8 h-8 text-slate-300 dark:text-slate-600 dark:text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-slate-500 dark:text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 dark:text-muted-foreground mt-1">We'll let you know when something happens</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notification) => (
                <DropdownMenuItem 
                  key={notification.id}
                  className={cn(
                    "flex flex-col items-start px-3 py-2.5 cursor-pointer border-b border-slate-50 dark:border-border/50 last:border-0 rounded-none focus:bg-slate-50 dark:focus:bg-slate-800/50 transition-colors",
                    !notification.is_read ? "bg-primary/5 dark:bg-primary/10" : ""
                  )}
                  onClick={(e) => {
                    e.preventDefault();
                    if (!notification.is_read) {
                      markAsRead(notification.id);
                    }
                    if (notification.link) {
                      setIsOpen(false);
                      if (notification.link.startsWith('http')) {
                        window.location.href = notification.link;
                      } else {
                        navigate(notification.link);
                      }
                    }
                  }}
                >
                  <div className="flex items-start gap-2 w-full">
                    {!notification.is_read && (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                    )}
                    <div className={cn("flex flex-col gap-0.5 w-full min-w-0", notification.is_read && "pl-3.5")}>
                      <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
                        {notification.title || 'Notification'}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-muted-foreground line-clamp-2 leading-relaxed">
                        {notification.message}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 dark:text-muted-foreground font-medium mt-0.5">
                        {new Date(notification.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
