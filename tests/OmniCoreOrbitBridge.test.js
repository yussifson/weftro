/**
 * Unit Tests for OmniCore Orbit Bridge & Role Access Gate (Phase 10)
 * 
 * Verifies role-based read gating using the existing `src/lib/rbac.js` matrix,
 * ensures short-circuiting on denial, and validates clean data delivery on authorization.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  OrbitV2Extension,
  OrbitAccessGate,
  OrbitBridge,
  CATEGORY_MODULE_MAP
} from '../src/omnicore/orbit';
import { Sales } from '../src/omnicore/capabilities/Sales';
import { Finance } from '../src/omnicore/capabilities/Finance';
import { CustomerManagement } from '../src/omnicore/capabilities/CustomerManagement';
import { BusinessHealth } from '../src/omnicore/intelligence/BusinessHealth';
import { ActionCenter } from '../src/omnicore/intelligence/ActionCenter';
import { BusinessIntelligence } from '../src/omnicore/intelligence/BusinessIntelligence';
import { BusinessProfileResolver } from '../src/omnicore/config/BusinessProfileResolver';
import { AutomationEngine } from '../src/omnicore/automation/AutomationEngine';
import { OmniCoreV2 } from '../src/omnicore';

vi.mock('../src/omnicore/capabilities/Sales', () => ({
  Sales: { getSalesOverview: vi.fn() }
}));

vi.mock('../src/omnicore/capabilities/Finance', () => ({
  Finance: { getFinancialSummary: vi.fn() }
}));

vi.mock('../src/omnicore/capabilities/CustomerManagement', () => ({
  CustomerManagement: { getCustomerProfile: vi.fn() }
}));

vi.mock('../src/omnicore/intelligence/BusinessHealth', () => ({
  BusinessHealth: { evaluateHealth: vi.fn() }
}));

vi.mock('../src/omnicore/intelligence/ActionCenter', () => ({
  ActionCenter: { getActionCenterFeed: vi.fn() }
}));

vi.mock('../src/omnicore/intelligence/BusinessIntelligence', () => ({
  BusinessIntelligence: { getUnifiedInsights: vi.fn() }
}));

vi.mock('../src/omnicore/config/BusinessProfileResolver', () => ({
  BusinessProfileResolver: { resolve: vi.fn(), resolveSync: vi.fn() },
  resolveBusinessProfile: vi.fn(),
  resolveBusinessProfileSync: vi.fn(),
  fetchPlatformFeatureFlags: vi.fn()
}));

vi.mock('../src/omnicore/automation/AutomationEngine', () => ({
  AutomationEngine: { evaluateRules: vi.fn() }
}));

describe('OmniCore Orbit Bridge & Access Gate', () => {

  const mockCompanyId = 'comp-orbit-test-1';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════
  // 1. ACCESS GATE UNIT TESTS
  // ═══════════════════════════════════════════════════════════════
  describe('OrbitAccessGate Evaluation', () => {
    it('correctly maps Orbit categories to rbac.js modules', () => {
      expect(CATEGORY_MODULE_MAP.customers).toBe('clients');
      expect(CATEGORY_MODULE_MAP.sales).toBe('sales');
      expect(CATEGORY_MODULE_MAP.finance).toBe('finance');
      expect(CATEGORY_MODULE_MAP.business_profile).toBe('settings');
      expect(CATEGORY_MODULE_MAP.business_health).toBe('business_health');
      expect(CATEGORY_MODULE_MAP.action_center).toBe('action_center');
      expect(CATEGORY_MODULE_MAP.intelligence).toBe('intelligence');
      expect(CATEGORY_MODULE_MAP.automation).toBe('settings');
    });

    it('allows all senior and executive roles (CEO, Founder, Owner, Managing Partner, Super Admin, Spaceman) for all categories', () => {
      const seniorRoles = ['ceo', 'CEO', 'Founder', 'founder', 'owner', 'Owner', 'managing_partner', 'super_admin', 'spaceman'];
      const categories = ['customers', 'sales', 'finance', 'business_profile', 'business_health', 'action_center', 'intelligence', 'automation'];

      seniorRoles.forEach(role => {
        categories.forEach(cat => {
          const check = OrbitAccessGate.canRead(role, cat);
          expect(check.authorized, `Role '${role}' should be authorized for category '${cat}'`).toBe(true);
        });
      });
    });

    it('allows manager role to read all standard business categories including settings and health', () => {
      expect(OrbitAccessGate.canRead('manager', 'sales').authorized).toBe(true);
      expect(OrbitAccessGate.canRead('manager', 'finance').authorized).toBe(true);
      expect(OrbitAccessGate.canRead('manager', 'customers').authorized).toBe(true);
      expect(OrbitAccessGate.canRead('manager', 'business_health').authorized).toBe(true);
      expect(OrbitAccessGate.canRead('manager', 'action_center').authorized).toBe(true);
      expect(OrbitAccessGate.canRead('manager', 'intelligence').authorized).toBe(true);
      expect(OrbitAccessGate.canRead('manager', 'business_profile').authorized).toBe(true);
      expect(OrbitAccessGate.canRead('manager', 'automation').authorized).toBe(true);
    });

    it('allows lawyer to read billing, sales, finance, clients, and settings', () => {
      expect(OrbitAccessGate.canRead('lawyer', 'sales').authorized).toBe(true);
      expect(OrbitAccessGate.canRead('lawyer', 'finance').authorized).toBe(true);
      expect(OrbitAccessGate.canRead('lawyer', 'customers').authorized).toBe(true);
      expect(OrbitAccessGate.canRead('lawyer', 'business_profile').authorized).toBe(true);
    });

    it('allows standard user to read sales, finance, and clients, but denies settings/automation', () => {
      expect(OrbitAccessGate.canRead('user', 'sales').authorized).toBe(true);
      expect(OrbitAccessGate.canRead('user', 'customers').authorized).toBe(true);
      expect(OrbitAccessGate.canRead('user', 'finance').authorized).toBe(true);

      // User has settings: [] in rbac.js -> Denied
      const profileCheck = OrbitAccessGate.canRead('user', 'business_profile');
      expect(profileCheck.authorized).toBe(false);
      expect(profileCheck.reason).toContain("does not have read permissions for 'settings'");

      const autoCheck = OrbitAccessGate.canRead('user', 'automation');
      expect(autoCheck.authorized).toBe(false);
    });

    it('denies guest role from reading clients, sales, finance, settings, and health', () => {
      // Guest has cases: ["read"], documents: ["read"], everything else []
      expect(OrbitAccessGate.canRead('guest', 'customers').authorized).toBe(false);
      expect(OrbitAccessGate.canRead('guest', 'sales').authorized).toBe(false);
      expect(OrbitAccessGate.canRead('guest', 'finance').authorized).toBe(false);
      expect(OrbitAccessGate.canRead('guest', 'business_health').authorized).toBe(false);
      expect(OrbitAccessGate.canRead('guest', 'action_center').authorized).toBe(false);
    });

    it('safely handles unknown or unrecognized roles with USER fallback or admin substring detection', () => {
      // Unrecognized role with admin substring -> full access
      expect(OrbitAccessGate.canRead('hospital_director', 'finance').authorized).toBe(true);
      expect(OrbitAccessGate.canRead('regional_admin', 'business_profile').authorized).toBe(true);

      // Unrecognized role without admin substring -> falls back to USER permissions (read sales/finance/clients, deny settings)
      expect(OrbitAccessGate.canRead('consultant', 'sales').authorized).toBe(true);
      expect(OrbitAccessGate.canRead('consultant', 'business_profile').authorized).toBe(false);
    });

    it('fails closed on unknown categories or invalid roles', () => {
      expect(OrbitAccessGate.canRead('', 'sales').authorized).toBe(false);
      expect(OrbitAccessGate.canRead('user', 'unknown_category').authorized).toBe(false);
      expect(OrbitAccessGate.canRead(null, null).authorized).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. ORBIT BRIDGE CAPABILITY CALLS (ALLOW & DENY PAIRS)
  // ═══════════════════════════════════════════════════════════════
  describe('OrbitBridge Allow vs Deny Enforcement', () => {

    // ── A. Sales Overview ─────────────────────────────────────────
    describe('getSalesOverview', () => {
      it('returns sales overview when authorized (company_admin)', async () => {
        Sales.getSalesOverview.mockResolvedValueOnce({
          totalRevenue: 25000,
          totalTransactions: 15
        });

        const res = await OrbitBridge.getSalesOverview(mockCompanyId, 'company_admin');

        expect(res.authorized).toBe(true);
        expect(res.category).toBe('sales');
        expect(res.data.totalRevenue).toBe(25000);
        expect(Sales.getSalesOverview).toHaveBeenCalledWith(mockCompanyId, {});
      });

      it('safely denies and short-circuits WITHOUT calling Sales for guest', async () => {
        const res = await OrbitBridge.getSalesOverview(mockCompanyId, 'guest');

        expect(res.authorized).toBe(false);
        expect(res.data).toBeNull();
        expect(res.error).toContain("does not have read permissions for 'sales'");
        // CRITICAL: Ensure capability was never invoked
        expect(Sales.getSalesOverview).not.toHaveBeenCalled();
      });
    });

    // ── B. Financial Summary ───────────────────────────────────────
    describe('getFinancialSummary', () => {
      it('returns financial summary for user role', async () => {
        Finance.getFinancialSummary.mockResolvedValueOnce({
          revenueVsExpense: { totalRevenue: 50000, netIncome: 35000 }
        });

        const res = await OrbitBridge.getFinancialSummary(mockCompanyId, 'user');

        expect(res.authorized).toBe(true);
        expect(res.data.revenueVsExpense.netIncome).toBe(35000);
        expect(Finance.getFinancialSummary).toHaveBeenCalled();
      });

      it('safely denies guest without calling Finance', async () => {
        const res = await OrbitBridge.getFinancialSummary(mockCompanyId, 'guest');

        expect(res.authorized).toBe(false);
        expect(res.data).toBeNull();
        expect(Finance.getFinancialSummary).not.toHaveBeenCalled();
      });
    });

    // ── C. Customer Profile ────────────────────────────────────────
    describe('getCustomerProfile', () => {
      it('returns customer profile for user role', async () => {
        CustomerManagement.getCustomerProfile.mockResolvedValueOnce({
          customer: { id: 'cust-1', name: 'Acme Corp' },
          summary: { totalInvoiced: 12000 }
        });

        const res = await OrbitBridge.getCustomerProfile(mockCompanyId, 'user', 'cust-1');

        expect(res.authorized).toBe(true);
        expect(res.data.customer.name).toBe('Acme Corp');
        expect(CustomerManagement.getCustomerProfile).toHaveBeenCalledWith(mockCompanyId, 'cust-1');
      });

      it('safely denies guest without calling CustomerManagement', async () => {
        const res = await OrbitBridge.getCustomerProfile(mockCompanyId, 'guest', 'cust-1');

        expect(res.authorized).toBe(false);
        expect(res.data).toBeNull();
        expect(CustomerManagement.getCustomerProfile).not.toHaveBeenCalled();
      });
    });

    // ── D. Business Profile (Settings) ────────────────────────────
    describe('getBusinessProfile', () => {
      it('returns business profile for lawyer (settings read permitted)', async () => {
        BusinessProfileResolver.resolve.mockResolvedValueOnce({
          companyId: mockCompanyId,
          industry: 'law',
          terms: { client: 'Client' }
        });

        const res = await OrbitBridge.getBusinessProfile(mockCompanyId, 'lawyer');

        expect(res.authorized).toBe(true);
        expect(res.data.industry).toBe('law');
        expect(BusinessProfileResolver.resolve).toHaveBeenCalled();
      });

      it('safely denies standard user (settings read not permitted) without resolving', async () => {
        const res = await OrbitBridge.getBusinessProfile(mockCompanyId, 'user');

        expect(res.authorized).toBe(false);
        expect(res.data).toBeNull();
        expect(res.error).toContain("does not have read permissions for 'settings'");
        expect(BusinessProfileResolver.resolve).not.toHaveBeenCalled();
      });
    });

    // ── E. Business Health ────────────────────────────────────────
    describe('getBusinessHealth', () => {
      it('returns business health for company_admin', async () => {
        BusinessHealth.evaluateHealth.mockResolvedValueOnce({
          overallStatus: 'healthy',
          dimensions: { sales: { status: 'healthy' } }
        });

        const res = await OrbitBridge.getBusinessHealth(mockCompanyId, 'company_admin');

        expect(res.authorized).toBe(true);
        expect(res.data.overallStatus).toBe('healthy');
        expect(BusinessHealth.evaluateHealth).toHaveBeenCalled();
      });

      it('safely denies guest without evaluating health', async () => {
        const res = await OrbitBridge.getBusinessHealth(mockCompanyId, 'guest');

        expect(res.authorized).toBe(false);
        expect(res.data).toBeNull();
        expect(BusinessHealth.evaluateHealth).not.toHaveBeenCalled();
      });
    });

    // ── F. Action Center Feed ──────────────────────────────────────
    describe('getActionCenterFeed', () => {
      it('returns action center feed for user role', async () => {
        ActionCenter.getActionCenterFeed.mockResolvedValueOnce({
          summary: { totalActions: 2 },
          actions: [{ id: 'act-1', title: 'Overdue Invoice' }]
        });

        const res = await OrbitBridge.getActionCenterFeed(mockCompanyId, 'user');

        expect(res.authorized).toBe(true);
        expect(res.data.summary.totalActions).toBe(2);
        expect(ActionCenter.getActionCenterFeed).toHaveBeenCalled();
      });

      it('safely denies guest without calling ActionCenter', async () => {
        const res = await OrbitBridge.getActionCenterFeed(mockCompanyId, 'guest');

        expect(res.authorized).toBe(false);
        expect(res.data).toBeNull();
        expect(ActionCenter.getActionCenterFeed).not.toHaveBeenCalled();
      });
    });

    // ── G. Intelligence Insights ──────────────────────────────────
    describe('getIntelligenceInsights', () => {
      it('returns intelligence insights for user role', async () => {
        BusinessIntelligence.getUnifiedInsights.mockResolvedValueOnce({
          insights: [{ id: 'ins-1', title: 'Revenue Trajectory' }]
        });

        const res = await OrbitBridge.getIntelligenceInsights(mockCompanyId, 'user');

        expect(res.authorized).toBe(true);
        expect(res.data.insights.length).toBe(1);
        expect(BusinessIntelligence.getUnifiedInsights).toHaveBeenCalled();
      });

      it('safely denies guest without computing insights', async () => {
        const res = await OrbitBridge.getIntelligenceInsights(mockCompanyId, 'guest');

        expect(res.authorized).toBe(false);
        expect(res.data).toBeNull();
        expect(BusinessIntelligence.getUnifiedInsights).not.toHaveBeenCalled();
      });
    });

    // ── H. Automation Rules (Dry-Run Evaluation Only) ──────────────
    describe('evaluateAutomationRules', () => {
      it('evaluates rules in dry-run mode for company_admin', async () => {
        AutomationEngine.evaluateRules.mockResolvedValueOnce({
          mode: 'dry_run',
          wouldCreateCount: 1
        });

        const res = await OrbitBridge.evaluateAutomationRules(mockCompanyId, 'company_admin');

        expect(res.authorized).toBe(true);
        expect(res.data.mode).toBe('dry_run');
        expect(AutomationEngine.evaluateRules).toHaveBeenCalled();
      });

      it('safely denies standard user without evaluating automation rules', async () => {
        const res = await OrbitBridge.evaluateAutomationRules(mockCompanyId, 'user');

        expect(res.authorized).toBe(false);
        expect(res.data).toBeNull();
        expect(AutomationEngine.evaluateRules).not.toHaveBeenCalled();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. ZERO-DATA & SAFETY CHECKS
  // ═══════════════════════════════════════════════════════════════
  describe('Safety & Zero-Data Handling', () => {
    it('handles clean zero-data responses safely without errors when authorized', async () => {
      ActionCenter.getActionCenterFeed.mockResolvedValueOnce({
        summary: { totalActions: 0 },
        actions: []
      });

      const res = await OrbitBridge.getActionCenterFeed(mockCompanyId, 'user');
      expect(res.authorized).toBe(true);
      expect(res.data.summary.totalActions).toBe(0);
      expect(res.data.actions).toEqual([]);
    });

    it('does NOT expose or import any write/executeRules method', () => {
      expect(OrbitBridge.executeRules).toBeUndefined();
      expect(OrbitBridge.executeAutomationRules).toBeUndefined();
      expect(OrbitBridge.createTask).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. OMNICORE ARCHITECTURE V2 INTEGRATION
  // ═══════════════════════════════════════════════════════════════
  describe('OmniCore V2 Namespace Integration', () => {
    it('is properly mounted in OmniCoreV2.OrbitV2Extension', () => {
      expect(OmniCoreV2.OrbitV2Extension).toBeDefined();
      expect(OmniCoreV2.OrbitV2Extension.layer).toBe('OrbitV2Extension');
      expect(typeof OmniCoreV2.OrbitV2Extension.canRead).toBe('function');
      expect(typeof OmniCoreV2.OrbitV2Extension.getSalesOverview).toBe('function');
    });
  });
});
