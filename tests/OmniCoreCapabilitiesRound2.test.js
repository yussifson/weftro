/**
 * Unit Tests for OmniCore Business Capabilities Round 2 (Inventory, HR, Purchasing, Documents)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Inventory } from '../src/omnicore/capabilities/Inventory';
import { HR } from '../src/omnicore/capabilities/HR';
import { Purchasing } from '../src/omnicore/capabilities/Purchasing';
import { Documents } from '../src/omnicore/capabilities/Documents';
import { BusinessCapabilities } from '../src/omnicore/capabilities';

import { ProductAdapter } from '../src/omnicore/core/ProductAdapter';
import { SupplierAdapter } from '../src/omnicore/core/SupplierAdapter';
import { TransactionAdapter } from '../src/omnicore/core/TransactionAdapter';
import { EmployeeAdapter } from '../src/omnicore/core/EmployeeAdapter';
import { TaskAdapter } from '../src/omnicore/core/TaskAdapter';
import { DocumentAdapter } from '../src/omnicore/core/DocumentAdapter';

vi.mock('../src/omnicore/core/ProductAdapter', () => ({
  ProductAdapter: { getProducts: vi.fn() }
}));

vi.mock('../src/omnicore/core/SupplierAdapter', () => ({
  SupplierAdapter: { getSuppliers: vi.fn() }
}));

vi.mock('../src/omnicore/core/TransactionAdapter', () => ({
  TransactionAdapter: { getTransactions: vi.fn() }
}));

vi.mock('../src/omnicore/core/EmployeeAdapter', () => ({
  EmployeeAdapter: { getEmployees: vi.fn() }
}));

vi.mock('../src/omnicore/core/TaskAdapter', () => ({
  TaskAdapter: { getTasks: vi.fn() }
}));

vi.mock('../src/omnicore/core/DocumentAdapter', () => ({
  DocumentAdapter: { getDocuments: vi.fn() }
}));

describe('OmniCore Business Capabilities - Round 2', () => {

  const testCompanyId = 'comp-cap-round2';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════
  // 1. INVENTORY CAPABILITY TESTS
  // ═══════════════════════════════════════════════════════════════
  describe('Inventory Capability', () => {
    it('handles zero-data and missing companyId cleanly', async () => {
      const overview1 = await Inventory.getInventoryOverview('');
      expect(overview1.totalItems).toBe(0);
      expect(overview1.totalStockUnits).toBe(0);

      ProductAdapter.getProducts.mockResolvedValueOnce([]);
      const overview2 = await Inventory.getInventoryOverview(testCompanyId);
      expect(overview2.totalItems).toBe(0);
      expect(overview2.lowStockCount).toBe(0);

      const alerts = await Inventory.getLowStockAlerts('');
      expect(alerts).toEqual([]);
    });

    it('clearly distinguishes configured vs default threshold low-stock alerts', async () => {
      ProductAdapter.getProducts.mockResolvedValueOnce([
        // 1. Pharmacy drug with real CONFIGURED threshold: reorder_level=30, stock=12 -> LOW STOCK
        {
          id: 'prod-rx-1',
          name: 'Amoxicillin 500mg',
          sku: 'RX-AMOX',
          type: 'pharmaceutical',
          price: 25,
          cost: 10,
          stockQuantity: 12,
          reorderThreshold: 30, // Real configured threshold
          metadata: { supplier: 'Apex Pharma', category: 'Antibiotics' }
        },
        // 2. Retail good with NO configured threshold in data: stock=4 <= default 10 -> LOW STOCK (DEFAULT)
        {
          id: 'prod-ret-1',
          name: 'Barcode Scanner Cordless',
          sku: 'SCAN-C10',
          type: 'physical_good',
          price: 120,
          cost: 70,
          stockQuantity: 4,
          reorderThreshold: null, // No column in data -> uses default
          metadata: { supplier: 'Tech Direct', category: 'Hardware' }
        },
        // 3. Retail good well above default threshold: stock=45 > default 10 -> NOT LOW STOCK
        {
          id: 'prod-ret-2',
          name: 'Thermal Receipt Paper (Box)',
          sku: 'PAP-50',
          type: 'physical_good',
          price: 30,
          cost: 15,
          stockQuantity: 45,
          reorderThreshold: null,
          metadata: { supplier: 'Paper Corp', category: 'Supplies' }
        },
        // 4. Out of stock item: stock=0
        {
          id: 'prod-ret-3',
          name: 'Cash Drawer Insert',
          sku: 'DRW-01',
          type: 'physical_good',
          price: 50,
          cost: 25,
          stockQuantity: 0,
          reorderThreshold: null,
          metadata: { supplier: 'Tech Direct', category: 'Hardware' }
        },
        // 5. Billable service (stockQuantity = null) -> Should be excluded from inventory alerts
        {
          id: 'serv-1',
          name: 'Legal Advice Retainer Hours',
          sku: null,
          type: 'service',
          price: 300,
          cost: 0,
          stockQuantity: null,
          reorderThreshold: null,
          metadata: {}
        }
      ]);

      const alerts = await Inventory.getLowStockAlerts(testCompanyId);

      expect(alerts.length).toBe(3);

      // Alert 1: Pharmacy with CONFIGURED threshold
      expect(alerts[0].name).toBe('Amoxicillin 500mg');
      expect(alerts[0].stockQuantity).toBe(12);
      expect(alerts[0].reorderThreshold).toBe(30);
      expect(alerts[0].thresholdSource).toBe('configured');
      expect(alerts[0].deficit).toBe(18); // 30 - 12
      expect(alerts[0].isOutOfStock).toBe(false);

      // Alert 2: Retail with DEFAULT threshold
      expect(alerts[1].name).toBe('Barcode Scanner Cordless');
      expect(alerts[1].stockQuantity).toBe(4);
      expect(alerts[1].reorderThreshold).toBe(10);
      expect(alerts[1].thresholdSource).toBe('default');
      expect(alerts[1].deficit).toBe(6); // 10 - 4
      expect(alerts[1].isOutOfStock).toBe(false);

      // Alert 3: Out of stock item
      expect(alerts[2].name).toBe('Cash Drawer Insert');
      expect(alerts[2].stockQuantity).toBe(0);
      expect(alerts[2].thresholdSource).toBe('default');
      expect(alerts[2].deficit).toBe(10); // 10 - 0
      expect(alerts[2].isOutOfStock).toBe(true);
    });

    it('computes inventory overview with total units, value, and out of stock counts', async () => {
      ProductAdapter.getProducts.mockResolvedValue([
        { id: 'p1', stockQuantity: 10, cost: 5, price: 10 },
        { id: 'p2', stockQuantity: 20, cost: 15, price: 30 },
        { id: 'p3', stockQuantity: 0, cost: 50, price: 100, reorderThreshold: 5 },
        { id: 's1', stockQuantity: null, type: 'service' } // Ignored
      ]);

      const overview = await Inventory.getInventoryOverview(testCompanyId);

      expect(overview.totalItems).toBe(3);
      expect(overview.totalStockUnits).toBe(30); // 10 + 20 + 0
      expect(overview.totalInventoryValue).toBe(350); // (10*5) + (20*15) + (0*50) = 50 + 300 = 350
      expect(overview.lowStockCount).toBe(2); // p1 (10 <= default 10), p3 (0 <= configured 5)
      expect(overview.outOfStockCount).toBe(1); // p3
    });

    it('generates supplier-linked reorder view from real product supplier metadata', async () => {
      ProductAdapter.getProducts.mockResolvedValueOnce([
        {
          id: 'p1',
          name: 'Scanner',
          stockQuantity: 2,
          cost: 100,
          reorderThreshold: null, // default 10, deficit = 8
          metadata: { supplier: 'Tech Direct' }
        },
        {
          id: 'p2',
          name: 'Printer Cable',
          stockQuantity: 5,
          cost: 10,
          reorderThreshold: null, // default 10, deficit = 5
          metadata: { supplier: 'Tech Direct' }
        },
        {
          id: 'p3',
          name: 'Aspirin',
          stockQuantity: 10,
          cost: 5,
          reorderThreshold: 50, // configured 50, deficit = 40
          metadata: { supplier: 'Pharma Wholesale' }
        },
        {
          id: 'p4',
          name: 'Unbranded Item',
          stockQuantity: 1,
          cost: 20,
          reorderThreshold: null, // default 10, deficit = 9
          metadata: {} // No supplier
        }
      ]);

      SupplierAdapter.getSuppliers.mockResolvedValueOnce([
        { id: 's1', name: 'Tech Direct' },
        { id: 's2', name: 'Pharma Wholesale' }
      ]);

      const reorderView = await Inventory.getSupplierReorderView(testCompanyId);

      expect(reorderView.supplierGroups.length).toBe(2);

      const techDirectGroup = reorderView.supplierGroups.find(g => g.supplierName === 'Tech Direct');
      expect(techDirectGroup).toBeDefined();
      expect(techDirectGroup.items.length).toBe(2);
      // (8 * 100) + (5 * 10) = 800 + 50 = 850
      expect(techDirectGroup.totalReorderCost).toBe(850);

      const pharmaGroup = reorderView.supplierGroups.find(g => g.supplierName === 'Pharma Wholesale');
      expect(pharmaGroup).toBeDefined();
      expect(pharmaGroup.items.length).toBe(1);
      // 40 * 5 = 200
      expect(pharmaGroup.totalReorderCost).toBe(200);

      expect(reorderView.unassignedItems.length).toBe(1);
      expect(reorderView.unassignedItems[0].name).toBe('Unbranded Item');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. HR CAPABILITY TESTS
  // ═══════════════════════════════════════════════════════════════
  describe('HR Capability', () => {
    it('handles zero-data cleanly', async () => {
      EmployeeAdapter.getEmployees.mockResolvedValueOnce([]);
      const overview = await HR.getHROverview(testCompanyId);

      expect(overview.totalHeadcount).toBe(0);
      expect(overview.activeHeadcount).toBe(0);
      expect(overview.totalPayrollSalary).toBe(0);
      expect(overview.averageSalary).toBe(0);
      expect(overview.departmentBreakdown).toEqual({});
    });

    it('computes HR overview with department, role breakdown, and payroll calculations', async () => {
      EmployeeAdapter.getEmployees.mockResolvedValueOnce([
        { id: 'e1', name: 'Alice', role: 'lawyer', department: 'litigation', status: 'active', salary: 120000 },
        { id: 'e2', name: 'Bob', role: 'paralegal', department: 'litigation', status: 'active', salary: 60000 },
        { id: 'e3', name: 'Charlie', role: 'accountant', department: 'finance', status: 'active', salary: 80000 },
        { id: 'e4', name: 'Diana', role: 'intern', department: 'corporate', status: 'inactive', salary: null }
      ]);

      const overview = await HR.getHROverview(testCompanyId);

      expect(overview.totalHeadcount).toBe(4);
      expect(overview.activeHeadcount).toBe(3);
      expect(overview.departmentBreakdown).toEqual({
        litigation: 2,
        finance: 1,
        corporate: 1
      });
      expect(overview.roleBreakdown).toEqual({
        lawyer: 1,
        paralegal: 1,
        accountant: 1,
        intern: 1
      });
      expect(overview.totalPayrollSalary).toBe(260000); // 120k + 60k + 80k
      expect(overview.averageSalary).toBe(86666.67); // 260k / 3
    });

    it('retrieves employee tasks by matching assigned employee identifier', async () => {
      TaskAdapter.getTasks.mockResolvedValueOnce([
        { id: 't1', title: 'Draft Brief', assignedTo: 'user-123', status: 'in_progress' },
        { id: 't2', title: 'Review NDA', assignedTo: 'user-123', status: 'completed' },
        { id: 't3', title: 'File Motion', assignedTo: 'user-456', status: 'pending' },
        { id: 't4', title: 'Onboarding Checklist', metadata: { user_id: 'user-123' }, status: 'open' }
      ]);

      const res = await HR.getEmployeeTasks(testCompanyId, 'user-123');

      expect(res.totalTasks).toBe(3);
      expect(res.openTasks).toBe(2);
      expect(res.completedTasks).toBe(1);
      expect(res.tasks.map(t => t.id)).toEqual(['t1', 't2', 't4']);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. PURCHASING CAPABILITY TESTS
  // ═══════════════════════════════════════════════════════════════
  describe('Purchasing Capability', () => {
    it('computes purchasing overview and spend-by-supplier from real transactions', async () => {
      SupplierAdapter.getSuppliers.mockResolvedValueOnce([
        { id: 's1', name: 'Global Logistics', status: 'active' },
        { id: 's2', name: 'MedSupply Co', status: 'active' },
        { id: 's3', name: 'Old Vendor', status: 'inactive' }
      ]);

      TransactionAdapter.getTransactions.mockResolvedValueOnce([
        { id: 'tr1', type: 'expense', amount: 1500, metadata: { vendor: 'Global Logistics' } },
        { id: 'tr2', type: 'expense', amount: 2500, metadata: { vendor: 'Global Logistics' } },
        { id: 'tr3', type: 'expense', amount: 800, metadata: { vendor: 'MedSupply Co' } },
        { id: 'tr4', type: 'income', amount: 10000, metadata: {} } // Income ignored in purchasing spend
      ]);

      const overview = await Purchasing.getPurchasingOverview(testCompanyId);

      expect(overview.totalSuppliers).toBe(3);
      expect(overview.activeSuppliersCount).toBe(2);
      expect(overview.totalSpend).toBe(4800); // 1500 + 2500 + 800
      expect(overview.spendBySupplier['Global Logistics']).toEqual({
        totalSpend: 4000,
        transactionCount: 2
      });
      expect(overview.spendBySupplier['MedSupply Co']).toEqual({
        totalSpend: 800,
        transactionCount: 1
      });
    });

    it('reuses Inventory capability low-stock logic for reorder recommendations', async () => {
      // Mock ProductAdapter so Inventory.getLowStockAlerts resolves
      ProductAdapter.getProducts.mockResolvedValueOnce([
        {
          id: 'p1',
          name: 'Box of Surgical Gloves',
          sku: 'GLV-100',
          stockQuantity: 5,
          cost: 20,
          reorderThreshold: 25, // Configured threshold -> deficit = 20
          metadata: { supplier: 'MedSupply Co' }
        },
        {
          id: 'p2',
          name: 'Syringes 10ml Pack',
          sku: 'SYR-10',
          stockQuantity: 2,
          cost: 15,
          reorderThreshold: 10, // Configured threshold -> deficit = 8
          metadata: { supplier: 'MedSupply Co' }
        },
        {
          id: 'p3',
          name: 'Generic Toner',
          sku: 'TON-99',
          stockQuantity: 1,
          cost: 40,
          reorderThreshold: null, // Default threshold (10) -> deficit = 9
          metadata: { supplier: 'Office World' }
        }
      ]);

      const reorders = await Purchasing.getReorderRecommendations(testCompanyId);

      expect(reorders.recommendations.length).toBe(2);

      const medSupply = reorders.recommendations.find(r => r.supplierName === 'MedSupply Co');
      expect(medSupply).toBeDefined();
      expect(medSupply.itemsToReorder.length).toBe(2);
      // Item 1: 20 deficit * $20 = $400; Item 2: 8 deficit * $15 = $120 -> total $520
      expect(medSupply.estimatedCost).toBe(520);

      const officeWorld = reorders.recommendations.find(r => r.supplierName === 'Office World');
      expect(officeWorld).toBeDefined();
      // Item 3: 9 deficit * $40 = $360
      expect(officeWorld.estimatedCost).toBe(360);

      expect(reorders.totalEstimatedReorderSpend).toBe(880); // 520 + 360
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. DOCUMENTS CAPABILITY TESTS
  // ═══════════════════════════════════════════════════════════════
  describe('Documents Capability', () => {
    it('handles zero-data cleanly', async () => {
      DocumentAdapter.getDocuments.mockResolvedValueOnce([]);
      const overview = await Documents.getDocumentOverview(testCompanyId);

      expect(overview.totalDocuments).toBe(0);
      expect(overview.totalSizeBytes).toBe(0);
      expect(overview.categoryBreakdown).toEqual({});

      const pending = await Documents.getPendingSignatures('');
      expect(pending).toEqual([]);
    });

    it('computes document overview with category, status, type distributions and byte size', async () => {
      DocumentAdapter.getDocuments.mockResolvedValueOnce([
        { id: 'd1', name: 'Contract.pdf', category: 'contracts', status: 'shared', type: 'pdf', fileSize: 500000 },
        { id: 'd2', name: 'Lease.pdf', category: 'contracts', status: 'draft', type: 'pdf', fileSize: 300000 },
        { id: 'd3', name: 'Invoice Receipt.png', category: 'finance', status: 'shared', type: 'image', fileSize: 150000 },
        { id: 'd4', name: 'Client Folder', category: 'folder', status: 'active', type: 'folder', fileSize: null }
      ]);

      const overview = await Documents.getDocumentOverview(testCompanyId);

      expect(overview.totalDocuments).toBe(4);
      expect(overview.totalSizeBytes).toBe(950000); // 500k + 300k + 150k
      expect(overview.categoryBreakdown).toEqual({ contracts: 2, finance: 1, folder: 1 });
      expect(overview.statusBreakdown).toEqual({ shared: 2, draft: 1, active: 1 });
      expect(overview.typeBreakdown).toEqual({ pdf: 2, image: 1, folder: 1 });
    });

    it('computes pending signature requests with days pending sorted descending', async () => {
      const tenDaysAgo = new Date(Date.now() - (10 * 24 * 60 * 60 * 1000)).toISOString();
      const twoDaysAgo = new Date(Date.now() - (2 * 24 * 60 * 60 * 1000)).toISOString();

      DocumentAdapter.getDocuments.mockResolvedValueOnce([
        {
          id: 'sig-old',
          name: 'Vendor Service Agreement',
          type: 'signature_request',
          status: 'pending',
          metadata: {
            recipientEmail: 'vendor@corp.com',
            sentByName: 'Sarah Jenkins',
            sentAt: tenDaysAgo,
            expiresAt: '2026-10-15T00:00:00Z',
            documentId: 'doc-100'
          }
        },
        {
          id: 'sig-new',
          name: 'Employee NDA',
          type: 'signature_request',
          status: 'sent',
          metadata: {
            recipientEmail: 'dev@corp.com',
            sentByName: 'HR Lead',
            sentAt: twoDaysAgo,
            expiresAt: '2026-10-30T00:00:00Z',
            documentId: 'doc-200'
          }
        },
        {
          id: 'sig-signed',
          name: 'Completed Retainer',
          type: 'signature_request',
          status: 'signed', // Already signed -> excluded
          metadata: { sentAt: tenDaysAgo }
        },
        {
          id: 'reg-doc',
          name: 'Regular PDF',
          type: 'pdf', // Not a signature request -> excluded
          status: 'shared'
        }
      ]);

      const pending = await Documents.getPendingSignatures(testCompanyId);

      expect(pending.length).toBe(2);

      // Oldest pending first
      expect(pending[0].id).toBe('sig-old');
      expect(pending[0].recipientEmail).toBe('vendor@corp.com');
      expect(pending[0].daysPending).toBe(10);
      expect(pending[0].status).toBe('pending');

      // Newer pending second
      expect(pending[1].id).toBe('sig-new');
      expect(pending[1].recipientEmail).toBe('dev@corp.com');
      expect(pending[1].daysPending).toBe(2);
      expect(pending[1].status).toBe('sent');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. NAMESPACE INTEGRATION
  // ═══════════════════════════════════════════════════════════════
  describe('BusinessCapabilities Layer Integration', () => {
    it('mounts all 7 capabilities in BusinessCapabilities namespace', () => {
      expect(BusinessCapabilities.capabilities.CustomerManagement).toBeDefined();
      expect(BusinessCapabilities.capabilities.Sales).toBeDefined();
      expect(BusinessCapabilities.capabilities.Finance).toBeDefined();
      expect(BusinessCapabilities.capabilities.Inventory).toBe(Inventory);
      expect(BusinessCapabilities.capabilities.HR).toBe(HR);
      expect(BusinessCapabilities.capabilities.Purchasing).toBe(Purchasing);
      expect(BusinessCapabilities.capabilities.Documents).toBe(Documents);
    });
  });
});
