/**
 * FirmAccountingAPI.js
 * 
 * Production-grade Corporate & Firm Accounting API.
 * Manages Chart of Accounts (CoA), Double-Entry Journal Vouchers (JV),
 * Invoicing (AR), Bills Payable (AP), Fixed Assets & Depreciation, and Bank Reconciliation.
 */

import { powerSync } from '@/api/PowerSyncConnector';

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function getNowISO() {
  return new Date().toISOString();
}

export const FirmAccountingAPI = {
  // ────────────────────────────────────────────────────────
  // 1. CHART OF ACCOUNTS (CoA)
  // ────────────────────────────────────────────────────────

  async getAccounts(companyId) {
    try {
      const res = await powerSync.execute(
        'SELECT * FROM gl_accounts WHERE company_id = ? ORDER BY code ASC',
        [companyId]
      );
      const accounts = res.rows._array || Array.from(res.rows);
      if (accounts.length === 0) {
        // Initialize default corporate Chart of Accounts
        await this.initializeDefaultCoA(companyId);
        const initRes = await powerSync.execute(
          'SELECT * FROM gl_accounts WHERE company_id = ? ORDER BY code ASC',
          [companyId]
        );
        return initRes.rows._array || Array.from(initRes.rows);
      }
      return accounts;
    } catch (e) {
      console.error('[FirmAccountingAPI] getAccounts failed:', e);
      throw e;
    }
  },

  async createAccount(companyId, data) {
    try {
      const id = generateUUID();
      const now = getNowISO();
      await powerSync.execute(
        `INSERT INTO gl_accounts (id, company_id, code, name, type, parent_id, is_active, description, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.code, data.name, data.type, data.parent_id || null, 1, data.description || '', now, now]
      );
      return id;
    } catch (e) {
      console.error('[FirmAccountingAPI] createAccount failed:', e);
      throw e;
    }
  },

  async initializeDefaultCoA(companyId) {
    const defaultAccounts = [
      { code: '1000', name: 'Cash & Bank Operating Account', type: 'Asset' },
      { code: '1100', name: 'Accounts Receivable (AR)', type: 'Asset' },
      { code: '1200', name: 'Prepaid Expenses', type: 'Asset' },
      { code: '1500', name: 'Fixed Assets - Equipment & Tech', type: 'Asset' },
      { code: '2000', name: 'Accounts Payable (AP)', type: 'Liability' },
      { code: '2100', name: 'Accrued Expenses & Salaries', type: 'Liability' },
      { code: '2200', name: 'Tax Payable (VAT / PAYE)', type: 'Liability' },
      { code: '3000', name: 'Owner / Common Stock Equity', type: 'Equity' },
      { code: '3100', name: 'Retained Earnings', type: 'Equity' },
      { code: '4000', name: 'Professional Services Revenue', type: 'Revenue' },
      { code: '4100', name: 'Product & Retainer Revenue', type: 'Revenue' },
      { code: '5000', name: 'Salaries & Payroll Expense', type: 'Expense' },
      { code: '5100', name: 'Rent & Facility Expense', type: 'Expense' },
      { code: '5200', name: 'Utilities & Telecom Expense', type: 'Expense' },
      { code: '5300', name: 'Depreciation Expense', type: 'Expense' }
    ];

    for (const acc of defaultAccounts) {
      await this.createAccount(companyId, acc);
    }
  },

  // ────────────────────────────────────────────────────────
  // 2. DOUBLE-ENTRY JOURNAL VOUCHERS (JV)
  // ────────────────────────────────────────────────────────

  async postJournalEntry(companyId, { description, reference, entryDate, lineItems }, userId) {
    const totalDebit = lineItems.reduce((sum, item) => sum + (Number(item.debit) || 0), 0);
    const totalCredit = lineItems.reduce((sum, item) => sum + (Number(item.credit) || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(`Unbalanced Journal Entry! Total Debits ($${totalDebit.toFixed(2)}) must equal Total Credits ($${totalCredit.toFixed(2)})`);
    }

    try {
      const entryId = generateUUID();
      const now = getNowISO();
      const entryNumber = `JV-${Date.now().toString().slice(-6)}`;

      await powerSync.execute(
        `INSERT INTO gl_journal_entries (id, company_id, entry_number, entry_date, description, reference, posted_by, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [entryId, companyId, entryNumber, entryDate || now, description, reference || '', userId || 'system', 'posted', now, now]
      );

      for (const item of lineItems) {
        const itemId = generateUUID();
        await powerSync.execute(
          `INSERT INTO gl_journal_line_items (id, company_id, journal_entry_id, account_id, debit, credit, description, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [itemId, companyId, entryId, item.accountId, Number(item.debit) || 0, Number(item.credit) || 0, item.description || description, now]
        );
      }

      await powerSync.execute(
        `INSERT INTO gl_audit_trail (id, company_id, journal_entry_id, action, performed_by, performed_at, details)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [generateUUID(), companyId, entryId, 'POST', userId || 'system', now, `Posted JV ${entryNumber} total $${totalDebit.toFixed(2)}`]
      );

      return entryId;
    } catch (e) {
      console.error('[FirmAccountingAPI] postJournalEntry failed:', e);
      throw e;
    }
  },

  async getJournalEntries(companyId) {
    try {
      const entriesRes = await powerSync.execute(
        'SELECT * FROM gl_journal_entries WHERE company_id = ? ORDER BY entry_date DESC',
        [companyId]
      );
      const itemsRes = await powerSync.execute(
        'SELECT * FROM gl_journal_line_items WHERE company_id = ?',
        [companyId]
      );

      const entries = entriesRes.rows._array || Array.from(entriesRes.rows);
      const items = itemsRes.rows._array || Array.from(itemsRes.rows);

      return entries.map(entry => ({
        ...entry,
        lineItems: items.filter(i => i.journal_entry_id === entry.id)
      }));
    } catch (e) {
      console.error('[FirmAccountingAPI] getJournalEntries failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // 3. INVOICING & ACCOUNTS RECEIVABLE (AR)
  // ────────────────────────────────────────────────────────

  async getInvoices(companyId) {
    try {
      const res = await powerSync.execute(
        'SELECT * FROM univ_firm_invoices WHERE company_id = ? ORDER BY created_at DESC',
        [companyId]
      );
      const itemsRes = await powerSync.execute(
        'SELECT * FROM univ_firm_invoice_items WHERE company_id = ?',
        [companyId]
      );

      const invoices = res.rows._array || Array.from(res.rows);
      const items = itemsRes.rows._array || Array.from(itemsRes.rows);

      return invoices.map(inv => ({
        ...inv,
        items: items.filter(i => i.invoice_id === inv.id)
      }));
    } catch (e) {
      console.error('[FirmAccountingAPI] getInvoices failed:', e);
      throw e;
    }
  },

  async createInvoice(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = getNowISO();
      const invNum = `INV-${Date.now().toString().slice(-6)}`;

      let subtotal = 0;
      let taxAmount = 0;

      const itemsWithTotals = (data.items || []).map(item => {
        const lineTotal = (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0);
        const lineTax = lineTotal * ((Number(item.taxRate) || 0) / 100);
        subtotal += lineTotal;
        taxAmount += lineTax;
        return { ...item, total: lineTotal };
      });

      const totalAmount = subtotal + taxAmount - (Number(data.discountAmount) || 0);

      await powerSync.execute(
        `INSERT INTO univ_firm_invoices (id, company_id, invoice_number, customer_name, customer_email, issue_date, due_date, status, subtotal, tax_amount, discount_amount, total_amount, amount_paid, currency, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, invNum, data.customerName, data.customerEmail || '', data.issueDate || now, data.dueDate, 'sent', subtotal, taxAmount, Number(data.discountAmount) || 0, totalAmount, 0, data.currency || 'USD', data.notes || '', now, now]
      );

      for (const item of itemsWithTotals) {
        await powerSync.execute(
          `INSERT INTO univ_firm_invoice_items (id, company_id, invoice_id, description, quantity, unit_price, tax_rate, total)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [generateUUID(), companyId, id, item.description, item.quantity, item.unitPrice, item.taxRate || 0, item.total]
        );
      }

      // Auto-post GL Journal Voucher
      const accounts = await this.getAccounts(companyId);
      const arAcc = accounts.find(a => a.code === '1100') || accounts[0];
      const revAcc = accounts.find(a => a.code === '4000') || accounts[0];

      if (arAcc && revAcc) {
        await this.postJournalEntry(companyId, {
          description: `Invoice ${invNum} for ${data.customerName}`,
          reference: invNum,
          entryDate: data.issueDate || now,
          lineItems: [
            { accountId: arAcc.id, debit: totalAmount, credit: 0, description: `Invoice ${invNum}` },
            { accountId: revAcc.id, debit: 0, credit: totalAmount, description: `Revenue from Invoice ${invNum}` }
          ]
        }, userId);
      }

      return id;
    } catch (e) {
      console.error('[FirmAccountingAPI] createInvoice failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // 4. VENDOR BILLS & ACCOUNTS PAYABLE (AP)
  // ────────────────────────────────────────────────────────

  async getBills(companyId) {
    try {
      const res = await powerSync.execute(
        'SELECT * FROM univ_firm_bills WHERE company_id = ? ORDER BY created_at DESC',
        [companyId]
      );
      return res.rows._array || Array.from(res.rows);
    } catch (e) {
      console.error('[FirmAccountingAPI] getBills failed:', e);
      throw e;
    }
  },

  async createBill(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = getNowISO();
      const billNum = `BILL-${Date.now().toString().slice(-6)}`;

      let subtotal = 0;
      (data.items || []).forEach(item => {
        subtotal += (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0);
      });

      const totalAmount = subtotal + (Number(data.taxAmount) || 0);

      await powerSync.execute(
        `INSERT INTO univ_firm_bills (id, company_id, bill_number, vendor_name, vendor_email, issue_date, due_date, status, subtotal, tax_amount, total_amount, amount_paid, currency, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, billNum, data.vendorName, data.vendorEmail || '', data.issueDate || now, data.dueDate, 'approved', subtotal, Number(data.taxAmount) || 0, totalAmount, 0, data.currency || 'USD', data.notes || '', now, now]
      );

      // Auto-post GL Journal Voucher
      const accounts = await this.getAccounts(companyId);
      const expAcc = accounts.find(a => a.code === '5100') || accounts[0];
      const apAcc = accounts.find(a => a.code === '2000') || accounts[0];

      if (expAcc && apAcc) {
        await this.postJournalEntry(companyId, {
          description: `Vendor Bill ${billNum} from ${data.vendorName}`,
          reference: billNum,
          entryDate: data.issueDate || now,
          lineItems: [
            { accountId: expAcc.id, debit: totalAmount, credit: 0, description: `Expense for Bill ${billNum}` },
            { accountId: apAcc.id, debit: 0, credit: totalAmount, description: `AP Payable for Bill ${billNum}` }
          ]
        }, userId);
      }

      return id;
    } catch (e) {
      console.error('[FirmAccountingAPI] createBill failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // 5. FIXED ASSETS & DEPRECIATION
  // ────────────────────────────────────────────────────────

  async getFixedAssets(companyId) {
    try {
      const res = await powerSync.execute(
        'SELECT * FROM univ_firm_fixed_assets WHERE company_id = ? ORDER BY created_at DESC',
        [companyId]
      );
      return res.rows._array || Array.from(res.rows);
    } catch (e) {
      console.error('[FirmAccountingAPI] getFixedAssets failed:', e);
      throw e;
    }
  },

  async createFixedAsset(companyId, data) {
    try {
      const id = generateUUID();
      const now = getNowISO();
      const code = `AST-${Date.now().toString().slice(-4)}`;
      const cost = Number(data.purchaseCost) || 0;
      const salvage = Number(data.salvageValue) || 0;

      await powerSync.execute(
        `INSERT INTO univ_firm_fixed_assets (id, company_id, asset_name, asset_code, category, purchase_date, purchase_cost, salvage_value, useful_life_years, depreciation_method, accumulated_depreciation, net_book_value, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.assetName, code, data.category || 'Equipment', data.purchaseDate || now, cost, salvage, Number(data.usefulLifeYears) || 5, data.depreciationMethod || 'straight_line', 0, cost, 'active', now]
      );
      return id;
    } catch (e) {
      console.error('[FirmAccountingAPI] createFixedAsset failed:', e);
      throw e;
    }
  },

  async postAssetDepreciation(companyId, assetId, userId) {
    try {
      const res = await powerSync.execute(
        'SELECT * FROM univ_firm_fixed_assets WHERE id = ? AND company_id = ?',
        [assetId, companyId]
      );
      const asset = res.rows._array?.[0] || Array.from(res.rows)[0];
      if (!asset) throw new Error('Asset not found');

      const cost = Number(asset.purchase_cost);
      const salvage = Number(asset.salvage_value);
      const years = Number(asset.useful_life_years) || 5;

      const annualDep = (cost - salvage) / years;
      const monthlyDep = annualDep / 12;

      const newAccum = (Number(asset.accumulated_depreciation) || 0) + monthlyDep;
      const newBookValue = cost - newAccum;
      const now = getNowISO();

      await powerSync.execute(
        `UPDATE univ_firm_fixed_assets SET accumulated_depreciation = ?, net_book_value = ?, status = ? WHERE id = ?`,
        [newAccum, newBookValue, newBookValue <= salvage ? 'fully_depreciated' : 'active', assetId]
      );

      const accounts = await this.getAccounts(companyId);
      const depExpAcc = accounts.find(a => a.code === '5300') || accounts[0];
      const assetAcc = accounts.find(a => a.code === '1500') || accounts[0];

      if (depExpAcc && assetAcc) {
        await this.postJournalEntry(companyId, {
          description: `Monthly Depreciation for ${asset.asset_name}`,
          reference: asset.asset_code,
          entryDate: now,
          lineItems: [
            { accountId: depExpAcc.id, debit: monthlyDep, credit: 0, description: `Depreciation ${asset.asset_name}` },
            { accountId: assetAcc.id, debit: 0, credit: monthlyDep, description: `Accum. Depreciation ${asset.asset_name}` }
          ]
        }, userId);
      }

      return monthlyDep;
    } catch (e) {
      console.error('[FirmAccountingAPI] postAssetDepreciation failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // 6. BANK RECONCILIATION & STATEMENTS
  // ────────────────────────────────────────────────────────

  async getBankReconciliations(companyId) {
    try {
      const res = await powerSync.execute(
        'SELECT * FROM univ_firm_bank_reconciliations WHERE company_id = ? ORDER BY statement_date DESC',
        [companyId]
      );
      return res.rows._array || Array.from(res.rows);
    } catch (e) {
      console.error('[FirmAccountingAPI] getBankReconciliations failed:', e);
      throw e;
    }
  },

  async createBankReconciliation(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = getNowISO();
      const stmtBal = Number(data.statementBalance) || 0;
      const glBal = Number(data.glBalance) || 0;
      const diff = stmtBal - glBal;

      await powerSync.execute(
        `INSERT INTO univ_firm_bank_reconciliations (id, company_id, account_id, statement_date, statement_balance, gl_balance, difference, status, reconciled_by, reconciled_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.accountId, data.statementDate || now, stmtBal, glBal, diff, Math.abs(diff) < 0.01 ? 'reconciled' : 'in_progress', userId || 'system', now]
      );
      return id;
    } catch (e) {
      console.error('[FirmAccountingAPI] createBankReconciliation failed:', e);
      throw e;
    }
  }
};
