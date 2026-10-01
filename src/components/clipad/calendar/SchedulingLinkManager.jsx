import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Copy, Plus, Trash2, Calendar as CalendarIcon, Link as LinkIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useAuth } from '@/lib/AuthContext';

export default function SchedulingLinkManager({ spaceId }) {
  const { user } = useAuth();
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  const [newTitle, setNewTitle] = useState('');
  const [newDuration, setNewDuration] = useState(30);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchLinks();
  }, [spaceId]);

  const fetchLinks = async () => {
    if (!spaceId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('clipad_scheduling_links')
      .select('*')
      .eq('space_id', spaceId)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error(error);
    } else {
      setLinks(data || []);
    }
    setLoading(false);
  };

  const createLink = async () => {
    if (!newTitle) return;
    
    // Generate a slug or unique ID for the link
    const uniqueSlug = Math.random().toString(36).substring(2, 10);
    
    const { error } = await supabase
      .from('clipad_scheduling_links')
      .insert({
        space_id: spaceId,
        user_id: user.id,
        title: newTitle,
        slug: uniqueSlug,
        is_active: true
      });
      
    if (error) {
      toast({
        title: 'Error creating link',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Scheduling link created successfully.',
      });
      setNewTitle('');
      setIsDialogOpen(false);
      fetchLinks();
    }
  };

  const deleteLink = async (id) => {
    const { error } = await supabase
      .from('clipad_scheduling_links')
      .delete()
      .eq('id', id);
      
    if (error) {
      toast({
        title: 'Error deleting link',
        variant: 'destructive',
      });
    } else {
      fetchLinks();
    }
  };

  const copyToClipboard = (slug) => {
    const url = `${window.location.origin}/book/${slug}`;
    navigator.clipboard.writeText(url);
    toast({
      title: 'Copied!',
      description: 'Link copied to clipboard',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Scheduling Links</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Link
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a Scheduling Link</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Event Title</Label>
                <Input 
                  value={newTitle} 
                  onChange={e => setNewTitle(e.target.value)} 
                  placeholder="e.g. 1-on-1 Sync" 
                />
              </div>
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input 
                  type="number" 
                  value={newDuration} 
                  onChange={e => setNewDuration(parseInt(e.target.value))} 
                />
              </div>
              <Button onClick={createLink} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading links...</div>
      ) : links.length === 0 ? (
        <div className="p-8 text-center border rounded-lg bg-card">
          <LinkIcon className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
          <h3 className="font-medium">No links created</h3>
          <p className="text-sm text-muted-foreground mt-1">Create a scheduling link to let people book time with you.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {links.map(link => (
            <div key={link.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
              <div>
                <h4 className="font-medium">{link.title}</h4>
                <p className="text-sm text-muted-foreground flex items-center mt-1">
                  <CalendarIcon className="w-3 h-3 mr-1" />
                  {link.duration_minutes} min
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => copyToClipboard(link.slug)}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Link
                </Button>
                <Button variant="ghost" size="icon" onClick={() => deleteLink(link.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
