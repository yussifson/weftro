import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { useCompanyId } from '@/hooks/useCompanyId';
import { format } from 'date-fns';
import {
  Scale, AlertCircle, FileText, Calendar, CheckCircle2, Search,
  Target, Users, RefreshCw, Sparkles, ArrowLeft, Filter,
  Play
} from 'lucide-react';
import { INTEGRATIONS } from '@/config/integrationsList';

export default function DecisionLedger() {
  const { user } = useAuth();
  const companyId = useCompanyId();
  const navigate = useNavigate();
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProvider, setFilterProvider] = useState('all');

  useEffect(() => {
    if (companyId === undefined) return;
    loadDecisions();
  }, [companyId]);

  const loadDecisions = async () => {
    setLoading(true);
    try {
      // Load from clipad_decisions (native AI-detected decisions)
      const { data: nativeDecisions } = await supabase
        .from('clipad_decisions')
        .select('*')
        .eq('workspace_id', companyId)
        .order('created_at', { ascending: false })
        .limit(150);

      // Also load from knowledge imports
      const { data: withDecisions } = await supabase
        .from('clipad_imported_knowledge')
        .select('*')
        .eq('company_id', companyId)
        .not('ai_entities', 'is', null)
        .order('imported_at', { ascending: false })
        .limit(100);

      const { data: byKeyword } = await supabase
        .from('clipad_imported_knowledge')
        .select('*')
        .eq('company_id', companyId)
        .or('title.ilike.%decision%,ai_summary.ilike.%decided%,ai_summary.ilike.%decision%')
        .order('imported_at', { ascending: false })
        .limit(30);

      // Combine native decisions and knowledge-based ones
      const nativeMapped = (nativeDecisions || []).map(d => ({
        _type: 'native',
        id: d.id,
        nativeId: d.id,
        provider: 'clipad',
        title: d.decision_text,
        imported_at: d.created_at,
        ai_entities: { decisions: [d.decision_text] },
        ai_summary: d.rationale,
        importance_score: d.importance_score,
        confidence_score: d.confidence_score,
        outcome_status: d.outcome_status,
        status: d.status,
        ai_detected: d.ai_detected,
        participants: d.participants,
      }));

      let knowledgeItems = [...(withDecisions || []), ...(byKeyword || [])].map(d => ({ ...d, _type: 'knowledge' }));

      // Use mock data only if truly empty
      if (nativeMapped.length === 0 && knowledgeItems.length === 0) {
        knowledgeItems = [
          {
            _type: 'knowledge',
            id: 'mock-d1',
            provider: 'zoom',
            title: 'Q3 Product Roadmap Review',
            imported_at: new Date().toISOString(),
            ai_entities: { decisions: ['We will prioritize the new Orbit Flow integration over the mobile app redesign for Q3.', 'The budget for Q4 marketing campaign is approved at $50,000.'] },
            ai_summary: 'Discussion regarding the prioritization of features for the upcoming Q3 product roadmap. The team agreed on pushing the mobile redesign to next year.'
          },
          {
            _type: 'knowledge',
            id: 'mock-d2',
            provider: 'slack',
            title: '#engineering channel',
            imported_at: new Date(Date.now() - 86400000 * 2).toISOString(),
            ai_entities: { decisions: ['Switched from standard PostgreSQL indexing to pgvector for faster semantic search.', 'Agreed to adopt TailwindCSS for all new internal dashboards.'] },
            ai_summary: 'Technical debate about database indexing strategies and frontend styling frameworks for the new admin panel.'
          },
        ];
      }

      const allItems = [...nativeMapped, ...knowledgeItems];
      const seen = new Set();
      const unique = allItems.filter(item => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });

      const filtered = unique.filter(item => {
        if (item._type === 'native') return true;
        const hasAiDecision =
          item.ai_entities?.decisions?.length > 0 ||
          (typeof item.ai_entities?.decisions === 'string' && item.ai_entities.decisions.trim().length > 0);
        const titleKeyword = (item.title || '').toLowerCase().includes('decision');
        const summaryKeyword = (item.ai_summary || '').toLowerCase().includes('decid');
        return hasAiDecision || titleKeyword || summaryKeyword;
      });

      setDecisions(filtered);
    } catch (err) {
      console.error('Failed to load decisions:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDecisionText = (item) => {
    const d = item.ai_entities?.decisions;
    if (Array.isArray(d) && d.length > 0) return d;
    if (typeof d === 'string' && d.trim().length > 0) return [d];
    return null;
  };

  // Extract unique providers for filters
  const availableProviders = useMemo(() => {
    const providers = new Set(decisions.map(d => d.provider).filter(Boolean));
    return Array.from(providers);
  }, [decisions]);

  const filteredDecisions = decisions.filter(d => {
    const matchesSearch = 
      (d.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.ai_summary || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.provider || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesProvider = filterProvider === 'all' || d.provider === filterProvider;

    return matchesSearch && matchesProvider;
  });

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans page-enter pb-12">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-slate-200 dark:border-slate-800 bg-[#006065] text-white px-6 py-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,0.08),transparent_60%)] pointer-events-none" />
        <div className="max-w-5xl mx-auto relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => navigate('/integrations')} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/10/80 flex items-center justify-center transition-colors shrink-0">
                <ArrowLeft className="w-4 h-4 text-white/70" />
              </button>
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
                <Scale className="w-5 h-5 text-[#fad503]" />
              </div>
              <h1 className="text-2xl font-bold text-white">Decision Ledger</h1>
            </div>
            <p className="text-sm text-white/70 max-w-xl">
              An AI-powered ledger of every key decision extracted from your meetings, chats, docs, and tickets across all connected integrations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
              <input
                type="text"
                placeholder="Search decisions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all shadow-sm"
              />
            </div>
            <button
              onClick={loadDecisions}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-xl text-sm font-medium hover:bg-white/10/80 transition-colors shrink-0"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Filters Row */}
        {!loading && availableProviders.length > 0 && (
          <div className="max-w-5xl mx-auto relative z-10 mt-6 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-white/70 flex items-center gap-1 mr-2 uppercase tracking-wider">
              <Filter className="w-3 h-3" /> Source
            </span>
            <button
              onClick={() => setFilterProvider('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filterProvider === 'all' 
                  ? 'bg-[#fad503] text-[#006065] shadow-sm' 
                  : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
              }`}
            >
              All Sources
            </button>
            {availableProviders.map(provider => {
              const intg = INTEGRATIONS.find(i => i.id === provider || i.provider === provider);
              return (
                <button
                  key={provider}
                  onClick={() => setFilterProvider(provider)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    filterProvider === provider 
                      ? 'bg-[#fad503] text-[#006065] shadow-sm' 
                      : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
                  }`}
                >
                  {intg?.icon && <span className="w-4 h-4 flex items-center justify-center shrink-0">{intg.icon}</span>}
                  <span className="capitalize">{intg?.name || provider}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 mt-8">
        {loading && decisions.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl h-48"></div>
            ))}
          </div>
        ) : filteredDecisions.length === 0 ? (
          <div className="text-center p-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 max-w-2xl mx-auto mt-10">
            <AlertCircle className="w-8 h-8 text-slate-500 dark:text-slate-400 mx-auto mb-3 opacity-50" />
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">No decisions found</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {searchQuery || filterProvider !== 'all' 
                ? "No decisions match your current filters. Try adjusting your search or source."
                : "As your connected integrations sync and the AI processes your data, detected decisions will appear here."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">{filteredDecisions.length} decision record{filteredDecisions.length !== 1 ? 's' : ''} found.</p>
            {filteredDecisions.map((item) => {
              const intg = INTEGRATIONS.find(i => i.id === item.provider || i.provider === item.provider);
              const aiDecisions = getDecisionText(item);

              return (
                <div key={item.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-[#006065]/50 transition-all hover:shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#006065]/10 dark:bg-[#006065]/30 flex items-center justify-center shrink-0 border border-[#006065]/20 dark:border-[#006065]/50">
                      <CheckCircle2 className="w-6 h-6 text-[#006065] dark:text-[#fad503]" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-[#006065] dark:text-[#fad503] uppercase tracking-wider bg-[#006065]/10 dark:bg-[#006065]/30 px-2 py-0.5 rounded-md">
                          {item._type === 'native' ? 'ðŸ¤– AI-Detected' : 'ðŸ“„ Knowledge Source'}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {format(new Date(item.imported_at), 'MMM d, yyyy')}
                        </span>
                        {item.outcome_status && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                            item.outcome_status === 'successful' ? 'bg-[#006065]/10 dark:bg-[#006065]/30 border-[#006065]/30 dark:border-[#fad503]/30 text-[#00beac]' :
                            item.outcome_status === 'unsuccessful' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                            item.outcome_status === 'partial' ? 'bg-[#006065]/10 dark:bg-[#006065]/30 border-amber-500/30 text-amber-400' :
                            'bg-[#006065]/10 dark:bg-[#006065]/30 border-blue-500/30 text-blue-400'
                          }`}>
                            {item.outcome_status}
                          </span>
                        )}
                        {item.importance_score && (
                          <span className="text-xs text-slate-500 dark:text-slate-400">Impact: <span className="font-bold text-slate-900 dark:text-white">{item.importance_score}/10</span></span>
                        )}
                        {intg && (
                          <span className="text-xs flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
                            <span className="w-4 h-4 flex items-center justify-center shrink-0">{intg.icon}</span> {intg.name}
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">
                        {item.title || 'Decision Artifact'}
                      </h3>

                      {aiDecisions && (
                        <div className="space-y-2 mb-3">
                          {aiDecisions.map((d, i) => (
                            <div key={i} className="flex items-start gap-2.5 bg-amber-500/5 border border-amber-500/15 rounded-xl px-4 py-2.5">
                              <Sparkles className="w-3.5 h-3.5 text-[#006065] dark:text-[#fad503] shrink-0 mt-0.5" />
                              <p className="text-sm text-slate-900 dark:text-white leading-relaxed">{d}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {item.ai_summary && (
                        <div className="bg-white/10/30 rounded-xl px-4 py-3 border border-slate-200 dark:border-slate-800/50 mb-3">
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Context</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                            {item.ai_summary}
                          </p>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-xs mt-2">
                        {item.author && (
                          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                            <Users className="w-3.5 h-3.5" />
                            <span>Owner: <span className="font-medium text-slate-900 dark:text-white">{item.author}</span></span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                          <Target className="w-3.5 h-3.5" />
                          <span>Source: <span className="font-medium text-slate-900 dark:text-white capitalize">{item.provider}</span></span>
                        </div>
                        {item.content_type && (
                          <span className="capitalize text-slate-500 dark:text-slate-400 bg-white/10 px-2 py-0.5 rounded-md">{item.content_type}</span>
                        )}
                        {item._type === 'native' && (
                          <button
                            onClick={() => navigate(`${window.location.pathname.startsWith('/clipad') ? '/clipad' : ''}/decisions/${item.nativeId}/replay`)}
                            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-[#006065]/10 dark:bg-[#006065]/30 border border-indigo-500/20 text-[#006065] dark:text-[#fad503] rounded-lg text-xs font-semibold hover:bg-indigo-500/20 transition-colors"
                          >
                            <Play className="w-3 h-3" fill="currentColor" />
                            Replay Decision
                          </button>
                        )}
                        {item.url && !item._type !== 'native' && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-auto flex items-center gap-1 font-semibold text-[#006065] dark:text-[#fad503] hover:text-amber-700 hover:underline"
                          >
                            <FileText className="w-3.5 h-3.5" /> View Original
                          </a>
                        )}
                      </div>
                    </div>
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
