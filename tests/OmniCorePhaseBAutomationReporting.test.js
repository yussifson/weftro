/**
 * Unit Tests for OmniCore Phase B:
 * Automation Rules & Scheduler, Reporting Capability, and Action Center Expansion.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AutomationEngine, logAutomationAuditRecord, isAutomationEnabled } from '../src/omnicore/automation/AutomationEngine.js';
import { AutomationScheduler } from '../src/omnicore/automation/AutomationScheduler.js';
import { OverdueInvoiceRule } from '../src/omnicore/automation/rules/OverdueInvoiceRule.js';
import { LowStockAlertRule } from '../src/omnicore/automation/rules/LowStockAlertRule.js';
import { CustomerOnboardingRule } from '../src/omnicore/automation/rules/CustomerOnboardingRule.js';
import { BusinessAutomation } from '../src/omnicore/automation/index.js';

import { Reporting } from '../src/omnicore/capabilities/Reporting.js';
import { Sales } from '../src/omnicore/capabilities/Sales.js';
import { Finance } from '../src/omnicore/capabilities/Finance.js';
import { Purchasing } from '../src/omnicore/capabilities/Purchasing.js';
import { Inventory } from '../src/omnicore/capabilities/Inventory.js';
import { Scheduling } from '../src/omnicore/capabilities/Scheduling.js';
import { HR } from '../src/omnicore/capabilities/HR.js';
import { CustomerManagement } from '../src/omnicore/capabilities/CustomerManagement.js';
import { BusinessCapabilities } from '../src/omnicore/capabilities/index.js';

import { ActionCenter } from '../src/omnicore/intelligence/ActionCenter.js';
import { TaskAdapter } from '../src/omnicore/core/TaskAdapter.js';
import { CustomerAdapter } from '../src/omnicore/core/CustomerAdapter.js';
import { supabase } from '../src/api/supabaseClient.js';

vi.mock('../src/api/supabaseClient.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [] }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null })
    }))
  }
}));

vi.mock('../src/omnicore/capabilities/Sales.js', () => ({
  Sales: { getSalesOverview: vi.fn() }
}));

vi.mock('../src/omnicore/capabilities/Finance.js', () => ({
  Finance: { getFinancialSummary: vi.fn(), getOutstandingInvoices: vi.fn() }
}));

vi.mock('../src/omnicore/capabilities/Purchasing.js', () => ({
  Purchasing: { getPurchasingOverview: vi.fn(), getReorderRecommendations: vi.fn() }
}));

vi.mock('../src/omnicore/capabilities/Inventory.js', () => ({
  Inventory: { getInventoryOverview: vi.fn(), getLowStockAlerts: vi.fn() }
}));

vi.mock('../src/omnicore/capabilities/Scheduling.js', () => ({
  Scheduling: { getScheduleOverview: vi.fn(), getUpcomingDeadlines: vi.fn() }
}));

vi.mock('../src/omnicore/capabilities/HR.js', () => ({
  HR: { getHROverview: vi.fn() }
}));

vi.mock('../src/omnicore/capabilities/CustomerManagement.js', () => ({
  CustomerManagement: { getCustomersOverview: vi.fn(), getCustomerActivityList: vi.fn() }
}));

vi.mock('../src/omnicore/intelligence/BusinessHealth.js', () => ({
  BusinessHealth: { evaluateHealth: vi.fn().mockResolvedValue({ dimensions: {} }) }
}));

vi.mock('../src/omnicore/intelligence/BusinessIntelligence.js', () => ({
  BusinessIntelligence: { getCustomerActivitySignals: vi.fn().mockResolvedValue({ inactiveCustomers: [] }) }
}));

vi.mock('../src/omnicore/core/TaskAdapter.js', () => ({
  TaskAdapter: { getTasks: vi.fn(), createTask: vi.fn() }
}));

vi.mock('../src/omnicore/core/CustomerAdapter.js', () => ({
  CustomerAdapter: { getCustomers: vi.fn() }
}));

describe('OmniCore Phase B: Automation & Reporting', () => {
  const testCompanyId = 'comp-phase-b-test';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════
  // 1. LOW-STOCK AUTOMATION RULE TESTS
  // ═══════════════════════════════════════════════════════════════
  describe('LowStockAlertRule', () => {
    it('generates reorder task candidates for items below threshold', () => {
      const context = {
        companyId: testCompanyId,
        lowStockAlerts: [
          { id: 'p-1', name: 'Widget A', sku: 'WID-A', stockQuantity: 2, reorderThreshold: 10, deficit: 8, supplier: 'Supplier One' },
          { id: 'p-2', name: 'Widget B', sku: 'WID-B', stockQuantity: 0, reorderThreshold: 15, deficit: 15, supplier: null }
        ],
        existingTasks: []
      };

      const matches = LowStockAlertRule.evaluate(context);
      expect(matches.length).toBe(2);

      expect(matches[0].candidateTask.title).toBe('Reorder Low-Stock Item: Widget A');
      expect(matches[0].candidateTask.priority).toBe('medium');
      expect(matches[0].alreadyActioned).toBe(false);

      expect(matches[1].candidateTask.title).toBe('Reorder Low-Stock Item: Widget B');
      expect(matches[1].candidateTask.priority).toBe('urgent'); // Stock = 0
    });

    it('identifies already actioned tasks to prevent duplicates', () => {
      const context = {
        companyId: testCompanyId,
        lowStockAlerts: [
          { id: 'p-1', name: 'Widget A', sku: 'WID-A', stockQuantity: 2, reorderThreshold: 10, deficit: 8 }
        ],
        existingTasks: [
          { id: 't-1', status: 'todo', metadata: { productId: 'p-1', ruleId: 'rule_low_stock_reorder_task' } }
        ]
      };

      const matches = LowStockAlertRule.evaluate(context);
      expect(matches.length).toBe(1);
      expect(matches[0].alreadyActioned).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. CUSTOMER ONBOARDING AUTOMATION RULE TESTS
  // ═══════════════════════════════════════════════════════════════
  describe('CustomerOnboardingRule', () => {
    it('generates onboarding task candidates for newly registered / lead customers', () => {
      const context = {
        companyId: testCompanyId,
        customers: [
          { id: 'c-1', name: 'Acme Corp', status: 'lead', email: 'contact@acme.com' },
          { id: 'c-2', name: 'Beta LLC', status: 'active', email: 'contact@beta.com' }
        ],
        existingTasks: []
      };

      const matches = CustomerOnboardingRule.evaluate(context);
      expect(matches.length).toBe(1); // Only c-1 (lead)
      expect(matches[0].candidateTask.title).toBe('Onboard New Customer: Acme Corp');
      expect(matches[0].candidateTask.priority).toBe('high');
      expect(matches[0].alreadyActioned).toBe(false);
    });

    it('skips onboarding task generation if an onboarding task already exists', () => {
      const context = {
        companyId: testCompanyId,
        customers: [
          { id: 'c-1', name: 'Acme Corp', status: 'lead', email: 'contact@acme.com' }
        ],
        existingTasks: [
          { id: 't-onboard', title: 'Onboard New Customer: Acme Corp', customerId: 'c-1' }
        ]
      };

      const matches = CustomerOnboardingRule.evaluate(context);
      expect(matches.length).toBe(1);
      expect(matches[0].alreadyActioned).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. AUTOMATION SCHEDULER TESTS
  // ═══════════════════════════════════════════════════════════════
  describe('AutomationScheduler', () => {
    it('defaults to dry-run mode and evaluates all active rules safely', async () => {
      Inventory.getLowStockAlerts.mockResolvedValueOnce([
        { id: 'p-1', name: 'Item 1', stockQuantity: 1, reorderThreshold: 5, deficit: 4 }
      ]);
      CustomerAdapter.getCustomers.mockResolvedValueOnce([
        { id: 'c-1', name: 'Client 1', status: 'lead' }
      ]);
      TaskAdapter.getTasks.mockResolvedValueOnce([]);

      const result = await AutomationScheduler.runScheduledAutomation(testCompanyId);
      expect(result.status).toBe('completed');
      expect(result.dryRun).toBe(true);
      expect(result.rulesEvaluated).toBe(3);
      expect(result.candidatesCount).toBeGreaterThanOrEqual(2);
      expect(result.executedActionsCount).toBe(0); // Dry-run executed 0
    });

    it('blocks live execution when automation_enabled is false for tenant', async () => {
      const result = await AutomationScheduler.runScheduledAutomation(testCompanyId, { dryRun: false });
      expect(result.status).toBe('blocked');
      expect(result.dryRun).toBe(false);
      expect(result.reason).toContain('disabled for this organization');
    });

    it('triggers circuit breaker when candidate action count exceeds maxActionsPerRun', async () => {
      // Create 10 low-stock items
      const manyItems = Array.from({ length: 10 }).map((_, i) => ({
        id: `p-${i}`,
        name: `Product ${i}`,
        stockQuantity: 1,
        reorderThreshold: 5,
        deficit: 4
      }));
      Inventory.getLowStockAlerts.mockResolvedValueOnce(manyItems);
      CustomerAdapter.getCustomers.mockResolvedValueOnce([]);
      TaskAdapter.getTasks.mockResolvedValueOnce([]);

      const result = await AutomationScheduler.runScheduledAutomation(testCompanyId, {
        dryRun: true,
        maxActionsPerRun: 5
      });

      expect(result.status).toBe('completed');
      expect(result.candidatesCount).toBe(10);
      expect(result.circuitBreakerTripped).toBe(true);
      expect(result.maxActionsPerRun).toBe(5);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. REPORTING CAPABILITY TESTS
  // ═══════════════════════════════════════════════════════════════
  describe('Reporting Capability', () => {
    it('generates weekly operations report with correct rollups', async () => {
      Sales.getSalesOverview.mockResolvedValueOnce({ totalRevenue: 15000 });
      Purchasing.getPurchasingOverview.mockResolvedValueOnce({ totalSpend: 5000 });
      Inventory.getLowStockAlerts.mockResolvedValueOnce([{ id: 'p-1' }, { id: 'p-2' }]);
      Scheduling.getScheduleOverview.mockResolvedValueOnce({ totalScheduled: 10, completedScheduled: 8 });
      HR.getHROverview.mockResolvedValueOnce({ activeHeadcount: 12 });

      const report = await Reporting.getWeeklyOperationsReport(testCompanyId);
      expect(report.reportType).toBe('weekly_operations');
      expect(report.summary.revenue).toBe(15000);
      expect(report.summary.supplierSpend).toBe(5000);
      expect(report.summary.netOperatingMargin).toBe(10000);
      expect(report.summary.activeHeadcount).toBe(12);
      expect(report.summary.totalTasksScheduled).toBe(10);
      expect(report.summary.taskCompletionRate).toBe(80); // 8 / 10 = 80%
      expect(report.summary.lowStockItemsCount).toBe(2);
    });

    it('generates financial executive report accurately', async () => {
      Sales.getSalesOverview.mockResolvedValueOnce({ totalRevenue: 100000, topCustomers: [{ customerId: 'c1', totalSpent: 50000 }] });
      Purchasing.getPurchasingOverview.mockResolvedValueOnce({ totalSpend: 40000 });
      Finance.getFinancialSummary.mockResolvedValueOnce({ totalAccountsReceivable: 25000 });

      const report = await Reporting.getFinancialExecutiveReport(testCompanyId);
      expect(report.reportType).toBe('financial_executive');
      expect(report.metrics.totalRevenue).toBe(100000);
      expect(report.metrics.totalExpenses).toBe(40000);
      expect(report.metrics.netProfit).toBe(60000);
      expect(report.metrics.profitMarginPercent).toBe(60); // 60k / 100k
      expect(report.metrics.totalAccountsReceivable).toBe(25000);
    });

    it('generates inventory valuation report accurately', async () => {
      Inventory.getInventoryOverview.mockResolvedValueOnce({ totalItems: 50, totalStockUnits: 500, totalInventoryValue: 75000 });
      Inventory.getLowStockAlerts.mockResolvedValueOnce([{ id: 'p1', deficit: 10 }, { id: 'p2', deficit: 5 }]);
      Purchasing.getReorderRecommendations.mockResolvedValueOnce({ totalEstimatedReorderSpend: 3200 });

      const report = await Reporting.getInventoryValuationReport(testCompanyId);
      expect(report.reportType).toBe('inventory_valuation');
      expect(report.metrics.totalSKUs).toBe(50);
      expect(report.metrics.totalStockUnits).toBe(500);
      expect(report.metrics.inventoryValuation).toBe(75000);
      expect(report.metrics.lowStockSKUsCount).toBe(2);
      expect(report.metrics.totalReorderDeficitUnits).toBe(15);
      expect(report.metrics.estimatedReorderSpend).toBe(3200);
    });

    it('formats reports into clean RFC 4180 CSV strings', () => {
      const mockWeeklyData = {
        companyId: testCompanyId,
        generatedAt: '2026-09-30T10:00:00.000Z',
        summary: {
          revenue: 25000,
          supplierSpend: 10000,
          netOperatingMargin: 15000,
          activeHeadcount: 5,
          totalTasksScheduled: 20,
          completedTasks: 18,
          taskCompletionRate: 90,
          lowStockItemsCount: 3
        }
      };

      const csv = Reporting.generateCSVExport('weekly_operations', mockWeeklyData);
      expect(csv).toContain('"Metric","Value"');
      expect(csv).toContain('"Total Revenue","25000"');
      expect(csv).toContain('"Net Operating Margin","15000"');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. EXPANDED ACTION CENTER TESTS
  // ═══════════════════════════════════════════════════════════════
  describe('Expanded ActionCenter', () => {
    it('includes low-stock alerts and operational deadlines in the unified feed', async () => {
      Finance.getOutstandingInvoices.mockResolvedValueOnce([]);
      CustomerManagement.getCustomersOverview.mockResolvedValueOnce({ totalCustomers: 0 });
      Inventory.getLowStockAlerts.mockResolvedValueOnce([
        { id: 'p-1', name: 'Critical Widget', sku: 'CRIT-1', stockQuantity: 0, reorderThreshold: 10, deficit: 10, supplier: 'Global Corp' }
      ]);
      Scheduling.getUpcomingDeadlines.mockResolvedValueOnce([
        { id: 't-1', title: 'Tax Return Filing', dueDate: '2026-10-01', assignedTo: 'Accountant A', priority: 'urgent' }
      ]);

      const feed = await ActionCenter.getActionCenterFeed(testCompanyId);
      expect(feed.summary.totalActions).toBe(2);
      expect(feed.summary.categories.inventory).toBe(1);
      expect(feed.summary.categories.operations).toBe(1);

      const invAction = feed.actions.find(a => a.category === 'inventory');
      expect(invAction.title).toBe('Low Stock: Critical Widget');
      expect(invAction.priority).toBe('high');

      const opAction = feed.actions.find(a => a.category === 'operations');
      expect(opAction.title).toBe('Approaching Deadline: Tax Return Filing');
      expect(opAction.priority).toBe('high');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 6. NAMESPACE & EXPORT VERIFICATION
  // ═══════════════════════════════════════════════════════════════
  describe('BusinessAutomation and Capabilities Namespace Verification', () => {
    it('verifies BusinessAutomation exports all 3 rules and Scheduler', () => {
      expect(BusinessAutomation.rules.length).toBe(3);
      expect(BusinessAutomation.Scheduler).toBe(AutomationScheduler);
      expect(BusinessAutomation.runScheduledAutomation).toBeDefined();
    });

    it('verifies BusinessCapabilities exports Reporting', () => {
      expect(BusinessCapabilities.capabilities.Reporting).toBe(Reporting);
      expect(Object.keys(BusinessCapabilities.capabilities).length).toBe(10);
    });
  });
});
