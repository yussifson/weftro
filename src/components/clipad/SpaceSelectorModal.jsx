import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Layers, Search } from 'lucide-react';

export default function SpaceSelectorModal({ open, onOpenChange, onConfirm, title = "Select a Space" }) {
  const { user } = useAuth();
  const [spaces, setSpaces] = useState([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [privacyType, setPrivacyType] = useState('private');

  useEffect(() => {
    if (open) {
      loadSpaces();
    }
  }, [open]);

  const loadSpaces = async () => {
    setLoading(true);
    try {
      if (!user?.id) { setLoading(false); return; }

      // Same pattern as SpacesList.jsx — get created_by + member spaces + public
      const [mySpacesRes, memberSpacesRes] = await Promise.all([
        supabase.from('clipad_spaces').select('id, name, is_private').eq('created_by', user.id).order('created_at', { ascending: false }),
        supabase.from('clipad_space_members').select('space_id').eq('user_id', user.id)
      ]);

      const memberSpaceIds = memberSpacesRes.data?.map(m => m.space_id) || [];
      let allSpaces = mySpacesRes.data || [];

      if (memberSpaceIds.length > 0) {
        const { data: memberSpaces } = await supabase.from('clipad_spaces').select('id, name, is_private').in('id', memberSpaceIds);
        const existingIds = new Set(allSpaces.map(s => s.id));
        allSpaces = [...allSpaces, ...(memberSpaces || []).filter(s => !existingIds.has(s.id))];
      }

      // Also include public spaces
      const { data: publicSpaces } = await supabase.from('clipad_spaces').select('id, name, is_private').eq('is_private', false);
      const existingIds2 = new Set(allSpaces.map(s => s.id));
      allSpaces = [...allSpaces, ...(publicSpaces || []).filter(s => !existingIds2.has(s.id))];

      allSpaces.sort((a, b) => a.name?.localeCompare(b.name));
      setSpaces(allSpaces);
    } catch (err) {
      console.error('SpaceSelectorModal: failed to load spaces', err);
    }
    setLoading(false);
  };

  const handleConfirm = () => {
    onConfirm(selectedSpaceId, privacyType);
    onOpenChange(false);
    setSelectedSpaceId(null);
    setSearch('');
    setPrivacyType('private');
  };

  const filtered = spaces.filter(s => s.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setSearch(''); setSelectedSpaceId(null); setPrivacyType('private'); } }}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Choose a space to associate this with. Skip to leave it unassigned.
          </DialogDescription>
        </DialogHeader>
        
        {/* Search bar */}
        {spaces.length > 4 && (
          <div className="relative mb-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search spaces..."
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-card border border-slate-200 dark:border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        )}

        <div className="py-2 space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
          {loading ? (
            <div className="py-8 text-center">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-500">Loading spaces...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center">
              <Layers className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-500 dark:text-muted-foreground">
                {search ? 'No spaces match your search.' : 'No spaces found. You can continue without one.'}
              </p>
            </div>
          ) : (
            <>
              {/* No space option */}
              <button
                onClick={() => setSelectedSpaceId(null)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl border text-left transition-all ${selectedSpaceId === null ? 'bg-primary/5 border-primary/30 text-primary font-bold' : 'bg-white dark:bg-card border-slate-200 dark:border-border text-slate-500 dark:text-muted-foreground hover:border-primary/30'}`}
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-secondary flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4 opacity-40" />
                </div>
                <span className="text-sm">No Space (Public)</span>
              </button>

              {filtered.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSpaceId(s.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl border text-left transition-all ${selectedSpaceId === s.id ? 'bg-primary/5 border-primary/30 text-primary font-bold' : 'bg-white dark:bg-card border-slate-200 dark:border-border text-slate-700 dark:text-foreground hover:border-primary/30'}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white text-xs font-black ${selectedSpaceId === s.id ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}>
                    {s.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{s.name}</p>
                    {s.type && <p className="text-[10px] uppercase text-slate-400 font-mono tracking-widest">{s.type}</p>}
                  </div>
                  {s.is_private && (
                    <span className="text-[10px] bg-slate-100 dark:bg-secondary text-slate-500 px-2 py-0.5 rounded-full font-medium shrink-0">Private</span>
                  )}
                </button>
              ))}
            </>
          )}
        </div>

        <div className="flex items-center justify-between p-3 mt-2 bg-slate-50 dark:bg-secondary rounded-xl border border-slate-200 dark:border-border">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Meeting Privacy</p>
            <p className="text-xs text-slate-500 dark:text-muted-foreground">{privacyType === 'private' ? 'Only org members can join.' : 'External guests can knock to join.'}</p>
          </div>
          <div className="flex bg-slate-200 dark:bg-slate-700 p-1 rounded-lg">
            <button
              onClick={() => setPrivacyType('private')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${privacyType === 'private' ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'}`}
            >
              Private
            </button>
            <button
              onClick={() => setPrivacyType('public')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${privacyType === 'public' ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'}`}
            >
              Public
            </button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm}>
            {selectedSpaceId ? 'Continue with Space' : 'Continue without Space'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
