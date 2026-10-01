/**
 * Unit Tests for OmniCore Orbit Pilot Gate (Phase 11 - Pilot Go-Live)
 * 
 * Tests the real OrbitPilotGate and real OrbitBridge / OrbitAccessGate composition,
 * verifying that allowlist checks pass and role checks are strictly enforced
 * with short-circuiting on unauthorized capability invocations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  OrbitPilotGate,
  isPilotCompanyActive,
  isPilotCompanyActiveSync
} from '../src/omnicore/orbit/OrbitPilotGate';
import { Sales } from '../src/omnicore/capabilities/Sales';
import { Finance } from '../src/omnicore/capabilities/Finance';
import { CustomerManagement } from '../src/omnicore/capabilities/CustomerManagement';
import { BusinessHealth } from '../src/omnicore/intelligence/BusinessHealth';
import { ActionCenter } from '../src/omnicore/intelligence/ActionCenter';
import { BusinessIntelligence } from '../src/omnicore/intelligence/BusinessIntelligence';
import { BusinessProfileResolver } from '../src/omnicore/config/BusinessProfileResolver';

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
  BusinessProfileResolver: { resolve: vi.fn() }
}));

describe('OmniCore Orbit Pilot Gate (Go-Live Gating)', () => {

  const pilotCompanyId = 'comp-pilot-live-01';
  const nonPilotCompanyId = 'comp-standard-non-pilot';

  const mockActivePilotConfig = {
    omnicore_enabled: true,
    slate_v2_enabled: true,
    pilot_companies: [pilotCompanyId, 'comp-pilot-live-02']
  };

  const mockDisabledFlagsConfig = {
    omnicore_enabled: false,
    slate_v2_enabled: true,
    pilot_companies: [pilotCompanyId]
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════
  // 1. PILOT ALLOWLIST VERIFICATION
  // ═══════════════════════════════════════════════════════════════
  describe('Allowlist & Flag Verification', () => {
    it('returns false when companyId is missing or invalid', async () => {
      expect(await isPilotCompanyActive('', { pilotConfig: mockActivePilotConfig })).toBe(false);
      expect(await isPilotCompanyActive(null, { pilotConfig: mockActivePilotConfig })).toBe(false);
    });

    it('returns false for non-pilot company even when feature flags are ON', async () => {
      const isPilot = await isPilotCompanyActive(nonPilotCompanyId, { pilotConfig: mockActivePilotConfig });
      expect(isPilot).toBe(false);
      expect(isPilotCompanyActiveSync(nonPilotCompanyId, mockActivePilotConfig)).toBe(false);
    });

    it('returns false for pilot company if global flags are OFF', async () => {
      const isPilot = await isPilotCompanyActive(pilotCompanyId, { pilotConfig: mockDisabledFlagsConfig });
      expect(isPilot).toBe(false);
      expect(isPilotCompanyActiveSync(pilotCompanyId, mockDisabledFlagsConfig)).toBe(false);
    });

    it('returns true ONLY when flags are ON and companyId matches allowlist (case-insensitive)', async () => {
      const isPilotUpper = await isPilotCompanyActive('COMP-PILOT-LIVE-01', { pilotConfig: mockActivePilotConfig });
      const isPilotExact = await isPilotCompanyActive(pilotCompanyId, { pilotConfig: mockActivePilotConfig });

      expect(isPilotUpper).toBe(true);
      expect(isPilotExact).toBe(true);
      expect(isPilotCompanyActiveSync(pilotCompanyId, mockActivePilotConfig)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. DISPATCH & ISOLATION FOR NON-PILOT COMPANIES
  // ═══════════════════════════════════════════════════════════════
  describe('Non-Pilot Company Isolation', () => {
    it('completely denies and short-circuits WITHOUT calling underlying capability for non-pilot company', async () => {
      const res = await OrbitPilotGate.executeQuery(
        nonPilotCompanyId,
        'company_admin',
        { category: 'sales' },
        { pilotConfig: mockActivePilotConfig }
      );

      expect(res.authorized).toBe(false);
      expect(res.error).toContain('OmniCore Orbit features are not enabled for this company');
      expect(res.data).toBeNull();

      // Ensure underlying capability was never invoked
      expect(Sales.getSalesOverview).not.toHaveBeenCalled();
      expect(Finance.getFinancialSummary).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. PILOT COMPANY READ DISPATCH & RBAC PASSTHROUGH
  // ═══════════════════════════════════════════════════════════════
  describe('Pilot Company Execution & In-Pilot Role Denial', () => {
    it('allows pilot company with authorized role and invokes capability', async () => {
      Sales.getSalesOverview.mockResolvedValueOnce({
        totalRevenue: 150000,
        totalTransactions: 25
      });

      const res = await OrbitPilotGate.executeQuery(
        pilotCompanyId,
        'company_admin',
        { category: 'sales' },
        { pilotConfig: mockActivePilotConfig }
      );

      expect(res.authorized).toBe(true);
      expect(res.data.totalRevenue).toBe(150000);
      expect(Sales.getSalesOverview).toHaveBeenCalledWith(pilotCompanyId, {});
    });

    it('allows pilot company user to read finance and invokes Finance capability', async () => {
      Finance.getFinancialSummary.mockResolvedValueOnce({
        revenueVsExpense: { netIncome: 75000 }
      });

      const res = await OrbitPilotGate.executeQuery(
        pilotCompanyId,
        'user',
        { category: 'finance' },
        { pilotConfig: mockActivePilotConfig }
      );

      expect(res.authorized).toBe(true);
      expect(res.data.revenueVsExpense.netIncome).toBe(75000);
      expect(Finance.getFinancialSummary).toHaveBeenCalledWith(pilotCompanyId, {});
    });

    // ── IN-PILOT-COMPANY ROLE DENIAL TEST (EXPLICIT SHORT-CIRCUIT CHECK) ──
    it('passes company-allowlist check but correctly DENIES low-privilege role (guest) on sales WITHOUT invoking Sales capability', async () => {
      const res = await OrbitPilotGate.executeQuery(
        pilotCompanyId, // Company IS on the pilot allowlist
        'guest',        // Role is denied in rbac.js matrix for 'sales'
        { category: 'sales' },
        { pilotConfig: mockActivePilotConfig }
      );

      // Asserts authorization is false with exact RBAC denial reason
      expect(res.authorized).toBe(false);
      expect(res.error).toContain("Access denied: Role 'guest' does not have read permissions for 'sales'");
      expect(res.data).toBeNull();

      // CRITICAL ASSERTION: Sales capability was NEVER invoked
      expect(Sales.getSalesOverview).not.toHaveBeenCalled();
    });

    it('passes company-allowlist check but correctly DENIES low-privilege role (guest) on finance WITHOUT invoking Finance capability', async () => {
      const res = await OrbitPilotGate.executeQuery(
        pilotCompanyId, // Company IS on the pilot allowlist
        'guest',        // Role is denied in rbac.js matrix for 'finance'
        { category: 'finance' },
        { pilotConfig: mockActivePilotConfig }
      );

      expect(res.authorized).toBe(false);
      expect(res.error).toContain("Access denied: Role 'guest' does not have read permissions for 'finance'");
      expect(res.data).toBeNull();

      // CRITICAL ASSERTION: Finance capability was NEVER invoked
      expect(Finance.getFinancialSummary).not.toHaveBeenCalled();
    });

    it('passes company-allowlist check but correctly DENIES standard user on business_profile (settings) WITHOUT resolving profile', async () => {
      const res = await OrbitPilotGate.executeQuery(
        pilotCompanyId, // Company IS on the pilot allowlist
        'user',         // 'user' has settings: [] in rbac.js
        { category: 'business_profile' },
        { pilotConfig: mockActivePilotConfig }
      );

      expect(res.authorized).toBe(false);
      expect(res.error).toContain("does not have read permissions for 'settings'");
      expect(res.data).toBeNull();

      // CRITICAL ASSERTION: Profile resolver was NEVER invoked
      expect(BusinessProfileResolver.resolve).not.toHaveBeenCalled();
    });

    it('denies disallowed/unrecognized categories or write actions for pilot company', async () => {
      const res1 = await OrbitPilotGate.executeQuery(
        pilotCompanyId,
        'company_admin',
        { category: 'execute_rules' },
        { pilotConfig: mockActivePilotConfig }
      );
      expect(res1.authorized).toBe(false);
      expect(res1.error).toContain('Unrecognized or disallowed Orbit category');

      const res2 = await OrbitPilotGate.executeQuery(
        pilotCompanyId,
        'company_admin',
        { category: 'create_task' },
        { pilotConfig: mockActivePilotConfig }
      );
      expect(res2.authorized).toBe(false);
    });
  });
});
