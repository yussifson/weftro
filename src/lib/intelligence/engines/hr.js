// src/lib/intelligence/engines/hr.js
// HR Intelligence Engine — employee risk, payroll, leave, reviews
import { generateInsight, groupByWeek, groupByDay } from '@/lib/intelligence/engine';
import { powerSync } from '@/api/PowerSyncConnector';

const VERTICAL = 'hr';

// ────────────────────────────────────────────────────────
// Employee Turnover Risk
// Scores each active employee on flight-risk factors:
//   • Tenure 6–18 months: +20
//   • Frequent leave requests (≥4 in 90 days): +20
//   • Short tenure + many leaves compound risk
// ────────────────────────────────────────────────────────
async function employeeTurnoverRisk(companyId) {
  const insights = [];
  const now = new Date();
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(now.getDate() - 90);

  const empRes = await powerSync.execute(
    `SELECT id, first_name, last_name, department, position, hire_date, status
     FROM univ_employees
     WHERE company_id = ? AND status = 'active'`,
    [companyId]
  );
  const employees = empRes.rows._array;

  if (employees.length === 0) {
    return [{
      vertical: VERTICAL,
      insight_type: 'summary',
      insight_key: 'hr_turnover_no_data',
      title: 'Turnover Intelligence Building',
      body: 'No active employees found yet. Turnover risk analysis will begin once employee data is available.',
      severity: 'info',
    }];
  }

  // Fetch leave counts per employee for the last 90 days
  const leaveRes = await powerSync.execute(
    `SELECT employee_id, COUNT(*) as leave_count
     FROM univ_leave
     WHERE company_id = ? AND start_date >= ?
     GROUP BY employee_id`,
    [companyId, ninetyDaysAgo.toISOString().split('T')[0]]
  );
  const leaveMap = {};
  for (const row of leaveRes.rows._array) {
    leaveMap[row.employee_id] = row.leave_count;
  }

  const atRisk = [];

  for (const emp of employees) {
    let riskScore = 0;
    const factors = [];

    // Tenure scoring
    const hireDate = new Date(emp.hire_date);
    const tenureMonths = (now - hireDate) / (1000 * 60 * 60 * 24 * 30.44);

    if (tenureMonths >= 6 && tenureMonths <= 18) {
      riskScore += 20;
      factors.push(`Tenure ${Math.round(tenureMonths)} months (critical window)`);
    }

    // Leave frequency scoring
    const leaveCount = leaveMap[emp.id] || 0;
    if (leaveCount >= 4) {
      riskScore += 20;
      factors.push(`${leaveCount} leave requests in 90 days`);
    } else if (leaveCount >= 2) {
      riskScore += 10;
      factors.push(`${leaveCount} leave requests in 90 days`);
    }

    // Very short tenure with any leave is a minor signal
    if (tenureMonths < 6 && leaveCount >= 2) {
      riskScore += 10;
      factors.push('Elevated leave for new employee');
    }

    if (riskScore >= 20) {
      atRisk.push({
        name: `${emp.first_name} ${emp.last_name}`,
        department: emp.department,
        position: emp.position,
        riskScore,
        factors,
      });
    }
  }

  if (atRisk.length === 0) {
    return [{
      vertical: VERTICAL,
      insight_type: 'positive',
      insight_key: 'hr_turnover_healthy',
      title: 'Low Turnover Risk',
      body: `All ${employees.length} active employees show low flight-risk signals. No concerning leave or tenure patterns detected.`,
      severity: 'positive',
      confidence: 0.7,
    }];
  }

  // Sort by risk score descending
  atRisk.sort((a, b) => b.riskScore - a.riskScore);
  const top = atRisk.slice(0, 5);

  const aiBody = await generateInsight(
    `Analyze these employees flagged for turnover risk and provide a concise summary with recommended actions.`,
    { totalEmployees: employees.length, atRiskCount: atRisk.length, topAtRisk: top }
  );

  insights.push({
    vertical: VERTICAL,
    insight_type: 'risk',
    insight_key: 'hr_turnover_risk',
    title: `${atRisk.length} Employee${atRisk.length > 1 ? 's' : ''} at Elevated Turnover Risk`,
    body: aiBody,
    severity: atRisk.some(e => e.riskScore >= 40) ? 'critical' : 'warning',
    confidence: 0.65,
    data_snapshot: { totalEmployees: employees.length, atRiskCount: atRisk.length, topAtRisk: top },
    action_label: 'View At-Risk Employees',
    action_url: '/hr/employees?filter=at-risk',
  });

  return insights;
}

// ────────────────────────────────────────────────────────
// Payroll Anomaly Detection
// Compares most recent payroll period against prior periods
// to detect unusual salary, allowance, or deduction swings.
// ────────────────────────────────────────────────────────
async function payrollAnomaly(companyId) {
  const insights = [];

  const payRes = await powerSync.execute(
    `SELECT employee_name, basic_salary, allowances, deductions, status, period_start
     FROM univ_payroll
     WHERE company_id = ?
     ORDER BY period_start DESC`,
    [companyId]
  );
  const payroll = payRes.rows._array;

  if (payroll.length === 0) {
    return [{
      vertical: VERTICAL,
      insight_type: 'summary',
      insight_key: 'hr_payroll_no_data',
      title: 'Payroll Intelligence Building',
      body: 'No payroll records found yet. Anomaly detection will begin once payroll data is available.',
      severity: 'info',
    }];
  }

  // Group by period
  const periods = {};
  for (const row of payroll) {
    const period = (row.period_start || '').split('T')[0];
    if (!period) continue;
    if (!periods[period]) periods[period] = [];
    periods[period].push(row);
  }

  const sortedPeriods = Object.keys(periods).sort((a, b) => b.localeCompare(a));

  if (sortedPeriods.length < 2) {
    return [{
      vertical: VERTICAL,
      insight_type: 'summary',
      insight_key: 'hr_payroll_insufficient',
      title: 'Payroll Analysis Needs More Data',
      body: 'Only one payroll period is available. Anomaly comparison requires at least two periods.',
      severity: 'info',
    }];
  }

  const currentPeriod = sortedPeriods[0];
  const previousPeriod = sortedPeriods[1];
  const currentRows = periods[currentPeriod];
  const previousRows = periods[previousPeriod];

  // Compute period totals
  const sumPeriod = (rows) => {
    let totalSalary = 0, totalAllowances = 0, totalDeductions = 0;
    for (const r of rows) {
      totalSalary += Number(r.basic_salary || 0);
      totalAllowances += Number(r.allowances || 0);
      totalDeductions += Number(r.deductions || 0);
    }
    return { totalSalary, totalAllowances, totalDeductions, headcount: rows.length };
  };

  const current = sumPeriod(currentRows);
  const previous = sumPeriod(previousRows);

  // Build per-employee anomaly list
  const prevMap = {};
  for (const r of previousRows) {
    prevMap[r.employee_name] = r;
  }

  const anomalies = [];
  for (const r of currentRows) {
    const prev = prevMap[r.employee_name];
    if (!prev) continue;
    const salaryDelta = Number(r.basic_salary || 0) - Number(prev.basic_salary || 0);
    const pctChange = Number(prev.basic_salary) > 0
      ? (salaryDelta / Number(prev.basic_salary)) * 100
      : 0;
    if (Math.abs(pctChange) > 15) {
      anomalies.push({
        employee: r.employee_name,
        previousSalary: Number(prev.basic_salary),
        currentSalary: Number(r.basic_salary),
        changePercent: Math.round(pctChange * 10) / 10,
      });
    }
  }

  // Overall period comparison
  const totalDelta = current.totalSalary - previous.totalSalary;
  const overallPctChange = previous.totalSalary > 0
    ? (totalDelta / previous.totalSalary) * 100
    : 0;

  if (anomalies.length === 0 && Math.abs(overallPctChange) <= 10) {
    return [{
      vertical: VERTICAL,
      insight_type: 'positive',
      insight_key: 'hr_payroll_normal',
      title: 'Payroll Consistent',
      body: `Payroll for ${currentPeriod} is within normal range compared to ${previousPeriod}. Total salary moved ${overallPctChange >= 0 ? '+' : ''}${Math.round(overallPctChange * 10) / 10}%.`,
      severity: 'positive',
      confidence: 0.8,
    }];
  }

  const aiBody = await generateInsight(
    `Analyze these payroll changes between periods and highlight anything that needs attention.`,
    {
      currentPeriod,
      previousPeriod,
      currentTotals: current,
      previousTotals: previous,
      overallChangePercent: Math.round(overallPctChange * 10) / 10,
      individualAnomalies: anomalies.slice(0, 5),
    }
  );

  insights.push({
    vertical: VERTICAL,
    insight_type: 'anomaly',
    insight_key: 'hr_payroll_anomaly',
    title: anomalies.length > 0
      ? `${anomalies.length} Payroll Anomal${anomalies.length > 1 ? 'ies' : 'y'} Detected`
      : `Payroll Shift: ${overallPctChange >= 0 ? '+' : ''}${Math.round(overallPctChange)}% Period-over-Period`,
    body: aiBody,
    severity: anomalies.length > 3 || Math.abs(overallPctChange) > 20 ? 'critical' : 'warning',
    confidence: 0.75,
    data_snapshot: {
      currentPeriod,
      previousPeriod,
      overallChangePercent: Math.round(overallPctChange * 10) / 10,
      anomalyCount: anomalies.length,
      anomalies: anomalies.slice(0, 10),
    },
    action_label: 'Review Payroll',
    action_url: '/hr/payroll',
  });

  return insights;
}

// ────────────────────────────────────────────────────────
// Leave Pattern Analysis
// Examines last 90 days of leave data and flags departments
// with absence rates above average.
// ────────────────────────────────────────────────────────
async function leavePatternAnalysis(companyId) {
  const insights = [];
  const now = new Date();
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(now.getDate() - 90);

  // Employee counts by department
  const deptRes = await powerSync.execute(
    `SELECT department, COUNT(*) as emp_count
     FROM univ_employees
     WHERE company_id = ? AND status = 'active'
     GROUP BY department`,
    [companyId]
  );
  const departments = deptRes.rows._array;

  if (departments.length === 0) {
    return [];
  }

  // Leave counts by department (join through employee)
  const leaveRes = await powerSync.execute(
    `SELECT e.department, COUNT(l.employee_id) as leave_count
     FROM univ_leave l
     JOIN univ_employees e ON l.employee_id = e.id AND e.company_id = l.company_id
     WHERE l.company_id = ? AND l.start_date >= ?
     GROUP BY e.department`,
    [companyId, ninetyDaysAgo.toISOString().split('T')[0]]
  );

  const leaveMap = {};
  for (const row of leaveRes.rows._array) {
    leaveMap[row.department] = row.leave_count;
  }

  // Leave type breakdown
  const typeRes = await powerSync.execute(
    `SELECT leave_type, COUNT(*) as cnt
     FROM univ_leave
     WHERE company_id = ? AND start_date >= ?
     GROUP BY leave_type`,
    [companyId, ninetyDaysAgo.toISOString().split('T')[0]]
  );
  const leaveTypes = typeRes.rows._array;

  // Daily trend
  const dailyRes = await powerSync.execute(
    `SELECT start_date, employee_id
     FROM univ_leave
     WHERE company_id = ? AND start_date >= ?`,
    [companyId, ninetyDaysAgo.toISOString().split('T')[0]]
  );
  const dailyTrend = groupByDay(dailyRes.rows._array, 'start_date');

  // Calculate department absence rates
  const deptAbsence = departments.map(d => {
    const leaveCount = leaveMap[d.department] || 0;
    const rate = d.emp_count > 0 ? (leaveCount / d.emp_count) * 100 : 0;
    return {
      department: d.department,
      employeeCount: d.emp_count,
      leaveCount,
      absenceRate: Math.round(rate * 10) / 10,
    };
  });

  const totalLeaves = deptAbsence.reduce((s, d) => s + d.leaveCount, 0);
  const totalEmployees = deptAbsence.reduce((s, d) => s + d.employeeCount, 0);

  if (totalLeaves === 0) {
    return [{
      vertical: VERTICAL,
      insight_type: 'summary',
      insight_key: 'hr_leave_no_data',
      title: 'Leave Intelligence Building',
      body: 'No leave records found for the last 90 days. Pattern analysis will begin once leave data is available.',
      severity: 'info',
    }];
  }

  const avgRate = totalEmployees > 0 ? (totalLeaves / totalEmployees) * 100 : 0;
  const highAbsence = deptAbsence.filter(d => d.absenceRate > avgRate * 1.5 && d.leaveCount >= 2);
  highAbsence.sort((a, b) => b.absenceRate - a.absenceRate);

  if (highAbsence.length > 0) {
    const aiBody = await generateInsight(
      `Analyze these department absence patterns over 90 days and suggest actions to reduce absenteeism.`,
      {
        averageAbsenceRate: Math.round(avgRate * 10) / 10,
        highAbsenceDepartments: highAbsence,
        leaveTypeBreakdown: leaveTypes,
        dailyTrend: dailyTrend.slice(-14),
      }
    );

    insights.push({
      vertical: VERTICAL,
      insight_type: 'pattern',
      insight_key: 'hr_leave_pattern_high',
      title: `${highAbsence.length} Department${highAbsence.length > 1 ? 's' : ''} with Elevated Absence`,
      body: aiBody,
      severity: highAbsence.some(d => d.absenceRate > 50) ? 'critical' : 'warning',
      confidence: 0.7,
      data_snapshot: {
        averageAbsenceRate: Math.round(avgRate * 10) / 10,
        departments: deptAbsence,
        leaveTypes,
      },
      action_label: 'View Leave Dashboard',
      action_url: '/hr/leave',
    });
  } else {
    insights.push({
      vertical: VERTICAL,
      insight_type: 'summary',
      insight_key: 'hr_leave_pattern_normal',
      title: 'Leave Patterns Within Normal Range',
      body: `Across ${totalEmployees} employees, there were ${totalLeaves} leave requests in the last 90 days (avg ${Math.round(avgRate * 10) / 10}% rate per department). No department shows significantly elevated absence.`,
      severity: 'positive',
      confidence: 0.7,
      data_snapshot: { departments: deptAbsence, leaveTypes },
    });
  }

  return insights;
}

// ────────────────────────────────────────────────────────
// Overdue Performance Reviews
// Flags active employees with >12 months tenure who have
// not had a recorded performance review recently.
// ────────────────────────────────────────────────────────
async function overdueReviews(companyId) {
  const insights = [];
  const now = new Date();
  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setMonth(now.getMonth() - 12);

  // Employees with >12 months tenure
  const empRes = await powerSync.execute(
    `SELECT id, first_name, last_name, department, position, hire_date
     FROM univ_employees
     WHERE company_id = ? AND status = 'active' AND hire_date <= ?`,
    [companyId, twelveMonthsAgo.toISOString().split('T')[0]]
  );
  const eligibleEmployees = empRes.rows._array;

  if (eligibleEmployees.length === 0) {
    return [];
  }

  // We have no dedicated performance_reviews table, so all eligible
  // employees are considered as potentially overdue.
  const overdue = eligibleEmployees.map(emp => {
    const tenureMonths = Math.round((now - new Date(emp.hire_date)) / (1000 * 60 * 60 * 24 * 30.44));
    return {
      name: `${emp.first_name} ${emp.last_name}`,
      department: emp.department,
      position: emp.position,
      tenureMonths,
    };
  });

  if (overdue.length === 0) {
    return [];
  }

  // Group by department
  const byDept = {};
  for (const emp of overdue) {
    if (!byDept[emp.department]) byDept[emp.department] = 0;
    byDept[emp.department]++;
  }

  const aiBody = await generateInsight(
    `Summarize overdue performance reviews and recommend a prioritization strategy.`,
    {
      totalOverdue: overdue.length,
      byDepartment: byDept,
      longestTenure: overdue.sort((a, b) => b.tenureMonths - a.tenureMonths).slice(0, 3),
    }
  );

  insights.push({
    vertical: VERTICAL,
    insight_type: 'recommendation',
    insight_key: 'hr_overdue_reviews',
    title: `${overdue.length} Employee${overdue.length > 1 ? 's' : ''} May Need Performance Reviews`,
    body: aiBody,
    severity: overdue.length > 10 ? 'warning' : 'info',
    confidence: 0.6,
    data_snapshot: {
      totalOverdue: overdue.length,
      byDepartment: byDept,
      topByTenure: overdue.slice(0, 5),
    },
    action_label: 'Schedule Reviews',
    action_url: '/hr/employees',
  });

  return insights;
}

// ────────────────────────────────────────────────────────
// Main Export
// ────────────────────────────────────────────────────────
export default async function hrEngine(companyId) {
  const results = await Promise.allSettled([
    employeeTurnoverRisk(companyId),
    payrollAnomaly(companyId),
    leavePatternAnalysis(companyId),
    overdueReviews(companyId),
  ]);

  const insights = [];
  for (const result of results) {
    if (result.status === 'fulfilled' && Array.isArray(result.value)) {
      insights.push(...result.value);
    }
  }

  return insights;
}
