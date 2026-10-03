import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { getMemories, supersedeMemory, getMemoryProvenance, MEMORY_TIERS, MEMORY_STATUS } from '@/lib/clipadMemoryService';
import { Database, Shield, Brain, Layers, Tag, CheckCircle2, AlertTriangle, History, ExternalLink, RefreshCw, Filter, Search, Sparkles } from 'lucide-react';

export default function MemoryVaultView({ companyId, userId, spaceId }) {
  const [memories, setMemories] = useState([]);
  const [selectedTier, setSelectedTier] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [provenanceModal, setProvenanceModal] = useState(null);
  const [correctingMemory, setCorrectingMemory] = useState(null);
  const [correctionText, setCorrectionText] = useState('');

  const fetchMemories = async () => {
    setLoading(true);
    try {
      const data = await getMemories({
        companyId,
        userId,
        spaceIds: spaceId ? [spaceId] : [],
        memoryTier: selectedTier !== 'all' ? selectedTier : null,
        queryText: query,
        status: MEMORY_STATUS.ACTIVE,
        limit: 100,
      });
      setMemories(data);
    } catch (err) {
      console.error('Failed to fetch memories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, [companyId, userId, spaceId, selectedTier]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchMemories();
  };

  const handleSupersede = async (e) => {
    e.preventDefault();
    if (!correctingMemory || !correctionText.trim()) return;

    try {
      await supersedeMemory(correctingMemory.id, {
        companyId,
        userId,
        teamSpaceId: correctingMemory.team_space_id,
        memoryTier: correctingMemory.memory_tier,
        memoryType: correctingMemory.memory_type,
        title: correctingMemory.title,
        content: correctionText,
        summary: correctionText.substring(0, 100),
      });

      setCorrectingMemory(null);
      setCorrectionText('');
      fetchMemories();
    } catch (err) {
      console.error('Failed to correct memory:', err);
    }
  };

  const showProvenance = async (memoryId) => {
    const prov = await getMemoryProvenance(memoryId);
    setProvenanceModal(prov);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none p-6">
          <Brain className="w-48 h-48 text-cyan-400" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-2 text-cyan-400 font-mono text-xs uppercase tracking-wider">
            <Shield className="w-4 h-4" /> Permission-Aware Memory Core
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
            Organizational Memory Core
          </h2>
          <p className="text-slate-300 text-sm md:text-base leading-relaxed">
            Clipad V3 preserves institutional knowledge across Personal, Team, and Organizational scopes with full permission safety and source provenance.
          </p>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Scopes', icon: Layers },
            { id: MEMORY_TIERS.PERSONAL, label: 'Personal', icon: Shield },
            { id: MEMORY_TIERS.TEAM, label: 'Team Space', icon: Brain },
            { id: MEMORY_TIERS.ORGANIZATIONAL, label: 'Organizational', icon: Database },
          ].map(tier => {
            const Icon = tier.icon;
            const active = selectedTier === tier.id;
            return (
              <button
                key={tier.id}
                onClick={() => setSelectedTier(tier.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-cyan-500 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tier.label}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSearch} className="flex items-center gap-2 w-full sm:w-72">
          <div className="relative w-full">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search memories..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          </div>
          <button type="submit" className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200">
            <Filter className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
        </form>
      </div>

      {/* Memory Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-12 text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mr-2" /> Loading Memory Nodes...
        </div>
      ) : memories.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
          <Brain className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">No memories found</h3>
          <p className="text-xs text-slate-500 mt-1">Ingest meetings, documents, or notes to build organizational knowledge.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {memories.map(mem => {
            const isPersonal = mem.memory_tier === MEMORY_TIERS.PERSONAL;
            const isTeam = mem.memory_tier === MEMORY_TIERS.TEAM;

            return (
              <div
                key={mem.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isPersonal
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                            : isTeam
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-[#006065]/20 text-[#004e52] dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {mem.memory_tier}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {mem.memory_type}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-mono text-cyan-600 dark:text-cyan-400">
                      <Sparkles className="w-3 h-3" />
                      {Math.round((mem.confidence_score || 1) * 100)}% confidence
                    </div>
                  </div>

                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">{mem.title}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3 mb-3">
                    {mem.content}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-2 truncate">
                    {mem.source_type && (
                      <span className="truncate flex items-center gap-1 font-mono text-[11px]">
                        <Tag className="w-3 h-3 shrink-0" />
                        {mem.source_type}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => showProvenance(mem.id)}
                      className="text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
                    >
                      <History className="w-3 h-3" /> View Source
                    </button>
                    <button
                      onClick={() => {
                        setCorrectingMemory(mem);
                        setCorrectionText(mem.content);
                      }}
                      className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      Update
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Provenance Modal */}
      {provenanceModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <History className="w-5 h-5 text-cyan-500" /> Source Provenance Trace
            </h3>
            <p className="text-xs text-slate-500 mb-4">Memory ID: {provenanceModal.memory_id}</p>

            <div className="space-y-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Memory Title:</span>
                <p className="text-slate-900 dark:text-white font-medium mt-0.5">{provenanceModal.title}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Source Type:</span>
                  <p className="text-slate-800 dark:text-slate-200 uppercase font-mono">{provenanceModal.source.type || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Speaker / Author:</span>
                  <p className="text-slate-800 dark:text-slate-200">{provenanceModal.source.speaker || 'System'}</p>
                </div>
              </div>
              {provenanceModal.source.url && (
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Source Link:</span>
                  <a
                    href={provenanceModal.source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 mt-0.5"
                  >
                    {provenanceModal.source.url} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setProvenanceModal(null)}
                className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm rounded-lg text-xs font-semibold"
              >
                Close Trace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Memory Correction / Supersede Modal */}
      {correctingMemory && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSupersede} className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-cyan-500" /> Update / Supersede Memory
            </h3>
            <p className="text-xs text-slate-500">
              Superseding this memory creates a new active version while preserving historical provenance.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Updated Content</label>
              <textarea
                value={correctionText}
                onChange={e => setCorrectionText(e.target.value)}
                rows={4}
                className="w-full p-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCorrectingMemory(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-cyan-500 text-white rounded-lg text-xs font-semibold hover:bg-cyan-600 shadow-sm"
              >
                Supersede & Publish
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

