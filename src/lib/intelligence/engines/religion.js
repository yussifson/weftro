// src/lib/intelligence/engines/religion.js
// Religion / Church vertical intelligence engine
// Analyzes donations, attendance, pledge fulfillment, and event engagement.

import { generateInsight, groupByWeek, groupByDay } from '@/lib/intelligence/engine';
import { powerSync } from '@/api/PowerSyncConnector';

const VERTICAL = 'religion';

// ────────────────────────────────────────────────────────
// 1. Donation Trend Analysis
//    Compares last 90 days of donations to the prior
//    90-day period to surface growth or decline.
// ────────────────────────────────────────────────────────
async function analyzeDonationTrends(companyId) {
  const insights = [];
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const oneEightyDaysAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];

  const currentRes = await powerSync.execute(
    `SELECT donor_name, amount, donation_date, type
     FROM univ_donations
     WHERE company_id = ? AND donation_date >= ? AND donation_date <= ?
     ORDER BY donation_date DESC`,
    [companyId, ninetyDaysAgo, today]
  );
  const currentDonations = currentRes.rows._array;

  const priorRes = await powerSync.execute(
    `SELECT donor_name, amount, donation_date, type
     FROM univ_donations
     WHERE company_id = ? AND donation_date >= ? AND donation_date < ?
     ORDER BY donation_date DESC`,
    [companyId, oneEightyDaysAgo, ninetyDaysAgo]
  );
  const priorDonations = priorRes.rows._array;

  if (currentDonations.length === 0 && priorDonations.length === 0) {
    return [{
      vertical: VERTICAL,
      insight_type: 'summary',
      insight_key: 'religion_donations_building',
      title: 'Donation Intelligence Building',
      body: 'No donation records found yet. Insights will appear once giving data is available.',
      severity: 'info',
    }];
  }

  const currentTotal = currentDonations.reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const priorTotal = priorDonations.reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const currentCount = currentDonations.length;
  const priorCount = priorDonations.length;
  const changePct = priorTotal > 0 ? ((currentTotal - priorTotal) / priorTotal) * 100 : null;

  // Weekly breakdown for trend visibility
  const weeklyTrend = groupByWeek(currentDonations, 'donation_date', 'amount');

  // Unique donors
  const currentDonors = new Set(currentDonations.map(d => (d.donor_name || '').toLowerCase().trim())).size;
  const priorDonors = new Set(priorDonations.map(d => (d.donor_name || '').toLowerCase().trim())).size;

  const aiBody = await generateInsight(
    `Analyze church/organization donation trends. Current 90 days: $${currentTotal.toFixed(2)} from ${currentCount} donations (${currentDonors} unique donors). Prior 90 days: $${priorTotal.toFixed(2)} from ${priorCount} donations (${priorDonors} unique donors). Change: ${changePct !== null ? changePct.toFixed(1) + '%' : 'no prior data'}. Identify patterns and recommend actions.`,
    { weeklyTrend, currentTotal, priorTotal, changePct, currentDonors, priorDonors }
  );

  let severity = 'positive';
  if (changePct !== null && changePct < -20) severity = 'critical';
  else if (changePct !== null && changePct < -5) severity = 'warning';
  else if (changePct !== null && changePct < 5) severity = 'info';

  insights.push({
    vertical: VERTICAL,
    insight_type: 'summary',
    insight_key: 'religion_donation_trend',
    title: changePct !== null
      ? `Donations ${changePct >= 0 ? 'Up' : 'Down'} ${Math.abs(changePct).toFixed(1)}% Over 90 Days`
      : `$${currentTotal.toLocaleString()} in Donations (Last 90 Days)`,
    body: aiBody,
    severity,
    confidence: 0.9,
    data_snapshot: {
      current_total: currentTotal.toFixed(2),
      prior_total: priorTotal.toFixed(2),
      change_pct: changePct !== null ? changePct.toFixed(1) : null,
      current_count: currentCount,
      prior_count: priorCount,
      current_donors: currentDonors,
      prior_donors: priorDonors,
      weekly_trend: weeklyTrend,
    },
    action_label: 'View Donation Report',
    action_url: '/religion/donations',
  });

  return insights;
}

// ────────────────────────────────────────────────────────
// 2. Attendance Pattern Analysis
//    Tracks service attendance trends week over week.
// ────────────────────────────────────────────────────────
async function analyzeAttendance(companyId) {
  const insights = [];

  const res = await powerSync.execute(
    `SELECT service_date, attendees, notes
     FROM univ_churchattendance
     WHERE company_id = ?
     ORDER BY service_date DESC`,
    [companyId]
  );
  const records = res.rows._array;

  if (records.length < 3) {
    return [{
      vertical: VERTICAL,
      insight_type: 'summary',
      insight_key: 'religion_attendance_building',
      title: 'Attendance Intelligence Building',
      body: 'At least 3 service records are needed to identify attendance patterns.',
      severity: 'info',
    }];
  }

  const attendees = records.map(r => Number(r.attendees) || 0);
  const avgAttendance = attendees.reduce((s, a) => s + a, 0) / attendees.length;
  const maxAttendance = Math.max(...attendees);
  const minAttendance = Math.min(...attendees);

  // Trend: compare last 4 services to the 4 before that
  const recentSlice = attendees.slice(0, Math.min(4, attendees.length));
  const priorSlice = attendees.slice(4, Math.min(8, attendees.length));
  const recentAvg = recentSlice.reduce((s, a) => s + a, 0) / recentSlice.length;
  const priorAvg = priorSlice.length > 0
    ? priorSlice.reduce((s, a) => s + a, 0) / priorSlice.length
    : null;
  const trendPct = priorAvg ? ((recentAvg - priorAvg) / priorAvg) * 100 : null;

  // Detect low-attendance outliers (services below 60% of average)
  const lowOutliers = records.filter(r => (Number(r.attendees) || 0) < avgAttendance * 0.6);

  const aiBody = await generateInsight(
    `Analyze church attendance patterns. Average: ${avgAttendance.toFixed(0)}, recent 4-service avg: ${recentAvg.toFixed(0)}, prior 4-service avg: ${priorAvg ? priorAvg.toFixed(0) : 'N/A'}. Trend: ${trendPct !== null ? trendPct.toFixed(1) + '%' : 'insufficient data'}. ${lowOutliers.length} low-attendance outlier services detected. Total records: ${records.length}.`,
    {
      records: records.slice(0, 12).map(r => ({
        date: r.service_date,
        attendees: r.attendees,
        notes: r.notes,
      })),
      averageAttendance: avgAttendance.toFixed(0),
      trendPct: trendPct !== null ? trendPct.toFixed(1) : null,
      lowOutlierCount: lowOutliers.length,
    }
  );

  let severity = 'positive';
  if (trendPct !== null && trendPct < -20) severity = 'critical';
  else if (trendPct !== null && trendPct < -5) severity = 'warning';
  else if (trendPct === null || (trendPct >= -5 && trendPct < 5)) severity = 'info';

  insights.push({
    vertical: VERTICAL,
    insight_type: 'pattern',
    insight_key: 'religion_attendance_trend',
    title: trendPct !== null
      ? `Attendance ${trendPct >= 0 ? 'Up' : 'Down'} ${Math.abs(trendPct).toFixed(1)}% Recently`
      : `Average Attendance: ${avgAttendance.toFixed(0)}`,
    body: aiBody,
    severity,
    confidence: 0.85,
    data_snapshot: {
      average: avgAttendance.toFixed(0),
      max: maxAttendance,
      min: minAttendance,
      recent_avg: recentAvg.toFixed(0),
      prior_avg: priorAvg ? priorAvg.toFixed(0) : null,
      trend_pct: trendPct !== null ? trendPct.toFixed(1) : null,
      total_records: records.length,
      low_outliers: lowOutliers.length,
    },
    action_label: 'View Attendance History',
    action_url: '/religion/attendance',
  });

  return insights;
}

// ────────────────────────────────────────────────────────
// 3. Pledge Fulfillment
//    Flags unfulfilled or stale pledges.
// ────────────────────────────────────────────────────────
async function analyzePledgeFulfillment(companyId) {
  const insights = [];

  const res = await powerSync.execute(
    `SELECT id, company_id FROM univ_pledge WHERE company_id = ?`,
    [companyId]
  );
  const pledges = res.rows._array;

  if (pledges.length === 0) {
    return [{
      vertical: VERTICAL,
      insight_type: 'summary',
      insight_key: 'religion_pledge_building',
      title: 'Pledge Intelligence Building',
      body: 'No pledge records found. Insights will appear once pledges are tracked.',
      severity: 'info',
    }];
  }

  // Try to derive more context — look for status-like or fulfilled-like columns
  // Since we only have id and company_id confirmed, we count and report
  const totalPledges = pledges.length;

  // Attempt a richer query — gracefully degrade if columns don't exist
  let fulfilledCount = 0;
  let unfulfilledCount = 0;
  let totalPledged = 0;
  let totalFulfilled = 0;
  let hasRichData = false;

  try {
    const richRes = await powerSync.execute(
      `SELECT status, COALESCE(SUM(amount), 0) AS total_amount, COUNT(*) AS cnt
       FROM univ_pledge
       WHERE company_id = ?
       GROUP BY status`,
      [companyId]
    );
    const statusGroups = richRes.rows._array;
    hasRichData = statusGroups.length > 0;

    for (const g of statusGroups) {
      const s = (g.status || '').toLowerCase();
      if (s === 'fulfilled' || s === 'completed' || s === 'paid') {
        fulfilledCount += Number(g.cnt) || 0;
        totalFulfilled += Number(g.total_amount) || 0;
      } else {
        unfulfilledCount += Number(g.cnt) || 0;
      }
      totalPledged += Number(g.total_amount) || 0;
    }
  } catch {
    // Columns not available — fall back to count-only
    hasRichData = false;
  }

  if (hasRichData && unfulfilledCount > 0) {
    const fulfillmentRate = totalPledges > 0 ? ((fulfilledCount / totalPledges) * 100).toFixed(1) : '0.0';

    const aiBody = await generateInsight(
      `Pledge fulfillment analysis: ${fulfilledCount} of ${totalPledges} pledges fulfilled (${fulfillmentRate}%). ${unfulfilledCount} pledges remain outstanding. Total pledged: $${totalPledged.toFixed(2)}, fulfilled: $${totalFulfilled.toFixed(2)}. Advise on follow-up strategies.`,
      {
        total_pledges: totalPledges,
        fulfilled: fulfilledCount,
        unfulfilled: unfulfilledCount,
        fulfillment_rate: fulfillmentRate,
        total_pledged: totalPledged.toFixed(2),
        total_fulfilled: totalFulfilled.toFixed(2),
      }
    );

    insights.push({
      vertical: VERTICAL,
      insight_type: 'recommendation',
      insight_key: 'religion_pledge_fulfillment',
      title: `${unfulfilledCount} Unfulfilled Pledge${unfulfilledCount > 1 ? 's' : ''} — ${fulfillmentRate}% Completion`,
      body: aiBody,
      severity: Number(fulfillmentRate) < 50 ? 'warning' : 'info',
      confidence: 0.82,
      data_snapshot: {
        total_pledges: totalPledges,
        fulfilled: fulfilledCount,
        unfulfilled: unfulfilledCount,
        fulfillment_rate: fulfillmentRate,
        total_pledged: totalPledged.toFixed(2),
        total_fulfilled: totalFulfilled.toFixed(2),
      },
      action_label: 'View Pledges',
      action_url: '/religion/pledges',
    });
  } else {
    // Minimal data — report what we have
    const aiBody = await generateInsight(
      `There are ${totalPledges} pledges on record. Summarize the pledge tracking status and recommend how the organization can improve follow-up.`,
      { total_pledges: totalPledges }
    );

    insights.push({
      vertical: VERTICAL,
      insight_type: 'summary',
      insight_key: 'religion_pledge_overview',
      title: `${totalPledges} Pledge${totalPledges > 1 ? 's' : ''} on Record`,
      body: aiBody,
      severity: 'info',
      data_snapshot: { total_pledges: totalPledges },
      action_label: 'View Pledges',
      action_url: '/religion/pledges',
    });
  }

  return insights;
}

// ────────────────────────────────────────────────────────
// 4. Event Engagement
//    Analyzes upcoming vs past event attendance to
//    identify engagement trends and planning gaps.
// ────────────────────────────────────────────────────────
async function analyzeEventEngagement(companyId) {
  const insights = [];
  const today = new Date().toISOString().split('T')[0];

  const res = await powerSync.execute(
    `SELECT event_name, event_date, attendees, status
     FROM univ_events
     WHERE company_id = ?
     ORDER BY event_date DESC`,
    [companyId]
  );
  const events = res.rows._array;

  if (events.length === 0) {
    return [{
      vertical: VERTICAL,
      insight_type: 'summary',
      insight_key: 'religion_events_building',
      title: 'Event Intelligence Building',
      body: 'No events found. Insights will appear once events are tracked.',
      severity: 'info',
    }];
  }

  const pastEvents = events.filter(e => e.event_date < today);
  const upcomingEvents = events.filter(e => e.event_date >= today);

  const pastAttendees = pastEvents.map(e => Number(e.attendees) || 0);
  const avgPastAttendance = pastAttendees.length > 0
    ? pastAttendees.reduce((s, a) => s + a, 0) / pastAttendees.length
    : 0;

  // Identify high-performing and low-performing past events
  const highPerformers = pastEvents.filter(e => (Number(e.attendees) || 0) > avgPastAttendance * 1.3);
  const lowPerformers = pastEvents.filter(e => (Number(e.attendees) || 0) < avgPastAttendance * 0.5 && (Number(e.attendees) || 0) > 0);

  const aiBody = await generateInsight(
    `Event engagement analysis: ${pastEvents.length} past events (avg attendance: ${avgPastAttendance.toFixed(0)}), ${upcomingEvents.length} upcoming. ${highPerformers.length} high-performing events (>130% avg), ${lowPerformers.length} underperforming (<50% avg). Analyze engagement patterns and recommend how to boost attendance.`,
    {
      past_count: pastEvents.length,
      upcoming_count: upcomingEvents.length,
      avg_attendance: avgPastAttendance.toFixed(0),
      upcoming: upcomingEvents.slice(0, 5).map(e => ({
        name: e.event_name,
        date: e.event_date,
        status: e.status,
      })),
      high_performers: highPerformers.slice(0, 5).map(e => ({
        name: e.event_name,
        attendees: e.attendees,
        date: e.event_date,
      })),
      low_performers: lowPerformers.slice(0, 5).map(e => ({
        name: e.event_name,
        attendees: e.attendees,
        date: e.event_date,
      })),
    }
  );

  let severity = 'info';
  if (upcomingEvents.length === 0 && pastEvents.length > 0) severity = 'warning';
  else if (avgPastAttendance > 0 && lowPerformers.length > highPerformers.length) severity = 'warning';
  else if (highPerformers.length > 0) severity = 'positive';

  insights.push({
    vertical: VERTICAL,
    insight_type: 'pattern',
    insight_key: 'religion_event_engagement',
    title: `${upcomingEvents.length} Upcoming Event${upcomingEvents.length !== 1 ? 's' : ''} · Avg Attendance ${avgPastAttendance.toFixed(0)}`,
    body: aiBody,
    severity,
    confidence: 0.83,
    data_snapshot: {
      total_events: events.length,
      past_count: pastEvents.length,
      upcoming_count: upcomingEvents.length,
      avg_past_attendance: avgPastAttendance.toFixed(0),
      high_performers: highPerformers.length,
      low_performers: lowPerformers.length,
    },
    action_label: 'View Events',
    action_url: '/religion/events',
  });

  return insights;
}

// ────────────────────────────────────────────────────────
// Main export — runs all sub-engines, returns combined insights
// ────────────────────────────────────────────────────────
export default async function religionEngine(companyId) {
  const results = await Promise.allSettled([
    analyzeDonationTrends(companyId),
    analyzeAttendance(companyId),
    analyzePledgeFulfillment(companyId),
    analyzeEventEngagement(companyId),
  ]);

  return results.flatMap(r => (r.status === 'fulfilled' ? r.value : []));
}
