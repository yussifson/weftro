import { powerSync } from '@/api/PowerSyncConnector';

export async function computeHealthScore(workspaceId, vertical) {
  const breakdown = {};

  // 1. Data completeness (25 points)
  const primaryTable = getPrimaryTable(vertical || 'universal');
  if (primaryTable) {
    try {
      const res = await powerSync.execute(
        `SELECT count(*) as total FROM ${primaryTable} WHERE company_id = ?`,
        [workspaceId]
      );
      const total = res.rows._array[0].total;
      breakdown['data_volume'] = Math.min(25, Math.floor((total / 50) * 25));
    } catch (err) {
      breakdown['data_volume'] = 0;
    }
  } else {
    breakdown['data_volume'] = 10;
  }

  // 2. Data recency (20 points)
  try {
    const res = await powerSync.execute(
      `SELECT created_at FROM audit_logs WHERE company_id = ? ORDER BY created_at DESC LIMIT 1`,
      [workspaceId]
    );
    if (res.rows._array.length > 0) {
      const latest = res.rows._array[0].created_at;
      const hoursAgo = (Date.now() - new Date(latest).getTime()) / (60 * 60 * 1000);
      breakdown['data_recency'] = hoursAgo <= 24 ? 20 : hoursAgo <= 72 ? 15 : hoursAgo <= 168 ? 10 : 5;
    } else {
      breakdown['data_recency'] = 0;
    }
  } catch (err) {
    breakdown['data_recency'] = 0;
  }

  // 3. Insight engagement (25 points)
  try {
    const res = await powerSync.execute(
      `SELECT feedback_type FROM insight_feedback WHERE workspace_id = ? AND created_at >= date('now', '-30 days')`,
      [workspaceId]
    );
    const feedbackData = res.rows._array;
    if (feedbackData.length > 0) {
      const positiveActions = feedbackData.filter(f => f.feedback_type === 'acted_on' || f.feedback_type === 'helpful').length;
      const engagementRate = positiveActions / feedbackData.length;
      breakdown['insight_engagement'] = Math.floor(engagementRate * 25);
    } else {
      breakdown['insight_engagement'] = 0;
    }
  } catch (err) {
    breakdown['insight_engagement'] = 0;
  }

  // 4. Intelligence coverage (30 points)
  try {
    const res = await powerSync.execute(
      `SELECT DISTINCT insight_key FROM workspace_insights WHERE company_id = ? AND is_dismissed = 0`,
      [workspaceId]
    );
    const uniqueInsightTypes = res.rows._array.length;
    breakdown['intelligence_coverage'] = Math.min(30, uniqueInsightTypes * 5);
  } catch (err) {
    breakdown['intelligence_coverage'] = 0;
  }

  const score = Object.values(breakdown).reduce((s, v) => s + v, 0);
  const grade = score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'F';

  const improvements = [];
  if ((breakdown['data_volume'] || 0) < 15) improvements.push('Add more records to improve pattern detection accuracy');
  if ((breakdown['data_recency'] || 0) < 15) improvements.push('Ensure data is being updated regularly for real-time intelligence');
  if ((breakdown['insight_engagement'] || 0) < 10) improvements.push('Act on or rate insights to help the system learn your priorities');
  if ((breakdown['intelligence_coverage'] || 0) < 20) improvements.push('More intelligence types will activate as your data grows');

  const summary = score >= 85
    ? 'Slate has a comprehensive understanding of your business and is producing high-confidence intelligence.'
    : score >= 70
    ? 'Slate is building a solid understanding of your business. A few more data points will sharpen the intelligence.'
    : score >= 55
    ? 'Slate is learning your business patterns. Add more records and interact with insights to accelerate intelligence.'
    : 'Slate needs more data to produce meaningful intelligence. Start by completing key records in your system.';

  // Return the computed insight
  return {
    vertical: 'universal',
    insight_type: 'summary',
    insight_key: 'intelligence_health_score',
    title: `Intelligence Health Score: ${score}/100 (${grade})`,
    body: summary,
    severity: score >= 70 ? 'positive' : score >= 40 ? 'info' : 'warning',
    confidence: 90,
    data_snapshot: { score, grade, breakdown, improvements }
  };
}

function getPrimaryTable(vertical) {
  const map = {
    legal: 'cases', hospital: 'patients', school: 'students',
    university: 'students', hr: 'employees', retail: 'retail_orders',
    hotel: 'hotel_bookings', logistics: 'logistics_deliveries', insurance: 'insurance_policies',
    religion: 'congregation_members',
  };
  return map[vertical] || null;
}
