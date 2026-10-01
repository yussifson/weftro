import { generateInsight } from '@/lib/intelligence/engine';
import { powerSync } from '@/api/PowerSyncConnector';

export default async function optavelEngine(companyId) {
  const insights = [];

  try {
    // 1. Churn Prediction (mock logic for demo)
    const lowEngagementAccounts = [
      { name: 'Vertex Inc', activityDrop: 45, mrr: 2500 }
    ];
    
    if (lowEngagementAccounts.length > 0) {
      insights.push(generateInsight(
        companyId,
        'churn_risk',
        'High Churn Risk Detected',
        `Enterprise Account '${lowEngagementAccounts[0].name}' is showing an activity drop of ${lowEngagementAccounts[0].activityDrop}%. MRR at risk: $${lowEngagementAccounts[0].mrr}. Recommend immediate CS outreach.`,
        'high',
        '/optavel/sales',
        'optavel'
      ));
    }

    // 2. Revenue Forecast Accuracy
    const forecastVariance = -2.4; // %
    insights.push(generateInsight(
      companyId,
      'financial_insight',
      'Forecast Accuracy Strong',
      `Current month revenue is tracking with a ${forecastVariance}% variance against the Q3 forecast. Enterprise pipeline conversion is the primary driver.`,
      'low',
      '/optavel/finance',
      'optavel'
    ));

    // 3. Growth Partner Performance
    insights.push(generateInsight(
      companyId,
      'performance_alert',
      'Quota Exceeded',
      `Growth Partner Sarah J. exceeded quarterly quota early. Vesting schedule milestone achieved.`,
      'medium',
      '/optavel/hr',
      'optavel'
    ));

    // 4. Engineering Velocity Trend
    insights.push(generateInsight(
      companyId,
      'velocity_alert',
      'Velocity Drop Detected',
      `Engineering velocity dropped 15% this sprint compared to the 6-sprint average. Check for blocked PRs in the Orbit repository.`,
      'medium',
      '/optavel/product',
      'optavel'
    ));

  } catch (error) {
    console.error("Optavel Engine Error:", error);
  }

  // Filter out any nulls if generateInsight failed
  return Promise.all(insights).then(res => res.filter(Boolean));
}

