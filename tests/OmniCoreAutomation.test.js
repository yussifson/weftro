/**
 * Unit Tests for OmniCore Automation Engine (Phase 9)
 * 
 * Verifies rule evaluation, safety gating (automation_enabled),
 * RBAC task writes, idempotency against duplicate task generation, and audit logging.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BusinessAutomation,
  AutomationEngine,
  OverdueInvoiceRule,
  isAutomationEnabled
} from '../src/omnicore/automation';
import { ActionCenter } from '../src/omnicore/intelligence/ActionCenter';
import { TaskAdapter } from '../src/omnicore/core/TaskAdapter';
import { supabase } from '../src/api/supabaseClient';
import { OmniCoreV2 } from '../src/omnicore';

vi.mock('../src/omnicore/intelligence/ActionCenter', () => ({
  ActionCenter: {
    getOverdueInvoiceActions: vi.fn()
  }
}));

vi.mock('../src/omnicore/core/TaskAdapter', () => ({
  TaskAdapter: {
    getTasks: vi.fn(),
    createTask: vi.fn()
  }
}));

vi.mock('../src/omnicore/capabilities/Inventory', () => ({
  Inventory: {
    getLowStockAlerts: vi.fn().mockResolvedValue([])
  }
}));

vi.mock('../src/omnicore/core/CustomerAdapter', () => ({
  CustomerAdapter: {
    getCustomers: vi.fn().mockResolvedValue([])
  }
}));

vi.mock('../src/api/supabaseClient', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('OmniCore Automation Engine', () => {

  const mockCompanyId = 'comp-auto-100';
  const baselineDate = '2026-09-29T12:00:00.000Z';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════
  // 1. RULE EVALUATION (OverdueInvoiceRule)
  // ═══════════════════════════════════════════════════════════════
  describe('OverdueInvoiceRule Evaluation', () => {
    it('matches when invoice is overdue > 14 days and generates candidate task', () => {
      const context = {
        companyId: mockCompanyId,
        overdueInvoices: [
          {
            backingData: {
              invoiceId: 'inv-1',
              invoiceNumber: 'INV-1001',
              customerId: 'cust-1',
              customerName: 'Alpha Corp',
              amount: 5000,
              daysOverdue: 20
            }
          },
          {
            backingData: {
              invoiceId: 'inv-2',
              invoiceNumber: 'INV-1002',
              customerId: 'cust-2',
              customerName: 'Beta LLC',
              amount: 1500,
              daysOverdue: 10 // <= 14 days, should not match
            }
          }
        ],
        existingTasks: []
      };

      const matches = OverdueInvoiceRule.evaluate(context);

      expect(matches.length).toBe(1);
      expect(matches[0].ruleId).toBe('rule_overdue_invoice_followup');
      expect(matches[0].conditionMet).toBe(true);
      expect(matches[0].triggerData.invoiceNumber).toBe('INV-1001');
      expect(matches[0].triggerData.daysOverdue).toBe(20);
      expect(matches[0].candidateTask.title).toBe('Follow up on overdue invoice #INV-1001');
      expect(matches[0].candidateTask.priority).toBe('medium');
      expect(matches[0].alreadyActioned).toBe(false);
    });

    it('sets high priority on candidate task if overdue >= 30 days', () => {
      const context = {
        companyId: mockCompanyId,
        overdueInvoices: [
          {
            backingData: {
              invoiceId: 'inv-urgent',
              invoiceNumber: 'INV-9999',
              amount: 12000,
              daysOverdue: 45
            }
          }
        ],
        existingTasks: []
      };

      const matches = OverdueInvoiceRule.evaluate(context);
      expect(matches.length).toBe(1);
      expect(matches[0].candidateTask.priority).toBe('high');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. DRY-RUN EVALUATION (evaluateRules)
  // ═══════════════════════════════════════════════════════════════
  describe('Dry-Run Evaluation (evaluateRules)', () => {
    it('reports candidate actions in dry-run mode with ZERO writes to TaskAdapter', async () => {
      ActionCenter.getOverdueInvoiceActions.mockResolvedValueOnce([
        {
          backingData: {
            invoiceId: 'inv-dry-1',
            invoiceNumber: 'INV-DRY-1',
            customerName: 'Dry Corp',
            amount: 7500,
            daysOverdue: 25
          }
        }
      ]);
      TaskAdapter.getTasks.mockResolvedValueOnce([]);

      const result = await AutomationEngine.evaluateRules(mockCompanyId, {
        referenceDate: baselineDate
      });

      expect(result.mode).toBe('dry_run');
      expect(result.companyId).toBe(mockCompanyId);
      expect(result.matchedCount).toBe(1);
      expect(result.wouldCreateCount).toBe(1);
      expect(result.alreadyActionedCount).toBe(0);
      expect(result.matches[0].candidateTask.title).toBe('Follow up on overdue invoice #INV-DRY-1');

      // CRITICAL ASSERTION: No writes were performed
      expect(TaskAdapter.createTask).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. SAFETY GATING (automation_enabled)
  // ═══════════════════════════════════════════════════════════════
  describe('Safety Gating (automation_enabled)', () => {
    it('strictly blocks execution and performs ZERO writes when automation_enabled is false/off by default', async () => {
      supabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null })
      }));

      ActionCenter.getOverdueInvoiceActions.mockResolvedValueOnce([
        {
          backingData: {
            invoiceId: 'inv-blocked',
            invoiceNumber: 'INV-BLOCKED',
            amount: 5000,
            daysOverdue: 25
          }
        }
      ]);

      const result = await AutomationEngine.executeRules(mockCompanyId, {
        automation_enabled: false
      });

      expect(result.success).toBe(false);
      expect(result.executed).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.reason).toContain('automation_enabled = false');

      // CRITICAL ASSERTION: No task created
      expect(TaskAdapter.createTask).not.toHaveBeenCalled();

      // Verify audit log record for blocked attempt
      expect(result.auditLogs.length).toBe(1);
      expect(result.auditLogs[0].action).toBe('automation_execution_blocked');
      expect(result.auditLogs[0].company_id).toBe(mockCompanyId);
    });

    it('allows execution when automation_enabled is explicitly true', async () => {
      supabase.from.mockImplementation(() => ({
        insert: vi.fn().mockResolvedValue({ data: null, error: null })
      }));

      ActionCenter.getOverdueInvoiceActions.mockResolvedValueOnce([
        {
          backingData: {
            invoiceId: 'inv-live',
            invoiceNumber: 'INV-LIVE',
            customerName: 'Live Corp',
            amount: 4000,
            daysOverdue: 20
          }
        }
      ]);
      TaskAdapter.getTasks.mockResolvedValueOnce([]);
      TaskAdapter.createTask.mockResolvedValueOnce({
        id: 'task-created-001',
        title: 'Follow up on overdue invoice #INV-LIVE',
        status: 'todo'
      });

      const result = await AutomationEngine.executeRules(mockCompanyId, {
        automation_enabled: true
      });

      expect(result.success).toBe(true);
      expect(result.executed).toBe(true);
      expect(result.blocked).toBe(false);
      expect(result.tasksCreatedCount).toBe(1);
      expect(TaskAdapter.createTask).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. IDEMPOTENCY (Duplicate Prevention)
  // ═══════════════════════════════════════════════════════════════
  describe('Idempotency & Duplicate Prevention', () => {
    it('creates task on first run, but skips on second run when open task already exists', async () => {
      supabase.from.mockImplementation(() => ({
        insert: vi.fn().mockResolvedValue({ data: null, error: null })
      }));

      const invoiceItem = {
        backingData: {
          invoiceId: 'inv-idem-1',
          invoiceNumber: 'INV-IDEM-01',
          customerName: 'Idem Corp',
          amount: 6000,
          daysOverdue: 28
        }
      };

      // ── RUN 1: No existing tasks ──
      ActionCenter.getOverdueInvoiceActions.mockResolvedValueOnce([invoiceItem]);
      TaskAdapter.getTasks.mockResolvedValueOnce([]); // No existing tasks
      TaskAdapter.createTask.mockResolvedValueOnce({
        id: 'task-idem-created',
        title: 'Follow up on overdue invoice #INV-IDEM-01'
      });

      const run1 = await AutomationEngine.executeRules(mockCompanyId, {
        automation_enabled: true
      });

      expect(run1.tasksCreatedCount).toBe(1);
      expect(run1.skippedAlreadyActionedCount).toBe(0);
      expect(TaskAdapter.createTask).toHaveBeenCalledTimes(1);

      // ── RUN 2: Open follow-up task now exists ──
      ActionCenter.getOverdueInvoiceActions.mockResolvedValueOnce([invoiceItem]);
      TaskAdapter.getTasks.mockResolvedValueOnce([
        {
          id: 'task-idem-created',
          title: 'Follow up on overdue invoice #INV-IDEM-01',
          status: 'todo',
          metadata: { invoiceId: 'inv-idem-1' }
        }
      ]);

      const run2 = await AutomationEngine.executeRules(mockCompanyId, {
        automation_enabled: true
      });

      expect(run2.tasksCreatedCount).toBe(0);
      expect(run2.skippedAlreadyActionedCount).toBe(1);

      // CRITICAL ASSERTION: TaskAdapter.createTask was NOT called a second time
      expect(TaskAdapter.createTask).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. AUDIT LOG ENTRY SHAPE
  // ═══════════════════════════════════════════════════════════════
  describe('Audit Log Entries', () => {
    it('generates structured audit log records citing rule, trigger data, created task ID, and timestamp', async () => {
      supabase.from.mockImplementation(() => ({
        insert: vi.fn().mockResolvedValue({ data: null, error: null })
      }));

      ActionCenter.getOverdueInvoiceActions.mockResolvedValueOnce([
        {
          backingData: {
            invoiceId: 'inv-audit-1',
            invoiceNumber: 'INV-AUDIT-10',
            customerName: 'Audit Client',
            amount: 8800,
            daysOverdue: 35
          }
        }
      ]);
      TaskAdapter.getTasks.mockResolvedValueOnce([]);
      TaskAdapter.createTask.mockResolvedValueOnce({
        id: 'task-audit-999',
        title: 'Follow up on overdue invoice #INV-AUDIT-10'
      });

      const result = await AutomationEngine.executeRules(mockCompanyId, {
        automation_enabled: true
      });

      expect(result.auditLogs.length).toBe(1);
      const log = result.auditLogs[0];

      expect(log.action).toBe('automation_rule_executed');
      expect(log.company_id).toBe(mockCompanyId);
      expect(log.entity_type).toBe('task');
      expect(log.entity_id).toBe('task-audit-999');
      expect(log.entity_label).toBe('Overdue Invoice Follow-up Task');
      expect(log.severity).toBe('info');

      const parsedDetails = JSON.parse(log.details);
      expect(parsedDetails.ruleId).toBe('rule_overdue_invoice_followup');
      expect(parsedDetails.trigger).toBe('invoice_overdue');
      expect(parsedDetails.triggerData.invoiceNumber).toBe('INV-AUDIT-10');
      expect(parsedDetails.triggerData.amount).toBe(8800);
      expect(parsedDetails.triggerData.daysOverdue).toBe(35);
      expect(parsedDetails.actionTaken).toBe('created_followup_task');
      expect(parsedDetails.createdTaskId).toBe('task-audit-999');
      expect(parsedDetails.status).toBe('success');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 6. ZERO-DATA EDGE CASE
  // ═══════════════════════════════════════════════════════════════
  describe('Zero-Data Edge Case', () => {
    it('handles zero overdue invoices cleanly without errors in dry-run and execution', async () => {
      ActionCenter.getOverdueInvoiceActions.mockResolvedValue([]);
      TaskAdapter.getTasks.mockResolvedValue([]);

      const dryRun = await AutomationEngine.evaluateRules(mockCompanyId);
      expect(dryRun.matchedCount).toBe(0);
      expect(dryRun.wouldCreateCount).toBe(0);
      expect(dryRun.matches).toEqual([]);

      const execution = await AutomationEngine.executeRules(mockCompanyId, {
        automation_enabled: true
      });
      expect(execution.success).toBe(true);
      expect(execution.tasksCreatedCount).toBe(0);
      expect(execution.executions).toEqual([]);
      expect(TaskAdapter.createTask).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 7. OMNICORE V2 ARCHITECTURE INTEGRATION
  // ═══════════════════════════════════════════════════════════════
  describe('OmniCore Architecture V2 Integration', () => {
    it('is properly mounted in OmniCoreV2.BusinessAutomation', () => {
      expect(OmniCoreV2.BusinessAutomation).toBeDefined();
      expect(OmniCoreV2.BusinessAutomation.layer).toBe('BusinessAutomation');
      expect(typeof OmniCoreV2.BusinessAutomation.evaluateRules).toBe('function');
      expect(typeof OmniCoreV2.BusinessAutomation.executeRules).toBe('function');
    });
  });
});
