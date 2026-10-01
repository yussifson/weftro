/**
 * Unit Tests for OmniCore Business Intelligence & Health Layer (Phase 6/7)
 * 
 * Verifies the actual mathematical computation of revenue trends,
 * invoice receivable shifts, customer inactivity ratios, and health rollups.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BusinessIntelligence,
  BusinessHealth
} from '../src/omnicore/intelligence';
import { Finance } from '../src/omnicore/capabilities/Finance';
import { CustomerManagement } from '../src/omnicore/capabilities/CustomerManagement';
import { OmniCoreV2 } from '../src/omnicore';

vi.mock('../src/omnicore/capabilities/Finance', () => ({
  Finance: {
    getFinancialSummary: vi.fn()
  }
}));

vi.mock('../src/omnicore/capabilities/CustomerManagement', () => ({
  CustomerManagement: {
    getCustomerActivityList: vi.fn(),
    getCustomerProfile: vi.fn(),
    getCustomers: vi.fn()
  }
}));

describe('OmniCore Business Intelligence & Health Layer', () => {

  const mockCompanyId = 'comp-test-99';
  const baselineDate = '2026-09-29T12:00:00.000Z';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════
  // 1. REVENUE TREND MATHEMATICAL ASSERTIONS
  // ═══════════════════════════════════════════════════════════════
  describe('Revenue Trend Computations', () => {
    it('computes exact positive revenue growth (+18.5%) and generated explanation', async () => {
      Finance.getFinancialSummary
        // Current period: $11,850
        .mockResolvedValueOnce({
          revenueVsExpense: { totalRevenue: 11850, totalExpenses: 3000, netIncome: 8850 }
        })
        // Prior period: $10,000
        .mockResolvedValueOnce({
          revenueVsExpense: { totalRevenue: 10000, totalExpenses: 2500, netIncome: 7500 }
        });

      const trend = await BusinessIntelligence.getRevenueTrend(mockCompanyId, {
        periodDays: 30,
        referenceDate: baselineDate
      });

      expect(trend.currentRevenue).toBe(11850);
      expect(trend.priorRevenue).toBe(10000);
      expect(trend.absoluteChange).toBe(1850);
      // Math: (11850 - 10000) / 10000 * 100 = 18.5%
      expect(trend.percentageChange).toBe(18.5);
      expect(trend.direction).toBe('up');
      expect(trend.explanation).toBe(
        'Revenue increased 18.5% ($11,850 vs $10,000) compared to the prior 30 days.'
      );
    });

    it('computes exact revenue decline (-25.0%) and generated explanation', async () => {
      Finance.getFinancialSummary
        // Current: $7,500
        .mockResolvedValueOnce({
          revenueVsExpense: { totalRevenue: 7500, totalExpenses: 2000, netIncome: 5500 }
        })
        // Prior: $10,000
        .mockResolvedValueOnce({
          revenueVsExpense: { totalRevenue: 10000, totalExpenses: 2000, netIncome: 8000 }
        });

      const trend = await BusinessIntelligence.getRevenueTrend(mockCompanyId, {
        periodDays: 30,
        referenceDate: baselineDate
      });

      expect(trend.currentRevenue).toBe(7500);
      expect(trend.priorRevenue).toBe(10000);
      expect(trend.absoluteChange).toBe(-2500);
      // Math: (7500 - 10000) / 10000 * 100 = -25.0%
      expect(trend.percentageChange).toBe(-25.0);
      expect(trend.direction).toBe('down');
      expect(trend.explanation).toBe(
        'Revenue decreased 25% ($7,500 vs $10,000) compared to the prior 30 days.'
      );
    });

    it('handles zero prior revenue safely without Infinity or NaN', async () => {
      Finance.getFinancialSummary
        .mockResolvedValueOnce({ revenueVsExpense: { totalRevenue: 5000 } })
        .mockResolvedValueOnce({ revenueVsExpense: { totalRevenue: 0 } });

      const trend = await BusinessIntelligence.getRevenueTrend(mockCompanyId, {
        periodDays: 30,
        referenceDate: baselineDate
      });

      expect(trend.currentRevenue).toBe(5000);
      expect(trend.priorRevenue).toBe(0);
      expect(trend.percentageChange).toBe(100.0);
      expect(Number.isFinite(trend.percentageChange)).toBe(true);
      expect(Number.isNaN(trend.percentageChange)).toBe(false);
    });

    it('handles zero revenue in both periods safely without NaN', async () => {
      Finance.getFinancialSummary
        .mockResolvedValueOnce({ revenueVsExpense: { totalRevenue: 0 } })
        .mockResolvedValueOnce({ revenueVsExpense: { totalRevenue: 0 } });

      const trend = await BusinessIntelligence.getRevenueTrend(mockCompanyId, {
        periodDays: 30,
        referenceDate: baselineDate
      });

      expect(trend.percentageChange).toBe(0.0);
      expect(trend.direction).toBe('flat');
      expect(trend.explanation).toBe(
        'Revenue remained at $0 with no recorded transactions in the last 30 days.'
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. OUTSTANDING INVOICES TREND MATHEMATICAL ASSERTIONS
  // ═══════════════════════════════════════════════════════════════
  describe('Outstanding Invoices Trend Computations', () => {
    it('computes exact receivables increase (+27.3%) and count delta (+1)', async () => {
      Finance.getFinancialSummary
        // Current: $14,000 across 5 invoices
        .mockResolvedValueOnce({
          outstandingInvoices: { totalAmount: 14000, count: 5 }
        })
        // Prior: $11,000 across 4 invoices
        .mockResolvedValueOnce({
          outstandingInvoices: { totalAmount: 11000, count: 4 }
        });

      const trend = await BusinessIntelligence.getOutstandingInvoicesTrend(mockCompanyId, {
        periodDays: 30,
        referenceDate: baselineDate
      });

      expect(trend.currentTotal).toBe(14000);
      expect(trend.currentCount).toBe(5);
      expect(trend.priorTotal).toBe(11000);
      expect(trend.priorCount).toBe(4);
      expect(trend.amountChange).toBe(3000);
      expect(trend.countChange).toBe(1);
      // Math: (14000 - 11000) / 11000 * 100 = 27.2727... -> 27.3%
      expect(trend.percentageChange).toBe(27.3);
      expect(trend.explanation).toBe(
        'Outstanding invoices increased 27.3% ($14,000 across 5 invoices vs $11,000 across 4 invoices) compared to the prior 30 days.'
      );
    });

    it('computes exact receivables decrease (-50.0%)', async () => {
      Finance.getFinancialSummary
        .mockResolvedValueOnce({ outstandingInvoices: { totalAmount: 5000, count: 2 } })
        .mockResolvedValueOnce({ outstandingInvoices: { totalAmount: 10000, count: 4 } });

      const trend = await BusinessIntelligence.getOutstandingInvoicesTrend(mockCompanyId, {
        periodDays: 30,
        referenceDate: baselineDate
      });

      expect(trend.amountChange).toBe(-5000);
      expect(trend.percentageChange).toBe(-50.0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. CUSTOMER ACTIVITY SIGNAL MATHEMATICAL ASSERTIONS
  // ═══════════════════════════════════════════════════════════════
  describe('Customer Inactivity Signals', () => {
    it('identifies inactive customers and computes exact 30.0% inactivity ratio', async () => {
      // 10 customers total: 7 active within 60 days, 3 inactive (> 60 days or no activity)
      CustomerManagement.getCustomerActivityList.mockResolvedValueOnce([
        // Active (e.g. 5 days ago)
        { id: 'c1', name: 'Alpha', lastActivityDate: '2026-09-24T12:00:00.000Z' },
        { id: 'c2', name: 'Beta', lastActivityDate: '2026-09-20T12:00:00.000Z' },
        { id: 'c3', name: 'Gamma', lastActivityDate: '2026-09-15T12:00:00.000Z' },
        { id: 'c4', name: 'Delta', lastActivityDate: '2026-09-01T12:00:00.000Z' },
        { id: 'c5', name: 'Epsilon', lastActivityDate: '2026-08-20T12:00:00.000Z' },
        { id: 'c6', name: 'Zeta', lastActivityDate: '2026-08-10T12:00:00.000Z' },
        { id: 'c7', name: 'Eta', lastActivityDate: '2026-08-01T12:00:00.000Z' },
        // Inactive (> 60 days from 2026-09-29, i.e. before 2026-07-31)
        { id: 'c8', name: 'Theta', lastActivityDate: '2026-06-15T12:00:00.000Z' },
        { id: 'c9', name: 'Iota', lastActivityDate: '2026-05-01T12:00:00.000Z' },
        { id: 'c10', name: 'Kappa', lastActivityDate: null }
      ]);

      const signal = await BusinessIntelligence.getCustomerActivitySignals(mockCompanyId, {
        inactivityDays: 60,
        referenceDate: baselineDate
      });

      expect(signal.totalCustomers).toBe(10);
      expect(signal.activeCount).toBe(7);
      expect(signal.inactiveCount).toBe(3);
      // Math: (3 / 10) * 100 = 30.0%
      expect(signal.inactivePercentage).toBe(30.0);
      expect(signal.inactiveCustomers.map(c => c.customerId)).toEqual(['c8', 'c9', 'c10']);
      expect(signal.explanation).toBe(
        '3 out of 10 customers (30%) have had no transaction or invoice activity in the last 60 days.'
      );
    });

    it('handles zero customers gracefully', async () => {
      CustomerManagement.getCustomerActivityList.mockResolvedValueOnce([]);

      const signal = await BusinessIntelligence.getCustomerActivitySignals(mockCompanyId, {
        inactivityDays: 60,
        referenceDate: baselineDate
      });

      expect(signal.totalCustomers).toBe(0);
      expect(signal.activeCount).toBe(0);
      expect(signal.inactiveCount).toBe(0);
      expect(signal.inactivePercentage).toBe(0);
      expect(signal.explanation).toBe('No customers recorded for this organization.');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. BUSINESS HEALTH TRACEABLE INDICATORS
  // ═══════════════════════════════════════════════════════════════
  describe('Business Health Evaluation', () => {
    it('evaluates a healthy company with exact cited metrics', async () => {
      // Revenue +18.5%, Outstanding Invoices -50.0%
      Finance.getFinancialSummary.mockImplementation((cId, options) => {
        const isCurrent = new Date(options.startDate) > new Date('2026-08-15');
        if (isCurrent) {
          return Promise.resolve({
            revenueVsExpense: { totalRevenue: 11850 },
            outstandingInvoices: { totalAmount: 5000, count: 2 }
          });
        }
        return Promise.resolve({
          revenueVsExpense: { totalRevenue: 10000 },
          outstandingInvoices: { totalAmount: 10000, count: 4 }
        });
      });

      // 0 inactive customers
      CustomerManagement.getCustomerActivityList.mockResolvedValueOnce([
        { id: 'c1', name: 'Customer 1', lastActivityDate: '2026-09-25T12:00:00.000Z' },
        { id: 'c2', name: 'Customer 2', lastActivityDate: '2026-09-26T12:00:00.000Z' }
      ]);

      const health = await BusinessHealth.evaluateHealth(mockCompanyId, {
        referenceDate: baselineDate
      });

      expect(health.overallStatus).toBe('healthy');
      expect(health.dimensions.sales.status).toBe('healthy');
      expect(health.dimensions.sales.reason).toContain('increased 18.5% to $11,850');

      expect(health.dimensions.finance.status).toBe('healthy');
      expect(health.dimensions.finance.reason).toContain('decreased 50% ($5,000)');

      expect(health.dimensions.customers.status).toBe('healthy');
      expect(health.dimensions.customers.reason).toContain('0 out of 2 customers (0%) inactive');
    });

    it('evaluates attention status with exact cited numbers across dimensions', async () => {
      // Revenue declined -8.0%, Outstanding invoices surged +27.3%
      Finance.getFinancialSummary.mockImplementation((cId, options) => {
        const isCurrent = new Date(options.startDate) > new Date('2026-08-15');
        if (isCurrent) {
          return Promise.resolve({
            revenueVsExpense: { totalRevenue: 9200 },
            outstandingInvoices: { totalAmount: 14000, count: 5 }
          });
        }
        return Promise.resolve({
          revenueVsExpense: { totalRevenue: 10000 },
          outstandingInvoices: { totalAmount: 11000, count: 4 }
        });
      });

      // 3 of 10 inactive (30.0%)
      CustomerManagement.getCustomerActivityList.mockResolvedValueOnce([
        { id: 'c1', lastActivityDate: '2026-09-24T12:00:00.000Z' },
        { id: 'c2', lastActivityDate: '2026-09-24T12:00:00.000Z' },
        { id: 'c3', lastActivityDate: '2026-09-24T12:00:00.000Z' },
        { id: 'c4', lastActivityDate: '2026-09-24T12:00:00.000Z' },
        { id: 'c5', lastActivityDate: '2026-09-24T12:00:00.000Z' },
        { id: 'c6', lastActivityDate: '2026-09-24T12:00:00.000Z' },
        { id: 'c7', lastActivityDate: '2026-09-24T12:00:00.000Z' },
        { id: 'c8', lastActivityDate: '2026-05-01T12:00:00.000Z' },
        { id: 'c9', lastActivityDate: '2026-05-01T12:00:00.000Z' },
        { id: 'c10', lastActivityDate: null }
      ]);

      const health = await BusinessHealth.evaluateHealth(mockCompanyId, {
        referenceDate: baselineDate
      });

      expect(health.overallStatus).toBe('attention');
      expect(health.dimensions.sales.status).toBe('attention');
      expect(health.dimensions.sales.reason).toBe(
        'Sales: attention — revenue declined 8% ($9,200 vs $10,000) over the last 30 days.'
      );

      expect(health.dimensions.finance.status).toBe('attention');
      expect(health.dimensions.finance.reason).toBe(
        'Finance: attention — outstanding invoices increased 27.3% ($14,000 across 5 invoices vs $11,000) over the last 30 days.'
      );

      expect(health.dimensions.customers.status).toBe('attention');
      expect(health.dimensions.customers.reason).toBe(
        'Customers: attention — 3 out of 10 customers (30%) have had no activity in the last 60 days.'
      );
    });

    it('evaluates at-risk status with direct mathematical justification', async () => {
      // Revenue crashed -35.0%, Outstanding invoices spiked +80.0%
      Finance.getFinancialSummary.mockImplementation((cId, options) => {
        const isCurrent = new Date(options.startDate) > new Date('2026-08-15');
        if (isCurrent) {
          return Promise.resolve({
            revenueVsExpense: { totalRevenue: 6500 },
            outstandingInvoices: { totalAmount: 18000, count: 6 }
          });
        }
        return Promise.resolve({
          revenueVsExpense: { totalRevenue: 10000 },
          outstandingInvoices: { totalAmount: 10000, count: 3 }
        });
      });

      // 6 of 10 inactive (60.0%)
      CustomerManagement.getCustomerActivityList.mockResolvedValueOnce([
        { id: 'c1', lastActivityDate: '2026-09-24T12:00:00.000Z' },
        { id: 'c2', lastActivityDate: '2026-09-24T12:00:00.000Z' },
        { id: 'c3', lastActivityDate: '2026-09-24T12:00:00.000Z' },
        { id: 'c4', lastActivityDate: '2026-09-24T12:00:00.000Z' },
        { id: 'c5', lastActivityDate: '2026-05-01T12:00:00.000Z' },
        { id: 'c6', lastActivityDate: '2026-05-01T12:00:00.000Z' },
        { id: 'c7', lastActivityDate: '2026-05-01T12:00:00.000Z' },
        { id: 'c8', lastActivityDate: '2026-05-01T12:00:00.000Z' },
        { id: 'c9', lastActivityDate: '2026-05-01T12:00:00.000Z' },
        { id: 'c10', lastActivityDate: null }
      ]);

      const health = await BusinessHealth.evaluateHealth(mockCompanyId, {
        referenceDate: baselineDate
      });

      expect(health.overallStatus).toBe('at-risk');
      expect(health.dimensions.sales.status).toBe('at-risk');
      expect(health.dimensions.finance.status).toBe('at-risk');
      expect(health.dimensions.customers.status).toBe('at-risk');
      expect(health.dimensions.sales.reason).toContain('revenue dropped 35% ($6,500 vs $10,000)');
      expect(health.dimensions.finance.reason).toContain('outstanding invoices surged 80%');
      expect(health.dimensions.customers.reason).toContain('6 out of 10 customers (60%) have lapsed into inactivity');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. OMNICORE NAMESPACE INTEGRATION
  // ═══════════════════════════════════════════════════════════════
  describe('OmniCore V2 Architecture Integration', () => {
    it('is properly mounted in OmniCoreV2.BusinessIntelligence', () => {
      expect(OmniCoreV2.BusinessIntelligence).toBeDefined();
      expect(OmniCoreV2.BusinessIntelligence.layer).toBe('BusinessIntelligence');
      expect(typeof OmniCoreV2.BusinessIntelligence.getRevenueTrend).toBe('function');
      expect(typeof OmniCoreV2.BusinessIntelligence.evaluateHealth).toBe('function');
    });
  });
});
