import { supabase } from '@/api/supabaseClient';

export const EnterpriseAnalyticsAPI = {
  /**
   * Fetch high-level utilization metrics for the entire tenant.
   */
  async getTenantMetrics(companyId) {
    try {
      // Spaces Count
      const { count: spacesCount, error: errSpaces } = await supabase
        .from('clipad_spaces')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);
        
      if (errSpaces) console.error('[Enterprise] errSpaces:', errSpaces);

      // Total Videos (Async)
      const { count: videosCount, error: errVideos } = await supabase
        .from('clipad_videos')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);
        
      if (errVideos) console.error('[Enterprise] errVideos:', errVideos);

      // Total Meetings
      const { count: meetingsCount, error: errMeetings } = await supabase
        .from('clipad_meeting_records')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);

      if (errMeetings) console.error('[Enterprise] errMeetings:', errMeetings);

      // Fetch a simple sample to determine total size (if sizing is available, else mock storage usage)
      // Usually storage is in a bucket, so we'll mock the storage based on video counts (e.g. 50MB per video/meeting)
      const totalAssets = (videosCount || 0) + (meetingsCount || 0);
      const estimatedStorageGB = ((totalAssets * 50) / 1024).toFixed(2);

      return {
        spaces: spacesCount || 0,
        videos: videosCount || 0,
        meetings: meetingsCount || 0,
        storageUsedGB: parseFloat(estimatedStorageGB)
      };
    } catch (e) {
      console.error('[Enterprise] getTenantMetrics failed:', e);
      return { spaces: 0, videos: 0, meetings: 0, storageUsedGB: 0 };
    }
  },

  /**
   * Fetch Organizational Intelligence Health across the workspace.
   */
  async getOrgIntelligenceHealth(companyId) {
    try {
      const { count: blockersCount } = await supabase
        .from('clipad_blockers')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', companyId)
        .eq('status', 'open');

      const { count: decisionsCount } = await supabase
        .from('clipad_decisions')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', companyId);

      // Fetch spaces belonging to the company first
      const { data: spaces } = await supabase
        .from('clipad_spaces')
        .select('id')
        .eq('company_id', companyId);
      const spaceIds = (spaces || []).map(s => s.id);

      const commitmentsPromise = spaceIds.length > 0
        ? supabase
            .from('clipad_commitments')
            .select('*', { count: 'exact', head: true })
            .in('team_space_id', spaceIds)
            .eq('status', 'pending')
        : { count: 0 };
      const { count: commitmentsCount } = await commitmentsPromise;

      return {
        openBlockers: blockersCount || 0,
        totalDecisions: decisionsCount || 0,
        pendingCommitments: commitmentsCount || 0
      };
    } catch (e) {
      console.error('[Enterprise] getOrgIntelligenceHealth failed:', e);
      return { openBlockers: 0, totalDecisions: 0, pendingCommitments: 0 };
    }
  },

  /**
   * Fetch Usage & Adoption Trends (Video vs Meeting last 30 days)
   */
  async getAdoptionTrends(companyId) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const fromIso = thirtyDaysAgo.toISOString();

      const { data: videos } = await supabase
        .from('clipad_videos')
        .select('created_at')
        .eq('company_id', companyId)
        .gte('created_at', fromIso);

      const { data: meetings } = await supabase
        .from('clipad_meeting_records')
        .select('created_at')
        .eq('company_id', companyId)
        .gte('created_at', fromIso);

      // Group by day
      const trends = {};
      
      const processRecords = (records, type) => {
        if (!records) return;
        records.forEach(r => {
          const day = r.created_at.split('T')[0];
          if (!trends[day]) trends[day] = { date: day, videos: 0, meetings: 0 };
          trends[day][type] += 1;
        });
      };

      processRecords(videos, 'videos');
      processRecords(meetings, 'meetings');

      const sortedTrends = Object.values(trends).sort((a, b) => new Date(a.date) - new Date(b.date));
      return sortedTrends;
    } catch (e) {
      console.error('[Enterprise] getAdoptionTrends failed:', e);
      return [];
    }
  },

  /**
   * Fetch recent audit and security events.
   */
  async getRecentAuditLogs(companyId, limit = 20) {
    try {
      const { data, error } = await supabase
        .from('clipad_org_events')
        .select('*, profiles(full_name, avatar_url)')
        .eq('workspace_id', companyId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('[Enterprise] getRecentAuditLogs failed:', e);
      return [];
    }
  },

  /**
   * Fetch all videos and meetings in the company to list in detailed analytics.
   */
  async getCompanyAssets(companyId) {
    try {
      const { data: videos } = await supabase
        .from('clipad_videos')
        .select('id, title, created_at, creator_id')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      const { data: meetings } = await supabase
        .from('clipad_meeting_records')
        .select('id, title, created_at, host_id')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      // Fetch all profiles in company for quick mapping of host names
      const { data: users } = await supabase.from('profiles').select('id, full_name').eq('company_id', companyId);
      const userMap = {};
      (users || []).forEach(u => userMap[u.id] = u.full_name);

      const all = [
        ...(videos || []).map(v => ({ ...v, type: 'video', host_id: v.creator_id, host_name: userMap[v.creator_id] || 'Unknown' })),
        ...(meetings || []).map(m => ({ ...m, type: 'meeting', host_name: userMap[m.host_id] || 'Unknown' }))
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      return all;
    } catch (e) {
      console.error('[Enterprise] getCompanyAssets failed:', e);
      return [];
    }
  },

  /**
   * Detailed breakdown of who watched and commented on a specific asset
   */
  async getAssetEngagement(assetId, assetType, companyId) {
    try {
      const viewsTable = assetType === 'meeting' ? 'clipad_meeting_views' : 'clipad_video_views';
      const commentsTable = assetType === 'meeting' ? 'clipad_meeting_comments' : 'clipad_video_comments';
      const fkCol = assetType === 'meeting' ? 'meeting_id' : 'video_id';

      // 1. Get All company users (this acts as our directory)
      const { data: companyUsers } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email, role')
        .eq('company_id', companyId);

      const usersMap = {};
      (companyUsers || []).forEach(u => usersMap[u.id] = u);

      // 2. Get views
      const { data: views } = await supabase
        .from(viewsTable)
        .select('*')
        .eq(fkCol, assetId);

      const viewers = [];
      const viewerIds = new Set();
      
      (views || []).forEach(v => {
        if (!viewerIds.has(v.viewer_id) && usersMap[v.viewer_id]) {
           viewerIds.add(v.viewer_id);
           viewers.push({
             ...usersMap[v.viewer_id],
             viewed_at: v.viewed_at
           });
        }
      });

      // 3. Find Non-Viewers
      const nonViewers = (companyUsers || []).filter(u => !viewerIds.has(u.id));

      // 4. Get Comments
      const { data: comments } = await supabase
        .from(commentsTable)
        .select('*')
        .eq(fkCol, assetId)
        .order('created_at', { ascending: false });

      // map comment authors if needed
      const mappedComments = (comments || []).map(c => ({
        ...c,
        author: usersMap[c.author_id || c.user_id] || { full_name: c.author_name || 'Anonymous' }
      }));

      return {
        viewers,
        nonViewers,
        comments: mappedComments
      };
    } catch (e) {
      console.error('[Enterprise] getAssetEngagement failed:', e);
      return { viewers: [], nonViewers: [], comments: [] };
    }
  }
};
