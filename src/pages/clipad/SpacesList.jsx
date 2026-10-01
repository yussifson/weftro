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
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="min-h-full bg-[#f8fafc] text-[#0f172a] page-enter overflow-x-hidden pb-24 md:pb-8">


      <div className="max-w-6xl mx-auto px-4 md:px-10 py-6 md:py-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[#0f172a] mb-2">Team Spaces</h1>
            <p className="text-slate-600 font-medium text-sm">Persistent rooms for projects, teams, or recurring syncs.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search spaces..."
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white text-[#0f172a] border border-slate-200 placeholder:text-slate-400 shadow-sm focus:outline-none focus:border-[#00beac] focus:ring-2 focus:ring-[#00beac]/20 text-sm transition-all"
              />
            </div>
            {isAdminUser && (
              <button 
                onClick={() => navigate('/settings', { state: { tab: 'billing' } })}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-500/10 text-amber-600 font-semibold text-sm rounded-lg hover:bg-amber-200 dark:hover:bg-amber-500/20 transition-colors"
              >
                Billing
              </button>
            )}
            {canCreateSpaces(user) && (
              <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00beac] hover:bg-[#00a898] text-white font-bold text-sm shadow-md transition-all shrink-0 active:scale-95">
                <Plus className="w-4 h-4" /> New Space
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-40 rounded-2xl bg-slate-200/60 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <Layers className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-800 mb-2">No spaces yet</h3>
            <p className="text-slate-500 mb-6 text-sm">Create a space for your first team or project.</p>
            {canCreateSpaces(user) && (
              <button onClick={() => setShowCreate(true)} className="px-6 py-3 rounded-xl bg-[#00beac] hover:bg-[#00a898] text-white font-bold text-sm shadow-md transition-all">
                Create your first space
              </button>
            )}
          </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filtered.map(space => {
                const colors = ['from-blue-500 to-blue-700', 'from-indigo-500 to-indigo-700', 'from-purple-500 to-purple-700', 'from-fuchsia-500 to-fuchsia-700', 'from-rose-500 to-rose-700', 'from-orange-500 to-orange-700', 'from-emerald-500 to-emerald-700'];
                const colorIndex = space.id ? space.id.split('-').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length : 0;
                const color = colors[colorIndex];
                const isRestricted = space._isRestricted;
                const SpaceIcon = getSpaceIcon(space.name);

                return (
                  <div
                    key={space.id}
                    onClick={() => navigate(`/spaces/${space.id}`)}
                    className={`group p-5 rounded-2xl bg-[#006065] text-white border border-white/15 rounded-3xl shadow-[0_2px_16px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-primary/50 dark:hover:border-primary/50 cursor-pointer transition-all duration-300 hover:-translate-y-1 active:scale-[0.98] shadow-sm hover:shadow-md relative overflow-hidden ${
                      isRestricted
                        ? 'border-white/15 dark:border-white/15 opacity-80 hover:opacity-95'
                        : 'border-white/15 dark:border-white/15'
                    }`}
                  >
                    {/* Locked overlay for restricted private spaces */}
                    {isRestricted && (
                      <div className="absolute inset-0 z-10 bg-gradient-to-br from-slate-50/80 to-slate-100/60 dark:from-slate-950/80 dark:to-slate-900/60 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 rounded-2xl">
                        <div className="w-10 h-10 rounded-full bg-[#006065] text-white dark:bg-secondary border border-white/15 dark:border-white/15 flex items-center justify-center shadow-sm">
                          <Lock className="w-5 h-5 text-white/60" />
                        </div>
                        <span className="text-xs font-semibold text-white/70">Private — Request Access</span>
                      </div>
                    )}

                    <div className="flex items-start gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm bg-gradient-to-br ${color} shrink-0`}>
                        <SpaceIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white text-base truncate">{space.name}</h3>
                        <p className="text-xs text-white/70 mt-0.5 line-clamp-1">{space.description || 'Team space'}</p>
                      </div>
                      {!isRestricted && <ArrowRight className="w-4 h-4 text-white/60 group-hover:text-primary transition-colors shrink-0" />}
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        space.is_private
                          ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {space.is_private ? <Lock className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
                        {space.is_private ? 'Private' : 'Public'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 text-white/90 font-semibold rounded-full border border-white/15/50 shadow-sm">
                        <Users className="w-3.5 h-3.5 text-white/70" />
                        <span className="text-[11px] font-bold text-white">Members</span>
                      </div>
                      <span className="text-[11px] font-medium text-white/70">{new Date(space.created_at || Date.now()).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
        )}
      </div>

      {/* Create Space Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-[#006065] text-white border border-white/15 border-white/15 dark:border-white/15 rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-1">Create a Space</h2>
            <p className="text-sm text-white/70 mb-6">A persistent room for your team, project, or recurring meetings.</p>
            <form onSubmit={createSpace} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-2 uppercase tracking-wider">Space Name *</label>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Product Team, Q3 Campaign..."
                  className="w-full px-4 py-3 rounded-xl bg-white/5  border border-white/15 dark:border-white/15 text-white text-sm placeholder-slate-400 focus:outline-none focus:border-primary/50 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-2 uppercase tracking-wider">Description</label>
                <textarea
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="What is this space for?"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-white/5  border border-white/15 dark:border-white/15 text-white text-sm placeholder-slate-400 focus:outline-none focus:border-primary/50 transition-all resize-none"
                />
              </div>
              
              <div onClick={() => setIsPrivate(!isPrivate)} className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-white/15 bg-white/5/50 hover:bg-white/5 dark:hover:bg-slate-800 transition-colors">
                <div className={`w-10 h-6 rounded-full transition-colors relative ${isPrivate ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-[#006065] text-white border border-white/15 shadow transition-all ${isPrivate ? 'left-5' : 'left-1'}`} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" /> Private Space
                  </div>
                  <div className="text-[11px] text-white/70">Only invited members can access.</div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-3 rounded-xl bg-[#006065] text-white dark:bg-secondary hover:bg-white/5 dark:hover:bg-slate-700 text-white/90 dark:text-foreground font-semibold text-sm transition-all border border-white/15 dark:border-white/15 shadow-sm">Cancel</button>
                <button type="submit" disabled={creating} className="flex-1 py-3 rounded-xl bg-[#00beac] hover:bg-[#00beac]/90 text-[#00beac] font-bold text-sm transition-all shadow-md disabled:opacity-60">
                  {creating ? 'Creating...' : 'Create Space'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        featureName="More Spaces"
        limitDescription={`You have reached the limit of ${getPlanLimits(user).maxTeamSpaces} spaces on the ${getUserPlan(user)} plan.`}
      />

          </div>
  );
}
