/**
 * Unit Tests for OmniCore Core Adapters Round 2 (Product, Supplier, Transaction, Payment)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductAdapter } from '../src/omnicore/core/ProductAdapter';
import { SupplierAdapter } from '../src/omnicore/core/SupplierAdapter';
import { TransactionAdapter } from '../src/omnicore/core/TransactionAdapter';
import { PaymentAdapter } from '../src/omnicore/core/PaymentAdapter';
import { base44 } from '../src/api/base44Client';
import { powerSync } from '../src/api/PowerSyncConnector';

vi.mock('../src/api/base44Client', () => ({
  base44: {
    entities: {
      TimeEntry: {
        filter: vi.fn(),
        create: vi.fn()
      },
      Expense: {
        filter: vi.fn(),
        create: vi.fn()
      },
      JournalEntry: {
        filter: vi.fn(),
        create: vi.fn()
      },
      SubscriptionInvoice: {
        filter: vi.fn(),
        create: vi.fn()
      },
      Retainer: {
        filter: vi.fn(),
        create: vi.fn()
      }
    }
  }
}));

vi.mock('../src/api/PowerSyncConnector', () => ({
  powerSync: {
    execute: vi.fn()
  }
}));

describe('OmniCore Business Core Adapters - Round 2', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════
  // PRODUCT ADAPTER TESTS
  // ═══════════════════════════════════════════════════════════════
  describe('ProductAdapter', () => {
    it('should return empty array if companyId is missing', async () => {
      const res = await ProductAdapter.getProducts('');
      expect(res).toEqual([]);
    });

    it('should fetch and normalize product records from retail, pharmacy, and time_entries', async () => {
      powerSync.execute
        .mockResolvedValueOnce({ rows: { _array: [{ id: 'p-1', company_id: 'comp-1', name: 'Widget A', price: 50, stock_quantity: 10 }] } })
        .mockResolvedValueOnce({ rows: { _array: [{ id: 'd-1', company_id: 'comp-1', brand_name: 'Aspirin', price: 10, stock_quantity: 100 }] } });

      base44.entities.TimeEntry.filter.mockResolvedValueOnce([
        { id: 'te-1', company_id: 'comp-1', description: 'Legal Consult', hours: 2, hourly_rate: 150 }
      ]);

      const products = await ProductAdapter.getProducts('comp-1');
      expect(products.length).toBe(3);
      expect(products[0].sourceTable).toBe('univ_retail_products');
      expect(products[0].price).toBe(50);
      expect(products[1].sourceTable).toBe('univ_pharmacy_drugs');
      expect(products[1].name).toBe('Aspirin');
      expect(products[2].sourceTable).toBe('time_entries');
      expect(products[2].price).toBe(300);
    });

    it('should throw explicit not-implemented error when calling createProduct', async () => {
      await expect(ProductAdapter.createProduct('comp-1', { name: 'New Product' })).rejects.toThrow(
        /Direct physical product creation via base44 ORM is not implemented/
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SUPPLIER ADAPTER TESTS
  // ═══════════════════════════════════════════════════════════════
  describe('SupplierAdapter', () => {
    it('should return empty array if companyId is missing', async () => {
      const res = await SupplierAdapter.getSuppliers(null);
      expect(res).toEqual([]);
    });

    it('should fetch and normalize suppliers from retail, pharmacy, and expenses', async () => {
      powerSync.execute
        .mockResolvedValueOnce({ rows: { _array: [{ id: 'sup-1', company_id: 'comp-1', name: 'Global Supply Co', email: 'sup@global.com' }] } })
        .mockResolvedValueOnce({ rows: { _array: [] } });

      base44.entities.Expense.filter.mockResolvedValueOnce([
        { id: 'exp-1', company_id: 'comp-1', vendor: 'Office Depot', category: 'Supplies' }
      ]);

      const suppliers = await SupplierAdapter.getSuppliers('comp-1');
      expect(suppliers.length).toBe(2);
      expect(suppliers[0].name).toBe('Global Supply Co');
      expect(suppliers[1].name).toBe('Office Depot');
    });

    it('should throw explicit not-implemented error when calling createSupplier', async () => {
      await expect(SupplierAdapter.createSupplier('comp-1', { name: 'Acme Hardware' })).rejects.toThrow(
        /Direct supplier entity creation via base44 ORM is not implemented/
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TRANSACTION ADAPTER TESTS
  // ═══════════════════════════════════════════════════════════════
  describe('TransactionAdapter', () => {
    it('should return empty array if companyId is missing', async () => {
      const res = await TransactionAdapter.getTransactions('');
      expect(res).toEqual([]);
    });

    it('should fetch and normalize transactions from journal_entries, expenses, and retail sales', async () => {
      base44.entities.JournalEntry.filter.mockResolvedValueOnce([
        { id: 'je-1', company_id: 'comp-1', type: 'journal_entry', amount: 1200, description: 'Payroll Accrual' }
      ]);
      base44.entities.Expense.filter.mockResolvedValueOnce([
        { id: 'exp-1', company_id: 'comp-1', amount: 150, vendor: 'Software SaaS' }
      ]);
      powerSync.execute.mockResolvedValueOnce({ rows: { _array: [{ id: 'sal-1', company_id: 'comp-1', total_amount: 80, receipt_number: 'REC-001' }] } });

      const transactions = await TransactionAdapter.getTransactions('comp-1');
      expect(transactions.length).toBe(3);
      expect(transactions[0].sourceTable).toBe('journal_entries');
      expect(transactions[0].amount).toBe(1200);
      expect(transactions[1].sourceTable).toBe('expenses');
      expect(transactions[1].amount).toBe(150);
      expect(transactions[2].sourceTable).toBe('univ_retail_sales');
      expect(transactions[2].amount).toBe(80);
    });

    it('should route createTransaction through base44 JournalEntry entity', async () => {
      base44.entities.JournalEntry.create.mockResolvedValueOnce({ id: 'je-new', amount: 500 });

      const created = await TransactionAdapter.createTransaction('comp-1', { description: 'Office Rent', amount: 500 });
      expect(base44.entities.JournalEntry.create).toHaveBeenCalledWith({
        company_id: 'comp-1',
        description: 'Office Rent',
        amount: 500,
        entry_date: expect.any(String),
        status: 'posted'
      });
      expect(created.id).toBe('je-new');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PAYMENT ADAPTER TESTS
  // ═══════════════════════════════════════════════════════════════
  describe('PaymentAdapter', () => {
    it('should return empty array if companyId is missing', async () => {
      const res = await PaymentAdapter.getPayments(undefined);
      expect(res).toEqual([]);
    });

    it('should fetch and normalize payments from subscription_invoices, retainers, and retail sales', async () => {
      base44.entities.SubscriptionInvoice.filter.mockResolvedValueOnce([
        { id: 'sub-1', company_id: 'comp-1', amount_paid: 299, payment_method: 'stripe' }
      ]);
      base44.entities.Retainer.filter.mockResolvedValueOnce([
        { id: 'ret-1', company_id: 'comp-1', amount: 1500, client_id: 'cli-1', payment_method: 'wire' }
      ]);
      powerSync.execute.mockResolvedValueOnce({ rows: { _array: [{ id: 'sal-1', company_id: 'comp-1', total_amount: 45, payment_method: 'cash' }] } });

      const payments = await PaymentAdapter.getPayments('comp-1');
      expect(payments.length).toBe(3);
      expect(payments[0].sourceTable).toBe('subscription_invoices');
      expect(payments[0].amount).toBe(299);
      expect(payments[1].sourceTable).toBe('retainers');
      expect(payments[1].amount).toBe(1500);
      expect(payments[2].sourceTable).toBe('univ_retail_sales');
      expect(payments[2].amount).toBe(45);
    });

    it('should throw explicit not-implemented error when calling createPayment', async () => {
      await expect(PaymentAdapter.createPayment('comp-1', { amount: 1000 })).rejects.toThrow(
        /Direct general payment creation via base44 ORM is not implemented/
      );
    });
  });

});
