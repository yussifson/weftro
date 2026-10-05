import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { useCompanyId } from '@/hooks/useCompanyId';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitBranch, ChevronRight, Calendar, Search, RefreshCw,
  Loader2, AlertCircle, Users, ExternalLink, Sparkles, Zap, ArrowLeft
} from 'lucide-react';
import { INTEGRATIONS } from '@/config/integrationsList';

const PROVIDER_COLORS = {
  slack: '#4A154B', github: '#24292E', notion: '#000000',
  jira: '#0052CC', google_drive: '#34A853', google_meet: '#00897B',
  zoom: '#2D8CFF', confluence: '#172B4D', linear: '#5E6AD2',
  asana: '#F06A6A', clickup: '#7B68EE', trello: '#0079BF',
  figma: '#F24E1E', hubspot: '#FF7A59', salesforce: '#00A1E0',
  microsoft_teams: '#6264A7', outlook: '#0078D4', gmail: '#EA4335',
  gitlab: '#FC6D26', bitbucket: '#0052CC',
};

const RELATION_VERBS = {
  mentions: 'mentioned in',
  continues: 'continued in',
  implements: 'implemented in',
  blocks: 'blocks',
  references: 'referenced in',
  related: 'related to',
};

const getColor = (provider) =>
  PROVIDER_COLORS[provider?.toLowerCase()] || '#6366F1';

export default function KnowledgeJourney() {
  const { user } = useAuth();
  const companyId = useCompanyId();
  const navigate = useNavigate();
  const [journeys, setJourneys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJourney, setSelectedJourney] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadJourneys = useCallback(async () => {
    if (companyId === undefined) return;
    setLoading(true);
    try {
      // Fetch relationships with full source+target node data
      const { data: relationships } = await supabase
        .from('clipad_knowledge_relationships')
        .select(`
          id,
          relationship_type,
          confidence_score,
          source_id,
          target_id
        `)
        .eq('company_id', companyId)
        .gte('confidence_score', 0.65)
        .order('confidence_score', { ascending: false })
        .limit(200);

      if (!relationships?.length) {
        const mockJourneys = [
          {
            item: {
              id: 'mj-1', provider: 'slack', title: 'Brainstorming: Auth Redesign', imported_at: new Date(Date.now() - 86400000*5).toISOString(), ai_summary: 'Initial discussion in #engineering about moving away from cookies.'
            },
            children: [
              {
                rel: 'continues',
                confidence: 0.95,
                node: {
                  item: {
                    id: 'mj-2', provider: 'zoom', title: 'Architecture Review', imported_at: new Date(Date.now() - 86400000*3).toISOString(), ai_summary: 'Video call deciding the final auth token flow.'
                  },
                  children: [
                    {
                      rel: 'implements',
                      confidence: 0.88,
                      node: {
                        item: { id: 'mj-3', provider: 'linear', title: 'ENG-102: Refactor auth', imported_at: new Date(Date.now() - 86400000).toISOString(), ai_summary: 'Ticket to implement the new HTTP-only auth flow.' },
                        children: []
                      }
                    }
                  ]
                }
              }
            ]
          },
          {
            item: {
              id: 'mj-4', provider: 'github', title: 'Issue #45: Dashboard performance', imported_at: new Date(Date.now() - 86400000*10).toISOString(), ai_summary: 'User reported slow load times on the main dashboard.'
            },
            children: [
              {
                rel: 'mentions',
                confidence: 0.91,
                node: {
                  item: { id: 'mj-5', provider: 'slack', title: 'Performance Sync', imported_at: new Date(Date.now() - 86400000*8).toISOString(), ai_summary: 'Identified the database queries causing the bottleneck.' },
                  children: []
                }
              }
            ]
          }
        ];
        setJourneys(mockJourneys);
        setLoading(false);
        return;
      }

      // Collect all unique IDs
      const allIds = [...new Set([
        ...relationships.map(r => r.source_id),
        ...relationships.map(r => r.target_id),
      ])];

      // Fetch the knowledge items
      const { data: items } = await supabase
        .from('clipad_imported_knowledge')
        .select('id, provider, content_type, title, url, author, imported_at, ai_summary, ai_entities')
        .in('id', allIds.slice(0, 200));

      const itemMap = {};
      (items || []).forEach(item => { itemMap[item.id] = item; });

      // Build adjacency list: source -> [{ rel, target }]
      const adj = {};
      relationships.forEach(r => {
        if (!adj[r.source_id]) adj[r.source_id] = [];
        adj[r.source_id].push({
          rel: r.relationship_type,
          targetId: r.target_id,
          confidence: r.confidence_score,
        });
      });

      // Find "root" nodes (appear as source but not as target in any relationship)
      const targets = new Set(relationships.map(r => r.target_id));
      const roots = [...new Set(relationships.map(r => r.source_id))].filter(id => !targets.has(id));

      // For each root, trace a journey up to depth 5
      const buildJourney = (rootId, visited = new Set(), depth = 0) => {
        if (depth > 4 || visited.has(rootId)) return null;
        visited.add(rootId);
        const item = itemMap[rootId];
        if (!item) return null;

        const children = (adj[rootId] || [])
          .map(({ rel, targetId, confidence }) => {
            const child = buildJourney(targetId, visited, depth + 1);
            if (!child) return null;
            return { rel, confidence, node: child };
          })
          .filter(Boolean);

        return { item, children };
      };

      const builtJourneys = roots
        .slice(0, 30)
        .map(rootId => buildJourney(rootId, new Set()))
        .filter(j => j && (j.children.length > 0 || adj[j.item.id]?.length > 0));

      // Sort by chain length (deeper = more interesting)
      const countDepth = (node) => {
        if (!node.children.length) return 1;
        return 1 + Math.max(...node.children.map(c => countDepth(c.node)));
      };

      builtJourneys.sort((a, b) => countDepth(b) - countDepth(a));
      setJourneys(builtJourneys.slice(0, 20));
    } catch (err) {
      console.error('Journey load error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { loadJourneys(); }, [loadJourneys]);

  const filtered = journeys.filter(j =>
    !searchQuery ||
    (j.item.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (j.item.provider || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-12 font-sans page-enter">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-slate-200 dark:border-slate-800 bg-[#006065] dark:bg-[#131A2C] text-white px-6 py-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.07),transparent_60%)] pointer-events-none" />
        <div className="max-w-5xl mx-auto relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => navigate('/integrations')} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/10/80 flex items-center justify-center transition-colors shrink-0">
                <ArrowLeft className="w-4 h-4 text-white/70" />
              </button>
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
                <GitBranch className="w-5 h-5 text-[#fad503]" />
              </div>
              <h1 className="text-2xl font-bold text-white">Knowledge Journey</h1>
            </div>
            <p className="text-sm text-white/70 max-w-xl">
              Trace how ideas, decisions, and work items flow across your organization â€” from a Slack message to a Notion doc to a GitHub release.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search journeys..."
                className="pl-8 pr-3 py-1.5 text-xs bg-white/10 text-white border border-white/20 rounded-xl focus:outline-none focus:border-[#fad503] w-52 placeholder:text-white/50"
              />
            </div>
            <button onClick={loadJourneys} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/10/80 text-white rounded-xl text-sm font-medium transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 mt-8">
        {loading ? (
          <div className="space-y-6 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 h-64"></div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center p-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 max-w-2xl mx-auto">
            <GitBranch className="w-8 h-8 text-slate-500 dark:text-slate-400 mx-auto mb-3 opacity-50" />
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">No knowledge journeys yet</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              As the AI detects relationships between your synced knowledge items, cross-system knowledge journeys will appear here â€” showing how ideas flow from a Slack message to a decision to a code commit.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">{filtered.length} knowledge journey{filtered.length !== 1 ? 's' : ''} detected</p>
            {filtered.map((journey, idx) => (
              <JourneyCard
                key={journey.item.id}
                journey={journey}
                onSelect={() => setSelectedJourney(selectedJourney?.item.id === journey.item.id ? null : journey)}
                isSelected={selectedJourney?.item.id === journey.item.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// â”€â”€â”€ Journey Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function JourneyCard({ journey, onSelect, isSelected }) {
  return (
    <div
      className={`bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden transition-all cursor-pointer ${
        isSelected ? 'border-[#006065]/50 dark:border-[#fad503]/50 shadow-md' : 'border-slate-200 dark:border-slate-800 hover:border-[#006065]/50 hover:shadow-sm'
      }`}
      onClick={onSelect}
    >
      <div className="p-5">
        {/* Chain preview */}
        <ChainPreview node={journey} depth={0} />
      </div>

      <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-200 dark:border-slate-800 bg-white/10/20 p-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Full Knowledge Chain</h4>
              <DetailChain node={journey} depth={0} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// â”€â”€â”€ Inline horizontal chain preview â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ChainPreview({ node, depth }) {
  const intg = INTEGRATIONS.find(i => i.id === node.item.provider || i.provider === node.item.provider);
  const color = getColor(node.item.provider);

  if (depth > 3) return <span className="text-slate-500 dark:text-slate-400 text-xs">â€¦</span>;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border"
        style={{ background: `${color}15`, borderColor: `${color}40`, color }}
      >
        <span>{intg?.icon || 'ðŸ“„'}</span>
        <span className="capitalize">{node.item.provider?.replace('_', ' ')}</span>
      </div>
      <p className="text-xs text-white font-medium max-w-xs truncate">{node.item.title}</p>
      {node.children.length > 0 && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
          <span className="text-[10px] italic text-slate-500 dark:text-slate-400">
            {RELATION_VERBS[node.children[0].rel] || node.children[0].rel}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
          <ChainPreview node={node.children[0].node} depth={depth + 1} />
        </>
      )}
    </div>
  );
}

// â”€â”€â”€ Vertical detailed chain â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function DetailChain({ node, depth }) {
  const intg = INTEGRATIONS.find(i => i.id === node.item.provider || i.provider === node.item.provider);
  const color = getColor(node.item.provider);

  return (
    <div>
      {/* Node */}
      <div className="flex items-start gap-3">
        {depth > 0 && (
          <div className="flex flex-col items-center shrink-0" style={{ marginLeft: depth * 16 }}>
            <div className="w-px h-4 bg-border" />
          </div>
        )}
        <div
          className="rounded-xl border p-3 flex-1 min-w-0"
          style={{ background: `${color}10`, borderColor: `${color}30`, marginLeft: depth > 0 ? depth * 16 : 0 }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">{intg?.icon || 'ðŸ“„'}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{node.item.provider?.replace('_', ' ')}</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-auto">
              {node.item.imported_at ? format(new Date(node.item.imported_at), 'MMM d, yyyy') : ''}
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{node.item.title || 'Untitled'}</p>
          {node.item.ai_summary && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{node.item.ai_summary}</p>
          )}
          {node.item.url && (
            <a href={node.item.url} target="_blank" rel="noopener noreferrer"
              className="text-[10px] font-semibold mt-2 flex items-center gap-1 hover:underline"
              style={{ color }}
              onClick={e => e.stopPropagation()}
            >
              <ExternalLink className="w-3 h-3" /> View source
            </a>
          )}
        </div>
      </div>

      {/* Children */}
      {node.children.map((child, i) => (
        <div key={i}>
          <div
            className="flex items-center gap-2 py-1 pl-4"
            style={{ marginLeft: (depth + 1) * 16 }}
          >
            <div className="w-px h-4 bg-border" />
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 italic">
              {RELATION_VERBS[child.rel] || child.rel} ({Math.round(child.confidence * 100)}% confidence)
            </span>
          </div>
          <DetailChain node={child.node} depth={depth + 1} />
        </div>
      ))}
    </div>
  );
}
