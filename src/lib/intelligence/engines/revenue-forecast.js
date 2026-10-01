import { generateInsight, storeInsight } from '../engine';
import { powerSync } from '@/api/PowerSyncConnector';

export async function runRevenueForecastEngine(companyId, vertical) {
  const insights = [];

  try {
    const res = await powerSync.execute(
      `SELECT amount, status, created_at FROM univ_invoices WHERE company_id = ? AND status = 'paid' AND created_at >= date('now', '-90 days') ORDER BY created_at ASC`,
      [companyId]
    );
    
    let history = res.rows._array || Array.from(res.rows);

    if (history.length < 14) {
      // fallback to payments
      const txRes = await powerSync.execute(
        `SELECT amount, created_at FROM univ_payments WHERE company_id = ? AND status = 'completed' AND created_at >= date('now', '-90 days') ORDER BY created_at ASC`,
        [companyId]
      );
      const txHistory = txRes.rows._array || Array.from(txRes.rows);
      if (txHistory.length >= 7) {
        history = txHistory;
      }
    }

    const weekly = groupByWeek(history);
    if (weekly.length < 4) return insights;

    const recentWeeks = weekly.slice(-8);
    const avgWeekly = recentWeeks.reduce((s, w) => s + w.total, 0) / recentWeeks.length;
    const trend = calculateTrend(recentWeeks.map(w => w.total));

    const next30DaysForecast = (avgWeekly + trend) * 4.33;
    const lowerBound = next30DaysForecast * 0.75;
    const upperBound = next30DaysForecast * 1.25;
    const confidence = Math.min(90, 50 + weekly.length * 3);

    // Store forecast
    await powerSync.execute(
      `DELETE FROM revenue_forecasts WHERE company_id = ? AND forecast_period = ?`,
      [companyId, 'next_30_days']
    );
    await powerSync.execute(
      `INSERT INTO revenue_forecasts (id, company_id, forecast_period, forecast_amount, lower_bound, upper_bound, confidence, basis, methodology, computed_at)
       VALUES (uuid(), ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [companyId, 'next_30_days', next30DaysForecast, lowerBound, upperBound, confidence, `Based on ${weekly.length} weeks of history`, trend > 0 ? 'linear_trend_positive' : trend < 0 ? 'linear_trend_negative' : 'linear_trend_flat']
    );

    const trendDirection = trend > 50 ? 'trending upward' : trend < -50 ? 'trending downward' : 'stable';
    const body = await generateInsight(
      `Revenue is ${trendDirection}. Forecast for next 30 days: $${next30DaysForecast.toFixed(0)} (range $${lowerBound.toFixed(0)} to $${upperBound.toFixed(0)}). Based on ${weekly.length} weeks of data. Give a 2-sentence business interpretation and one recommendation.`,
      { forecast: next30DaysForecast, trend, weekly: weekly.slice(-4) }
    );

    insights.push({
      vertical: 'universal',
      insight_type: 'prediction',
      insight_key: 'revenue_forecast_30day',
      title: `Revenue forecast: $${next30DaysForecast.toFixed(0)} in the next 30 days`,
      body,
      severity: trend > 100 ? 'positive' : trend < -100 ? 'warning' : 'info',
      confidence,
      data_snapshot: { forecast: next30DaysForecast, lowerBound, upperBound, trend, weekCount: weekly.length },
      action_label: 'View analytics',
      action_url: '/reports',
    });
  } catch (err) {
    console.error('Revenue forecast error:', err);
  }

  return insights;
}

function groupByWeek(data) {
  const weeks = {};
  data.forEach(d => {
    const date = new Date(d.created_at);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const key = weekStart.toISOString().split('T')[0];
    if (!weeks[key]) weeks[key] = { total: 0, count: 0, week: key };
    weeks[key].total += Number(d.amount || 0);
    weeks[key].count++;
  });
  return Object.values(weeks).sort((a, b) => a.week.localeCompare(b.week));
}

function calculateTrend(values) {
  if (values.length < 2) return 0;
  const n = values.length;
  const sumX = values.reduce((s, _, i) => s + i, 0);
  const sumY = values.reduce((s, v) => s + v, 0);
  const sumXY = values.reduce((s, v, i) => s + i * v, 0);
  const sumX2 = values.reduce((s, _, i) => s + i * i, 0);
  return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
}
