import { powerSync } from '@/api/PowerSyncConnector';

async function safeQuery(sql, params = []) {
  try {
    const res = await powerSync.execute(sql, params);
    return res.rows?._array || [];
  } catch (err) {
    return null;
  }
}

export async function gatherIndustryMetrics(companyId, industryType) {
  const metrics = {
    team_members: 0,
    new_records: 0,
    appointments_or_orders: [],
    revenue_collected: 0,
    paid_invoices: 0,
    anomalyData: {}
  };

  if (!companyId) return metrics;

  try {
    // 1. Always gather profiles/employees as team members
    const profiles = await safeQuery('SELECT COUNT(*) as c FROM profiles WHERE company_id = ?', [companyId]);
    metrics.team_members = profiles?.[0]?.c || 0;

    if (industryType === 'pharmacy') {
      const [patients, prescriptions, inventory, claims] = await Promise.all([
        safeQuery('SELECT COUNT(*) as c FROM univ_pharmacy_customers WHERE company_id = ? AND created_at > datetime("now", "-7 days")', [companyId]),
        safeQuery('SELECT status, COUNT(*) as c FROM univ_pharmacy_prescriptions WHERE company_id = ? AND created_at > datetime("now", "-7 days") GROUP BY status', [companyId]),
        safeQuery('SELECT COUNT(*) as c, SUM(price * stock_quantity) as total FROM univ_pharmacy_inventory WHERE company_id = ?', [companyId]),
        safeQuery('SELECT status, COUNT(*) as c FROM univ_pharmacy_insurance_claims WHERE company_id = ? AND created_at > datetime("now", "-7 days") GROUP BY status', [companyId])
      ]);

      metrics.new_records = patients?.[0]?.c || 0;
      metrics.appointments_or_orders = prescriptions || [];
      
      const paidClaims = (claims || []).find(c => c.status === 'paid' || c.status === 'approved');
      metrics.paid_invoices = paidClaims?.c || 0;
      metrics.revenue_collected = inventory?.[0]?.total || 0;

      // Anomaly specific data
      const [lowStock, pendingPrescriptions] = await Promise.all([
        safeQuery('SELECT item_name, stock_quantity, reorder_level FROM univ_pharmacy_inventory WHERE company_id = ? AND stock_quantity <= reorder_level', [companyId]),
        safeQuery('SELECT COUNT(*) as c FROM univ_pharmacy_prescriptions WHERE company_id = ? AND status = "pending"', [companyId])
      ]);
      metrics.anomalyData = { lowStock, pendingPrescriptions };

    } else if (industryType === 'retail' || industryType === 'ecommerce') {
      const [customers, orders, sales] = await Promise.all([
        safeQuery('SELECT COUNT(*) as c FROM univ_retail_customers WHERE company_id = ? AND created_at > datetime("now", "-7 days")', [companyId]),
        safeQuery('SELECT status, COUNT(*) as c FROM univ_retail_orders WHERE company_id = ? AND date > datetime("now", "-7 days") GROUP BY status', [companyId]),
        safeQuery('SELECT COUNT(*) as c, SUM(total) as total FROM univ_retail_sales WHERE company_id = ? AND created_at > datetime("now", "-7 days")', [companyId])
      ]);

      metrics.new_records = customers?.[0]?.c || 0;
      metrics.appointments_or_orders = orders || [];
      metrics.paid_invoices = sales?.[0]?.c || 0;
      metrics.revenue_collected = sales?.[0]?.total || 0;

      // Anomaly specific data
      const [lowStockRetail] = await Promise.all([
        safeQuery('SELECT name, stock, supplier FROM univ_retail_products WHERE company_id = ? AND stock <= 10', [companyId])
      ]);
      metrics.anomalyData = { lowStockRetail };

    } else {
      // Default to Hospital/General
      const [patients, appointments, invoices] = await Promise.all([
        safeQuery('SELECT COUNT(*) as c FROM univ_patients WHERE company_id = ? AND created_at > datetime("now", "-7 days")', [companyId]),
        safeQuery('SELECT status, COUNT(*) as c FROM univ_appointments WHERE company_id = ? AND date > datetime("now", "-7 days") GROUP BY status', [companyId]),
        safeQuery('SELECT COUNT(*) as c, COALESCE(SUM(total_amount), 0) as total FROM univ_invoices WHERE company_id = ? AND status = "paid" AND created_at > datetime("now", "-7 days")', [companyId]),
      ]);

      metrics.new_records = patients?.[0]?.c || 0;
      metrics.appointments_or_orders = appointments || [];
      metrics.paid_invoices = invoices?.[0]?.c || 0;
      metrics.revenue_collected = invoices?.[0]?.total || 0;

      // Anomaly specific data
      const [queueRes, bloodRes, infectionRes] = await Promise.all([
        safeQuery(`SELECT COUNT(*) as c FROM univ_opd_queues WHERE company_id = ? AND status = 'waiting' AND created_at < datetime('now', '-2 hours')`, [companyId]),
        safeQuery(`SELECT blood_type, units_available, minimum_threshold FROM univ_blood_bank WHERE company_id = ? AND units_available <= minimum_threshold`, [companyId]),
        safeQuery(`SELECT ward_location, COUNT(*) as c FROM univ_infection_logs WHERE company_id = ? AND status = 'active' GROUP BY ward_location HAVING COUNT(*) >= 2`, [companyId])
      ]);
      metrics.anomalyData = { queueRes, bloodRes, infectionRes };
    }
  } catch (err) {
    console.error('Error gathering industry metrics:', err);
  }

  return metrics;
}
