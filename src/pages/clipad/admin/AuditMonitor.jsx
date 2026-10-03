import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';
import { ShieldAlert, Globe, Activity, Clock, Filter, Search, RefreshCw, User, Building2, Wifi } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OrbitLoader } from '@/components/ui/orbit-loader';
import { format, formatDistanceToNow } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ACTION_COLORS = {
  login:           { bg: 'bg-blue-500/10',   text: 'text-blue-500',   label: 'Login' },
  plan_upgrade:    { bg: 'bg-[#006065]/10', text: 'text-[#006065]',label: 'Plan Upgrade' },
  meeting_created: { bg: 'bg-violet-500/10',  text: 'text-violet-500', label: 'Meeting' },
  video_recorded:  { bg: 'bg-orange-500/10',  text: 'text-orange-500', label: 'Recording' },
  impersonate:     { bg: 'bg-purple-500/10',  text: 'text-purple-500', label: 'Impersonate' },
  error:           { bg: 'bg-red-500/10',     text: 'text-red-500',    label: 'Error' },
  update:          { bg: 'bg-transparent0/10',   text: 'text-white/70',  label: 'Update' },
};

function ActionBadge({ action }) {
  const c = ACTION_COLORS[action] || { bg: 'bg-transparent0/10', text: 'text-white/70', label: action };
  return (
    <span className={cn('px-2 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap', c.bg, c.text)}>
      {c.label}
    </span>
  );
}

export default function AuditMonitor() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('7d');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);

      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      if (dateFilter !== 'all') {
        const date = new Date();
        if (dateFilter === '1h')  date.setHours(date.getHours() - 1);
        if (dateFilter === '24h') date.setDate(date.getDate() - 1);
        if (dateFilter === '7d')  date.setDate(date.getDate() - 7);
        if (dateFilter === '30d') date.setDate(date.getDate() - 30);
        if (dateFilter === '1y')  date.setFullYear(date.getFullYear() - 1);
        query = query.gte('created_at', date.toISOString());
      }

      const { data, error } = await query;
      if (!error) {
        setLogs(data || []);
        setLastRefresh(new Date());
      }
    } finally {
      setLoading(false);
    }
  }, [actionFilter, dateFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Real-time subscription â€” auto-refresh when new rows arrive
  useEffect(() => {
    const channel = supabase
      .channel('realtime:audit_logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, () => {
        fetchLogs();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchLogs]);

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (log.user_name  && log.user_name.toLowerCase().includes(term)) ||
      (log.user_email && log.user_email.toLowerCase().includes(term)) ||
      (log.action     && log.action.toLowerCase().includes(term)) ||
      (log.ip_address && log.ip_address.includes(term)) ||
      (log.details    && log.details.toLowerCase().includes(term)) ||
      (log.company_id && log.company_id.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Monitor</h1>
          <p className="text-muted-foreground mt-1">
            Real-time system activity â€” logins, upgrades, meetings, and recordings.
          </p>
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
          <Wifi className="w-3.5 h-3.5 text-[#006065]" />
          Live
          {lastRefresh && (
            <span className="text-white/60 ml-1">Â· refreshed {formatDistanceToNow(lastRefresh, { addSuffix: true })}</span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-end bg-card p-4 rounded-xl border border-border">
        <div className="flex-1 space-y-1 w-full">
          <label className="text-xs font-semibold text-muted-foreground ml-1">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search email, name, IP, action..."
              className="pl-9"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1 w-full md:w-52">
          <label className="text-xs font-semibold text-muted-foreground ml-1">Action Type</label>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger><SelectValue placeholder="All Actions" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="login">Logins</SelectItem>
              <SelectItem value="plan_upgrade">Plan Upgrades</SelectItem>
              <SelectItem value="meeting_created">Meetings Created</SelectItem>
              <SelectItem value="video_recorded">Recordings</SelectItem>
              <SelectItem value="impersonate">Impersonations</SelectItem>
              <SelectItem value="error">Errors</SelectItem>
              <SelectItem value="update">Updates</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1 w-full md:w-44">
          <label className="text-xs font-semibold text-muted-foreground ml-1">Time Range</label>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger><SelectValue placeholder="Past 7 Days" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Past Hour</SelectItem>
              <SelectItem value="24h">Past 24 Hours</SelectItem>
              <SelectItem value="7d">Past 7 Days</SelectItem>
              <SelectItem value="30d">Past 30 Days</SelectItem>
              <SelectItem value="1y">Past Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" onClick={fetchLogs} className="gap-2 shrink-0 h-10 w-full md:w-auto">
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> Refresh
        </Button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Events', value: filteredLogs.length, color: 'text-white/90 dark:text-foreground' },
          { label: 'Logins', value: filteredLogs.filter(l => l.action === 'login').length, color: 'text-blue-500' },
          { label: 'Plan Upgrades', value: filteredLogs.filter(l => l.action === 'plan_upgrade').length, color: 'text-[#006065]' },
          { label: 'Errors', value: filteredLogs.filter(l => l.action === 'error').length, color: 'text-red-500' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className={cn("text-2xl font-bold", s.color)}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-transparent dark:bg-[#006065]/50">
              <TableHead className="w-36"><Clock className="w-3.5 h-3.5 inline mr-1" />Timestamp</TableHead>
              <TableHead><User className="w-3.5 h-3.5 inline mr-1" />User</TableHead>
              <TableHead><Building2 className="w-3.5 h-3.5 inline mr-1" />Company</TableHead>
              <TableHead><Activity className="w-3.5 h-3.5 inline mr-1" />Action</TableHead>
              <TableHead>Details</TableHead>
              <TableHead><Globe className="w-3.5 h-3.5 inline mr-1" />IP / Location</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-64 text-center">
                  <div className="flex justify-center"><OrbitLoader /></div>
                </TableCell>
              </TableRow>
            ) : filteredLogs.length > 0 ? (
              filteredLogs.map((log) => (
                <TableRow key={log.id} className="hover:bg-transparent dark:hover:bg-slate-800/50 transition-colors">
                  <TableCell className="text-xs text-white/70 whitespace-nowrap align-top pt-4">
                    <div className="font-medium text-white/90 dark:text-foreground">
                      {format(new Date(log.created_at), 'MMM d, yyyy')}
                    </div>
                    <div className="text-white/60 text-[11px]">
                      {format(new Date(log.created_at), 'HH:mm:ss')}
                    </div>
                    <div className="text-white/50 dark:text-white/80 text-[10px] mt-0.5">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </div>
                  </TableCell>
                  <TableCell className="align-top pt-4">
                    <div className="font-semibold text-sm text-white dark:text-foreground">
                      {log.user_name || 'Unknown User'}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">
                      {log.user_email || (log.user_id ? `uid:${log.user_id.slice(0,8)}` : 'â€”')}
                    </div>
                  </TableCell>
                  <TableCell className="align-top pt-4 text-sm text-white/70 font-mono text-xs">
                    {log.company_id
                      ? <span title={log.company_id}>{log.company_id.substring(0, 8)}â€¦</span>
                      : <span className="text-white/50 dark:text-white/80">â€”</span>
                    }
                  </TableCell>
                  <TableCell className="align-top pt-4">
                    <ActionBadge action={log.action} />
                  </TableCell>
                  <TableCell className="align-top pt-4 max-w-[200px]">
                    <div className="text-xs text-white/80 dark:text-muted-foreground line-clamp-2">
                      {log.details || 'â€”'}
                    </div>
                  </TableCell>
                  <TableCell className="align-top pt-4">
                    <div className="text-xs font-mono text-white/80 dark:text-muted-foreground">
                      {log.ip_address || <span className="text-white/50 dark:text-white/80">â€”</span>}
                    </div>
                    {log.location && (
                      <div className="text-[11px] text-muted-foreground mt-0.5">{log.location}</div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16">
                  <ShieldAlert className="w-10 h-10 text-white/50 dark:text-white/90 mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">No audit logs found</p>
                  <p className="text-xs text-white/60 mt-1">
                    New events will appear here automatically as users take actions.
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

