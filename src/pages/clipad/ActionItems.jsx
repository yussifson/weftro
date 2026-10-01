import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { useCompanyId } from '@/hooks/useCompanyId';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import {
  CheckSquare, AlertCircle, RefreshCw, Search,
  Send, ChevronDown, Loader2, CheckCircle2, Circle, Clock, ArrowLeft
} from 'lucide-react';
import { INTEGRATIONS } from '@/config/integrationsList';

const EXPORT_TARGETS = [
  { id: 'jira', label: 'Jira', icon: 'ðŸ”µ', color: '#0052CC' },
  { id: 'clickup', label: 'ClickUp', icon: 'ðŸŸ£', color: '#7B68EE' },
  { id: 'asana', label: 'Asana', icon: 'ðŸ”´', color: '#F06A6A' },
  { id: 'linear', label: 'Linear', icon: 'âš¡', color: '#5E6AD2' },
  { id: 'github', label: 'GitHub Issue', icon: 'âš«', color: '#24292E' },
  { id: 'trello', label: 'Trello', icon: 'ðŸ”·', color: '#0079BF' },
  { id: 'slack', label: 'Slack', icon: 'ðŸ’œ', color: '#4A154B' },
];

const STATUS_OPTIONS = ['todo', 'in_progress', 'done'];

export default function ActionItems() {
  const { user } = useAuth();
  const companyId = useCompanyId();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState({});
  const [statusFilter, setStatusFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [providers, setProviders] = useState([]);
  const [expandedItem, setExpandedItem] = useState(null);
  const [localStatus, setLocalStatus] = useState({}); // track per-action completion

  const loadItems = useCallback(async () => {
    if (companyId === undefined) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('clipad_imported_knowledge')
        .select('id, provider, content_type, title, url, author, imported_at, ai_action_items, ai_summary')
        .eq('company_id', companyId)
        .not('ai_action_items', 'is', null)
        .order('imported_at', { ascending: false })
        .limit(200);

      let itemsData = data || [];

      // Inject mock data if empty
      if (itemsData.length === 0) {
        itemsData = [
          {
            id: 'mock-a1',
            provider: 'slack',
            title: 'Project Kickoff Meeting',
            imported_at: new Date().toISOString(),
            ai_action_items: ['Schedule follow-up meeting with design team', 'Finalize the Q3 budget estimates by Friday'],
            ai_summary: 'Kickoff meeting notes covering initial scope and responsibilities.'
          },
          {
            id: 'mock-a2',
            provider: 'linear',
            title: 'Issue ENG-102: Refactor auth',
            imported_at: new Date(Date.now() - 86400000).toISOString(),
            ai_action_items: ['Update the Supabase JWT token expiration setting', 'Write unit tests for the new login flow'],
            ai_summary: 'Discussion on moving from cookie-based auth to secure HttpOnly headers.'
          },
          {
            id: 'mock-a3',
            provider: 'zoom',
            title: 'Weekly Standup',
            imported_at: new Date(Date.now() - 86400000 * 3).toISOString(),
            ai_action_items: ['Review the PR for the new analytics dashboard', 'Send out the weekly progress report to stakeholders'],
            ai_summary: 'General updates from the engineering and marketing teams.'
          }
        ];
      }

      // Flatten into individual action item rows
      const flat = [];
      itemsData.forEach(row => {
        const actions = Array.isArray(row.ai_action_items) ? row.ai_action_items : [];
        actions.forEach((action, idx) => {
          if (typeof action === 'string' && action.trim().length > 5) {
            flat.push({
              id: `${row.id}-${idx}`,
              sourceId: row.id,
              text: action.trim(),
              provider: row.provider,
              sourceTitle: row.title,
              sourceUrl: row.url,
              author: row.author,
              importedAt: row.imported_at,
              contentType: row.content_type,
              ai_summary: row.ai_summary,
            });
          }
        });
      });

      setItems(flat);
      setProviders([...new Set(flat.map(i => i.provider).filter(Boolean))]);
    } catch (err) {
      console.error('Failed to load action items:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { loadItems(); }, [loadItems]);

  const handleExport = async (actionItem, target) => {
    const key = `${actionItem.id}-${target}`;
    setExporting(prev => ({ ...prev, [key]: true }));
    try {
      // Find connected integration for the target
      const { data: intg } = await supabase
        .from('clipad_integrations')
        .select('id, provider, status')
        .eq('company_id', companyId)
        .eq('provider', target)
        .eq('status', 'active')
        .single();

      if (!intg) {
        toast({
          title: `${target.charAt(0).toUpperCase() + target.slice(1)} not connected`,
          description: `Connect ${target} in the Integrations Hub first.`,
          variant: 'destructive',
        });
        return;
      }

      // For Slack â€” just post a message; for task tools â€” create a task
      const { data: result, error } = await supabase.functions.invoke('integration-sync', {
        body: {
          integrationId: intg.id,
          provider: target,
          action: 'create_task',
          payload: {
            title: actionItem.text,
            description: `Action item extracted from ${actionItem.provider} â€” "${actionItem.sourceTitle}"\n\nContext: ${actionItem.ai_summary || ''}`.substring(0, 500),
            source_url: actionItem.sourceUrl,
          },
        },
      });

      if (error) throw error;

      toast({
        title: `âœ… Exported to ${target.charAt(0).toUpperCase() + target.slice(1)}`,
        description: actionItem.text.substring(0, 60),
      });

      // Mark locally as exported
      setLocalStatus(prev => ({ ...prev, [actionItem.id]: 'exported' }));
    } catch (err) {
      toast({ title: 'Export failed', description: err.message, variant: 'destructive' });
    } finally {
      setExporting(prev => ({ ...prev, [key]: false }));
    }
  };

  const toggleStatus = (itemId) => {
    setLocalStatus(prev => {
      const cur = prev[itemId];
      if (!cur || cur === 'exported') return { ...prev, [itemId]: 'done' };
      if (cur === 'done') return { ...prev, [itemId]: 'todo' };
      return { ...prev, [itemId]: 'done' };
    });
  };

  const filtered = items.filter(item => {
    const pMatch = providerFilter === 'all' || item.provider === providerFilter;
    const sMatch = statusFilter === 'all' ||
      (statusFilter === 'done' && localStatus[item.id] === 'done') ||
      (statusFilter === 'todo' && !localStatus[item.id]);
    const qMatch = !searchQuery ||
      item.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.sourceTitle || '').toLowerCase().includes(searchQuery.toLowerCase());
    return pMatch && sMatch && qMatch;
  });

  const doneCount = items.filter(i => localStatus[i.id] === 'done').length;

  return (
    <div className="min-h-full bg-background text-foreground pb-12 font-sans page-enter">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-border bg-gradient-to-br from-emerald-500/5 via-background to-background px-6 py-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,0.07),transparent_60%)] pointer-events-none" />
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <button onClick={() => navigate('/integrations')} className="w-8 h-8 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors shrink-0">
                  <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                </button>
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                  <CheckSquare className="w-5 h-5 text-emerald-500" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">Action Items</h1>
              </div>
              <p className="text-sm text-muted-foreground max-w-xl">
                AI-extracted action items from all your meetings, documents, Slack messages, and tickets. Export them directly to your task management tools.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-black text-emerald-500">{doneCount}/{items.length}</div>
                <div className="text-xs text-muted-foreground">Resolved</div>
              </div>
              <button onClick={loadItems} className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-xl text-sm font-medium transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          {items.length > 0 && (
            <div className="mt-4 h-2 bg-secondary rounded-full overflow-hidden max-w-lg">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${(doneCount / items.length) * 100}%` }}
              />
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search action items..."
                className="pl-8 pr-3 py-1.5 text-xs bg-card border border-border rounded-xl focus:outline-none focus:border-emerald-500 w-52"
              />
            </div>
            <select
              value={providerFilter}
              onChange={e => setProviderFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-card border border-border rounded-xl focus:outline-none"
            >
              <option value="all">All Sources</option>
              {providers.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-card border border-border rounded-xl focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="todo">Todo</option>
              <option value="done">Done</option>
            </select>
          </div>
        </div>
      </div>

      {/* Items list */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 mt-8">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-[#006065] text-white dark:bg-[#006065] border border-white/10 dark:border-white/5 rounded-2xl h-20"></div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center p-12 border border-dashed border-border rounded-2xl bg-card max-w-2xl mx-auto">
            <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
            <h3 className="font-semibold text-foreground mb-1">No action items found</h3>
            <p className="text-sm text-muted-foreground">
              Action items are automatically extracted by AI as your integrations sync. Connect integrations in the Integrations Hub to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{filtered.length} action item{filtered.length !== 1 ? 's' : ''}</p>
            {filtered.map(item => {
              const isDone = localStatus[item.id] === 'done';
              const isExported = localStatus[item.id] === 'exported';
              const intg = INTEGRATIONS.find(i => i.id === item.provider || i.provider === item.provider);
              const isExpanded = expandedItem === item.id;

              return (
                <div
                  key={item.id}
                  className={`bg-card border rounded-2xl p-4 transition-all ${
                    isDone ? 'border-emerald-500/30 opacity-60' : 'border-border hover:border-emerald-500/30 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleStatus(item.id)}
                      className="mt-0.5 shrink-0 text-muted-foreground hover:text-emerald-500 transition-colors"
                    >
                      {isDone
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        : <Circle className="w-5 h-5" />
                      }
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium leading-relaxed ${isDone ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {item.text}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          {intg?.icon && <span>{intg.icon}</span>}
                          <span className="capitalize">{item.provider}</span>
                        </span>
                        <span className="text-[10px] text-muted-foreground truncate max-w-xs">
                          {item.sourceTitle}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          {format(new Date(item.importedAt), 'MMM d')}
                        </span>
                        {isExported && (
                          <span className="text-[10px] font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full">Exported</span>
                        )}
                      </div>
                    </div>

                    {/* Export button */}
                    {!isDone && (
                      <div className="relative shrink-0 group">
                        <button
                          onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-semibold transition-colors"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Export
                          <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Export targets dropdown */}
                  {isExpanded && (
                    <div className="mt-3 ml-8 flex flex-wrap gap-2 border-t border-border pt-3">
                      {EXPORT_TARGETS.map(target => {
                        const key = `${item.id}-${target.id}`;
                        const isExportingThis = exporting[key];
                        return (
                          <button
                            key={target.id}
                            onClick={() => handleExport(item, target.id)}
                            disabled={isExportingThis}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-xl text-xs font-semibold hover:bg-secondary transition-colors disabled:opacity-50"
                            style={{ color: target.color }}
                          >
                            {isExportingThis
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <span>{target.icon}</span>
                            }
                            {target.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
