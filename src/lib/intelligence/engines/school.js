// src/lib/intelligence/engines/school.js
// Education Intelligence Engine — vertical='school'
// Covers: at-risk students, grade patterns, fee health, teacher workload

import { generateInsight } from '@/lib/intelligence/engine';
import { powerSync } from '@/api/PowerSyncConnector';

// ────────────────────────────────────────────────────────
// 1. At-Risk Students
//    Flag students with <75% attendance rate.
//    Cross-reference univ_students and univ_attendance.
// ────────────────────────────────────────────────────────
async function detectAtRiskStudents(companyId) {
  // Get all enrolled students with their attendance stats
  const res = await powerSync.execute(
    `SELECT s.id, s.first_name, s.last_name, s.grade_level, s.enrollment_status,
            COUNT(a.student_id) as total_days,
            SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_days,
            SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_days,
            SUM(CASE WHEN a.status = 'late' OR a.status = 'tardy' THEN 1 ELSE 0 END) as late_days
     FROM univ_students s
     LEFT JOIN univ_attendance a ON a.student_id = s.id AND a.company_id = s.company_id
     WHERE s.company_id = ?
       AND s.enrollment_status IN ('enrolled', 'active', 'Active', 'Enrolled')
     GROUP BY s.id, s.first_name, s.last_name, s.grade_level, s.enrollment_status`,
    [companyId]
  );

  const students = res.rows._array;
  if (students.length === 0) return [];

  const atRisk = [];
  for (const s of students) {
    const totalDays = Number(s.total_days) || 0;
    if (totalDays < 5) continue; // Not enough data

    const presentDays = Number(s.present_days) || 0;
    const lateDays = Number(s.late_days) || 0;
    const attendanceRate = ((presentDays + lateDays) / totalDays) * 100;

    if (attendanceRate < 75) {
      atRisk.push({
        student_id: s.id,
        name: `${s.first_name} ${s.last_name}`,
        grade_level: s.grade_level,
        attendance_rate: Math.round(attendanceRate * 10) / 10,
        total_days: totalDays,
        present_days: presentDays,
        absent_days: Number(s.absent_days) || 0,
        late_days: lateDays,
      });
    }
  }

  if (atRisk.length === 0) return [];

  // Sort by worst attendance first
  atRisk.sort((a, b) => a.attendance_rate - b.attendance_rate);

  // Group by grade level for pattern detection
  const byGrade = {};
  atRisk.forEach(s => {
    const grade = s.grade_level || 'Unknown';
    if (!byGrade[grade]) byGrade[grade] = 0;
    byGrade[grade]++;
  });

  const criticalCount = atRisk.filter(s => s.attendance_rate < 50).length;
  const severity = criticalCount > 0 ? 'critical' : 'warning';

  const body = await generateInsight(
    `${atRisk.length} student(s) have attendance below 75%. ${criticalCount} are critically low (below 50%). Worst: ${atRisk[0].name} (Grade ${atRisk[0].grade_level}) at ${atRisk[0].attendance_rate}% (${atRisk[0].absent_days} absences out of ${atRisk[0].total_days} days). Breakdown by grade: ${JSON.stringify(byGrade)}. Total enrolled students analyzed: ${students.length}. Recommend intervention strategies.`,
    { atRisk: atRisk.slice(0, 10), byGrade, totalStudents: students.length }
  );

  const insights = [{
    vertical: 'school',
    insight_type: 'risk',
    insight_key: 'at_risk_students_attendance',
    title: `${atRisk.length} student${atRisk.length !== 1 ? 's' : ''} with attendance below 75%`,
    body,
    severity,
    confidence: 0.95,
    data_snapshot: {
      at_risk_count: atRisk.length,
      critical_count: criticalCount,
      total_enrolled: students.length,
      by_grade: byGrade,
      students: atRisk.slice(0, 30),
    },
    action_label: 'View Attendance',
    action_url: '/attendance?filter=at-risk',
  }];

  // Per-student alerts for critically low attendance (<50%)
  for (const s of atRisk.filter(s => s.attendance_rate < 50).slice(0, 5)) {
    insights.push({
      vertical: 'school',
      insight_type: 'risk',
      insight_key: 'student_critical_attendance',
      entity_type: 'student',
      entity_id: s.student_id,
      title: `${s.name} — ${s.attendance_rate}% attendance rate`,
      body: `${s.name} (Grade ${s.grade_level}) has attended only ${s.present_days} of ${s.total_days} days (${s.attendance_rate}%). With ${s.absent_days} absences, immediate parent contact and intervention is recommended.`,
      severity: 'critical',
      confidence: 1.0,
      data_snapshot: s,
      action_label: 'View Student',
      action_url: `/students/${s.student_id}`,
    });
  }

  return insights;
}

// ────────────────────────────────────────────────────────
// 2. Grade Performance Patterns
//    Query assignments and submissions. Calculate
//    class-wide averages and flag low-performing subjects.
// ────────────────────────────────────────────────────────
async function analyzeGradePerformance(companyId) {
  const res = await powerSync.execute(
    `SELECT a.title as assignment_title, a.subject, a.due_date,
            sub.student_id, sub.grade, sub.submitted_at
     FROM univ_assignments a
     INNER JOIN univ_school_assignment_submissions sub
       ON sub.assignment_id = a.id AND sub.company_id = a.company_id
     WHERE a.company_id = ?
       AND sub.grade IS NOT NULL
     ORDER BY a.subject, a.due_date DESC`,
    [companyId]
  );

  const rows = res.rows._array;
  if (rows.length < 5) {
    if (rows.length === 0) return [];
    return [{
      vertical: 'school',
      insight_type: 'summary',
      insight_key: 'grade_performance_patterns',
      title: 'Building grade performance intelligence',
      body: `Only ${rows.length} graded submission(s) recorded so far. More data is needed to identify subject-level performance patterns.`,
      severity: 'info',
      confidence: 0.5,
      data_snapshot: { total_submissions: rows.length },
    }];
  }

  // Group by subject
  const bySubject = {};
  rows.forEach(r => {
    const subject = r.subject || 'Unspecified';
    if (!bySubject[subject]) bySubject[subject] = { grades: [], submissions: 0 };
    const grade = Number(r.grade);
    if (!isNaN(grade)) {
      bySubject[subject].grades.push(grade);
      bySubject[subject].submissions++;
    }
  });

  const subjectStats = Object.entries(bySubject).map(([subject, data]) => {
    const grades = data.grades;
    const avg = grades.reduce((s, g) => s + g, 0) / grades.length;
    const sorted = [...grades].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
    const failingCount = grades.filter(g => g < 60).length;
    const failingRate = (failingCount / grades.length) * 100;

    return {
      subject,
      average: Math.round(avg * 10) / 10,
      median: Math.round(median * 10) / 10,
      submissions: data.submissions,
      failing_count: failingCount,
      failing_rate: Math.round(failingRate * 10) / 10,
      min: sorted[0],
      max: sorted[sorted.length - 1],
    };
  }).sort((a, b) => a.average - b.average);

  // Overall class average
  const allGrades = rows.map(r => Number(r.grade)).filter(g => !isNaN(g));
  const overallAvg = allGrades.reduce((s, g) => s + g, 0) / allGrades.length;

  // Flag struggling subjects (avg < 65 or >30% failing)
  const struggling = subjectStats.filter(s => s.average < 65 || s.failing_rate > 30);

  const severity = struggling.length > 0 ? 'warning' : overallAvg >= 75 ? 'positive' : 'info';

  const body = await generateInsight(
    `Grade analysis across ${subjectStats.length} subject(s), ${allGrades.length} total submissions. Overall average: ${overallAvg.toFixed(1)}%. ${struggling.length} subject(s) are struggling (avg <65% or >30% failing rate): ${struggling.map(s => `${s.subject} (avg ${s.average}%, ${s.failing_rate}% failing)`).join('; ') || 'none'}. Top performing: ${subjectStats[subjectStats.length - 1]?.subject} at ${subjectStats[subjectStats.length - 1]?.average}%. Recommend focus areas.`,
    { subjectStats, overallAvg: overallAvg.toFixed(1), totalSubmissions: allGrades.length }
  );

  return [{
    vertical: 'school',
    insight_type: 'pattern',
    insight_key: 'grade_performance_patterns',
    title: `Class average: ${overallAvg.toFixed(0)}%${struggling.length > 0 ? ` — ${struggling.length} subject${struggling.length !== 1 ? 's' : ''} need attention` : ''}`,
    body,
    severity,
    confidence: Math.min(0.9, 0.5 + (allGrades.length * 0.005)),
    data_snapshot: {
      overall_average: overallAvg,
      total_submissions: allGrades.length,
      subjects: subjectStats,
      struggling_subjects: struggling,
    },
    action_label: 'View Grades',
    action_url: '/assignments?view=analytics',
  }];
}

// ────────────────────────────────────────────────────────
// 3. Fee Collection Health
//    Sum outstanding fees. Identify overdue payments.
// ────────────────────────────────────────────────────────
async function analyzeFeeCollection(companyId) {
  const res = await powerSync.execute(
    `SELECT f.student_id, f.amount, f.paid_amount, f.due_date, f.status,
            s.first_name, s.last_name, s.grade_level
     FROM univ_fees f
     LEFT JOIN univ_students s ON s.id = f.student_id AND s.company_id = f.company_id
     WHERE f.company_id = ?
     ORDER BY f.due_date DESC`,
    [companyId]
  );

  const fees = res.rows._array;
  if (fees.length === 0) return [];

  let totalBilled = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;
  let overdueCount = 0;
  let overdueAmount = 0;
  const now = new Date().toISOString().split('T')[0];
  const overdueStudents = {};

  fees.forEach(f => {
    const amount = Number(f.amount) || 0;
    const paid = Number(f.paid_amount) || 0;
    const outstanding = amount - paid;

    totalBilled += amount;
    totalPaid += paid;

    if (outstanding > 0) {
      totalOutstanding += outstanding;

      if (f.due_date && f.due_date < now && f.status !== 'paid') {
        overdueCount++;
        overdueAmount += outstanding;

        if (!overdueStudents[f.student_id]) {
          overdueStudents[f.student_id] = {
            student_id: f.student_id,
            name: `${f.first_name || ''} ${f.last_name || ''}`.trim() || 'Unknown',
            grade_level: f.grade_level,
            overdue_amount: 0,
            overdue_items: 0,
          };
        }
        overdueStudents[f.student_id].overdue_amount += outstanding;
        overdueStudents[f.student_id].overdue_items++;
      }
    }
  });

  const collectionRate = totalBilled > 0 ? (totalPaid / totalBilled) * 100 : 0;

  const topOverdue = Object.values(overdueStudents)
    .sort((a, b) => b.overdue_amount - a.overdue_amount);

  let severity = 'positive';
  if (collectionRate < 60 || overdueAmount > totalBilled * 0.3) severity = 'critical';
  else if (collectionRate < 80 || overdueCount > 10) severity = 'warning';
  else if (collectionRate < 90) severity = 'info';

  const body = await generateInsight(
    `Fee collection analysis: $${totalBilled.toFixed(2)} total billed, $${totalPaid.toFixed(2)} collected (${collectionRate.toFixed(1)}% collection rate). Outstanding: $${totalOutstanding.toFixed(2)}. Overdue: ${overdueCount} item(s) totaling $${overdueAmount.toFixed(2)} across ${topOverdue.length} student(s). ${topOverdue.length > 0 ? `Highest overdue: ${topOverdue[0].name} owes $${topOverdue[0].overdue_amount.toFixed(2)}.` : ''} Recommend collection strategies.`,
    { collectionRate, totalBilled, totalPaid, totalOutstanding, overdueCount, overdueAmount, topOverdue: topOverdue.slice(0, 5) }
  );

  return [{
    vertical: 'school',
    insight_type: 'summary',
    insight_key: 'fee_collection_health',
    title: `Fee collection at ${collectionRate.toFixed(0)}% — $${totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} outstanding`,
    body,
    severity,
    confidence: 1.0,
    data_snapshot: {
      total_billed: totalBilled,
      total_paid: totalPaid,
      total_outstanding: totalOutstanding,
      collection_rate: collectionRate,
      overdue_count: overdueCount,
      overdue_amount: overdueAmount,
      top_overdue_students: topOverdue.slice(0, 20),
    },
    action_label: 'View Fees',
    action_url: '/fees?filter=overdue',
  }];
}

// ────────────────────────────────────────────────────────
// 4. Teacher Workload Distribution
//    Count classes per teacher. Flag overloaded teachers.
// ────────────────────────────────────────────────────────
async function analyzeTeacherWorkload(companyId) {
  const res = await powerSync.execute(
    `SELECT t.id, t.first_name, t.last_name, t.subject,
            COUNT(c.teacher_id) as class_count,
            GROUP_CONCAT(c.class_name) as class_names
     FROM univ_teachers t
     LEFT JOIN univ_classes c ON c.teacher_id = t.id AND c.company_id = t.company_id
     WHERE t.company_id = ?
     GROUP BY t.id, t.first_name, t.last_name, t.subject
     ORDER BY class_count DESC`,
    [companyId]
  );

  const teachers = res.rows._array;
  if (teachers.length === 0) return [];

  // Calculate statistics
  const classCounts = teachers.map(t => Number(t.class_count) || 0);
  const totalClasses = classCounts.reduce((s, c) => s + c, 0);
  const avgClasses = totalClasses / teachers.length;

  // Teachers with no classes assigned
  const unassigned = teachers.filter(t => (Number(t.class_count) || 0) === 0);

  // Teachers with significantly more classes than average (>= avg + 2, or >= 6)
  const overloadThreshold = Math.max(avgClasses + 2, 6);
  const overloaded = teachers.filter(t => Number(t.class_count) >= overloadThreshold);

  const teacherData = teachers.map(t => ({
    teacher_id: t.id,
    name: `${t.first_name} ${t.last_name}`,
    subject: t.subject,
    class_count: Number(t.class_count) || 0,
    classes: t.class_names ? t.class_names.split(',') : [],
  }));

  if (overloaded.length === 0 && unassigned.length === 0) {
    return [{
      vertical: 'school',
      insight_type: 'summary',
      insight_key: 'teacher_workload',
      title: `Teacher workload is balanced — avg ${avgClasses.toFixed(1)} classes each`,
      body: `All ${teachers.length} teachers have a balanced workload. Average is ${avgClasses.toFixed(1)} classes per teacher. No overloaded or unassigned teachers detected.`,
      severity: 'positive',
      confidence: 0.9,
      data_snapshot: {
        total_teachers: teachers.length,
        total_classes: totalClasses,
        avg_classes: avgClasses,
        teachers: teacherData.slice(0, 20),
      },
      action_label: 'View Teachers',
      action_url: '/teachers',
    }];
  }

  let severity = 'info';
  if (overloaded.length > 0) severity = 'warning';
  if (overloaded.length >= 3 || unassigned.length >= 3) severity = 'critical';

  const overloadedData = teacherData.filter(t => t.class_count >= overloadThreshold);
  const unassignedData = teacherData.filter(t => t.class_count === 0);

  const body = await generateInsight(
    `Teacher workload analysis: ${teachers.length} teachers, ${totalClasses} total classes, average ${avgClasses.toFixed(1)} per teacher. ${overloaded.length} teacher(s) are overloaded (${overloadThreshold}+ classes): ${overloadedData.map(t => `${t.name} (${t.class_count} classes)`).join(', ') || 'none'}. ${unassigned.length} teacher(s) have no classes assigned: ${unassignedData.map(t => t.name).join(', ') || 'none'}. Suggest rebalancing strategies.`,
    { teacherData: teacherData.slice(0, 15), avgClasses, overloadThreshold }
  );

  return [{
    vertical: 'school',
    insight_type: 'recommendation',
    insight_key: 'teacher_workload',
    title: `${overloaded.length > 0 ? `${overloaded.length} overloaded teacher${overloaded.length !== 1 ? 's' : ''}` : ''}${overloaded.length > 0 && unassigned.length > 0 ? ' and ' : ''}${unassigned.length > 0 ? `${unassigned.length} unassigned teacher${unassigned.length !== 1 ? 's' : ''}` : ''} — workload rebalancing needed`,
    body,
    severity,
    confidence: 0.9,
    data_snapshot: {
      total_teachers: teachers.length,
      total_classes: totalClasses,
      avg_classes: avgClasses,
      overload_threshold: overloadThreshold,
      overloaded: overloadedData,
      unassigned: unassignedData,
      all_teachers: teacherData.slice(0, 30),
    },
    action_label: 'View Teachers',
    action_url: '/teachers?filter=workload',
  }];
}

// ────────────────────────────────────────────────────────
// Main Export — runs all education checks
// ────────────────────────────────────────────────────────
export default async function schoolEngine(companyId) {
  const results = await Promise.allSettled([
    detectAtRiskStudents(companyId),
    analyzeGradePerformance(companyId),
    analyzeFeeCollection(companyId),
    analyzeTeacherWorkload(companyId),
  ]);

  return results.flatMap(r => (r.status === 'fulfilled' ? r.value : []));
}
