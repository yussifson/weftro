import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { useCompanyId } from '@/hooks/useCompanyId';
import { useTheme } from 'next-themes';
import { generateText } from '@/lib/cloudflareAI';
import ReactMarkdown from 'react-markdown';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Network, RefreshCw, Loader2, Search, X, ExternalLink, ArrowLeft, Sparkles
} from 'lucide-react';
import { INTEGRATIONS } from '@/config/integrationsList';

// â”€â”€â”€ Provider color palette â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const PROVIDER_COLORS = {
  slack: '#fad503',
  github: '#fad503',
  notion: '#fad503',
  jira: '#fad503',
  google_drive: '#fad503',
  google_meet: '#fad503',
  zoom: '#fad503',
  confluence: '#fad503',
  linear: '#fad503',
  asana: '#fad503',
  clickup: '#fad503',
  trello: '#fad503',
  figma: '#fad503',
  miro: '#fad503',
  hubspot: '#fad503',
  salesforce: '#fad503',
  microsoft_teams: '#fad503',
  outlook: '#fad503',
  gmail: '#fad503',
  gitlab: '#fad503',
  bitbucket: '#fad503',
  default: '#fad503',
};

const getProviderColor = (provider) =>
  PROVIDER_COLORS[provider?.toLowerCase()] || PROVIDER_COLORS.default;

const RELATIONSHIP_COLORS = {
  mentions: '#006065',
  continues: '#006065',
  implements: '#006065',
  blocks: '#fad503',
  references: '#006065',
  related: '#006065',
};

// â”€â”€â”€ Custom Node Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function KnowledgeNode({ data, selected }) {
  const intg = INTEGRATIONS.find(i => i.id === data.provider || i.provider === data.provider);
  const color = getProviderColor(data.provider);

  return (
    <div
      className="relative rounded-2xl border-2 transition-all cursor-pointer bg-[#006065] text-white shadow-md p-3"
      style={{
        borderColor: selected ? '#fad503' : color,
        boxShadow: selected ? '0 0 0 3px #00beac, 0 4px 24px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.15)',
        minWidth: 160,
        maxWidth: 200,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: color, border: 'none', width: 8, height: 8 }} />
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 bg-white/10 text-white"
          >
            {intg?.icon || '📄'}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#fad503]">
              {data.provider?.replace('_', ' ')}
            </div>
          </div>
        </div>
        <p className="text-xs font-bold text-white line-clamp-2 leading-tight">
          {data.title || 'Untitled'}
        </p>
        {data.content_type && (
          <span
            className="inline-block mt-1.5 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-white/15 text-white/90"
          >
            {data.content_type}
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: color, border: 'none', width: 8, height: 8 }} />
    </div>
  );
}

const nodeTypes = { knowledge: KnowledgeNode };

// â”€â”€â”€ Layout: simple force-style grid placement â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function layoutNodes(nodes) {
  const COLS = Math.ceil(Math.sqrt(nodes.length)) || 1;
  const W = 240, H = 160;
  return nodes.map((node, i) => ({
    ...node,
    position: {
      x: (i % COLS) * W + (Math.floor(i / COLS) % 2 === 0 ? 0 : W / 2),
      y: Math.floor(i / COLS) * H,
    },
  }));
}

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function KnowledgeGraph() {
  const { user } = useAuth();
  const companyId = useCompanyId();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [stats, setStats] = useState({ nodes: 0, edges: 0, providers: 0 });
  const [filterProvider, setFilterProvider] = useState('all');
  const [filterRelation, setFilterRelation] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [providers, setProviders] = useState([]);
  const [aiInsights, setAiInsights] = useState('');
  const [aiInsightsOpen, setAiInsightsOpen] = useState(false);
  const [aiInsightsLoading, setAiInsightsLoading] = useState(false);

  const generateAIInsights = useCallback(async () => {
    if (aiInsightsLoading) return;
    setAiInsightsOpen(true);
    setAiInsights('');
    setAiInsightsLoading(true);
    try {
      const topProviders = providers.slice(0, 8).join(', ') || 'none';
      const relTypes = Object.keys(RELATIONSHIP_COLORS).join(', ');
      await generateText([
        {
          role: 'system',
          content: 'You are an enterprise knowledge analyst. Provide concise, actionable insights about a knowledge graph. Use markdown with bullet points. Be specific and short (under 200 words). DO NOT use <think> tags.',
        },
        {
          role: 'user',
          content: `Analyze this knowledge graph:\n- Total nodes: ${stats.nodes}\n- Total relationships: ${stats.edges}\n- Connected sources: ${stats.providers} (${topProviders})\n- Relationship types in use: ${relTypes}\n\nProvide:\n1. Top 2-3 observations about the knowledge landscape\n2. Which source appears dominant and what that means\n3. One recommendation to improve knowledge coverage`,
        },
      ], (accumulated) => {
        const clean = accumulated
          .replace(/<(think|thought)>[\s\S]*?<\/\1>/gi, '')
          .replace(/<(think|thought)>[\s\S]*$/gi, '')
          .replace(/<\/(think|thought)>/gi, '');
        setAiInsights(clean);
      }, { fast: true });
    } catch (e) {
      setAiInsights('Could not generate insights. Please try again.');
    } finally {
      setAiInsightsLoading(false);
    }
  }, [stats, providers, aiInsightsLoading]);

  const loadGraph = useCallback(async () => {
    if (companyId === undefined) return;
    setLoading(true);
    try {
      // Load knowledge items (nodes)
      const { data: items } = await supabase
        .from('clipad_imported_knowledge')
        .select('id, provider, content_type, title, url, ai_summary, imported_at')
        .eq('company_id', companyId)
        .order('imported_at', { ascending: false })
        .limit(1000);

      // Load relationships (edges)
      const { data: relationships } = await supabase
        .from('clipad_knowledge_relationships')
        .select('*')
        .eq('company_id', companyId)
        .limit(3000);

      let finalItems = items || [];

      // Fallback: If no imported knowledge items exist yet, synthesize graph nodes from core workspace data (meetings, decisions, spaces, videos)
      if (finalItems.length === 0) {
        const [mRes, dRes, sRes, vRes] = await Promise.all([
          Promise.resolve(supabase.from('clipad_meeting_records').select('id, title, ai_summary, created_at').eq('company_id', companyId).limit(20)).catch(() => ({ data: [] })),
          Promise.resolve(supabase.from('clipad_decisions').select('id, decision_text, rationale, created_at').eq('workspace_id', companyId).limit(20)).catch(() => ({ data: [] })),
          Promise.resolve(supabase.from('clipad_spaces').select('id, name, description, created_at').eq('company_id', companyId).limit(20)).catch(() => ({ data: [] })),
          Promise.resolve(supabase.from('clipad_videos').select('id, title, ai_summary, created_at').eq('company_id', companyId).limit(20)).catch(() => ({ data: [] })),
        ]);

        const synthesized = [];
        (mRes.data || []).forEach(m => synthesized.push({ id: m.id, provider: 'google_meet', content_type: 'meeting', title: m.title || 'Meeting Record', ai_summary: m.ai_summary, imported_at: m.created_at }));
        (dRes.data || []).forEach(d => synthesized.push({ id: d.id, provider: 'notion', content_type: 'decision', title: d.decision_text || 'Decision', ai_summary: d.rationale, imported_at: d.created_at }));
        (sRes.data || []).forEach(s => synthesized.push({ id: s.id, provider: 'slack', content_type: 'space', title: s.name || 'Team Space', ai_summary: s.description, imported_at: s.created_at }));
        (vRes.data || []).forEach(v => synthesized.push({ id: v.id, provider: 'zoom', content_type: 'video', title: v.title || 'Video Recording', ai_summary: v.ai_summary, imported_at: v.created_at }));
        
        finalItems = synthesized;
      }

      const itemSet = new Set(finalItems.map(i => i.id));
      const uniqueProviders = [...new Set(finalItems.map(i => i.provider).filter(Boolean))];
      setProviders(uniqueProviders);

      // Build nodes
      const rawNodes = finalItems.map(item => ({
        id: item.id,
        type: 'knowledge',
        data: { ...item },
        position: { x: 0, y: 0 },
      }));
      const positionedNodes = layoutNodes(rawNodes);

      // Build edges â€” only for items we have as nodes
      const rawEdges = (relationships || [])
        .filter(r => itemSet.has(r.source_id) && itemSet.has(r.target_id))
        .map(r => ({
          id: r.id,
          source: r.source_id,
          target: r.target_id,
          label: r.relationship_type,
          type: 'smoothstep',
          animated: r.relationship_type === 'implements' || r.relationship_type === 'continues',
          style: {
            stroke: RELATIONSHIP_COLORS[r.relationship_type] || '#6366F1',
            strokeWidth: Math.max(1, r.confidence_score * 3),
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: RELATIONSHIP_COLORS[r.relationship_type] || '#6366F1',
          },
          data: { confidence: r.confidence_score, type: r.relationship_type },
        }));

      setNodes(positionedNodes);
      setEdges(rawEdges);
      setStats({ nodes: positionedNodes.length, edges: rawEdges.length, providers: uniqueProviders.length });
    } catch (err) {
      console.error('Knowledge graph load error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId, setNodes, setEdges]);

  useEffect(() => { loadGraph(); }, [loadGraph]);

  // Apply filters to displayed nodes/edges
  const filteredNodes = nodes.filter(n => {
    const providerMatch = filterProvider === 'all' || n.data.provider === filterProvider;
    const searchMatch = !searchQuery ||
      (n.data.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.data.provider || '').toLowerCase().includes(searchQuery.toLowerCase());
    return providerMatch && searchMatch;
  });

  const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
  const filteredEdges = edges.filter(e => {
    const relMatch = filterRelation === 'all' || e.data?.type === filterRelation;
    const nodesMatch = filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target);
    return relMatch && nodesMatch;
  });

  return (
    <div className="flex flex-col h-full min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans page-enter">
      {/* Header */}
      <div className="relative border-b border-white/15 bg-[#006065] px-6 py-6 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/capture')} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shrink-0">
              <ArrowLeft className="w-4 h-4 text-white" />
            </button>
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
              <Network className="w-5 h-5 text-[#fad503]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Knowledge Graph</h1>
              <p className="text-xs text-white/70">AI-detected relationships across all your connected systems</p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6">
            {[
              { label: 'Nodes', value: stats.nodes },
              { label: 'Relationships', value: stats.edges },
              { label: 'Sources', value: stats.providers },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-xl font-black text-[#fad503]">{s.value}</div>
                <div className="text-xs text-white/70">{s.label}</div>
              </div>
            ))}
            <button
              onClick={loadGraph}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium transition-colors border border-white/15"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={generateAIInsights}
              className="flex items-center gap-2 px-4 py-2 bg-[#fad503] hover:bg-[#fad503]/90 text-[#006065] rounded-xl text-sm font-bold transition-all shadow-md"
            >
              <Sparkles className="w-4 h-4" />
              AI Insights
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="max-w-7xl mx-auto mt-4 flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/60" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search nodes..."
              className="pl-8 pr-3 py-1.5 text-xs bg-white/10 text-white border border-white/20 rounded-xl focus:outline-none focus:border-[#fad503] w-48 placeholder:text-white/50"
            />
          </div>

          <select
            value={filterProvider}
            onChange={e => setFilterProvider(e.target.value)}
            className="px-3 py-1.5 text-xs bg-[#005055] text-white border border-white/20 rounded-xl focus:outline-none focus:border-[#fad503]"
          >
            <option value="all">All Sources</option>
            {providers.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <select
            value={filterRelation}
            onChange={e => setFilterRelation(e.target.value)}
            className="px-3 py-1.5 text-xs bg-[#005055] text-white border border-white/20 rounded-xl focus:outline-none focus:border-[#fad503]"
          >
            <option value="all">All Relationships</option>
            {Object.keys(RELATIONSHIP_COLORS).map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          {/* Legend */}
          <div className="flex items-center gap-3 ml-auto">
            {Object.entries(RELATIONSHIP_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1">
                <div className="w-3 h-0.5 rounded-full" style={{ background: color }} />
                <span className="text-[10px] text-white/70 capitalize">{type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Graph Canvas */}
      <div className="flex-1 relative" style={{ minHeight: 600 }}>
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-[#fad503] animate-spin" />
              <p className="text-sm text-muted-foreground">Building knowledge graphâ€¦</p>
            </div>
          </div>
        ) : filteredNodes.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center max-w-md p-10 border border-dashed border-border rounded-2xl bg-card mx-4">
              <Network className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <h3 className="font-bold text-foreground mb-2">No graph data yet</h3>
              <p className="text-sm text-muted-foreground">
                Connect integrations and sync data. Once the AI processes your knowledge items, relationships will appear here automatically.
              </p>
            </div>
          </div>
        ) : (
          <ReactFlow
            colorMode={theme === 'dark' ? 'dark' : 'light'}
            nodes={filteredNodes}
            edges={filteredEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={(_, node) => setSelectedNode(node.data)}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.1}
            maxZoom={2}
            className="bg-transparent"
          >
            <Background color={theme === 'dark' ? '#00606540' : '#00606520'} gap={24} size={1} />
            <Controls />
            <MiniMap
              nodeColor={n => getProviderColor(n.data?.provider)}
            />
          </ReactFlow>
        )}

        {/* AI Insights Panel */}
        {aiInsightsOpen && (
          <div className="absolute top-4 left-4 w-80 bg-[#006065] text-white border border-white/15 rounded-2xl shadow-2xl p-5 z-20 animate-in fade-in slide-in-from-left-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-[#fad503]" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#fad503]">AI Analysis</div>
                  <div className="text-xs font-semibold text-white">Knowledge Insights</div>
                </div>
              </div>
              <button onClick={() => setAiInsightsOpen(false)} className="text-white/70 hover:text-white mt-0.5">
                <X className="w-4 h-4" />
              </button>
            </div>
            {aiInsightsLoading && !aiInsights ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="w-4 h-4 animate-spin text-[#fad503]" />
                Analyzing your knowledge graphâ€¦
              </div>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed">
                <ReactMarkdown>{aiInsights}</ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {/* Node detail panel */}
        {selectedNode && (
          <div className="absolute top-4 right-4 w-72 bg-[#006065] text-white border border-white/15 rounded-2xl shadow-2xl p-5 z-10 animate-in fade-in slide-in-from-right-4">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                  style={{ background: `${getProviderColor(selectedNode.provider)}25` }}
                >
                  {INTEGRATIONS.find(i => i.id === selectedNode.provider)?.icon || 'ðŸ“„'}
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {selectedNode.provider?.replace('_', ' ')}
                  </div>
                  <div className="text-xs font-semibold text-foreground capitalize">{selectedNode.content_type}</div>
                </div>
              </div>
              <button onClick={() => setSelectedNode(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <h3 className="font-bold text-sm text-foreground mb-2 leading-tight">
              {selectedNode.title || 'Untitled'}
            </h3>

            {selectedNode.ai_summary && (
              <p className="text-xs text-white/80 leading-relaxed mb-3 bg-white/10 rounded-xl p-3 border border-white/10">
                {selectedNode.ai_summary.substring(0, 200)}…
              </p>
            )}

            <div className="text-[10px] text-white/60 mb-3">
              Indexed {new Date(selectedNode.imported_at).toLocaleDateString()}
            </div>

            {selectedNode.url && (
              <a
                href={selectedNode.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-semibold text-[#fad503] hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" /> View Original Source
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
