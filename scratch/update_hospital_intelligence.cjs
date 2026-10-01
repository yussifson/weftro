const fs = require('fs');

const engPath = 'c:/Users/USER/OneDrive/Documents/airflake/src/lib/intelligence/engines/hospital.js';
let content = fs.readFileSync(engPath, 'utf8');

const newFunctions = `
// ────────────────────────────────────────────────────────
// 5. Ward capacity 48-hour forecast
// ────────────────────────────────────────────────────────
async function detectWardCapacityRisk(companyId) {
  const wardsRes = await powerSync.execute(
    \`SELECT id, name, capacity, occupancy FROM univ_wards WHERE company_id = ?\`, [companyId]
  );
  const wards = wardsRes.rows._array;
  if(wards.length === 0) return [];
  
  const insights = [];
  for(const ward of wards) {
    if(ward.capacity > 0 && ward.occupancy >= ward.capacity * 0.9) {
      const body = await generateInsight(
        \`Ward \${ward.name} is at \${Math.round((ward.occupancy/ward.capacity)*100)}% capacity. Predict admissions and discharges to project occupancy 48 hours ahead.\`,
        { ward }
      );
      insights.push({
        vertical: 'hospital',
        insight_type: 'risk',
        insight_key: 'ward_capacity_risk',
        title: \`Ward \${ward.name} nearing capacity\`,
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
  const claimsRes = await powerSync.execute(
    \`SELECT id, patient_name, total_amount, status FROM univ_invoices WHERE company_id = ? AND status = 'pending_insurance'\`, [companyId]
  );
  const claims = claimsRes.rows._array;
  if(claims.length > 5) {
      const body = await generateInsight(
        \`There are \${claims.length} pending insurance claims. Check claims against common denial reasons before submission and flag high-risk claims for review.\`,
        { claims: claims.slice(0, 5) }
      );
      return [{
        vertical: 'hospital',
        insight_type: 'risk',
        insight_key: 'claim_denial_risk',
        title: \`\${claims.length} pending claims at risk of denial\`,
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
    \`Recommend minimum staffing levels per ward per shift based on predicted patient volume for the next 24 hours.\`,
    { }
  );
  return [{
    vertical: 'hospital',
    insight_type: 'optimization',
    insight_key: 'staff_demand_optimization',
    title: \`Staff demand optimization for next 24 hours\`,
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
    \`SELECT a.id, a.patient_id, p.first_name, p.last_name FROM univ_appointments a LEFT JOIN univ_patients p ON p.id = a.patient_id WHERE a.company_id = ? AND a.status = 'scheduled' AND a.appointment_date >= date('now')\`, [companyId]
  );
  const apts = aptsRes.rows._array;
  if(apts.length > 0) {
      const body = await generateInsight(
        \`Score each scheduled appointment by historical no-show probability for that patient. Flag high-risk slots for proactive confirmation call.\`,
        { apts: apts.slice(0, 5) }
      );
      return [{
        vertical: 'hospital',
        insight_type: 'risk',
        insight_key: 'appointment_no_show_risk',
        title: \`Appointments at risk of no-show\`,
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
`;

if (!content.includes('detectWardCapacityRisk')) {
    content = content.replace('export default async function hospitalEngine(companyId) {', newFunctions + '\nexport default async function hospitalEngine(companyId) {');
    content = content.replace('detectPrescriptionInteractions(companyId),', 'detectPrescriptionInteractions(companyId),\n    detectWardCapacityRisk(companyId),\n    detectClaimDenialRisk(companyId),\n    detectStaffDemand(companyId),\n    detectNoShowRisk(companyId),');
    fs.writeFileSync(engPath, content, 'utf8');
    console.log('Hospital Engine updated');
}
