import { generateInsight } from '../engine';
import { powerSync } from '../../../api/PowerSyncConnector';

export async function detectCaseDeadlineRisk(companyId) {
  const res = await powerSync.execute(
    `SELECT id, title, case_number, statute_of_limitations, status, risk_score
     FROM cases
     WHERE company_id = ?
       AND status IN ('open', 'active', 'pending')
       AND statute_of_limitations IS NOT NULL
       AND statute_of_limitations >= date('now')
     ORDER BY statute_of_limitations ASC`,
    [companyId]
  );

  const upcomingDeadlines = res.rows._array;
  if (upcomingDeadlines.length === 0) return [];

  const urgentCases = [];
  const warningCases = [];

  const now = new Date();
  
  upcomingDeadlines.forEach(c => {
    const deadline = new Date(c.statute_of_limitations);
    const daysUntil = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

    if (daysUntil <= 7) {
      urgentCases.push({ ...c, days_until: daysUntil });
    } else if (daysUntil <= 30) {
      warningCases.push({ ...c, days_until: daysUntil });
    }
  });

  if (urgentCases.length === 0 && warningCases.length === 0) return [];

  const insights = [];

  if (urgentCases.length > 0) {
    const body = await generateInsight(
      `CRITICAL LEGAL RISK: ${urgentCases.length} case(s) have statute of limitations or critical deadlines expiring within 7 days. Details: ${JSON.stringify(urgentCases)}. Summarize the immediate actions required to avoid malpractice or missed filings.`,
      { urgentCases }
    );

    insights.push({
      vertical: 'legal',
      insight_type: 'risk',
      insight_key: 'urgent_deadlines',
      title: `s* ${urgentCases.length} critical case deadline${urgentCases.length !== 1 ? 's' : ''} approaching (<= 7 days)`,
      body,
      severity: 'critical',
      confidence: 0.95,
      data_snapshot: { urgent_cases: urgentCases },
      action_label: 'View Urgent Cases',
      action_url: '/cases?filter=urgent_deadlines',
    });
  }

  if (warningCases.length > 0) {
    insights.push({
      vertical: 'legal',
      insight_type: 'reminder',
      insight_key: 'upcoming_deadlines',
      title: `${warningCases.length} case deadline${warningCases.length !== 1 ? 's' : ''} coming up (30 days)`,
      body: `${warningCases.length} active case(s) have critical deadlines approaching within the next month. Ensure all necessary documentation and filings are prepared well in advance.`,
      severity: 'warning',
      confidence: 0.85,
      data_snapshot: { warning_cases: warningCases.slice(0, 5) },
      action_label: 'View Upcoming Deadlines',
      action_url: '/cases?filter=upcoming_deadlines',
    });
  }

  return insights;
}

export async function detectBillingGaps(companyId) {
  const res = await powerSync.execute(
    `SELECT user_name, COUNT(*) as unbilled_entries, SUM(hours) as total_unbilled_hours
     FROM time_entries
     WHERE company_id = ?
       AND is_billable = 1
       AND is_billed = 0
     GROUP BY user_name
     HAVING SUM(hours) > 10`,
    [companyId]
  );

  const gaps = res.rows._array;
  if (gaps.length === 0) return [];

  const insights = [];
  const body = await generateInsight(
    `Billing Gap Detected: The following users have significant unbilled hours: ${JSON.stringify(gaps)}. Explain the revenue risk of delayed billing and recommend actions for the firm to invoice these hours promptly.`,
    { gaps }
  );

  insights.push({
    vertical: 'legal',
    insight_type: 'revenue',
    insight_key: 'billing_gap',
    title: `Significant unbilled hours detected (${gaps.length} staff members)`,
    body,
    severity: 'warning',
    confidence: 0.9,
    data_snapshot: { gaps },
    action_label: 'Review Time Entries',
    action_url: '/time-tracking',
  });

  return insights;
}

export async function computeCaseRiskScores(companyId) {
  // Check for budget overruns
  const res = await powerSync.execute(
    `SELECT c.id, c.title, c.budget_amount, SUM(t.hours * t.rate_per_hour) as total_billed
     FROM cases c
     JOIN time_entries t ON t.case_id = c.id
     WHERE c.company_id = ? AND c.budget_amount IS NOT NULL AND c.budget_amount > 0
     GROUP BY c.id, c.title, c.budget_amount
     HAVING SUM(t.hours * t.rate_per_hour) > c.budget_amount * 0.9`,
    [companyId]
  );

  const overruns = res.rows._array;
  if (overruns.length === 0) return [];

  const insights = [];
  const body = await generateInsight(
    `Budget Overrun Risk: Cases approaching or exceeding budget limits: ${JSON.stringify(overruns)}. Advise on how to communicate with the client and adjust the billing strategy.`,
    { overruns }
  );

  insights.push({
    vertical: 'legal',
    insight_type: 'risk',
    insight_key: 'budget_overrun',
    title: `${overruns.length} case(s) nearing or exceeding budget`,
    body,
    severity: 'warning',
    confidence: 0.95,
    data_snapshot: { overruns },
    action_label: 'View Cases',
    action_url: '/cases',
  });
  return insights;
}

export async function scoreClientChurnRisk(companyId) {
  const res = await powerSync.execute(
    `SELECT id, first_name, last_name, churn_risk_score, churn_risk_level
     FROM clients
     WHERE company_id = ? AND churn_risk_level IN ('high', 'medium')`,
    [companyId]
  );

  const atRisk = res.rows._array;
  if (atRisk.length === 0) return [];

  const insights = [];
  const body = await generateInsight(
    `Client Churn Risk: The following clients have high or medium churn risk scores (likely due to payment delays or lack of recent activity): ${JSON.stringify(atRisk)}. Recommend client retention strategies.`,
    { atRisk }
  );

  insights.push({
    vertical: 'legal',
    insight_type: 'pattern',
    insight_key: 'client_churn_risk',
    title: `${atRisk.length} client(s) at risk of churn`,
    body,
    severity: 'warning',
    confidence: 0.8,
    data_snapshot: { atRisk },
    action_label: 'View Clients',
    action_url: '/clients',
  });
  return insights;
}

export async function detectDeadlineClustering(companyId) {
  const res = await powerSync.execute(
    `SELECT hearing_date, COUNT(*) as hearing_count
     FROM court_hearings
     WHERE company_id = ? AND status = 'scheduled'
     GROUP BY hearing_date
     HAVING COUNT(*) > 2`,
    [companyId]
  );

  const clusters = res.rows._array;
  if (clusters.length === 0) return [];

  const insights = [];
  insights.push({
    vertical: 'legal',
    insight_type: 'risk',
    insight_key: 'deadline_cluster',
    title: `Attorney Workload Alert: ${clusters.length} days with clustered hearings`,
    body: `Multiple court hearings are scheduled on the same days. This clustering may lead to attorney burnout or schedule conflicts. Consider re-assigning or rescheduling.`,
    severity: 'info',
    confidence: 0.85,
    data_snapshot: { clusters },
    action_label: 'View Calendar',
    action_url: '/calendar',
  });
  return insights;
}

export default async function legalEngine(companyId) {
  const results = await Promise.allSettled([
    detectCaseDeadlineRisk(companyId),
    detectBillingGaps(companyId),
    computeCaseRiskScores(companyId),
    scoreClientChurnRisk(companyId),
    detectDeadlineClustering(companyId)
  ]);

  return results.flatMap(r => (r.status === 'fulfilled' ? r.value : []));
}
