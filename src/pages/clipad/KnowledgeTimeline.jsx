import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { useCompanyId } from '@/hooks/useCompanyId';
import { format } from 'date-fns';
import { 
  History, Clock, Database, Search, 
  ExternalLink, RefreshCw, Box, ArrowLeft
} from 'lucide-react';
import { INTEGRATIONS } from '@/config/integrationsList';
import { useNavigate } from 'react-router-dom';

export default function KnowledgeTimeline() {
  const { user } = useAuth();
  const companyId = useCompanyId();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    if (companyId === undefined) return;
    loadTimeline();
  }, [companyId]);

  const loadTimeline = async () => {
    if (events.length === 0) setLoading(true);
    try {
      // Fetch imported knowledge
      const { data, error } = await supabase
        .from('clipad_imported_knowledge')
        .select('*')
        .eq('company_id', companyId)
        .order('imported_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      let eventsData = data || [];
      // Keep empty if no items found
      
      setEvents(eventsData);
    } catch (err) {
      console.error('Failed to load timeline:', err);
    } finally {
      setLoading(false);
    }
  };

  const getProviderIcon = (providerId) => {
    const intg = INTEGRATIONS.find(i => i.id === providerId || i.provider === providerId);
    return intg?.icon || '📄';
  };

  const filteredEvents = events.filter(e => {
    const matchesSearch = 
      (e.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (e.ai_summary || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.provider || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeFilter === 'all') return matchesSearch;
    return matchesSearch && e.provider === activeFilter;
  });

  const providers = [...new Set(events.map(e => e.provider))];

  return (
    <div className="min-h-full bg-slate-50 dark:bg-background text-slate-900 dark:text-slate-100 font-sans page-enter pb-12">
      {/* Header */}
      {/* Header */}
      <div className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/5 via-background to-background px-6 py-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(var(--primary-rgb),0.08),transparent_60%)] pointer-events-none" />
        <div className="max-w-5xl mx-auto relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                <History className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Knowledge Timeline</h1>
            </div>
          </div>
          <button
            onClick={loadTimeline}
            className="flex items-center gap-2 px-4 py-2 bg-card hover:bg-secondary text-foreground rounded-xl text-sm font-medium transition-colors border border-border shadow-xs self-start sm:self-auto"
          >
            <RefreshCw className="w-4 h-4 text-muted-foreground" /> Refresh
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 mt-8 flex flex-col md:flex-row gap-8">
        
        {/* Left Sidebar: Filters */}
        <div className="w-full md:w-64 shrink-0 space-y-6">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Search timeline..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-card border border-slate-200 dark:border-border rounded-xl pl-9 pr-4 py-2 text-sm text-slate-900 dark:text-foreground placeholder:text-slate-400 focus:outline-none focus:border-[#006065] dark:focus:border-[#fad503] transition-all shadow-sm"
            />
          </div>

          <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-2xl overflow-hidden shadow-md">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-border bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-bold text-sm text-slate-900 dark:text-foreground">Data Sources</h3>
            </div>
            <div className="p-2 space-y-1">
              <button
                onClick={() => setActiveFilter('all')}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${activeFilter === 'all' ? 'bg-[#006065] dark:bg-[#131A2C]/10 text-[#006065] dark:bg-card dark:text-[#fad503] font-bold' : 'text-slate-600 dark:text-muted-foreground hover:bg-slate-100 dark:hover:bg-accent hover:text-slate-900 dark:hover:text-white'}`}
              >
                <div className="flex items-center gap-2"><Database className="w-4 h-4" /> All Sources</div>
                <span className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md text-slate-500 dark:text-muted-foreground">{events.length}</span>
              </button>
              {providers.map(p => {
                const count = events.filter(e => e.provider === p).length;
                const intg = INTEGRATIONS.find(i => i.id === p || i.provider === p);
                return (
                  <button
                    key={p}
                    onClick={() => setActiveFilter(p)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${activeFilter === p ? 'bg-[#006065] dark:bg-[#131A2C]/10 text-[#006065] dark:bg-card dark:text-[#fad503] font-bold' : 'text-slate-600 dark:text-muted-foreground hover:bg-slate-100 dark:hover:bg-accent hover:text-slate-900 dark:hover:text-white'}`}
                  >
                    <div className="flex items-center gap-2"><span className="text-base">{intg?.icon || '📄'}</span> {intg?.name || p}</div>
                    <span className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md text-slate-500 dark:text-muted-foreground">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Content: Timeline */}
        <div className="flex-1">
          {loading && events.length === 0 ? (
            <div className="space-y-6 animate-pulse p-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0"></div>
                  <div className="flex-1 bg-white dark:bg-card border border-slate-200 dark:border-border rounded-2xl p-4 h-24"></div>
                </div>
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center p-12 border border-dashed border-slate-200 dark:border-border rounded-2xl bg-white dark:bg-card text-slate-900 dark:text-foreground">
              <Box className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              <h3 className="font-bold text-slate-900 dark:text-foreground mb-1">No knowledge found</h3>
              <p className="text-sm text-slate-500 dark:text-muted-foreground">Try adjusting your filters or search query.</p>
            </div>
          ) : (
            <div className="relative pl-6 border-l-2 border-[#006065] dark:border-border space-y-8">
              {filteredEvents.map((item, index) => {
                const intg = INTEGRATIONS.find(i => i.id === item.provider || i.provider === item.provider);
                
                return (
                  <div key={item.id} className="relative group">
                    {/* Timeline node */}
                    <div className="absolute -left-[35px] w-6 h-6 rounded-full bg-[#006065] dark:bg-[#131A2C] border-2 border-[#fad503] flex items-center justify-center shadow-sm">
                      <div className="w-2 h-2 rounded-full bg-[#fad503]" />
                    </div>
                    
                    <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-2xl p-5 hover:shadow-lg hover:border-[#006065] dark:border-border/30 dark:hover:border-[#006065] dark:border-border/50 transition-all text-slate-900 dark:text-foreground">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl" title={intg?.name}>{intg?.icon || '📄'}</span>
                          <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-[#006065] dark:text-[#fad503] rounded-md uppercase tracking-wider">
                            {item.content_type || 'Document'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" />
                          {format(new Date(item.imported_at), 'MMM d, yyyy • h:mm a')}
                        </div>
                      </div>
                      
                      <h3 className="text-base font-bold text-slate-900 dark:text-foreground mb-2 line-clamp-1 group-hover:text-[#006065] dark:group-hover:text-[#fad503] transition-colors">
                        {item.title || 'Untitled Knowledge Artifact'}
                      </h3>
                      
                      {item.ai_summary ? (
                        <p className="text-sm text-slate-600 dark:text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
                          {item.ai_summary}
                        </p>
                      ) : item.content ? (
                        <p className="text-sm text-slate-600 dark:text-muted-foreground mb-4 line-clamp-2 leading-relaxed opacity-90">
                          {item.content.substring(0, 150)}...
                        </p>
                      ) : null}
                      
                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100 dark:border-border">
                        <div className="flex items-center gap-2 text-xs">
                          {item.author && (
                            <span className="flex items-center gap-1 text-slate-600 dark:text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                              <span className="font-medium text-slate-900 dark:text-foreground">{item.author}</span>
                            </span>
                          )}
                          <span className="text-slate-400 flex items-center gap-1">
                            <Database className="w-3.5 h-3.5" /> Indexed automatically
                          </span>
                        </div>
                        
                        {item.url && (
                          <a 
                            href={item.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs font-bold text-[#fad503] hover:underline"
                          >
                            Open Source <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
