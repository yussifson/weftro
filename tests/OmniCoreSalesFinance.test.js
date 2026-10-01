/**
 * Unit Tests for OmniCore Sales & Finance Capabilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Sales } from '../src/omnicore/capabilities/Sales';
import { Finance } from '../src/omnicore/capabilities/Finance';
import { CustomerManagement } from '../src/omnicore/capabilities/CustomerManagement';
import { CustomerAdapter } from '../src/omnicore/core/CustomerAdapter';
import { ProductAdapter } from '../src/omnicore/core/ProductAdapter';
import { TransactionAdapter } from '../src/omnicore/core/TransactionAdapter';
import { PaymentAdapter } from '../src/omnicore/core/PaymentAdapter';
import { InvoiceAdapter } from '../src/omnicore/core/InvoiceAdapter';
import { SupplierAdapter } from '../src/omnicore/core/SupplierAdapter';

vi.mock('../src/omnicore/core/CustomerAdapter', () => ({
  CustomerAdapter: {
    getCustomers: vi.fn()
  }
}));

vi.mock('../src/omnicore/core/ProductAdapter', () => ({
  ProductAdapter: {
    getProducts: vi.fn()
  }
}));

vi.mock('../src/omnicore/core/TransactionAdapter', () => ({
  TransactionAdapter: {
    getTransactions: vi.fn()
  }
}));

vi.mock('../src/omnicore/core/PaymentAdapter', () => ({
  PaymentAdapter: {
    getPayments: vi.fn()
  }
}));

vi.mock('../src/omnicore/core/InvoiceAdapter', () => ({
  InvoiceAdapter: {
    getInvoices: vi.fn()
  }
}));

vi.mock('../src/omnicore/core/SupplierAdapter', () => ({
  SupplierAdapter: {
    getSuppliers: vi.fn()
  }
}));

vi.mock('../src/omnicore/capabilities/CustomerManagement', () => ({
  CustomerManagement: {
    getCustomerProfile: vi.fn()
  }
}));

describe('OmniCore Sales & Finance Capabilities', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════
  // SALES CAPABILITY TESTS
  // ═══════════════════════════════════════════════════════════════
  describe('Sales Capability', () => {
    it('should return empty overview if companyId is missing', async () => {
      const overview = await Sales.getSalesOverview('');
      expect(overview).toEqual({
        totalRevenue: 0,
        totalTransactions: 0,
        recentTransactions: [],
        topCustomers: []
      });
    });

    it('should compose sales overview, computing total revenue and top customers', async () => {
      const compId = 'comp-sales-1';

      CustomerAdapter.getCustomers.mockResolvedValueOnce([
        { id: 'c-1', name: 'Alpha Inc', email: 'alpha@test.com' },
        { id: 'c-2', name: 'Beta LLC', email: 'beta@test.com' }
      ]);
      ProductAdapter.getProducts.mockResolvedValueOnce([]);

      TransactionAdapter.getTransactions.mockResolvedValueOnce([
        { id: 'tx-1', type: 'sale', amount: 500, date: '2026-09-01', metadata: { customerId: 'c-1' } },
        { id: 'tx-2', type: 'sale', amount: 300, date: '2026-09-02', metadata: { customerId: 'c-2' } }
      ]);

      PaymentAdapter.getPayments.mockResolvedValueOnce([
        { id: 'pay-1', amount: 200, paymentDate: '2026-09-03', paymentMethod: 'card', customerId: 'c-1' }
      ]);

      const overview = await Sales.getSalesOverview(compId);

      expect(overview.totalRevenue).toBe(1000); // 500 + 300 + 200
      expect(overview.totalTransactions).toBe(3);
      expect(overview.recentTransactions.length).toBe(3);
      expect(overview.topCustomers.length).toBe(2);
      expect(overview.topCustomers[0].customerId).toBe('c-1');
      expect(overview.topCustomers[0].totalSpent).toBe(700); // 500 + 200
    });

    it('should compose customer sales view correctly', async () => {
      const compId = 'comp-sales-1';
      const custId = 'c-1';

      CustomerManagement.getCustomerProfile.mockResolvedValueOnce({
        customer: { id: 'c-1', name: 'Alpha Inc' }
      });
      CustomerAdapter.getCustomers.mockResolvedValueOnce([
        { id: 'c-1', name: 'Alpha Inc' }
      ]);
      TransactionAdapter.getTransactions.mockResolvedValueOnce([
        { id: 'tx-1', type: 'sale', amount: 500, metadata: { customerId: 'c-1' } }
      ]);
      PaymentAdapter.getPayments.mockResolvedValueOnce([
        { id: 'pay-1', amount: 200, customerId: 'c-1' }
      ]);

      const view = await Sales.getCustomerSalesView(compId, custId);
      expect(view.customerProfile.id).toBe('c-1');
      expect(view.summary.totalSpent).toBe(700);
      expect(view.summary.transactionCount).toBe(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FINANCE CAPABILITY TESTS
  // ═══════════════════════════════════════════════════════════════
  describe('Finance Capability', () => {
    it('should return empty financial summary if companyId is missing', async () => {
      const summary = await Finance.getFinancialSummary(null);
      expect(summary).toEqual({
        outstandingInvoices: { totalAmount: 0, count: 0 },
        revenueVsExpense: { totalRevenue: 0, totalExpenses: 0, netIncome: 0 },
        cashFlow: { moneyIn: 0, moneyOut: 0, netCashFlow: 0 }
      });
    });

    it('should compose financial summary including outstanding invoices, revenue vs expense, and cash flow', async () => {
      const compId = 'comp-fin-1';

      InvoiceAdapter.getInvoices.mockResolvedValueOnce([
        { id: 'inv-1', totalAmount: 1000, status: 'unpaid' },
        { id: 'inv-2', totalAmount: 500, status: 'sent' },
        { id: 'inv-3', totalAmount: 2000, status: 'paid' }
      ]);

      PaymentAdapter.getPayments.mockResolvedValueOnce([
        { id: 'pay-1', amount: 800, status: 'paid' }
      ]);

      TransactionAdapter.getTransactions.mockResolvedValueOnce([
        { id: 'tx-1', type: 'sale', amount: 400 },
        { id: 'tx-2', type: 'expense', amount: 600 }
      ]);

      SupplierAdapter.getSuppliers.mockResolvedValueOnce([]);

      const summary = await Finance.getFinancialSummary(compId);

      // Outstanding invoices check (unpaid + sent = 1000 + 500 = 1500, count: 2)
      expect(summary.outstandingInvoices.totalAmount).toBe(1500);
      expect(summary.outstandingInvoices.count).toBe(2);

      // Revenue vs Expense check:
      // totalRevenue = paid invoices (2000) + paid payments (800) + sales (400) = 3200
      // totalExpenses = expense transactions (600)
      // netIncome = 3200 - 600 = 2600
      expect(summary.revenueVsExpense.totalRevenue).toBe(3200);
      expect(summary.revenueVsExpense.totalExpenses).toBe(600);
      expect(summary.revenueVsExpense.netIncome).toBe(2600);

      // Cash flow check:
      // moneyIn = paid payments (800) + paid invoices (2000) = 2800
      // moneyOut = expenses (600)
      // netCashFlow = 2800 - 600 = 2200
      expect(summary.cashFlow.moneyIn).toBe(2800);
      expect(summary.cashFlow.moneyOut).toBe(600);
      expect(summary.cashFlow.netCashFlow).toBe(2200);
    });

    it('should handle zero-data edge cases cleanly', async () => {
      const compId = 'comp-fin-empty';

      InvoiceAdapter.getInvoices.mockResolvedValueOnce([]);
      PaymentAdapter.getPayments.mockResolvedValueOnce([]);
      TransactionAdapter.getTransactions.mockResolvedValueOnce([]);
      SupplierAdapter.getSuppliers.mockResolvedValueOnce([]);

      const summary = await Finance.getFinancialSummary(compId);
      expect(summary.outstandingInvoices).toEqual({ totalAmount: 0, count: 0 });
      expect(summary.revenueVsExpense).toEqual({ totalRevenue: 0, totalExpenses: 0, netIncome: 0 });
      expect(summary.cashFlow).toEqual({ moneyIn: 0, moneyOut: 0, netCashFlow: 0 });
    });
  });

});
