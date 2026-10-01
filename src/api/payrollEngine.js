import { powerSync } from './PowerSyncConnector';
import { calculateEmployeeTaxBreakdown } from './ghanaTaxEngine';
import { postJournalEntry } from './glEngine';

/**
 * Payroll Accounting Engine
 * Handles employee statutory calculations and automated GL double-entry posting.
 */

/**
 * Processes a payroll run for a list of staff members and computes statutory totals.
 * @param {Array<{ id: string, name: string, basicSalary: number, allowances?: number, taxReliefs?: number, voluntaryTier3?: number }>} staffList 
 */
export function processPayrollRun(staffList = []) {
  const processedItems = [];
  let totals = {
    grossPay: 0,
    employeeSSNIT: 0,
    employerSSNIT: 0,
    payeTax: 0,
    tier3Contribution: 0,
    totalDeductions: 0,
    netPay: 0,
    totalPayrollCost: 0, // Gross Pay + Employer SSNIT
  };

  for (const staff of staffList) {
    const calc = calculateEmployeeTaxBreakdown({
      basicSalary: staff.basicSalary || staff.salary || 0,
      allowances: staff.allowances || 0,
      taxReliefs: staff.taxReliefs || 0,
      voluntaryTier3: staff.voluntaryTier3 || 0,
    });

    const item = {
      staffId: staff.id,
      staffName: staff.name || staff.staff_name || 'Employee',
      staffEmail: staff.email || staff.staff_email || '',
      ...calc,
    };

    processedItems.push(item);

    totals.grossPay += item.grossPay;
    totals.employeeSSNIT += item.employeeSSNIT;
    totals.employerSSNIT += item.employerSSNIT;
    totals.payeTax += item.payeTax;
    totals.tier3Contribution += item.tier3Contribution;
    totals.totalDeductions += item.totalDeductions;
    totals.netPay += item.netPay;
    totals.totalPayrollCost += item.grossPay + item.employerSSNIT;
  }

  // Round totals to 2 decimals
  Object.keys(totals).forEach((k) => {
    totals[k] = parseFloat(totals[k].toFixed(2));
  });

  return {
    processedItems,
    totals,
  };
}

/**
 * Helper to ensure standard accounting accounts for payroll exist in the company's Chart of Accounts.
 * @param {string} companyId 
 */
export async function ensurePayrollAccounts(companyId) {
  if (!companyId) return {};

  const requiredAccounts = [
    { code: '5000', name: 'Salaries & Payroll Expenses', type: 'Expense' },
    { code: '2100', name: 'Accrued Payroll / Salaries Payable', type: 'Liability' },
    { code: '2110', name: 'GRA PAYE Tax Liability', type: 'Liability' },
    { code: '2120', name: 'SSNIT Pension Liability', type: 'Liability' },
  ];

  const accountIds = {};

  for (const req of requiredAccounts) {
    const res = await powerSync.execute(
      'SELECT id FROM gl_accounts WHERE company_id = ? AND code = ? LIMIT 1',
      [companyId, req.code]
    );

    if (res.rows && res.rows.length > 0) {
      accountIds[req.code] = res.rows.item(0).id;
    } else {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await powerSync.execute(
        `INSERT INTO gl_accounts (id, company_id, code, name, type, parent_id, is_active, description, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, NULL, 1, ?, ?, ?)`,
        [id, companyId, req.code, req.name, req.type, `System ${req.name}`, now, now]
      );
      accountIds[req.code] = id;
    }
  }

  return accountIds;
}

/**
 * Posts a balanced double-entry Journal Entry for a Payroll Run into the General Ledger.
 * 
 * Accounting Entry Logic:
 * DEBIT: Salaries & Payroll Expense (Gross Salaries + Employer SSNIT)
 * CREDIT: Accrued Salaries Payable (Net Pay to employees)
 * CREDIT: GRA PAYE Tax Liability (PAYE Tax owed to GRA)
 * CREDIT: SSNIT Pension Liability (Employee 5.5% + Employer 13.5% owed to SSNIT)
 * 
 * @param {Object} params
 * @param {string} params.companyId
 * @param {string} params.period - e.g. "2026-09"
 * @param {Object} params.totals - Computed payroll totals from processPayrollRun
 * @param {string} [params.postedBy]
 */
export async function postPayrollRunToGL({ companyId, period, totals, postedBy }) {
  if (!companyId) throw new Error('Company ID is required for posting payroll to GL.');
  if (!totals || totals.netPay <= 0) throw new Error('Invalid or zero payroll totals.');

  const accounts = await ensurePayrollAccounts(companyId);

  const totalExpenseDebit = totals.grossPay + totals.employerSSNIT; // Total Payroll Cost to Employer
  const totalSSNITLiability = totals.employeeSSNIT + totals.employerSSNIT; // Combined SSNIT 19%

  const lines = [
    // 1. DEBIT: Total Salaries & Payroll Expense
    {
      accountId: accounts['5000'],
      debit: parseFloat(totalExpenseDebit.toFixed(2)),
      credit: 0,
      description: `Payroll Expense for Period ${period} (Gross + Employer SSNIT)`,
    },
    // 2. CREDIT: Net Salaries Payable to Employees
    {
      accountId: accounts['2100'],
      debit: 0,
      credit: parseFloat(totals.netPay.toFixed(2)),
      description: `Net Salary Payable to Staff for ${period}`,
    },
    // 3. CREDIT: GRA PAYE Tax Liability
    {
      accountId: accounts['2110'],
      debit: 0,
      credit: parseFloat(totals.payeTax.toFixed(2)),
      description: `GRA PAYE Tax Withheld for ${period}`,
    },
    // 4. CREDIT: Total SSNIT Pension Liability (19%)
    {
      accountId: accounts['2120'],
      debit: 0,
      credit: parseFloat(totalSSNITLiability.toFixed(2)),
      description: `Total SSNIT Pension Liability (Tier 1 & Tier 2) for ${period}`,
    },
  ];

  const journalResult = await postJournalEntry({
    companyId,
    date: new Date().toISOString().split('T')[0],
    description: `Payroll Run Accrual for ${period}`,
    reference: `PAYROLL-${period}`,
    postedBy: postedBy || 'Payroll Module',
    lines,
  });

  return journalResult;
}
