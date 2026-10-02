import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { ShieldAlert, AlertTriangle, CheckCircle, Network, Plus, Loader2, Sparkles, Bot } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { detectBlockers, writeOrgEvent } from '@/lib/clipadIntelligence';
import { isAdmin as isGlobalAdmin, isSpaceman } from '@/lib/constants';

export default function BlockerRadar({ workspaceId, spaceId, isWorkspaceView = false, hasFullIntelligence }) {
  const { user } = useAuth();
  const [blockers, setBlockers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newBlocker, setNewBlocker] = useState('');
  const [adding, setAdding] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectedCount, setDetectedCount] = useState(0);

  const isAdmin = isGlobalAdmin(user) || isSpaceman(user);

  useEffect(() => {
    // Fetch if we have at least a spaceId (workspaceId is optional bonus)
    if (spaceId || workspaceId) {
      fetchBlockers();
    } else {
      setLoading(false);
    }
  }, [workspaceId, spaceId, isWorkspaceView]);

  const fetchBlockers = async () => {
    setLoading(true);

    try {
      let query = supabase
        .from('clipad_blockers')
        .select(`
          *,
          blocked_person:blocked_person_id(id, full_name, avatar_url),
          blocking_person:blocking_person_id(id, full_name, avatar_url)
        `)
        .order('detected_at', { ascending: false });

      // Filter by space if in space view, otherwise by workspace
      if (!isWorkspaceView && spaceId) {
        query = query.eq('team_space_id', spaceId);
      } else if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      }

      const { data, error } = await query;
      if (error) console.warn('BlockerRadar fetch:', error.message);
      if (data) setBlockers(data);
    } catch (err) {
      console.error('BlockerRadar error:', err);
    }
    setLoading(false);
  };

  const handleResolve = async (blockerId) => {
    const { error } = await supabase
      .from('clipad_blockers')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', blockerId);

    if (!error) {
      setBlockers(prev => prev.map(b => b.id === blockerId
        ? { ...b, status: 'resolved', resolved_at: new Date().toISOString() }
        : b
      ));
    }
  };

  const handleAddBlocker = async (e) => {
    e.preventDefault();
    if (!newBlocker.trim() || !user) return;
    setAdding(true);

    const { error } = await supabase.from('clipad_blockers').insert({
      description: newBlocker.trim(),
      blocked_person_id: user.id,
      workspace_id: workspaceId || null,
      team_space_id: spaceId || null,
      status: 'open',
      detected_at: new Date().toISOString(),
    });

    if (!error) {
      setNewBlocker('');
      setShowAdd(false);
      await fetchBlockers();
    }
    setAdding(false);
  };

  const handleAIDetect = async () => {
    if (!spaceId && !workspaceId) return;
    setDetecting(true);
    setDetectedCount(0);
    try {
      // Pull recent meeting summaries and transcripts
      let meetQuery = supabase
        .from('clipad_meeting_records')
        .select('id, title, ai_summary, transcript')
        .order('created_at', { ascending: false })
        .limit(5);
      if (spaceId) meetQuery = meetQuery.eq('space_id', spaceId);
      else if (workspaceId) meetQuery = meetQuery.eq('workspace_id', workspaceId);

      const { data: meetings } = await meetQuery;
      let totalAdded = 0;

      const detectionPromises = (meetings || []).map(async (meeting) => {
        const text = [meeting.ai_summary, meeting.transcript].filter(Boolean).join('\n');
        if (!text) return { found: [], meeting };

        const found = await detectBlockers(text, {
          team_space_id: spaceId || null,
          workspace_id: workspaceId || null,
          source_meeting_id: meeting.id,
        });
        return { found, meeting };
      });

      const detectionResults = await Promise.all(detectionPromises);

      for (const { found, meeting } of detectionResults) {
        for (const b of found) {
          // Avoid duplicate descriptions
          const existing = blockers.find(existing => existing.description.toLowerCase() === b.description.toLowerCase());
          if (existing) continue;

          const { error } = await supabase.from('clipad_blockers').insert(b);
          if (!error) {
            totalAdded++;
            await writeOrgEvent({
              space_id: spaceId,
              workspace_id: workspaceId,
              event_type: 'blocker_detected',
              title: b.description.substring(0, 80),
              actor_id: user?.id,
              source_id: meeting.id,
              source_table: 'clipad_meeting_records',
              importance: b.importance_score || 4,
            });
          }
        }
      }

      setDetectedCount(totalAdded);
      if (totalAdded > 0) await fetchBlockers();
    } catch (err) {
      console.warn('[BlockerRadar] AI Detect error:', err.message);
    } finally {
      setDetecting(false);
    }
  };

  if (!hasFullIntelligence) {
    if (isWorkspaceView) return null;
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-slate-200 dark:border-border/50 rounded-xl bg-slate-50 dark:bg-secondary/20">
        <ShieldAlert className="w-12 h-12 text-indigo-400 mb-4" />
        <h3 className="text-xl font-medium text-slate-700 dark:text-foreground mb-2">Blocker Radar Locked</h3>
        <p className="text-slate-500 dark:text-muted-foreground max-w-md">
          Upgrade to Pro or Enterprise to access Blocker Radar and instantly identify team bottlenecks.
        </p>
      </div>
    );
  }

  const openBlockers = blockers.filter(b => b.status === 'open');

  // Dashboard widget (compact) mode
  if (isWorkspaceView) {
    return (
      <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-slate-200 dark:border-border p-5 h-full flex flex-col">
        <div className="flex flex-wrap items-center justify-between mb-4 gap-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-orange-500 shrink-0" />
            <span className="leading-tight truncate">Blocker Radar</span>
          </h2>
          {openBlockers.length > 0 && (
            <span className="text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full shrink-0">
              {openBlockers.length} open
            </span>
          )}
        </div>
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : openBlockers.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
            <CheckCircle className="w-8 h-8 text-emerald-400 mb-2" />
            <p className="text-xs text-slate-500 dark:text-muted-foreground">No open blockers. Team is unblocked!</p>
          </div>
        ) : (
          <div className="space-y-2 flex-1">
            {openBlockers.slice(0, 3).map(b => (
              <div key={b.id} className="p-2.5 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-lg">
                <p className="text-xs text-slate-700 dark:text-foreground line-clamp-2">{b.description}</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  {b.blocked_person?.full_name || 'Someone'} is blocked
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full space view
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Network className="w-6 h-6 text-indigo-400" /> Blocker Radar
          </h2>
          <p className="text-sm text-slate-500 dark:text-muted-foreground mt-1">Live graph of who is blocked on whom.</p>
        </div>
        <div className="flex items-center gap-2">
          {hasFullIntelligence && (
            <button
              onClick={handleAIDetect}
              disabled={detecting}
              className="flex items-center gap-1.5 text-sm font-medium bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {detecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {detecting ? 'Detecting...' : detectedCount > 0 ? `${detectedCount} Found` : 'AI Detect'}
            </button>
          )}
          <button
            onClick={() => setShowAdd(v => !v)}
            className="flex items-center gap-1.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Report Blocker
          </button>
        </div>
      </div>

      {showAdd && (
        <form onSubmit={handleAddBlocker} className="bg-slate-50 dark:bg-secondary/50 border border-slate-200 dark:border-border rounded-xl p-4 flex gap-3">
          <input
            value={newBlocker}
            onChange={e => setNewBlocker(e.target.value)}
            placeholder="Describe what's blocking you..."
            className="flex-1 bg-white dark:bg-card border border-slate-200 dark:border-border rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            required
          />
          <button type="submit" disabled={adding} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50">
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      ) : blockers.length === 0 ? (
        <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-xl p-10 shadow-sm flex flex-col items-center text-center">
          <CheckCircle className="w-10 h-10 text-emerald-400 mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">All Clear!</h3>
          <p className="text-sm text-slate-500 dark:text-muted-foreground">No blockers detected. Team is moving freely.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {blockers.map(blocker => {
            const isBlockedMe = blocker.blocked_person_id === user?.id;
            const canResolve = isBlockedMe || isAdmin;
            const isOpen = blocker.status === 'open';

            return (
              <div
                key={blocker.id}
                className={`p-4 rounded-xl border transition-colors ${isOpen ? 'border-amber-500/30 bg-amber-500/5' : 'border-slate-200 dark:border-border/50 bg-slate-50 dark:bg-secondary/20 opacity-70'}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full border-2 border-rose-500 bg-slate-100 dark:bg-secondary flex items-center justify-center text-sm font-bold text-slate-600 dark:text-foreground overflow-hidden">
                        {blocker.blocked_person?.avatar_url
                          ? <img src={blocker.blocked_person.avatar_url} alt="" className="w-full h-full object-cover" />
                          : (blocker.blocked_person?.full_name?.[0] || '?')}
                      </div>
                      <span className="text-xs text-slate-400 mt-1 truncate w-16 text-center">
                        {blocker.blocked_person?.full_name?.split(' ')[0] || 'Someone'}
                      </span>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center px-2">
                      <div className="w-full h-px bg-gradient-to-r from-rose-500 via-amber-500 to-indigo-500 relative">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-card px-2 text-xs font-medium text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 rounded-full whitespace-nowrap">
                          is blocked by
                        </div>
                      </div>
                      <span className="text-sm text-slate-600 dark:text-foreground mt-3 text-center w-full truncate px-4">
                        {blocker.description}
                      </span>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full border-2 border-indigo-500 bg-slate-100 dark:bg-secondary flex items-center justify-center text-sm font-bold text-slate-600 dark:text-foreground overflow-hidden">
                        {blocker.blocking_person?.avatar_url
                          ? <img src={blocker.blocking_person.avatar_url} alt="" className="w-full h-full object-cover" />
                          : (blocker.blocking_person?.full_name?.[0] || '?')}
                      </div>
                      <span className="text-xs text-slate-400 mt-1 truncate w-16 text-center">
                        {blocker.blocking_person?.full_name?.split(' ')[0] || 'Unknown'}
                      </span>
                    </div>
                  </div>

                  {isOpen && canResolve && (
                    <button
                      onClick={() => handleResolve(blocker.id)}
                      className="text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1"
                    >
                      <CheckCircle className="w-3 h-3" /> Resolve
                    </button>
                  )}
                  {!isOpen && (
                    <span className="text-xs text-slate-400 font-medium">Resolved</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
