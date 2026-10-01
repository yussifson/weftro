// src/lib/intelligence/engines/university.js

import { generateInsight, shouldSurfaceInsight } from '@/lib/intelligence/engine';
import { powerSync } from '@/api/PowerSyncConnector';

// ────────────────────────────────────────────────────────
// 1. Predictive At-Risk Student Model
//    Flags students missing multiple LMS assignments or with low GPA.
// ────────────────────────────────────────────────────────
async function predictAtRiskStudents(companyId) {
  if (!(await shouldSurfaceInsight(companyId, 'uni_at_risk_students'))) return [];

  // Find students
  const resStudents = await powerSync.execute(
    `SELECT id, first_name, last_name, gpa, program_id
     FROM uni_students
     WHERE company_id = ? AND status = 'active'`,
    [companyId]
  );
  const students = resStudents.rows._array;
  if (students.length === 0) return [];

  // Find missing or low scoring submissions
  const resSubmissions = await powerSync.execute(
    `SELECT student_id, score
     FROM uni_lms_submissions
     WHERE company_id = ?`,
    [companyId]
  );
  
  const submissions = resSubmissions.rows._array;
  const subMap = {};
  submissions.forEach(s => {
    if (!subMap[s.student_id]) subMap[s.student_id] = { count: 0, totalScore: 0 };
    subMap[s.student_id].count++;
    subMap[s.student_id].totalScore += (s.score || 0);
  });

  const atRisk = [];
  for (const s of students) {
    const subs = subMap[s.id] || { count: 0, totalScore: 0 };
    const avgScore = subs.count > 0 ? (subs.totalScore / subs.count) : 0;
    
    // Risk triggers: GPA < 2.0 OR 0 submissions OR average score < 50
    if ((s.gpa && s.gpa < 2.0) || subs.count === 0 || (subs.count > 0 && avgScore < 50)) {
        atRisk.push({
            name: `${s.first_name} ${s.last_name}`,
            gpa: s.gpa,
            submissions: subs.count,
            avgScore
        });
    }
  }

  if (atRisk.length === 0) return [];

  const body = await generateInsight(
    `We have identified ${atRisk.length} active students who are potentially 'At Risk' of academic failure or dropping out based on a combination of low GPA (below 2.0) and missing or failing LMS assignment submissions. Summarize the risk and suggest an academic intervention strategy.`,
    { totalAtRisk: atRisk.length, sample: atRisk.slice(0, 3) }
  );

  return [{
    vertical: 'university',
    insight_type: 'risk',
    insight_key: 'uni_at_risk_students',
    title: `${atRisk.length} Students At Risk of Failing`,
    body,
    severity: atRisk.length > 10 ? 'critical' : 'warning',
    confidence: 0.88,
    data_snapshot: { atRiskCount: atRisk.length, sample: atRisk.slice(0, 5) },
    action_label: 'View Students',
    action_url: '/university/students',
  }];
}

// ────────────────────────────────────────────────────────
// 2. Admission Pipeline & Enrollment Forecast
// ────────────────────────────────────────────────────────
async function forecastAdmissions(companyId) {
  if (!(await shouldSurfaceInsight(companyId, 'uni_admission_forecast'))) return [];

  const res = await powerSync.execute(
    `SELECT status, count(*) as count
     FROM uni_applicants
     WHERE company_id = ?
     GROUP BY status`,
    [companyId]
  );
  
  let pending = 0;
  let accepted = 0;
  
  res.rows._array.forEach(r => {
      if(r.status === 'pending') pending = r.count;
      if(r.status === 'accepted') accepted = r.count;
  });

  if (pending === 0 && accepted === 0) return [];

  const body = await generateInsight(
    `There are currently ${pending} pending university applications and ${accepted} accepted candidates. Assuming a standard 65% yield rate on accepted candidates and a 40% acceptance rate on pending candidates, predict the incoming class size and summarize what this means for housing/hostel capacity.`,
    { pending, accepted }
  );

  return [{
    vertical: 'university',
    insight_type: 'prediction',
    insight_key: 'uni_admission_forecast',
    title: `Incoming Class Capacity Forecast`,
    body,
    severity: 'info',
    confidence: 0.85,
    data_snapshot: { pending, accepted },
    action_label: 'Review Admissions',
    action_url: '/university/admissions',
  }];
}


export default async function universityEngine(companyId) {
  const results = await Promise.allSettled([
    predictAtRiskStudents(companyId),
    forecastAdmissions(companyId)
  ]);

  return results.flatMap(r => (r.status === 'fulfilled' ? r.value : []));
}
