/**
 * Unit Tests for OmniCore Phase A:
 * Business Core Completion (ProjectAdapter, LocationAdapter) &
 * Capabilities (Scheduling, Analytics).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectAdapter } from '../src/omnicore/core/ProjectAdapter';
import { LocationAdapter } from '../src/omnicore/core/LocationAdapter';
import { BusinessCore } from '../src/omnicore/core';

import { Scheduling } from '../src/omnicore/capabilities/Scheduling';
import { Analytics } from '../src/omnicore/capabilities/Analytics';
import { Purchasing } from '../src/omnicore/capabilities/Purchasing';
import { Sales } from '../src/omnicore/capabilities/Sales';
import { BusinessCapabilities } from '../src/omnicore/capabilities';

import { TaskAdapter } from '../src/omnicore/core/TaskAdapter';
import { EmployeeAdapter } from '../src/omnicore/core/EmployeeAdapter';
import { ProductAdapter } from '../src/omnicore/core/ProductAdapter';
import { base44 } from '../src/api/base44Client';
import { powerSync } from '../src/api/PowerSyncConnector';
import { supabase } from '../src/api/supabaseClient';

// Mock base44Client
vi.mock('../src/api/base44Client', () => ({
  base44: {
    entities: {
      LegalCase: {
        filter: vi.fn(),
        create: vi.fn()
      },
      CasePipeline: {
        filter: vi.fn(),
        create: vi.fn()
      },
      Company: {
        findUnique: vi.fn()
      }
    }
  }
}));

// Mock PowerSyncConnector
vi.mock('../src/api/PowerSyncConnector', () => ({
  powerSync: {
    execute: vi.fn()
  }
}));

// Mock supabaseClient
vi.mock('../src/api/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn()
    }))
  }
}));

// Mock core adapters and capabilities for pure composition testing
vi.mock('../src/omnicore/core/TaskAdapter', () => ({
  TaskAdapter: { getTasks: vi.fn() }
}));

vi.mock('../src/omnicore/core/EmployeeAdapter', () => ({
  EmployeeAdapter: { getEmployees: vi.fn() }
}));

vi.mock('../src/omnicore/core/ProductAdapter', () => ({
  ProductAdapter: { getProducts: vi.fn() }
}));

vi.mock('../src/omnicore/capabilities/Sales', () => ({
  Sales: { getSalesOverview: vi.fn() }
}));

vi.mock('../src/omnicore/capabilities/Purchasing', () => ({
  Purchasing: { getPurchasingOverview: vi.fn() }
}));

describe('OmniCore Phase A: Core Adapters & Capabilities', () => {
  const testCompanyId = 'comp-phase-a-test';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════
  // 1. PROJECT ADAPTER TESTS
  // ═══════════════════════════════════════════════════════════════
  describe('ProjectAdapter', () => {
    it('returns empty array when companyId is missing', async () => {
      const res = await ProjectAdapter.getProjects('');
      expect(res).toEqual([]);
    });

    it('fetches and normalizes cases and pipelines from legal sources', async () => {
      base44.entities.LegalCase.filter.mockResolvedValueOnce([
        {
          id: 'case-101',
          company_id: testCompanyId,
          title: 'Smith Estate Planning',
          case_type: 'probate',
          status: 'in_progress',
          priority: 'high',
          assigned_lawyer: 'attorney-1',
          client_id: 'client-88',
          filing_date: '2026-01-15',
          next_hearing_date: '2026-10-20',
          case_number: 'CV-2026-90',
          description: 'Probate administration'
        }
      ]);

      base44.entities.CasePipeline.filter.mockResolvedValueOnce([
        {
          id: 'pipe-201',
          company_id: testCompanyId,
          name: 'Corporate M&A Pipeline',
          case_type: 'corporate',
          is_active: true,
          stages: ['Due Diligence', 'Negotiation', 'Closing'],
          item_label: 'Deal'
        }
      ]);

      const projects = await ProjectAdapter.getProjects(testCompanyId);
      expect(base44.entities.LegalCase.filter).toHaveBeenCalledWith({ company_id: testCompanyId });
      expect(base44.entities.CasePipeline.filter).toHaveBeenCalledWith({ company_id: testCompanyId });

      expect(projects.length).toBe(2);
      expect(projects[0]).toMatchObject({
        id: 'case-101',
        sourceTable: 'legal_cases',
        name: 'Smith Estate Planning',
        type: 'probate',
        status: 'in_progress',
        priority: 'high',
        assignedTo: 'attorney-1',
        clientId: 'client-88',
        startDate: '2026-01-15',
        targetDate: '2026-10-20',
        metadata: {
          caseNumber: 'CV-2026-90'
        }
      });

      expect(projects[1]).toMatchObject({
        id: 'pipe-201',
        sourceTable: 'case_pipelines',
        name: 'Corporate M&A Pipeline',
        type: 'corporate',
        status: 'active',
        metadata: {
          stages: ['Due Diligence', 'Negotiation', 'Closing'],
          itemLabel: 'Deal'
        }
      });
    });

    it('throws explicit error on write attempt (deferred generic projects table)', async () => {
      await expect(ProjectAdapter.createProject(testCompanyId, { name: 'Tech Merger Phase 1' }))
        .rejects.toThrow('Direct generic project creation via base44 ORM is not implemented');
    });

    it('throws error when companyId is missing on create', async () => {
      await expect(ProjectAdapter.createProject('', { name: 'Test' })).rejects.toThrow('Missing companyId');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. LOCATION ADAPTER TESTS
  // ═══════════════════════════════════════════════════════════════
  describe('LocationAdapter', () => {
    it('returns empty array when companyId is missing', async () => {
      const res = await LocationAdapter.getLocations('');
      expect(res).toEqual([]);
    });

    it('fetches and normalizes branches, storefronts, and properties', async () => {
      powerSync.execute.mockImplementation(async (sql, params) => {
        if (sql.includes('univ_retail_branches')) {
          return {
            rows: {
              _array: [
                {
                  id: 'branch-1',
                  company_id: testCompanyId,
                  name: 'Downtown Flagship',
                  location: '123 Main St, Metro City',
                  manager_id: 'mgr-10',
                  contact_phone: '555-0199',
                  contact_email: 'downtown@retail.com',
                  status: 'active'
                }
              ]
            }
          };
        }
        if (sql.includes('univ_retail_storefronts')) {
          return {
            rows: {
              _array: [
                {
                  id: 'storefront-1',
                  company_id: testCompanyId,
                  domain_name: 'shop.company.com',
                  is_active: 1,
                  theme_config: '{"theme":"dark"}'
                }
              ]
            }
          };
        }
        if (sql.includes('univ_re_properties')) {
          return {
            rows: {
              _array: [
                {
                  id: 'prop-1',
                  company_id: testCompanyId,
                  address: '742 Evergreen Terrace',
                  city: 'Springfield',
                  country: 'USA',
                  property_type: 'residential',
                  price: 350000,
                  bedrooms: 4,
                  bathrooms: 2.5,
                  agent_name: 'Jane Realtor'
                }
              ]
            }
          };
        }
        return { rows: { _array: [] } };
      });

      const locations = await LocationAdapter.getLocations(testCompanyId);
      expect(locations.length).toBe(3);

      expect(locations[0]).toMatchObject({
        id: 'branch-1',
        sourceTable: 'univ_retail_branches',
        name: 'Downtown Flagship',
        type: 'branch',
        address: '123 Main St, Metro City',
        managerId: 'mgr-10',
        phone: '555-0199'
      });

      expect(locations[1]).toMatchObject({
        id: 'storefront-1',
        sourceTable: 'univ_retail_storefronts',
        name: 'shop.company.com',
        type: 'storefront',
        status: 'active'
      });

      expect(locations[2]).toMatchObject({
        id: 'prop-1',
        sourceTable: 'univ_re_properties',
        name: '742 Evergreen Terrace',
        type: 'residential',
        city: 'Springfield',
        metadata: {
          price: 350000,
          bedrooms: 4,
          bathrooms: 2.5
        }
      });
    });

    it('falls back to company headquarters record when no multi-location tables have data', async () => {
      powerSync.execute.mockResolvedValue({ rows: { _array: [] } });

      base44.entities.Company.findUnique.mockResolvedValueOnce({
        id: testCompanyId,
        name: 'Acme Global Corp',
        address: '500 Tech Blvd',
        city: 'San Francisco',
        country: 'USA',
        phone: '555-1234',
        email: 'hq@acme.com',
        subdomain: 'acme',
        currency: 'USD'
      });

      const locations = await LocationAdapter.getLocations(testCompanyId);
      expect(locations.length).toBe(1);
      expect(locations[0]).toMatchObject({
        id: `hq-${testCompanyId}`,
        sourceTable: 'companies',
        name: 'Acme Global Corp Headquarters',
        type: 'headquarters',
        address: '500 Tech Blvd',
        city: 'San Francisco',
        metadata: {
          isPrimaryHeadquarters: true,
          currency: 'USD'
        }
      });
    });

    it('throws explicit error on write attempt (deferred generic locations table)', async () => {
      await expect(LocationAdapter.createLocation(testCompanyId, { name: 'Branch 2' }))
        .rejects.toThrow('Direct generic location creation via base44 ORM is not implemented');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. SCHEDULING CAPABILITY TESTS
  // ═══════════════════════════════════════════════════════════════
  describe('Scheduling Capability', () => {
    it('handles zero data cleanly and returns structured zero-state', async () => {
      TaskAdapter.getTasks.mockResolvedValueOnce([]);
      EmployeeAdapter.getEmployees.mockResolvedValueOnce([]);

      const overview = await Scheduling.getScheduleOverview(testCompanyId);
      expect(overview.totalScheduled).toBe(0);
      expect(overview.activeScheduled).toBe(0);
      expect(overview.completedScheduled).toBe(0);
      expect(overview.upcomingCount).toBe(0);
      expect(overview.overdueCount).toBe(0);
      expect(overview.scopeNote).toBeDefined();

      const dead = await Scheduling.getUpcomingDeadlines('');
      expect(dead).toEqual([]);

      const staff = await Scheduling.getStaffSchedule('', '');
      expect(staff.totalTasks).toBe(0);
    });

    it('computes schedule overview metrics across tasks correctly', async () => {
      const pastDate = new Date(Date.now() - 86400000 * 3).toISOString(); // 3 days ago
      const futureDate = new Date(Date.now() + 86400000 * 5).toISOString(); // 5 days from now
      const todayDate = new Date().toISOString(); // today

      TaskAdapter.getTasks.mockResolvedValueOnce([
        { id: 't1', title: 'Audit Report', status: 'in_progress', priority: 'high', assignedTo: 'emp-1', dueDate: pastDate },
        { id: 't2', title: 'Client Sync', status: 'pending', priority: 'medium', assignedTo: 'emp-2', dueDate: futureDate },
        { id: 't3', title: 'Invoice Review', status: 'pending', priority: 'low', assignedTo: null, dueDate: todayDate },
        { id: 't4', title: 'System Patch', status: 'completed', priority: 'urgent', assignedTo: 'emp-1', dueDate: pastDate }
      ]);
      EmployeeAdapter.getEmployees.mockResolvedValueOnce([
        { id: 'emp-1', name: 'Alice Smith' },
        { id: 'emp-2', name: 'Bob Jones' }
      ]);

      const overview = await Scheduling.getScheduleOverview(testCompanyId);
      expect(overview.totalScheduled).toBe(4);
      expect(overview.activeScheduled).toBe(3);
      expect(overview.completedScheduled).toBe(1);
      expect(overview.overdueCount).toBe(1); // t1 is past and not completed
      expect(overview.upcomingCount).toBe(1); // t2 is future
      expect(overview.dueTodayCount).toBe(1); // t3 is today
      expect(overview.assignedCount).toBe(3);
      expect(overview.unassignedCount).toBe(1);
      expect(overview.byPriority.high).toBe(1);
      expect(overview.byPriority.urgent).toBe(1);
    });

    it('computes staff schedule and taskLoadScore accurately', async () => {
      const pastDate = new Date(Date.now() - 86400000 * 2).toISOString();
      const futureDate = new Date(Date.now() + 86400000 * 4).toISOString();

      TaskAdapter.getTasks.mockResolvedValueOnce([
        { id: 't1', title: 'Contract Draft', status: 'in_progress', priority: 'high', assignedTo: 'alice@firm.com', dueDate: futureDate },
        { id: 't2', title: 'Tax Filing', status: 'open', priority: 'urgent', assignedTo: 'alice@firm.com', dueDate: pastDate },
        { id: 't3', title: 'Onboarding', status: 'completed', priority: 'low', assignedTo: 'alice@firm.com' },
        { id: 't4', title: 'Unrelated Task', status: 'open', priority: 'medium', assignedTo: 'bob@firm.com' }
      ]);

      EmployeeAdapter.getEmployees.mockResolvedValueOnce([
        { id: 'emp-1', name: 'Alice Smith', email: 'alice@firm.com', role: 'associate', department: 'legal' }
      ]);

      const staffSchedule = await Scheduling.getStaffSchedule(testCompanyId, 'alice@firm.com');
      expect(staffSchedule.employee).toMatchObject({
        id: 'emp-1',
        name: 'Alice Smith',
        email: 'alice@firm.com',
        role: 'associate',
        department: 'legal'
      });
      expect(staffSchedule.totalTasks).toBe(3);
      expect(staffSchedule.activeTasksCount).toBe(2);
      expect(staffSchedule.completedTasksCount).toBe(1);
      expect(staffSchedule.overdueTasksCount).toBe(1); // Tax Filing
      expect(staffSchedule.upcomingTasksCount).toBe(1); // Contract Draft
      // High (3) + Urgent (3) = 6
      expect(staffSchedule.taskLoadScore).toBe(6);
    });

    it('returns sorted upcoming deadlines respecting limit option', async () => {
      const d1 = new Date(Date.now() + 86400000 * 2).toISOString();
      const d2 = new Date(Date.now() + 86400000 * 5).toISOString();
      const d3 = new Date(Date.now() + 86400000 * 10).toISOString();

      TaskAdapter.getTasks.mockResolvedValueOnce([
        { id: 't3', title: 'Phase 3 Milestone', status: 'open', dueDate: d3 },
        { id: 't1', title: 'Phase 1 Milestone', status: 'open', dueDate: d1 },
        { id: 't2', title: 'Phase 2 Milestone', status: 'open', dueDate: d2 },
        { id: 't-done', title: 'Old Done Task', status: 'completed', dueDate: d1 }
      ]);

      const deadlines = await Scheduling.getUpcomingDeadlines(testCompanyId, { limit: 2 });
      expect(deadlines.length).toBe(2);
      expect(deadlines[0].id).toBe('t1');
      expect(deadlines[1].id).toBe('t2');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. ANALYTICS CAPABILITY TESTS
  // ═══════════════════════════════════════════════════════════════
  describe('Analytics Capability', () => {
    it('handles zero data cleanly and returns structured zero-state', async () => {
      Sales.getSalesOverview.mockResolvedValueOnce({ totalRevenue: 0, recentTransactions: [] });
      Purchasing.getPurchasingOverview.mockResolvedValueOnce({ totalSpend: 0, spendBySupplier: {} });
      TaskAdapter.getTasks.mockResolvedValueOnce([]);
      EmployeeAdapter.getEmployees.mockResolvedValueOnce([]);

      const exec = await Analytics.getExecutiveSummary(testCompanyId);
      expect(exec.revenue).toBe(0);
      expect(exec.supplierSpend).toBe(0);
      expect(exec.netOperatingMargin).toBe(0);
      expect(exec.taskCompletionRate).toBe(0);
      expect(exec.headcount).toBe(0);
    });

    it('ranks top products by revenue correctly', async () => {
      Sales.getSalesOverview.mockResolvedValueOnce({
        totalRevenue: 2500,
        recentTransactions: [
          { id: 'tx-1', amount: 1500, productId: 'prod-1' },
          { id: 'tx-2', amount: 500, productId: 'prod-1' },
          { id: 'tx-3', amount: 500, productId: 'prod-2' }
        ]
      });

      ProductAdapter.getProducts.mockResolvedValueOnce([
        { id: 'prod-1', name: 'Enterprise License', price: 2000, category: 'Software' },
        { id: 'prod-2', name: 'Starter Kit', price: 500, category: 'Hardware' }
      ]);

      const res = await Analytics.getTopProductsByRevenue(testCompanyId);
      expect(res.totalProducts).toBe(2);
      expect(res.rankedProducts[0].id).toBe('prod-1');
      expect(res.rankedProducts[0].revenueGenerated).toBe(2000); // 1500 + 500
      expect(res.rankedProducts[1].id).toBe('prod-2');
      expect(res.rankedProducts[1].revenueGenerated).toBe(500);
    });

    it('computes employee workload distribution correctly', async () => {
      TaskAdapter.getTasks.mockResolvedValueOnce([
        { id: 't1', title: 'Task 1', status: 'in_progress', priority: 'high', assignedTo: 'emp-1' },
        { id: 't2', title: 'Task 2', status: 'pending', priority: 'medium', assignedTo: 'emp-1' },
        { id: 't3', title: 'Task 3', status: 'completed', priority: 'low', assignedTo: 'emp-1' },
        { id: 't4', title: 'Task 4', status: 'open', priority: 'low', assignedTo: 'emp-2' }
      ]);

      EmployeeAdapter.getEmployees.mockResolvedValueOnce([
        { id: 'emp-1', name: 'Alice Developer', role: 'senior', department: 'Engineering' },
        { id: 'emp-2', name: 'Bob Support', role: 'junior', department: 'Operations' }
      ]);

      const res = await Analytics.getEmployeeWorkloadDistribution(testCompanyId);
      expect(res.totalEmployees).toBe(2);
      expect(res.totalActiveTasks).toBe(3); // 2 from emp-1, 1 from emp-2
      expect(res.averageTasksPerEmployee).toBe(1.5);

      expect(res.distribution[0].employeeId).toBe('emp-1');
      expect(res.distribution[0].activeTasks).toBe(2);
      expect(res.distribution[0].completedTasks).toBe(1);
      // High (3) + Medium (2) = 5
      expect(res.distribution[0].workloadScore).toBe(5);

      expect(res.distribution[1].employeeId).toBe('emp-2');
      expect(res.distribution[1].activeTasks).toBe(1);
      expect(res.distribution[1].workloadScore).toBe(1);
    });

    it('directly reuses Purchasing.getPurchasingOverview for supplier spend analytics without duplicating logic', async () => {
      Purchasing.getPurchasingOverview.mockResolvedValueOnce({
        totalSuppliers: 3,
        activeSuppliersCount: 2,
        totalSpend: 12500,
        spendBySupplier: {
          'Acme Logistics': { totalSpend: 8000, transactionCount: 4 },
          'Global Office Supplies': { totalSpend: 4500, transactionCount: 2 }
        }
      });

      const analytics = await Analytics.getSupplierSpendAnalytics(testCompanyId);
      expect(Purchasing.getPurchasingOverview).toHaveBeenCalledWith(testCompanyId, {});
      expect(analytics.totalSpend).toBe(12500);
      expect(analytics.totalSuppliers).toBe(3);
      expect(analytics.activeSuppliersCount).toBe(2);
      expect(analytics.topSuppliersBySpend.length).toBe(2);
      expect(analytics.topSuppliersBySpend[0]).toEqual({
        supplierName: 'Acme Logistics',
        totalSpend: 8000,
        transactionCount: 4
      });
      expect(analytics.topSuppliersBySpend[1]).toEqual({
        supplierName: 'Global Office Supplies',
        totalSpend: 4500,
        transactionCount: 2
      });
    });

    it('computes executive summary combining revenue, supplier spend, margin, and operational KPIs', async () => {
      Sales.getSalesOverview.mockResolvedValueOnce({
        totalRevenue: 50000,
        topCustomers: [{ customerId: 'cust-1', name: 'MegaCorp Inc', totalSpent: 30000 }]
      });

      Purchasing.getPurchasingOverview.mockResolvedValueOnce({
        totalSpend: 20000,
        spendBySupplier: {
          'Cloud Hosting Provider': { totalSpend: 15000, transactionCount: 12 },
          'Hardware Wholesale': { totalSpend: 5000, transactionCount: 2 }
        }
      });

      TaskAdapter.getTasks.mockResolvedValueOnce([
        { id: 't1', status: 'completed' },
        { id: 't2', status: 'completed' },
        { id: 't3', status: 'in_progress' },
        { id: 't4', status: 'pending' }
      ]);

      EmployeeAdapter.getEmployees.mockResolvedValueOnce([
        { id: 'e1' }, { id: 'e2' }, { id: 'e3' }, { id: 'e4' }, { id: 'e5' }
      ]);

      const summary = await Analytics.getExecutiveSummary(testCompanyId);
      expect(summary.revenue).toBe(50000);
      expect(summary.supplierSpend).toBe(20000);
      expect(summary.netOperatingMargin).toBe(30000); // 50000 - 20000
      expect(summary.headcount).toBe(5);
      expect(summary.totalTasks).toBe(4);
      expect(summary.taskCompletionRate).toBe(50); // 2 of 4 = 50%
      expect(summary.topCustomer).toMatchObject({ customerId: 'cust-1', name: 'MegaCorp Inc' });
      expect(summary.topSupplier).toMatchObject({ supplierName: 'Cloud Hosting Provider', totalSpend: 15000 });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. NAMESPACE & REGISTRATION VERIFICATION
  // ═══════════════════════════════════════════════════════════════
  describe('OmniCore Registration & Namespace Exports', () => {
    it('verifies BusinessCore exports all 11 core adapters including Project and Location', () => {
      expect(BusinessCore.adapters.Project).toBe(ProjectAdapter);
      expect(BusinessCore.adapters.Location).toBe(LocationAdapter);
      expect(BusinessCore.adapters.Customer).toBeDefined();
      expect(BusinessCore.adapters.Task).toBeDefined();
      expect(BusinessCore.adapters.Invoice).toBeDefined();
      expect(BusinessCore.adapters.Product).toBeDefined();
      expect(BusinessCore.adapters.Supplier).toBeDefined();
      expect(BusinessCore.adapters.Transaction).toBeDefined();
      expect(BusinessCore.adapters.Payment).toBeDefined();
      expect(BusinessCore.adapters.Employee).toBeDefined();
      expect(BusinessCore.adapters.Document).toBeDefined();
      expect(Object.keys(BusinessCore.adapters).length).toBe(11);
    });

    it('verifies BusinessCapabilities exports Scheduling and Analytics', () => {
      expect(BusinessCapabilities.capabilities.Scheduling).toBe(Scheduling);
      expect(BusinessCapabilities.capabilities.Analytics).toBe(Analytics);
      expect(BusinessCapabilities.capabilities.CustomerManagement).toBeDefined();
      expect(BusinessCapabilities.capabilities.Sales).toBeDefined();
      expect(BusinessCapabilities.capabilities.Finance).toBeDefined();
      expect(BusinessCapabilities.capabilities.Inventory).toBeDefined();
      expect(BusinessCapabilities.capabilities.HR).toBeDefined();
      expect(BusinessCapabilities.capabilities.Purchasing).toBeDefined();
      expect(BusinessCapabilities.capabilities.Documents).toBeDefined();
      expect(Object.keys(BusinessCapabilities.capabilities).length).toBeGreaterThanOrEqual(9);
    });
  });
});
