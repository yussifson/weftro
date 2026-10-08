import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/api/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import {
  CheckCircle2, XCircle, RefreshCw, Plug, Unplug, ExternalLink,
  Loader2, Clock, FileText,
  AlertCircle, Zap, Search, ArrowLeft, ChevronDown, Key, Eye, EyeOff, Trash2,
  Settings, Sliders,
  Lock, Globe, Users, User
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

import { INTEGRATIONS, CATEGORIES } from '@/config/integrationsList';
import CaptureInbox from '@/components/clipad/features/CaptureInbox';
import ConnectSettings from '@/components/clipad/features/ConnectSettings';

const isSuperAdmin = (user) => user?.role === 'super_admin' || user?.user_metadata?.role === 'super_admin';

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Main Component Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
export default function IntegrationsHub() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const companyId = user?.user_metadata?.company_id || user?.company_id;

  const [connected, setConnected] = useState({});
  const [knowledge, setKnowledge] = useState([]);
  const [totalKnowledge, setTotalKnowledge] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState({});
  const [disconnecting, setDisconnecting] = useState({});
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState('hub');
  const [activeTab, setActiveTab] = useState('connections'); // 'hub' or 'analytics'
  const [apiKeyModal, setApiKeyModal] = useState(null); // { provider, integration, fields }
  const [configModal, setConfigModal] = useState(null); // { integration, conn }
  const [customFreqInput, setCustomFreqInput] = useState({}); // { [connId]: hoursString }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Visibility scope selector state Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const [scopeModal, setScopeModal] = useState(null); // { integration } Ã¢â‚¬â€ pending connect
  const [selectedScope, setSelectedScope] = useState('personal'); // 'personal' | 'space' | 'company'
  const [selectedSpaceId, setSelectedSpaceId] = useState(''); // when scope='space'
  const [userSpaces, setUserSpaces] = useState([]); // spaces this user belongs to
  const [changeScopeModal, setChangeScopeModal] = useState(null); // { conn, integration } Ã¢â‚¬â€ change scope of existing

  const userRole = user?.role || user?.user_metadata?.role || 'member';
  const isAdmin = ['super_admin', 'admin'].includes(userRole);

  // Handle OAuth callback status
  useEffect(() => {
    const status = searchParams.get('status');
    const provider = searchParams.get('provider');
    const message = searchParams.get('message');

    if (status === 'success' && provider) {
      toast({ title: 'Ã¢Å“â€¦ Connected!', description: `${provider.replace('_', ' ')} connected successfully. Syncing your data...` });
      setSearchParams({});
      loadConnected();
    } else if (status === 'needs_api_key' && provider) {
      // API key-based provider Ã¢â‚¬â€ open the key input modal
      const integration = INTEGRATIONS.find(i => i.provider === provider || i.id === provider);
      setApiKeyModal({ provider, integration });
      setSearchParams({});
    } else if (status === 'error') {
      toast({ title: 'Connection Failed', description: message?.replace(/_/g, ' ') || 'Authentication failed.', variant: 'destructive' });
      setSearchParams({});
    }
   
  }, []);

  const loadConnected = useCallback(async () => {
    if (companyId === undefined) return;
    // Load only integrations visible to this user (RLS will enforce scoping once migration applied)
    const { data } = await supabase.from('clipad_integrations').select('*').eq('company_id', companyId);
    if (data) {
      const map = {};
      // Key by provider Ã¢â‚¬â€ personal integrations keyed as `${provider}_personal_${userId}`
      data.forEach(row => {
        const key = row.visibility === 'personal' && row.connected_by_user_id !== user?.id
          ? null  // skip other people's personal integrations
          : row.provider;
        if (key) map[key] = row;
      });
      setConnected(map);
    }
    setLoading(false);
  }, [companyId, user?.id]);

  // Load spaces this user belongs to (for the space scope selector)
  const loadUserSpaces = useCallback(async () => {
    if (!user?.id || !companyId) return;
    try {
      // 1. Fetch created spaces
      const { data: created } = await supabase
        .from('clipad_spaces')
        .select('id, name')
        .eq('company_id', companyId)
        .eq('created_by', user.id)
        .limit(100);

      // 2. Fetch member spaces
      const { data: memberRefs } = await supabase
        .from('clipad_space_members')
        .select('space_id')
        .eq('user_id', user.id)
        .limit(100);

      const memberSpaceIds = (memberRefs || []).map(m => m.space_id).filter(Boolean);
      let memberSpaces = [];
      if (memberSpaceIds.length > 0) {
        const { data: members } = await supabase
          .from('clipad_spaces')
          .select('id, name')
          .in('id', memberSpaceIds);
        memberSpaces = members || [];
      }

      // 3. Fetch public spaces
      const { data: publicSpaces } = await supabase
        .from('clipad_spaces')
        .select('id, name')
        .eq('company_id', companyId)
        .eq('is_private', false)
        .limit(100);

      // Combine and filter unique by ID
      const allSpacesMap = new Map();
      [...(created || []), ...memberSpaces, ...(publicSpaces || [])].forEach(s => {
        allSpacesMap.set(s.id, s);
      });

      const uniqueSpaces = Array.from(allSpacesMap.values());
      setUserSpaces(uniqueSpaces);

      // Set default selected space if not already set
      if (uniqueSpaces.length > 0) {
        setSelectedSpaceId(prev => prev || uniqueSpaces[0].id);
      }
    } catch (err) {
      console.error('Failed to load user spaces:', err);
    }
  }, [user?.id, companyId]);

  const loadKnowledge = useCallback(async () => {
    if (companyId === undefined) return;
    
    // Fetch total count
    const { count } = await supabase.from('clipad_imported_knowledge').select('*', { count: 'exact', head: true }).eq('company_id', companyId);
    if (count !== null) setTotalKnowledge(count);

    const { data } = await supabase.from('clipad_imported_knowledge').select('id, provider, content_type, title, url, imported_at, ai_summary').eq('company_id', companyId).order('imported_at', { ascending: false }).limit(20);
    if (data) setKnowledge(data);
  }, [companyId]);

  useEffect(() => {
    loadConnected();
    loadKnowledge();
    loadUserSpaces();
  }, [loadConnected, loadKnowledge, loadUserSpaces]);

  // Ã¢â€â‚¬Ã¢â€â‚¬ Open scope selector before connecting Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const handleConnect = (integration) => {
    if (!companyId) {
      toast({ title: 'Not authorized', description: 'You must belong to a company to connect integrations.', variant: 'destructive' });
      return;
    }
    // Default scope based on role: admins default to 'company', others to 'personal'
    setSelectedScope(isAdmin ? 'company' : 'personal');
    setSelectedSpaceId(userSpaces[0]?.id || '');
    setScopeModal({ integration });
  };

  // Ã¢â€â‚¬Ã¢â€â‚¬ Actually fire the connection after scope is chosen Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const confirmConnect = () => {
    const { integration } = scopeModal;
    setScopeModal(null);

    // Company-wide: admin only guard
    if (selectedScope === 'company' && !isAdmin) {
      toast({ title: 'Permission denied', description: 'Only admins can create company-wide integrations.', variant: 'destructive' });
      return;
    }

    const returnUrl = encodeURIComponent(window.location.href.split('?')[0]);
    const spaceParam = selectedScope === 'space' && selectedSpaceId ? `&space_id=${selectedSpaceId}` : '';
    const oauthUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/oauth-init?provider=${integration.provider}&company_id=${companyId}&user_id=${user.id}&integration_id=${integration.id}&visibility=${selectedScope}${spaceParam}&return_url=${returnUrl}`;
    window.location.href = oauthUrl;
  };

  // Ã¢â€â‚¬Ã¢â€â‚¬ Change scope of an already-connected integration Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const handleChangeScope = async () => {
    if (!changeScopeModal) return;
    const { conn } = changeScopeModal;

    // Security: company-wide scope requires admin
    if (selectedScope === 'company' && !isAdmin) {
      toast({ title: 'Permission denied', description: 'Only admins can set company-wide integrations.', variant: 'destructive' });
      return;
    }
    // Security: only admin or the owner can change scope
    if (!isAdmin && conn.connected_by_user_id !== user?.id) {
      toast({ title: 'Permission denied', description: 'You can only modify integrations you connected.', variant: 'destructive' });
      return;
    }

    try {
      const spaceIdVal = selectedScope === 'space' ? (selectedSpaceId || null) : null;
      const { error } = await supabase
        .from('clipad_integrations')
        .update({
          visibility: selectedScope,
          space_id: spaceIdVal,
          connected_by_user_id: user.id,
        })
        .eq('id', conn.id)
        .eq('company_id', companyId); // ensure cross-company update is impossible
      if (error) throw error;
      toast({ title: 'Ã¢Å“â€¦ Scope updated', description: `Integration is now ${selectedScope === 'company' ? 'company-wide' : selectedScope === 'space' ? 'space-level' : 'personal'}.` });
      setChangeScopeModal(null);
      await loadConnected();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleDisconnect = async (integration) => {
    const conn = connected[integration.provider] || connected[integration.id];
    if (!conn) return;

    // Security: only admin or the user who connected it can disconnect
    if (!isAdmin && conn.connected_by_user_id !== user?.id) {
      toast({ title: 'Permission denied', description: 'You can only disconnect integrations you connected.', variant: 'destructive' });
      return;
    }
    // Security: company-wide integrations require admin
    if (conn.visibility === 'company' && !isAdmin) {
      toast({ title: 'Permission denied', description: 'Only admins can disconnect company-wide integrations.', variant: 'destructive' });
      return;
    }

    setDisconnecting(prev => ({ ...prev, [integration.id]: true }));
    try {
      await supabase.from('clipad_integrations').delete()
        .eq('company_id', companyId)
        .eq('id', conn.id);
      toast({ title: 'Disconnected', description: `${integration.name} has been disconnected.` });
      await loadConnected();
    } catch (e) {
      toast({ title: 'Error', description: 'Could not disconnect.', variant: 'destructive' });
    } finally {
      setDisconnecting(prev => ({ ...prev, [integration.id]: false }));
    }
  };

  const handleUpdateSyncFrequency = async (connId, newFrequency) => {
    try {
      const { error } = await supabase
        .from('clipad_integrations')
        .update({ sync_frequency: newFrequency })
        .eq('id', connId);
      
      if (error) throw error;
      
      toast({ title: 'Success', description: `Auto-sync updated to ${newFrequency}.` });
      await loadConnected();
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to update auto-sync.', variant: 'destructive' });
    }
  };

  const handleSetCustomFrequency = async (connId) => {
    const hours = parseFloat(customFreqInput[connId]);
    if (!hours || hours <= 0) {
      toast({ title: 'Invalid', description: 'Enter a valid number of hours (e.g. 2, 4, 6).', variant: 'destructive' });
      return;
    }
    const freq = `Custom:${hours}h`;
    await handleUpdateSyncFrequency(connId, freq);
    setCustomFreqInput(prev => ({ ...prev, [connId]: '' }));
  };

  const handleSyncNow = async (integration, forceFull = false) => {
    try {
      const conn = connected[integration.provider] || connected[integration.id];
      if (!conn) return;

      setSyncing(prev => ({ ...prev, [integration.id]: true }));

      // Prepare database updates
      const updates = { sync_error: null };
      if (forceFull) {
        updates.sync_cursor = null;
        updates.sync_phase = 'full';
        updates.last_synced_at = null;
      }

      // Clear any sync error and reset pagination state if forcing full sync
      await supabase
        .from('clipad_integrations')
        .update(updates)
        .eq('id', conn.id);

      const { data: syncResult, error } = await supabase.functions.invoke('integration-sync', {
        body: { integrationId: conn.id, provider: integration.id }
      });
      if (error) throw error;

      const imported = syncResult?.imported || 0;
      const isInterrupted = syncResult?.interrupted || false;
      const descriptionText = isInterrupted 
        ? `${imported} items imported. Auto-sync is currently processing more pages in the background...`
        : `${imported} item${imported !== 1 ? 's' : ''} imported. AI is now processing the content...`;

      toast({ 
        title: forceFull ? `Ã°Å¸â€â€ž Full Sync Started` : `Ã¢Å“â€¦ ${integration.name} synced`, 
        description: descriptionText
      });

      // Trigger AI reprocessing for any items missing ai_summary
      setTimeout(async () => {
        try {
          const { data: unprocessed } = await supabase
            .from('clipad_imported_knowledge')
            .select('id, external_id')
            .eq('integration_id', conn.id)
            .is('ai_summary', null)
            .limit(20);

          if (unprocessed?.length > 0) {
            for (const item of unprocessed) {
              supabase.functions.invoke('integration-ai-processor', {
                body: { integrationId: conn.id, provider: integration.id, externalId: item.external_id }
              }).catch(() => {});
            }
          }
        } catch { /* ignore */ }
        loadConnected();
        loadKnowledge();
      }, 3000);
    } catch (e) {
      toast({ title: 'Sync failed', description: e.message || 'Could not sync.', variant: 'destructive' });
    } finally {
      setSyncing(prev => ({ ...prev, [integration.id]: false }));
    }
  };

  const clearSyncError = async (integration) => {
    const conn = connected[integration.provider] || connected[integration.id];
    if (!conn) return;
    try {
      await supabase.from('clipad_integrations').update({ sync_error: null }).eq('id', conn.id);
      setConnected(prev => ({ ...prev, [integration.id || integration.provider]: { ...conn, sync_error: null }}));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveApiKey = async (provider, keyData) => {
    if (companyId === undefined) return;
    try {
      const { data: existing } = await supabase
        .from('clipad_integrations')
        .select('id')
        .eq('company_id', companyId)
        .eq('provider', provider)
        // For personal integrations, scope to this user
        .eq('connected_by_user_id', user.id)
        .maybeSingle();

      const spaceIdForPayload = selectedScope === 'space' ? (selectedSpaceId || null) : null;

      const payload = {
        company_id: companyId,
        provider: provider,
        status: 'active',
        access_token: keyData.api_key || keyData.token || '',
        connected_by_user_id: user.id,
        visibility: selectedScope || 'personal',
        space_id: spaceIdForPayload,
        updated_at: new Date().toISOString(),
      };

      let error;
      if (existing) {
        const { error: err } = await supabase.from('clipad_integrations').update(payload).eq('id', existing.id);
        error = err;
      } else {
        const { error: err } = await supabase.from('clipad_integrations').insert([payload]);
        error = err;
      }

      if (error) throw error;
      toast({ title: 'Ã¢Å“â€¦ Connected!', description: `${provider.replace(/_/g, ' ')} connected (${selectedScope === 'company' ? 'company-wide' : selectedScope === 'space' ? 'space-level' : 'personal'}).` });
      setApiKeyModal(null);
      await loadConnected();
    } catch (e) {
      toast({ title: 'Connection Failed', description: e.message, variant: 'destructive' });
    }
  };

  const ALLOWED_FOR_EVERYONE = ['slack', 'ms_teams', 'outlook', 'google_workspace', 'gmail', 'google_drive', 'sharepoint', 'microsoft_onedrive', 'zoom', 'google_meet', 'github', 'gitlab', 'linear', 'asana', 'trello', 'clickup', 'monday', 'google_cloud'];

  const filteredIntegrations = INTEGRATIONS.filter(i => {
    const matchesCategory = activeCategory === 'All' || i.category === activeCategory;
    const matchesSearch = !searchQuery || i.name.toLowerCase().includes(searchQuery.toLowerCase()) || i.description.toLowerCase().includes(searchQuery.toLowerCase());
    if (!['super_admin', 'admin'].includes(userRole) && !ALLOWED_FOR_EVERYONE.includes(i.id)) return false;
    return matchesCategory && matchesSearch;
  });

  const connectedCount = Object.keys(connected).length;
  const knowledgeCount = totalKnowledge || knowledge.length;

  // Non-super admins will now see the main UI with filtered integrations
  return (
    <div className="min-h-full bg-background text-foreground pb-12" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Hero Header */}
      <div className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/5 via-background to-background px-6 py-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(var(--primary-rgb),0.08),transparent_60%)] pointer-events-none" />
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="flex items-start gap-4 mb-3">
            <button 
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-secondary transition-colors shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Plug className="w-5 h-5 text-primary" />
            </div>
            <div className="mt-1">
              <h1 className="text-2xl font-bold text-foreground">Capture</h1>
              <p className="text-sm text-muted-foreground">Connect your tools. Capture organizational memory.</p>
            </div>
          </div>
          {/* Stats row */}
          <div className="flex flex-wrap gap-4 mt-6">
            {[
              { label: 'Connected', value: connectedCount, icon: CheckCircle2, color: 'text-[#006065] dark:text-[#fad503]' },
              { label: 'Knowledge Items', value: knowledgeCount, icon: FileText, color: 'text-blue-500' },
              { label: 'Available', value: INTEGRATIONS.length, icon: Zap, color: 'text-primary' },
            ].map(stat => (
              <div key={stat.label} className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2.5">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <span className="font-bold text-foreground">{stat.value}</span>
                <span className="text-muted-foreground text-sm">{stat.label}</span>
              </div>
            ))}
          
            </div>
            
            <div className="flex gap-4 mt-8 border-b border-white/10">
              <button 
                onClick={() => setActiveTab('connections')}
                className={`pb-3 px-1 text-sm font-bold border-b-2 transition-colors ${activeTab === 'connections' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                Connections & Sources
              </button>
              <button 
                onClick={() => setActiveTab('inbox')}
                className={`pb-3 px-1 text-sm font-bold border-b-2 transition-colors ${activeTab === 'inbox' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                Capture Inbox
                </button>

                {isConnectEnabled && (
                  <button 
                    onClick={() => setActiveTab('connect')}
                    className={`pb-3 px-1 text-sm font-bold border-b-2 transition-colors ${activeTab === 'connect' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                  >
                    Developer API
                  </button>
                )}
            </div>
          </div>

      </div>
      <div className="max-w-5xl mx-auto px-4 md:px-6 mt-8 space-y-8">

        {activeTab === 'inbox' ? (
            <CaptureInbox />
          ) : activeTab === 'connect' && isConnectEnabled ? (
            <ConnectSettings />
          ) : (
            <>
            {/* Modern Tab Filters */}
        <div className="flex items-center overflow-x-auto hide-scrollbar bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-xl mb-8 w-full">
          {CATEGORIES.map(cat => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-5 py-2 text-sm font-bold transition-all rounded-lg whitespace-nowrap ${isActive ? 'bg-white dark:bg-card text-[#006065] dark:text-[#fad503] shadow-sm ring-1 ring-black/5 dark:ring-white/10' : 'text-slate-500 dark:text-muted-foreground hover:text-slate-700 dark:text-muted-foreground dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5'}`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Ã¢â€â‚¬Ã¢â€â‚¬ My Connections Panel (scoped view) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
        {connectedCount > 0 && (() => {
          const personal = Object.entries(connected).filter(([, c]) => c.visibility === 'personal' || (!c.visibility && c.connected_by_user_id === user?.id));
          const space    = Object.entries(connected).filter(([, c]) => c.visibility === 'space');
          const company  = Object.entries(connected).filter(([, c]) => c.visibility === 'company' || (!c.visibility && !c.connected_by_user_id));

          const ScopeGroup = ({ label, items, icon: Icon, color, bg, pill }) => items.length === 0 ? null : (
            <div>
              <div className={`flex items-center gap-2 mb-2`}>
                <Icon className={`w-3.5 h-3.5 ${color}`} />
                <span className={`text-xs font-bold ${color}`}>{label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${pill}`}>{items.length}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {items.map(([provider, conn]) => {
                  const intg = INTEGRATIONS.find(i => i.provider === provider || i.id === provider);
                  if (!intg) return null;
                  const canEdit = isAdmin || conn.connected_by_user_id === user?.id;
                  return (
                    <div key={provider} className={`flex items-center gap-2 bg-white dark:bg-card text-slate-900 dark:text-foreground border ${bg} rounded-xl px-3 py-1.5 group shadow-sm`}>
                      <span className="text-base">{intg.icon}</span>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-foreground">{intg.name}</span>
                        {conn.last_synced_at && <span className="text-[10px] text-muted-foreground">synced {new Date(conn.last_synced_at).toLocaleDateString()}</span>}
                      </div>
                      {canEdit && (
                        <button
                          onClick={() => { setSelectedScope(conn.visibility || 'personal'); setSelectedSpaceId(conn.space_id || ''); setChangeScopeModal({ conn, integration: intg }); }}
                          className="opacity-0 group-hover:opacity-100 ml-1 p-1 rounded-lg hover:bg-secondary transition-all"
                          title="Change who can access this integration"
                        >
                          <Settings className="w-3 h-3 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );

          return (
            <div className="bg-[#006065] dark:bg-card border border-[#006065] dark:border-border rounded-2xl p-5 space-y-4">
              <h2 className="font-bold text-sm text-[#006065] dark:text-[#fad503] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> {connectedCount} Active Connection{connectedCount !== 1 ? 's' : ''}
                <span className="ml-auto text-[10px] text-muted-foreground font-normal">Hover a card to change scope</span>
              </h2>
              <ScopeGroup label="Personal Ã¢â‚¬â€ Only you" items={personal} icon={User} color="text-[#006065] dark:text-[#fad503]" bg="border-[#006065] dark:border-border/20" pill="bg-[#006065] dark:bg-card text-[#006065] dark:text-[#fad503]" />
              <ScopeGroup label="Space-level" items={space} icon={Users} color="text-[#006065] dark:text-[#fad503]" bg="border-[#006065] dark:border-border/20" pill="bg-[#006065] dark:bg-card text-[#006065] dark:text-[#fad503]" />
              <ScopeGroup label="Company-wide Ã¢â‚¬â€ Everyone" items={company} icon={Globe} color="text-[#006065] dark:text-[#fad503]" bg="border-[#006065] dark:border-border/20" pill="bg-[#006065] dark:bg-card text-[#006065] dark:text-[#fad503]" />
            </div>
          );
        })()}

        {/* Integration Cards Grid */}
        <div>
          <h2 className="text-base font-bold text-foreground mb-4">
            {activeCategory === 'All' ? 'All Integrations' : activeCategory}
            <span className="ml-2 text-muted-foreground font-normal text-sm">({filteredIntegrations.length})</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
            {filteredIntegrations.map(integration => {
              const conn = connected[integration.provider] || connected[integration.id];
              const isConnected = !!conn;
              const isSyncing = syncing[integration.id];
              const isDisconnecting = disconnecting[integration.id];
              const isAllowedToConnect = ALLOWED_FOR_EVERYONE.includes(integration.id);

              return (
                <div
                  key={integration.id}
                  className={`group relative bg-white dark:bg-card border ${isConnected ? 'border-[#006065] dark:border-border ring-1 ring-[#006065]/10' : 'border-slate-200 dark:border-border'} rounded-2xl p-6 flex flex-col gap-5 shadow-sm hover:shadow-lg transition-all duration-300 ${!isAllowedToConnect ? 'opacity-75' : 'hover:-translate-y-1'}`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${integration.color} border ${integration.border} flex items-center justify-center text-2xl shadow-sm shrink-0`}>
                        {integration.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-foreground text-sm">{integration.name}</h3>
                          {isConnected && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-[#006065] dark:bg-[#131A2C]/10 text-[#006065] dark:text-[#fad503] rounded-full text-[10px] font-bold">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#006065] dark:bg-[#fad503] animate-pulse" />
                              Connected
                            </span>
                          )}
                          {isConnected && conn?.visibility === 'personal' && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-[#006065] dark:bg-[#131A2C]/10 text-[#006065] dark:text-[#fad503] rounded-full text-[10px] font-semibold"><User className="w-2.5 h-2.5" /> Personal</span>
                          )}
                          {isConnected && conn?.visibility === 'space' && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-[#006065] dark:bg-[#131A2C]/10 text-[#006065] dark:text-[#fad503] rounded-full text-[10px] font-semibold"><Users className="w-2.5 h-2.5" /> Space</span>
                          )}
                          {isConnected && (conn?.visibility === 'company' || !conn?.visibility) && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-[#006065] dark:bg-[#131A2C]/10 text-[#006065] dark:text-[#fad503] rounded-full text-[10px] font-semibold"><Globe className="w-2.5 h-2.5" /> Company</span>
                          )}
                          {!ALLOWED_FOR_EVERYONE.includes(integration.id) && (
                            <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-[10px] font-bold">
                              Coming Soon
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{integration.category}</span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground leading-relaxed">{integration.description}</p>

                  {/* Import types */}
                  <div className="flex flex-wrap gap-1.5">
                    {integration.importTypes?.map(type => (
                      <span key={type} className="px-2 py-0.5 bg-secondary text-muted-foreground text-[11px] rounded-lg font-medium">{type}</span>
                    ))}
                  </div>

                  {/* Sync status */}
                  {isConnected && conn?.last_synced_at && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      Last synced: {new Date(conn.last_synced_at).toLocaleString()}
                    </div>
                  )}
                  {isConnected && conn?.sync_error && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-1.5 text-xs text-red-500 bg-red-500/10 p-2 rounded-lg">
                        <div className="flex gap-1.5">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span className="leading-snug break-all">{conn.sync_error}</span>
                        </div>
                        <button onClick={() => clearSyncError(integration)} className="hover:bg-red-500/20 rounded p-0.5 shrink-0 transition-colors">
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button
                        onClick={() => handleConnect(integration)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold transition-colors w-fit"
                      >
                        <RefreshCw className="w-3 h-3" /> Re-connect to fix
                      </button>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-auto pt-2 border-t border-border">
                    {isAllowedToConnect ? (
                      isConnected ? (
                        <>
                          <div className="flex items-center -space-x-px">
                            <button
                              onClick={() => handleSyncNow(integration, false)}
                              disabled={isSyncing}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-l-xl rounded-r-none bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors disabled:opacity-50 border-r border-primary/20"
                            >
                              {isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                              {isSyncing ? 'Syncing...' : 'Sync'}
                            </button>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  disabled={isSyncing}
                                  className="flex items-center justify-center w-6 h-8 rounded-r-xl rounded-l-none bg-primary/10 hover:bg-primary/20 text-primary transition-colors border-l-0"
                                  title="Sync Options"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="w-52 font-sans z-[100] p-2 rounded-2xl border border-border shadow-xl bg-card">
                                <DropdownMenuLabel className="text-[10px] text-muted-foreground font-bold px-3 py-1.5 uppercase tracking-widest">Options</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-border my-1" />
                                <DropdownMenuItem
                                  onClick={() => handleSyncNow(integration, true)}
                                  className="cursor-pointer px-3 py-2 my-0.5 rounded-xl text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-300 transition-all flex items-center gap-2"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-amber-500" />
                                  <span>Force Full Re-Sync</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                className="flex items-center justify-center w-8 h-8 rounded-xl bg-secondary/50 hover:bg-secondary text-muted-foreground transition-colors border border-transparent hover:border-border"
                                title={`Auto-Sync: ${conn.sync_frequency || 'Manual'}`}
                              >
                                <Clock className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="center" className="w-56 font-sans z-[100] p-2 rounded-2xl border border-border shadow-xl bg-card">
                              <DropdownMenuLabel className="text-[11px] text-muted-foreground font-bold px-3 py-2 uppercase tracking-widest text-center">Sync Frequency</DropdownMenuLabel>
                              <DropdownMenuSeparator className="bg-border my-1" />
                              {['Manual', '15 Minutes', 'Hourly', 'Daily', 'Weekly'].map(freq => {
                                const isSelected = conn.sync_frequency === freq;
                                return (
                                  <DropdownMenuItem
                                    key={freq}
                                    onClick={() => handleUpdateSyncFrequency(conn.id, freq)}
                                    className={`cursor-pointer px-4 py-2.5 my-0.5 rounded-xl text-sm font-medium transition-all ${isSelected ? 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20' : 'text-foreground hover:bg-secondary hover:translate-x-1'}`}
                                  >
                                    <div className="flex items-center w-full justify-between">
                                      <span>{freq === '15 Minutes' ? 'Every 15m' : freq}</span>
                                      {isSelected && <CheckCircle2 className="w-4 h-4 text-primary" />}
                                    </div>
                                  </DropdownMenuItem>
                                );
                              })}
                              {/* Custom frequency option */}
                              <DropdownMenuSeparator className="bg-border my-1" />
                              <div className="px-3 py-2">
                                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                  <Sliders className="w-3 h-3" /> Custom Interval
                                </div>
                                {conn.sync_frequency?.startsWith('Custom:') && (
                                  <div className="text-[11px] text-primary font-semibold mb-1.5 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Active: every {conn.sync_frequency.replace('Custom:', '').replace('h', '')}h
                                  </div>
                                )}
                                <div className="flex gap-1.5">
                                  <input
                                    type="number"
                                    min="0.5"
                                    step="0.5"
                                    placeholder="hrs"
                                    value={customFreqInput[conn.id] || ''}
                                    onChange={e => setCustomFreqInput(prev => ({ ...prev, [conn.id]: e.target.value }))}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSetCustomFrequency(conn.id); } }}
                                    onClick={e => e.stopPropagation()}
                                    className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:border-primary"
                                  />
                                  <button
                                    onClick={e => { e.stopPropagation(); handleSetCustomFrequency(conn.id); }}
                                    className="px-2.5 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors"
                                  >
                                    Set
                                  </button>
                                </div>
                              </div>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfigModal({ integration, conn }); }}
                            className="flex items-center justify-center w-8 h-8 rounded-xl bg-secondary/50 hover:bg-secondary text-muted-foreground transition-colors border border-transparent hover:border-border"
                            title="Configure import settings"
                          >
                            <Settings className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDisconnect(integration)}
                            disabled={isDisconnecting}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-semibold transition-colors disabled:opacity-50 ml-auto"
                            title="Disconnect"
                          >
                            {isDisconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unplug className="w-3.5 h-3.5" />}
                            <span className="hidden sm:inline">Disconnect</span>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleConnect(integration)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#006065] dark:bg-[#131A2C] hover:bg-[#006065] dark:bg-[#131A2C]/90 text-white text-xs font-bold transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
                        >
                          <Plug className="w-3.5 h-3.5" />
                          Connect
                        </button>
                      )
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Available in the next release</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Imported Knowledge */}
        {knowledge.length > 0 ? (
          <div>
            <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Recently Imported Knowledge
              <span className="ml-1 text-muted-foreground font-normal text-sm">({knowledge.length} items)</span>
            </h2>
            <div className="space-y-2">
              {knowledge.map(item => {
                const intg = INTEGRATIONS.find(i => i.provider === item.provider || i.id === item.provider);
                return (
                  <div key={item.id} className="flex items-start gap-3 bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors group">
                    <div className="text-xl shrink-0 mt-0.5">{intg?.icon || 'Ã°Å¸â€œâ€ž'}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-sm text-foreground truncate">{item.title || 'Untitled'}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-secondary text-muted-foreground rounded-md shrink-0">{item.content_type}</span>
                      </div>
                      {item.ai_summary && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{item.ai_summary}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[11px] text-muted-foreground">{intg?.name || item.provider}</span>
                        <span className="text-muted-foreground">Ã‚Â·</span>
                        <span className="text-[11px] text-muted-foreground">{new Date(item.imported_at).toLocaleDateString()}</span>
                        {item.url && (
                          <a href={item.url} target="_blank" rel="noopener noreferrer" className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                            <ExternalLink className="w-3 h-3 text-muted-foreground hover:text-primary" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : Object.keys(connected).length > 0 ? (
          <div className="bg-secondary/50 border border-border border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-3">
             <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
               <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
             </div>
             <div>
               <h3 className="font-bold text-foreground">Waiting for knowledge sync</h3>
               <p className="text-sm text-muted-foreground max-w-sm mt-1">
                 Your connected integrations are syncing in the background. If you see any errors on the cards above (like 403 or invalid_auth), you'll need to reconnect or clear the errors before data will appear here.
               </p>
             </div>
          </div>
        ) : null}

        {/* API credentials notice */}
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-sm text-amber-600 dark:text-amber-400 mb-1">API Credentials Required</h3>
            <p className="text-sm text-muted-foreground">
              To activate integrations, register OAuth apps on each provider's developer portal and add the credentials as Supabase secrets. 
              Contact your administrator or check the <strong>KERINT Integration Setup Guide</strong> for step-by-step instructions.
            </p>
          </div>
        </div>

            </>
          )}
{/* Ã¢â€â‚¬Ã¢â€â‚¬ Scope Selector Modal Ã¢â‚¬â€ shown BEFORE connecting any integration Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
      {scopeModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-card text-slate-900 dark:text-foreground border border-slate-200 dark:border-border rounded-2xl shadow-2xl w-full max-w-md p-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-lg shrink-0">
                {scopeModal.integration?.emoji || <Plug className="w-4 h-4" />}
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-foreground">
                  Connect {scopeModal.integration?.name}
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-muted-foreground">Choose who can access this integration</p>
              </div>
            </div>

            {/* Scope options - Sleek Segmented Control style */}
            <div className="flex bg-white/10 dark:bg-slate-800/80 p-1 mb-4" style={{ borderRadius: '10px' }}>
              <button
                type="button"
                onClick={() => setSelectedScope('personal')}
                style={{ borderRadius: '8px' }}
                className={`flex-1 py-1.5 text-xs font-bold transition-all text-center border-0 cursor-pointer ${
                  selectedScope === 'personal'
                    ? 'bg-white dark:bg-card text-slate-900 dark:text-foreground dark:bg-slate-700 text-primary shadow-sm border border-white/15/50 dark:border-slate-600/50'
                    : 'text-slate-500 dark:text-muted-foreground hover:text-white/90 bg-transparent'
                }`}
              >
                Personal
              </button>
              <button
                type="button"
                onClick={() => setSelectedScope('space')}
                style={{ borderRadius: '8px' }}
                className={`flex-1 py-1.5 text-xs font-bold transition-all text-center border-0 cursor-pointer ${
                  selectedScope === 'space'
                    ? 'bg-white dark:bg-card text-slate-900 dark:text-foreground dark:bg-slate-700 text-primary shadow-sm border border-white/15/50 dark:border-slate-600/50'
                    : 'text-slate-500 dark:text-muted-foreground hover:text-white/90 bg-transparent'
                }`}
              >
                Space
              </button>
              <button
                type="button"
                onClick={() => isAdmin && setSelectedScope('company')}
                disabled={!isAdmin}
                style={{ borderRadius: '8px' }}
                className={`flex-1 py-1.5 text-xs font-bold transition-all text-center border-0 ${
                  !isAdmin ? 'opacity-40 cursor-not-allowed text-slate-400 bg-transparent' :
                  selectedScope === 'company'
                    ? 'bg-white dark:bg-card text-slate-900 dark:text-foreground dark:bg-slate-700 text-primary shadow-sm border border-white/15/50 dark:border-slate-600/50'
                    : 'text-slate-500 dark:text-muted-foreground hover:text-white/90 bg-transparent'
                }`}
              >
                Company
              </button>
            </div>

            {/* Space Picker dropdown rendered below the cards when Space is selected */}
            {selectedScope === 'space' && (
              <div className="mb-4 p-2.5 rounded-xl bg-blue-50/30 dark:bg-blue-950/10 border border-blue-100/50 dark:border-blue-900/30 animate-in slide-in-from-top-1 duration-150">
                <label className="block text-[10px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-1.5">Select Target Space</label>
                {userSpaces.length > 0 ? (
                  <select
                    value={selectedSpaceId}
                    onChange={e => setSelectedSpaceId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-card text-slate-900 dark:text-foreground dark:bg-slate-800 border border-white/15 dark:border-border rounded-lg focus:outline-none focus:border-blue-500 text-white dark:text-slate-100"
                  >
                    {userSpaces.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-900/10 px-2.5 py-1.5 rounded-lg">
                    You are not a member of any spaces. Join a space first.
                  </p>
                )}
              </div>
            )}

            {/* Footer info note */}
            <div className="flex items-start gap-2 bg-transparent dark:bg-slate-800/40 rounded-xl p-2.5 mb-4">
              <Lock className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
              <p className="text-[10px] text-slate-500 dark:text-muted-foreground leading-relaxed">
                {selectedScope === 'personal' && 'Only you can access this connection data Ã¢â‚¬â€ not even admins.'}
                {selectedScope === 'space' && `Only members of "${userSpaces.find(s => s.id === selectedSpaceId)?.name || 'the space'}" will see this.`}
                {selectedScope === 'company' && 'All members of the company can query this integration via Orbit and Spotlight.'}
              </p>
            </div>
            </>
          )}
      {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setScopeModal(null)}
                style={{ borderRadius: '8px' }}
                className="flex-1 px-4 py-2 border border-white/15 dark:border-border text-xs font-bold text-white/90 dark:text-foreground/50 hover:bg-transparent dark:hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmConnect}
                disabled={selectedScope === 'space' && (!selectedSpaceId || userSpaces.length === 0)}
                style={{ borderRadius: '8px' }}
                className="flex-1 px-4 py-2 bg-[#006065] dark:bg-[#131A2C] hover:bg-[#006065] dark:bg-[#131A2C]/90 text-white text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-md"
              >
                <Plug className="w-3.5 h-3.5 text-white" /> Connect
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Change Scope Modal Ã¢â‚¬â€ for already-connected integrations Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
      {changeScopeModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-card text-slate-900 dark:text-foreground border border-slate-200 dark:border-border rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#006065] dark:bg-[#131A2C] text-[#fad503] flex items-center justify-center text-xl shrink-0">
                {changeScopeModal.integration?.icon || <Settings className="w-5 h-5 text-white" />}
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-foreground">Change Access Scope</h2>
                <p className="text-xs text-slate-500 dark:text-muted-foreground">{changeScopeModal.integration?.name} Ã‚Â· Who can access this?</p>
              </div>
            </div>

            <div className="space-y-3 mb-5">
              {/* Personal */}
              <button onClick={() => setSelectedScope('personal')} className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${selectedScope === 'personal' ? 'border-violet-500 bg-violet-50 dark:bg-card' : 'border-white/15 dark:border-border hover:border-white/20 dark:hover:border-slate-600'}`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${selectedScope === 'personal' ? 'bg-violet-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-muted-foreground'}`}><User className="w-4 h-4" /></div>
                <div>
                  <div className="flex items-center gap-2"><span className="text-sm font-bold text-slate-900 dark:text-foreground">Personal</span><span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-muted-foreground px-2 py-0.5 rounded-full">Only you</span></div>
                  <p className="text-xs text-slate-500 dark:text-muted-foreground mt-0.5">Only you can see and query data from this connection.</p>
                </div>
              </button>

              {/* Space */}
              <button onClick={() => setSelectedScope('space')} className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${selectedScope === 'space' ? 'border-blue-500 bg-blue-50 dark:bg-card' : 'border-white/15 dark:border-border hover:border-white/20 dark:hover:border-slate-600'}`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${selectedScope === 'space' ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-muted-foreground'}`}><Users className="w-4 h-4" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><span className="text-sm font-bold text-slate-900 dark:text-foreground">Space</span><span className="text-[10px] font-semibold bg-[#006065] dark:bg-card text-[#006065] dark:text-[#fad503] px-2 py-0.5 rounded-full">Space members only</span></div>
                  <p className="text-xs text-slate-500 dark:text-muted-foreground mt-0.5">Only members of the selected space can access this data.</p>
                  {selectedScope === 'space' && (
                    <div className="mt-3" onClick={e => e.stopPropagation()}>
                      {userSpaces.length > 0 ? (
                        <select value={selectedSpaceId} onChange={e => setSelectedSpaceId(e.target.value)} className="w-full px-3 py-2 text-xs font-medium bg-white dark:bg-card text-slate-900 dark:text-foreground dark:bg-slate-800 border border-blue-300 dark:border-blue-600 rounded-lg focus:outline-none">
                          {userSpaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      ) : (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-3 py-2 rounded-lg">You are not a member of any spaces yet.</p>
                      )}
                    </div>
                  )}
                </div>
              </button>

              {/* Company-wide */}
              <button onClick={() => isAdmin && setSelectedScope('company')} className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${!isAdmin ? 'opacity-40 cursor-not-allowed' : selectedScope === 'company' ? 'border-[#006065] dark:border-border bg-[#006065] dark:bg-card' : 'border-white/15 dark:border-border hover:border-white/20 dark:hover:border-slate-600'}`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${selectedScope === 'company' && isAdmin ? 'bg-[#006065] dark:bg-[#fad503] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-muted-foreground'}`}><Globe className="w-4 h-4" /></div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-900 dark:text-foreground">Company-wide</span>
                    <span className="text-[10px] font-semibold bg-[#006065] dark:bg-card text-[#006065] dark:text-[#fad503] px-2 py-0.5 rounded-full">Everyone</span>
                    {!isAdmin && <span className="text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> Admin only</span>}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-muted-foreground mt-0.5">All company members can see this data via OrbitFlow and Spotlight.</p>
                </div>
              </button>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setChangeScopeModal(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-white/15 dark:border-border text-sm font-semibold text-white/90 dark:text-foreground/50 hover:bg-transparent dark:hover:bg-accent transition-colors">Cancel</button>
              <button
                onClick={handleChangeScope}
                disabled={selectedScope === 'space' && (!selectedSpaceId || userSpaces.length === 0)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#006065] dark:bg-[#131A2C] hover:bg-[#006065] dark:bg-[#131A2C]/90 text-white text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#006065]/20"
              >
                <Lock className="w-4 h-4" /> Save Access
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* API Key Modal */}
      {apiKeyModal && (
        <ApiKeyModal
          integration={apiKeyModal.integration}
          provider={apiKeyModal.provider}
          onSave={handleSaveApiKey}
          onClose={() => setApiKeyModal(null)}
        />
      )}

      {/* Integration Config Modal */}
      {configModal && (
        <IntegrationConfigModal
          integration={configModal.integration}
          conn={configModal.conn}
          onSave={async (updates) => {
            try {
              const { error } = await supabase
                .from('clipad_integrations')
                .update({ 
                  settings: { 
                    ...(configModal.conn.settings || {}), 
                    ...updates,
                    sync_limit: updates.import_limit,
                  } 
                })
                .eq('id', configModal.conn.id);
              if (error) throw error;
              toast({ title: 'Ã¢Å“â€¦ Settings saved', description: 'Import configuration updated.' });
              setConfigModal(null);
              await loadConnected();
            } catch (e) {
              toast({ title: 'Error', description: e.message, variant: 'destructive' });
            }
          }}
          onClose={() => setConfigModal(null)}
        />
      )}
    </div>
  );
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ API Key Input Modal Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
const API_KEY_CONFIGS = {
  freshdesk:        { label: 'Freshdesk',             fields: [{ key: 'api_key', label: 'API Key', secret: true }, { key: 'subdomain', label: 'Subdomain (e.g. yourcompany)', secret: false }] },
  guru:             { label: 'Guru',                   fields: [{ key: 'api_key', label: 'API Key', secret: true }, { key: 'username', label: 'Username / Email', secret: false }] },
  trello:           { 
    label: 'Trello',                 
    fields: [{ key: 'api_key', label: 'API Key', secret: false }, { key: 'token', label: 'Personal Access Token', secret: true }],
    instructions: (
      <div className="text-xs text-muted-foreground bg-[#006065] dark:bg-card p-3 rounded-xl mb-4 leading-relaxed">
        <strong>1.</strong> Get your API Key from <a href="https://trello.com/app-key" target="_blank" rel="noreferrer" className="text-[#006065] dark:text-[#fad503] underline font-semibold">Trello Developer</a>.<br />
        <strong>2.</strong> Replace <code>YOUR_API_KEY</code> in the URL below and visit it in a new tab to authorize:<br />
        <code className="block mt-1 p-1 bg-white dark:bg-card text-slate-900 dark:text-foreground dark:bg-black rounded border overflow-hidden whitespace-nowrap text-ellipsis">https://trello.com/1/authorize?expiration=never&name=CliPad&scope=read&response_type=token&key=YOUR_API_KEY</code><br />
        <strong>3.</strong> Paste your API Key and the generated Token below.
      </div>
    )
  },
  stripe:           { label: 'Stripe',                 fields: [{ key: 'api_key', label: 'Secret Key (sk_live_...)', secret: true }] },
  datadog:          { label: 'Datadog',                fields: [{ key: 'api_key', label: 'API Key', secret: true }, { key: 'app_key', label: 'Application Key', secret: true }] },
  jenkins:          { label: 'Jenkins',                fields: [{ key: 'url', label: 'Jenkins URL', secret: false }, { key: 'username', label: 'Username', secret: false }, { key: 'api_key', label: 'API Token', secret: true }] },
  whatsapp:         { label: 'WhatsApp Business',      fields: [{ key: 'api_key', label: 'Permanent Access Token', secret: true }, { key: 'phone_id', label: 'Phone Number ID', secret: false }] },
  telegram:         { label: 'Telegram',               fields: [{ key: 'api_key', label: 'Bot Token', secret: true }] },
  aws:              { label: 'AWS',                    fields: [{ key: 'access_key_id', label: 'Access Key ID', secret: false }, { key: 'api_key', label: 'Secret Access Key', secret: true }, { key: 'region', label: 'Region (e.g. us-east-1)', secret: false }] },
  google_cloud:     { label: 'Google Cloud',           fields: [{ key: 'api_key', label: 'Service Account JSON Key', secret: true }] },
  sap:              { label: 'SAP',                    fields: [{ key: 'url', label: 'API URL', secret: false }, { key: 'api_key', label: 'API Key / Token', secret: true }] },
  oracle:           { label: 'Oracle',                 fields: [{ key: 'url', label: 'Oracle Instance URL', secret: false }, { key: 'api_key', label: 'API Key', secret: true }] },
  servicenow:       { label: 'ServiceNow',             fields: [{ key: 'subdomain', label: 'Instance (e.g. mycompany)', secret: false }, { key: 'username', label: 'Username', secret: false }, { key: 'api_key', label: 'Password / API Token', secret: true }] },
  workday:          { label: 'Workday',                fields: [{ key: 'tenant', label: 'Tenant Name', secret: false }, { key: 'api_key', label: 'Integration System User Password', secret: true }] },
  bamboohr:         { label: 'BambooHR',               fields: [{ key: 'subdomain', label: 'Company Domain', secret: false }, { key: 'api_key', label: 'API Key', secret: true }] },
  // PAT (Personal Access Token) providers
  github_enterprise:{ label: 'GitHub Enterprise',      fields: [{ key: 'url', label: 'GitHub Enterprise URL', secret: false }, { key: 'api_key', label: 'Personal Access Token', secret: true }] },
  airtable:         { label: 'Airtable',               fields: [{ key: 'api_key', label: 'Personal Access Token', secret: true }] },
  confluence_pat:   { label: 'Confluence (Server)',    fields: [{ key: 'url', label: 'Confluence Base URL', secret: false }, { key: 'username', label: 'Username', secret: false }, { key: 'api_key', label: 'Personal Access Token', secret: true }] },
  jira_pat:         { label: 'Jira (Server)',           fields: [{ key: 'url', label: 'Jira Base URL', secret: false }, { key: 'username', label: 'Username', secret: false }, { key: 'api_key', label: 'Personal Access Token', secret: true }] },
  gitlab_pat:       { label: 'GitLab (Self-Hosted)',   fields: [{ key: 'url', label: 'GitLab URL', secret: false }, { key: 'api_key', label: 'Personal Access Token', secret: true }] },
  notion_integration:{ label: 'Notion (Integration)', fields: [{ key: 'api_key', label: 'Internal Integration Token', secret: true }] },
  openai:           { label: 'OpenAI',                 fields: [{ key: 'api_key', label: 'API Key (sk-...)', secret: true }] },
  pagerduty:        { label: 'PagerDuty',              fields: [{ key: 'api_key', label: 'API Key', secret: true }] },
  monday:           { label: 'Monday.com',             fields: [{ key: 'api_key', label: 'API Token', secret: true }] },
};

function ApiKeyModal({ integration, provider, onSave, onClose }) {
  const config = API_KEY_CONFIGS[provider] || { label: provider, fields: [{ key: 'api_key', label: 'API Key / Token', secret: true }] };
  const [values, setValues] = React.useState({});
  const [showSecrets, setShowSecrets] = React.useState({});
  const [saving, setSaving] = React.useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(provider, values);
    setSaving(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-card text-slate-900 dark:text-foreground border border-slate-200 dark:border-border rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200 relative">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#006065] dark:bg-card flex items-center justify-center">
            <Key className="w-5 h-5 text-[#006065]" />
          </div>
          <div>
            <h2 className="text-base font-bold">Connect {integration?.name || config.label}</h2>
            <p className="text-xs text-muted-foreground">Enter your API credentials to connect</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {config.instructions && config.instructions}

          {config.fields.map(field => (
            <div key={field.key}>
              <label className="block text-xs font-semibold text-white/80 dark:text-muted-foreground mb-1.5">{field.label}</label>
              <div className="relative">
                <input
                  type={field.secret && !showSecrets[field.key] ? 'password' : 'text'}
                  required
                  value={values[field.key] || ''}
                  onChange={e => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-transparent dark:bg-slate-800/50 border border-border rounded-xl text-sm focus:outline-none focus:border-[#006065] dark:border-border focus:ring-2 focus:ring-[#006065]/10 pr-10"
                  placeholder={field.secret ? 'Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢' : ''}
                />
                {field.secret && (
                  <button type="button" onClick={() => setShowSecrets(p => ({ ...p, [field.key]: !p[field.key] }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showSecrets[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          ))}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-secondary transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl bg-[#006065] dark:bg-[#131A2C] hover:bg-[#006065] dark:bg-[#131A2C]/90 text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plug className="w-4 h-4" />}
              {saving ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Per-Integration Config Modal Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
function IntegrationConfigModal({ integration, conn, onSave, onClose }) {
  const meta = conn?.settings || {};
  const [importLimit, setImportLimit] = useState(meta.import_limit || 100);
  const [includeFilter, setIncludeFilter] = useState(meta.include_filter || '');
  const [excludeFilter, setExcludeFilter] = useState(meta.exclude_filter || '');
  const [syncAttachments, setSyncAttachments] = useState(meta.sync_attachments ?? true);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave({
      import_limit: Number(importLimit),
      include_filter: includeFilter,
      exclude_filter: excludeFilter,
      sync_attachments: syncAttachments,
    });
    setSaving(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-card text-slate-900 dark:text-foreground border border-slate-200 dark:border-border rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200 relative">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-card flex items-center justify-center text-xl">
            {integration?.icon || <Sliders className="w-5 h-5 text-blue-500" />}
          </div>
          <div>
            <h2 className="text-base font-bold">{integration?.name} Ã¢â‚¬â€ Import Settings</h2>
            <p className="text-xs text-muted-foreground">Control what gets imported and how</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white/80 dark:text-muted-foreground mb-1.5">
              Max items per sync
            </label>
            <input
              type="number"
              min={10}
              max={1000}
              value={importLimit}
              onChange={e => setImportLimit(e.target.value)}
              className="w-full px-3 py-2.5 bg-transparent dark:bg-slate-800/50 border border-border rounded-xl text-sm focus:outline-none focus:border-blue-500"
            />
            <p className="text-[11px] text-muted-foreground mt-1">Higher limits increase sync time. Default: 100.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/80 dark:text-muted-foreground mb-1.5">
              Include filter (optional)
            </label>
            <input
              type="text"
              value={includeFilter}
              onChange={e => setIncludeFilter(e.target.value)}
              placeholder="e.g. engineering, product, design"
              className="w-full px-3 py-2.5 bg-transparent dark:bg-slate-800/50 border border-border rounded-xl text-sm focus:outline-none focus:border-blue-500"
            />
            <p className="text-[11px] text-muted-foreground mt-1">Comma-separated channels/folders/labels to include.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/80 dark:text-muted-foreground mb-1.5">
              Exclude filter (optional)
            </label>
            <input
              type="text"
              value={excludeFilter}
              onChange={e => setExcludeFilter(e.target.value)}
              placeholder="e.g. random, general, archive"
              className="w-full px-3 py-2.5 bg-transparent dark:bg-slate-800/50 border border-border rounded-xl text-sm focus:outline-none focus:border-blue-500"
            />
            <p className="text-[11px] text-muted-foreground mt-1">Comma-separated channels/folders/labels to skip.</p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Sync Attachments</p>
              <p className="text-xs text-muted-foreground">Include file attachments in sync</p>
            </div>
            <button
              type="button"
              onClick={() => setSyncAttachments(p => !p)}
              className={`w-11 h-6 rounded-full transition-colors relative ${syncAttachments ? 'bg-blue-500' : 'bg-secondary border border-border'}`}
            >
              <div className={`w-4 h-4 bg-white dark:bg-card text-slate-900 dark:text-foreground border border-white/15 rounded-full absolute top-1 transition-all shadow-sm ${syncAttachments ? 'left-6' : 'left-1'}`} />
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-secondary transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

