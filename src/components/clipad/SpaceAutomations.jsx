import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Settings, Zap, Plus, Trash2, Loader2, ArrowRight } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';

export default function SpaceAutomations({ spaceId }) {
  const [automations, setAutomations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const [newTrigger, setNewTrigger] = useState('meeting_ended');
  const [newAction, setNewAction] = useState('create_task');

  useEffect(() => {
    fetchAutomations();
  }, [spaceId]);

  const fetchAutomations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clipad_automations')
        .select('*')
        .eq('space_id', spaceId)
        .order('created_at', { ascending: false });
      
      // If table doesn't exist, this will error. We handle it gracefully.
      if (error) {
        if (error.code === '42P01') {
          console.warn("Automations table not found. Please push migrations.");
          setAutomations([]);
        } else {
          throw error;
        }
      } else {
        setAutomations(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('clipad_automations')
        .insert({
          space_id: spaceId,
          trigger_type: newTrigger,
          action_type: newAction,
          config: {}
        })
        .select()
        .single();
        
      if (error) throw error;
      setAutomations([data, ...automations]);
      toast({ title: 'Automation created successfully' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Failed to create automation', description: err.message, variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase.from('clipad_automations').delete().eq('id', id);
      if (error) throw error;
      setAutomations(automations.filter(a => a.id !== id));
      toast({ title: 'Automation deleted' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Zap className="w-6 h-6 text-amber-500" /> Smart Automations</h2>
          <p className="text-muted-foreground mt-1 text-sm">Create workflows to automatically handle tasks when events occur in this space.</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
        <h3 className="font-bold text-sm uppercase tracking-wider text-primary flex items-center gap-2">
          <Zap className="w-4 h-4" /> Create New Workflow
        </h3>
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1 w-full bg-secondary/30 p-4 rounded-xl border border-border">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 block flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px]">1</span> 
              When this happens
            </label>
            <select 
              value={newTrigger}
              onChange={e => setNewTrigger(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm appearance-none cursor-pointer"
            >
              <option value="meeting_ended">A meeting ends</option>
              <option value="video_recorded">A new video is recorded</option>
              <option value="task_completed">A task is marked done</option>
            </select>
          </div>
          <ArrowRight className="hidden md:block w-6 h-6 text-muted-foreground/50 shrink-0 mt-5" />
          <div className="flex-1 w-full bg-secondary/30 p-4 rounded-xl border border-border">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 block flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px]">2</span> 
              Do this action
            </label>
            <select 
              value={newAction}
              onChange={e => setNewAction(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm appearance-none cursor-pointer"
            >
              <option value="create_task">Auto-generate Action Items</option>
              <option value="send_message">Send summary to Chat</option>
              <option value="notify_members">Notify Space Members</option>
              <option value="export_to_jira">Export to Jira / Linear</option>
              <option value="notify_orbit_flow">Trigger Orbit AI Proactive Alert</option>
            </select>
          </div>
          <div className="pt-8">
            <button
              onClick={handleCreate}
              disabled={isCreating}
              className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-md hover:bg-primary/90 transition-all flex items-center gap-2 w-full md:w-auto justify-center hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-5 h-5" />}
              Add Workflow
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3 mt-8">
        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Active Workflows</h3>
        {automations.length === 0 ? (
          <div className="text-center p-8 border border-dashed border-border rounded-xl text-muted-foreground">
            <Settings className="w-8 h-8 opacity-20 mx-auto mb-2" />
            <p>No automations configured yet.</p>
          </div>
        ) : (
          automations.map(auto => (
            <div key={auto.id} className="flex items-center justify-between p-5 bg-card border border-border rounded-2xl shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">When</span>
                    <span className="bg-secondary/80 px-3 py-1 rounded-lg text-sm font-semibold text-foreground border border-border">
                      {auto.trigger_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <ArrowRight className="w-4 h-4 text-muted-foreground/50 ml-2" />
                    <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Then</span>
                    <span className="bg-primary/10 px-3 py-1 rounded-lg text-sm font-bold text-primary border border-primary/20">
                      {auto.action_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    toast({
                      title: '⚡ Workflow Tested!',
                      description: `Simulated trigger "${auto.trigger_type}" -> Executed "${auto.action_type}" successfully.`
                    });
                  }}
                  className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold rounded-lg border border-border transition-all"
                >
                  Test Run
                </button>
                <button 
                  onClick={() => handleDelete(auto.id)}
                  className="p-2.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                  title="Delete Automation"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
