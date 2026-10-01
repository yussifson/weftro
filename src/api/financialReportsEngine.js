import { powerSync } from '@/api/PowerSyncConnector';

/**
 * Stage 3: Financial Statements & Reporting Engine
 * Aggregates GL data to generate the Trial Balance, P&L, and Balance Sheet.
 */

// Format utilities
const roundTo2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

export const generateTrialBalance = async ({ companyId, asOfDate }) => {
  try {
    // We get all accounts and sum their debits/credits up to asOfDate
    const dateFilter = asOfDate ? `AND je.posting_date <= ?` : ``;
    const params = asOfDate ? [companyId, asOfDate] : [companyId];

    // NOTE: This could be optimized, but using powerSync raw queries for simplicity.
    // Query groups by account id.
    const query = `
      SELECT 
        a.id,
        a.account_number,
        a.account_name,
        a.account_type,
        SUM(COALESCE(jli.debit, 0)) as total_debit,
        SUM(COALESCE(jli.credit, 0)) as total_credit
      FROM gl_accounts a
      LEFT JOIN gl_journal_line_items jli ON a.id = jli.account_id
      LEFT JOIN gl_journal_entries je ON jli.journal_entry_id = je.id
      WHERE a.company_id = ? ${dateFilter}
      GROUP BY a.id, a.account_number, a.account_name, a.account_type
      ORDER BY a.account_number ASC
    `;

    const res = await powerSync.execute(query, params);
    const rows = res.rows ? (res.rows._array || Array.from(res.rows)) : [];

    let trialBalance = [];
    let totalDebits = 0;
    let totalCredits = 0;

    for (const row of rows) {
      const db = parseFloat(row.total_debit) || 0;
      const cr = parseFloat(row.total_credit) || 0;
      
      let netDebit = 0;
      let netCredit = 0;

      // Determine normal balance based on account type
      const normalBalance = ['Asset', 'Expense'].includes(row.account_type) ? 'Debit' : 'Credit';

      if (normalBalance === 'Debit') {
        netDebit = Math.max(0, db - cr);
        netCredit = Math.max(0, cr - db);
      } else {
        netCredit = Math.max(0, cr - db);
        netDebit = Math.max(0, db - cr);
      }

      // We only include accounts that have activity
      if (db > 0 || cr > 0) {
        trialBalance.push({
          accountId: row.id,
          accountNumber: row.account_number,
          accountName: row.account_name,
          accountType: row.account_type,
          netDebit: roundTo2(netDebit),
          netCredit: roundTo2(netCredit)
        });
        
        totalDebits += netDebit;
        totalCredits += netCredit;
      }
    }

    return {
      asOfDate: asOfDate || new Date().toISOString(),
      accounts: trialBalance,
      totals: {
        debit: roundTo2(totalDebits),
        credit: roundTo2(totalCredits)
      },
      isBalanced: Math.abs(totalDebits - totalCredits) <= 0.01
    };

  } catch (error) {
    console.error('Failed to generate Trial Balance:', error);
    throw error;
  }
};

export const generateProfitAndLoss = async ({ companyId, startDate, endDate }) => {
  try {
    const params = [companyId];
    let dateFilter = ``;
    if (startDate) {
      dateFilter += ` AND je.posting_date >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      dateFilter += ` AND je.posting_date <= ?`;
      params.push(endDate);
    }

    const query = `
      SELECT 
        a.id,
        a.account_number,
        a.account_name,
        a.account_type,
        SUM(COALESCE(jli.debit, 0)) as total_debit,
        SUM(COALESCE(jli.credit, 0)) as total_credit
      FROM gl_accounts a
      LEFT JOIN gl_journal_line_items jli ON a.id = jli.account_id
      LEFT JOIN gl_journal_entries je ON jli.journal_entry_id = je.id
      WHERE a.company_id = ? AND a.account_type IN ('Revenue', 'Expense') ${dateFilter}
      GROUP BY a.id, a.account_number, a.account_name, a.account_type
      ORDER BY a.account_number ASC
    `;

    const res = await powerSync.execute(query, params);
    const rows = res.rows ? (res.rows._array || Array.from(res.rows)) : [];

    let revenues = [];
    let expenses = [];
    let totalRevenue = 0;
    let totalExpense = 0;

    for (const row of rows) {
      const db = parseFloat(row.total_debit) || 0;
      const cr = parseFloat(row.total_credit) || 0;
      
      if (db === 0 && cr === 0) continue;

      if (row.account_type === 'Revenue') {
        // Revenue normal balance is Credit
        const balance = roundTo2(cr - db);
        revenues.push({ ...row, balance });
        totalRevenue += balance;
      } else if (row.account_type === 'Expense') {
        // Expense normal balance is Debit
        const balance = roundTo2(db - cr);
        expenses.push({ ...row, balance });
        totalExpense += balance;
      }
    }

    const netIncome = roundTo2(totalRevenue - totalExpense);

    return {
      period: { startDate, endDate },
      revenues,
      expenses,
      totals: {
        revenue: totalRevenue,
        expense: totalExpense,
        netIncome
      }
    };

  } catch (error) {
    console.error('Failed to generate P&L:', error);
    throw error;
  }
};

export const generateBalanceSheet = async ({ companyId, asOfDate }) => {
  try {
    const params = [companyId];
    let dateFilter = ``;
    if (asOfDate) {
      dateFilter = ` AND je.posting_date <= ?`;
      params.push(asOfDate);
    }

    // Step 1: Calculate Net Income up to the asOfDate (Retained Earnings)
    const plQuery = `
      SELECT 
        a.account_type,
        SUM(COALESCE(jli.debit, 0)) as total_debit,
        SUM(COALESCE(jli.credit, 0)) as total_credit
      FROM gl_accounts a
      LEFT JOIN gl_journal_line_items jli ON a.id = jli.account_id
      LEFT JOIN gl_journal_entries je ON jli.journal_entry_id = je.id
      WHERE a.company_id = ? AND a.account_type IN ('Revenue', 'Expense') ${dateFilter}
      GROUP BY a.account_type
    `;
    const plRes = await powerSync.execute(plQuery, params);
    const plRows = plRes.rows ? (plRes.rows._array || Array.from(plRes.rows)) : [];
    
    let totalRev = 0;
    let totalExp = 0;
    for (const r of plRows) {
      const db = parseFloat(r.total_debit) || 0;
      const cr = parseFloat(r.total_credit) || 0;
      if (r.account_type === 'Revenue') totalRev += (cr - db);
      if (r.account_type === 'Expense') totalExp += (db - cr);
    }
    const retainedEarnings = roundTo2(totalRev - totalExp);

    // Step 2: Get all Assets, Liabilities, and Equity accounts
    const bsQuery = `
      SELECT 
        a.id,
        a.account_number,
        a.account_name,
        a.account_type,
        SUM(COALESCE(jli.debit, 0)) as total_debit,
        SUM(COALESCE(jli.credit, 0)) as total_credit
      FROM gl_accounts a
      LEFT JOIN gl_journal_line_items jli ON a.id = jli.account_id
      LEFT JOIN gl_journal_entries je ON jli.journal_entry_id = je.id
      WHERE a.company_id = ? AND a.account_type IN ('Asset', 'Liability', 'Equity') ${dateFilter}
      GROUP BY a.id, a.account_number, a.account_name, a.account_type
      ORDER BY a.account_number ASC
    `;
    const bsRes = await powerSync.execute(bsQuery, params);
    const bsRows = bsRes.rows ? (bsRes.rows._array || Array.from(bsRes.rows)) : [];

    let assets = [];
    let liabilities = [];
    let equity = [];
    
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    for (const row of bsRows) {
      const db = parseFloat(row.total_debit) || 0;
      const cr = parseFloat(row.total_credit) || 0;
      if (db === 0 && cr === 0) continue;

      if (row.account_type === 'Asset') {
        const balance = roundTo2(db - cr);
        assets.push({ ...row, balance });
        totalAssets += balance;
      } else if (row.account_type === 'Liability') {
        const balance = roundTo2(cr - db);
        liabilities.push({ ...row, balance });
        totalLiabilities += balance;
      } else if (row.account_type === 'Equity') {
        const balance = roundTo2(cr - db);
        equity.push({ ...row, balance });
        totalEquity += balance;
      }
    }

    // Inject Retained Earnings into Equity
    if (retainedEarnings !== 0) {
      equity.push({
        id: 'retained-earnings',
        account_number: '3900', // Conventional
        account_name: 'Retained Earnings (Calculated)',
        account_type: 'Equity',
        balance: retainedEarnings
      });
      totalEquity += retainedEarnings;
    }

    totalAssets = roundTo2(totalAssets);
    totalLiabilities = roundTo2(totalLiabilities);
    totalEquity = roundTo2(totalEquity);
    const liabilitiesAndEquity = roundTo2(totalLiabilities + totalEquity);

    return {
      asOfDate: asOfDate || new Date().toISOString(),
      assets,
      liabilities,
      equity,
      totals: {
        assets: totalAssets,
        liabilities: totalLiabilities,
        equity: totalEquity,
        liabilitiesAndEquity
      },
      isBalanced: Math.abs(totalAssets - liabilitiesAndEquity) <= 0.01
    };

  } catch (error) {
    console.error('Failed to generate Balance Sheet:', error);
    throw error;
  }
};
