// src/lib/intelligence/engines/hospital.js
// Healthcare Intelligence Engine — vertical='hospital'
// Covers: readmission risk, lab anomalies, pharmacy stock, prescription interactions

import { generateInsight } from '@/lib/intelligence/engine';
import { powerSync } from '@/api/PowerSyncConnector';

// ────────────────────────────────────────────────────────
// 1. Patient Readmission Risk
//    Patients discharged recently with frequent visits.
//    High readmission rates signal care quality issues.
// ────────────────────────────────────────────────────────
async function detectReadmissionRisk(companyId) {
  return []; // Uses audit_logs which don't exist
  // Find patients who were discharged in the last 30 days
  const dischargedRes = await powerSync.execute(
    `SELECT id, first_name, last_name, status, date_of_birth, blood_group
     FROM univ_patients
     WHERE company_id = ?
       AND status = 'discharged'`,
    [companyId]
  );

  const discharged = dischargedRes.rows._array;
  if (discharged.length === 0) return [];

  const atRiskPatients = [];

  for (const patient of discharged) {
    // Count total records for this patient (admissions/visits)
    const visitRes = await powerSync.execute(
      `SELECT COUNT(*) as visit_count
       FROM audit_logs
       WHERE company_id = ?
         AND entity_id = ?
         AND created_at >= date('now', '-90 days')`,
      [companyId, patient.id]
    );

    const visitCount = visitRes.rows._array[0]?.visit_count || 0;

    // Also check if patient has been re-admitted (status changed multiple times)
    const statusRes = await powerSync.execute(
      `SELECT COUNT(*) as status_changes
       FROM audit_logs
       WHERE company_id = ?
         AND entity_id = ?
         AND action LIKE '%status%'`,
      [companyId, patient.id]
    );

    const statusChanges = statusRes.rows._array[0]?.status_changes || 0;

    // Flag patients with 3+ visits or 2+ status changes as at-risk
    if (visitCount >= 3 || statusChanges >= 2) {
      atRiskPatients.push({
        patient_id: patient.id,
        name: `${patient.first_name} ${patient.last_name}`,
        blood_group: patient.blood_group,
        visit_count: visitCount,
        status_changes: statusChanges,
        risk_score: Math.min(100, (visitCount * 15) + (statusChanges * 20)),
      });
    }
  }

  if (atRiskPatients.length === 0) return [];

  // Sort by risk score descending
  atRiskPatients.sort((a, b) => b.risk_score - a.risk_score);

  const highRisk = atRiskPatients.filter(p => p.risk_score >= 60);
  const severity = highRisk.length > 0 ? 'critical' : 'warning';

  const body = await generateInsight(
    `${atRiskPatients.length} recently discharged patient(s) show readmission risk indicators. ${highRisk.length} are high-risk (score ≥60). The highest risk patient is ${atRiskPatients[0].name} with a risk score of ${atRiskPatients[0].risk_score} (${atRiskPatients[0].visit_count} visits, ${atRiskPatients[0].status_changes} status changes in 90 days). Recommend follow-up actions to reduce readmission rates.`,
    { atRiskPatients: atRiskPatients.slice(0, 10), totalDischarged: discharged.length }
  );

  const insights = [{
    vertical: 'hospital',
    insight_type: 'risk',
    insight_key: 'patient_readmission_risk',
    title: `${atRiskPatients.length} patient${atRiskPatients.length !== 1 ? 's' : ''} at readmission risk`,
    body,
    severity,
    confidence: 0.75,
    data_snapshot: {
      at_risk_count: atRiskPatients.length,
      high_risk_count: highRisk.length,
      patients: atRiskPatients.slice(0, 20),
      total_discharged: discharged.length,
    },
    action_label: 'View At-Risk Patients',
    action_url: '/patients?filter=readmission-risk',
  }];

  // Per-patient insights for high-risk cases
  for (const p of highRisk.slice(0, 5)) {
    insights.push({
      vertical: 'hospital',
      insight_type: 'risk',
      insight_key: 'patient_readmission_individual',
      entity_type: 'patient',
      entity_id: p.patient_id,
      title: `${p.name} — readmission risk score ${p.risk_score}`,
      body: `${p.name} has had ${p.visit_count} visits and ${p.status_changes} status changes in the past 90 days. Risk score: ${p.risk_score}/100. Schedule a follow-up appointment and review discharge plan.`,
      severity: 'critical',
      confidence: 0.8,
      data_snapshot: p,
      action_label: 'View Patient',
      action_url: `/patients/${p.patient_id}`,
    });
  }

  return insights;
}

// ────────────────────────────────────────────────────────
// 2. Lab Anomaly Detection
//    Flag results with status='Abnormal'.
//    Group by test type and identify concerning patterns.
// ────────────────────────────────────────────────────────
async function detectLabAnomalies(companyId) {
  return []; // Schema mismatch
  const res = await powerSync.execute(
    `SELECT l.patient_id, l.test_name, l.result_value, l.reference_range,
            l.status, l.test_date, p.first_name, p.last_name
     FROM univ_labs l
     LEFT JOIN univ_patients p ON p.id = l.patient_id AND p.company_id = l.company_id
     WHERE l.company_id = ?
       AND l.status = 'Abnormal'
       AND l.test_date >= date('now', '-30 days')
     ORDER BY l.test_date DESC`,
    [companyId]
  );

  const abnormals = res.rows._array;
  if (abnormals.length === 0) return [];

  // Group by test name
  const byTest = {};
  abnormals.forEach(r => {
    const test = r.test_name || 'Unknown';
    if (!byTest[test]) byTest[test] = [];
    byTest[test].push(r);
  });

  // Group by patient (patients with multiple abnormals are higher concern)
  const byPatient = {};
  abnormals.forEach(r => {
    if (!byPatient[r.patient_id]) {
      byPatient[r.patient_id] = {
        patient_id: r.patient_id,
        name: `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'Unknown',
        abnormal_tests: [],
      };
    }
    byPatient[r.patient_id].abnormal_tests.push({
      test_name: r.test_name,
      result_value: r.result_value,
      reference_range: r.reference_range,
      test_date: r.test_date,
    });
  });

  const multiAbnormalPatients = Object.values(byPatient).filter(p => p.abnormal_tests.length >= 2);
  const testSummary = Object.entries(byTest).map(([test, results]) => ({
    test_name: test,
    abnormal_count: results.length,
  })).sort((a, b) => b.abnormal_count - a.abnormal_count);

  const severity = multiAbnormalPatients.length > 0 ? 'critical' : 'warning';

  const body = await generateInsight(
    `${abnormals.length} abnormal lab result(s) in the last 30 days across ${Object.keys(byPatient).length} patient(s). ${multiAbnormalPatients.length} patient(s) have multiple abnormal results. Most common abnormal test: ${testSummary[0]?.test_name} (${testSummary[0]?.abnormal_count} abnormal). Summarize the clinical significance and recommend follow-up priorities.`,
    { testSummary, multiAbnormalPatients: multiAbnormalPatients.slice(0, 5) }
  );

  return [{
    vertical: 'hospital',
    insight_type: 'anomaly',
    insight_key: 'lab_abnormal_results',
    title: `${abnormals.length} abnormal lab result${abnormals.length !== 1 ? 's' : ''} in the last 30 days`,
    body,
    severity,
    confidence: 0.95,
    data_snapshot: {
      total_abnormal: abnormals.length,
      unique_patients: Object.keys(byPatient).length,
      multi_abnormal_patients: multiAbnormalPatients.slice(0, 10),
      test_summary: testSummary,
    },
    action_label: 'View Lab Results',
    action_url: '/labs?filter=abnormal',
  }];
}

// ────────────────────────────────────────────────────────
// 3. Pharmacy Stock Alerts
//    Flag drugs where stock_level is at or below
//    reorder_level, or status indicates low stock.
// ────────────────────────────────────────────────────────
async function detectPharmacyStockAlerts(companyId) {
  const res = await powerSync.execute(
    `SELECT item_name as drug_name, stock_level, reorder_level, status
     FROM univ_pharmacy
     WHERE company_id = ?
       AND (stock_level <= reorder_level OR status IN ('Low Stock', 'Out of Stock', 'low', 'out_of_stock'))
     ORDER BY stock_level ASC`,
    [companyId]
  );

  const lowStock = res.rows._array;
  if (lowStock.length === 0) return [];

  const outOfStock = lowStock.filter(d =>
    Number(d.stock_level) === 0 || (d.status || '').toLowerCase().includes('out')
  );
  const critical = lowStock.filter(d =>
    Number(d.stock_level) > 0 && Number(d.stock_level) <= Math.floor(Number(d.reorder_level) * 0.5)
  );

  const severity = outOfStock.length > 0 ? 'critical' : critical.length > 0 ? 'warning' : 'info';

  const body = await generateInsight(
    `Pharmacy stock alert: ${lowStock.length} drug(s) are at or below reorder level. ${outOfStock.length} are completely out of stock: ${outOfStock.map(d => d.drug_name).join(', ') || 'none'}. ${critical.length} are critically low (below 50% of reorder level). Prioritize restocking recommendations.`,
    {
      lowStock: lowStock.slice(0, 15).map(d => ({
        drug: d.drug_name,
        stock: d.stock_level,
        reorder: d.reorder_level,
        status: d.status,
      })),
    }
  );

  return [{
    vertical: 'hospital',
    insight_type: 'risk',
    insight_key: 'pharmacy_stock_alert',
    title: `${lowStock.length} medication${lowStock.length !== 1 ? 's' : ''} need restocking${outOfStock.length > 0 ? ` (${outOfStock.length} out of stock)` : ''}`,
    body,
    severity,
    confidence: 1.0,
    data_snapshot: {
      total_low: lowStock.length,
      out_of_stock_count: outOfStock.length,
      critically_low_count: critical.length,
      drugs: lowStock.slice(0, 30).map(d => ({
        drug_name: d.drug_name,
        stock_level: d.stock_level,
        reorder_level: d.reorder_level,
        status: d.status,
      })),
    },
    action_label: 'View Pharmacy',
    action_url: '/pharmacy?filter=low-stock',
  }];
}

// ────────────────────────────────────────────────────────
// 4. Prescription Interaction Patterns
//    Patients with 3+ active medications may have
//    drug interaction risks.
// ────────────────────────────────────────────────────────
async function detectPrescriptionInteractions(companyId) {
  // Find patients with 3+ active prescriptions
  const res = await powerSync.execute(
    `SELECT rx.patient_id, rx.medication, rx.dosage, rx.frequency,
            p.first_name, p.last_name
     FROM univ_prescriptions rx
     LEFT JOIN univ_patients p ON p.id = rx.patient_id AND p.company_id = rx.company_id
     WHERE rx.company_id = ?
       AND rx.status IN ('active', 'Active')
     ORDER BY rx.patient_id, rx.medication`,
    [companyId]
  );

  const rows = res.rows._array;
  if (rows.length === 0) return [];

  // Group by patient
  const byPatient = {};
  rows.forEach(r => {
    if (!byPatient[r.patient_id]) {
      byPatient[r.patient_id] = {
        patient_id: r.patient_id,
        name: `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'Unknown',
        medications: [],
      };
    }
    byPatient[r.patient_id].medications.push({
      medication: r.medication,
      dosage: r.dosage,
      frequency: r.frequency,
    });
  });

  // Filter to patients with 3+ active meds
  const polyPharmacy = Object.values(byPatient)
    .filter(p => p.medications.length >= 3)
    .sort((a, b) => b.medications.length - a.medications.length);

  if (polyPharmacy.length === 0) return [];

  const highRisk = polyPharmacy.filter(p => p.medications.length >= 5);
  const severity = highRisk.length > 0 ? 'critical' : 'warning';

  const body = await generateInsight(
    `${polyPharmacy.length} patient(s) have 3 or more active medications (polypharmacy). ${highRisk.length} patient(s) have 5+ medications, which significantly increases drug interaction risk. The most medications on a single patient: ${polyPharmacy[0].name} with ${polyPharmacy[0].medications.length} active prescriptions (${polyPharmacy[0].medications.map(m => m.medication).join(', ')}). Recommend a review process for these patients.`,
    { polyPharmacy: polyPharmacy.slice(0, 10) }
  );

  const insights = [{
    vertical: 'hospital',
    insight_type: 'risk',
    insight_key: 'polypharmacy_risk',
    title: `${polyPharmacy.length} patient${polyPharmacy.length !== 1 ? 's' : ''} on 3+ medications — interaction risk`,
    body,
    severity,
    confidence: 0.85,
    data_snapshot: {
      polypharmacy_count: polyPharmacy.length,
      high_risk_count: highRisk.length,
      patients: polyPharmacy.slice(0, 20).map(p => ({
        patient_id: p.patient_id,
        name: p.name,
        med_count: p.medications.length,
        medications: p.medications.map(m => m.medication),
      })),
    },
    action_label: 'Review Prescriptions',
    action_url: '/prescriptions?filter=polypharmacy',
  }];

  // Per-patient alerts for highest risk (5+ meds)
  for (const p of highRisk.slice(0, 5)) {
    insights.push({
      vertical: 'hospital',
      insight_type: 'risk',
      insight_key: 'polypharmacy_individual',
      entity_type: 'patient',
      entity_id: p.patient_id,
      title: `${p.name} has ${p.medications.length} active medications`,
      body: `${p.name} is currently prescribed: ${p.medications.map(m => `${m.medication} (${m.dosage}, ${m.frequency})`).join('; ')}. With ${p.medications.length} active medications, a pharmacist review for drug interactions is recommended.`,
      severity: 'critical',
      confidence: 0.9,
      data_snapshot: p,
      action_label: 'View Patient',
      action_url: `/patients/${p.patient_id}`,
    });
  }

  return insights;
}

// ────────────────────────────────────────────────────────
// Main Export — runs all healthcare checks
// ────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────
// 5. Ward capacity 48-hour forecast
// ────────────────────────────────────────────────────────
async function detectWardCapacityRisk(companyId) {
  const wardsRes = await powerSync.execute(
    `SELECT id, ward_name as name, capacity, current_occupancy as occupancy FROM univ_wards WHERE company_id = ?`, [companyId]
  );
  const wards = wardsRes.rows._array;
  if(wards.length === 0) return [];
  
  const insights = [];
  for(const ward of wards) {
    if(ward.capacity > 0 && ward.occupancy >= ward.capacity * 0.9) {
      const body = await generateInsight(
        `Ward ${ward.name} is at ${Math.round((ward.occupancy/ward.capacity)*100)}% capacity. Predict admissions and discharges to project occupancy 48 hours ahead.`,
        { ward }
      );
      insights.push({
        vertical: 'hospital',
        insight_type: 'risk',
        insight_key: 'ward_capacity_risk',
        title: `Ward ${ward.name} nearing capacity`,
        body,
        severity: 'warning',
        confidence: 0.8,
        data_snapshot: { ward },
        action_label: 'View Wards',
        action_url: '/wards',
      });
    }
  }
  return insights;
}

// ────────────────────────────────────────────────────────
// 6. Insurance claim denial prediction
// ────────────────────────────────────────────────────────
async function detectClaimDenialRisk(companyId) {
  return []; // Schema mismatch
  const claimsRes = await powerSync.execute(
    `SELECT id, patient_name, total_amount, status FROM univ_invoices WHERE company_id = ? AND status = 'pending_insurance'`, [companyId]
  );
  const claims = claimsRes.rows._array;
  if(claims.length > 5) {
      const body = await generateInsight(
        `There are ${claims.length} pending insurance claims. Check claims against common denial reasons before submission and flag high-risk claims for review.`,
        { claims: claims.slice(0, 5) }
      );
      return [{
        vertical: 'hospital',
        insight_type: 'risk',
        insight_key: 'claim_denial_risk',
        title: `${claims.length} pending claims at risk of denial`,
        body,
        severity: 'warning',
        confidence: 0.85,
        data_snapshot: { claims: claims.length },
        action_label: 'View Claims',
        action_url: '/hospital-claims',
      }];
  }
  return [];
}

// ────────────────────────────────────────────────────────
// 7. Staff demand optimisation
// ────────────────────────────────────────────────────────
async function detectStaffDemand(companyId) {
  const body = await generateInsight(
    `Recommend minimum staffing levels per ward per shift based on predicted patient volume for the next 24 hours.`,
    { }
  );
  return [{
    vertical: 'hospital',
    insight_type: 'optimization',
    insight_key: 'staff_demand_optimization',
    title: `Staff demand optimization for next 24 hours`,
    body,
    severity: 'info',
    confidence: 0.7,
    data_snapshot: { },
    action_label: 'View Roster',
    action_url: '/staff-roster',
  }];
}

// ────────────────────────────────────────────────────────
// 8. No-show prediction
// ────────────────────────────────────────────────────────
async function detectNoShowRisk(companyId) {
  const aptsRes = await powerSync.execute(
    `SELECT a.id, a.patient_id, p.first_name, p.last_name FROM univ_appointments a LEFT JOIN univ_patients p ON p.id = a.patient_id WHERE a.company_id = ? AND a.status = 'scheduled' AND a.date >= date('now')`, [companyId]
  );
  const apts = aptsRes.rows._array;
  if(apts.length > 0) {
      const body = await generateInsight(
        `Score each scheduled appointment by historical no-show probability for that patient. Flag high-risk slots for proactive confirmation call.`,
        { apts: apts.slice(0, 5) }
      );
      return [{
        vertical: 'hospital',
        insight_type: 'risk',
        insight_key: 'appointment_no_show_risk',
        title: `Appointments at risk of no-show`,
        body,
        severity: 'info',
        confidence: 0.75,
        data_snapshot: { apts: apts.length },
        action_label: 'View Appointments',
        action_url: '/appointments',
      }];
  }
  return [];
}

export default async function hospitalEngine(companyId) {
  const results = await Promise.allSettled([
    detectReadmissionRisk(companyId),
    detectLabAnomalies(companyId),
    detectPharmacyStockAlerts(companyId),
    detectPrescriptionInteractions(companyId),
    detectWardCapacityRisk(companyId),
    detectClaimDenialRisk(companyId),
    detectStaffDemand(companyId),
    detectNoShowRisk(companyId),
  ]);

  return results.flatMap(r => (r.status === 'fulfilled' ? r.value : []));
}
