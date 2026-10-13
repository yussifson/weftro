import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/api/supabaseClient';
import { generateShortId } from '@/utils/idGenerator';
import { powerSync } from '@/api/PowerSyncConnector';
import { useAuth } from '@/lib/AuthContext';
import { useCompanyId } from '@/hooks/useCompanyId';
import { Users, Lock, Globe, Clock, CalendarIcon, Briefcase, Copy, CheckCircle2 } from 'lucide-react';
import { OrbitLoader } from '@/components/ui/orbit-loader';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { NotificationService } from '@/services/NotificationService';

export default function ScheduleMeetingDialog({ open, onOpenChange, onScheduled }) {
  const { user } = useAuth();
  const companyId = useCompanyId();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduledMeeting, setScheduledMeeting] = useState(null);

  useEffect(() => {
    if (!open) {
      setTitle('');
      setDate('');
      setTime('');
      setIsPrivate(false);
      setSelectedParticipants([]);
      setScheduledMeeting(null);
    } else if (companyId) {
      loadEmployees();
    }
  }, [open, companyId]);

  const loadEmployees = async () => {
    try {
      const [staffRes, clientsRes, crmRes, retailRes, pharmacyRes, reRes] = await Promise.all([
        powerSync.getAll('SELECT id, name, email FROM univ_hr_employees WHERE company_id = ?', [companyId]),
        powerSync.getAll('SELECT id, name, email FROM clients WHERE company_id = ?', [companyId]),
        powerSync.getAll('SELECT id, first_name, last_name, email FROM univ_crm_leads WHERE company_id = ?', [companyId]),
        powerSync.getAll('SELECT id, name, email FROM univ_retail_customers WHERE company_id = ?', [companyId]),
        powerSync.getAll('SELECT id, customer_name as name, email FROM univ_pharmacy_customers WHERE company_id = ?', [companyId]),
        powerSync.getAll('SELECT id, name, email FROM univ_re_clients WHERE company_id = ?', [companyId])
      ]);
      const staffMembers = (staffRes || []).map(s => ({
        ...s,
        full_name: s.name || 'Unnamed Staff',
        email: s.email,
        type: 'team'
      }));
      const clientMembers = [
        ...(clientsRes || []),
        ...(retailRes || []),
        ...(pharmacyRes || []),
        ...(reRes || [])
      ].map(c => ({
        ...c,
        full_name: c.name || 'Unnamed Client',
        email: c.email,
        type: 'client'
      }));
      const crmMembers = (crmRes || []).map(c => ({
        ...c,
        full_name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unnamed Client',
        email: c.email,
        type: 'client'
      }));
      setEmployees([...staffMembers, ...clientMembers, ...crmMembers]);
    } catch (err) {
      console.error('Failed to load participants:', err);
    }
  };

  const handleToggleParticipant = (emp) => {
    if (selectedParticipants.find((p) => p.id === emp.id)) {
      setSelectedParticipants(selectedParticipants.filter((p) => p.id !== emp.id));
    } else {
      setSelectedParticipants([...selectedParticipants, emp]);
    }
  };

  const handleSchedule = async () => {
    if (!title || !date || !time) {
      toast({ title: 'Error', description: 'Please fill in all required fields.', variant: 'destructive' });
      return;
    }

    setIsScheduling(true);
    try {
      const scheduledStart = new Date(`${date}T${time}`);
      
      const dbId = crypto.randomUUID();
      const shortId = generateShortId();

      let dailyData = null;
      try {
        const { data, error: functionError } = await supabase.functions.invoke('create-daily-room', {
          body: { dbId, roomName: shortId, privacy: isPrivate ? 'private' : 'public', companyId }
        });
        if (!functionError && data && (data.name || data.url)) dailyData = data;
      } catch (_) { /* edge function unavailable */ }

      const roomName = dailyData?.name || shortId;
      const realUrl = dailyData?.url || `https://optalflow.daily.co/${roomName}`;

      let meetingDomain = window.location.hostname;
      if (meetingDomain.includes('localhost') || meetingDomain.includes('127.0.0.1')) {
        meetingDomain = `meet.localhost`;
      } else if (meetingDomain.includes('optavel.com')) {
        meetingDomain = `clipad.optavel.com`;
      } else if (meetingDomain.includes('oatstack.com')) {
        meetingDomain = `meet.oatstack.com`;
      } else {
        meetingDomain = `meet.${meetingDomain}`;
      }
      
      const customMeetingOrigin = `${window.location.protocol}//${meetingDomain}${window.location.port ? ':' + window.location.port : ''}`;

      const _payload = {
        id: dbId,
        company_id: companyId,
        title: title,
        description: `Scheduled meeting for ${scheduledStart.toLocaleString()}`,
        daily_room_url: realUrl,
        daily_room_name: roomName,
        host_id: user.id,
        status: 'scheduled',
        meeting_type: 'scheduled',
        privacy_type: isPrivate ? 'private' : 'public',
        scheduled_start_time: scheduledStart.toISOString(),
        participants: JSON.stringify(selectedParticipants.map(p => ({ id: p.id, email: p.email, name: p.full_name }))),
        meeting_link: `${customMeetingOrigin}/join/${roomName}`
      };

      try {
        const { error: dbError } = await supabase.from('video_rooms').upsert(_payload);
        if (dbError) {
          const _keys = Object.keys(_payload);
          const _vals = Object.values(_payload).map(v => typeof v === 'object' && v !== null ? JSON.stringify(v) : v);
          await powerSync.execute(`INSERT INTO video_rooms (${_keys.join(', ')}) VALUES (${_keys.map(()=>'?').join(', ')})`, _vals);
        }
      } catch (_) { /* db insert failed — continue with notifications */ }

      if (selectedParticipants.length > 0) {
        for (const participant of selectedParticipants) {
          await NotificationService.emit({
            companyId: companyId,
            recipientEmail: participant.email,
            title: `Meeting Invite: ${title}`,
            message: `You have been invited to a scheduled video meeting on ${scheduledStart.toLocaleString()}. Join here: ${_payload.meeting_link}`,
            type: 'video_meeting',
            relatedId: _payload.meeting_link
          });
        }
        toast({ title: 'Invites Sent', description: `Emailed ${selectedParticipants.length} participants.` });
      }

      setScheduledMeeting({
        title,
        date: scheduledStart.toLocaleDateString(),
        time: scheduledStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        link: _payload.meeting_link
      });
      
      onScheduled && onScheduled();
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: err.message || 'Failed to schedule meeting', variant: 'destructive' });
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-white dark:bg-card border-none shadow-2xl rounded-2xl">
        {scheduledMeeting ? (
          <>
            <DialogTitle className="sr-only">Meeting Scheduled</DialogTitle>
            <DialogDescription className="sr-only">Your meeting has been scheduled and invitations have been sent.</DialogDescription>
            <div className="flex flex-col p-2 max-h-[85vh] overflow-y-auto">
            <div className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-b from-emerald-500/10 to-transparent p-6 sm:p-8 text-center border border-emerald-500/20 shadow-sm">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <CalendarIcon className="w-32 h-32 text-emerald-500 transform rotate-12" />
              </div>
              
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/30 shrink-0">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-foreground mb-2 tracking-tight">Meeting Scheduled!</h2>
                <p className="text-slate-500 dark:text-muted-foreground mb-8 max-w-sm">
                  Your meeting has been set and calendar invitations have been sent to all participants.
                </p>

                <div className="w-full bg-white dark:bg-card/80 backdrop-blur-sm border border-slate-200 dark:border-white/10 rounded-2xl p-5 sm:p-6 text-left shadow-sm space-y-5 relative">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Meeting Title</p>
                    <p className="text-lg text-slate-900 dark:text-foreground font-medium truncate">{scheduledMeeting.title}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 sm:gap-6">
                    <div className="truncate">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Date</p>
                      <p className="text-sm sm:text-base text-slate-800 dark:text-foreground truncate">{scheduledMeeting.date}</p>
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Time</p>
                      <p className="text-sm sm:text-base text-slate-800 dark:text-foreground truncate">{scheduledMeeting.time}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-white/5">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-2">Join Link</p>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <div className="flex-1 bg-slate-50 dark:bg-black/50 p-3 rounded-xl border border-slate-200 dark:border-white/5 truncate flex items-center min-w-0">
                        <span className="text-sm text-primary font-medium truncate select-all w-full block">
                          {scheduledMeeting.link}
                        </span>
                      </div>
                      <Button 
                        type="button" 
                        size="lg"
                        className="rounded-xl shrink-0 gap-2 h-12 sm:h-auto"
                        onClick={() => {
                          const inviteText = `You are invited to a video meeting.\n\nTitle: ${scheduledMeeting.title}\nDate: ${scheduledMeeting.date}\nTime: ${scheduledMeeting.time}\n\nJoin Link: ${scheduledMeeting.link}`;
                          navigator.clipboard.writeText(inviteText);
                          toast({ title: 'Copied to clipboard', description: 'You can now paste this invitation anywhere.' });
                        }}
                      >
                        <Copy className="h-4 w-4" />
                        Copy Invite
                      </Button>
                    </div>
                  </div>
                </div>

                <Button onClick={() => onOpenChange(false)} variant="ghost" className="mt-6 w-full sm:w-auto px-8 text-slate-500 dark:text-muted-foreground hover:text-slate-700 dark:text-foreground shrink-0">
                  Done
                </Button>
              </div>
            </div>
          </div>
          </>
        ) : (
          <div className="p-6">
            <DialogHeader>
              <DialogTitle>Schedule a Meeting</DialogTitle>
              <DialogDescription>Set a time and invite team members to a video call.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Meeting Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Weekly Sync" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="pl-9" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="pl-9" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base flex items-center gap-2">
                    {isPrivate ? <Lock className="h-4 w-4 text-rose-500" /> : <Globe className="h-4 w-4 text-emerald-500" />}
                    {isPrivate ? 'Private Meeting' : 'Public Meeting'}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {isPrivate ? 'Only invited participants can join this room.' : 'Anyone with the link can join.'}
                  </p>
                </div>
                <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
              </div>

              {isPrivate && (
                <div className="space-y-2 pt-2">
                  <Label>Invite Participants ({selectedParticipants.length})</Label>
                  <Tabs defaultValue="staff" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="staff">Internal Staff</TabsTrigger>
                      <TabsTrigger value="clients">Clients</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="staff" className="mt-2">
                      <div className="max-h-[150px] overflow-y-auto border rounded-md p-2 space-y-1">
                        {employees.filter(e => e.type === 'team').length === 0 ? (
                          <p className="text-sm text-muted-foreground p-2">No internal staff found.</p>
                        ) : (
                          employees.filter(e => e.type === 'team').map((emp) => {
                            const isSelected = selectedParticipants.find((p) => p.id === emp.id);
                            return (
                              <div
                                key={emp.id || emp.email}
                                onClick={() => handleToggleParticipant(emp)}
                                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                                  isSelected ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/50'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-gray-100 dark:bg-card text-gray-500'}`}>
                                    <Users className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{emp.full_name || emp.name}</p>
                                    <p className="text-xs text-gray-500">{emp.email}</p>
                                  </div>
                                </div>
                                {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="clients" className="mt-2">
                      <div className="max-h-[150px] overflow-y-auto border rounded-md p-2 space-y-1">
                        {employees.filter(e => e.type === 'client').length === 0 ? (
                          <p className="text-sm text-muted-foreground p-2">No clients found.</p>
                        ) : (
                          employees.filter(e => e.type === 'client').map((emp) => {
                            const isSelected = selectedParticipants.find((p) => p.id === emp.id);
                            return (
                              <div
                                key={emp.id || emp.email}
                                onClick={() => handleToggleParticipant(emp)}
                                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                                  isSelected ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/50'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-gray-100 dark:bg-card text-gray-500'}`}>
                                    <Briefcase className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{emp.full_name || emp.name}</p>
                                    <p className="text-xs text-gray-500">{emp.email}</p>
                                  </div>
                                </div>
                                {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSchedule} disabled={isScheduling}>
                {isScheduling ? <OrbitLoader size="sm" /> : 'Schedule'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
