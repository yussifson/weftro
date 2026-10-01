/**
 * Unit Tests for OmniCore Action Center (Phase 8)
 * 
 * Verifies the generation of actionable recommendations for overdue receivables,
 * inactive customer re-engagement, and health dimension alerts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActionCenter } from '../src/omnicore/intelligence/ActionCenter';
import { Finance } from '../src/omnicore/capabilities/Finance';
import { BusinessIntelligence } from '../src/omnicore/intelligence/BusinessIntelligence';
import { BusinessHealth } from '../src/omnicore/intelligence/BusinessHealth';
import { OmniCoreV2 } from '../src/omnicore';

vi.mock('../src/omnicore/capabilities/Finance', () => ({
  Finance: {
    getOutstandingInvoices: vi.fn(),
    getFinancialSummary: vi.fn()
  }
}));

vi.mock('../src/omnicore/intelligence/BusinessIntelligence', () => ({
  BusinessIntelligence: {
    getCustomerActivitySignals: vi.fn(),
    getRevenueTrend: vi.fn(),
    getOutstandingInvoicesTrend: vi.fn()
  }
}));

vi.mock('../src/omnicore/intelligence/BusinessHealth', () => ({
  BusinessHealth: {
    evaluateHealth: vi.fn()
  }
}));

vi.mock('../src/omnicore/capabilities/Inventory', () => ({
  Inventory: {
    getLowStockAlerts: vi.fn().mockResolvedValue([])
  }
}));

vi.mock('../src/omnicore/capabilities/Scheduling', () => ({
  Scheduling: {
    getUpcomingDeadlines: vi.fn().mockResolvedValue([])
  }
}));

describe('OmniCore Action Center', () => {

  const mockCompanyId = 'comp-tenant-action-1';
  const baselineDate = '2026-09-29T12:00:00.000Z';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════
  // 1. OVERDUE INVOICE ACTION ITEMS
  // ═══════════════════════════════════════════════════════════════
  describe('Overdue Invoice Action Items', () => {
    it('generates itemized action recommendations for overdue unpaid invoices with actual amounts and days', async () => {
      Finance.getOutstandingInvoices.mockResolvedValueOnce([
        // 45 days overdue (dueDate: 2026-08-15) -> high priority
        {
          id: 'inv-101',
          invoiceNumber: 'INV-2026-001',
          customerId: 'cust-1',
          customerName: 'Mega Corp',
          customerEmail: 'billing@megacorp.com',
          totalAmount: 4500,
          status: 'unpaid',
          dueDate: '2026-08-15T00:00:00.000Z'
        },
        // 19 days overdue (dueDate: 2026-09-10) -> medium priority
        {
          id: 'inv-102',
          invoiceNumber: 'INV-2026-002',
          customerId: 'cust-2',
          customerName: 'Nano Tech',
          customerEmail: 'finance@nanotech.io',
          totalAmount: 1200,
          status: 'sent',
          dueDate: '2026-09-10T00:00:00.000Z'
        },
        // Not overdue (dueDate: 2026-10-15) -> should not produce action
        {
          id: 'inv-103',
          invoiceNumber: 'INV-2026-003',
          customerId: 'cust-3',
          customerName: 'Future Soft',
          customerEmail: 'ap@futuresoft.com',
          totalAmount: 800,
          status: 'sent',
          dueDate: '2026-10-15T00:00:00.000Z'
        }
      ]);

      const actions = await ActionCenter.getOverdueInvoiceActions(mockCompanyId, {
        referenceDate: baselineDate
      });

      expect(actions.length).toBe(2);

      // Verify first action (most overdue, high priority)
      const action1 = actions[0];
      expect(action1.id).toBe('action-inv-inv-101');
      expect(action1.category).toBe('invoices');
      expect(action1.priority).toBe('high');
      expect(action1.title).toBe('Overdue Invoice #INV-2026-001');
      expect(action1.backingData.invoiceId).toBe('inv-101');
      expect(action1.backingData.amount).toBe(4500);
      expect(action1.backingData.daysOverdue).toBe(45);
      expect(action1.backingData.customerName).toBe('Mega Corp');
      expect(action1.explanation).toBe(
        'Invoice #INV-2026-001 for Mega Corp ($4,500) is 45 days overdue.'
      );
      expect(action1.recommendedAction).toBe(
        'Send payment reminder to Mega Corp for $4,500 (Invoice #INV-2026-001).'
      );

      // Verify second action (medium priority)
      const action2 = actions[1];
      expect(action2.id).toBe('action-inv-inv-102');
      expect(action2.priority).toBe('medium');
      expect(action2.backingData.daysOverdue).toBe(19);
      expect(action2.backingData.amount).toBe(1200);
    });

    it('returns empty list when no invoices are overdue', async () => {
      Finance.getOutstandingInvoices.mockResolvedValueOnce([
        {
          id: 'inv-clean',
          invoiceNumber: 'INV-CLEAN',
          totalAmount: 500,
          dueDate: '2026-10-30T00:00:00.000Z'
        }
      ]);

      const actions = await ActionCenter.getOverdueInvoiceActions(mockCompanyId, {
        referenceDate: baselineDate
      });

      expect(actions).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. CUSTOMER FOLLOW-UP ACTION ITEMS
  // ═══════════════════════════════════════════════════════════════
  describe('Customer Follow-Up Actions', () => {
    it('generates itemized follow-up actions for dormant customers citing contact info and historical spend', async () => {
      BusinessIntelligence.getCustomerActivitySignals.mockResolvedValueOnce({
        totalCustomers: 5,
        activeCount: 3,
        inactiveCount: 2,
        inactivePercentage: 40.0,
        inactivityDaysThreshold: 60,
        inactiveCustomers: [
          {
            customerId: 'c-101',
            name: 'Acme Supplies',
            email: 'procurement@acme.com',
            phone: '+1-555-0101',
            lastActivityDate: '2026-06-25T12:00:00.000Z',
            daysSinceLastActivity: 96,
            totalSpent: 18500
          },
          {
            customerId: 'c-102',
            name: 'Beta Hardware',
            email: 'owner@betahardware.com',
            phone: null,
            lastActivityDate: '2026-07-25T12:00:00.000Z',
            daysSinceLastActivity: 66,
            totalSpent: 3200
          }
        ]
      });

      const actions = await ActionCenter.getCustomerFollowUpActions(mockCompanyId, {
        inactivityDays: 60,
        referenceDate: baselineDate
      });

      expect(actions.length).toBe(2);

      // Verify Action 1 (96 days inactive -> high priority)
      const action1 = actions[0];
      expect(action1.id).toBe('action-cust-c-101');
      expect(action1.category).toBe('customers');
      expect(action1.priority).toBe('high');
      expect(action1.title).toBe('Re-engage Inactive Customer: Acme Supplies');
      expect(action1.backingData.customerId).toBe('c-101');
      expect(action1.backingData.daysInactive).toBe(96);
      expect(action1.backingData.totalHistoricalSpent).toBe(18500);
      expect(action1.explanation).toContain('no recorded transaction or invoice activity for 96 days');
      expect(action1.explanation).toContain('total historical spend: $18,500');
      expect(action1.recommendedAction).toBe(
        'Reach out to Acme Supplies (procurement@acme.com) with a personalized check-in or re-engagement offer.'
      );

      // Verify Action 2 (66 days inactive -> medium priority)
      const action2 = actions[1];
      expect(action2.id).toBe('action-cust-c-102');
      expect(action2.priority).toBe('medium');
      expect(action2.backingData.daysInactive).toBe(66);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. HEALTH-DRIVEN ALERT ACTION ITEMS
  // ═══════════════════════════════════════════════════════════════
  describe('Health-Driven Dimension Alerts', () => {
    it('generates alert actions for dimensions requiring attention or at-risk reusing traceable reason strings', async () => {
      BusinessHealth.evaluateHealth.mockResolvedValueOnce({
        overallStatus: 'at-risk',
        dimensions: {
          sales: {
            status: 'attention',
            reason: 'Sales: attention — revenue declined 8% ($9,200 vs $10,000) over the last 30 days.',
            metrics: { currentRevenue: 9200, priorRevenue: 10000, percentageChange: -8.0 }
          },
          finance: {
            status: 'at-risk',
            reason: 'Finance: at-risk — outstanding invoices surged 60% ($16,000 vs $10,000) over the last 30 days.',
            metrics: { currentOutstanding: 16000, priorOutstanding: 10000, percentageChange: 60.0 }
          },
          customers: {
            status: 'healthy',
            reason: 'Customers: healthy — 0 out of 5 customers (0%) inactive over the last 60 days.',
            metrics: { totalCustomers: 5, activeCount: 5, inactiveCount: 0 }
          }
        }
      });

      const alerts = await ActionCenter.getHealthAlertActions(mockCompanyId, {
        referenceDate: baselineDate
      });

      // Customers is healthy, so only Sales and Finance alerts generated
      expect(alerts.length).toBe(2);

      const salesAlert = alerts.find(a => a.id === 'action-health-sales');
      expect(salesAlert).toBeDefined();
      expect(salesAlert.category).toBe('health');
      expect(salesAlert.priority).toBe('medium');
      expect(salesAlert.title).toBe('SALES Dimension Alert: ATTENTION');
      expect(salesAlert.explanation).toBe(
        'Sales: attention — revenue declined 8% ($9,200 vs $10,000) over the last 30 days.'
      );
      expect(salesAlert.recommendedAction).toContain('Review sales pipeline');

      const financeAlert = alerts.find(a => a.id === 'action-health-finance');
      expect(financeAlert).toBeDefined();
      expect(financeAlert.priority).toBe('high');
      expect(financeAlert.title).toBe('FINANCE Dimension Alert: AT-RISK');
      expect(financeAlert.explanation).toBe(
        'Finance: at-risk — outstanding invoices surged 60% ($16,000 vs $10,000) over the last 30 days.'
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. UNIFIED ACTION CENTER FEED & ROLLUP
  // ═══════════════════════════════════════════════════════════════
  describe('Unified Action Center Feed', () => {
    it('composes all categories into a prioritized feed with exact category breakdowns', async () => {
      // 1 overdue invoice (high)
      Finance.getOutstandingInvoices.mockResolvedValueOnce([
        {
          id: 'inv-1',
          invoiceNumber: 'INV-1',
          customerId: 'c-1',
          customerName: 'Alpha Corp',
          totalAmount: 10000,
          dueDate: '2026-08-01T00:00:00.000Z'
        }
      ]);

      // 1 inactive customer (medium)
      BusinessIntelligence.getCustomerActivitySignals.mockResolvedValueOnce({
        totalCustomers: 10,
        activeCount: 9,
        inactiveCount: 1,
        inactivePercentage: 10.0,
        inactiveCustomers: [
          {
            customerId: 'c-99',
            name: 'Dormant Client',
            email: 'client@example.com',
            daysSinceLastActivity: 65,
            totalSpent: 500
          }
        ]
      });

      // 1 health alert (at-risk -> high)
      BusinessHealth.evaluateHealth.mockResolvedValueOnce({
        overallStatus: 'at-risk',
        dimensions: {
          sales: { status: 'at-risk', reason: 'Sales at risk', metrics: {} },
          finance: { status: 'healthy', reason: 'Finance healthy', metrics: {} },
          customers: { status: 'healthy', reason: 'Customers healthy', metrics: {} }
        }
      });

      const feed = await ActionCenter.getActionCenterFeed(mockCompanyId, {
        referenceDate: baselineDate
      });

      expect(feed.companyId).toBe(mockCompanyId);
      expect(feed.summary.totalActions).toBe(3);
      expect(feed.summary.highPriorityCount).toBe(2); // inv-1 + sales health
      expect(feed.summary.mediumPriorityCount).toBe(1); // dormant customer
      expect(feed.summary.lowPriorityCount).toBe(0);

      expect(feed.summary.categories).toMatchObject({
        invoices: 1,
        customers: 1,
        health: 1
      });

      // High priority actions must come before medium
      expect(feed.actions[0].priority).toBe('high');
      expect(feed.actions[1].priority).toBe('high');
      expect(feed.actions[2].priority).toBe('medium');
    });

    it('returns a clean empty action list when company has zero issues', async () => {
      Finance.getOutstandingInvoices.mockResolvedValueOnce([]);
      BusinessIntelligence.getCustomerActivitySignals.mockResolvedValueOnce({
        totalCustomers: 5,
        activeCount: 5,
        inactiveCount: 0,
        inactiveCustomers: []
      });
      BusinessHealth.evaluateHealth.mockResolvedValueOnce({
        overallStatus: 'healthy',
        dimensions: {
          sales: { status: 'healthy', reason: 'Sales healthy', metrics: {} },
          finance: { status: 'healthy', reason: 'Finance healthy', metrics: {} },
          customers: { status: 'healthy', reason: 'Customers healthy', metrics: {} }
        }
      });

      const feed = await ActionCenter.getActionCenterFeed(mockCompanyId, {
        referenceDate: baselineDate
      });

      expect(feed.summary.totalActions).toBe(0);
      expect(feed.summary.highPriorityCount).toBe(0);
      expect(feed.actions).toEqual([]);
    });

    it('handles missing companyId safely with empty response', async () => {
      const feed = await ActionCenter.getActionCenterFeed('');
      expect(feed.companyId).toBeNull();
      expect(feed.summary.totalActions).toBe(0);
      expect(feed.actions).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. OMNICORE V2 ARCHITECTURE INTEGRATION
  // ═══════════════════════════════════════════════════════════════
  describe('OmniCore V2 Architecture Integration', () => {
    it('is properly mounted in OmniCoreV2.BusinessIntelligence.ActionCenter', () => {
      expect(OmniCoreV2.BusinessIntelligence.ActionCenter).toBeDefined();
      expect(OmniCoreV2.BusinessIntelligence.ActionCenter.layer).toBe('ActionCenter');
      expect(typeof OmniCoreV2.BusinessIntelligence.ActionCenter.getActionCenterFeed).toBe('function');
    });
  });
});
