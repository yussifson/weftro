import { powerSync } from './PowerSyncConnector';

/**
 * Core General Ledger (GL) Engine API
 * Handles double-entry validation, journal entry posting, immutability enforcement, and entry reversals.
 */

export const ACCOUNT_TYPES = {
  ASSET: 'Asset',
  LIABILITY: 'Liability',
  EQUITY: 'Equity',
  REVENUE: 'Revenue',
  EXPENSE: 'Expense',
};

export const DEFAULT_CHART_OF_ACCOUNTS = [
  { code: '1000', name: 'Cash and Bank Equivalents', type: ACCOUNT_TYPES.ASSET },
  { code: '1100', name: 'Accounts Receivable', type: ACCOUNT_TYPES.ASSET },
  { code: '1200', name: 'Prepaid Expenses', type: ACCOUNT_TYPES.ASSET },
  { code: '1500', name: 'Fixed Assets & Equipment', type: ACCOUNT_TYPES.ASSET },
  { code: '2000', name: 'Accounts Payable', type: ACCOUNT_TYPES.LIABILITY },
  { code: '2100', name: 'Accrued Payroll & Statutory Liabilities', type: ACCOUNT_TYPES.LIABILITY },
  { code: '2200', name: 'Unearned Revenue / Client Deposits', type: ACCOUNT_TYPES.LIABILITY },
  { code: '3000', name: 'Owner / Common Stock Equity', type: ACCOUNT_TYPES.EQUITY },
  { code: '3100', name: 'Retained Earnings', type: ACCOUNT_TYPES.EQUITY },
  { code: '4000', name: 'Sales & Operating Revenue', type: ACCOUNT_TYPES.REVENUE },
  { code: '4100', name: 'Service & Fee Income', type: ACCOUNT_TYPES.REVENUE },
  { code: '5000', name: 'Salaries & Payroll Expenses', type: ACCOUNT_TYPES.EXPENSE },
  { code: '5100', name: 'Rent & Occupancy Expense', type: ACCOUNT_TYPES.EXPENSE },
  { code: '5200', name: 'Utilities & Office Expenses', type: ACCOUNT_TYPES.EXPENSE },
  { code: '5300', name: 'Professional & Legal Fees', type: ACCOUNT_TYPES.EXPENSE },
];

/**
 * Ensures a company has default accounts setup if empty.
 */
export async function seedDefaultAccountsIfEmpty(companyId) {
  if (!companyId) return;
  try {
    const res = await powerSync.execute('SELECT COUNT(*) as count FROM gl_accounts WHERE company_id = ?', [companyId]);
    const count = res.rows.item(0)?.count || 0;
    if (count === 0) {
      const now = new Date().toISOString();
      for (const acc of DEFAULT_CHART_OF_ACCOUNTS) {
        await powerSync.execute(
          `INSERT INTO gl_accounts (id, company_id, code, name, type, parent_id, is_active, description, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, NULL, 1, ?, ?, ?)`,
          [crypto.randomUUID(), companyId, acc.code, acc.name, acc.type, `Default ${acc.type} account`, now, now]
        );
      }
    }
  } catch (err) {
    console.error('[GLEngine] Seed default accounts error:', err);
  }
}

/**
 * Standard interface for posting a Journal Entry programmatically or via UI.
 * Enforces total debits = total credits validation before posting.
 *
 * @param {Object} params
 * @param {string} params.companyId
 * @param {string} [params.date]
 * @param {string} params.description
 * @param {string} [params.reference]
 * @param {string} [params.postedBy]
 * @param {Array<{ accountId: string, debit: number, credit: number, description?: string }>} params.lines
 */
export async function postJournalEntry({ companyId, date, description, reference, postedBy, lines }) {
  if (!companyId) throw new Error('Company ID is required to post journal entries.');
  if (!lines || lines.length < 2) throw new Error('Journal entries require at least 2 line items (debit and credit).');

  let totalDebit = 0;
  let totalCredit = 0;

  for (const line of lines) {
    const d = parseFloat(line.debit) || 0;
    const c = parseFloat(line.credit) || 0;
    if (d < 0 || c < 0) throw new Error('Debit and credit amounts cannot be negative.');
    if (d === 0 && c === 0) throw new Error('Line item must have a non-zero debit or credit amount.');
    totalDebit += d;
    totalCredit += c;
  }

  // Floating point rounding check (cents accuracy)
  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    throw new Error(`Unbalanced Journal Entry! Total Debits (${totalDebit.toFixed(2)}) must equal Total Credits (${totalCredit.toFixed(2)}).`);
  }

  const now = new Date().toISOString();
  const entryId = crypto.randomUUID();
  const entryDate = date || now.split('T')[0];
  const entryNumber = `JE-${Date.now()}`;

  await powerSync.writeTransaction(async (tx) => {
    // 1. Insert Journal Entry Header
    await tx.execute(
      `INSERT INTO gl_journal_entries (id, company_id, entry_number, entry_date, description, reference, posted_by, status, reversed_by_entry_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'posted', NULL, ?, ?)`,
      [entryId, companyId, entryNumber, entryDate, description, reference || '', postedBy || 'System', now, now]
    );

    // 2. Insert Line Items
    for (const line of lines) {
      await tx.execute(
        `INSERT INTO gl_journal_line_items (id, company_id, journal_entry_id, account_id, debit, credit, description, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
          companyId,
          entryId,
          line.accountId,
          parseFloat(line.debit) || 0,
          parseFloat(line.credit) || 0,
          line.description || description,
          now,
        ]
      );
    }

    // 3. Insert Audit Log
    await tx.execute(
      `INSERT INTO gl_audit_trail (id, company_id, journal_entry_id, action, performed_by, performed_at, details)
       VALUES (?, ?, ?, 'POST', ?, ?, ?)`,
      [
        crypto.randomUUID(),
        companyId,
        entryId,
        postedBy || 'System',
        now,
        `Posted Journal Entry ${entryNumber} with ${lines.length} lines (Total: ${totalDebit.toFixed(2)})`,
      ]
    );
  });

  return { entryId, entryNumber };
}

/**
 * Reverses a posted journal entry by generating an offsetting entry.
 * Immutability: original entry is updated to status='reversed', not deleted.
 */
export async function reverseJournalEntry({ companyId, originalEntryId, reversedBy, reason }) {
  if (!companyId || !originalEntryId) throw new Error('Company ID and Original Entry ID are required for reversal.');

  // Fetch original entry
  const entryRes = await powerSync.execute(
    'SELECT * FROM gl_journal_entries WHERE id = ? AND company_id = ?',
    [originalEntryId, companyId]
  );

  const originalEntry = entryRes.rows.item(0);
  if (!originalEntry) throw new Error('Original journal entry not found.');
  if (originalEntry.status === 'reversed') throw new Error('This journal entry has already been reversed.');

  // Fetch line items
  const linesRes = await powerSync.execute(
    'SELECT * FROM gl_journal_line_items WHERE journal_entry_id = ?',
    [originalEntryId]
  );

  const originalLines = [];
  for (let i = 0; i < linesRes.rows.length; i++) {
    originalLines.push(linesRes.rows.item(i));
  }

  if (originalLines.length === 0) throw new Error('No line items found for original journal entry.');

  // Build offsetting lines (swap debit and credit)
  const reversalLines = originalLines.map((line) => ({
    accountId: line.account_id,
    debit: line.credit, // Swap
    credit: line.debit, // Swap
    description: `Reversal of ${originalEntry.entry_number}: ${reason || 'Correction'}`,
  }));

  const now = new Date().toISOString();
  const reversalEntryNumber = `JE-REV-${Date.now()}`;
  const reversalEntryId = crypto.randomUUID();

  await powerSync.writeTransaction(async (tx) => {
    // 1. Create Reversal Journal Entry Header
    await tx.execute(
      `INSERT INTO gl_journal_entries (id, company_id, entry_number, entry_date, description, reference, posted_by, status, reversed_by_entry_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'posted', NULL, ?, ?)`,
      [
        reversalEntryId,
        companyId,
        reversalEntryNumber,
        now.split('T')[0],
        `Reversal of ${originalEntry.entry_number} - ${reason || 'No reason provided'}`,
        `REV-${originalEntry.entry_number}`,
        reversedBy || 'System',
        now,
        now,
      ]
    );

    // 2. Insert Swapped Line Items
    for (const line of reversalLines) {
      await tx.execute(
        `INSERT INTO gl_journal_line_items (id, company_id, journal_entry_id, account_id, debit, credit, description, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
          companyId,
          reversalEntryId,
          line.accountId,
          line.debit,
          line.credit,
          line.description,
          now,
        ]
      );
    }

    // 3. Mark Original Entry as Reversed
    await tx.execute(
      `UPDATE gl_journal_entries SET status = 'reversed', reversed_by_entry_id = ?, updated_at = ? WHERE id = ?`,
      [reversalEntryId, now, originalEntryId]
    );

    // 4. Record Audit Log
    await tx.execute(
      `INSERT INTO gl_audit_trail (id, company_id, journal_entry_id, action, performed_by, performed_at, details)
       VALUES (?, ?, ?, 'REVERSE', ?, ?, ?)`,
      [
        crypto.randomUUID(),
        companyId,
        originalEntryId,
        reversedBy || 'System',
        now,
        `Reversed Entry ${originalEntry.entry_number} via Reversal Entry ${reversalEntryNumber}. Reason: ${reason || 'N/A'}`,
      ]
    );
  });

  return { reversalEntryId, reversalEntryNumber };
}
