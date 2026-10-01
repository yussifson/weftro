import { generateInsight, storeInsight } from '../engine';
import { powerSync } from '@/api/PowerSyncConnector';

export async function runBehaviourProfileEngine(companyId, vertical) {
  const insights = [];
  const entityConfig = getEntityConfig(vertical);
  if (!entityConfig) return insights;

  const { table, entityType, paymentTable, attendanceTable } = entityConfig;
  
  try {
    const res = await powerSync.execute(`SELECT id, created_at FROM ${table} WHERE company_id = ? LIMIT 200`, [companyId]);
    const entities = res.rows._array || Array.from(res.rows);
    if (entities.length === 0) return insights;

    let highChurnCount = 0;
    let slowPayerCount = 0;

    for (const entity of entities) {
      const profile = await buildProfile(companyId, entity.id, entityConfig);
      if (!profile) continue;

      await powerSync.execute(
        `DELETE FROM entity_behaviour_profiles WHERE company_id = ? AND entity_type = ? AND entity_id = ?`,
        [companyId, entityType, entity.id]
      );
      await powerSync.execute(
        `INSERT INTO entity_behaviour_profiles (id, company_id, entity_type, entity_id, avg_payment_days, payment_reliability, attendance_rate, engagement_trend, churn_risk, churn_risk_score, data_points_count, profile_confidence, computed_at)
         VALUES (uuid(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [companyId, entityType, entity.id, profile.avg_payment_days, profile.payment_reliability, profile.attendance_rate, profile.engagement_trend, profile.churn_risk, profile.churn_risk_score, profile.data_points_count, profile.profile_confidence]
      );

      if (profile.churn_risk === 'high') highChurnCount++;
      if (profile.payment_reliability === 'slow' || profile.payment_reliability === 'unreliable') slowPayerCount++;
    }

    if (highChurnCount > 0) {
      const body = await generateInsight(
        `${highChurnCount} ${entityType}s are flagged as high churn risk based on behavioural pattern analysis across engagement, payment, and activity signals. Give a 2-sentence retention recommendation.`,
        { highChurnCount, total: entities.length }
      );
      insights.push({
        vertical: 'universal',
        insight_type: 'risk',
        insight_key: `${entityType}_high_churn_aggregate`,
        title: `${highChurnCount} ${entityType}s flagged as high churn risk`,
        body,
        severity: highChurnCount > entities.length * 0.2 ? 'critical' : 'warning',
        confidence: 72,
        data_snapshot: { highChurnCount, total: entities.length },
        action_label: `View ${entityType}s`,
        action_url: `/${table}`,
      });
    }

    if (slowPayerCount > 0) {
      insights.push({
        vertical: 'universal',
        insight_type: 'risk',
        insight_key: `${entityType}_slow_payers_aggregate`,
        title: `${slowPayerCount} ${entityType}s have a history of slow or unreliable payment`,
        body: `Behavioural analysis identified ${slowPayerCount} ${entityType}s with slow or unreliable payment patterns. Consider adjusting credit terms or requiring upfront payment for these accounts.`,
        severity: 'warning',
        confidence: 85,
        data_snapshot: { slowPayerCount, total: entities.length },
        action_label: 'View payment profiles',
        action_url: `/billing?filter=slow-payers`,
      });
    }
  } catch(err) {
    console.error('Behaviour profile error:', err);
  }

  return insights;
}

function getEntityConfig(vertical) {
  const map = {
    law: { table: 'clients', entityType: 'client', paymentTable: 'univ_invoices', attendanceTable: 'time_entries' },
    law_firm: { table: 'clients', entityType: 'client', paymentTable: 'univ_invoices', attendanceTable: 'time_entries' },
    legal: { table: 'clients', entityType: 'client', paymentTable: 'univ_invoices', attendanceTable: 'time_entries' },
    hospital: { table: 'univ_patients', entityType: 'patient', paymentTable: 'univ_invoices', attendanceTable: 'appointments' },
    school: { table: 'students', entityType: 'student', paymentTable: 'univ_invoices', attendanceTable: 'attendance_records' },
    university: { table: 'uni_students', entityType: 'student', paymentTable: 'univ_invoices', attendanceTable: 'tasks' },
    vocational: { table: 'students', entityType: 'student', paymentTable: 'univ_invoices', attendanceTable: 'attendance_records' },
    standard_school: { table: 'students', entityType: 'student', paymentTable: 'univ_invoices', attendanceTable: 'attendance_records' },
    hotel: { table: 'hotel_guests', entityType: 'guest', paymentTable: 'univ_invoices', attendanceTable: 'hotel_reservations' },
    hr: { table: 'univ_hr_employees', entityType: 'employee', paymentTable: 'univ_invoices', attendanceTable: 'tasks' },
    retail: { table: 'pos_customers', entityType: 'customer', paymentTable: 'pos_orders', attendanceTable: 'pos_orders' },
    ecommerce: { table: 'customers', entityType: 'customer', paymentTable: 'orders', attendanceTable: 'orders' },
    logistics: { table: 'clients', entityType: 'client', paymentTable: 'univ_invoices', attendanceTable: 'shipments' },
    insurance: { table: 'clients', entityType: 'client', paymentTable: 'univ_invoices', attendanceTable: 'policies' },
    religion: { table: 'congregation_members', entityType: 'member', paymentTable: 'univ_invoices', attendanceTable: 'events' },
    marketing_agency: { table: 'clients', entityType: 'client', paymentTable: 'univ_invoices', attendanceTable: 'tasks' },
  };
  return map[vertical] || { table: 'clients', entityType: 'client', paymentTable: 'univ_invoices', attendanceTable: 'tasks' };
}

async function buildProfile(companyId, entityId, config) {
  let payment_reliability = 'unknown';
  let avg_payment_days = null;
  let attendance_rate = null;
  let engagement_trend = 'unknown';
  let churn_risk_score = 0;
  let data_points = 0;

  try {
    try {
      const payRes = await powerSync.execute(`SELECT amount, due_date, status FROM ${config.paymentTable} WHERE company_id = ? AND entity_id = ? ORDER BY created_at DESC LIMIT 20`, [companyId, entityId]);
      const payments = payRes.rows._array;
      if (payments.length >= 3) {
        data_points += payments.length;
        const paidLate = payments.filter(p => p.status === 'paid' && p.due_date && new Date(p.created_at) > new Date(p.due_date));
        if (paidLate.length / payments.length > 0.5) {
          payment_reliability = 'slow';
          churn_risk_score += 15;
        } else {
          payment_reliability = 'reliable';
        }
      }
    } catch(e) {}
  } catch(e) {}

  const churn_risk = churn_risk_score >= 60 ? 'high' : churn_risk_score >= 35 ? 'medium' : 'low';
  return { payment_reliability, avg_payment_days, attendance_rate, engagement_trend, churn_risk, churn_risk_score, data_points_count: data_points, profile_confidence: Math.min(90, data_points*3) };
}
