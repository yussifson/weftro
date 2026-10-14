import React, { useEffect, useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Users, Building2, Layers, Activity, Clock, LogIn, TrendingUp, Video, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const ACTION_ICONS = {
  login:           { icon: LogIn,      color: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-900/20' },
  plan_upgrade:    { icon: TrendingUp, color: 'text-[#006065]', bg: 'bg-[#006065] dark:bg-card' },
  meeting_created: { icon: Activity,   color: 'text-violet-500',  bg: 'bg-violet-50 dark:bg-violet-900/20' },
  video_recorded:  { icon: Video,      color: 'text-orange-500',  bg: 'bg-orange-50 dark:bg-orange-900/20' },
};

export default function Overview() {
  const [stats, setStats] = useState({ companies: 0, spaces: 0, users: 0, logins: 0 });
  const [recentActivities, setRecentActivities] = useState([]);
  const [recentCompanies, setRecentCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  async function fetchStats() {
    setLoading(true);
    try {
      const [
        { count: cCount },
        { count: sCount },
        { count: pCount },
        { count: aCount },
        { data: logs },
        { data: comps }
      ] = await Promise.all([
        supabase.from('companies').select('*', { count: 'exact', head: true }),
        supabase.from('clipad_spaces').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('audit_logs').select('*', { count: 'exact', head: true }).eq('action', 'login'),
        supabase.from('audit_logs')
          .select('id, action, user_name, user_email, details, created_at, ip_address, company_id')
          .order('created_at', { ascending: false })
          .limit(15),
        supabase.from('companies')
          .select('id, name, subdomain, subscription_plan, created_at, pricing_tag_id, clipad_pricing_tags(name)')
          .order('created_at', { ascending: false })
          .limit(6)
      ]);

      setStats({
        companies: cCount || 0,
        spaces: sCount || 0,
        users: pCount || 0,
        logins: aCount || 0
      });
      setRecentActivities(logs || []);
      setRecentCompanies(comps || []);
      setLastUpdated(new Date());
    } catch (e) {
      console.error("Error fetching admin stats:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStats();
    // Real-time updates from audit_logs
    const channel = supabase
      .channel('overview:audit_logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, fetchStats)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-transparent  p-4 sm:p-6 md:p-8 animate-pulse">
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="h-8 bg-[#006065] dark:bg-[#131A2C] text-white border border-white/15/15 dark:bg-slate-800 rounded w-48 mb-2"></div>
            <div className="h-4 bg-[#006065] dark:bg-[#131A2C] text-white border border-white/15/15 dark:bg-slate-800 rounded w-32"></div>
          </div>
          <div className="h-10 bg-[#006065] dark:bg-[#131A2C] text-white border border-white/15/15 dark:bg-slate-800 rounded w-32"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#006065] dark:bg-[#131A2C] text-white dark:bg-card p-6 rounded-2xl h-32"></div>
          ))}
        </div>
        <div className="bg-[#006065] dark:bg-[#131A2C] text-white dark:bg-card p-6 rounded-2xl h-64 mb-8"></div>
      </div>
    );
  }

  const statCards = [
    { title: "Total Companies", value: stats.companies, icon: Building2, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
    { title: "Total Spaces", value: stats.spaces, icon: Layers, color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
    { title: "Registered Users", value: stats.users, icon: Users, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-900/20" },
    { title: "Total Logins Audited", value: stats.logins, icon: Activity, color: "text-[#006065]", bg: "bg-[#006065] dark:bg-card" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground mt-1">Welcome to the CliPad Super Admin dashboard.</p>
        </div>
        <button
          onClick={fetchStats}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {lastUpdated ? `Updated ${formatDistanceToNow(lastUpdated, { addSuffix: true })}` : 'Refresh'}
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", stat.bg)}>
                  <Icon className={cn("w-4 h-4", stat.color)} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent System Activity — real data from audit_logs */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="w-4 h-4 text-indigo-500" /> Recent System Activity
            </CardTitle>
            <div className="flex items-center gap-1 text-[11px] text-[#006065] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#006065] dark:bg-[#131A2C] animate-pulse" />
              Live
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto max-h-[380px] space-y-1">
            {recentActivities.length > 0 ? (
              recentActivities.map((log) => {
                const meta = ACTION_ICONS[log.action] || { icon: Activity, color: 'text-white/70', bg: 'bg-[#006065] dark:bg-[#131A2C] text-white border border-white/15/10 dark:bg-secondary' };
                const Icon = meta.icon;
                return (
                  <div key={log.id} className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5", meta.bg)}>
                      <Icon className={cn("w-3.5 h-3.5", meta.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground capitalize truncate">
                        {log.action?.replace(/_/g, ' ')}
                        {log.user_name && log.user_name !== 'Unknown' && (
                          <span className="font-normal text-muted-foreground"> · {log.user_name}</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{log.details || log.user_email || '—'}</p>
                      <p className="text-[10px] text-white/60 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        {log.ip_address && <span className="ml-2 font-mono">{log.ip_address}</span>}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-12">
                <Activity className="w-10 h-10 text-white/50 dark:text-foreground/90 mb-3" />
                <p className="text-sm">No recent activity yet</p>
                <p className="text-xs text-white/60 mt-1">Events appear here as users take actions.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Companies */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="w-4 h-4 text-blue-500" /> Recent Companies
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto max-h-[380px] space-y-1">
            {recentCompanies.length > 0 ? (
              recentCompanies.map((company) => {
                const clipadPlan = company.clipad_pricing_tags?.name || company.subscription_plan || 'free';
                return (
                  <div key={company.id} className="flex justify-between items-center py-2.5 border-b border-border last:border-0">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <p className="text-sm font-semibold truncate">{company.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {company.subdomain ? `${company.subdomain}.optavel.com` : 'No subdomain'}
                      </p>
                      <p className="text-[10px] text-white/60">
                        {formatDistanceToNow(new Date(company.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <span className={cn(
                      'px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0 ml-3',
                      clipadPlan.toLowerCase().includes('enterprise') ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' :
                      clipadPlan.toLowerCase().includes('pro') ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      'bg-[#006065] dark:bg-[#131A2C] text-white border border-white/15/10 text-white/80 dark:bg-secondary dark:text-muted-foreground'
                    )}>
                      {clipadPlan}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground py-12">
                No companies found.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

