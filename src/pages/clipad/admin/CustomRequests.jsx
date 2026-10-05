import React, { useEffect, useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import {
  Sparkles,
  Building2,
  Mail,
  Phone,
  Globe,
  Users,
  Server,
  Clock,
  DollarSign,
  Search,
  Filter,
  CheckCircle2,
  Clock3,
  AlertCircle,
  Eye,
  Trash2,
  ExternalLink,
  Download,
  RefreshCw,
  Send,
  MessageSquare,
  FileText
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { OrbitLoader } from '@/components/ui/orbit-loader';

const STATUS_CONFIG = {
  pending: { label: 'Pending Review', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  contacted: { label: 'Contacted', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  in_progress: { label: 'In Negotiation', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
  closed: { label: 'Closed / Won', color: 'bg-[#006065] dark:bg-[#131A2C]/10 text-[#006065] dark:text-[#00beac] border-[#006065]/20' },
};

export default function CustomRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [isUpdatingNotes, setIsUpdatingNotes] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchRequests();

    // Subscribe to changes in contact & custom requests
    const channel = supabase
      .channel('admin:custom_requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clipad_custom_requests' }, fetchRequests)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clipad_contact_requests' }, fetchRequests)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchRequests() {
    setLoading(true);
    try {
      // 1. Fetch from clipad_custom_requests
      const { data: customData, error: customErr } = await supabase
        .from('clipad_custom_requests')
        .select('*')
        .order('created_at', { ascending: false });

      // 2. Fetch from clipad_contact_requests
      const { data: contactData } = await supabase
        .from('clipad_contact_requests')
        .select('*')
        .order('created_at', { ascending: false });

      // 3. Fetch audit logs for custom requests as backup
      const { data: auditData } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('action', 'custom_pricing_request')
        .order('created_at', { ascending: false });

      // 4. Fetch from enterprise_requests
      const { data: enterpriseData } = await supabase
        .from('enterprise_requests')
        .select('*')
        .order('created_at', { ascending: false });

      const combinedMap = new Map();

      // Process customData
      if (customData && !customErr) {
        customData.forEach((item) => {
          combinedMap.set(item.id || item.request_code, {
            ...item,
            source: 'custom_requests',
          });
        });
      }

      // Process contactData
      if (contactData) {
        contactData.forEach((item) => {
          let parsedDetails = {};
          try {
            if (item.message && item.message.startsWith('{')) {
              parsedDetails = JSON.parse(item.message);
            }
          } catch (_) {}

          const key = item.id || parsedDetails.requestId || item.email;
          if (!combinedMap.has(key)) {
            combinedMap.set(key, {
              id: item.id,
              request_code: parsedDetails.requestId || `REQ-${item.id?.slice(0, 6)?.toUpperCase() || 'LEGACY'}`,
              name: item.name,
              email: item.email,
              company: item.company,
              phone: parsedDetails.phone || item.phone || '',
              website: parsedDetails.website || item.website || '',
              team_size: parsedDetails.teamSize || item.team_size || 'N/A',
              deployment: parsedDetails.deployment || item.deployment || 'cloud',
              timeline: parsedDetails.timeline || item.timeline || 'Flexible',
              budget: parsedDetails.budget || item.budget || 'Custom',
              use_cases: parsedDetails.useCases || parsedDetails.interests || item.use_cases || [],
              requirements: parsedDetails.requirements || item.message || '',
              status: item.status || 'pending',
              admin_notes: item.admin_notes || '',
              created_at: item.created_at,
              source: 'contact_requests',
            });
          }
        });
      }

      // Process enterpriseData
      if (enterpriseData) {
        enterpriseData.forEach((item) => {
          const key = item.id || item.work_email;
          if (!combinedMap.has(key)) {
            const fullName = [item.first_name, item.last_name].filter(Boolean).join(' ') || item.name || 'Enterprise Lead';
            combinedMap.set(key, {
              id: item.id,
              request_code: `REQ-ENT-${item.id?.slice(0, 6)?.toUpperCase() || 'NEW'}`,
              name: fullName,
              email: item.work_email || item.email,
              company: item.company_name || item.company || 'Enterprise',
              phone: item.phone || '',
              website: item.website || '',
              team_size: item.user_count || 'N/A',
              deployment: item.deployment_type || 'cloud',
              timeline: 'Flexible',
              budget: 'Custom',
              use_cases: [],
              requirements: item.message || '',
              status: item.status || 'pending',
              admin_notes: '',
              created_at: item.created_at,
              source: 'enterprise_requests',
            });
          }
        });
      }

      // Process auditData if any missing
      if (auditData) {
        auditData.forEach((item) => {
          let parsedDetails = {};
          try {
            if (item.details && item.details.startsWith('{')) {
              parsedDetails = JSON.parse(item.details);
            }
          } catch (_) {}

          const key = parsedDetails.requestId || item.id;
          if (!combinedMap.has(key)) {
            combinedMap.set(key, {
              id: item.id,
              request_code: parsedDetails.requestId || `REQ-AUD-${item.id?.slice(0, 6)?.toUpperCase()}`,
              name: item.user_name || parsedDetails.fullName || 'Enterprise Lead',
              email: item.user_email || parsedDetails.workEmail || '',
              company: parsedDetails.company || item.user_name || 'Enterprise',
              phone: parsedDetails.phone || '',
              website: parsedDetails.website || '',
              team_size: parsedDetails.teamSize || 'N/A',
              deployment: parsedDetails.deployment || 'cloud',
              timeline: parsedDetails.timeline || 'Flexible',
              budget: parsedDetails.budget || 'Custom',
              use_cases: parsedDetails.useCases || parsedDetails.interests || [],
              requirements: parsedDetails.requirements || item.details || '',
              status: 'pending',
              admin_notes: '',
              created_at: item.created_at,
              source: 'audit_logs',
            });
          }
        });
      }

      const list = Array.from(combinedMap.values()).sort(
        (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
      );

      setRequests(list);
    } catch (e) {
      console.error('Error fetching custom requests:', e);
    } finally {
      setLoading(false);
    }
  }

  const handleUpdateStatus = async (reqId, newStatus) => {
    try {
      // Update in clipad_custom_requests
      try {
        await supabase.from('clipad_custom_requests').update({ status: newStatus }).eq('id', reqId);
      } catch (_) {}

      // Update in clipad_contact_requests
      try {
        await supabase.from('clipad_contact_requests').update({ status: newStatus }).eq('id', reqId);
      } catch (_) {}

      setRequests((prev) =>
        prev.map((r) => (r.id === reqId ? { ...r, status: newStatus } : r))
      );

      if (selectedRequest && selectedRequest.id === reqId) {
        setSelectedRequest({ ...selectedRequest, status: newStatus });
      }

      toast({
        title: 'Status Updated',
        description: `Request marked as ${STATUS_CONFIG[newStatus]?.label || newStatus}.`,
      });
    } catch (err) {
      toast({
        title: 'Update failed',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedRequest) return;
    setIsUpdatingNotes(true);
    try {
      const updatedNotes = adminNotes;

      try {
        await supabase
          .from('clipad_custom_requests')
          .update({ admin_notes: updatedNotes })
          .eq('id', selectedRequest.id);
      } catch (_) {}

      try {
        await supabase
          .from('clipad_contact_requests')
          .update({ admin_notes: updatedNotes })
          .eq('id', selectedRequest.id);
      } catch (_) {}

      setRequests((prev) =>
        prev.map((r) => (r.id === selectedRequest.id ? { ...r, admin_notes: updatedNotes } : r))
      );
      setSelectedRequest((prev) => ({ ...prev, admin_notes: updatedNotes }));

      toast({
        title: 'Notes Saved',
        description: 'Internal admin notes have been updated successfully.',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingNotes(false);
    }
  };

  const handleDeleteRequest = async (reqId) => {
    if (!window.confirm('Are you sure you want to delete this custom request?')) return;
    try {
      await supabase.from('clipad_custom_requests').delete().eq('id', reqId);
      await supabase.from('clipad_contact_requests').delete().eq('id', reqId);
      setRequests((prev) => prev.filter((r) => r.id !== reqId));
      if (selectedRequest?.id === reqId) setSelectedRequest(null);
      toast({ title: 'Request Removed' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportCSV = () => {
    if (requests.length === 0) return;
    const headers = ['Request Code', 'Full Name', 'Email', 'Company', 'Website', 'Phone', 'Team Size', 'Deployment', 'Timeline', 'Budget', 'Use Cases', 'Status', 'Date'];
    const rows = requests.map((r) => [
      `"${r.request_code || r.id}"`,
      `"${r.name || ''}"`,
      `"${r.email || ''}"`,
      `"${r.company || ''}"`,
      `"${r.website || ''}"`,
      `"${r.phone || ''}"`,
      `"${r.team_size || ''}"`,
      `"${r.deployment || ''}"`,
      `"${r.timeline || ''}"`,
      `"${r.budget || ''}"`,
      `"${(Array.isArray(r.use_cases) ? r.use_cases.join('; ') : r.use_cases) || ''}"`,
      `"${r.status || 'pending'}"`,
      `"${r.created_at ? new Date(r.created_at).toLocaleString() : ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `clipad_custom_requests_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRequests = requests.filter((req) => {
    const matchesSearch =
      (req.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (req.company || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (req.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (req.request_code || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalCount = requests.length;
  const pendingCount = requests.filter((r) => r.status === 'pending' || !r.status).length;
  const contactedCount = requests.filter((r) => r.status === 'contacted').length;
  const inProgressCount = requests.filter((r) => r.status === 'in_progress').length;
  const closedCount = requests.filter((r) => r.status === 'closed').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Custom Plan Inquiries</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Enterprise Deals
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Review and manage inbound Custom & Enterprise pricing requests from high-value prospects.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchRequests}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card border border-border text-sm font-semibold hover:bg-secondary transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleExportCSV}
            disabled={requests.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-semibold shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Inquiries</CardTitle>
            <FileText className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{totalCount}</div>
            <p className="text-xs text-muted-foreground mt-1">All custom requests received</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-amber-500">Needs Review</CardTitle>
            <Clock3 className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Pending first contact</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-purple-500">In Negotiation</CardTitle>
            <MessageSquare className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-purple-600 dark:text-purple-400">{inProgressCount + contactedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Active enterprise pipelines</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#006065]">Won / Closed</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-[#006065]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-[#006065] dark:text-[#00beac]">{closedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Converted custom arrangements</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Status Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by company, name, email or ref..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-[#006065] dark:bg-[#131A2C] text-white border border-white/15/10 dark:bg-[#006065] dark:bg-[#131A2C] border border-border rounded-xl overflow-x-auto">
          {['all', 'pending', 'contacted', 'in_progress', 'closed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                statusFilter === st
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              {st === 'all' ? 'All Requests' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <OrbitLoader size={36} />
            <p className="text-sm text-muted-foreground font-medium">Loading custom requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-foreground text-base">No Custom Inquiries Found</h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              {searchTerm || statusFilter !== 'all'
                ? 'No requests match your current search and filter criteria.'
                : 'When prospects submit the Custom Pricing request form, their inquiries will appear here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-transparent/50 dark:bg-[#006065] dark:bg-[#131A2C] text-white border border-white/15/5">
                <TableRow className="border-b border-border">
                  <TableHead className="w-[180px] font-bold text-xs uppercase tracking-wider text-muted-foreground">Prospect & Company</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Seats / Scale</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Deployment</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Budget & Timeline</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Submitted</TableHead>
                  <TableHead className="text-right font-bold text-xs uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border">
                {filteredRequests.map((req) => {
                  const statusInfo = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
                  return (
                    <TableRow key={req.id || req.request_code} className="hover:bg-transparent/60 dark:hover:bg-[#006065] dark:bg-[#131A2C]/40 transition-colors">
                      <TableCell className="py-4">
                        <div className="space-y-1">
                          <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-primary" />
                            {req.company || 'Enterprise Company'}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            {req.name} &bull; <a href={`mailto:${req.email}`} className="text-primary hover:underline">{req.email}</a>
                          </div>
                          {req.request_code && (
                            <span className="font-mono text-[10px] text-muted-foreground/80 bg-secondary px-1.5 py-0.5 rounded">
                              {req.request_code}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="py-4">
                        <div className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-secondary text-foreground">
                          <Users className="w-3 h-3 text-muted-foreground" />
                          {req.team_size || 'Custom'}
                        </div>
                      </TableCell>

                      <TableCell className="py-4">
                        <div className="text-xs font-medium capitalize text-white/90 dark:text-white/50 flex items-center gap-1.5">
                          <Server className="w-3.5 h-3.5 text-indigo-500" />
                          {(req.deployment || 'cloud').replace('_', ' ')}
                        </div>
                      </TableCell>

                      <TableCell className="py-4">
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-foreground">{req.budget || 'Custom'}</div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {req.timeline || 'Flexible'}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-all hover:scale-105 ${statusInfo.color}`}>
                              {statusInfo.label}
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-44">
                            {Object.entries(STATUS_CONFIG).map(([stKey, stVal]) => (
                              <DropdownMenuItem
                                key={stKey}
                                onClick={() => handleUpdateStatus(req.id, stKey)}
                                className="text-xs font-semibold gap-2"
                              >
                                <span className={`w-2 h-2 rounded-full ${stKey === 'closed' ? 'bg-[#006065] dark:bg-[#131A2C]' : stKey === 'in_progress' ? 'bg-purple-500' : stKey === 'contacted' ? 'bg-blue-500' : 'bg-amber-500'}`} />
                                {stVal.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>

                      <TableCell className="py-4 text-xs text-muted-foreground">
                        {req.created_at ? new Date(req.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
                      </TableCell>

                      <TableCell className="py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedRequest(req);
                              setAdminNotes(req.admin_notes || '');
                            }}
                            className="p-2 rounded-lg text-white/70 hover:text-primary hover:bg-primary/10 transition-colors"
                            title="View Full Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <a
                            href={`mailto:${req.email}?subject=KERINT%20Enterprise%20Plan%20Arrangement%20-%20${encodeURIComponent(req.company || 'Inquiry')}&body=Hi%20${encodeURIComponent(req.name || 'there')},%0A%0AThank%20you%20for%20reaching%20out%20regarding%20a%20custom%20KERINT%20plan%20for%20${encodeURIComponent(req.company || 'your team')}.`}
                            className="p-2 rounded-lg text-white/70 hover:text-blue-500 hover:bg-blue-500/10 transition-colors"
                            title="Send Email"
                          >
                            <Send className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => handleDeleteRequest(req.id)}
                            className="p-2 rounded-lg text-white/60 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                            title="Delete Request"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Details & Notes Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        {selectedRequest && (
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 border border-border bg-card rounded-3xl">
            <div className="p-6 md:p-8 space-y-6">
              <DialogHeader>
                <div className="flex items-center justify-between gap-4">
                  <div className="inline-block px-3 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    {selectedRequest.request_code || 'CUSTOM REQUEST'}
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${STATUS_CONFIG[selectedRequest.status]?.color || STATUS_CONFIG.pending.color}`}>
                    {STATUS_CONFIG[selectedRequest.status]?.label || 'Pending'}
                  </span>
                </div>
                <DialogTitle className="text-2xl font-black mt-2 text-foreground">
                  {selectedRequest.company || 'Enterprise Prospect'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Submitted by {selectedRequest.name} on {new Date(selectedRequest.created_at || Date.now()).toLocaleString()}
                </DialogDescription>
              </DialogHeader>

              {/* Contact Information Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-secondary/40 border border-border text-xs">
                <div className="space-y-1">
                  <span className="text-muted-foreground">Contact Person:</span>
                  <div className="font-bold text-foreground flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-primary" /> {selectedRequest.name}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">Work Email:</span>
                  <div className="font-bold text-foreground">
                    <a href={`mailto:${selectedRequest.email}`} className="text-primary hover:underline">{selectedRequest.email}</a>
                  </div>
                </div>
                {selectedRequest.phone && (
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Phone Number:</span>
                    <div className="font-bold text-foreground">{selectedRequest.phone}</div>
                  </div>
                )}
                {selectedRequest.website && (
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Company Website:</span>
                    <div className="font-bold text-foreground truncate">
                      <a href={selectedRequest.website.startsWith('http') ? selectedRequest.website : `https://${selectedRequest.website}`} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">
                        {selectedRequest.website} <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Requirement Specifications */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-xl border border-border bg-card">
                  <span className="text-muted-foreground block mb-1">Seats / Scale</span>
                  <strong className="text-foreground text-sm">{selectedRequest.team_size || 'N/A'}</strong>
                </div>
                <div className="p-3.5 rounded-xl border border-border bg-card">
                  <span className="text-muted-foreground block mb-1">Deployment Type</span>
                  <strong className="text-foreground text-sm capitalize">{(selectedRequest.deployment || 'cloud').replace('_', ' ')}</strong>
                </div>
                <div className="p-3.5 rounded-xl border border-border bg-card">
                  <span className="text-muted-foreground block mb-1">Target Budget</span>
                  <strong className="text-foreground text-sm">{selectedRequest.budget || 'Custom'}</strong>
                </div>
              </div>

              {/* Use cases pills */}
              {selectedRequest.use_cases && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Target Use Cases</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(Array.isArray(selectedRequest.use_cases) ? selectedRequest.use_cases : [selectedRequest.use_cases]).map((uc) => (
                      <span key={uc} className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-xs font-semibold">
                        {uc}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Requirements Text */}
              {selectedRequest.requirements && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Custom Requirements & Notes</h4>
                  <div className="p-4 rounded-xl bg-transparent dark:bg-[#006065] dark:bg-[#131A2C] text-white border border-white/15/5 border border-border text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                    {selectedRequest.requirements}
                  </div>
                </div>
              )}

              {/* Admin Internal Notes */}
              <div className="space-y-2 pt-2 border-t border-border">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Admin Internal Deal Notes
                </label>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about pricing quotes, customer call outcomes, SLA terms..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
                />
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  disabled={isUpdatingNotes}
                  className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs transition-colors"
                >
                  {isUpdatingNotes ? 'Saving Notes...' : 'Save Deal Notes'}
                </button>
              </div>

              {/* Quick Action Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs text-muted-foreground">Change Status:</span>
                  <select
                    value={selectedRequest.status || 'pending'}
                    onChange={(e) => handleUpdateStatus(selectedRequest.id, e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-input bg-background text-xs font-semibold"
                  >
                    <option value="pending">Pending Review</option>
                    <option value="contacted">Contacted</option>
                    <option value="in_progress">In Negotiation</option>
                    <option value="closed">Closed / Won</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <a
                    href={`mailto:${selectedRequest.email}?subject=KERINT%20Enterprise%20Arrangement%20-%20${encodeURIComponent(selectedRequest.company || '')}`}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-xs transition-all shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" /> Email Prospect
                  </a>
                </div>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

