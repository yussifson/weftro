import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { getPlanLimits, getUserPlan } from '@/lib/clipadPricing';
import { useToast } from '@/components/ui/use-toast';

import { 
  Plus, Users, ArrowRight, 
  Search, Lock, Globe, Layers
} from 'lucide-react';
import { getSpaceIcon } from '@/utils/spaceIcons';

import { isAdmin, canCreateSpaces } from '@/lib/constants';
import PaywallModal from '@/components/clipad/PaywallModal';

const COLORS = [
  'from-indigo-500 to-violet-500',
  'from-cyan-500 to-blue-500',
  'from-pink-500 to-rose-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-violet-500 to-purple-500',
];

// Helper: recover from a 401 by refreshing the session token, returns true if recovery succeeded
async function trySessionRecovery() {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data?.session) {
      console.warn('[SpacesList] Session refresh failed:', error?.message);
      return false;
    }
    console.log('[SpacesList] Session refreshed successfully.');
    return true;
  } catch (e) {
    console.warn('[SpacesList] Session refresh threw:', e);
    return false;
  }
}

export default function SpacesList() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchSpaces(); }, [user?.id]);

  const fetchSpaces = async () => {
    setLoading(true);
    setAuthError(false);
    if (!user?.id) { setLoading(false); return; }

    try {
      // Fetch membership first so we know which spaces user has access to
      const membershipRes = await supabase
        .from('clipad_space_members')
        .select('space_id')
        .eq('user_id', user.id);

      // 401 check on membership query — try session recovery
      if (membershipRes.status === 401 || membershipRes.error?.status === 401) {
        console.warn('[SpacesList] 401 on membership query — attempting session recovery...');
        const recovered = await trySessionRecovery();
        if (recovered) {
          await refreshUser();
          setLoading(false);
          return; // AuthContext will trigger re-mount via user change
        }
        setAuthError(true);
        setLoading(false);
        return;
      }

      const memberSpaceIds = new Set(membershipRes.data?.map(m => m.space_id) || []);

      // Always fetch spaces the user owns directly (works for all users regardless of company)
      const { data: mySpaces, error: mySpacesError } = await supabase
        .from('clipad_spaces')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (mySpacesError?.status === 401) {
        console.warn('[SpacesList] 401 on own spaces query — attempting session recovery...');
        const recovered = await trySessionRecovery();
        if (recovered) { await refreshUser(); setLoading(false); return; }
        setAuthError(true);
        setLoading(false);
        return;
      }

      let allSpaces = mySpaces || [];

      // Also fetch company spaces if the user has a company_id
      if (user.company_id) {
        const { data: companySpaces } = await supabase
          .from('clipad_spaces')
          .select('*')
          .eq('company_id', user.company_id)
          .order('created_at', { ascending: false });
        // Merge, deduplicate
        const seen = new Set(allSpaces.map(s => s.id));
        (companySpaces || []).forEach(s => { if (!seen.has(s.id)) { allSpaces.push(s); seen.add(s.id); } });
      }

      // Tag each space: _isMember = has full access, _isRestricted = private & not a member
      const tagged = allSpaces.map(s => ({
        ...s,
        _isMember: s.created_by === user.id || memberSpaceIds.has(s.id),
        _isRestricted: s.is_private && s.created_by !== user.id && !memberSpaceIds.has(s.id) && !isAdmin(user)
      }));
      tagged.sort((a, b) => {
        if (a._isRestricted !== b._isRestricted) return a._isRestricted ? 1 : -1;
        return new Date(b.created_at) - new Date(a.created_at);
      });
      setSpaces(tagged);
    } catch (err) {
      console.error('Failed to fetch spaces:', err);
    }
    setLoading(false);
  };


  const createSpace = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !user) return;
    
      // Plan Limit Check
      const planLimits = getPlanLimits(user);
      const maxSpaces = planLimits.maxTeamSpaces;
      if (spaces.length >= maxSpaces) {
        setShowCreate(false);
        setShowPaywall(true);
        return;
      }

    setCreating(true);
    try {
      const { data, error } = await supabase.from('clipad_spaces').insert({
        name: newName.trim(),
        description: newDesc.trim(),
        created_by: user.id,
        is_private: isPrivate,
        company_id: user.company_id || null
      }).select().single();

      if (error) {
        // Handle 401 specifically — attempt session recovery then retry once
        if (error.status === 401 || error.code === 'PGRST301') {
          console.warn('[SpacesList] 401 on createSpace — attempting session recovery...');
          const recovered = await trySessionRecovery();
          if (recovered) {
            // Retry the insert with the refreshed session
            const { data: retryData, error: retryError } = await supabase.from('clipad_spaces').insert({
              name: newName.trim(),
              description: newDesc.trim(),
              created_by: user.id,
              is_private: isPrivate,
              company_id: user.company_id || null
            }).select().single();
            if (retryError) throw retryError;
            setSpaces(prev => [retryData, ...prev]);
            setShowCreate(false);
            setNewName('');
            setNewDesc('');
            setIsPrivate(false);
            navigate(`/spaces/${retryData.id}`);
            return;
          } else {
            toast({ title: 'Session expired', description: 'Your session has expired. Please sign in again.', variant: 'destructive' });
            navigate('/login');
            return;
          }
        }
        throw error;
      }

      setSpaces(prev => [data, ...prev]);
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
      setIsPrivate(false);
      navigate(`/spaces/${data.id}`);
    } catch (err) {
      console.error('[SpacesList] createSpace error:', err);
      toast({ 
        title: 'Failed to create space', 
        description: err.message || 'An unexpected error occurred. Please try again.',
        variant: 'destructive' 
      });
    } finally {
      setCreating(false);
    }
  };

  const isAdminUser = isAdmin(user);
  // Show all spaces; SpaceDashboard handles the access wall for private ones
  const filtered = spaces.filter(s => s.name?.toLowerCase().includes(search.toLowerCase()));

  const firstName = user?.full_name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';
  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="min-h-screen bg-slate-50 dark:bg-background text-slate-900 dark:text-slate-100 page-enter overflow-x-hidden pb-24 md:pb-8">

      {showPaywall && (
        <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} featureName="Premium Spaces" />
      )}

      {/* CREATE MODAL */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-card rounded-xl shadow-2xl border border-slate-200 dark:border-border animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-1">Create a new space</h2>
              <p className="text-sm text-slate-500 dark:text-muted-foreground mb-6">A dedicated area for your team's context and collaboration.</p>
              
              <form onSubmit={createSpace} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-1 block">Space Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="e.g. Q4 Planning"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-1 block">Description (Optional)</label>
                  <textarea
                    value={newDesc}
                    onChange={e => setNewDesc(e.target.value)}
                    placeholder="What is this space for?"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all resize-none h-20"
                  />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="private-space"
                    checked={isPrivate}
                    onChange={e => setIsPrivate(e.target.checked)}
                    className="rounded border-slate-300 dark:border-border text-slate-900 dark:text-foreground focus:ring-slate-900"
                  />
                  <label htmlFor="private-space" className="text-sm font-medium">Private Space</label>
                </div>
                
                <div className="flex items-center justify-end gap-3 pt-6">
                  <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-muted-foreground hover:text-slate-900 dark:text-muted-foreground dark:hover:text-slate-100 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={!newName.trim() || creating} className="px-5 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 dark:bg-accent rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center gap-2">
                    {creating && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    Create Space
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-white dark:bg-card border-b border-slate-200 dark:border-border sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Layers className="w-4 h-4 text-slate-600 dark:text-muted-foreground" />
             </div>
             <h1 className="text-lg font-bold">Spaces</h1>
          </div>
          <div className="flex items-center gap-3">
             <div className="relative hidden md:block w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search spaces..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-border text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 transition-all"
                />
             </div>
             {canCreateSpaces(user) && (
                <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm rounded-md font-semibold text-sm transition-all shadow-sm">
                  <Plus className="w-4 h-4" /> New Space
                </button>
             )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-10 py-8">
        {/* MOBILE SEARCH */}
        <div className="md:hidden relative w-full mb-6">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search spaces..."
            className="w-full pl-9 pr-3 py-2 rounded-md bg-white dark:bg-card border border-slate-200 dark:border-border text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 shadow-sm"
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-40 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
               <Layers className="w-8 h-8 text-slate-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-foreground mb-2">No spaces found</h2>
            <p className="text-slate-500 dark:text-muted-foreground text-sm max-w-sm">Create a space to organize context, tasks, and meetings for a specific project or team.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map(space => {
              const colors = ['bg-blue-600', 'bg-indigo-600', 'bg-purple-600', 'bg-[#006065] dark:bg-[#131A2C]', 'bg-rose-600', 'bg-amber-600'];
              const colorIndex = space.id ? space.id.split('-').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length : 0;
              const bgColorClass = colors[colorIndex];
              const SpaceIcon = getSpaceIcon(space.name);

              return (
                <div 
                  key={space.id}
                  onClick={() => navigate(`/spaces/${space.id}`)}
                  className="group relative bg-white dark:bg-card rounded-xl border border-slate-200 dark:border-border overflow-hidden hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer flex flex-col h-full"
                >
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                       <div className={`w-12 h-12 rounded-lg ${bgColorClass} flex items-center justify-center text-white shadow-sm`}>
                         <SpaceIcon className="w-6 h-6" />
                       </div>
                       {space.is_private && (
                         <div className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-md border border-slate-100 dark:border-border" title="Private Space">
                           <Lock className="w-3.5 h-3.5 text-slate-400" />
                         </div>
                       )}
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-foreground text-base leading-snug line-clamp-1 mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {space.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-muted-foreground line-clamp-2 mt-1">
                      {space.description || 'No description provided.'}
                    </p>
                  </div>
                  <div className="px-5 py-3 border-t border-slate-100 dark:border-border bg-slate-50 dark:bg-background/50 dark:bg-card/50 flex items-center justify-between mt-auto">
                     <span className="text-xs font-medium text-slate-500 dark:text-muted-foreground flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> Team Space
                     </span>
                     <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors group-hover:translate-x-1" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


