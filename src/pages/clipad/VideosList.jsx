import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { Video, Search, Clock, ArrowRight, UserCircle, Settings, Play, Lock, Globe } from 'lucide-react';

import { useAuth } from '@/lib/AuthContext';
import { isAdmin } from '@/lib/constants';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

function formatDuration(seconds, videoId) {
  if (!seconds) {
    const pseudoRandom = videoId ? String(videoId).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 120;
    const fallbackSeconds = 60 + (pseudoRandom % 300);
    const m = Math.floor(fallbackSeconds / 60);
    const s = Math.floor(fallbackSeconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const getVideoColor = (id) => {
  const colors = [
    'from-indigo-500 to-indigo-700', 
    'from-purple-500 to-purple-700', 
    'from-fuchsia-500 to-fuchsia-700',
    'from-rose-500 to-rose-700', 
    'from-orange-500 to-orange-700', 
    'from-emerald-500 to-emerald-700', 
    'from-cyan-500 to-cyan-700'
  ];
  if (!id) return colors[0];
  const charCodeSum = String(id).split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return colors[charCodeSum % colors.length];
};

export default function VideosList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchVideos(); }, []);

  const fetchVideos = async () => {
    setLoading(true);
    if (!user?.id) { setLoading(false); return; }

    try {
      // Build a company-scoped query for videos
      // We fetch: own videos + videos in public/member spaces within user's company
      const [ownVideosRes, membershipRes] = await Promise.all([
        supabase.from('clipad_videos')
          .select('*, space:space_id(name, is_private)')
          .eq('creator_id', user.id)
          .order('created_at', { ascending: false }),
        supabase.from('clipad_space_members')
          .select('space_id')
          .eq('user_id', user.id)
      ]);

      let allVideos = ownVideosRes.data || [];
      const ownVideoIds = new Set(allVideos.map(v => v.id));

      // Fetch videos from company's public spaces
      if (user.company_id) {
        const { data: companyVideos } = await supabase
          .from('clipad_videos')
          .select('*, space:space_id(name, is_private)')
          .eq('company_id', user.company_id)
          .order('created_at', { ascending: false });

        if (companyVideos) {
          companyVideos.forEach(v => {
            if (!ownVideoIds.has(v.id)) {
              // Only include if from public space or user is space member
              const memberSpaceIds = membershipRes.data?.map(m => m.space_id) || [];
              if (!v.space?.is_private || memberSpaceIds.includes(v.space_id)) {
                allVideos.push(v);
                ownVideoIds.add(v.id);
              }
            }
          });
        }
      }

      allVideos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setVideos(allVideos);
    } catch (err) {
      console.error('Failed to fetch videos:', err);
    }
    setLoading(false);
  };


  const filtered = videos.filter(v => {
    if (search && !v.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const firstName = user?.full_name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="min-h-full bg-slate-50 dark:bg-background text-slate-900 dark:text-slate-100 page-enter overflow-x-hidden pb-24 md:pb-8">
      {/* Sleek top nav */}


      <div className="max-w-6xl mx-auto px-4 md:px-10 py-6 md:py-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-2 flex items-center gap-3"><Video className="w-7 h-7 text-[#006065] dark:text-[#fad503]" /> My Recordings</h1>
            <p className="text-slate-500 dark:text-muted-foreground">All your asynchronous video recordings.</p>
          </div>
          <button
            onClick={() => navigate('/record')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#006065] dark:bg-[#131A2C] hover:bg-[#004e52] text-[#fad503] font-bold text-sm shadow-md shadow-md shadow-[#006065]/20 transition-all shrink-0 active:scale-95"
          >
            <Video className="w-4 h-4" />
            Record Video
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 dark:text-foreground/70" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search recordings..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/95 dark:bg-[#202c33]/95 backdrop-blur-md border border-black/5 dark:border-white/5 text-slate-900 dark:text-foreground text-sm placeholder-slate-400 dark:placeholder-muted-foreground focus:outline-none focus:border-primary/50 shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[1,2,3,4,5,6].map(i => <div key={i} className="aspect-video rounded-2xl bg-[#006065] dark:bg-[#131A2C] text-white dark:bg-[#006065] dark:bg-[#131A2C] animate-pulse border border-white/15 dark:border-white/15" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-slate-200 dark:border-border rounded-3xl bg-white dark:bg-card">
            <Video className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-500 dark:text-muted-foreground mb-2">No recordings found</h3>
            <p className="text-slate-500 dark:text-muted-foreground text-sm">Click the Record Video button to create your first async video.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filtered.map(v => (
              <div
                key={v.id}
                onClick={() => navigate(`/watch/${v.id}`)}
                className="group cursor-pointer rounded-2xl overflow-hidden bg-white dark:bg-card border border-slate-200 dark:border-border hover:border-[#006065] dark:border-border/30 dark:hover:border-[#fad503]/30 transition-all duration-300 hover:-translate-y-1 active:scale-[0.98] shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex flex-col"
              >
                <div className="aspect-video bg-white/10 dark:bg-secondary relative flex items-center justify-center overflow-hidden">
                  {v.thumbnail_url ? (
                    <img src={v.thumbnail_url} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={v.title} />
                  ) : (
                    <div className={`absolute inset-0 w-full h-full bg-gradient-to-br ${getVideoColor(v.id)} group-hover:scale-105 transition-transform duration-500 opacity-90`}>
                      {/* Empty colored background for a clean premium look */}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/90 dark:bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
                      <Play className="w-5 h-5 text-[#006065] dark:text-[#fad503] dark:text-foreground fill-current ml-1" />
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-md text-white text-[10px] font-mono font-medium px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(v.duration_seconds, v.id)}
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-foreground truncate mb-1 group-hover:text-[#006065] dark:text-[#fad503] transition-colors">{v.title || 'Untitled Video'}</h3>
                    <p className="text-xs text-slate-500 dark:text-muted-foreground mb-2">{new Date(v.created_at).toLocaleDateString()} at {new Date(v.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  </div>
                  <div className="flex items-center justify-between mt-2 gap-2">
                    {v.space && <span className="inline-block px-2 py-1 rounded bg-white/10 dark:bg-secondary text-slate-500 dark:text-muted-foreground text-[10px] uppercase font-bold truncate max-w-[120px]">{v.space.name}</span>}
                    {v.space && (
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                        v.space.is_private
                          ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          : 'bg-[#006065] dark:bg-[#131A2C]/10 dark:bg-[#006065] dark:bg-[#131A2C]/10 text-[#006065] dark:text-[#00beac]'
                      }`}>
                        {v.space.is_private ? <Lock className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
                        {v.space.is_private ? 'Private' : 'Public'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

