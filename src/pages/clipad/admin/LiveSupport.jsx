import React, { useEffect, useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, PhoneCall, CheckCircle2, Clock, Mail, ChevronDown, Headset } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import AdminChatDialog from '@/components/admin/AdminChatDialog';

export default function LiveSupport() {
  const [requests, setRequests] = useState([]);
  const [supportChats, setSupportChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [activeChatUser, setActiveChatUser] = useState(null);
  const { toast } = useToast();

  const fetchRequests = async () => {
    setLoading(true);
    const { data: marketingData, error: mError } = await supabase
      .from('clipad_marketing_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (mError) {
      console.error(mError);
    } else {
      setRequests(marketingData || []);
    }

    const { data: chatsData, error: cError } = await supabase
      .from('support_chats')
      .select('*, profiles:user_id(full_name, email)')
      .in('status', ['escalated', 'admin_joined'])
      .order('updated_at', { ascending: false });
    
    if (cError) {
      console.warn("Could not load support chats", cError);
    } else {
      setSupportChats(chatsData || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();

    // Subscribe to new incoming requests in real-time
    const channel = supabase.channel('clipad_marketing_requests_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clipad_marketing_requests' }, () => {
        fetchRequests();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_chats' }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateStatus = async (id, newStatus) => {
    const { error } = await supabase
      .from('clipad_marketing_requests')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Status updated', description: `Request marked as ${newStatus}` });
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    }
  };

  const resolveSupportChat = async (id) => {
    await supabase.from('support_chats').update({ status: 'resolved' }).eq('id', id);
    fetchRequests();
  };

  const filteredRequests = requests.filter(r => r.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Live Support & Calls</h1>
          <p className="text-muted-foreground mt-1">Monitor active chats and requested calls from the marketing page.</p>
        </div>
        
        <div className="flex bg-[#006065] dark:bg-[#053639] text-white border border-white/15/10 dark:bg-secondary p-1 rounded-xl w-full sm:w-auto overflow-x-auto shrink-0">
          {['pending', 'contacted', 'resolved'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap flex-1 sm:flex-none ${
                filter === f 
                  ? 'bg-[#006065] dark:bg-[#053639] text-white dark:bg-card text-white dark:text-foreground shadow-sm' 
                  : 'text-white/70 dark:text-muted-foreground hover:text-white/90 dark:hover:text-slate-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f === 'pending' && requests.filter(r => r.status === 'pending').length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center bg-red-500 text-white text-[10px] w-5 h-5 rounded-full">
                  {requests.filter(r => r.status === 'pending').length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        {supportChats.length > 0 && filter === 'pending' && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Headset className="w-5 h-5" /> Active Live Support Escalations
            </h2>
            <div className="grid gap-4">
              {supportChats.map(chat => (
                <div key={chat.id} className="bg-indigo-50/50 dark:bg-indigo-900/10 border-[0.5px] border-indigo-200 dark:border-indigo-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col md:flex-row gap-6 md:items-start justify-between">
                    <div className="flex gap-4 items-start">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg text-white dark:text-foreground">
                            User Escalation
                          </h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                            chat.status === 'admin_joined' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700 animate-pulse'
                          }`}>
                            {chat.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm mt-3">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground w-16">User:</span>
                            <span className="font-medium">{chat.profiles?.full_name || 'Anonymous User'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground w-16">Email:</span>
                            <span className="font-medium text-white/90 dark:text-foreground">{chat.profiles?.email || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex md:flex-col gap-2 shrink-0 border-t md:border-t-0 md:border-l border-indigo-100 dark:border-indigo-800/50 pt-4 md:pt-0 md:pl-6">
                      <button 
                        onClick={() => setActiveChatUser({ id: chat.user_id, full_name: chat.profiles?.full_name, email: chat.profiles?.email })}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-indigo-200 dark:shadow-none hover:-translate-y-0.5"
                      >
                        <Headset className="w-4 h-4" /> Join Chat
                      </button>
                      <button 
                        onClick={() => resolveSupportChat(chat.id)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-[#006065] dark:bg-[#053639] text-white dark:bg-secondary border border-white/15 dark:border-white/15 hover:bg-transparent dark:hover:bg-accent text-white/90 dark:text-foreground rounded-xl text-sm font-semibold transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Mark Resolved
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <h2 className="text-xl font-bold mb-2">Marketing Lead Requests</h2>
        {loading ? (
          <div className="p-12 text-center text-white/70 font-medium">Loading requests...</div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center bg-[#006065] dark:bg-[#053639] text-white dark:bg-card border-[0.5px] border-white/15 dark:border-white/15 rounded-2xl">
            <div className="w-16 h-16 bg-transparent dark:bg-secondary rounded-2xl flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-white/60" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No requests found</h3>
            <p className="text-muted-foreground text-sm max-w-sm">There are no {filter} requests at the moment.</p>
          </div>
        ) : (
          filteredRequests.map(req => (
            <div key={req.id} className="bg-[#006065] dark:bg-[#053639] text-white dark:bg-card border-[0.5px] border-white/15 dark:border-white/15 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row gap-6 md:items-start justify-between">
                
                <div className="flex gap-4 items-start">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    req.type === 'call' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' : 'bg-[#006065] dark:bg-[#053639]/10 text-[#006065] dark:bg-card dark:text-[#00beac]'
                  }`}>
                    {req.type === 'call' ? <PhoneCall className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">
                        {req.type === 'call' ? 'Requested Call' : 'Lead Contact'}
                      </h3>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    
                    {req.type === 'call' ? (
                      <div className="space-y-1 text-sm mt-3">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground w-16">Name:</span>
                          <span className="font-medium">{req.name || 'Anonymous User'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground w-16">Phone:</span>
                          <span className="font-medium text-blue-600 dark:text-blue-400">{req.phone || 'N/A'}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 bg-transparent dark:bg-secondary/50 p-4 rounded-xl text-sm italic text-white/90 dark:text-foreground border border-white/10 dark:border-white/15 relative">
                        <div className="absolute top-0 left-4 -mt-2 w-3 h-3 bg-transparent dark:bg-secondary border-t border-l border-white/10 dark:border-white/15 rotate-45" />
                        "{req.message}"
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex md:flex-col gap-2 shrink-0 border-t md:border-t-0 md:border-l border-white/10 dark:border-white/15 pt-4 md:pt-0 md:pl-6">
                  {req.status === 'pending' && (
                    <>
                      <button onClick={() => updateStatus(req.id, 'contacted')} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors">
                        <Mail className="w-4 h-4" /> Mark Contacted
                      </button>
                      <button onClick={() => updateStatus(req.id, 'resolved')} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-[#006065] dark:bg-[#053639] text-white border border-white/15/10 dark:bg-secondary hover:bg-[#006065] dark:bg-[#053639]/10 dark:hover:bg-[#004e52]/20 text-white/90 dark:text-foreground hover:text-[#006065] dark:hover:text-[#00beac] rounded-xl text-sm font-semibold transition-colors">
                        <CheckCircle2 className="w-4 h-4" /> Resolve
                      </button>
                    </>
                  )}
                  {req.status === 'contacted' && (
                    <button onClick={() => updateStatus(req.id, 'resolved')} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#006065] dark:bg-[#053639] hover:bg-[#004e52] text-white rounded-xl text-sm font-semibold transition-colors">
                      <CheckCircle2 className="w-4 h-4" /> Mark Resolved
                    </button>
                  )}
                  {req.status === 'resolved' && (
                    <div className="flex items-center justify-center gap-2 px-4 py-2 bg-[#006065] dark:bg-card text-[#006065] dark:text-[#00beac] rounded-xl text-sm font-semibold">
                      <CheckCircle2 className="w-4 h-4" /> Resolved
                    </div>
                  )}
                </div>
                
              </div>
            </div>
          ))
        )}
      </div>

      <AdminChatDialog 
        open={!!activeChatUser} 
        onOpenChange={(isOpen) => !isOpen && setActiveChatUser(null)}
        targetUser={activeChatUser}
      />
    </div>
  );
}


