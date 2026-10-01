// src/lib/intelligence/engines/universal.js
// Universal Intelligence Engine — runs for ALL workspaces
// Covers: revenue anomalies, activity volume, overdue items, cash flow prediction

import { generateInsight, groupByWeek, groupByDay } from '@/lib/intelligence/engine';
import { powerSync } from '@/api/PowerSyncConnector';
import { detectClientSourcePattern, detectRepeatEngagement, detectDayOfWeekPerformance } from './relationship-engine';


// ────────────────────────────────────────────────────────
// 1. Revenue Anomaly Detection
//    Query univ_invoices for last 90 days, group by week,
//    compare current week to 4-week rolling average.
//    Flag if deviation >= 25%.
// ────────────────────────────────────────────────────────
async function detectRevenueAnomalies(companyId) {
  const res = await powerSync.execute(
    `SELECT amount, status, created_at
     FROM univ_invoices
     WHERE company_id = ?
       AND created_at >= date('now', '-90 days')
     ORDER BY created_at ASC`,
    [companyId]
  );

  const rows = res.rows._array;
  if (rows.length < 5) return [];

  const weeks = groupByWeek(rows, 'created_at', 'amount');
  if (weeks.length < 3) return [];

  const currentWeek = weeks[weeks.length - 1];
  const priorWeeks = weeks.slice(-5, -1); // up to 4 weeks before current
  if (priorWeeks.length === 0) return [];

  const avgTotal = priorWeeks.reduce((s, w) => s + w.total, 0) / priorWeeks.length;
  if (avgTotal === 0) return [];

  const deviation = ((currentWeek.total - avgTotal) / avgTotal) * 100;
  const absDeviation = Math.abs(deviation);

  if (absDeviation < 25) return [];

  const direction = deviation > 0 ? 'increase' : 'decrease';
  const severity = absDeviation >= 50 ? 'critical' : 'warning';

  const body = await generateInsight(
    `Revenue this week (${currentWeek.week}) is $${currentWeek.total.toFixed(2)}, which is a ${absDeviation.toFixed(1)}% ${direction} compared to the 4-week average of $${avgTotal.toFixed(2)}. Explain what this means for the business and what they should investigate.`,
    { currentWeek, priorWeeks, deviation: deviation.toFixed(1) }
  );

  return [{
    vertical: 'universal',
    insight_type: 'anomaly',
    insight_key: 'revenue_weekly_anomaly',
    title: `Revenue ${direction} of ${absDeviation.toFixed(0)}% this week`,
    body,
    severity,
    confidence: Math.min(0.95, 0.6 + (priorWeeks.length * 0.08)),
    data_snapshot: {
      current_week: currentWeek.week,
      current_total: currentWeek.total,
      avg_total: avgTotal,
      deviation_pct: deviation,
      weeks_analyzed: weeks.length,
    },
    action_label: 'View Invoices',
    action_url: '/invoices',
  }];
}

// ────────────────────────────────────────────────────────
// 2. Activity Volume Anomaly
//    Query audit_logs for last 30 days, group by day.
//    Flag if today is 60% below the daily average.
// ────────────────────────────────────────────────────────
async function detectActivityAnomaly(companyId) {
  const res = await powerSync.execute(
    `SELECT created_at, action
     FROM audit_logs
     WHERE company_id = ?
       AND created_at >= date('now', '-30 days')
     ORDER BY created_at ASC`,
    [companyId]
  );

  const rows = res.rows._array;
  if (rows.length < 7) return [];

  const days = groupByDay(rows, 'created_at');
  if (days.length < 3) return [];

  const today = new Date().toISOString().split('T')[0];
  const todayData = days.find(d => d.day === today);
  const todayCount = todayData ? todayData.count : 0;

  // Average excluding today
  const priorDays = days.filter(d => d.day !== today);
  if (priorDays.length === 0) return [];

  const avgCount = priorDays.reduce((s, d) => s + d.count, 0) / priorDays.length;
  if (avgCount === 0) return [];

  const dropPct = ((avgCount - todayCount) / avgCount) * 100;

  if (dropPct < 60) return [];

  const body = await generateInsight(
    `Today's workspace activity (${todayCount} actions) is ${dropPct.toFixed(0)}% below the 30-day daily average of ${avgCount.toFixed(1)} actions. This could indicate team inactivity, a system issue, or simply a slow day. What should the workspace owner consider?`,
    { todayCount, avgCount: avgCount.toFixed(1), dropPct: dropPct.toFixed(1), daysAnalyzed: priorDays.length }
  );

  return [{
    vertical: 'universal',
    insight_type: 'anomaly',
    insight_key: 'activity_volume_drop',
    title: `Workspace activity is ${dropPct.toFixed(0)}% below normal today`,
    body,
    severity: dropPct >= 80 ? 'critical' : 'warning',
    confidence: Math.min(0.9, 0.5 + (priorDays.length * 0.015)),
    data_snapshot: {
      today_count: todayCount,
      avg_daily_count: avgCount,
      drop_pct: dropPct,
      days_analyzed: priorDays.length,
    },
    action_label: 'View Activity',
    action_url: '/audit-log',
  }];
}

// ────────────────────────────────────────────────────────
// 3. Overdue Items Risk
//    Query univ_invoices where status='unpaid' and
//    due_date < now. Count and sum amounts.
// ────────────────────────────────────────────────────────
async function detectOverdueItems(companyId) {
  const res = await powerSync.execute(
    `SELECT id, amount, due_date, created_at
     FROM univ_invoices
     WHERE company_id = ?
       AND status = 'unpaid'
       AND due_date < date('now')
     ORDER BY due_date ASC`,
    [companyId]
  );

  const rows = res.rows._array;
  if (rows.length === 0) return [];

  const totalOverdue = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const oldestDue = rows[0].due_date;

  // Calculate how many days the oldest one is overdue
  const oldestDate = new Date(oldestDue);
  const now = new Date();
  const oldestDaysOverdue = Math.floor((now - oldestDate) / (1000 * 60 * 60 * 24));

  // Severity based on amount and age
  let severity = 'warning';
  if (rows.length >= 10 || totalOverdue >= 50000 || oldestDaysOverdue >= 60) {
    severity = 'critical';
  }

  const body = await generateInsight(
    `There are ${rows.length} overdue unpaid invoices totaling $${totalOverdue.toFixed(2)}. The oldest is ${oldestDaysOverdue} days past due (due on ${oldestDue}). Provide a concise risk assessment and recommended next steps.`,
    { count: rows.length, totalOverdue, oldestDaysOverdue, oldestDue }
  );

  return [{
    vertical: 'universal',
    insight_type: 'risk',
    insight_key: 'overdue_invoices_risk',
    title: `${rows.length} overdue invoice${rows.length !== 1 ? 's' : ''} — $${totalOverdue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} at risk`,
    body,
    severity,
    confidence: 1.0,
    data_snapshot: {
      overdue_count: rows.length,
      total_overdue: totalOverdue,
      oldest_due_date: oldestDue,
      oldest_days_overdue: oldestDaysOverdue,
    },
    action_label: 'View Overdue',
    action_url: '/invoices?filter=overdue',
  }];
}

// ────────────────────────────────────────────────────────
// 4. Cash Flow Prediction
//    Query univ_invoices for last 6 months.
//    Calculate monthly trend, predict next month.
// ────────────────────────────────────────────────────────
async function predictCashFlow(companyId) {
  const res = await powerSync.execute(
    `SELECT amount, status, created_at
     FROM univ_invoices
     WHERE company_id = ?
       AND created_at >= date('now', '-6 months')
     ORDER BY created_at ASC`,
    [companyId]
  );

  const rows = res.rows._array;
  if (rows.length < 5) return [];

  // Group by month
  const months = {};
  rows.forEach(row => {
    const month = (row.created_at || '').substring(0, 7); // YYYY-MM
    if (!month) return;
    if (!months[month]) months[month] = { total: 0, paid: 0, unpaid: 0, count: 0, month };
    const amount = Number(row.amount || 0);
    months[month].total += amount;
    months[month].count++;
    if (row.status === 'paid') months[month].paid += amount;
    else months[month].unpaid += amount;
  });

  const monthlyData = Object.values(months).sort((a, b) => a.month.localeCompare(b.month));
  if (monthlyData.length < 2) return [];

  // Linear trend: simple least squares
  const n = monthlyData.length;
  const xValues = monthlyData.map((_, i) => i);
  const yValues = monthlyData.map(m => m.total);
  const xMean = xValues.reduce((s, v) => s + v, 0) / n;
  const yMean = yValues.reduce((s, v) => s + v, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (xValues[i] - xMean) * (yValues[i] - yMean);
    denominator += (xValues[i] - xMean) ** 2;
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;
  const predicted = intercept + slope * n;
  const predictedAmount = Math.max(0, predicted);

  // Determine trend direction
  const lastMonth = monthlyData[monthlyData.length - 1];
  const trendPct = lastMonth.total !== 0
    ? ((predictedAmount - lastMonth.total) / lastMonth.total) * 100
    : 0;

  const severity = trendPct < -15 ? 'warning' : trendPct > 10 ? 'positive' : 'info';

  // Generate next month label
  const lastMonthDate = new Date(lastMonth.month + '-01');
  lastMonthDate.setMonth(lastMonthDate.getMonth() + 1);
  const nextMonthLabel = lastMonthDate.toISOString().substring(0, 7);

  const body = await generateInsight(
    `Based on ${n} months of invoice data, the predicted revenue for ${nextMonthLabel} is $${predictedAmount.toFixed(2)}. The monthly trend slope is $${slope.toFixed(2)}. Last month (${lastMonth.month}) was $${lastMonth.total.toFixed(2)}. That's a projected ${trendPct.toFixed(1)}% change. Collection rate across the period: $${monthlyData.reduce((s, m) => s + m.paid, 0).toFixed(2)} paid of $${monthlyData.reduce((s, m) => s + m.total, 0).toFixed(2)} total. Summarize the cash flow outlook.`,
    { monthlyData, predicted: predictedAmount, slope, trendPct }
  );

  return [{
    vertical: 'universal',
    insight_type: 'prediction',
    insight_key: 'cashflow_next_month',
    title: `Projected revenue for ${nextMonthLabel}: $${predictedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    body,
    severity,
    confidence: Math.min(0.85, 0.4 + (n * 0.08)),
    data_snapshot: {
      months_analyzed: n,
      monthly_totals: monthlyData,
      predicted_next_month: predictedAmount,
      trend_slope: slope,
      trend_pct: trendPct,
      next_month: nextMonthLabel,
    },
    action_label: 'View Revenue',
    action_url: '/invoices',
  }];
}

import { runRevenueForecastEngine } from './revenue-forecast';
import { runBehaviourProfileEngine } from './behaviour-profile';
import { runCausalChainEngine } from './causal-chain';

// ────────────────────────────────────────────────────────
// Main Export — runs all universal checks
// ────────────────────────────────────────────────────────
export default async function universalEngine(companyId) {
  // Try to get vertical
  let vertical = 'legal';
  try {
    const res = await powerSync.execute(`SELECT industry_type FROM companies WHERE id = ?`, [companyId]);
    if (res.rows.length > 0) vertical = res.rows.item(0).industry_type;
  } catch(e) {}

  const results = await Promise.allSettled([
    detectRevenueAnomalies(companyId),
    detectActivityAnomaly(companyId),
    detectOverdueItems(companyId),
    predictCashFlow(companyId),
    detectClientSourcePattern(companyId),
    detectRepeatEngagement(companyId),
    detectDayOfWeekPerformance(companyId),
    runRevenueForecastEngine(companyId, vertical),
    runBehaviourProfileEngine(companyId, vertical),
    runCausalChainEngine(companyId, vertical)
  ]);

  return results.flatMap(r => (r.status === 'fulfilled' ? r.value : []));
}
