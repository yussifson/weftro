import { generateInsight } from '../engine';
import { powerSync } from '@/api/PowerSyncConnector';

export async function runCausalChainEngine(companyId, vertical) {
  const insights = [];
  try {
    const res = await powerSync.execute(
      `SELECT insight_key, title, data_snapshot, computed_at FROM workspace_insights WHERE company_id = ? AND severity IN ('warning', 'critical') AND is_dismissed = 0 ORDER BY computed_at DESC LIMIT 5`,
      [companyId]
    );
    const recentInsights = res.rows._array;
    if (!recentInsights.length) return insights;

    for (const issue of recentInsights) {
      const causes = await findUpstreamCauses(companyId, issue);
      if (causes.length === 0) continue;

      const causalChain = causes.map((c, i) => `${i + 1}. ${c}`).join(' → ');
      const body = await generateInsight(
        `This issue was detected: "${issue.title}". Potential upstream causes identified: ${causalChain}. Give a 2-sentence explanation of what this causal chain means and what the root action should be.`,
        { issue: issue.title, causes }
      );

      insights.push({
        vertical: 'universal',
        insight_type: 'pattern',
        insight_key: `causal_chain_${issue.insight_key}`,
        title: `Root cause analysis: ${issue.title}`,
        body,
        severity: 'warning',
        confidence: 60,
        data_snapshot: { issue: issue.title, causes },
        action_label: 'View details',
        action_url: '/',
      });
    }
  } catch(err) {
    console.error('Causal chain error:', err);
  }
  return insights;
}

async function findUpstreamCauses(companyId, issue) {
  const causes = [];
  const issueKey = issue.insight_key || '';
  if (issueKey.includes('revenue')) {
    try {
      const cRes = await powerSync.execute(`SELECT count(*) as c FROM clients WHERE company_id = ? AND created_at >= date('now', '-30 days')`, [companyId]);
      if (cRes.rows.item(0).c === 0) causes.push('New client acquisition dropped to 0 in past 30 days');
    } catch(e){}
  }
  return causes;
}
