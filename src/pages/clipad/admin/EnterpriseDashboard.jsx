import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { EnterpriseAnalyticsAPI } from '@/api/EnterpriseAnalyticsAPI';
import { 
  Shield, Server, Video, AlertCircle, CheckCircle, Clock, 
  Activity, ArrowUpRight, FolderKanban, Briefcase, Search, Eye, X, MessageSquare
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from 'recharts';
export default function EnterpriseDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [intelligence, setIntelligence] = useState(null);
  const [trends, setTrends] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [assets, setAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [engagement, setEngagement] = useState(null);
  const [loadingEngagement, setLoadingEngagement] = useState(false);

  useEffect(() => {
    if (user?.company_id) {
      loadDashboard();
    }
  }, [user]);

  // Guard: Restrict access to Enterprise / Off-Cloud plans or Super Admins
  useEffect(() => {
    if (!user) return;
    const isSuperAdmin = user.role === 'super_admin' || user.user_metadata?.role === 'super_admin';
    const plan = (user.clipad_plan || user.subscription_plan || '').toLowerCase();
    if (!isSuperAdmin) {
      window.location.href = '/clipad';
    }
  }, [user]);

  const loadDashboard = async () => {
    setLoading(true);
    const [tMetrics, oHealth, aTrends, aLogs, aAssets] = await Promise.all([
      EnterpriseAnalyticsAPI.getTenantMetrics(user.company_id),
      EnterpriseAnalyticsAPI.getOrgIntelligenceHealth(user.company_id),
      EnterpriseAnalyticsAPI.getAdoptionTrends(user.company_id),
      EnterpriseAnalyticsAPI.getRecentAuditLogs(user.company_id),
      EnterpriseAnalyticsAPI.getCompanyAssets(user.company_id)
    ]);
    
    setMetrics(tMetrics);
    setIntelligence(oHealth);
    setTrends(aTrends);
    setAuditLogs(aLogs);
    setAssets(aAssets);
    setLoading(false);
  };

  const handleAssetClick = async (asset) => {
    setSelectedAsset(asset);
    setLoadingEngagement(true);
    const data = await EnterpriseAnalyticsAPI.getAssetEngagement(asset.id, asset.type, user.company_id);
    setEngagement(data);
    setLoadingEngagement(false);
  };

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
            <div key={i} className="bg-[#006065] dark:bg-[#131A2C] text-white dark:bg-[#006065] dark:bg-[#131A2C] p-6 rounded-2xl h-32"></div>
          ))}
        </div>
        <div className="bg-[#006065] dark:bg-[#131A2C] text-white dark:bg-[#006065] dark:bg-[#131A2C] p-6 rounded-2xl h-64 mb-8"></div>
      </div>
    );
  }

  const storagePercentage = ((metrics?.storageUsedGB || 0) / 50) * 100;

  return (
    <div className="min-h-full bg-transparent  pb-[80px] md:pb-8 flex flex-col overflow-x-hidden">
      <div className="flex-1 p-4 md:p-6 w-full max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-foreground flex items-center gap-3">
              <Shield className="w-8 h-8 text-indigo-600 dark:text-indigo-400" /> 
              Enterprise Command Center
            </h1>
            <p className="text-slate-600 dark:text-muted-foreground mt-1">Cross-tenant visibility and administrative oversight for your entire organization.</p>
          </div>
          <div className="flex items-center gap-3 px-4 py-2 bg-[#006065] dark:bg-[#131A2C] text-white border border-white/15/10 text-white border border-white/15 border border-indigo-100 dark:border-indigo-500/20 rounded-xl">
            <div className="w-2 h-2 rounded-full bg-[#006065] dark:bg-[#131A2C] animate-pulse" />
            <span className="text-sm font-bold text-indigo-300 dark:text-indigo-300">Live Status: Operational</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Left Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Top Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard 
              icon={<Server className="w-5 h-5 text-blue-500" />} 
              title="Storage Utilization" 
              value={`${metrics?.storageUsedGB || 0} GB`}
              subtext={`of 50GB Limit (${storagePercentage.toFixed(1)}%)`}
              progress={storagePercentage}
              progressColor="bg-[#006065] dark:bg-[#131A2C]"
            />
            <MetricCard 
              icon={<FolderKanban className="w-5 h-5 text-amber-500" />} 
              title="Active Spaces" 
              value={metrics?.spaces || 0}
              subtext="Cross-functional hubs"
            />
            <MetricCard 
              icon={<Video className="w-5 h-5 text-[#006065]" />} 
              title="Total Video Assets" 
              value={(metrics?.videos || 0) + (metrics?.meetings || 0)}
              subtext={`${metrics?.videos || 0} Async | ${metrics?.meetings || 0} Meetings`}
            />
          </div>

          {/* Org Intelligence Health */}
          <div className="bg-[#006065] dark:bg-[#131A2C] text-white dark:bg-[#006065] dark:bg-[#131A2C] rounded-2xl border border-white/15 dark:border-white/15 p-4 md:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Activity className="w-5 h-5 text-rose-500" />
              <h2 className="text-lg font-bold text-white dark:text-foreground">Organizational Intelligence</h2>
            </div>
            <div className="grid grid-cols-3 gap-3 md:gap-6">
              <div className="text-center p-4 bg-[#006065] dark:bg-[#131A2C] text-white border border-white/15/10 text-white border border-white/15 rounded-xl border border-rose-100 dark:border-rose-500/20">
                <AlertCircle className="w-6 h-6 text-rose-500 mx-auto mb-2" />
                <p className="text-3xl font-black text-rose-300 dark:text-rose-400">{intelligence?.openBlockers || 0}</p>
                <p className="text-xs font-semibold text-rose-600 dark:text-rose-300 uppercase tracking-wider mt-1">Open Blockers</p>
              </div>
              <div className="text-center p-4 bg-[#006065] dark:bg-[#131A2C] text-white border border-white/15/10 text-white border border-white/15 rounded-xl border border-indigo-100 dark:border-indigo-500/20">
                <Briefcase className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
                <p className="text-3xl font-black text-indigo-300 dark:text-indigo-400">{intelligence?.totalDecisions || 0}</p>
                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-300 uppercase tracking-wider mt-1">Key Decisions</p>
              </div>
              <div className="text-center p-4 bg-[#006065] dark:bg-[#131A2C] text-white border border-white/15/10 text-white border border-white/15 rounded-xl border border-amber-100 dark:border-amber-500/20">
                <Clock className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                <p className="text-3xl font-black text-amber-300 dark:text-amber-400">{intelligence?.pendingCommitments || 0}</p>
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-300 uppercase tracking-wider mt-1">Pending Commitments</p>
              </div>
            </div>
          </div>

          {/* Asset List (Detailed Engagement Tracking) */}
          <div className="bg-[#006065] dark:bg-[#131A2C] text-white dark:bg-[#006065] dark:bg-[#131A2C] rounded-2xl border border-white/15 dark:border-white/15 p-4 md:p-6 shadow-sm overflow-hidden flex flex-col">
            <h2 className="text-lg font-bold text-white dark:text-foreground mb-2 flex items-center gap-2">
              <Eye className="w-5 h-5 text-indigo-500" />
              Detailed Media Analytics
            </h2>
            <p className="text-sm text-white/70 mb-4">Click any video or meeting to view detailed engagement tracking (who watched and commented).</p>
            
            <div className="max-h-[350px] overflow-y-auto pr-2 space-y-2">
              {assets.map(asset => (
                <button 
                  key={asset.id} 
                  onClick={() => handleAssetClick(asset)}
                  className="w-full text-left p-4 rounded-xl border border-white/15 dark:border-white/15 hover:bg-transparent dark:hover:bg-accent active:scale-[0.98] transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#006065] dark:bg-[#131A2C] text-white border border-white/15/10 text-white border border-white/15 flex items-center justify-center shrink-0">
                      <Video className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white dark:text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {asset.title || 'Untitled Asset'}
                      </p>
                      <p className="text-xs text-white/70 flex items-center gap-2 mt-1">
                        <span className="capitalize text-[10px] px-1.5 py-0.5 rounded bg-[#006065] dark:bg-[#131A2C] text-white border border-white/15/15 dark:bg-slate-700 text-white/90 dark:text-foreground">{asset.type}</span>
                        Created by {asset.host_name} Ã¢â‚¬Â¢ {new Date(asset.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-white/60 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-all" />
                </button>
              ))}
              {assets.length === 0 && (
                <div className="text-center py-8 text-white/70">No assets found in the organization.</div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column - Usage & Audit Stream */}
        <div className="space-y-6">
          {/* Usage Trends */}
          <div className="bg-[#006065] dark:bg-[#131A2C] text-white dark:bg-[#006065] dark:bg-[#131A2C] rounded-2xl border border-white/15 dark:border-white/15 p-4 md:p-6 shadow-sm">
            <h2 className="text-lg font-bold text-white dark:text-foreground mb-6">30-Day Adoption Trends</h2>
            <div className="h-[250px] w-full">
              {trends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends}>
                    <defs>
                      <linearGradient id="colorVideos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#006065" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#006065" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorMeetings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                    <XAxis dataKey="date" tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                    <YAxis tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="videos" name="Async Videos" stroke="#006065" strokeWidth={3} fillOpacity={1} fill="url(#colorVideos)" />
                    <Area type="monotone" dataKey="meetings" name="Meeting Records" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorMeetings)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white/60">
                  <Activity className="w-10 h-10 mb-2 opacity-20" />
                  <p>No usage data found.</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#006065] dark:bg-[#131A2C] text-white dark:bg-[#006065] dark:bg-[#131A2C] rounded-2xl border border-white/15 dark:border-white/15 shadow-sm flex flex-col overflow-hidden h-[450px]">
            <div className="p-5 border-b border-white/15 dark:border-white/15 bg-transparent dark:bg-[#006065] dark:bg-[#131A2C]">
              <h2 className="text-lg font-bold text-white dark:text-foreground flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-500" />
                Security & Audit Log
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {auditLogs.length > 0 ? (
                auditLogs.map((log) => (
                  <div key={log.id} className="flex gap-4 group">
                    <div className="relative flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full z-10 flex items-center justify-center ${log.type === 'security' ? 'bg-[#006065] dark:bg-[#131A2C] ring-4 ring-[#006065]/20' : 'bg-[#006065] dark:bg-[#131A2C] text-white border border-white/15/100 ring-4 ring-indigo-500/20'}`} />
                      <div className="w-px h-full bg-[#006065] dark:bg-[#131A2C] text-white border border-white/15/15 dark:bg-slate-700 absolute top-3 group-last:hidden" />
                    </div>
                    <div className="pb-5 w-full">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-white dark:text-foreground flex items-center gap-2">
                          {log.title}
                          {log.type === 'security' && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-[#006065] dark:bg-[#131A2C] text-white border border-white/15/10 text-white/70 dark:bg-secondary dark:text-muted-foreground">Security</span>}
                        </p>
                        <span className="text-[10px] font-medium text-white/60 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2 bg-transparent dark:bg-secondary/50 p-2 rounded-lg border border-white/10 dark:border-white/15 w-fit">
                        <div className="w-5 h-5 rounded-full overflow-hidden bg-[#006065] dark:bg-[#131A2C] text-white border border-white/15/15 dark:bg-slate-700 flex items-center justify-center shrink-0">
                          {log.profiles?.avatar_url ? (
                            <img src={log.profiles.avatar_url} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[9px] font-bold text-white/70">{(log.profiles?.full_name || 'S').charAt(0)}</span>
                          )}
                        </div>
                        <span className="text-[11px] font-medium text-white/80 dark:text-foreground">{log.profiles?.full_name || 'System User'}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-white/60">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No audit logs found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Asset Engagement Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#006065] dark:bg-[#131A2C] text-white dark:bg-[#006065] dark:bg-[#131A2C] rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-white/15 dark:border-white/15">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/15 dark:border-white/15 bg-transparent dark:bg-[#006065] dark:bg-[#131A2C]/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#006065] dark:bg-[#131A2C] text-white border border-white/15/100/10 flex items-center justify-center">
                  <Video className="w-6 h-6 text-indigo-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white dark:text-foreground">{selectedAsset.title || 'Untitled Asset'}</h2>
                  <p className="text-sm text-white/70 capitalize">{selectedAsset.type} Tracking Analytics</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedAsset(null)}
                className="w-10 h-10 rounded-full bg-[#006065] dark:bg-[#131A2C] text-white border border-white/15/15 dark:bg-secondary flex items-center justify-center hover:bg-slate-300 dark:hover:bg-accent active:scale-95 transition-all"
              >
                <X className="w-5 h-5 text-white/80 dark:text-foreground" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingEngagement ? (
                <div className="flex flex-col items-center justify-center py-20 text-indigo-500">
                  <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-sm font-semibold">Generating Engagement Report...</p>
                </div>
              ) : engagement ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Viewers & Non Viewers Column */}
                  <div className="space-y-8">
                    {/* Viewers */}
                    <div>
                      <h3 className="text-sm font-bold text-white dark:text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-[#006065]" />
                        Watched ({engagement.viewers.length})
                      </h3>
                      <div className="bg-transparent dark:bg-[#006065] dark:bg-[#131A2C]/50 rounded-xl border border-white/15 dark:border-white/15 max-h-[300px] overflow-y-auto">
                        {engagement.viewers.length === 0 ? (
                          <p className="p-4 text-sm text-white/70 text-center">Nobody has watched this yet.</p>
                        ) : (
                          <div className="divide-y divide-slate-200 dark:divide-slate-800">
                            {engagement.viewers.map(u => (
                              <div key={u.id} className="p-3 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-[#006065] dark:bg-[#131A2C] text-white border border-white/15/100/20 flex items-center justify-center overflow-hidden shrink-0">
                                  {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{(u.full_name || u.email || 'U').charAt(0).toUpperCase()}</span>}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold text-white dark:text-foreground truncate">{u.full_name || u.email || 'Unknown User'}</p>
                                  <p className="text-[10px] text-white/70">Viewed {new Date(u.viewed_at).toLocaleString()}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Non Viewers */}
                    <div>
                      <h3 className="text-sm font-bold text-white dark:text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-500" />
                        Did Not Watch ({engagement.nonViewers.length})
                      </h3>
                      <div className="bg-transparent dark:bg-[#006065] dark:bg-[#131A2C]/50 rounded-xl border border-white/15 dark:border-white/15 max-h-[300px] overflow-y-auto">
                        {engagement.nonViewers.length === 0 ? (
                          <p className="p-4 text-sm text-white/70 text-center">Everyone in the company has watched!</p>
                        ) : (
                          <div className="divide-y divide-slate-200 dark:divide-slate-800">
                            {engagement.nonViewers.map(u => (
                              <div key={u.id} className="p-3 flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity">
                                <div className="w-8 h-8 rounded-full bg-[#006065] dark:bg-[#131A2C] text-white border border-white/15/15 dark:bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                                  {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-white/70">{(u.full_name || u.email || 'U').charAt(0).toUpperCase()}</span>}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-white dark:text-foreground truncate">{u.full_name || u.email || 'Unknown User'}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Comments Column */}
                  <div>
                    <h3 className="text-sm font-bold text-white dark:text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-indigo-500" />
                      Engagement Comments ({engagement.comments.length})
                    </h3>
                    <div className="bg-transparent dark:bg-[#006065] dark:bg-[#131A2C]/50 rounded-xl border border-white/15 dark:border-white/15 h-[650px] overflow-y-auto">
                      {engagement.comments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-white/60 p-6">
                          <MessageSquare className="w-8 h-8 mb-3 opacity-20" />
                          <p className="text-sm text-center">No comments on this asset.</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-200 dark:divide-slate-800">
                          {engagement.comments.map(c => (
                            <div key={c.id} className="p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-[#006065] dark:bg-[#131A2C] text-white border border-white/15/100/20 flex items-center justify-center overflow-hidden">
                                  {c.author?.avatar_url ? <img src={c.author?.avatar_url} className="w-full h-full object-cover" /> : <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">{(c.author?.full_name || c.author?.email || 'U').charAt(0).toUpperCase()}</span>}
                                </div>
                                <p className="text-xs font-semibold text-white dark:text-foreground">{c.author?.full_name || c.author?.email || 'Unknown User'}</p>
                                <span className="text-[10px] text-white/70 ml-auto">{new Date(c.created_at).toLocaleString()}</span>
                              </div>
                              <p className="text-sm text-white/90 dark:text-foreground bg-[#006065] dark:bg-[#131A2C] text-white dark:bg-[#006065] dark:bg-[#131A2C] p-3 rounded-xl border border-white/15 dark:border-white/15">
                                {c.content || c.text}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

function MetricCard({ icon, title, value, subtext, progress, progressColor }) {
  return (
    <div className="bg-[#006065] dark:bg-[#131A2C] text-white dark:bg-[#006065] dark:bg-[#131A2C] rounded-2xl border border-white/15 dark:border-white/15 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
      {progress !== undefined && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#006065] dark:bg-[#131A2C] text-white border border-white/15/10 dark:bg-secondary">
          <div className={`h-full ${progressColor} transition-all`} style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      )}
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-transparent dark:bg-secondary rounded-lg">
          {icon}
        </div>
        <h3 className="text-sm font-bold text-white/80 dark:text-foreground">{title}</h3>
      </div>
      <p className="text-3xl font-black text-white dark:text-foreground mb-1">{value}</p>
      <p className="text-xs font-semibold text-white/70">{subtext}</p>
    </div>
  );
}


