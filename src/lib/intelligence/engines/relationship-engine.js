import { powerSync } from '@/api/PowerSyncConnector';
import { generateInsight } from '@/lib/intelligence/engine';

// ────────────────────────────────────────────────────────
// 1. Client Source Value Pattern
// ────────────────────────────────────────────────────────
export async function detectClientSourcePattern(companyId) {
  // Try to find clients with lifetime_value and source.
  // Not all schemas have this, so we use a safe query or check if table exists.
  // We will assume `clients` table for Law/Insurance/etc. If it fails, catch and return [].
  try {
    const res = await powerSync.execute(
      `SELECT id, source, lifetime_value, status
       FROM clients
       WHERE company_id = ?
         AND source IS NOT NULL
         AND lifetime_value IS NOT NULL`,
      [companyId]
    );

    const clients = res.rows._array;
    if (clients.length < 20) return [];

    const bySource = clients.reduce((acc, c) => {
      if (!acc[c.source]) acc[c.source] = { count: 0, totalValue: 0, source: c.source };
      acc[c.source].count++;
      acc[c.source].totalValue += (c.lifetime_value || 0);
      return acc;
    }, {});

    const sources = Object.values(bySource)
      .filter(s => s.count >= 3)
      .sort((a, b) => (b.totalValue / b.count) - (a.totalValue / a.count));

    if (sources.length >= 2) {
      const best = sources[0];
      const worst = sources[sources.length - 1];
      const bestAvg = best.totalValue / best.count;
      const worstAvg = worst.totalValue / worst.count;
      const diff = worstAvg > 0 ? ((bestAvg - worstAvg) / worstAvg) * 100 : 0;

      if (diff >= 30) {
        const body = await generateInsight(
          `"${best.source}" brings clients with ${diff.toFixed(0)}% higher average lifetime value than "${worst.source}". Best source: $${bestAvg.toFixed(0)} avg value (${best.count} clients). Weakest source: $${worstAvg.toFixed(0)} avg value (${worst.count} clients). Give a 2-sentence recommendation on how to use this insight.`,
          { best, worst, diff }
        );

        return [{
          vertical: 'universal',
          insight_type: 'pattern',
          insight_key: 'client_source_value_pattern',
          title: `"${best.source}" generates ${diff.toFixed(0)}% more value per client than other sources`,
          body,
          severity: 'positive',
          confidence: 78,
          data_snapshot: { best, worst, diff },
          action_label: 'View clients',
          action_url: '/clients',
        }];
      }
    }
  } catch (err) {
    // Table might not exist in this workspace's schema
  }
  return [];
}

// ────────────────────────────────────────────────────────
// 2. Repeat Engagement Pattern
// ────────────────────────────────────────────────────────
export async function detectRepeatEngagement(companyId) {
  try {
    // Assuming UnivAppointments or ClientEngagements. We'll use univ_appointments.
    const res = await powerSync.execute(
      `SELECT client_id, start_time
       FROM univ_appointments
       WHERE company_id = ?
         AND start_time >= date('now', '-365 days')`,
      [companyId]
    );

    const engagements = res.rows._array;
    if (engagements.length < 30) return [];

    const byClient = engagements.reduce((acc, e) => {
      const cid = e.client_id || 'unknown';
      if (cid === 'unknown') return acc;
      if (!acc[cid]) acc[cid] = { count: 0 };
      acc[cid].count++;
      return acc;
    }, {});

    const totalClients = Object.keys(byClient).length;
    if (totalClients < 10) return [];

    const repeatClients = Object.values(byClient).filter(c => c.count >= 3).length;
    const repeatRate = (repeatClients / totalClients) * 100;

    if (repeatRate >= 40) {
      return [{
        vertical: 'universal',
        insight_type: 'pattern',
        insight_key: 'repeat_engagement_rate',
        title: `${repeatRate.toFixed(0)}% of clients return 3 or more times — strong retention signal`,
        body: `${repeatClients} of ${totalClients} active clients have engaged 3 or more times in the past year. This ${repeatRate.toFixed(0)}% repeat rate indicates strong client satisfaction and is above average for most industries.`,
        severity: 'positive',
        confidence: 85,
        data_snapshot: { repeatRate, repeatClients, totalClients },
        action_label: 'View retention report',
        action_url: '/analytics',
      }];
    } else if (repeatRate < 20 && totalClients >= 20) {
      return [{
        vertical: 'universal',
        insight_type: 'recommendation',
        insight_key: 'low_repeat_engagement_rate',
        title: `Only ${repeatRate.toFixed(0)}% of clients return for repeat engagements`,
        body: `${totalClients - repeatClients} of ${totalClients} clients have only engaged once in the past year. Low repeat engagement suggests an opportunity to improve follow-up, loyalty programs, or service quality.`,
        severity: 'warning',
        confidence: 80,
        data_snapshot: { repeatRate, repeatClients, totalClients },
        action_label: 'View analytics',
        action_url: '/analytics',
      }];
    }
  } catch (err) {}
  return [];
}

// ────────────────────────────────────────────────────────
// 3. Time-of-day/week performance pattern
// ────────────────────────────────────────────────────────
export async function detectDayOfWeekPerformance(companyId) {
  try {
    const res = await powerSync.execute(
      `SELECT amount, created_at
       FROM univ_invoices
       WHERE company_id = ?
         AND created_at >= date('now', '-90 days')`,
      [companyId]
    );

    const transactions = res.rows._array;
    if (transactions.length < 50) return [];

    const byDay = transactions.reduce((acc, t) => {
      const day = new Date(t.created_at).getDay(); // 0=Sun
      if (!acc[day]) acc[day] = { count: 0, total: 0 };
      acc[day].count++;
      acc[day].total += (t.amount || 0);
      return acc;
    }, {});

    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const dayEntries = Object.entries(byDay)
      .map(([day, data]) => ({ day: parseInt(day), name: dayNames[parseInt(day)], ...data }))
      .sort((a, b) => b.total - a.total);

    if (dayEntries.length >= 5) {
      const bestDay = dayEntries[0];
      const worstDay = dayEntries[dayEntries.length - 1];
      const diff = worstDay.total > 0 ? ((bestDay.total - worstDay.total) / worstDay.total) * 100 : 0;

      if (diff >= 40) {
        return [{
          vertical: 'universal',
          insight_type: 'pattern',
          insight_key: 'day_of_week_performance',
          title: `${bestDay.name} is your strongest day — ${diff.toFixed(0)}% above your weakest day`,
          body: `${bestDay.name} generates the most activity (${bestDay.count} transactions, $${bestDay.total.toFixed(0)}). ${worstDay.name} is the weakest. Use this pattern to schedule promotions, staff heavier on peak days, and consider incentives on slower days.`,
          severity: 'info',
          confidence: 82,
          data_snapshot: { bestDay, worstDay, diff },
          action_label: 'View time analysis',
          action_url: '/analytics',
        }];
      }
    }
  } catch (err) {}
  return [];
}
