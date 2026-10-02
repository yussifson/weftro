import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Lock, Unlock, Clock, Save, ArrowRight, Loader2, Sparkles, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { writeOrgEvent } from '@/lib/clipadIntelligence';

export default function SaveMeetingPage() {
  const { id } = useParams(); // meeting ID (UUID) or Daily room name (short ID)
  const [searchParams] = useSearchParams();
  const spaceId = searchParams.get('spaceId');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [meeting, setMeeting] = useState(null);

  // Form state
  const [title, setTitle] = useState('');
  const [visibility, setVisibility] = useState('internal');
  const [isLocked, setIsLocked] = useState(false);
  const [lockType, setLockType] = useState('none'); // 'none', 'manual', 'scheduled'
  const [unlockDate, setUnlockDate] = useState('');
  const [unlockTime, setUnlockTime] = useState('');

  // Helper: is this string a valid UUID?
  const isValidUUID = (str) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

  useEffect(() => {
    async function load() {
      try {
        let data = null;
        let fetchError = null;

        if (isValidUUID(id)) {
          // Standard: query by UUID primary key
          const { data: d, error: e } = await supabase
            .from('clipad_meeting_records')
            .select('*')
            .eq('id', id)
            .maybeSingle();
          data = d;
          fetchError = e;
        } else {
          // Fallback: id is a short Daily room name — query by room name column
          const { data: d, error: e } = await supabase
            .from('clipad_meeting_records')
            .select('*')
            .eq('daily_room_name', id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          data = d;
          fetchError = e;
        }

        if (fetchError) {
          console.warn('DB fetch failed:', fetchError);
        }

        if (data) {
          setMeeting(data);
          setTitle(data.title || data.meeting_title || `Meeting — ${new Date().toLocaleDateString()}`);
          setVisibility(data.visibility || 'internal');
          setIsLocked(data.is_locked || false);
          if (data.is_locked) setLockType('manual');
          if (data.unlock_at) {
            setLockType('scheduled');
            const d = new Date(data.unlock_at);
            setUnlockDate(d.toISOString().split('T')[0]);
            setUnlockTime(d.toTimeString().slice(0, 5));
          }
        } else {
          // No record yet — create a placeholder so user can still publish
          const placeholder = {
            id: isValidUUID(id) ? id : null,
            daily_room_name: id,
            title: `Meeting — ${new Date().toLocaleDateString()}`,
            visibility: 'internal',
            created_at: new Date().toISOString()
          };
          setMeeting(placeholder);
          setTitle(placeholder.title);
        }
      } catch (err) {
        console.error(err);
        toast({ title: 'Warning', description: 'Could not load meeting details. You can still publish.', variant: 'default' });
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id, toast]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: 'Title required', description: 'Please enter a meeting title.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    let finalUnlockAt = null;
    let finalIsLocked = false;

    if (lockType === 'manual') {
      finalIsLocked = true;
    } else if (lockType === 'scheduled') {
      if (!unlockDate || !unlockTime) {
        toast({ title: 'Date/Time required', description: 'Please set the unlock schedule.', variant: 'destructive' });
        setSaving(false);
        return;
      }
      finalIsLocked = true;
      finalUnlockAt = new Date(`${unlockDate}T${unlockTime}`).toISOString();
    }

    try {
      const updateData = {
        title: title.trim(),
        visibility,
        is_locked: finalIsLocked,
        unlock_at: finalUnlockAt,
        ended_at: new Date().toISOString()
      };

      const companyId = user?.company_id || user?.user_metadata?.company_id || null;
      let saved = false;

      // Only attempt update-by-pk when id is a valid UUID
      if (isValidUUID(id)) {
        const { data, error } = await supabase
          .from('clipad_meeting_records')
          .update(updateData)
          .eq('id', id)
          .select();
        if (!error && data && data.length > 0) saved = true;
      }

      if (!saved) {
        // id is a short room name OR update matched no rows — upsert with a valid UUID
        const stableId =
          (meeting?.id && isValidUUID(meeting.id))
            ? meeting.id
            : crypto.randomUUID();

        const { error: insertError } = await supabase
          .from('clipad_meeting_records')
          .upsert(
            {
              id: stableId,
              ...updateData,
              daily_room_name: meeting?.daily_room_name || id,
              host_id: user?.id || null,
              company_id: companyId,
              space_id: spaceId || null,
              started_at: meeting?.started_at || new Date().toISOString()
            },
            { onConflict: 'id' }
          );
        if (insertError) throw insertError;
      }

      // Write to Org Timeline (best effort)
      try {
        await writeOrgEvent({
          space_id: spaceId,
          workspace_id: user?.company_id,
          event_type: 'meeting_saved',
          title: `Meeting saved: ${title.trim()}`,
          description: meeting?.ai_summary?.substring(0, 200) || null,
          actor_id: user?.id,
          source_id: id,
          source_table: 'clipad_meeting_records',
          importance: 4,
        });
      } catch (_) {}

      toast({ title: 'Meeting Saved ✓', description: 'Your meeting record has been published.' });
      // Navigate to meetings list — always works regardless of whether id is a UUID or short room name
      navigate('/clipad/meetings');
    } catch (err) {
      console.error('SaveMeetingPage handleSave error:', err);
      toast({
        title: 'Save Error',
        description: 'Could not save to secure cloud. Please try again.',
        variant: 'destructive'
      });
      // Don't redirect — let the user retry
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-full bg-transparent  flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6 md:p-12 page-enter">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Save Meeting Record</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Your meeting has ended. Review the details and set access controls before publishing.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white p-8 space-y-8">

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">Meeting Title</label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Q3 Roadmap Planning"
              className="text-lg py-6"
            />
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">Visibility</label>
            <select
              value={visibility}
              onChange={e => setVisibility(e.target.value)}
              className="w-full pl-4 pr-10 py-3 rounded-xl bg-[#006065] text-white dark:bg-[#006065] border border-white/15 dark:border-white/15 text-white dark:text-white text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/60 transition-all cursor-pointer shadow-sm"
            >
              <option value="internal">Internal (Company & Space Members Only)</option>
              <option value="external">External (Anyone with link)</option>
            </select>
          </div>

          {/* Lock Settings */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <label className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider shrink-0">Access Control</label>
              <div className="relative inline-block min-w-[220px]">
                <select
                  value={lockType}
                  onChange={e => setLockType(e.target.value)}
                  className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-[#006065] text-white dark:bg-[#006065] border border-white/15 dark:border-white/15 text-white dark:text-white text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/60 transition-all cursor-pointer font-semibold shadow-sm"
                >
                  <option value="none">Public (Space Members)</option>
                  <option value="manual">Locked (Only Me)</option>
                  <option value="scheduled">Scheduled Release</option>
                </select>
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  {lockType === 'none' && <Unlock className="w-4 h-4 text-[#006065] dark:text-[#fad503]" />}
                  {lockType === 'manual' && <Lock className="w-4 h-4 text-indigo-500" />}
                  {lockType === 'scheduled' && <Clock className="w-4 h-4 text-amber-500" />}
                </div>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-white/60">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            {lockType === 'scheduled' && (
              <div className="mt-4 p-5 bg-amber-50 dark:bg-amber-950/10 rounded-xl border border-amber-100 dark:border-amber-900/30 flex gap-4 animate-in fade-in slide-in-from-top-2">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-amber-800 dark:text-amber-500 mb-1.5">Unlock Date</label>
                  <Input type="date" value={unlockDate} onChange={e => setUnlockDate(e.target.value)} className="bg-[#006065] text-white dark:bg-[#006065]" min={new Date().toISOString().split('T')[0]} />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-amber-800 dark:text-amber-500 mb-1.5">Unlock Time</label>
                  <Input type="time" value={unlockTime} onChange={e => setUnlockTime(e.target.value)} className="bg-[#006065] text-white dark:bg-[#006065]" />
                </div>
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-white/10 dark:border-white/15 flex justify-between items-center">
            <div className="text-sm text-white/70 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" /> AI is processing the transcript in the background
            </div>
            <Button onClick={handleSave} disabled={saving} className="bg-primary text-white rounded-full px-8">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Publish Meeting
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}
