// src/lib/intelligence/engines/marketing.js
// Marketing vertical intelligence engine
// Analyzes campaign ROI, lead funnels, content performance, and lead magnets.

import { generateInsight, groupByWeek, groupByDay } from '@/lib/intelligence/engine';
import { powerSync } from '@/api/PowerSyncConnector';

const VERTICAL = 'marketing';

// ────────────────────────────────────────────────────────
// 1. Campaign ROI Analysis
//    Calculates return on investment for each campaign
//    and flags under-performing or overspent campaigns.
// ────────────────────────────────────────────────────────
async function analyzeCampaignROI(companyId) {
  const insights = [];

  const res = await powerSync.execute(
    `SELECT campaign_name, budget, spent, leads_generated, conversions, status, start_date
     FROM univ_campaigns
     WHERE company_id = ?
     ORDER BY start_date DESC`,
    [companyId]
  );
  const campaigns = res.rows._array;

  if (campaigns.length === 0) {
    return [{
      vertical: VERTICAL,
      insight_type: 'summary',
      insight_key: 'marketing_campaigns_building',
      title: 'Campaign Intelligence Building',
      body: 'No campaign data found yet. Insights will appear once campaigns are tracked.',
      severity: 'info',
    }];
  }

  // Per-campaign metrics
  const analyzed = campaigns.map(c => {
    const budget = Number(c.budget) || 0;
    const spent = Number(c.spent) || 0;
    const leads = Number(c.leads_generated) || 0;
    const conversions = Number(c.conversions) || 0;
    const costPerLead = leads > 0 ? spent / leads : null;
    const costPerConversion = conversions > 0 ? spent / conversions : null;
    const budgetUtilization = budget > 0 ? (spent / budget) * 100 : null;
    const conversionRate = leads > 0 ? (conversions / leads) * 100 : 0;

    return {
      name: c.campaign_name,
      status: c.status,
      start_date: c.start_date,
      budget,
      spent,
      leads,
      conversions,
      cost_per_lead: costPerLead,
      cost_per_conversion: costPerConversion,
      budget_utilization: budgetUtilization,
      conversion_rate: conversionRate,
    };
  });

  // Aggregate metrics
  const totalBudget = analyzed.reduce((s, c) => s + c.budget, 0);
  const totalSpent = analyzed.reduce((s, c) => s + c.spent, 0);
  const totalLeads = analyzed.reduce((s, c) => s + c.leads, 0);
  const totalConversions = analyzed.reduce((s, c) => s + c.conversions, 0);

  // Flag overspent campaigns (spent > budget)
  const overspent = analyzed.filter(c => c.budget > 0 && c.spent > c.budget);

  // Flag zero-conversion campaigns that have spent money
  const zeroConversion = analyzed.filter(c => c.spent > 0 && c.conversions === 0);

  const aiBody = await generateInsight(
    `Analyze marketing campaign ROI across ${campaigns.length} campaigns. Total budget: $${totalBudget.toFixed(2)}, spent: $${totalSpent.toFixed(2)}, leads: ${totalLeads}, conversions: ${totalConversions}. ${overspent.length} overspent campaigns, ${zeroConversion.length} zero-conversion campaigns. Identify the best and worst performers and recommend optimization.`,
    {
      summary: { totalBudget, totalSpent, totalLeads, totalConversions },
      campaigns: analyzed.slice(0, 10),
      overspent: overspent.map(c => c.name),
      zero_conversion: zeroConversion.map(c => c.name),
    }
  );

  let severity = 'positive';
  if (zeroConversion.length > campaigns.length / 2) severity = 'critical';
  else if (overspent.length > 0 || zeroConversion.length > 0) severity = 'warning';
  else if (totalConversions === 0) severity = 'info';

  insights.push({
    vertical: VERTICAL,
    insight_type: 'summary',
    insight_key: 'marketing_campaign_roi',
    title: `Campaign ROI: ${totalConversions} Conversions from $${totalSpent.toLocaleString()} Spent`,
    body: aiBody,
    severity,
    confidence: 0.9,
    data_snapshot: {
      total_campaigns: campaigns.length,
      total_budget: totalBudget.toFixed(2),
      total_spent: totalSpent.toFixed(2),
      total_leads: totalLeads,
      total_conversions: totalConversions,
      overspent_count: overspent.length,
      zero_conversion_count: zeroConversion.length,
      campaigns: analyzed,
    },
    action_label: 'View Campaign Dashboard',
    action_url: '/marketing/campaigns',
  });

  // Dedicated insight for overspent campaigns
  if (overspent.length > 0) {
    const overBudgetTotal = overspent.reduce((s, c) => s + (c.spent - c.budget), 0);

    insights.push({
      vertical: VERTICAL,
      insight_type: 'anomaly',
      insight_key: 'marketing_overspent_campaigns',
      title: `${overspent.length} Campaign${overspent.length > 1 ? 's' : ''} Over Budget by $${overBudgetTotal.toFixed(2)}`,
      body: `The following campaigns have exceeded their budgets: ${overspent.map(c => `${c.name} ($${(c.spent - c.budget).toFixed(2)} over)`).join(', ')}. Review spend controls and reallocate budget from underperforming channels.`,
      severity: 'warning',
      confidence: 0.95,
      data_snapshot: {
        overspent_campaigns: overspent.map(c => ({
          name: c.name,
          budget: c.budget,
          spent: c.spent,
          over_by: (c.spent - c.budget).toFixed(2),
        })),
      },
      action_label: 'Review Budgets',
      action_url: '/marketing/campaigns?filter=overspent',
    });
  }

  return insights;
}

// ────────────────────────────────────────────────────────
// 2. Lead Conversion Funnel
//    Analyzes conversion rates by lead source and scores.
// ────────────────────────────────────────────────────────
async function analyzeLeadFunnel(companyId) {
  const insights = [];

  const res = await powerSync.execute(
    `SELECT lead_name, email, source, status, score
     FROM univ_leads
     WHERE company_id = ?`,
    [companyId]
  );
  const leads = res.rows._array;

  if (leads.length === 0) {
    return [{
      vertical: VERTICAL,
      insight_type: 'summary',
      insight_key: 'marketing_leads_building',
      title: 'Lead Intelligence Building',
      body: 'No lead data found. Insights will appear once leads are tracked.',
      severity: 'info',
    }];
  }

  // Group by source
  const sourceMap = {};
  const statusMap = {};

  for (const lead of leads) {
    const source = (lead.source || 'Unknown').trim();
    const status = (lead.status || 'unknown').toLowerCase().trim();

    if (!sourceMap[source]) sourceMap[source] = { total: 0, converted: 0, scores: [] };
    sourceMap[source].total++;
    sourceMap[source].scores.push(Number(lead.score) || 0);
    if (status === 'converted' || status === 'won' || status === 'customer') {
      sourceMap[source].converted++;
    }

    if (!statusMap[status]) statusMap[status] = 0;
    statusMap[status]++;
  }

  const sourceAnalysis = Object.entries(sourceMap).map(([source, data]) => ({
    source,
    total: data.total,
    converted: data.converted,
    conversion_rate: ((data.converted / data.total) * 100).toFixed(1),
    avg_score: (data.scores.reduce((s, v) => s + v, 0) / data.scores.length).toFixed(1),
  })).sort((a, b) => Number(b.conversion_rate) - Number(a.conversion_rate));

  const totalConverted = Object.values(sourceMap).reduce((s, d) => s + d.converted, 0);
  const overallRate = ((totalConverted / leads.length) * 100).toFixed(1);

  const aiBody = await generateInsight(
    `Lead funnel analysis: ${leads.length} total leads, ${totalConverted} converted (${overallRate}% overall). Breakdown by source: ${sourceAnalysis.map(s => `${s.source}: ${s.conversion_rate}%`).join(', ')}. Status distribution: ${Object.entries(statusMap).map(([k, v]) => `${k}: ${v}`).join(', ')}. Identify the best lead sources and recommend funnel improvements.`,
    { sourceAnalysis, statusDistribution: statusMap, totalLeads: leads.length }
  );

  let severity = 'info';
  if (Number(overallRate) > 20) severity = 'positive';
  else if (Number(overallRate) < 5) severity = 'warning';

  insights.push({
    vertical: VERTICAL,
    insight_type: 'pattern',
    insight_key: 'marketing_lead_funnel',
    title: `Lead Conversion: ${overallRate}% Across ${sourceAnalysis.length} Source${sourceAnalysis.length > 1 ? 's' : ''}`,
    body: aiBody,
    severity,
    confidence: 0.87,
    data_snapshot: {
      total_leads: leads.length,
      total_converted: totalConverted,
      overall_rate: overallRate,
      by_source: sourceAnalysis,
      status_distribution: statusMap,
    },
    action_label: 'View Lead Pipeline',
    action_url: '/marketing/leads',
  });

  return insights;
}

// ────────────────────────────────────────────────────────
// 3. Content Performance
//    Identifies publishing gaps and content calendar health.
// ────────────────────────────────────────────────────────
async function analyzeContentPerformance(companyId) {
  const insights = [];
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const res = await powerSync.execute(
    `SELECT title, platform, publish_date, status
     FROM univ_contentcalendar
     WHERE company_id = ?
     ORDER BY publish_date DESC`,
    [companyId]
  );
  const content = res.rows._array;

  if (content.length === 0) {
    return [{
      vertical: VERTICAL,
      insight_type: 'summary',
      insight_key: 'marketing_content_building',
      title: 'Content Intelligence Building',
      body: 'No content calendar data found. Add content entries to enable performance insights.',
      severity: 'info',
    }];
  }

  // Split by time
  const recentContent = content.filter(c => c.publish_date >= thirtyDaysAgo && c.publish_date <= today);
  const publishedRecent = recentContent.filter(c => (c.status || '').toLowerCase() === 'published');
  const scheduledContent = content.filter(c => c.publish_date > today);

  // Platform distribution
  const platformMap = {};
  for (const c of content) {
    const platform = (c.platform || 'Unknown').trim();
    if (!platformMap[platform]) platformMap[platform] = { total: 0, published: 0 };
    platformMap[platform].total++;
    if ((c.status || '').toLowerCase() === 'published') platformMap[platform].published++;
  }
  const platforms = Object.entries(platformMap).map(([name, d]) => ({
    platform: name,
    total: d.total,
    published: d.published,
  }));

  // Detect publishing gaps — days without content in last 30 days
  const dailyContent = groupByDay(publishedRecent, 'publish_date');
  const daysWithContent = dailyContent.length;
  const gapDays = 30 - daysWithContent;

  // Draft/pending items that may be stale
  const drafts = content.filter(c => {
    const status = (c.status || '').toLowerCase();
    return (status === 'draft' || status === 'pending') && c.publish_date < today;
  });

  const aiBody = await generateInsight(
    `Content calendar analysis: ${content.length} total items, ${publishedRecent.length} published in last 30 days, ${scheduledContent.length} scheduled. Published on ${daysWithContent} of the last 30 days (${gapDays} gap days). ${drafts.length} overdue drafts. Platforms: ${platforms.map(p => `${p.platform}: ${p.total}`).join(', ')}. Identify publishing cadence issues and recommend improvements.`,
    {
      total_content: content.length,
      recent_published: publishedRecent.length,
      scheduled: scheduledContent.length,
      gap_days: gapDays,
      overdue_drafts: drafts.length,
      platforms,
      daily_breakdown: dailyContent,
    }
  );

  let severity = 'info';
  if (gapDays > 20) severity = 'warning';
  else if (gapDays < 10) severity = 'positive';
  if (drafts.length > 5) severity = 'warning';

  insights.push({
    vertical: VERTICAL,
    insight_type: 'recommendation',
    insight_key: 'marketing_content_performance',
    title: `${publishedRecent.length} Posts Last 30 Days · ${gapDays} Gap Day${gapDays !== 1 ? 's' : ''}`,
    body: aiBody,
    severity,
    confidence: 0.88,
    data_snapshot: {
      total_content: content.length,
      recent_published: publishedRecent.length,
      scheduled: scheduledContent.length,
      gap_days: gapDays,
      overdue_drafts: drafts.length,
      platforms,
    },
    action_label: 'View Content Calendar',
    action_url: '/marketing/content',
  });

  // Dedicated insight for overdue drafts
  if (drafts.length > 0) {
    insights.push({
      vertical: VERTICAL,
      insight_type: 'risk',
      insight_key: 'marketing_overdue_drafts',
      title: `${drafts.length} Overdue Draft${drafts.length > 1 ? 's' : ''} Need Attention`,
      body: `${drafts.length} content ${drafts.length > 1 ? 'items are' : 'item is'} past ${drafts.length > 1 ? 'their' : 'its'} scheduled publish date and still in draft/pending status: ${drafts.slice(0, 5).map(d => `"${d.title}" (${d.publish_date})`).join(', ')}${drafts.length > 5 ? ` and ${drafts.length - 5} more` : ''}. Publish or reschedule to maintain cadence.`,
      severity: 'warning',
      confidence: 0.95,
      data_snapshot: {
        overdue_drafts: drafts.slice(0, 10).map(d => ({
          title: d.title,
          platform: d.platform,
          publish_date: d.publish_date,
          status: d.status,
        })),
      },
      action_label: 'View Drafts',
      action_url: '/marketing/content?filter=drafts',
    });
  }

  return insights;
}

// ────────────────────────────────────────────────────────
// 4. Lead Magnet Effectiveness
//    Evaluates download-to-lead conversion and flags
//    underperforming assets.
// ────────────────────────────────────────────────────────
async function analyzeLeadMagnets(companyId) {
  const insights = [];

  const res = await powerSync.execute(
    `SELECT magnet_name, type, downloads, leads_generated, status
     FROM univ_leadmagnets
     WHERE company_id = ?`,
    [companyId]
  );
  const magnets = res.rows._array;

  if (magnets.length === 0) {
    return [{
      vertical: VERTICAL,
      insight_type: 'summary',
      insight_key: 'marketing_magnets_building',
      title: 'Lead Magnet Intelligence Building',
      body: 'No lead magnet data found. Add lead magnets to enable effectiveness analysis.',
      severity: 'info',
    }];
  }

  const analyzed = magnets.map(m => {
    const downloads = Number(m.downloads) || 0;
    const leads = Number(m.leads_generated) || 0;
    const conversionRate = downloads > 0 ? (leads / downloads) * 100 : 0;

    return {
      name: m.magnet_name,
      type: m.type,
      status: m.status,
      downloads,
      leads,
      conversion_rate: conversionRate.toFixed(1),
    };
  });

  const totalDownloads = analyzed.reduce((s, m) => s + m.downloads, 0);
  const totalLeads = analyzed.reduce((s, m) => s + m.leads, 0);
  const overallConversion = totalDownloads > 0 ? ((totalLeads / totalDownloads) * 100).toFixed(1) : '0.0';

  // Avg conversion rate (per magnet, not weighted)
  const magnetRates = analyzed.filter(m => m.downloads > 0).map(m => Number(m.conversion_rate));
  const avgRate = magnetRates.length > 0
    ? magnetRates.reduce((s, r) => s + r, 0) / magnetRates.length
    : 0;

  // Underperformers: below 50% of the average conversion rate, with at least some downloads
  const underperformers = analyzed.filter(m =>
    m.downloads > 0 && Number(m.conversion_rate) < avgRate * 0.5
  );

  // Top performers
  const topPerformers = [...analyzed].filter(m => m.downloads > 0)
    .sort((a, b) => Number(b.conversion_rate) - Number(a.conversion_rate))
    .slice(0, 3);

  // Zero-download assets (potentially not promoted)
  const zeroDownloads = analyzed.filter(m => m.downloads === 0 && (m.status || '').toLowerCase() === 'active');

  const aiBody = await generateInsight(
    `Lead magnet analysis: ${magnets.length} assets, ${totalDownloads} total downloads, ${totalLeads} leads generated (${overallConversion}% conversion). Average per-magnet conversion: ${avgRate.toFixed(1)}%. ${underperformers.length} underperformers, ${zeroDownloads.length} active assets with zero downloads. Top: ${topPerformers.map(t => `${t.name} (${t.conversion_rate}%)`).join(', ')}. Recommend which magnets to optimize, retire, or promote.`,
    {
      magnets: analyzed,
      topPerformers,
      underperformers: underperformers.map(u => u.name),
      zeroDownloads: zeroDownloads.map(z => z.name),
    }
  );

  let severity = 'info';
  if (underperformers.length > magnets.length / 2) severity = 'warning';
  else if (Number(overallConversion) > 15) severity = 'positive';

  insights.push({
    vertical: VERTICAL,
    insight_type: 'recommendation',
    insight_key: 'marketing_lead_magnet_effectiveness',
    title: `Lead Magnets: ${overallConversion}% Conversion Across ${magnets.length} Asset${magnets.length > 1 ? 's' : ''}`,
    body: aiBody,
    severity,
    confidence: 0.85,
    data_snapshot: {
      total_magnets: magnets.length,
      total_downloads: totalDownloads,
      total_leads: totalLeads,
      overall_conversion: overallConversion,
      avg_rate: avgRate.toFixed(1),
      underperformer_count: underperformers.length,
      zero_download_count: zeroDownloads.length,
      magnets: analyzed,
    },
    action_label: 'View Lead Magnets',
    action_url: '/marketing/magnets',
  });

  // Dedicated insight for underperformers
  if (underperformers.length > 0) {
    insights.push({
      vertical: VERTICAL,
      insight_type: 'anomaly',
      insight_key: 'marketing_underperforming_magnets',
      title: `${underperformers.length} Lead Magnet${underperformers.length > 1 ? 's' : ''} Underperforming`,
      body: `These assets convert at less than half the average rate (${avgRate.toFixed(1)}%): ${underperformers.map(u => `${u.name} (${u.conversion_rate}%, ${u.downloads} downloads)`).join(', ')}. Consider refreshing the content, updating the landing page, or retiring these assets.`,
      severity: 'warning',
      confidence: 0.88,
      data_snapshot: {
        avg_rate: avgRate.toFixed(1),
        underperformers,
      },
      action_label: 'Optimize Magnets',
      action_url: '/marketing/magnets?filter=underperforming',
    });
  }

  return insights;
}

// ────────────────────────────────────────────────────────
// Main export — runs all sub-engines, returns combined insights
// ────────────────────────────────────────────────────────
export default async function marketingEngine(companyId) {
  const results = await Promise.allSettled([
    analyzeCampaignROI(companyId),
    analyzeLeadFunnel(companyId),
    analyzeContentPerformance(companyId),
    analyzeLeadMagnets(companyId),
  ]);

  return results.flatMap(r => (r.status === 'fulfilled' ? r.value : []));
}
